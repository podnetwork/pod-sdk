use crate::cryptography::Hash;

pub const SIG_PREFIX_GAS_PRICE_ATTESTATION: &[u8] = b"ATT_GAS_PRICE";
pub const SIG_VERSION_GAS_PRICE_ATTESTATION: u8 = 1;
pub const SIG_PREFIX_TX_ATTESTATION: &[u8] = b"ATT_TX";
pub const SIG_VERSION_TX_ATTESTATION: u8 = 1;
pub const SIG_PREFIX_RECEIPT_ATTESTATION: &[u8] = b"ATT_RECEIPT";
pub const SIG_VERSION_RECEIPT_ATTESTATION: u8 = 1;

pub trait SigHashable {
    fn hash_for_signature(&self) -> Hash;
}
