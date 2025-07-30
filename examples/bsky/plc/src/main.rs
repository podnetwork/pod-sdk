mod config;

use std::{fmt::Display, sync::Arc};

use alloy::primitives::FixedBytes;
use axum::{
    Json, Router,
    extract::{Path, State},
    http::StatusCode,
    routing::{get, post},
};
use bsky_plc::{
    bindings::{
        Op,
        PLCRegistry::{self, PLCRegistryInstance},
    },
    plc,
};
use pod_sdk::{
    Bytes,
    network::PodNetwork,
    provider::{PodProvider, PodProviderBuilder},
};
use serde::Deserialize;
use serde_json::{Value, json};
use tokio::sync::Mutex;
use tower_http::trace::TraceLayer;
use tracing::info;

struct AppState {
    provider: PodProvider,
    contract: Mutex<PLCRegistryInstance<PodProvider, PodNetwork>>,
}

impl AppState {
    async fn get_last_operation(
        &self,
        did: Did,
    ) -> anyhow::Result<Option<bsky_plc::plc::SignedOperation>> {
        let contract = self.contract.lock().await;
        let last_op = contract.getLastOperation(did.0).call().await?;

        let last_op = if last_op.signature.is_empty() {
            None
        } else {
            Some(plc::SignedOperation {
                op: last_op.operation.try_into()?,
                sig: String::from_utf8(last_op.signature.to_vec())?,
            })
        };
        Ok(last_op)
    }
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let config = config::Config::from_env().expect("Failed to load configuration");
    info!("Loaded configuration: {config}");

    let provider = PodProviderBuilder::with_recommended_settings()
        .with_private_key(config.private_key)
        .on_url(config.rpc_url)
        .await
        .expect("Failed to create PodProvider");

    let contract = PLCRegistry::new(config.contract_address, provider.clone());

    let state = AppState {
        provider,
        contract: Mutex::new(contract),
    };

    let app = Router::new()
        .route("/{did}/log/last", get(get_last))
        .route("/{did}/data", get(get_data))
        .route("/{did}", post(create_plc))
        .route("/{did}", get(resolve))
        .layer(TraceLayer::new_for_http())
        .with_state(Arc::new(state));

    let listener = tokio::net::TcpListener::bind("[::]:2582").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

#[derive(Clone, Copy)]
struct Did(FixedBytes<32>);

impl Display for Did {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", String::from_utf8(self.0.to_vec()).unwrap())
    }
}

impl<'de> Deserialize<'de> for Did {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let did: String = Deserialize::deserialize(deserializer)?;
        let did_bytes = did
            .as_bytes()
            .try_into()
            .map_err(|_| serde::de::Error::custom("invalid DID format"))?;

        Ok(Did(did_bytes))
    }
}

async fn resolve(
    Path(did): Path<Did>,
    State(state): State<Arc<AppState>>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let last_op = state
        .get_last_operation(did)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let last_op = last_op.ok_or((
        StatusCode::NOT_FOUND,
        format!("No operations found for DID: {did}"),
    ))?;

    let mut contexts = vec![
        "https://www.w3.org/ns/did/v1",
        "https://w3id.org/security/suites/jws-2020/v1",
    ];
    let mut methods = vec![];

    for (id, key) in last_op.verification_methods.iter() {
        let raw_key = key.trim_start_matches("did:key:");
        methods.push(json!({
            "id": format!("{did}#{id}"),
            "type": "Multikey",
            "controller": did.to_string(),
            "publicKeyMultibase": raw_key,
        }));
        let multikey_bytes = bs58::decode(&raw_key[1..]).into_vec().unwrap();
        let multikey_id = &multikey_bytes[..2];
        match multikey_id {
            [0x80, 0x24] => {
                contexts.push("https://w3id.org/security/suites/ecdsa-2019/v1");
            }
            [0xE7, 0x01] => {
                contexts.push("https://w3id.org/security/suites/secp256k1-2019/v1");
            }
            _ => {
                return Err((
                    StatusCode::BAD_REQUEST,
                    format!("Unsupported multikey type for key {id}: {multikey_id:?}"),
                ));
            }
        }
    }

    let services = last_op
        .services
        .iter()
        .map(|(id, svc)| {
            json!({
                "id": format!("#{id}"),
                "type": svc.type_,
                "serviceEndpoint": svc.endpoint,
            })
        })
        .collect::<Vec<_>>();

    Ok(Json(json!({
        "@context": contexts,
        "id": did.to_string(),
        "alsoKnownAs": last_op.also_known_as,
        "verificationMethod": methods,
        "service": services,
    })))
}

async fn get_data(
    State(state): State<Arc<AppState>>,
    Path(did): Path<Did>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let last_op = state
        .get_last_operation(did)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let last_op = last_op.ok_or((
        StatusCode::NOT_FOUND,
        format!("No operations found for DID: {did}"),
    ))?;

    Ok(Json(serde_json::to_value(&last_op).unwrap()))
}

async fn get_last(
    Path(did): Path<Did>,
    State(state): State<Arc<AppState>>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let last_op = state
        .get_last_operation(did)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let last_op = last_op.ok_or((
        StatusCode::NOT_FOUND,
        format!("No operations found for DID: {did}"),
    ))?;

    Ok(Json(serde_json::to_value(&last_op).unwrap()))
}

async fn create_plc(
    State(state): State<Arc<AppState>>,
    Path(did): Path<Did>,
    Json(op): Json<plc::SignedOperation>,
) -> Result<Json<Value>, (StatusCode, String)> {
    if op.prev.is_none() {
        let expected_did = op.did().unwrap();
        if expected_did != did.to_string() {
            return Err((
                StatusCode::BAD_REQUEST,
                format!("DID mismatch: expected {expected_did}, got {did}"),
            ));
        }
    }
    let cid = op
        .cid()
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
    tracing::info!("Creating PLC operation, DID: {did}, CID: {cid}, op: {op:?}",);

    let cid_b: Bytes = cid.clone().into_bytes().into();
    let signature: Bytes = op.sig.clone().into_bytes().into();
    let operation = Op::from(op.op);

    let contract = state.contract.lock().await;
    let pending_tx = contract
        .add(did.0, cid_b.clone(), operation.clone(), signature.clone())
        .send()
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to send transaction: {e}"),
            )
        })?;

    let receipt = pending_tx.get_receipt().await.unwrap();
    if !receipt.status() {
        // replay with a CALL to get a revert reason
        let result = contract
            .add(did.0, cid_b, operation, signature)
            .call()
            .await;
        match result {
            Ok(_) => {
                tracing::error!("Transaction failed but call succeeded, this is unexpected.");
            }
            Err(e) => {
                tracing::error!(
                    "Call failed: {}",
                    String::from_utf8_lossy(&e.as_revert_data().unwrap())
                );
            }
        }
        return Err((StatusCode::BAD_REQUEST, "Transaction failed".to_string()));
    }

    let committee = state.provider.get_committee().await.unwrap();
    receipt
        .verify_receipt(&committee)
        .expect("Receipt verification failed");

    Ok(Json(json!({
            "status": "success",
            "did": did.to_string(),
            "transactionHash": receipt.transaction_hash.to_string(),
    })))
}
