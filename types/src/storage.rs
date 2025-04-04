use alloy_primitives::{keccak256, Address, Uint, B256};
use alloy_sol_types::SolValue;
use anyhow::{anyhow, Result};

use bincode;
use rand::{distributions::Alphanumeric, Rng};
use rocksdb::{DBAccess, IteratorMode, TransactionDB, TransactionOptions, WriteOptions};
use serde::{de::DeserializeOwned, Deserialize, Serialize};

use std::path::PathBuf;
// use futures::{Stream, StreamExt};

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

    fn list<D: for<'de> DeserializeOwned>(
        &self,
        from_key: &str,
        to_key: &str,
        limit: Option<usize>,
    ) -> Result<Vec<(String, D)>>;

    fn list_values<D: for<'de> DeserializeOwned>(
        &self,
        from_key: &str,
        to_key: &str,
        limit: Option<usize>,
    ) -> Result<Vec<D>> {
        Ok(self
            .list::<D>(from_key, to_key, limit)
            .map_err(|e| anyhow!("Error listing values: {}", e.to_string()))?
            .into_iter()
            .map(|(_k, v)| v)
            .collect())
    }

    fn delete(&self, key: &str) -> Result<()>;

    fn delete_range(&self, from_key: &str, to_key: &str) -> Result<()> {
        // TODO: improve, we shouldn't need to deserialize to json Value
        let iter = self.list::<serde_json::Value>(from_key, to_key, None)?;
        for item in iter {
            self.delete(&item.0)
                .map_err(|_| anyhow!("Invalid utf8 key"))?;
        }
        Ok(())
    }

    fn paginate_values<D: for<'de> DeserializeOwned>(
        &self,
        start_key: &str,
        end_key: &str,
        limit: usize,
    ) -> Result<PaginatedResult<D>> {
        let entries = self.list::<D>(start_key, end_key, Some(limit + 1))?;

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

    fn list<D: for<'de> DeserializeOwned>(
        &self,
        from_key: &str,
        to_key: &str,
        limit: Option<usize>,
    ) -> Result<Vec<(String, D)>> {
        let mut result = Vec::new();
        let direction = if from_key <= to_key {
            rocksdb::Direction::Forward
        } else {
            rocksdb::Direction::Reverse
        };
        let iter = self.iterator(IteratorMode::From(from_key.as_bytes(), direction));
        for item in iter {
            if result.len() == limit.unwrap_or(usize::MAX) {
                break;
            }
            let (k, value) = item?;
            if matches!(direction, rocksdb::Direction::Forward) && k.as_ref() > to_key.as_bytes()
                || matches!(direction, rocksdb::Direction::Reverse)
                    && k.as_ref() < to_key.as_bytes()
            {
                break;
            }

            // NOTE: temporary fix for bincode deserialization failure
            // TODO: remove this
            match bincode::deserialize(&value) {
                Ok(v) => result.push((
                    String::from_utf8(k.to_vec()).map_err(|_| anyhow!("Invalid utf8 key"))?,
                    v,
                )),
                Err(e) => {
                    println!("bincode deserialization failed: {}", e);
                    self.delete(&k)?;
                }
            };
        }
        Ok(result)
    }

    fn put<V: Serialize>(&self, key: &str, value: &V) -> Result<()> {
        let serialized = bincode::serialize(value)?;
        self.put(key, &serialized)?;
        Ok(())
    }

    fn delete(&self, key: &str) -> Result<()> {
        self.delete(key)?;
        Ok(())
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
