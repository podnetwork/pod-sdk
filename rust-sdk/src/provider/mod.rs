use std::{future::Future, sync::Arc, time::Duration};

pub use alloy_provider;
use alloy_rpc_types::TransactionReceipt;
use anyhow::Context;

use crate::network::{PodNetwork, PodTransactionRequest};
use alloy_consensus::TxEnvelope;
use alloy_eips::eip2718::Encodable2718;
use alloy_json_rpc::{RpcError, RpcRecv, RpcSend};
use alloy_network::{EthereumWallet, Network, NetworkWallet, TransactionBuilder};
use alloy_provider::{
    fillers::{FillProvider, JoinFill, RecommendedFillers, TxFiller, WalletFiller},
    Identity, PendingTransactionBuilder, Provider, ProviderBuilder, ProviderLayer, RootProvider,
    SendableTx,
};
use alloy_pubsub::Subscription;
use async_trait::async_trait;

use alloy_transport::{TransportError, TransportErrorKind, TransportResult};
use pod_types::{
    consensus::Committee,
    ledger::log::VerifiableLog,
    metadata::{MetadataWrappedItem, RegularReceiptMetadata},
    pagination::{ApiPaginatedResult, CursorPaginationRequest},
    rpc::filter::LogFilter,
};

use alloy_primitives::{Address, B256 as Hash, U256};
use pod_types::Timestamp;
use serde::Deserialize;

pub struct PodProviderBuilder<L, F>(ProviderBuilder<L, F, PodNetwork>);

impl
    PodProviderBuilder<
        Identity,
        JoinFill<Identity, <PodNetwork as RecommendedFillers>::RecommendedFillers>,
    >
{
    /// Create a PodProviderBuilder set up with recommended settings.
    ///
    /// The builder can be used to build a [Provider] configured for the [PodNetwork].
    ///
    /// The returned builder has fillers preconfigured to automatically fill
    /// chain ID, nonce and gas price. Check [PodNetwork::RecommendedFillers] for details.
    pub fn with_recommended_settings() -> Self {
        Self(PodProviderBuilder::default().0.with_recommended_fillers())
    }
}

impl Default for PodProviderBuilder<Identity, Identity> {
    fn default() -> Self {
        Self(ProviderBuilder::<_, _, PodNetwork>::default())
    }
}

impl PodProviderBuilder<Identity, Identity> {
    pub fn new() -> Self {
        Self::default()
    }
}

impl<L, F> PodProviderBuilder<L, F> {
    /// Finish the layer stack by providing a url for connection,
    /// outputting the final [`PodProvider`] type with all stack
    /// components.
    pub async fn on_url<U: AsRef<str>>(self, url: U) -> Result<PodProvider, TransportError>
    where
        L: ProviderLayer<RootProvider<PodNetwork>, PodNetwork>,
        L::Provider: 'static,
        F: TxFiller<PodNetwork> + 'static,
    {
        let mut filler = None;
        let inner = self
            .0
            .map_filler(|f| {
                filler = Some(f);
                Identity
            })
            .connect(url.as_ref())
            .await?;
        Ok(PodProvider {
            inner: Arc::new(FillProvider::new(
                inner,
                filler.expect("map_filler calls its closure"),
            )),
        })
    }

    /// Configure a wallet to be used for signing transactions and spending funds.
    pub fn wallet<W>(self, wallet: W) -> PodProviderBuilder<L, JoinFill<F, WalletFiller<W>>>
    where
        W: NetworkWallet<PodNetwork>,
    {
        PodProviderBuilder::<_, _>(self.0.wallet(wallet))
    }

    pub fn with_private_key(
        self,
        key: crate::SigningKey,
    ) -> PodProviderBuilder<L, JoinFill<F, WalletFiller<EthereumWallet>>> {
        let signer = crate::PrivateKeySigner::from_signing_key(key);

        self.wallet(crate::EthereumWallet::new(signer))
    }

    /// Create [PodProvider] by filling in signer key and RPC url from environment.
    ///
    /// The following env variables need to be configured:
    /// - POD_PRIVATE_KEY: hex-encoded ECDSA private key of the wallet owner
    /// - POD_RPC_URL: URL for a pod RPC API (example: <https://rpc.dev.pod.network>)
    ///   (default: ws://127.0.0.1:8545)
    pub async fn from_env(self) -> anyhow::Result<PodProvider>
    where
        L: ProviderLayer<RootProvider<PodNetwork>, PodNetwork>,
        F: TxFiller<PodNetwork> + ProviderLayer<L::Provider, PodNetwork> + 'static,
        L::Provider: 'static,
    {
        const PK_ENV: &str = "POD_PRIVATE_KEY";
        fn load_private_key() -> anyhow::Result<crate::SigningKey> {
            let pk_string = std::env::var(PK_ENV)?;
            let pk_bytes = hex::decode(pk_string)?;
            let pk = crate::SigningKey::from_slice(&pk_bytes)?;
            Ok(pk)
        }
        let private_key = load_private_key()
            .with_context(|| format!("{PK_ENV} env should contain hex-encoded ECDSA signer key"))?;

        let rpc_url = std::env::var("POD_RPC_URL").unwrap_or("ws://127.0.0.1:8545".to_string());

        let provider = self
            .with_private_key(private_key)
            .on_url(rpc_url.clone())
            .await
            .with_context(|| format!("attaching provider to URL {rpc_url}"))?;

        Ok(provider)
    }
}

/// A provider tailored for pod, extending capabilities of alloy [Provider]
/// with pod-specific features.
#[derive(Clone)]
pub struct PodProvider {
    inner: Arc<dyn Fill>,
}

#[cfg_attr(target_arch = "wasm32", async_trait(?Send))]
#[cfg_attr(not(target_arch = "wasm32"), async_trait)]
trait Fill: Provider<PodNetwork> {
    async fn fill(&self, tx: PodTransactionRequest) -> TransportResult<Option<TxEnvelope>>;
}

#[cfg_attr(target_arch = "wasm32", async_trait(?Send))]
#[cfg_attr(not(target_arch = "wasm32"), async_trait)]
impl<F, P> Fill for FillProvider<F, P, PodNetwork>
where
    F: TxFiller<PodNetwork>,
    P: Provider<PodNetwork>,
{
    async fn fill(&self, tx: PodTransactionRequest) -> TransportResult<Option<TxEnvelope>> {
        Ok(match FillProvider::fill(self, tx).await? {
            SendableTx::Envelope(envelope) => Some(envelope),
            SendableTx::Builder(_) => None,
        })
    }
}

struct Unfilled<P>(P);

#[cfg_attr(target_arch = "wasm32", async_trait(?Send))]
#[cfg_attr(not(target_arch = "wasm32"), async_trait)]
impl<P: Provider<PodNetwork>> Provider<PodNetwork> for Unfilled<P> {
    fn root(&self) -> &RootProvider<PodNetwork> {
        self.0.root()
    }

    async fn send_transaction_internal(
        &self,
        tx: SendableTx<PodNetwork>,
    ) -> TransportResult<PendingTransactionBuilder<PodNetwork>> {
        self.0.send_transaction_internal(tx).await
    }
}

#[cfg_attr(target_arch = "wasm32", async_trait(?Send))]
#[cfg_attr(not(target_arch = "wasm32"), async_trait)]
impl<P: Provider<PodNetwork>> Fill for Unfilled<P> {
    async fn fill(&self, _tx: PodTransactionRequest) -> TransportResult<Option<TxEnvelope>> {
        Ok(None)
    }
}

#[cfg_attr(target_arch = "wasm32", async_trait(?Send))]
#[cfg_attr(not(target_arch = "wasm32"), async_trait)]
impl Provider<PodNetwork> for PodProvider {
    fn root(&self) -> &RootProvider<PodNetwork> {
        self.inner.root()
    }

    // NOTE: we need to override send_transaction_internal because it is
    // overriden in [FillProvider], which we use internally in `inner.
    // Otherwise, we would call the default implementation, which is different.
    // Perhaps we should do this for all methods?
    async fn send_transaction_internal(
        &self,
        tx: SendableTx<PodNetwork>,
    ) -> TransportResult<PendingTransactionBuilder<PodNetwork>> {
        let SendableTx::Builder(request) = tx else {
            return self.inner.send_transaction_internal(tx).await;
        };
        let deadline = tokio::time::Instant::now() + SEND_RETRY_BUDGET;
        let (inner, borrowed) = (&self.inner, &request);
        let sent = send_with_retry(
            deadline,
            request.nonce().is_none(),
            move || inner.fill(borrowed.clone()),
            move |envelope| async move {
                let pending = inner
                    .send_transaction_internal(SendableTx::Envelope(envelope))
                    .await?;
                Ok(*pending.tx_hash())
            },
        )
        .await?;
        let tx_hash = match sent {
            Sent::Pending(tx_hash) => tx_hash,
            Sent::Unsigned => {
                return inner
                    .send_transaction_internal(SendableTx::Builder(request))
                    .await
            }
            Sent::DeliveryUnknown(tx_hash) => self.await_receipt(tx_hash, deadline).await?,
        };
        Ok(PendingTransactionBuilder::new(self.root().clone(), tx_hash))
    }
}

const SEND_RETRY_INTERVAL: Duration = Duration::from_millis(250);
const SEND_RETRY_BUDGET: Duration = Duration::from_secs(10);
const VALIDATION_FAILED_MSG: &str = "transaction validation failed";
const NONCE_REJECTIONS: [&str; 3] = [
    "Past nonce:",
    "Future nonce:",
    "Account has pending transaction",
];

enum SendRetry {
    Resend,
    Resign,
}

fn send_retry(err: &RpcError<TransportErrorKind>) -> Option<SendRetry> {
    match err {
        RpcError::Transport(_) | RpcError::DeserError { .. } => Some(SendRetry::Resend),
        RpcError::ErrorResp(payload)
            if payload.code == INVALID_INPUT_CODE
                && payload.message == VALIDATION_FAILED_MSG
                && payload
                    .try_data_as::<String>()
                    .and_then(Result::ok)
                    .is_some_and(|reason| {
                        NONCE_REJECTIONS.iter().any(|p| reason.starts_with(p))
                    }) =>
        {
            Some(SendRetry::Resign)
        }
        _ => None,
    }
}

#[derive(Debug, PartialEq)]
enum Sent {
    Pending(Hash),
    Unsigned,
    DeliveryUnknown(Hash),
}

async fn pause(
    deadline: tokio::time::Instant,
    err: RpcError<TransportErrorKind>,
) -> TransportResult<()> {
    if tokio::time::Instant::now() + SEND_RETRY_INTERVAL > deadline {
        return Err(err);
    }
    tokio::time::sleep(SEND_RETRY_INTERVAL).await;
    Ok(())
}

async fn send_with_retry<S, SF, T, TF>(
    deadline: tokio::time::Instant,
    nonce_unset: bool,
    mut sign: S,
    mut send: T,
) -> TransportResult<Sent>
where
    S: FnMut() -> SF,
    SF: Future<Output = TransportResult<Option<TxEnvelope>>>,
    T: FnMut(TxEnvelope) -> TF,
    TF: Future<Output = TransportResult<Hash>>,
{
    let mut signed = None;
    let mut maybe_delivered = false;
    loop {
        let envelope = match signed.take() {
            Some(envelope) => envelope,
            None => match sign().await {
                Ok(Some(envelope)) => envelope,
                Ok(None) => return Ok(Sent::Unsigned),
                Err(err) if send_retry(&err).is_some() => {
                    pause(deadline, err).await?;
                    continue;
                }
                Err(err) => return Err(err),
            },
        };
        let err = match send(envelope.clone()).await {
            Ok(tx_hash) => return Ok(Sent::Pending(tx_hash)),
            Err(err) => err,
        };
        match send_retry(&err) {
            None => return Err(err),
            // The rejection may be the delivered attempt's own nonce taking effect, so
            // signing a new tx could execute both.
            Some(SendRetry::Resign) if maybe_delivered => {
                return Ok(Sent::DeliveryUnknown(*envelope.tx_hash()))
            }
            Some(SendRetry::Resign) if nonce_unset => {}
            Some(SendRetry::Resign) => return Err(err),
            Some(SendRetry::Resend) => {
                maybe_delivered = true;
                signed = Some(envelope);
            }
        }
        pause(deadline, err).await?;
    }
}

impl PodProvider {
    /// Create a new [PodProvider] using the underlying alloy [Provider].
    pub fn new(provider: impl Provider<PodNetwork> + 'static) -> Self {
        Self {
            inner: Arc::new(Unfilled(provider)),
        }
    }

    async fn await_receipt(
        &self,
        tx_hash: Hash,
        deadline: tokio::time::Instant,
    ) -> TransportResult<Hash> {
        loop {
            if let Ok(Some(_)) = self.get_transaction_receipt(tx_hash).await {
                return Ok(tx_hash);
            }
            pause(
                deadline,
                RpcError::local_usage(PodSendError::DeliveryUnknown { tx_hash }),
            )
            .await?;
        }
    }

    /// Gets the current committee members
    pub async fn get_committee(&self) -> TransportResult<Committee> {
        self.client().request_noparams("pod_getCommittee").await
    }

    pub async fn get_verifiable_logs(
        &self,
        filter: &LogFilter,
    ) -> TransportResult<Vec<VerifiableLog>> {
        self.client().request("eth_getLogs", (filter,)).await
    }

    pub async fn websocket_subscribe<Params, Resp>(
        &self,
        method: &str,
        params: Params,
    ) -> TransportResult<Subscription<Resp>>
    where
        Params: RpcSend,
        Resp: RpcRecv,
    {
        let id = self
            .client()
            .request("eth_subscribe", (method, params))
            .await?;
        self.root().get_subscription(id).await
    }

    pub async fn subscribe_verifiable_logs(
        &self,
        filter: &LogFilter,
    ) -> TransportResult<Subscription<VerifiableLog>> {
        self.websocket_subscribe("logs", filter).await
    }

    pub async fn wait_past_perfect_time(&self, timestamp: Timestamp) -> TransportResult<()> {
        const INVALID_PARAMS_CODE: i64 = -32602;
        const PPT_TOO_FAR_MSG: &str = "Requested PPT is too far in the future";
        const MAX_RETRIES: u32 = 100;

        const SLEEP_DURATION_MILLIS: u64 = 100;

        let mut retries = 0;
        loop {
            let result = self
                .client()
                .request::<_, ()>("pod_waitPastPerfectTime", (timestamp.as_micros() as u64,))
                .await;

            match result {
                Err(e)
                    if retries < MAX_RETRIES
                        && e.as_error_resp().is_some_and(|r| {
                            r.code == INVALID_PARAMS_CODE && r.message == PPT_TOO_FAR_MSG
                        }) =>
                {
                    retries += 1;
                    tokio::time::sleep(std::time::Duration::from_millis(SLEEP_DURATION_MILLIS))
                        .await;
                    continue;
                }
                result => return result,
            }
        }
    }

    /// Subscribe to continuously receive TX receipts as they are created on the node.
    ///
    /// The parameters `address` and `since` allow to optionally filter receipts.
    /// Pass `None` and `Timestamp::zero()` respectively for wildcards.
    pub async fn subscribe_receipts(
        &self,
        address: Option<Address>,
        since: Timestamp,
    ) -> TransportResult<
        Subscription<MetadataWrappedItem<TransactionReceipt, RegularReceiptMetadata>>,
    > {
        self.websocket_subscribe("pod_receipts", (address, since))
            .await
    }

    pub async fn get_receipts(
        &self,
        address: Option<Address>,
        since_micros: u64,
        paginator: Option<CursorPaginationRequest>,
    ) -> TransportResult<ApiPaginatedResult<<PodNetwork as Network>::ReceiptResponse>> {
        self.client()
            .request("pod_listReceipts", &(address, since_micros, paginator))
            .await
    }

    /// Transfer specified `amount` funds to the `to` account.
    pub async fn transfer(
        &self,
        to: Address,
        amount: U256,
    ) -> Result<<PodNetwork as Network>::ReceiptResponse, Box<dyn std::error::Error>> {
        let tx = PodTransactionRequest::default()
            .with_to(to)
            .with_value(amount);

        let pending_tx = self.send_transaction(tx).await?;

        let receipt = pending_tx.get_receipt().await?;

        Ok(receipt)
    }

    /// Submit an already-signed transaction through `pod_sendRawTransaction`,
    /// which waits for attestations (up to `timeout`, default 10s server-side)
    /// and classifies the outcome.
    ///
    /// Prefer this over [`Provider::send_transaction`], which posts
    /// `eth_sendRawTransaction` and reports none of these rejections.
    ///
    /// `Ok` means only that no terminal verdict was reached: it covers a
    /// transaction that executed and one still gathering votes, and the response
    /// cannot distinguish them. Wait for the receipt to settle that.
    pub async fn pod_send_raw_transaction(
        &self,
        encoded_tx: &[u8],
        timeout: Option<Duration>,
    ) -> Result<PodSendResponse, PodSendError> {
        let raw = format!("0x{}", hex::encode(encoded_tx));
        let timeout_secs = timeout.map(|t| u16::try_from(t.as_secs().max(1)).unwrap_or(u16::MAX));
        self.client()
            .request("pod_sendRawTransaction", (raw, timeout_secs))
            .await
            .map_err(PodSendError::from)
    }

    pub async fn past_perfect_time(&self, contract: Address) -> TransportResult<Timestamp> {
        let micros_str: String = self
            .client()
            .request("pod_pastPerfectTime", (contract,)) // <— important
            .await?;

        let micros: u128 = micros_str.parse().map_err(|e| {
            RpcError::local_usage_str(&format!("invalid micros from pod_pastPerfectTime: {e}"))
        })?;

        Ok(Timestamp::from_micros(micros))
    }
}

/// Sign `tx` locally and return its EIP-2718 encoding, ready for
/// [`PodProvider::pod_send_raw_transaction`].
///
/// Signing separately from sending lets a caller resubmit the *same bytes*: two
/// different transactions at one nonce split validator votes so neither reaches
/// quorum, which locks the account until a recovery transaction clears it. `tx`
/// must already carry every field feeding the hash, since nothing here fills any
/// in.
pub async fn sign_transaction_bytes(
    tx: PodTransactionRequest,
    key: crate::SigningKey,
) -> alloy_signer::Result<Vec<u8>> {
    let wallet = EthereumWallet::new(crate::PrivateKeySigner::from_signing_key(key));
    let envelope = NetworkWallet::<PodNetwork>::sign_request(&wallet, tx).await?;
    Ok(envelope.encoded_2718())
}

/// Reply from `pod_sendRawTransaction`.
#[derive(Debug, Clone, Deserialize)]
pub struct PodSendResponse {
    pub tx_hash: Hash,
    /// Validators whose attestation this node observed. A lower bound, not an
    /// authority: a transaction can execute with fewer counted here, so do not
    /// treat `successes < quorum_size` as "not applied".
    pub successes: usize,
    /// Advisory: a non-empty list alongside a quorum of `successes` only means a
    /// minority disagreed.
    #[serde(default, deserialize_with = "deserialize_rejections")]
    pub errors: Vec<String>,
}

/// As the node serializes it: `{"error": "..."}`.
#[derive(Deserialize)]
struct Rejection {
    #[serde(default)]
    error: String,
}

fn deserialize_rejections<'de, D>(deserializer: D) -> Result<Vec<String>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    Ok(Vec::<Rejection>::deserialize(deserializer)?
        .into_iter()
        .map(|item| item.error)
        .collect())
}

#[derive(Deserialize)]
struct AccountLockedData {
    recovery_target: Hash,
    recovery_target_nonce: u64,
}

#[derive(Deserialize)]
struct EmptyTxRequiredData {
    nonce: u64,
    #[serde(default)]
    errors: Vec<String>,
}

/// Mirrors the server's `ErrorCodes`; `-32003` is kept for compatibility.
const ACCOUNT_LOCKED_CODE: i64 = 999;
const EMPTY_TX_REQUIRED_CODE: i64 = 997;
const REJECTED_CODE: i64 = -32003;
const INVALID_INPUT_CODE: i64 = -32000;

/// Why pod refused a transaction. `eth_sendRawTransaction` reports none of these
/// distinctions.
#[derive(Debug)]
pub enum PodSendError {
    /// No transaction at this nonce can reach quorum; only a recovery transaction
    /// at a fresh nonce, pointing at `recovery_target`, advances the account.
    AccountLocked {
        recovery_target: Hash,
        recovery_target_nonce: u64,
    },
    /// Rejected deterministically by f+1 validators, so it can never execute and
    /// a replacement at the same nonce is safe.
    Rejected { errors: Vec<String> },
    /// The head nonce has votes but no certificate; a deadline-free empty
    /// self-transfer at `nonce` forces one.
    EmptyTxRequired { nonce: u64, errors: Vec<String> },
    /// Transport failure, or an unclassified server error. May still have been
    /// delivered.
    Transport(TransportError),
    /// A possibly delivered send was followed by a nonce rejection and no receipt
    /// appeared in time; the transaction may still execute.
    DeliveryUnknown { tx_hash: Hash },
}

impl PodSendError {
    /// Whether the transaction is known never to execute, so replacing it cannot
    /// split votes. False for [`Self::Transport`] and [`Self::DeliveryUnknown`],
    /// which may have been delivered.
    pub fn is_terminal(&self) -> bool {
        !matches!(self, Self::Transport(_) | Self::DeliveryUnknown { .. })
    }
}

impl std::fmt::Display for PodSendError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::AccountLocked {
                recovery_target,
                recovery_target_nonce,
            } => write!(
                f,
                "account locked at nonce {recovery_target_nonce}; needs a recovery tx targeting {recovery_target}"
            ),
            Self::Rejected { errors } => {
                write!(f, "rejected by f+1 validators: {}", errors.join(", "))
            }
            Self::EmptyTxRequired { nonce, errors } => write!(
                f,
                "empty self-transfer required at nonce {nonce}: {}",
                errors.join(", ")
            ),
            Self::Transport(e) => write!(f, "{e}"),
            Self::DeliveryUnknown { tx_hash } => {
                write!(f, "delivery of transaction {tx_hash} unknown")
            }
        }
    }
}

impl std::error::Error for PodSendError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            Self::Transport(e) => Some(e),
            _ => None,
        }
    }
}

impl From<RpcError<TransportErrorKind>> for PodSendError {
    fn from(err: RpcError<TransportErrorKind>) -> Self {
        let err = match err {
            RpcError::LocalUsageError(e) => match e.downcast::<PodSendError>() {
                Ok(inner) => return *inner,
                Err(e) => RpcError::LocalUsageError(e),
            },
            err => err,
        };
        let Some(payload) = err.as_error_resp() else {
            return Self::Transport(err);
        };
        match payload.code {
            ACCOUNT_LOCKED_CODE => match payload.try_data_as::<AccountLockedData>() {
                Some(Ok(data)) => Self::AccountLocked {
                    recovery_target: data.recovery_target,
                    recovery_target_nonce: data.recovery_target_nonce,
                },
                _ => Self::Transport(err),
            },
            EMPTY_TX_REQUIRED_CODE => match payload.try_data_as::<EmptyTxRequiredData>() {
                Some(Ok(data)) => Self::EmptyTxRequired {
                    nonce: data.nonce,
                    errors: data.errors,
                },
                _ => Self::Transport(err),
            },
            // The message alone is meaningful, so unparsable `data` still classifies.
            REJECTED_CODE => Self::Rejected {
                errors: match payload.try_data_as::<Vec<Rejection>>() {
                    Some(Ok(items)) => items.into_iter().map(|item| item.error).collect(),
                    _ => vec![payload.message.to_string()],
                },
            },
            _ => Self::Transport(err),
        }
    }
}

#[cfg(test)]
mod send_tests {
    use super::*;
    use alloy_json_rpc::ErrorPayload;

    fn rpc_error(code: i64, message: &str, data: Option<&str>) -> RpcError<TransportErrorKind> {
        RpcError::ErrorResp(ErrorPayload {
            code,
            message: message.to_string().into(),
            data: data.map(|d| serde_json::value::RawValue::from_string(d.to_string()).unwrap()),
        })
    }

    #[test]
    fn classifies_account_locked() {
        let err = PodSendError::from(rpc_error(
            ACCOUNT_LOCKED_CODE,
            "Account locked",
            Some(
                r#"{"recovery_target":"0x596a7bd66762e52a914565f707d0fc2a479e818b3e7587ea9a6615c9290be13d","recovery_target_nonce":22}"#,
            ),
        ));
        match err {
            PodSendError::AccountLocked {
                recovery_target_nonce,
                ..
            } => assert_eq!(recovery_target_nonce, 22),
            other => panic!("expected AccountLocked, got {other:?}"),
        }
        // Unreadable `data` degrades to `Transport`, i.e. not terminal, so the
        // caller resends rather than replaces. The node always sends `data`.
        let no_data = PodSendError::from(rpc_error(ACCOUNT_LOCKED_CODE, "Account locked", None));
        assert!(matches!(no_data, PodSendError::Transport(_)));
        assert!(!no_data.is_terminal());
    }

    #[test]
    fn classifies_rejected_with_and_without_data() {
        let with_data = PodSendError::from(rpc_error(
            REJECTED_CODE,
            "Transaction rejected",
            Some(r#"[{"error":"insufficient balance"},{"error":"bad nonce"}]"#),
        ));
        match with_data {
            PodSendError::Rejected { errors } => {
                assert_eq!(errors, vec!["insufficient balance", "bad nonce"]);
            }
            other => panic!("expected Rejected, got {other:?}"),
        }

        // The message alone is meaningful, so a missing `data` still classifies.
        match PodSendError::from(rpc_error(REJECTED_CODE, "Transaction rejected: nope", None)) {
            PodSendError::Rejected { errors } => {
                assert_eq!(errors, vec!["Transaction rejected: nope"]);
            }
            other => panic!("expected Rejected, got {other:?}"),
        }
    }

    #[test]
    fn classifies_empty_tx_required() {
        match PodSendError::from(rpc_error(
            EMPTY_TX_REQUIRED_CODE,
            "Empty transaction required to make progress",
            Some(r#"{"nonce":23,"errors":["split"]}"#),
        )) {
            PodSendError::EmptyTxRequired { nonce, errors } => {
                assert_eq!(nonce, 23);
                assert_eq!(errors, vec!["split"]);
            }
            other => panic!("expected EmptyTxRequired, got {other:?}"),
        }
    }

    /// Must not be terminal: replacing here could put a second tx at the nonce.
    #[test]
    fn unknown_codes_are_transport_and_not_terminal() {
        let err = PodSendError::from(rpc_error(INVALID_INPUT_CODE, "something else", None));
        assert!(matches!(err, PodSendError::Transport(_)));
        assert!(!err.is_terminal());
    }

    #[test]
    fn deserializes_send_response() {
        let response: PodSendResponse = serde_json::from_str(
            r#"{"tx_hash":"0x1111111111111111111111111111111111111111111111111111111111111111","successes":5,"errors":[{"error":"nope"}]}"#,
        )
        .unwrap();
        assert_eq!(response.successes, 5);
        assert_eq!(response.errors, vec!["nope"]);
    }

    #[test]
    fn deserializes_send_response_without_errors() {
        let response: PodSendResponse = serde_json::from_str(
            r#"{"tx_hash":"0x1111111111111111111111111111111111111111111111111111111111111111","successes":6}"#,
        )
        .unwrap();
        assert!(response.errors.is_empty());
    }

    fn validation_failed(reason: &str) -> RpcError<TransportErrorKind> {
        rpc_error(
            INVALID_INPUT_CODE,
            VALIDATION_FAILED_MSG,
            Some(&serde_json::to_string(reason).unwrap()),
        )
    }

    fn envelope(nonce: u64) -> TxEnvelope {
        TxEnvelope::Eip1559(alloy_consensus::Signed::new_unhashed(
            alloy_consensus::TxEip1559 {
                nonce,
                ..Default::default()
            },
            alloy_primitives::Signature::new(U256::from(1), U256::from(1), false),
        ))
    }

    struct Script {
        sign_calls: std::cell::Cell<usize>,
        sign_fails_on_call: Option<usize>,
        signed: std::cell::RefCell<Vec<u64>>,
        sent: std::cell::RefCell<Vec<Hash>>,
        replies: std::cell::RefCell<std::collections::VecDeque<TransportResult<()>>>,
    }

    impl Script {
        fn new(replies: Vec<TransportResult<()>>, sign_fails_on_call: Option<usize>) -> Self {
            Self {
                sign_calls: Default::default(),
                sign_fails_on_call,
                signed: Default::default(),
                sent: Default::default(),
                replies: std::cell::RefCell::new(replies.into()),
            }
        }

        async fn run(&self) -> TransportResult<Sent> {
            self.run_with(true).await
        }

        async fn run_with(&self, nonce_unset: bool) -> TransportResult<Sent> {
            let deadline = tokio::time::Instant::now() + SEND_RETRY_BUDGET;
            send_with_retry(
                deadline,
                nonce_unset,
                || async {
                    let call = self.sign_calls.replace(self.sign_calls.get() + 1);
                    if Some(call) == self.sign_fails_on_call {
                        return Err(TransportErrorKind::custom_str("nonce fetch failed"));
                    }
                    let nonce = 5 + self.signed.borrow().len() as u64;
                    self.signed.borrow_mut().push(nonce);
                    Ok(Some(envelope(nonce)))
                },
                |envelope| async move {
                    let tx_hash = *envelope.tx_hash();
                    self.sent.borrow_mut().push(tx_hash);
                    self.replies
                        .borrow_mut()
                        .pop_front()
                        .unwrap_or_else(|| Err(TransportErrorKind::custom_str("down")))
                        .map(|()| tx_hash)
                },
            )
            .await
        }
    }

    fn hash(nonce: u64) -> Hash {
        *envelope(nonce).tx_hash()
    }

    #[tokio::test(start_paused = true)]
    async fn undelivered_rejection_resigns_with_a_fresh_nonce() {
        for reason in [
            "Past nonce: tx nonce 5, expected 6",
            "Future nonce: tx nonce 5, expected 4",
            "Account has pending transaction",
        ] {
            let script = Script::new(vec![Err(validation_failed(reason)), Ok(())], Some(1));
            assert_eq!(script.run().await.unwrap(), Sent::Pending(hash(6)));
            assert_eq!(*script.signed.borrow(), vec![5, 6]);
            assert_eq!(*script.sent.borrow(), vec![hash(5), hash(6)]);
        }
    }

    #[tokio::test(start_paused = true)]
    async fn explicit_nonce_rejection_is_returned_at_once() {
        let script = Script::new(
            vec![Err(validation_failed("Past nonce: tx nonce 5, expected 6"))],
            None,
        );
        assert!(script.run_with(false).await.is_err());
        assert_eq!(*script.signed.borrow(), vec![5]);
        assert_eq!(script.sent.borrow().len(), 1);
    }

    #[tokio::test(start_paused = true)]
    async fn possibly_delivered_rejection_is_delivery_unknown() {
        let script = Script::new(
            vec![
                Err(TransportErrorKind::custom_str("reset")),
                Err(validation_failed("Past nonce: tx nonce 5, expected 6")),
            ],
            None,
        );
        assert_eq!(script.run().await.unwrap(), Sent::DeliveryUnknown(hash(5)));
        assert_eq!(*script.signed.borrow(), vec![5]);
        assert_eq!(*script.sent.borrow(), vec![hash(5), hash(5)]);
    }

    #[tokio::test(start_paused = true)]
    async fn transport_error_resends_the_same_bytes() {
        let script = Script::new(
            vec![
                Err(TransportErrorKind::custom_str("connection reset")),
                Ok(()),
            ],
            None,
        );
        assert_eq!(script.run().await.unwrap(), Sent::Pending(hash(5)));
        assert_eq!(*script.signed.borrow(), vec![5]);
        assert_eq!(*script.sent.borrow(), vec![hash(5), hash(5)]);
    }

    #[tokio::test(start_paused = true)]
    async fn terminal_errors_are_not_retried() {
        for err in [
            rpc_error(3, "execution reverted", Some(r#""0x08c379a0""#)),
            validation_failed("Insufficient balance"),
            rpc_error(ACCOUNT_LOCKED_CODE, "Account locked", None),
        ] {
            let script = Script::new(vec![Err(err)], None);
            assert!(script.run().await.is_err());
            assert_eq!(script.sent.borrow().len(), 1);
        }
    }

    #[tokio::test(start_paused = true)]
    async fn gives_up_after_the_budget() {
        let start = tokio::time::Instant::now();
        let script = Script::new(vec![], None);
        assert!(script.run().await.is_err());
        assert!(start.elapsed() <= SEND_RETRY_BUDGET);
        assert_eq!(script.sent.borrow().len(), 41);
    }

    fn mocked_provider() -> PodProvider {
        PodProvider::new(
            PodProviderBuilder::new()
                .0
                .connect_mocked_client(alloy_transport::mock::Asserter::new()),
        )
    }

    #[tokio::test(start_paused = true)]
    async fn possibly_delivered_tx_returns_once_its_receipt_appears() {
        let script = Script::new(
            vec![
                Err(TransportErrorKind::custom_str("reset")),
                Err(validation_failed("Past nonce: tx nonce 5, expected 6")),
            ],
            None,
        );
        let deadline = tokio::time::Instant::now() + SEND_RETRY_BUDGET;
        let Sent::DeliveryUnknown(tx_hash) = script.run().await.unwrap() else {
            panic!("expected DeliveryUnknown");
        };
        let asserter = alloy_transport::mock::Asserter::new();
        asserter.push_success(&serde_json::Value::Null);
        asserter.push_success(&serde_json::json!({
            "type": "0x2",
            "status": "0x1",
            "cumulativeGasUsed": "0x0",
            "logs": [],
            "logsBloom": format!("0x{}", "0".repeat(512)),
            "transactionHash": tx_hash,
            "transactionIndex": "0x0",
            "blockHash": Hash::ZERO,
            "blockNumber": "0x1",
            "gasUsed": "0x0",
            "effectiveGasPrice": "0x0",
            "from": Address::ZERO,
            "to": Address::ZERO,
            "contractAddress": null,
            "pod_metadata": {"attestations": [], "committee_epoch": 0},
        }));
        let provider = PodProvider::new(
            PodProviderBuilder::new()
                .0
                .connect_mocked_client(asserter.clone()),
        );
        assert_eq!(
            provider.await_receipt(tx_hash, deadline).await.unwrap(),
            hash(5)
        );
        assert!(asserter.read_q().is_empty());
        assert_eq!(*script.signed.borrow(), vec![5]);
    }

    #[tokio::test(start_paused = true)]
    async fn missing_receipt_ends_in_delivery_unknown() {
        let deadline = tokio::time::Instant::now() + SEND_RETRY_BUDGET;
        let err = mocked_provider()
            .await_receipt(hash(5), deadline)
            .await
            .unwrap_err();
        match PodSendError::from(err) {
            PodSendError::DeliveryUnknown { tx_hash } => assert_eq!(tx_hash, hash(5)),
            other => panic!("expected DeliveryUnknown, got {other:?}"),
        }
    }

    #[tokio::test]
    async fn wait_past_perfect_time_accepts_null() {
        let asserter = alloy_transport::mock::Asserter::new();
        asserter.push_success(&serde_json::Value::Null);
        let provider =
            PodProvider::new(PodProviderBuilder::new().0.connect_mocked_client(asserter));
        provider
            .wait_past_perfect_time(Timestamp::from_micros(1))
            .await
            .unwrap();
    }

    #[tokio::test]
    async fn wait_past_perfect_time_reports_transport_errors() {
        assert!(mocked_provider()
            .wait_past_perfect_time(Timestamp::from_micros(1))
            .await
            .is_err());
    }
}
