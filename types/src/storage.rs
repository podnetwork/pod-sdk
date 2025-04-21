use alloy_primitives::{keccak256, Address, Uint, B256};
use alloy_sol_types::SolValue;
use anyhow::{anyhow, Context, Result};

use bincode;
use rand::{distributions::Alphanumeric, Rng};
use rocksdb::{DBAccess, IteratorMode, TransactionDB, TransactionOptions, WriteOptions};
use serde::{de::DeserializeOwned, Deserialize, Serialize};

use std::path::PathBuf;

use crate::ecdsa::AddressECDSA;
use crate::{Attestation, Hashable, HeadlessAttestation, Timestamp};

use alloy_primitives::B256 as Hash;

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Indexed<T> {
    #[serde(rename = "timestamp")]
    pub index: Timestamp, // TODO: consider sequential numbers
    pub value: T,
}

impl<T> Indexed<T> {
    pub fn new(index: Timestamp, value: T) -> Self {
        Indexed { index, value }
    }
}

impl<T> From<Indexed<Attestation<T>>> for Indexed<HeadlessAttestation> {
    fn from(value: Indexed<Attestation<T>>) -> Self {
        Indexed {
            index: value.index,
            value: value.value.into(),
        }
    }
}

impl<T: Hashable> Hashable for Indexed<T> {
    fn hash_custom(&self) -> Hash {
        keccak256(
            [
                self.index.as_micros().abi_encode(),
                self.value.hash_custom().to_vec(),
            ]
            .concat(),
        )
    }
}

pub trait Key {
    // We require lexicographic comparison to be preserved
    // a > b => a.key() > b.key()
    fn as_key(&self) -> String;
}

impl Key for Address {
    fn as_key(&self) -> String {
        format!("{}", self)
    }
}

impl Key for B256 {
    fn as_key(&self) -> String {
        format!("{}", self)
    }
}

impl Key for Timestamp {
    fn as_key(&self) -> String {
        // padded to 39 characters, enough for u128 micros
        format!("{:039}", self.as_micros())
    }
}

impl Key for AddressECDSA {
    fn as_key(&self) -> String {
        self.to_string()
    }
}

impl Key for [u8; 4] {
    fn as_key(&self) -> String {
        hex::encode(self)
    }
}

impl Key for u64 {
    fn as_key(&self) -> String {
        format!("{:016x}", self)
    }
}

impl<const BITS: usize, const LIMBS: usize> Key for Uint<BITS, LIMBS> {
    fn as_key(&self) -> String {
        format!("{:0width$x}", self, width = BITS / 4)
    }
}

impl<U, V> Key for (U, V)
where
    U: Key,
    V: Key,
{
    fn as_key(&self) -> String {
        format!("{}_{}", self.0.as_key(), self.1.as_key())
    }
}

impl Key for Vec<&dyn Key> {
    fn as_key(&self) -> String {
        self.iter()
            .map(|k| k.as_key())
            .collect::<Vec<_>>()
            .join("_")
    }
}

impl<K: Key> Key for Vec<K> {
    fn as_key(&self) -> String {
        self.iter()
            .map(|k| k.as_key())
            .collect::<Vec<_>>()
            .join("_")
    }
}

// Define the macro
#[macro_export]
macro_rules! format_key {
    ($fmt:expr, $($arg:expr),+ $(,)?) => {{
        // Ensure all arguments implement the Key trait
        format!($fmt, $($arg.as_key()),*)
    }};
}

// Meta-macro to define key-related macros with variable arguments
#[macro_export]
macro_rules! define_key_macro {
    // This defines a key macro that takes a format string and variable arguments
    // The $sign is used as a trick, so that $vars inside the inner macro definition is not replaced by the outer meta-macro
    ($sign: tt $name: ident, $fmt: expr) => {
        #[macro_export]
        macro_rules! $name {
                                                            // Match any number of arguments and handle them
                                                            ($sign($arg: expr),* $sign(,)?) => {{
                                                                // Format the key using the provided format string and arguments
                                                                let formatted = format!(
                                                                    $fmt,
                                                                    $sign($sign arg.as_key()),*  // Expand the arguments properly
                                                                );
                                                                formatted
                                                            }};
                                                        }
    };
}

// RocksDB trait allows us to use the same code for both a rocksdb database and a transaction
pub trait RocksDB: DBAccess
where
    Self: Sized,
{
    fn get<K: AsRef<[u8]>>(&self, key: K) -> Result<Option<Vec<u8>>>;
    fn put<K: AsRef<[u8]>>(&self, key: K, value: &[u8]) -> Result<()>;
    fn delete<K: AsRef<[u8]>>(&self, key: K) -> Result<()>;
    fn iterator<'a>(&'a self, mode: IteratorMode) -> rocksdb::DBIteratorWithThreadMode<'a, Self>;
}

impl RocksDB for TransactionDB {
    fn get<K: AsRef<[u8]>>(&self, key: K) -> Result<Option<Vec<u8>>> {
        Ok(TransactionDB::get(self, key)?)
    }

    fn put<K: AsRef<[u8]>>(&self, key: K, value: &[u8]) -> Result<()> {
        let mut write_options = rocksdb::WriteOptions::default();
        write_options.set_sync(true);
        TransactionDB::put_opt(self, key, value, &write_options)?;
        Ok(())
    }

    fn delete<K: AsRef<[u8]>>(&self, key: K) -> Result<()> {
        let mut write_options = rocksdb::WriteOptions::default();
        write_options.set_sync(true);
        TransactionDB::delete_opt(self, key, &write_options)?;
        Ok(())
    }

    fn iterator<'a>(
        &'a self,
        mode: IteratorMode,
    ) -> rocksdb::DBIteratorWithThreadMode<'a, TransactionDB> {
        TransactionDB::iterator(self, mode)
    }
}

impl RocksDB for rocksdb::Transaction<'_, TransactionDB> {
    fn get<K: AsRef<[u8]>>(&self, key: K) -> Result<Option<Vec<u8>>> {
        Ok(rocksdb::Transaction::get_for_update(self, key, true)?)
    }

    fn put<K: AsRef<[u8]>>(&self, key: K, value: &[u8]) -> Result<()> {
        rocksdb::Transaction::put(self, key, value)?;
        Ok(())
    }

    fn delete<K: AsRef<[u8]>>(&self, key: K) -> Result<()> {
        rocksdb::Transaction::delete(self, key)?;
        Ok(())
    }

    fn iterator<'a>(&'a self, mode: IteratorMode) -> rocksdb::DBIteratorWithThreadMode<'a, Self> {
        rocksdb::Transaction::iterator(self, mode)
    }
}

pub struct PaginatedResult<T> {
    pub items: Vec<T>,
    pub cursor: Option<(String, String)>,
}

type RawKeyValue = (Box<[u8]>, Box<[u8]>);

// KVStorage allows us to define a higher-level api than the rocksdb one
// without defining the trait twice.
// Also, this can allow us to swap the underlying storage engine if needed.
pub trait KVStorage {
    fn get<D: DeserializeOwned>(&self, key: &str) -> Result<D>;

    /*
    fn stream<'a, D: Deserialize<'a>>(
        &'a self,
        from_key: &str,
        to_key: &str
    ) -> Box<dyn Stream<Item = Result<(String, D)>>>;
    */

    fn count(&self, from_key: &str, to_key: &str) -> Result<usize>;

    /// Iterate over raw bytes of (key, value) pairs
    ///
    /// It recommended to use it when actual values (decoded th their original types) aren't
    /// needed, or it is desired to skip some items (e.g pick the last element or skip elements
    /// matching a key) to avoid deserializing items that will be dumped anyway.
    fn iterate_raw<Key: ToString>(
        &self,
        from_key: Key,
        to_key: Key,
    ) -> impl Iterator<Item = Result<RawKeyValue>>;

    /// Iterate over (key, value) pairs from `from_key` to `to_key` inclusive
    fn iterate<Key: ToString, D: DeserializeOwned>(
        &self,
        from_key: Key,
        to_key: Key,
    ) -> impl Iterator<Item = Result<(String, D)>> {
        self.iterate_raw(from_key, to_key).map(|entry| {
            let (k, v) = entry?;
            Ok((
                String::from_utf8(k.into_vec()).context("invalid utf8 key")?,
                bincode::deserialize(&v).context("failed to deserialize during iteration")?,
            ))
        })
    }

    /// Iterate over keys from `from_key` to `to_key` inclusive
    fn iterate_keys<Key: ToString>(
        &self,
        from_key: Key,
        to_key: Key,
    ) -> impl Iterator<Item = Result<String>> {
        self.iterate_raw(from_key, to_key).map(|entry| {
            let (k, _) = entry?;
            String::from_utf8(k.into_vec()).context("invalid utf8 key")
        })
    }

    /// Iterate over  values from `from_key` to `to_key` inclusive
    fn iterate_values<Key: ToString, D: DeserializeOwned>(
        &self,
        from_key: Key,
        to_key: Key,
    ) -> impl Iterator<Item = Result<D>> {
        self.iterate_raw(from_key, to_key).map(|entry| {
            let (_, v) = entry?;
            bincode::deserialize(&v).context("failed to deserialize during iteration")
        })
    }

    fn list<Key: ToString, D: for<'de> DeserializeOwned>(
        &self,
        from_key: Key,
        to_key: Key,
        limit: Option<usize>,
    ) -> Result<Vec<(String, D)>> {
        self.iterate(from_key, to_key)
            .take(limit.unwrap_or(usize::MAX))
            .collect()
    }

    fn list_values<Key: ToString, D: for<'de> DeserializeOwned>(
        &self,
        from_key: Key,
        to_key: Key,
        limit: Option<usize>,
    ) -> Result<Vec<D>> {
        self.iterate_values(from_key, to_key)
            .take(limit.unwrap_or(usize::MAX))
            .collect()
    }

    fn delete<K: AsRef<[u8]>>(&self, key: &K) -> Result<()>;

    fn delete_range(&self, from_key: &str, to_key: &str) -> Result<()> {
        for res in self.iterate_raw(from_key, to_key) {
            let (k, _) = res.context("failed to iterate to next item")?;
            self.delete(&k)?;
        }
        Ok(())
    }

    fn paginate_values<D: for<'de> DeserializeOwned>(
        &self,
        start_key: &str,
        end_key: &str,
        limit: usize,
    ) -> Result<PaginatedResult<D>> {
        let entries = self.list(start_key, end_key, Some(limit + 1))?;

        let cursor = if entries.len() > limit {
            Some((entries[limit].0.clone(), end_key.to_string()))
        } else {
            None
        };

        Ok(PaginatedResult {
            items: entries.into_iter().map(|(_, v)| v).take(limit).collect(),
            cursor,
        })
    }

    fn put<T: Serialize>(&self, key: &str, value: &T) -> Result<()>;
}

/// Iterator that iterates over raw byte (key, value) pairs in the DB.
struct DBRawIterator<'db, DB: DBAccess> {
    direction: rocksdb::Direction,
    _from: String,
    to: String,
    iterator: rocksdb::DBIteratorWithThreadMode<'db, DB>,
}

impl<'db, DB: RocksDB> DBRawIterator<'db, DB> {
    fn new(from: String, to: String, db: &'db DB) -> Self {
        let direction = if from <= to {
            rocksdb::Direction::Forward
        } else {
            rocksdb::Direction::Reverse
        };

        Self {
            iterator: db.iterator(IteratorMode::From(from.as_bytes(), direction)),
            direction,
            _from: from,
            to,
        }
    }
}

impl<DB> Iterator for DBRawIterator<'_, DB>
where
    DB: DBAccess,
{
    type Item = Result<(Box<[u8]>, Box<[u8]>)>;

    fn next(&mut self) -> Option<Self::Item> {
        let res = self.iterator.next()?;
        let (k, v) = match res {
            Ok((k, v)) => (k, v),
            Err(e) => return Some(Err(anyhow!("failed to get next iterated item: {e:?}"))),
        };

        match self.direction {
            rocksdb::Direction::Forward => {
                if k.as_ref() > self.to.as_bytes() {
                    return None;
                }
            }
            rocksdb::Direction::Reverse => {
                if k.as_ref() < self.to.as_bytes() {
                    return None;
                }
            }
        }

        Some(Ok((k, v)))
    }
}

pub trait KVTransactionalStorage: KVStorage {
    type Tx<'tx>: KVTransaction
    where
        Self: 'tx;
    fn begin_transaction(&self) -> Result<Self::Tx<'_>>;
}

pub trait TemporaryStorage: Sized {
    fn temporary() -> Result<Self>;
}

impl TemporaryStorage for TransactionDB {
    fn temporary() -> Result<Self> {
        let mut opts = rocksdb::Options::default();
        // opts.set_env(&rocksdb::Env::mem_env().unwrap());
        opts.create_if_missing(true);
        let txopts = rocksdb::TransactionDBOptions::default();

        let random_string: String = rand::thread_rng()
            .sample_iter(&Alphanumeric)
            .take(10) // Length of the random string
            .map(char::from)
            .collect();

        let path = PathBuf::from("/tmp/pod-rocksdb/").join(random_string);

        let db = TransactionDB::open(&opts, &txopts, path)?;
        Ok(db)
    }
}

pub trait KVTransaction: KVStorage {
    fn commit(self) -> Result<()>;
    fn rollback(self) -> Result<()>;
}

impl<T: RocksDB> KVStorage for T {
    fn get<D: for<'de> DeserializeOwned>(&self, key: &str) -> Result<D> {
        let opt_value = self.get(key.as_bytes())?;
        if let Some(value) = opt_value {
            Ok(bincode::deserialize(&value)?)
        } else {
            Err(anyhow!("Key not found"))
        }
    }

    fn count(&self, from_key: &str, to_key: &str) -> Result<usize> {
        let direction = if from_key <= to_key {
            rocksdb::Direction::Forward
        } else {
            rocksdb::Direction::Reverse
        };
        let iter = self.iterator(IteratorMode::From(from_key.as_bytes(), direction));

        let mut count = 0;

        for item in iter {
            let (k, _value) = item?;
            if matches!(direction, rocksdb::Direction::Forward) && k.as_ref() > to_key.as_bytes()
                || matches!(direction, rocksdb::Direction::Reverse)
                    && k.as_ref() < to_key.as_bytes()
            {
                break;
            }
            count += 1;
        }
        Ok(count)
    }

    /*
    fn stream<'a, D: for<'de> Deserialize<'de> + 'static>(
        &'a self,
        from_key: &'a str,
        to_key: &'a str
    ) -> Box<dyn Stream<Item = Result<(String, D)>> + 'a> {
        let iter = self.iterator(IteratorMode::From(
            from_key.as_bytes(),
            rocksdb::Direction::Forward,
        ));
        Box::new(stream! {
            for item in iter {
                let (k, value) = item?;
                if k.as_ref() >= to_key.as_bytes() {
                    break;
                }
                yield Ok((
                    String::from_utf8(k.to_vec())
                        .map_err(|_| anyhow!("Invalid utf8 key"))?,
                    bincode::deserialize(&value)?
                ));
            }
        })
    }
    */

    fn iterate_raw<Key: ToString>(
        &self,
        from_key: Key,
        to_key: Key,
    ) -> impl Iterator<Item = Result<(Box<[u8]>, Box<[u8]>)>> {
        DBRawIterator::new(from_key.to_string(), to_key.to_string(), self)
    }

    fn put<V: Serialize>(&self, key: &str, value: &V) -> Result<()> {
        let serialized = bincode::serialize(value)?;
        self.put(key, &serialized)
    }

    fn delete<K: AsRef<[u8]>>(&self, key: &K) -> Result<()> {
        self.delete(key)
    }
}

impl KVTransactionalStorage for TransactionDB {
    type Tx<'a> = rocksdb::Transaction<'a, TransactionDB>;

    fn begin_transaction(&self) -> Result<rocksdb::Transaction<'_, TransactionDB>> {
        let mut write_options = WriteOptions::default();
        write_options.set_sync(true);
        Ok(self.transaction_opt(&write_options, &TransactionOptions::default()))
    }
}

impl KVTransaction for rocksdb::Transaction<'_, TransactionDB> {
    fn commit(self) -> Result<()> {
        rocksdb::Transaction::commit(self)?;
        Ok(())
    }

    fn rollback(self) -> Result<()> {
        rocksdb::Transaction::rollback(&self)?;
        Ok(())
    }
}

pub trait Queue {
    fn push<V: Serialize>(&self, value: V) -> Result<()>;
    fn peek<V: for<'de> DeserializeOwned>(&self) -> Result<V>;
    fn dequeue<V: for<'de> DeserializeOwned>(&self) -> Result<V>;
}

/*
// KVQueue is a simple queue implementation on top of a key-value store
pub struct KVQueue<T: KVStorage> {
    storage: T,
    queue_name: String,
}

impl<T: KVStorage> KVQueue<T> {
    pub fn new(storage: T, queue_name: &str) -> Self {
        KVQueue {
            storage,
            queue_name: queue_name.to_string(),
        }
    }
}

impl<T: KVStorage> Queue for KVQueue<T> {
    fn push<V: Serialize>(&self, value: V) -> Result<()> {
        let rear: u64 = self.storage.get(&self.queue_name, "rear")?;
        self.storage.put(&self.queue_name, &rear, &value)?;
        self.storage.put(&self.queue_name, "rear", &(rear + 1))?;
        Ok(())
    }

    fn peek<V: for<'de> DeserializeOwned>(&self) -> Result<V> {
        let index: u64 = self.storage.get(&self.queue_name, "index")?;
        if index == 0 {
            return Err(anyhow!("Queue is empty"));
        }
        let value: V = self.storage.get(&self.queue_name, &(index - 1))?;
        Ok(value)
    }

    fn dequeue<V: for<'de> DeserializeOwned>(&self) -> Result<V> {
        let index: u64 = self.storage.get(&self.queue_name, "index")?;
        if index == 0 {
            return Err(anyhow!("Queue is empty"));
        }
        let value: V = self.storage.get(&self.queue_name, &(index - 1))?;
        self.storage.put(&self.queue_name, "index", &(index - 1))?;
        Ok(value)
    }
}
*/

#[cfg(test)]
mod tests {
    use rocksdb::TransactionDB;

    use super::{KVStorage, TemporaryStorage};

    #[test]
    fn iterating_over_kvstorage_values() {
        let kv = TransactionDB::temporary().unwrap();

        // case 1: empty
        assert!(kv.iterate::<_, ()>("from", "to").next().is_none());

        for v in 0..5usize {
            KVStorage::put(&kv, &format!("from_{v}"), &v).unwrap();
        }
        // case 2: iterate forward
        let mut retrieved = 0;
        for (idx, item) in kv
            .iterate_values::<_, usize>("from_0", "from_2")
            .enumerate()
        {
            assert_eq!(idx, item.unwrap());
            retrieved += 1;
        }
        assert_eq!(3, retrieved);

        // case 3: iterate backward
        let mut retrieved = 0;
        for (idx, item) in kv
            .iterate_values::<_, usize>("from_4", "from_3")
            .enumerate()
        {
            assert_eq!((4 - idx), item.unwrap());
            retrieved += 1;
        }
        assert_eq!(2, retrieved);

        // case 4: iterate 1 element
        let mut iter = kv.iterate_values::<_, usize>("from_3", "from_3");
        assert_eq!(3, iter.next().unwrap().unwrap());
        assert!(iter.next().is_none());
    }

    #[test]
    fn iterating_over_kvstorage_items() {
        let kv = TransactionDB::temporary().unwrap();

        // case 1: empty
        assert!(kv.iterate::<_, ()>("from", "to").next().is_none());

        for v in 0..5usize {
            KVStorage::put(&kv, &format!("from_{v}"), &v).unwrap();
        }
        // case 2: iterate forward
        let mut retrieved = 0;
        for (idx, item) in kv.iterate::<_, usize>("from_0", "from_2").enumerate() {
            assert_eq!((format!("from_{idx}"), idx), item.unwrap());
            retrieved += 1;
        }
        assert_eq!(3, retrieved);

        // case 3: iterate backward
        let mut retrieved = 0;
        for (idx, item) in kv.iterate::<_, usize>("from_4", "from_3").enumerate() {
            let expected = 4 - idx;
            assert_eq!((format!("from_{expected}"), expected), item.unwrap());
            retrieved += 1;
        }
        assert_eq!(2, retrieved);

        // case 4: iterate 1 element
        let mut iter = kv.iterate::<_, usize>("from_3", "from_3");
        assert_eq!(("from_3".to_string(), 3), iter.next().unwrap().unwrap());
        assert!(iter.next().is_none());
    }

    #[test]
    fn listing_items() {
        let kv = TransactionDB::temporary().unwrap();

        // case 1: empty
        assert!(kv.list::<_, ()>("from", "to", None).unwrap().is_empty());

        for v in 0..5usize {
            KVStorage::put(&kv, &format!("from_{v}"), &v).unwrap();
        }

        // case 2: list forward
        assert_eq!(
            vec![
                ("from_0".into(), 0),
                ("from_1".into(), 1),
                ("from_2".into(), 2)
            ],
            kv.list("from_0", "from_2", None).unwrap(),
        );

        // With limit
        assert_eq!(
            vec![("from_0".into(), 0), ("from_1".into(), 1),],
            kv.list("from_0", "from_2", Some(2)).unwrap(),
        );

        // case 3: list backward
        assert_eq!(
            vec![
                ("from_2".into(), 2),
                ("from_1".into(), 1),
                ("from_0".into(), 0)
            ],
            kv.list("from_2", "from_0", None).unwrap(),
        );
        // With limit
        assert_eq!(
            vec![("from_2".into(), 2), ("from_1".into(), 1),],
            kv.list("from_2", "from_0", Some(2)).unwrap(),
        );

        // case 4: skips non-matching elements
        KVStorage::put(&kv, "fr", &()).unwrap();
        KVStorage::put(&kv, "foo", &()).unwrap();
        KVStorage::put(&kv, "afrom_0", &()).unwrap();
        assert_eq!(
            vec![("from_0".into(), 0), ("from_1".into(), 1),],
            kv.list("from_0", "from_2", Some(2)).unwrap(),
        );
    }

    #[test]
    fn deleting_range() {
        let kv = TransactionDB::temporary().unwrap();

        // case 1: empty
        kv.delete_range("from", "to").unwrap();

        for v in 0..5usize {
            KVStorage::put(&kv, &format!("from_{v}"), &v).unwrap();
        }

        // case 2: delete mid-range
        kv.delete_range("from_2", "from_3").unwrap();

        assert_eq!(
            vec![
                ("from_0".into(), 0),
                ("from_1".into(), 1),
                ("from_4".into(), 4)
            ],
            kv.list("from_0", "from_5", None).unwrap(),
        );
    }
}
