use alloy_consensus::{TxType, TypedTransaction};
use alloy_eips::{eip2930::AccessList, eip7702::SignedAuthorization};
use alloy_network::{
    BuildResult, Network, NetworkWallet, ReceiptResponse, TransactionBuilder,
    TransactionBuilderError,
};
use alloy_primitives::{Address, B256, BlockHash, Bytes, ChainId, Log, TxHash, TxKind, U256};
use alloy_provider::fillers::{
    ChainIdFiller, GasFiller, JoinFill, NonceFiller, RecommendedFillers,
};

use anyhow::Result;
use pod_types::ledger::Transaction;

use alloy_consensus::TxEnvelope;
use alloy_rpc_types::{TransactionReceipt, TransactionRequest};
use pod_types::{
    Committee, Hashable, Merkleizable, Receipt, Signed, Timestamp,
    ecdsa::{AddressECDSA, SignatureECDSA},
};
use serde::{Deserialize, Serialize};
use std::ops::{Deref, DerefMut};

#[derive(Debug, Clone, Copy)]
pub struct PodNetwork;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PodTransactionRequest {
    #[serde(flatten)]
    pub inner: TransactionRequest,
}

impl Default for PodTransactionRequest {
    fn default() -> Self {
        let mut inner = TransactionRequest::default();
        inner.set_gas_price(1_000_000_000);
        Self { inner }
    }
}

impl Deref for PodTransactionRequest {
    type Target = TransactionRequest;

    fn deref(&self) -> &Self::Target {
        &self.inner
    }
}

impl DerefMut for PodTransactionRequest {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.inner
    }
}

impl From<TypedTransaction> for PodTransactionRequest {
    fn from(value: TypedTransaction) -> Self {
        Self {
            inner: value.into(),
        }
    }
}

impl From<TxEnvelope> for PodTransactionRequest {
    fn from(value: TxEnvelope) -> Self {
        Self {
            inner: value.into(),
        }
    }
}

impl TransactionBuilder<PodNetwork> for PodTransactionRequest {
    fn chain_id(&self) -> Option<ChainId> {
        self.chain_id
    }

    fn set_chain_id(&mut self, chain_id: ChainId) {
        self.chain_id = Some(chain_id);
    }

    fn nonce(&self) -> Option<u64> {
        self.nonce
    }

    fn set_nonce(&mut self, nonce: u64) {
        self.nonce = Some(nonce);
    }

    fn input(&self) -> Option<&Bytes> {
        self.input.input()
    }

    fn set_input<T: Into<Bytes>>(&mut self, input: T) {
        self.input.input = Some(input.into());
    }

    fn from(&self) -> Option<Address> {
        self.from
    }

    fn set_from(&mut self, from: Address) {
        self.from = Some(from);
    }

    fn kind(&self) -> Option<TxKind> {
        self.to
    }

    fn clear_kind(&mut self) {
        self.to = None;
    }

    fn set_kind(&mut self, kind: TxKind) {
        self.to = Some(kind);
    }

    fn value(&self) -> Option<U256> {
        self.value
    }

    fn set_value(&mut self, value: U256) {
        self.value = Some(value)
    }

    fn gas_price(&self) -> Option<u128> {
        self.gas_price
    }

    fn set_gas_price(&mut self, gas_price: u128) {
        self.gas_price = Some(gas_price);
    }

    fn max_fee_per_gas(&self) -> Option<u128> {
        self.max_fee_per_gas
    }

    fn set_max_fee_per_gas(&mut self, max_fee_per_gas: u128) {
        self.max_fee_per_gas = Some(max_fee_per_gas);
    }

    fn max_priority_fee_per_gas(&self) -> Option<u128> {
        self.max_priority_fee_per_gas
    }

    fn set_max_priority_fee_per_gas(&mut self, max_priority_fee_per_gas: u128) {
        self.max_priority_fee_per_gas = Some(max_priority_fee_per_gas);
    }

    fn gas_limit(&self) -> Option<u64> {
        self.gas
    }

    fn set_gas_limit(&mut self, gas_limit: u64) {
        self.gas = Some(gas_limit);
    }

    fn access_list(&self) -> Option<&AccessList> {
        self.access_list.as_ref()
    }

    fn set_access_list(&mut self, access_list: AccessList) {
        self.access_list = Some(access_list);
    }

    fn complete_type(&self, ty: TxType) -> Result<(), Vec<&'static str>> {
        match ty {
            TxType::Legacy => self.complete_legacy(),
            _ => unimplemented!(), // Preventing usage of any other except Legacy Tx
        }
    }

    fn can_submit(&self) -> bool {
        // value and data may be None. If they are, they will be set to default.
        // gas fields and nonce may be None, if they are, they will be populated
        // with default values by the RPC server
        self.from.is_some()
    }

    fn can_build(&self) -> bool {
        // Only supporting Legacy Transactions
        self.gas_price.is_some()
    }

    #[doc(alias = "output_transaction_type")]
    fn output_tx_type(&self) -> TxType {
        TxType::Legacy
    }

    #[doc(alias = "output_transaction_type_checked")]
    fn output_tx_type_checked(&self) -> Option<TxType> {
        self.buildable_type()
    }

    fn prep_for_submission(&mut self) {
        self.transaction_type = Some(self.preferred_type() as u8);
        self.trim_conflicting_keys();
        self.populate_blob_hashes();
    }

    fn build_unsigned(self) -> BuildResult<TypedTransaction, PodNetwork> {
        if let Err((tx_type, missing)) = self.missing_keys() {
            return Err(
                TransactionBuilderError::InvalidTransactionRequest(tx_type, missing)
                    .into_unbuilt(self),
            );
        }
        Ok(self
            .inner
            .build_typed_tx()
            .expect("checked by missing_keys"))
    }

    async fn build<W: NetworkWallet<PodNetwork>>(
        self,
        wallet: &W,
    ) -> Result<<PodNetwork as Network>::TxEnvelope, TransactionBuilderError<PodNetwork>> {
        Ok(wallet.sign_request(self).await?)
    }
}

impl ReceiptResponse for PodReceiptResponse {
    fn contract_address(&self) -> Option<Address> {
        // For now not allowing deployments
        None
    }

    fn status(&self) -> bool {
        self.receipt.status()
    }

    fn block_hash(&self) -> Option<BlockHash> {
        // todo
        Some(BlockHash::default())
    }

    fn block_number(&self) -> Option<u64> {
        // todo
        None
    }

    fn transaction_hash(&self) -> TxHash {
        self.receipt.transaction_hash()
    }

    fn transaction_index(&self) -> Option<u64> {
        // todo
        None
    }

    fn gas_used(&self) -> u64 {
        self.receipt.gas_used()
    }

    fn effective_gas_price(&self) -> u128 {
        self.receipt.effective_gas_price()
    }

    fn blob_gas_used(&self) -> Option<u64> {
        // todo
        None
    }

    fn blob_gas_price(&self) -> Option<u128> {
        // todo
        None
    }

    fn from(&self) -> Address {
        self.receipt.from()
    }

    fn to(&self) -> Option<Address> {
        self.receipt.to()
    }

    fn authorization_list(&self) -> Option<&[SignedAuthorization]> {
        // todo
        None
    }

    fn cumulative_gas_used(&self) -> u64 {
        // todo
        self.receipt.cumulative_gas_used()
    }

    fn state_root(&self) -> Option<B256> {
        // todo
        None
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AttestationData {
    public_key: AddressECDSA,
    signature: SignatureECDSA,
    timestamp: Timestamp,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PodMetadata {
    pub attestations: Vec<AttestationData>,
    pub transaction: Signed<Transaction>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PodReceiptResponse {
    #[serde(flatten)]
    pub receipt: TransactionReceipt,
    pub pod_metadata: PodMetadata,
}

impl PodReceiptResponse {
    // todo: add error handling
    pub fn verify(&self, committee: &Committee) -> Result<bool> {
        let logs = self
            .receipt
            .inner
            .logs()
            .iter()
            .map(|l| l.inner.clone())
            .collect::<Vec<Log>>();

        let logs_root = logs.to_merkle_tree().hash_custom();

        let receipt = Receipt {
            status: self.status(),
            actual_gas_used: self.receipt.gas_used,
            logs,
            logs_root,
            tx: self.pod_metadata.transaction.clone(),
            contract_address: self.receipt.contract_address,
        };

        committee.verify_aggregate_attestation(
            receipt.hash_custom(),
            &self
                .pod_metadata
                .attestations
                .iter()
                .map(|a| a.signature)
                .collect(),
        )
    }

    pub fn transaction(&self) -> &pod_types::Signed<Transaction> {
        &self.pod_metadata.transaction
    }
}

impl Deref for PodReceiptResponse {
    type Target = TransactionReceipt;
    fn deref(&self) -> &TransactionReceipt {
        &self.receipt
    }
}

impl Network for PodNetwork {
    type TxType = TxType;
    type TxEnvelope = alloy_consensus::TxEnvelope;
    type UnsignedTx = TypedTransaction;
    type ReceiptEnvelope = alloy_consensus::ReceiptEnvelope;
    type Header = alloy_consensus::Header;
    type TransactionRequest = PodTransactionRequest;
    type TransactionResponse = alloy_rpc_types::Transaction;
    type ReceiptResponse = PodReceiptResponse;
    type HeaderResponse = alloy_rpc_types::Header;
    type BlockResponse = alloy_rpc_types::Block;
}

impl RecommendedFillers for PodNetwork {
    type RecommendedFillers = JoinFill<GasFiller, JoinFill<NonceFiller, ChainIdFiller>>;

    fn recommended_fillers() -> Self::RecommendedFillers {
        JoinFill::new(
            GasFiller,
            JoinFill::new(NonceFiller::default(), ChainIdFiller::default()),
        )
    }
}
