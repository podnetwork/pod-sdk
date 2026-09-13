//! Structure-aware fuzzing of merkle tree construction and proof generation.
//!
//! Properties (keccak collisions assumed impossible):
//! - building a tree from any set of leaves never panics
//! - `generate_proof` never panics, for any index
//! - every leaf's proof verifies against the root
//! - a proof for one leaf does not verify for a different leaf
//! - multiproofs over any order-preserving subset of unique leaves verify
#![no_main]

use arbitrary::Arbitrary;
use libfuzzer_sys::fuzz_target;
use pod_types::{
    Hash,
    cryptography::merkle_tree::{MerkleTree, StandardMerkleTree},
};
use std::collections::HashSet;

#[derive(Arbitrary, Debug)]
struct Input {
    leaves: Vec<Hash>,
    /// Arbitrary (possibly out-of-range, possibly internal) node index.
    probe_index: usize,
    /// A leaf that is (usually) not part of the tree.
    foreign_leaf: Hash,
    /// Which leaves to include in the multiproof.
    selection: Vec<bool>,
}

fuzz_target!(|input: Input| {
    let Input {
        leaves,
        probe_index,
        foreign_leaf,
        selection,
    } = input;

    let tree = MerkleTree::new(&leaves);
    let root = tree.root();
    let tree_len = tree.length();

    // Probing any index must return Ok/Err, never panic.
    let _ = tree.generate_proof(probe_index);

    // Leaf i is stored at tree index tree_len - 1 - i.
    for (i, &leaf) in leaves.iter().enumerate() {
        let proof = tree
            .generate_proof(tree_len - 1 - i)
            .expect("leaf index must be provable");
        assert!(
            MerkleTree::verify_proof(root, leaf, proof.clone()),
            "proof for own leaf must verify"
        );
        if foreign_leaf != leaf {
            assert!(
                !MerkleTree::verify_proof(root, foreign_leaf, proof),
                "proof must not verify for a different leaf"
            );
        }
    }

    // StandardMerkleTree: lookup by leaf value.
    let std_tree = StandardMerkleTree::new(leaves.clone());
    assert_eq!(std_tree.root(), root);
    for &leaf in &leaves {
        let proof = std_tree.generate_proof(leaf).expect("leaf is in the tree");
        assert!(StandardMerkleTree::verify_proof(root, leaf, proof));
    }
    if !leaves.contains(&foreign_leaf) {
        assert!(std_tree.generate_proof(foreign_leaf).is_none());
        assert!(std_tree.generate_multi_proof(&[foreign_leaf]).is_none());
    }

    // Multiproofs assume unique leaves passed in tree (insertion) order.
    let unique = leaves.iter().collect::<HashSet<_>>().len() == leaves.len();
    if unique {
        let subset: Vec<Hash> = leaves
            .iter()
            .zip(selection.into_iter().chain(std::iter::repeat(false)))
            .filter_map(|(leaf, keep)| keep.then_some(*leaf))
            .collect();

        let proof = std_tree
            .generate_multi_proof(&subset)
            .expect("all subset leaves are in the tree");
        assert!(
            StandardMerkleTree::verify_multi_proof(root, &subset, proof.clone()),
            "multiproof for own leaves must verify"
        );
        if foreign_leaf != root {
            assert!(
                !StandardMerkleTree::verify_multi_proof(foreign_leaf, &subset, proof),
                "multiproof must not verify against a different root"
            );
        }
    }
});
