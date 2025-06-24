pub mod consensus;
pub mod cryptography;
pub mod ledger;
pub mod metadata;
pub mod pagination;
pub mod rpc;
pub mod time;

pub use consensus::{Attestation, Certificate, Committee};
pub use cryptography::{
    hash::{Hash, Hashable},
    merkle_tree::{MerkleBuilder, MerkleMultiProof, MerkleProof, Merkleizable, StandardMerkleTree},
    signer::{Signer, SignerSync, UncheckedSigned},
};
pub use ledger::{
    TxEnvelope,
    calldata::CallData,
    log::Log,
    receipt::{Receipt, UncheckedReceipt},
};
pub use time::{Clock, Timestamp};

#[cfg(test)]
mod tests {
    use super::*;
    use alloy_consensus::{TxEip1559, TxEnvelope, TxLegacy, TypedTransaction};
    use alloy_primitives::{Address, PrimitiveSignature, TxKind, U256};
    use alloy_rpc_types::AccessList;
    use serde_json;

    #[test]
    fn test_tx_envelope_serialization_legacy() {
        // Create a legacy transaction
        let tx = TxLegacy {
            nonce: 42,
            gas_price: 20000000000u128,
            gas_limit: 21000,
            to: TxKind::Call(Address::from([1u8; 20])),
            value: U256::from(1000000000000000000u128), // 1 ETH
            input: vec![0x12, 0x34, 0x56].into(),
            chain_id: Some(1),
        };

        let signature =
            PrimitiveSignature::new(U256::from(123456789u64), U256::from(987654321u64), false);

        let signed = alloy_consensus::Signed::new_unchecked(
            tx,
            signature,
            alloy_primitives::B256::from([1u8; 32]),
        );

        let envelope = TxEnvelope::Legacy(signed);

        // Test serialization
        let serialized = serde_json::to_string(&envelope).unwrap();
        println!("Legacy TxEnvelope JSON: {}", serialized);

        // Test deserialization
        let deserialized: TxEnvelope = serde_json::from_str(&serialized).unwrap();
        assert!(matches!(deserialized, TxEnvelope::Legacy(_)));

        // Test round-trip
        let re_serialized = serde_json::to_string(&deserialized).unwrap();
        assert_eq!(serialized, re_serialized);
    }

    #[test]
    fn test_tx_envelope_serialization_eip1559() {
        // Create an EIP-1559 transaction
        let tx = TxEip1559 {
            chain_id: 1,
            nonce: 100,
            max_priority_fee_per_gas: 2000000000u128,
            max_fee_per_gas: 30000000000u128,
            gas_limit: 50000,
            to: TxKind::Call(Address::from([2u8; 20])),
            value: U256::from(500000000000000000u128), // 0.5 ETH
            input: vec![0xaa, 0xbb, 0xcc, 0xdd].into(),
            access_list: AccessList::default(),
        };

        let signature =
            PrimitiveSignature::new(U256::from(111111111u64), U256::from(222222222u64), true);

        let signed = alloy_consensus::Signed::new_unchecked(
            tx,
            signature,
            alloy_primitives::B256::from([2u8; 32]),
        );

        let envelope = TxEnvelope::Eip1559(signed);

        // Test serialization
        let serialized = serde_json::to_string(&envelope).unwrap();
        println!("EIP-1559 TxEnvelope JSON: {}", serialized);

        // Test deserialization
        let deserialized: TxEnvelope = serde_json::from_str(&serialized).unwrap();
        assert!(matches!(deserialized, TxEnvelope::Eip1559(_)));

        // Test round-trip
        let re_serialized = serde_json::to_string(&deserialized).unwrap();
        assert_eq!(serialized, re_serialized);
    }

    #[test]
    fn test_unchecked_signed_serialization() {
        // Create an unsigned transaction
        let tx = TypedTransaction::Legacy(TxLegacy {
            nonce: 10,
            gas_price: 15000000000u128,
            gas_limit: 30000,
            to: TxKind::Call(Address::from([3u8; 20])),
            value: U256::from(250000000000000000u128), // 0.25 ETH
            input: vec![0x11, 0x22, 0x33, 0x44, 0x55].into(),
            chain_id: Some(5),
        });

        let signature =
            PrimitiveSignature::new(U256::from(333333333u64), U256::from(444444444u64), false);

        let signer = Address::from([4u8; 20]);

        let unchecked = UncheckedSigned::new(tx, signature, signer);

        // Test serialization
        let serialized = serde_json::to_string(&unchecked).unwrap();
        println!("UncheckedSigned JSON: {}", serialized);

        // Test deserialization
        let deserialized: UncheckedSigned = serde_json::from_str(&serialized).unwrap();
        assert_eq!(unchecked, deserialized);

        // Test round-trip
        let re_serialized = serde_json::to_string(&deserialized).unwrap();
        assert_eq!(serialized, re_serialized);
    }

    #[test]
    fn test_unchecked_signed_conversion() {
        // Create an unsigned transaction
        let tx = TypedTransaction::Eip1559(TxEip1559 {
            chain_id: 10,
            nonce: 25,
            max_priority_fee_per_gas: 1000000000u128,
            max_fee_per_gas: 20000000000u128,
            gas_limit: 40000,
            to: TxKind::Call(Address::from([5u8; 20])),
            value: U256::from(750000000000000000u128), // 0.75 ETH
            input: vec![0x66, 0x77, 0x88, 0x99].into(),
            access_list: AccessList::default(),
        });

        let signature =
            PrimitiveSignature::new(U256::from(555555555u64), U256::from(666666666u64), true);

        let signer = Address::from([6u8; 20]);

        let unchecked = UncheckedSigned::new(tx, signature, signer);

        // Test conversion to TxEnvelope
        let envelope = unchecked.clone().into_envelope();
        assert!(matches!(envelope, TxEnvelope::Eip1559(_)));

        // Test conversion from TxEnvelope
        let back_to_unchecked = UncheckedSigned::from(envelope);
        assert_eq!(unchecked.tx, back_to_unchecked.tx);
        assert_eq!(unchecked.signature, back_to_unchecked.signature);
        // Note: signer might be different due to recovery
    }

    #[test]
    fn test_hashable_and_merkleizable() {
        // Test UncheckedSigned hashable
        let unchecked = UncheckedSigned::new(
            TypedTransaction::Legacy(TxLegacy {
                nonce: 1,
                gas_price: 20000000000u128,
                gas_limit: 21000,
                to: TxKind::Call(Address::ZERO),
                value: U256::ZERO,
                input: vec![].into(),
                chain_id: None,
            }),
            PrimitiveSignature::new(U256::ZERO, U256::ZERO, false),
            Address::ZERO,
        );

        let hash = unchecked.hash_custom();
        assert_ne!(hash, Hash::default());

        // Test UncheckedSigned merkleizable
        let mut builder = MerkleBuilder::new();
        unchecked.append_leaves(&mut builder);
        let merkle_root = builder.build();
        // Just verify it's not empty
        assert!(!merkle_root.is_empty());

        // Test TxEnvelope hashable
        let envelope = unchecked.into_envelope();
        let envelope_hash = envelope.hash_custom();
        assert_ne!(envelope_hash, Hash::default());

        // Test TxEnvelope merkleizable
        let mut envelope_builder = MerkleBuilder::new();
        envelope.append_leaves(&mut envelope_builder);
        let envelope_merkle_root = envelope_builder.build();
        // Just verify it's not empty
        assert!(!envelope_merkle_root.is_empty());
    }
}
