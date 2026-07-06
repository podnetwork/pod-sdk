//! Adversarial fuzzing of merkle proof verification.
//!
//! `verify_proof` / `verify_multi_proof` take fully untrusted input (proofs
//! arrive over RPC); they must return a bool and never panic, whatever the
//! shape of the proof.
#![no_main]

use arbitrary::Arbitrary;
use libfuzzer_sys::fuzz_target;
use pod_types::{
    Hash,
    cryptography::merkle_tree::{MerkleMultiProof, MerkleProof, MerkleTree},
};

#[derive(Arbitrary, Debug)]
struct Input {
    root: Hash,
    leaf: Hash,
    path: Vec<Hash>,
    leaves: Vec<Hash>,
    multi_path: Vec<Hash>,
    flags: Vec<bool>,
}

fuzz_target!(|input: Input| {
    let _ = MerkleTree::verify_proof(input.root, input.leaf, MerkleProof::new(input.path));
    let _ = MerkleTree::verify_multi_proof(
        input.root,
        &input.leaves,
        MerkleMultiProof {
            path: input.multi_path,
            flags: input.flags,
        },
    );
});
