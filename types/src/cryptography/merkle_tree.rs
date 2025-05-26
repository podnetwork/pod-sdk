use alloy_sol_types::SolValue;
use anyhow::{Result, bail};
use itertools::Itertools;
use serde::{Deserialize, Serialize};
use std::{
    collections::{HashMap, VecDeque},
    ops::Deref,
};

use crate::cryptography::hash::{Hash, Hashable};

#[derive(Debug, Clone, Default)]
pub struct MerkleTree {
    tree: Vec<Hash>,
}

#[derive(Debug)]
pub struct StandardMerkleTree {
    tree: MerkleTree,
    indices: HashMap<Hash, usize>,
}

impl Deref for StandardMerkleTree {
    type Target = MerkleTree;

    fn deref(&self) -> &Self::Target {
        &self.tree
    }
}

#[derive(Debug, PartialEq, Clone, Serialize, Deserialize)]
pub struct MerkleProof {
    pub path: Vec<Hash>,
}

#[derive(Debug, PartialEq, Clone, Serialize, Deserialize)]
pub struct MerkleMultiProof {
    path: Vec<Hash>,
    flags: Vec<bool>,
}

impl MerkleProof {
    pub fn new(path: Vec<Hash>) -> Self {
        MerkleProof { path }
    }
}

fn hash_pair(left: Hash, right: Hash) -> Hash {
    [left, right].concat().hash_custom()
}

fn commutative_hash_pair(left: Hash, right: Hash) -> Hash {
    if left < right {
        hash_pair(left, right)
    } else {
        hash_pair(right, left)
    }
}

fn left_child_index(index: usize) -> usize {
    2 * index + 1
}

fn right_child_index(index: usize) -> usize {
    2 * index + 2
}

fn parent_index(index: usize) -> usize {
    (index - 1) / 2
}

fn sibling_index(index: usize) -> usize {
    if index % 2 == 0 { index - 1 } else { index + 1 }
}

fn is_leaf_index(tree_len: usize, index: usize) -> bool {
    index < tree_len && left_child_index(index) >= tree_len
}

impl Hashable for StandardMerkleTree {
    fn hash_custom(&self) -> Hash {
        self.root()
    }
}

impl Hashable for MerkleTree {
    fn hash_custom(&self) -> Hash {
        self.root()
    }
}

impl StandardMerkleTree {
    pub fn hash_leaf(prefix: String, leaf: Hash) -> Hash {
        (prefix, leaf).abi_encode_packed().hash_custom()
    }

    pub fn new(leaves: Vec<Hash>) -> Self {
        let leaves_sorted = leaves.into_iter().sorted().collect::<Vec<_>>();

        let tree = MerkleTree::new(&leaves_sorted);
        let indices = leaves_sorted
            .into_iter()
            .enumerate()
            .map(|(i, leaf)| (leaf, tree.length() - i - 1))
            .collect::<HashMap<Hash, usize>>();

        Self { tree, indices }
    }

    pub fn generate_proof(&self, leaf: Hash) -> Result<MerkleProof> {
        if let Some(&tree_index) = self.indices.get(&leaf) {
            self.tree.generate_proof(tree_index)
        } else {
            bail!("leaf not found")
        }
    }

    pub fn generate_multi_proof(&self, leaves: &[Hash]) -> Option<MerkleMultiProof> {
        let mut indices = Vec::new();
        for leaf in leaves {
            if let Some(&tree_index) = self.indices.get(leaf) {
                indices.push(tree_index);
            } else {
                return None;
            }
        }

        self.tree.generate_multi_proof(&indices)
    }

    pub fn verify_proof(root: Hash, leaf: Hash, proof: MerkleProof) -> bool {
        MerkleTree::verify_proof(root, leaf, proof)
    }

    pub fn verify_multi_proof(
        root: Hash,
        leaves: &[Hash],
        proof: MerkleMultiProof,
    ) -> Result<bool> {
        MerkleTree::verify_multi_proof(root, leaves, proof)
    }
}

fn join_prefix(prefix: &str, sub: &str) -> String {
    match (prefix.is_empty(), sub.is_empty()) {
        (true, true) => "".to_string(),
        (true, false) => sub.to_string(),
        (false, true) => prefix.to_string(),
        (false, false) => format!("{}.{}", prefix, sub),
    }
}

pub fn index_prefix(prefix: &str, index: usize) -> String {
    if prefix.is_empty() {
        format!("[{}]", index)
    } else {
        format!("{}[{}]", prefix, index)
    }
}

fn apply_prefix_to_leaf(prefix: &str, (sub_prefix, leaf): (String, Hash)) -> Hash {
    StandardMerkleTree::hash_leaf(join_prefix(prefix, &sub_prefix), leaf)
}

fn apply_prefix_to_leaves(prefix: &str, leaves: Vec<(String, Hash)>) -> Vec<Hash> {
    leaves
        .into_iter()
        .map(|leaf| apply_prefix_to_leaf(prefix, leaf))
        .collect()
}
pub struct MerkleBuilder {
    leaves: Vec<(String, Hash)>,
}

impl Default for MerkleBuilder {
    fn default() -> Self {
        Self::new()
    }
}

impl MerkleBuilder {
    pub fn new() -> Self {
        Self { leaves: Vec::new() }
    }

    pub fn add_field(&mut self, name: impl Into<String>, hash: Hash) {
        self.leaves.push((name.into(), hash));
    }

    pub fn add_merkleizable(&mut self, prefix: &str, item: &impl Merkleizable) {
        for (sub_field, hash) in item.leaves() {
            self.leaves.push((join_prefix(prefix, &sub_field), hash));
        }
    }

    pub fn add_slice<T: Merkleizable>(&mut self, prefix: &str, items: &[T]) {
        for (index, item) in items.iter().enumerate() {
            self.add_merkleizable(&index_prefix(prefix, index), item);
        }
    }

    pub fn build(self) -> Vec<(String, Hash)> {
        self.leaves
    }
}
pub trait Merkleizable {
    fn append_leaves(&self, builder: &mut MerkleBuilder);

    fn leaves(&self) -> Vec<(String, Hash)> {
        let mut builder = MerkleBuilder::new();
        self.append_leaves(&mut builder);
        builder.build()
    }

    fn to_merkle_tree(&self) -> StandardMerkleTree {
        let leaves = self
            .leaves()
            .into_iter()
            .map(|(path, leaf)| StandardMerkleTree::hash_leaf(path, leaf))
            .collect::<Vec<_>>();

        StandardMerkleTree::new(leaves)
    }

    // Generate a proof for the given item.
    fn generate_proof<T: Merkleizable>(&self, prefix: &str, item: &T) -> Result<MerkleProof> {
        let leaves = item.leaves();
        if leaves.len() != 1 {
            bail!("more than one leaf given");
        }

        let leaf = apply_prefix_to_leaf(prefix, leaves[0].to_owned());
        self.to_merkle_tree().generate_proof(leaf)
    }

    // Generate proofs for the given items.
    fn generate_proofs<T: Merkleizable>(
        &self,
        prefix: &str,
        items: &[T],
    ) -> Result<Vec<MerkleProof>> {
        let leaves = apply_prefix_to_leaves(prefix, items.leaves());
        let tree = self.to_merkle_tree();
        leaves
            .into_iter()
            .map(|leaf| tree.generate_proof(leaf))
            .collect()
    }

    // Generates a multiproof for all children of a given item.
    fn generate_multi_proof<T: Merkleizable>(
        &self,
        prefix: &str,
        item: &T,
    ) -> Option<(Vec<Hash>, MerkleMultiProof)> {
        let leaves = apply_prefix_to_leaves(prefix, item.leaves());
        Some((
            leaves.clone(),
            self.to_merkle_tree().generate_multi_proof(&leaves)?,
        ))
    }

    // Generates multiproofs for all children of the given items.
    fn generate_multi_proofs<T: Merkleizable>(
        &self,
        prefix: &str,
        items: &[T],
    ) -> Option<(Vec<Hash>, MerkleMultiProof)> {
        let leaves = items
            .iter()
            .enumerate()
            .flat_map(|(index, item)| {
                apply_prefix_to_leaves(&index_prefix(prefix, index), item.leaves())
            })
            .collect::<Vec<_>>();
        Some((
            leaves.clone(),
            self.to_merkle_tree().generate_multi_proof(&leaves)?,
        ))
    }
}

impl Merkleizable for Hash {
    fn append_leaves(&self, builder: &mut MerkleBuilder) {
        builder.add_field("", *self);
    }
}

impl<T: Merkleizable> Merkleizable for &[T] {
    fn append_leaves(&self, builder: &mut MerkleBuilder) {
        builder.add_slice("", self);
    }
}

impl<T: Merkleizable> Merkleizable for Vec<T> {
    fn append_leaves(&self, builder: &mut MerkleBuilder) {
        self.as_slice().append_leaves(builder);
    }
}

impl MerkleTree {
    pub fn new(leaves: &[Hash]) -> Self {
        if leaves.is_empty() {
            // TODO: right approach?
            return MerkleTree {
                tree: vec![Hash::default()],
            };
        }
        let leaves_len = leaves.len();
        let tree_len = 2 * leaves_len - 1;
        let mut tree = vec![Hash::default(); tree_len];

        for (i, leaf) in leaves.iter().enumerate() {
            tree[tree_len - 1 - i] = *leaf;
        }

        for i in (0..tree_len - leaves_len).rev() {
            let left_leaf = tree[left_child_index(i)];
            let right_leaf = tree[right_child_index(i)];
            tree[i] = commutative_hash_pair(left_leaf, right_leaf);
        }

        Self { tree }
    }

    pub fn root(&self) -> Hash {
        self.tree[0]
    }

    pub fn length(&self) -> usize {
        self.tree.len()
    }

    pub fn generate_proof(&self, index: usize) -> Result<MerkleProof> {
        let tree_len = self.tree.len();
        if !is_leaf_index(tree_len, index) {
            bail!("invalid index {}", index);
        }

        let mut path = Vec::new();
        let mut current = index;
        while current > 0 {
            let sibling = sibling_index(current);
            if sibling < tree_len {
                path.push(self.tree[sibling]);
            }

            current = parent_index(current);
        }

        Ok(MerkleProof::new(path))
    }

    pub fn generate_multi_proof(&self, indices: &[usize]) -> Option<MerkleMultiProof> {
        let tree_len = self.tree.len();
        if indices.iter().any(|&i| !is_leaf_index(tree_len, i)) {
            return None;
        }

        let sorted_indices = indices
            .iter()
            .cloned()
            .sorted_by(|a, b| b.cmp(a))
            .unique()
            .collect::<Vec<_>>();

        let mut stack = VecDeque::from(sorted_indices);
        let mut path = Vec::new();
        let mut flags = Vec::new();

        while let Some(j) = stack.pop_front() {
            if j == 0 {
                break;
            }

            let s = sibling_index(j);
            let p = parent_index(j);

            match stack.front() {
                Some(&next) if next == s => {
                    flags.push(true);
                    stack.pop_front();
                }
                _ => {
                    flags.push(false);
                    path.push(self.tree[s]);
                }
            }

            stack.push_back(p);
        }

        if indices.is_empty() {
            path.push(self.tree[0]);
        }

        Some(MerkleMultiProof { path, flags })
    }

    pub fn verify_proof(root: Hash, leaf: Hash, proof: MerkleProof) -> bool {
        root == proof.path.into_iter().fold(leaf, commutative_hash_pair)
    }

    pub fn verify_multi_proof(
        root: Hash,
        leaves: &[Hash],
        proof: MerkleMultiProof,
    ) -> Result<bool> {
        let path_len = proof.path.len();
        if path_len < proof.flags.iter().filter(|&&f| !f).count() {
            bail!("invalid multiproof: too few path hashes");
        }

        if leaves.len() + path_len != proof.flags.len() + 1 {
            bail!("invalid multiproof: invalid total hashes");
        }

        // This is a deviation from OpenZeppelin's implementation,
        // which expects leaves to be given in sorted order.
        let mut stack = leaves.iter().cloned().sorted().collect::<Vec<Hash>>();

        let mut path = proof.path.to_vec();

        for flag in proof.flags {
            let a = stack.remove(0);
            let b = if flag {
                stack.remove(0)
            } else {
                path.remove(0)
            };

            stack.push(commutative_hash_pair(a, b));
        }

        let reconstructed_root = match (stack.len(), path.len()) {
            (1, 0) => stack.remove(0),
            (0, 1) => path.remove(0),
            _ => panic!("invalid multiproof: invalid total hashes"),
        };

        Ok(root == reconstructed_root)
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use alloy_sol_types::SolValue;

    #[test]
    pub fn test_standard_tree_proof() {
        let leaves = vec![
            StandardMerkleTree::hash_leaf("0".to_string(), 1u32.abi_encode().hash_custom()),
            StandardMerkleTree::hash_leaf("1".to_string(), 2u32.abi_encode().hash_custom()),
            StandardMerkleTree::hash_leaf("2".to_string(), 3u32.abi_encode().hash_custom()),
        ];
        let tree = StandardMerkleTree::new(leaves.clone());
        let leaf = leaves[1];
        let proof = tree.generate_proof(leaf).unwrap();
        assert!(MerkleTree::verify_proof(tree.root(), leaf, proof.clone()));
    }

    #[test]
    pub fn test_standard_tree_multi_proof() {
        let leaves = vec![
            StandardMerkleTree::hash_leaf("0".to_string(), 1u32.abi_encode().hash_custom()),
            StandardMerkleTree::hash_leaf("1".to_string(), 2u32.abi_encode().hash_custom()),
            StandardMerkleTree::hash_leaf("2".to_string(), 3u32.abi_encode().hash_custom()),
        ];
        let tree = StandardMerkleTree::new(leaves.clone());
        let proof = tree.generate_multi_proof(&leaves).unwrap();
        assert!(MerkleTree::verify_multi_proof(tree.root(), &leaves, proof.clone()).unwrap());
    }
}
