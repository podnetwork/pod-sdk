use alloy_primitives::{Address, B256, PrimitiveSignature as Signature};
use alloy_signer::SignerSync;
use alloy_signer_local::LocalSigner;

use k256::ecdsa::SigningKey;

use super::Hashable;
use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::fmt;

use alloy_primitives::B256 as Hash;

#[derive(Clone, Copy, Serialize, Deserialize, Eq, PartialEq)]
pub struct SignatureECDSA(Signature);

impl std::fmt::Debug for SignatureECDSA {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "SignatureECDSA({})", hex::encode(self.to_bytes()))
    }
}

impl fmt::Display for SignatureECDSA {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", hex::encode(self.to_bytes()))
    }
}

impl SignatureECDSA {
    pub fn new(signature: Signature) -> Self {
        Self(signature)
    }

    pub fn to_bytes(&self) -> Vec<u8> {
        self.0.as_bytes().to_vec()
    }

    pub fn from_bytes(bytes: &[u8]) -> Result<SignatureECDSA> {
        Ok(Self(Signature::try_from(bytes)?))
    }

    pub fn inner(&self) -> &Signature {
        &self.0
    }

    pub fn recover_signer(&self, digest: &[u8]) -> Result<AddressECDSA> {
        let hash = <&B256>::try_from(digest)?;

        let address = self.0.recover_address_from_prehash(hash)?;

        Ok(AddressECDSA::new(address))
    }
}

#[derive(Clone, Debug)]
pub struct PrivateKeyECDSA(LocalSigner<SigningKey>);

impl fmt::Display for PrivateKeyECDSA {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", hex::encode(self.to_bytes()))
    }
}

impl PrivateKeyECDSA {
    pub fn generate() -> Self {
        Self(LocalSigner::<SigningKey>::random())
    }

    pub fn new(signing_key: SigningKey) -> Self {
        Self(LocalSigner::<SigningKey>::from(signing_key))
    }

    pub fn from_be_bytes(bytes: &[u8]) -> Result<PrivateKeyECDSA> {
        Ok(Self(LocalSigner::<SigningKey>::from_bytes(
            <&B256>::try_from(bytes)?,
        )?))
    }

    // Sign the digest bytes of the message - the function takes the hash of the message
    pub fn sign_hash(&self, digest_bytes: &[u8]) -> Result<SignatureECDSA> {
        Ok(SignatureECDSA(
            self.0.sign_hash_sync(<&B256>::try_from(digest_bytes)?)?,
        ))
    }

    pub fn to_bytes(&self) -> Vec<u8> {
        self.0.to_bytes().to_vec()
    }
}

#[derive(Clone, Debug, Ord, Eq, PartialEq, PartialOrd, Copy, Serialize, Deserialize)]
pub struct AddressECDSA(pub Address);

impl fmt::Display for AddressECDSA {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", hex::encode(self.to_bytes()))
    }
}

impl AddressECDSA {
    pub fn new(address: Address) -> Self {
        Self(address)
    }

    pub fn verify(&self, digest_bytes: &[u8], sig: &SignatureECDSA) -> Result<bool> {
        let recovery = sig.recover_signer(digest_bytes)?;
        Ok(self.0 == recovery.0)
    }

    pub fn to_bytes(&self) -> Vec<u8> {
        self.0.to_vec()
    }

    pub fn from_bytes(bytes: &[u8]) -> Result<AddressECDSA> {
        Ok(AddressECDSA(Address::try_from(bytes)?))
    }

    pub fn as_key(&self) -> &Address {
        &self.0
    }
}

#[derive(Clone, Debug)]
pub struct KeypairECDSA {
    pub private_key: PrivateKeyECDSA,
    pub address: AddressECDSA,
}

impl KeypairECDSA {
    pub fn generate() -> Self {
        let signer = LocalSigner::<SigningKey>::random();
        let address = AddressECDSA(signer.address());
        Self {
            private_key: PrivateKeyECDSA::new(signer.credential().clone()),
            address,
        }
    }

    pub fn from_private_key(private_key: PrivateKeyECDSA) -> Self {
        let address = AddressECDSA(private_key.0.address());

        Self {
            private_key,
            address,
        }
    }

    // Alias to from_private key
    pub fn from_secret_key(private_key: PrivateKeyECDSA) -> Self {
        KeypairECDSA::from_private_key(private_key)
    }

    pub fn verify(&self, digest_bytes: &[u8], signature: &SignatureECDSA) -> Result<bool> {
        self.address.verify(digest_bytes, signature)
    }

    pub fn sign(&self, digest_bytes: &[u8]) -> Result<SignatureECDSA> {
        self.private_key.sign_hash(digest_bytes)
    }
}

impl Hashable for AddressECDSA {
    fn hash_custom(&self) -> Hash {
        self.to_bytes().hash_custom()
    }
}

impl Hashable for SignatureECDSA {
    fn hash_custom(&self) -> Hash {
        self.to_bytes().hash_custom()
    }
}

impl std::hash::Hash for AddressECDSA {
    fn hash<H: std::hash::Hasher>(&self, state: &mut H) {
        self.to_bytes().hash(state)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sha3::{Digest, Keccak256};

    #[test]
    fn test_verify_with_different_key() {
        let signer1 = PrivateKeyECDSA::generate();
        let signer2 = PrivateKeyECDSA::generate();

        let message = b"test message";
        let hash = Keccak256::digest(message);
        let hash_bytes: [u8; 32] = hash.into();
        let signature = signer1.sign_hash(&hash_bytes).unwrap();

        // Recover signer and verify it's not signer2's address
        let recovered = signature.recover_signer(&hash_bytes).unwrap();
        assert_ne!(
            recovered,
            AddressECDSA::new((*signer2.0.address()).into()),
            "Signature should not verify with different key"
        );
    }

    #[test]
    fn test_signature_uniqueness() {
        let message = b"test message";
        let hash = Keccak256::digest(message);
        let hash_bytes: [u8; 32] = hash.into();

        let signature1 = PrivateKeyECDSA::generate().sign_hash(&hash_bytes).unwrap();
        let signature2 = PrivateKeyECDSA::generate().sign_hash(&hash_bytes).unwrap();

        assert_ne!(
            signature1.to_bytes(),
            signature2.to_bytes(),
            "Signatures of same message should be different due to randomization"
        );
    }

    #[test]
    fn test_signature_recovery() {
        let signer = PrivateKeyECDSA::generate();
        let expected_address = AddressECDSA::new((*signer.0.address()).into());

        let message = b"test message";
        let hash = Keccak256::digest(message);
        let hash_bytes: [u8; 32] = hash.into();
        let signature = signer.sign_hash(&hash_bytes).unwrap();

        let recovered_address = signature.recover_signer(&hash_bytes).unwrap();
        assert_eq!(
            recovered_address, expected_address,
            "Should recover correct signer address"
        );
    }

    #[test]
    fn test_different_messages_same_key() {
        let signer = PrivateKeyECDSA::generate();
        let signer_address = AddressECDSA::new((*signer.0.address()).into());

        let message1 = b"first message";
        let hash1 = Keccak256::digest(message1);
        let hash_bytes1: [u8; 32] = hash1.into();

        let message2 = b"second message";
        let hash2 = Keccak256::digest(message2);
        let hash_bytes2: [u8; 32] = hash2.into();

        let signature1 = signer.sign_hash(&hash_bytes1).unwrap();
        let signature2 = signer.sign_hash(&hash_bytes2).unwrap();

        assert_eq!(
            signature1.recover_signer(&hash_bytes1).unwrap(),
            signer_address,
            "First signature should recover to correct address"
        );
        assert_eq!(
            signature2.recover_signer(&hash_bytes2).unwrap(),
            signer_address,
            "Second signature should recover to correct address"
        );

        assert_ne!(
            signature1.recover_signer(&hash_bytes1).unwrap(),
            signature2.recover_signer(&hash_bytes1).unwrap(),
            "First signature should not recover with second message"
        );

        assert_ne!(
            signature1.recover_signer(&hash_bytes2).unwrap(),
            signature2.recover_signer(&hash_bytes2).unwrap(),
            "Second signature should not recover with second message"
        );
    }

    #[test]
    fn test_tampered_signature() {
        let signer = PrivateKeyECDSA::generate();
        let message = b"test message";
        let hash = Keccak256::digest(message);
        let hash_bytes: [u8; 32] = hash.into();

        let signature = signer.sign_hash(&hash_bytes).unwrap();
        let mut tampered_bytes = signature.to_bytes();
        // Tamper with the first byte
        tampered_bytes[0] ^= 1;

        // Either signature creation should fail, or recovery should fail
        match SignatureECDSA::from_bytes(&tampered_bytes) {
            Ok(tampered_sig) => match tampered_sig.recover_signer(&hash_bytes) {
                Ok(recovered_address) => {
                    assert_ne!(
                        recovered_address,
                        AddressECDSA::new((*signer.0.address()).into()),
                        "Tampered signature should recover to different address"
                    );
                }
                Err(_) => {
                    // Recovery failed as expected for tampered signature
                    assert!(true, "Tampered signature failed to recover as expected");
                }
            },
            Err(_) => {
                // If creating the signature fails, that's also fine
                assert!(true, "Tampered signature was invalid");
            }
        }
    }

    #[test]
    fn test_empty_message() {
        let signer = PrivateKeyECDSA::generate();
        let signer_address = AddressECDSA::new((*signer.0.address()).into());

        let hash = Keccak256::digest(b"");
        let hash_bytes: [u8; 32] = hash.into();

        let signature = signer.sign_hash(&hash_bytes).unwrap();
        assert_eq!(
            signature.recover_signer(&hash_bytes).unwrap(),
            signer_address,
            "Empty message signature should recover correct signer"
        );
    }

    #[test]
    fn test_large_message() {
        let signer = PrivateKeyECDSA::generate();
        let signer_address = AddressECDSA::new((*signer.0.address()).into());
        let large_message = vec![b'A'; 1000000];
        let hash = Keccak256::digest(&large_message);
        let hash_bytes: [u8; 32] = hash.into();

        let signature = signer.sign_hash(&hash_bytes).unwrap();
        assert_eq!(
            signature.recover_signer(&hash_bytes).unwrap(),
            signer_address,
            "Large message signature should recover correct signer"
        );
    }

    #[test]
    fn test_keypair_generation() {
        let keypair = KeypairECDSA::generate();
        let message = b"test message";
        let hash = Keccak256::digest(message);
        let hash_bytes: [u8; 32] = hash.into();

        let signature = keypair.sign(&hash_bytes).unwrap();
        let recovered = signature.recover_signer(&hash_bytes).unwrap();
        assert_eq!(
            recovered, keypair.address,
            "Signature should recover to keypair's address"
        );
    }

    #[test]
    fn test_keypair_from_private_key() {
        let private_key = PrivateKeyECDSA::generate();

        let expected_address = AddressECDSA::new((*private_key.0.address()).into());
        let keypair = KeypairECDSA::from_private_key(private_key);

        let message = b"test message";
        let hash = Keccak256::digest(message);
        let hash_bytes: [u8; 32] = hash.into();

        let signature = keypair.sign(&hash_bytes).unwrap();
        let recovered = signature.recover_signer(&hash_bytes).unwrap();
        assert_eq!(
            recovered, expected_address,
            "Signature should recover to correct address"
        );
    }

    #[test]
    fn test_address_from_valid_bytes() {
        // Standard Ethereum address is 20 bytes
        let valid_bytes = vec![1u8; 20];
        let result = AddressECDSA::from_bytes(&valid_bytes);
        assert!(
            result.is_ok(),
            "Should successfully create address from valid bytes"
        );

        let address = result.unwrap();
        assert_eq!(
            address.to_bytes(),
            valid_bytes,
            "Address bytes should match input bytes"
        );
    }

    #[test]
    fn test_address_from_invalid_length() {
        // Try with invalid lengths
        let too_short = vec![1u8; 19];
        let too_long = vec![1u8; 21];

        assert!(
            AddressECDSA::from_bytes(&too_short).is_err(),
            "Should fail with too few bytes"
        );
        assert!(
            AddressECDSA::from_bytes(&too_long).is_err(),
            "Should fail with too many bytes"
        );
    }

    #[test]
    fn test_address_roundtrip() {
        let original_bytes = vec![42u8; 20];
        let address = AddressECDSA::from_bytes(&original_bytes).unwrap();
        let roundtrip_bytes = address.to_bytes();

        assert_eq!(
            original_bytes, roundtrip_bytes,
            "Address bytes should survive roundtrip conversion"
        );
    }

    #[test]
    fn test_address_empty_bytes() {
        let result = AddressECDSA::from_bytes(&[]);
        assert!(
            result.is_err(),
            "Should fail to create address from empty bytes"
        );
    }
}
