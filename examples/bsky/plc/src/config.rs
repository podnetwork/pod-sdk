use std::fmt::Display;

use anyhow::Context;
use pod_sdk::{Address, SigningKey};
use serde::Deserialize;

#[derive(Deserialize, Clone)]
pub struct Config {
    #[serde(deserialize_with = "parse_signing_key")]
    pub private_key: SigningKey,
    #[serde(default = "default_rpc_url")]
    pub rpc_url: String,
    #[serde(default = "default_contract_address")]
    pub contract_address: Address,
}

impl Display for Config {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "Config {{ private_key: <hidden>, rpc_url: {}, contract_address: {} }}",
            self.rpc_url, self.contract_address
        )
    }
}

fn default_contract_address() -> Address {
    "0x12296f2D128530a834460DF6c36a2895B793F26d"
        .parse()
        .unwrap()
}

fn default_rpc_url() -> String {
    "ws://localhost:8545".to_string()
}

fn parse_signing_key<'de, D>(deserializer: D) -> Result<SigningKey, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let hex_str = String::deserialize(deserializer)?;
    let secret_key_bytes = hex::decode(hex_str).map_err(serde::de::Error::custom)?;
    SigningKey::from_slice(&secret_key_bytes).map_err(serde::de::Error::custom)
}

impl Config {
    /// Read configuration from ENV.
    ///
    /// The env variable names are expected to be named POD_<BIG CASE KEY>, eg:
    /// - POD_PLC_RPC_URL
    ///
    /// Fields marked with `#[serde(default)]` are optional.
    pub fn from_env() -> anyhow::Result<Self> {
        let config = config::Config::builder()
            .add_source(
                config::Environment::with_prefix("POD_PLC")
                    .separator("__")
                    .prefix_separator("_")
                    .try_parsing(true)
                    .ignore_empty(true),
            )
            .build()?;

        let config: Config = config
            .try_deserialize()
            .context("parsing configuration from env")?;

        Ok(config)
    }
}
