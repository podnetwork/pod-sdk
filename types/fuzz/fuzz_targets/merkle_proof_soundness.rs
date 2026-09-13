//! Soundness of merkle proof verification: proofs from `generate_proof` /
//! `generate_multi_proof` must verify, and every tampered or garbage variant
//! must be rejected (keccak collisions assumed impossible).
//!
//! Tampering covered, per variant:
//! - single proof: corrupted path element, truncated path, extended path,
//!   arbitrary garbage path
//! - multiproof: corrupted path element, truncated path, extended path,
//!   flipped flag, dropped leaf, added leaf, arbitrary garbage path+flags
//!
//! Not asserted: a *reordered* leaf subset failing multiproof verification —
//! pair hashing is commutative, so e.g. two sibling leaves verify in either
//! order.
#![no_main]

use arbitrary::Arbitrary;
use libfuzzer_sys::fuzz_target;
use pod_types::{
    Hash,
    cryptography::merkle_tree::{MerkleMultiProof, MerkleProof, StandardMerkleTree},
};
use std::collections::HashSet;

#[derive(Arbitrary, Debug)]
struct Input {
    leaves: Vec<Hash>,
    /// Which leaves go into the multiproof subset.
    selection: Vec<bool>,
    /// Fully arbitrary proof material.
    garbage_path: Vec<Hash>,
    garbage_flags: Vec<bool>,
    /// Where and what to corrupt.
    tamper_index: usize,
    tamper_value: Hash,
}

fuzz_target!(|input: Input| {
    let Input {
        mut leaves,
        selection,
        garbage_path,
        garbage_flags,
        tamper_index,
        tamper_value,
    } = input;

    // Duplicate leaf values have several valid proofs (one per occurrence),
    // which breaks "any other proof is garbage"; keep first occurrences only.
    let mut seen = HashSet::new();
    leaves.retain(|leaf| seen.insert(*leaf));

    let tree = StandardMerkleTree::new(leaves.clone());
    let root = tree.root();

    // --- Single proofs ---
    for &leaf in &leaves {
        let proof = tree.generate_proof(leaf).expect("leaf is in the tree");
        assert!(
            StandardMerkleTree::verify_proof(root, leaf, proof.clone()),
            "generated proof must verify"
        );

        if !proof.path.is_empty() {
            // Corrupt one path element.
            let i = tamper_index % proof.path.len();
            if proof.path[i] != tamper_value {
                let mut tampered = proof.clone();
                tampered.path[i] = tamper_value;
                assert!(
                    !StandardMerkleTree::verify_proof(root, leaf, tampered),
                    "corrupted path element must be rejected"
                );
            }

            // Truncate the path.
            let mut truncated = proof.clone();
            truncated.path.pop();
            assert!(
                !StandardMerkleTree::verify_proof(root, leaf, truncated),
                "truncated proof must be rejected"
            );
        }

        // Extend the path.
        let mut extended = proof.clone();
        extended.path.push(tamper_value);
        assert!(
            !StandardMerkleTree::verify_proof(root, leaf, extended),
            "extended proof must be rejected"
        );

        // Arbitrary garbage path (the only verifying path is the real one).
        if garbage_path != proof.path {
            assert!(
                !StandardMerkleTree::verify_proof(
                    root,
                    leaf,
                    MerkleProof::new(garbage_path.clone())
                ),
                "garbage proof must be rejected"
            );
        }
    }

    // --- Multiproofs ---
    let subset: Vec<Hash> = leaves
        .iter()
        .zip(selection.into_iter().chain(std::iter::repeat(false)))
        .filter_map(|(leaf, keep)| keep.then_some(*leaf))
        .collect();

    let proof = tree
        .generate_multi_proof(&subset)
        .expect("all subset leaves are in the tree");
    assert!(
        StandardMerkleTree::verify_multi_proof(root, &subset, proof.clone()),
        "generated multiproof must verify"
    );

    if !proof.path.is_empty() {
        // Corrupt one path element.
        let i = tamper_index % proof.path.len();
        if proof.path[i] != tamper_value {
            let mut tampered = proof.clone();
            tampered.path[i] = tamper_value;
            assert!(
                !StandardMerkleTree::verify_multi_proof(root, &subset, tampered),
                "corrupted multiproof path element must be rejected"
            );
        }

        // Truncate the path.
        let mut truncated = proof.clone();
        truncated.path.pop();
        assert!(
            !StandardMerkleTree::verify_multi_proof(root, &subset, truncated),
            "truncated multiproof must be rejected"
        );
    }

    // Extend the path.
    let mut extended = proof.clone();
    extended.path.push(tamper_value);
    assert!(
        !StandardMerkleTree::verify_multi_proof(root, &subset, extended),
        "extended multiproof must be rejected"
    );

    // Flip one flag.
    if !proof.flags.is_empty() {
        let i = tamper_index % proof.flags.len();
        let mut flipped = proof.clone();
        flipped.flags[i] = !flipped.flags[i];
        assert!(
            !StandardMerkleTree::verify_multi_proof(root, &subset, flipped),
            "multiproof with flipped flag must be rejected"
        );
    }

    // Drop a leaf from the subset.
    if !subset.is_empty() {
        assert!(
            !StandardMerkleTree::verify_multi_proof(
                root,
                &subset[..subset.len() - 1],
                proof.clone()
            ),
            "multiproof with missing leaf must be rejected"
        );
    }

    // Add a leaf to the subset.
    if !subset.contains(&tamper_value) {
        let mut padded = subset.clone();
        padded.push(tamper_value);
        assert!(
            !StandardMerkleTree::verify_multi_proof(root, &padded, proof.clone()),
            "multiproof with extra leaf must be rejected"
        );
    }

    // Arbitrary garbage proof material.
    if (garbage_path.as_slice(), garbage_flags.as_slice())
        != (proof.path.as_slice(), proof.flags.as_slice())
    {
        assert!(
            !StandardMerkleTree::verify_multi_proof(
                root,
                &subset,
                MerkleMultiProof {
                    path: garbage_path,
                    flags: garbage_flags,
                }
            ),
            "garbage multiproof must be rejected"
        );
    }
});
