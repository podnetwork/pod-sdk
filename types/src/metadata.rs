use crate::{Receipt, TxEnvelope, consensus::attestation::TimestampedHeadlessAttestation};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MetadataWrappedItem<T, M> {
    #[serde(flatten)]
    pub inner: T,
    pub pod_metadata: M,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DetailedReceiptMetadata {
    pub attestations: Vec<TimestampedHeadlessAttestation>,
    pub transaction: TxEnvelope,
    pub receipt_attestations: Vec<TimestampedHeadlessAttestation>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RegularReceiptMetadata {
    pub attestations: Vec<TimestampedHeadlessAttestation>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TransactionMetadata {
    pub attestations: Vec<TimestampedHeadlessAttestation>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PodLogMetadata {
    pub attestations: Vec<TimestampedHeadlessAttestation>,
    pub receipt: Receipt,
}
