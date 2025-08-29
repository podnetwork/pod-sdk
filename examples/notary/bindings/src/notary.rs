///Module containing a contract's types and functions.
/**

```solidity
library Time {
    type Timestamp is uint64;
}
```*/
#[allow(
    non_camel_case_types,
    non_snake_case,
    clippy::pub_underscore_fields,
    clippy::style,
    clippy::empty_structs_with_brackets
)]
pub mod Time {
    use super::*;
    use alloy::sol_types as alloy_sol_types;
    #[derive(serde::Serialize, serde::Deserialize)]
    #[derive(Default, Debug, PartialEq, Eq, Hash)]
    #[allow(non_camel_case_types, non_snake_case, clippy::pub_underscore_fields)]
    #[derive(Clone)]
    pub struct Timestamp(u64);
    const _: () = {
        use alloy::sol_types as alloy_sol_types;
        #[automatically_derived]
        impl alloy_sol_types::private::SolTypeValue<Timestamp> for u64 {
            #[inline]
            fn stv_to_tokens(
                &self,
            ) -> <alloy::sol_types::sol_data::Uint<
                64,
            > as alloy_sol_types::SolType>::Token<'_> {
                alloy_sol_types::private::SolTypeValue::<
                    alloy::sol_types::sol_data::Uint<64>,
                >::stv_to_tokens(self)
            }
            #[inline]
            fn stv_eip712_data_word(&self) -> alloy_sol_types::Word {
                <alloy::sol_types::sol_data::Uint<
                    64,
                > as alloy_sol_types::SolType>::tokenize(self)
                    .0
            }
            #[inline]
            fn stv_abi_encode_packed_to(
                &self,
                out: &mut alloy_sol_types::private::Vec<u8>,
            ) {
                <alloy::sol_types::sol_data::Uint<
                    64,
                > as alloy_sol_types::SolType>::abi_encode_packed_to(self, out)
            }
            #[inline]
            fn stv_abi_packed_encoded_size(&self) -> usize {
                <alloy::sol_types::sol_data::Uint<
                    64,
                > as alloy_sol_types::SolType>::abi_encoded_size(self)
            }
        }
        #[automatically_derived]
        impl Timestamp {
            /// The Solidity type name.
            pub const NAME: &'static str = stringify!(@ name);
            /// Convert from the underlying value type.
            #[inline]
            pub const fn from_underlying(value: u64) -> Self {
                Self(value)
            }
            /// Return the underlying value.
            #[inline]
            pub const fn into_underlying(self) -> u64 {
                self.0
            }
            /// Return the single encoding of this value, delegating to the
            /// underlying type.
            #[inline]
            pub fn abi_encode(&self) -> alloy_sol_types::private::Vec<u8> {
                <Self as alloy_sol_types::SolType>::abi_encode(&self.0)
            }
            /// Return the packed encoding of this value, delegating to the
            /// underlying type.
            #[inline]
            pub fn abi_encode_packed(&self) -> alloy_sol_types::private::Vec<u8> {
                <Self as alloy_sol_types::SolType>::abi_encode_packed(&self.0)
            }
        }
        #[automatically_derived]
        impl From<u64> for Timestamp {
            fn from(value: u64) -> Self {
                Self::from_underlying(value)
            }
        }
        #[automatically_derived]
        impl From<Timestamp> for u64 {
            fn from(value: Timestamp) -> Self {
                value.into_underlying()
            }
        }
        #[automatically_derived]
        impl alloy_sol_types::SolType for Timestamp {
            type RustType = u64;
            type Token<'a> = <alloy::sol_types::sol_data::Uint<
                64,
            > as alloy_sol_types::SolType>::Token<'a>;
            const SOL_NAME: &'static str = Self::NAME;
            const ENCODED_SIZE: Option<usize> = <alloy::sol_types::sol_data::Uint<
                64,
            > as alloy_sol_types::SolType>::ENCODED_SIZE;
            const PACKED_ENCODED_SIZE: Option<usize> = <alloy::sol_types::sol_data::Uint<
                64,
            > as alloy_sol_types::SolType>::PACKED_ENCODED_SIZE;
            #[inline]
            fn valid_token(token: &Self::Token<'_>) -> bool {
                Self::type_check(token).is_ok()
            }
            #[inline]
            fn type_check(token: &Self::Token<'_>) -> alloy_sol_types::Result<()> {
                <alloy::sol_types::sol_data::Uint<
                    64,
                > as alloy_sol_types::SolType>::type_check(token)
            }
            #[inline]
            fn detokenize(token: Self::Token<'_>) -> Self::RustType {
                <alloy::sol_types::sol_data::Uint<
                    64,
                > as alloy_sol_types::SolType>::detokenize(token)
            }
        }
        #[automatically_derived]
        impl alloy_sol_types::EventTopic for Timestamp {
            #[inline]
            fn topic_preimage_length(rust: &Self::RustType) -> usize {
                <alloy::sol_types::sol_data::Uint<
                    64,
                > as alloy_sol_types::EventTopic>::topic_preimage_length(rust)
            }
            #[inline]
            fn encode_topic_preimage(
                rust: &Self::RustType,
                out: &mut alloy_sol_types::private::Vec<u8>,
            ) {
                <alloy::sol_types::sol_data::Uint<
                    64,
                > as alloy_sol_types::EventTopic>::encode_topic_preimage(rust, out)
            }
            #[inline]
            fn encode_topic(
                rust: &Self::RustType,
            ) -> alloy_sol_types::abi::token::WordToken {
                <alloy::sol_types::sol_data::Uint<
                    64,
                > as alloy_sol_types::EventTopic>::encode_topic(rust)
            }
        }
    };
    use alloy::contract as alloy_contract;
    /**Creates a new wrapper around an on-chain [`Time`](self) contract instance.

See the [wrapper's documentation](`TimeInstance`) for more details.*/
    #[inline]
    pub const fn new<
        P: alloy_contract::private::Provider<N>,
        N: alloy_contract::private::Network,
    >(address: alloy_sol_types::private::Address, provider: P) -> TimeInstance<P, N> {
        TimeInstance::<P, N>::new(address, provider)
    }
    /**A [`Time`](self) instance.

Contains type-safe methods for interacting with an on-chain instance of the
[`Time`](self) contract located at a given `address`, using a given
provider `P`.

If the contract bytecode is available (see the [`sol!`](alloy_sol_types::sol!)
documentation on how to provide it), the `deploy` and `deploy_builder` methods can
be used to deploy a new instance of the contract.

See the [module-level documentation](self) for all the available methods.*/
    #[derive(Clone)]
    pub struct TimeInstance<P, N = alloy_contract::private::Ethereum> {
        address: alloy_sol_types::private::Address,
        provider: P,
        _network: ::core::marker::PhantomData<N>,
    }
    #[automatically_derived]
    impl<P, N> ::core::fmt::Debug for TimeInstance<P, N> {
        #[inline]
        fn fmt(&self, f: &mut ::core::fmt::Formatter<'_>) -> ::core::fmt::Result {
            f.debug_tuple("TimeInstance").field(&self.address).finish()
        }
    }
    /// Instantiation and getters/setters.
    #[automatically_derived]
    impl<
        P: alloy_contract::private::Provider<N>,
        N: alloy_contract::private::Network,
    > TimeInstance<P, N> {
        /**Creates a new wrapper around an on-chain [`Time`](self) contract instance.

See the [wrapper's documentation](`TimeInstance`) for more details.*/
        #[inline]
        pub const fn new(
            address: alloy_sol_types::private::Address,
            provider: P,
        ) -> Self {
            Self {
                address,
                provider,
                _network: ::core::marker::PhantomData,
            }
        }
        /// Returns a reference to the address.
        #[inline]
        pub const fn address(&self) -> &alloy_sol_types::private::Address {
            &self.address
        }
        /// Sets the address.
        #[inline]
        pub fn set_address(&mut self, address: alloy_sol_types::private::Address) {
            self.address = address;
        }
        /// Sets the address and returns `self`.
        pub fn at(mut self, address: alloy_sol_types::private::Address) -> Self {
            self.set_address(address);
            self
        }
        /// Returns a reference to the provider.
        #[inline]
        pub const fn provider(&self) -> &P {
            &self.provider
        }
    }
    impl<P: ::core::clone::Clone, N> TimeInstance<&P, N> {
        /// Clones the provider and returns a new instance with the cloned provider.
        #[inline]
        pub fn with_cloned_provider(self) -> TimeInstance<P, N> {
            TimeInstance {
                address: self.address,
                provider: ::core::clone::Clone::clone(&self.provider),
                _network: ::core::marker::PhantomData,
            }
        }
    }
    /// Function calls.
    #[automatically_derived]
    impl<
        P: alloy_contract::private::Provider<N>,
        N: alloy_contract::private::Network,
    > TimeInstance<P, N> {
        /// Creates a new call builder using this contract instance's provider and address.
        ///
        /// Note that the call can be any function call, not just those defined in this
        /// contract. Prefer using the other methods for building type-safe contract calls.
        pub fn call_builder<C: alloy_sol_types::SolCall>(
            &self,
            call: &C,
        ) -> alloy_contract::SolCallBuilder<&P, C, N> {
            alloy_contract::SolCallBuilder::new_sol(&self.provider, &self.address, call)
        }
    }
    /// Event filters.
    #[automatically_derived]
    impl<
        P: alloy_contract::private::Provider<N>,
        N: alloy_contract::private::Network,
    > TimeInstance<P, N> {
        /// Creates a new event filter using this contract instance's provider and address.
        ///
        /// Note that the type can be any event, not just those defined in this contract.
        /// Prefer using the other methods for building type-safe event filters.
        pub fn event_filter<E: alloy_sol_types::SolEvent>(
            &self,
        ) -> alloy_contract::Event<&P, E, N> {
            alloy_contract::Event::new_sol(&self.provider, &self.address)
        }
    }
}
/**

Generated by the following Solidity interface...
```solidity
library Time {
    type Timestamp is uint64;
}

interface Notary {
    event DocumentTimestamped(bytes32 indexed documentHash, address indexed submitter, Time.Timestamp timestamp);

    function timestamp(bytes32 documentHash, Time.Timestamp ts) external;
    function timestamps(bytes32) external view returns (Time.Timestamp);
}
```

...which was generated by the following JSON ABI:
```json
[
  {
    "type": "function",
    "name": "timestamp",
    "inputs": [
      {
        "name": "documentHash",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "ts",
        "type": "uint64",
        "internalType": "Time.Timestamp"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "timestamps",
    "inputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint64",
        "internalType": "Time.Timestamp"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "DocumentTimestamped",
    "inputs": [
      {
        "name": "documentHash",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "submitter",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "timestamp",
        "type": "uint64",
        "indexed": false,
        "internalType": "Time.Timestamp"
      }
    ],
    "anonymous": false
  }
]
```*/
#[allow(
    non_camel_case_types,
    non_snake_case,
    clippy::pub_underscore_fields,
    clippy::style,
    clippy::empty_structs_with_brackets
)]
pub mod Notary {
    use super::*;
    use alloy::sol_types as alloy_sol_types;
    /// The creation / init bytecode of the contract.
    ///
    /// ```text
    ///0x6080604052348015600e575f5ffd5b506109e98061001c5f395ff3fe608060405234801561000f575f5ffd5b5060043610610034575f3560e01c8063b587295814610038578063e8d6008914610068575b5f5ffd5b610052600480360381019061004d9190610610565b610084565b60405161005f9190610687565b60405180910390f35b610082600480360381019061007d91906106ca565b6100a7565b005b5f602052805f5260405f205f915054906101000a900467ffffffffffffffff1681565b6100e6816040518060400160405280601f81526020017f74696d657374616d70206d75737420626520696e2074686520667574757265008152506102b7565b61011c5f5f8481526020019081526020015f205f9054906101000a900467ffffffffffffffff1667ffffffffffffffff166102e8565b156101ab57805f5f8481526020019081526020015f205f6101000a81548167ffffffffffffffff021916908367ffffffffffffffff1602179055503373ffffffffffffffffffffffffffffffffffffffff16827fc8502b80f9a4eddb29943d46e36f689055a259a8be737b8e3d2c902da42a6e838360405161019e9190610687565b60405180910390a36102b3565b5f6101d9825f5f8681526020019081526020015f205f9054906101000a900467ffffffffffffffff166102fd565b90505f61021c5f5f8681526020019081526020015f205f9054906101000a900467ffffffffffffffff168367ffffffffffffffff1661032f90919063ffffffff16565b67ffffffffffffffff16146102b157805f5f8581526020019081526020015f205f6101000a81548167ffffffffffffffff021916908367ffffffffffffffff1602179055503373ffffffffffffffffffffffffffffffffffffffff16837fc8502b80f9a4eddb29943d46e36f689055a259a8be737b8e3d2c902da42a6e83836040516102a89190610687565b60405180910390a35b505b5050565b6102e46102de836102c661037a565b67ffffffffffffffff166104a890919063ffffffff16565b826104c8565b5050565b5f5f8267ffffffffffffffff16149050919050565b5f61031b828467ffffffffffffffff166104a890919063ffffffff16565b6103255781610327565b825b905092915050565b5f61034d828467ffffffffffffffff166105b990919063ffffffff16565b1561036557818361035e9190610735565b9050610374565b82826103719190610735565b90505b92915050565b5f5f5f7fba286e4d89dabf4b2878e896423bb123d9d5143e662606fd343b6766d7bcf7215f1c73ffffffffffffffffffffffffffffffffffffffff166040516103c29061079d565b5f60405180830381855afa9150503d805f81146103fa576040519150601f19603f3d011682016040523d82523d5f602084013e6103ff565b606091505b509150915081610444576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161043b9061080b565b60405180910390fd5b6020815114610488576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161047f90610873565b60405180910390fd5b5f8180602001905181019061049d91906108bb565b905080935050505090565b5f8167ffffffffffffffff168367ffffffffffffffff1610905092915050565b5f7f3dcdf63b41c103567d7225976ad9145e866c7a7dccc6c277ea86abbd268fbac95f1c73ffffffffffffffffffffffffffffffffffffffff16836040516020016105139190610900565b60405160208183030381529060405260405161052f9190610961565b5f60405180830381855afa9150503d805f8114610567576040519150601f19603f3d011682016040523d82523d5f602084013e61056c565b606091505b505090508082906105b3576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016105aa91906109c9565b60405180910390fd5b50505050565b5f8167ffffffffffffffff168367ffffffffffffffff1611905092915050565b5f5ffd5b5f819050919050565b6105ef816105dd565b81146105f9575f5ffd5b50565b5f8135905061060a816105e6565b92915050565b5f60208284031215610625576106246105d9565b5b5f610632848285016105fc565b91505092915050565b5f67ffffffffffffffff82169050919050565b5f819050919050565b5f61067161066c6106678461063b565b61064e565b61063b565b9050919050565b61068181610657565b82525050565b5f60208201905061069a5f830184610678565b92915050565b6106a98161063b565b81146106b3575f5ffd5b50565b5f813590506106c4816106a0565b92915050565b5f5f604083850312156106e0576106df6105d9565b5b5f6106ed858286016105fc565b92505060206106fe858286016106b6565b9150509250929050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b5f61073f8261063b565b915061074a8361063b565b9250828203905067ffffffffffffffff81111561076a57610769610708565b5b92915050565b5f81905092915050565b50565b5f6107885f83610770565b91506107938261077a565b5f82019050919050565b5f6107a78261077d565b9150819050919050565b5f82825260208201905092915050565b7f507265636f6d70696c652063616c6c206661696c6564000000000000000000005f82015250565b5f6107f56016836107b1565b9150610800826107c1565b602082019050919050565b5f6020820190508181035f830152610822816107e9565b9050919050565b7f496e76616c6964206f7574707574206c656e67746800000000000000000000005f82015250565b5f61085d6015836107b1565b915061086882610829565b602082019050919050565b5f6020820190508181035f83015261088a81610851565b9050919050565b61089a8161063b565b81146108a4575f5ffd5b50565b5f815190506108b581610891565b92915050565b5f602082840312156108d0576108cf6105d9565b5b5f6108dd848285016108a7565b91505092915050565b5f8115159050919050565b6108fa816108e6565b82525050565b5f6020820190506109135f8301846108f1565b92915050565b5f81519050919050565b8281835e5f83830152505050565b5f61093b82610919565b6109458185610770565b9350610955818560208601610923565b80840191505092915050565b5f61096c8284610931565b915081905092915050565b5f81519050919050565b5f601f19601f8301169050919050565b5f61099b82610977565b6109a581856107b1565b93506109b5818560208601610923565b6109be81610981565b840191505092915050565b5f6020820190508181035f8301526109e18184610991565b90509291505056
    /// ```
    #[rustfmt::skip]
    #[allow(clippy::all)]
    pub static BYTECODE: alloy_sol_types::private::Bytes = alloy_sol_types::private::Bytes::from_static(
        b"`\x80`@R4\x80\x15`\x0EW__\xFD[Pa\t\xE9\x80a\0\x1C_9_\xF3\xFE`\x80`@R4\x80\x15a\0\x0FW__\xFD[P`\x046\x10a\x004W_5`\xE0\x1C\x80c\xB5\x87)X\x14a\08W\x80c\xE8\xD6\0\x89\x14a\0hW[__\xFD[a\0R`\x04\x806\x03\x81\x01\x90a\0M\x91\x90a\x06\x10V[a\0\x84V[`@Qa\0_\x91\x90a\x06\x87V[`@Q\x80\x91\x03\x90\xF3[a\0\x82`\x04\x806\x03\x81\x01\x90a\0}\x91\x90a\x06\xCAV[a\0\xA7V[\0[_` R\x80_R`@_ _\x91PT\x90a\x01\0\n\x90\x04g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x81V[a\0\xE6\x81`@Q\x80`@\x01`@R\x80`\x1F\x81R` \x01\x7Ftimestamp must be in the future\0\x81RPa\x02\xB7V[a\x01\x1C__\x84\x81R` \x01\x90\x81R` \x01_ _\x90T\x90a\x01\0\n\x90\x04g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16a\x02\xE8V[\x15a\x01\xABW\x80__\x84\x81R` \x01\x90\x81R` \x01_ _a\x01\0\n\x81T\x81g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x02\x19\x16\x90\x83g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x02\x17\x90UP3s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x82\x7F\xC8P+\x80\xF9\xA4\xED\xDB)\x94=F\xE3oh\x90U\xA2Y\xA8\xBEs{\x8E=,\x90-\xA4*n\x83\x83`@Qa\x01\x9E\x91\x90a\x06\x87V[`@Q\x80\x91\x03\x90\xA3a\x02\xB3V[_a\x01\xD9\x82__\x86\x81R` \x01\x90\x81R` \x01_ _\x90T\x90a\x01\0\n\x90\x04g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16a\x02\xFDV[\x90P_a\x02\x1C__\x86\x81R` \x01\x90\x81R` \x01_ _\x90T\x90a\x01\0\n\x90\x04g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16a\x03/\x90\x91\x90c\xFF\xFF\xFF\xFF\x16V[g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x14a\x02\xB1W\x80__\x85\x81R` \x01\x90\x81R` \x01_ _a\x01\0\n\x81T\x81g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x02\x19\x16\x90\x83g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x02\x17\x90UP3s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83\x7F\xC8P+\x80\xF9\xA4\xED\xDB)\x94=F\xE3oh\x90U\xA2Y\xA8\xBEs{\x8E=,\x90-\xA4*n\x83\x83`@Qa\x02\xA8\x91\x90a\x06\x87V[`@Q\x80\x91\x03\x90\xA3[P[PPV[a\x02\xE4a\x02\xDE\x83a\x02\xC6a\x03zV[g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16a\x04\xA8\x90\x91\x90c\xFF\xFF\xFF\xFF\x16V[\x82a\x04\xC8V[PPV[__\x82g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x14\x90P\x91\x90PV[_a\x03\x1B\x82\x84g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16a\x04\xA8\x90\x91\x90c\xFF\xFF\xFF\xFF\x16V[a\x03%W\x81a\x03'V[\x82[\x90P\x92\x91PPV[_a\x03M\x82\x84g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16a\x05\xB9\x90\x91\x90c\xFF\xFF\xFF\xFF\x16V[\x15a\x03eW\x81\x83a\x03^\x91\x90a\x075V[\x90Pa\x03tV[\x82\x82a\x03q\x91\x90a\x075V[\x90P[\x92\x91PPV[___\x7F\xBA(nM\x89\xDA\xBFK(x\xE8\x96B;\xB1#\xD9\xD5\x14>f&\x06\xFD4;gf\xD7\xBC\xF7!_\x1Cs\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16`@Qa\x03\xC2\x90a\x07\x9DV[_`@Q\x80\x83\x03\x81\x85Z\xFA\x91PP=\x80_\x81\x14a\x03\xFAW`@Q\x91P`\x1F\x19`?=\x01\x16\x82\x01`@R=\x82R=_` \x84\x01>a\x03\xFFV[``\x91P[P\x91P\x91P\x81a\x04DW`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x04;\x90a\x08\x0BV[`@Q\x80\x91\x03\x90\xFD[` \x81Q\x14a\x04\x88W`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x04\x7F\x90a\x08sV[`@Q\x80\x91\x03\x90\xFD[_\x81\x80` \x01\x90Q\x81\x01\x90a\x04\x9D\x91\x90a\x08\xBBV[\x90P\x80\x93PPPP\x90V[_\x81g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x10\x90P\x92\x91PPV[_\x7F=\xCD\xF6;A\xC1\x03V}r%\x97j\xD9\x14^\x86lz}\xCC\xC6\xC2w\xEA\x86\xAB\xBD&\x8F\xBA\xC9_\x1Cs\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83`@Q` \x01a\x05\x13\x91\x90a\t\0V[`@Q` \x81\x83\x03\x03\x81R\x90`@R`@Qa\x05/\x91\x90a\taV[_`@Q\x80\x83\x03\x81\x85Z\xFA\x91PP=\x80_\x81\x14a\x05gW`@Q\x91P`\x1F\x19`?=\x01\x16\x82\x01`@R=\x82R=_` \x84\x01>a\x05lV[``\x91P[PP\x90P\x80\x82\x90a\x05\xB3W`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x05\xAA\x91\x90a\t\xC9V[`@Q\x80\x91\x03\x90\xFD[PPPPV[_\x81g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x11\x90P\x92\x91PPV[__\xFD[_\x81\x90P\x91\x90PV[a\x05\xEF\x81a\x05\xDDV[\x81\x14a\x05\xF9W__\xFD[PV[_\x815\x90Pa\x06\n\x81a\x05\xE6V[\x92\x91PPV[_` \x82\x84\x03\x12\x15a\x06%Wa\x06$a\x05\xD9V[[_a\x062\x84\x82\x85\x01a\x05\xFCV[\x91PP\x92\x91PPV[_g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x82\x16\x90P\x91\x90PV[_\x81\x90P\x91\x90PV[_a\x06qa\x06la\x06g\x84a\x06;V[a\x06NV[a\x06;V[\x90P\x91\x90PV[a\x06\x81\x81a\x06WV[\x82RPPV[_` \x82\x01\x90Pa\x06\x9A_\x83\x01\x84a\x06xV[\x92\x91PPV[a\x06\xA9\x81a\x06;V[\x81\x14a\x06\xB3W__\xFD[PV[_\x815\x90Pa\x06\xC4\x81a\x06\xA0V[\x92\x91PPV[__`@\x83\x85\x03\x12\x15a\x06\xE0Wa\x06\xDFa\x05\xD9V[[_a\x06\xED\x85\x82\x86\x01a\x05\xFCV[\x92PP` a\x06\xFE\x85\x82\x86\x01a\x06\xB6V[\x91PP\x92P\x92\x90PV[\x7FNH{q\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0_R`\x11`\x04R`$_\xFD[_a\x07?\x82a\x06;V[\x91Pa\x07J\x83a\x06;V[\x92P\x82\x82\x03\x90Pg\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x81\x11\x15a\x07jWa\x07ia\x07\x08V[[\x92\x91PPV[_\x81\x90P\x92\x91PPV[PV[_a\x07\x88_\x83a\x07pV[\x91Pa\x07\x93\x82a\x07zV[_\x82\x01\x90P\x91\x90PV[_a\x07\xA7\x82a\x07}V[\x91P\x81\x90P\x91\x90PV[_\x82\x82R` \x82\x01\x90P\x92\x91PPV[\x7FPrecompile call failed\0\0\0\0\0\0\0\0\0\0_\x82\x01RPV[_a\x07\xF5`\x16\x83a\x07\xB1V[\x91Pa\x08\0\x82a\x07\xC1V[` \x82\x01\x90P\x91\x90PV[_` \x82\x01\x90P\x81\x81\x03_\x83\x01Ra\x08\"\x81a\x07\xE9V[\x90P\x91\x90PV[\x7FInvalid output length\0\0\0\0\0\0\0\0\0\0\0_\x82\x01RPV[_a\x08]`\x15\x83a\x07\xB1V[\x91Pa\x08h\x82a\x08)V[` \x82\x01\x90P\x91\x90PV[_` \x82\x01\x90P\x81\x81\x03_\x83\x01Ra\x08\x8A\x81a\x08QV[\x90P\x91\x90PV[a\x08\x9A\x81a\x06;V[\x81\x14a\x08\xA4W__\xFD[PV[_\x81Q\x90Pa\x08\xB5\x81a\x08\x91V[\x92\x91PPV[_` \x82\x84\x03\x12\x15a\x08\xD0Wa\x08\xCFa\x05\xD9V[[_a\x08\xDD\x84\x82\x85\x01a\x08\xA7V[\x91PP\x92\x91PPV[_\x81\x15\x15\x90P\x91\x90PV[a\x08\xFA\x81a\x08\xE6V[\x82RPPV[_` \x82\x01\x90Pa\t\x13_\x83\x01\x84a\x08\xF1V[\x92\x91PPV[_\x81Q\x90P\x91\x90PV[\x82\x81\x83^_\x83\x83\x01RPPPV[_a\t;\x82a\t\x19V[a\tE\x81\x85a\x07pV[\x93Pa\tU\x81\x85` \x86\x01a\t#V[\x80\x84\x01\x91PP\x92\x91PPV[_a\tl\x82\x84a\t1V[\x91P\x81\x90P\x92\x91PPV[_\x81Q\x90P\x91\x90PV[_`\x1F\x19`\x1F\x83\x01\x16\x90P\x91\x90PV[_a\t\x9B\x82a\twV[a\t\xA5\x81\x85a\x07\xB1V[\x93Pa\t\xB5\x81\x85` \x86\x01a\t#V[a\t\xBE\x81a\t\x81V[\x84\x01\x91PP\x92\x91PPV[_` \x82\x01\x90P\x81\x81\x03_\x83\x01Ra\t\xE1\x81\x84a\t\x91V[\x90P\x92\x91PPV",
    );
    /// The runtime bytecode of the contract, as deployed on the network.
    ///
    /// ```text
    ///0x608060405234801561000f575f5ffd5b5060043610610034575f3560e01c8063b587295814610038578063e8d6008914610068575b5f5ffd5b610052600480360381019061004d9190610610565b610084565b60405161005f9190610687565b60405180910390f35b610082600480360381019061007d91906106ca565b6100a7565b005b5f602052805f5260405f205f915054906101000a900467ffffffffffffffff1681565b6100e6816040518060400160405280601f81526020017f74696d657374616d70206d75737420626520696e2074686520667574757265008152506102b7565b61011c5f5f8481526020019081526020015f205f9054906101000a900467ffffffffffffffff1667ffffffffffffffff166102e8565b156101ab57805f5f8481526020019081526020015f205f6101000a81548167ffffffffffffffff021916908367ffffffffffffffff1602179055503373ffffffffffffffffffffffffffffffffffffffff16827fc8502b80f9a4eddb29943d46e36f689055a259a8be737b8e3d2c902da42a6e838360405161019e9190610687565b60405180910390a36102b3565b5f6101d9825f5f8681526020019081526020015f205f9054906101000a900467ffffffffffffffff166102fd565b90505f61021c5f5f8681526020019081526020015f205f9054906101000a900467ffffffffffffffff168367ffffffffffffffff1661032f90919063ffffffff16565b67ffffffffffffffff16146102b157805f5f8581526020019081526020015f205f6101000a81548167ffffffffffffffff021916908367ffffffffffffffff1602179055503373ffffffffffffffffffffffffffffffffffffffff16837fc8502b80f9a4eddb29943d46e36f689055a259a8be737b8e3d2c902da42a6e83836040516102a89190610687565b60405180910390a35b505b5050565b6102e46102de836102c661037a565b67ffffffffffffffff166104a890919063ffffffff16565b826104c8565b5050565b5f5f8267ffffffffffffffff16149050919050565b5f61031b828467ffffffffffffffff166104a890919063ffffffff16565b6103255781610327565b825b905092915050565b5f61034d828467ffffffffffffffff166105b990919063ffffffff16565b1561036557818361035e9190610735565b9050610374565b82826103719190610735565b90505b92915050565b5f5f5f7fba286e4d89dabf4b2878e896423bb123d9d5143e662606fd343b6766d7bcf7215f1c73ffffffffffffffffffffffffffffffffffffffff166040516103c29061079d565b5f60405180830381855afa9150503d805f81146103fa576040519150601f19603f3d011682016040523d82523d5f602084013e6103ff565b606091505b509150915081610444576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161043b9061080b565b60405180910390fd5b6020815114610488576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161047f90610873565b60405180910390fd5b5f8180602001905181019061049d91906108bb565b905080935050505090565b5f8167ffffffffffffffff168367ffffffffffffffff1610905092915050565b5f7f3dcdf63b41c103567d7225976ad9145e866c7a7dccc6c277ea86abbd268fbac95f1c73ffffffffffffffffffffffffffffffffffffffff16836040516020016105139190610900565b60405160208183030381529060405260405161052f9190610961565b5f60405180830381855afa9150503d805f8114610567576040519150601f19603f3d011682016040523d82523d5f602084013e61056c565b606091505b505090508082906105b3576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016105aa91906109c9565b60405180910390fd5b50505050565b5f8167ffffffffffffffff168367ffffffffffffffff1611905092915050565b5f5ffd5b5f819050919050565b6105ef816105dd565b81146105f9575f5ffd5b50565b5f8135905061060a816105e6565b92915050565b5f60208284031215610625576106246105d9565b5b5f610632848285016105fc565b91505092915050565b5f67ffffffffffffffff82169050919050565b5f819050919050565b5f61067161066c6106678461063b565b61064e565b61063b565b9050919050565b61068181610657565b82525050565b5f60208201905061069a5f830184610678565b92915050565b6106a98161063b565b81146106b3575f5ffd5b50565b5f813590506106c4816106a0565b92915050565b5f5f604083850312156106e0576106df6105d9565b5b5f6106ed858286016105fc565b92505060206106fe858286016106b6565b9150509250929050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b5f61073f8261063b565b915061074a8361063b565b9250828203905067ffffffffffffffff81111561076a57610769610708565b5b92915050565b5f81905092915050565b50565b5f6107885f83610770565b91506107938261077a565b5f82019050919050565b5f6107a78261077d565b9150819050919050565b5f82825260208201905092915050565b7f507265636f6d70696c652063616c6c206661696c6564000000000000000000005f82015250565b5f6107f56016836107b1565b9150610800826107c1565b602082019050919050565b5f6020820190508181035f830152610822816107e9565b9050919050565b7f496e76616c6964206f7574707574206c656e67746800000000000000000000005f82015250565b5f61085d6015836107b1565b915061086882610829565b602082019050919050565b5f6020820190508181035f83015261088a81610851565b9050919050565b61089a8161063b565b81146108a4575f5ffd5b50565b5f815190506108b581610891565b92915050565b5f602082840312156108d0576108cf6105d9565b5b5f6108dd848285016108a7565b91505092915050565b5f8115159050919050565b6108fa816108e6565b82525050565b5f6020820190506109135f8301846108f1565b92915050565b5f81519050919050565b8281835e5f83830152505050565b5f61093b82610919565b6109458185610770565b9350610955818560208601610923565b80840191505092915050565b5f61096c8284610931565b915081905092915050565b5f81519050919050565b5f601f19601f8301169050919050565b5f61099b82610977565b6109a581856107b1565b93506109b5818560208601610923565b6109be81610981565b840191505092915050565b5f6020820190508181035f8301526109e18184610991565b90509291505056
    /// ```
    #[rustfmt::skip]
    #[allow(clippy::all)]
    pub static DEPLOYED_BYTECODE: alloy_sol_types::private::Bytes = alloy_sol_types::private::Bytes::from_static(
        b"`\x80`@R4\x80\x15a\0\x0FW__\xFD[P`\x046\x10a\x004W_5`\xE0\x1C\x80c\xB5\x87)X\x14a\08W\x80c\xE8\xD6\0\x89\x14a\0hW[__\xFD[a\0R`\x04\x806\x03\x81\x01\x90a\0M\x91\x90a\x06\x10V[a\0\x84V[`@Qa\0_\x91\x90a\x06\x87V[`@Q\x80\x91\x03\x90\xF3[a\0\x82`\x04\x806\x03\x81\x01\x90a\0}\x91\x90a\x06\xCAV[a\0\xA7V[\0[_` R\x80_R`@_ _\x91PT\x90a\x01\0\n\x90\x04g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x81V[a\0\xE6\x81`@Q\x80`@\x01`@R\x80`\x1F\x81R` \x01\x7Ftimestamp must be in the future\0\x81RPa\x02\xB7V[a\x01\x1C__\x84\x81R` \x01\x90\x81R` \x01_ _\x90T\x90a\x01\0\n\x90\x04g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16a\x02\xE8V[\x15a\x01\xABW\x80__\x84\x81R` \x01\x90\x81R` \x01_ _a\x01\0\n\x81T\x81g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x02\x19\x16\x90\x83g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x02\x17\x90UP3s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x82\x7F\xC8P+\x80\xF9\xA4\xED\xDB)\x94=F\xE3oh\x90U\xA2Y\xA8\xBEs{\x8E=,\x90-\xA4*n\x83\x83`@Qa\x01\x9E\x91\x90a\x06\x87V[`@Q\x80\x91\x03\x90\xA3a\x02\xB3V[_a\x01\xD9\x82__\x86\x81R` \x01\x90\x81R` \x01_ _\x90T\x90a\x01\0\n\x90\x04g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16a\x02\xFDV[\x90P_a\x02\x1C__\x86\x81R` \x01\x90\x81R` \x01_ _\x90T\x90a\x01\0\n\x90\x04g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16a\x03/\x90\x91\x90c\xFF\xFF\xFF\xFF\x16V[g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x14a\x02\xB1W\x80__\x85\x81R` \x01\x90\x81R` \x01_ _a\x01\0\n\x81T\x81g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x02\x19\x16\x90\x83g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x02\x17\x90UP3s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83\x7F\xC8P+\x80\xF9\xA4\xED\xDB)\x94=F\xE3oh\x90U\xA2Y\xA8\xBEs{\x8E=,\x90-\xA4*n\x83\x83`@Qa\x02\xA8\x91\x90a\x06\x87V[`@Q\x80\x91\x03\x90\xA3[P[PPV[a\x02\xE4a\x02\xDE\x83a\x02\xC6a\x03zV[g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16a\x04\xA8\x90\x91\x90c\xFF\xFF\xFF\xFF\x16V[\x82a\x04\xC8V[PPV[__\x82g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x14\x90P\x91\x90PV[_a\x03\x1B\x82\x84g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16a\x04\xA8\x90\x91\x90c\xFF\xFF\xFF\xFF\x16V[a\x03%W\x81a\x03'V[\x82[\x90P\x92\x91PPV[_a\x03M\x82\x84g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16a\x05\xB9\x90\x91\x90c\xFF\xFF\xFF\xFF\x16V[\x15a\x03eW\x81\x83a\x03^\x91\x90a\x075V[\x90Pa\x03tV[\x82\x82a\x03q\x91\x90a\x075V[\x90P[\x92\x91PPV[___\x7F\xBA(nM\x89\xDA\xBFK(x\xE8\x96B;\xB1#\xD9\xD5\x14>f&\x06\xFD4;gf\xD7\xBC\xF7!_\x1Cs\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16`@Qa\x03\xC2\x90a\x07\x9DV[_`@Q\x80\x83\x03\x81\x85Z\xFA\x91PP=\x80_\x81\x14a\x03\xFAW`@Q\x91P`\x1F\x19`?=\x01\x16\x82\x01`@R=\x82R=_` \x84\x01>a\x03\xFFV[``\x91P[P\x91P\x91P\x81a\x04DW`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x04;\x90a\x08\x0BV[`@Q\x80\x91\x03\x90\xFD[` \x81Q\x14a\x04\x88W`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x04\x7F\x90a\x08sV[`@Q\x80\x91\x03\x90\xFD[_\x81\x80` \x01\x90Q\x81\x01\x90a\x04\x9D\x91\x90a\x08\xBBV[\x90P\x80\x93PPPP\x90V[_\x81g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x10\x90P\x92\x91PPV[_\x7F=\xCD\xF6;A\xC1\x03V}r%\x97j\xD9\x14^\x86lz}\xCC\xC6\xC2w\xEA\x86\xAB\xBD&\x8F\xBA\xC9_\x1Cs\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83`@Q` \x01a\x05\x13\x91\x90a\t\0V[`@Q` \x81\x83\x03\x03\x81R\x90`@R`@Qa\x05/\x91\x90a\taV[_`@Q\x80\x83\x03\x81\x85Z\xFA\x91PP=\x80_\x81\x14a\x05gW`@Q\x91P`\x1F\x19`?=\x01\x16\x82\x01`@R=\x82R=_` \x84\x01>a\x05lV[``\x91P[PP\x90P\x80\x82\x90a\x05\xB3W`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x05\xAA\x91\x90a\t\xC9V[`@Q\x80\x91\x03\x90\xFD[PPPPV[_\x81g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x11\x90P\x92\x91PPV[__\xFD[_\x81\x90P\x91\x90PV[a\x05\xEF\x81a\x05\xDDV[\x81\x14a\x05\xF9W__\xFD[PV[_\x815\x90Pa\x06\n\x81a\x05\xE6V[\x92\x91PPV[_` \x82\x84\x03\x12\x15a\x06%Wa\x06$a\x05\xD9V[[_a\x062\x84\x82\x85\x01a\x05\xFCV[\x91PP\x92\x91PPV[_g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x82\x16\x90P\x91\x90PV[_\x81\x90P\x91\x90PV[_a\x06qa\x06la\x06g\x84a\x06;V[a\x06NV[a\x06;V[\x90P\x91\x90PV[a\x06\x81\x81a\x06WV[\x82RPPV[_` \x82\x01\x90Pa\x06\x9A_\x83\x01\x84a\x06xV[\x92\x91PPV[a\x06\xA9\x81a\x06;V[\x81\x14a\x06\xB3W__\xFD[PV[_\x815\x90Pa\x06\xC4\x81a\x06\xA0V[\x92\x91PPV[__`@\x83\x85\x03\x12\x15a\x06\xE0Wa\x06\xDFa\x05\xD9V[[_a\x06\xED\x85\x82\x86\x01a\x05\xFCV[\x92PP` a\x06\xFE\x85\x82\x86\x01a\x06\xB6V[\x91PP\x92P\x92\x90PV[\x7FNH{q\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0_R`\x11`\x04R`$_\xFD[_a\x07?\x82a\x06;V[\x91Pa\x07J\x83a\x06;V[\x92P\x82\x82\x03\x90Pg\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x81\x11\x15a\x07jWa\x07ia\x07\x08V[[\x92\x91PPV[_\x81\x90P\x92\x91PPV[PV[_a\x07\x88_\x83a\x07pV[\x91Pa\x07\x93\x82a\x07zV[_\x82\x01\x90P\x91\x90PV[_a\x07\xA7\x82a\x07}V[\x91P\x81\x90P\x91\x90PV[_\x82\x82R` \x82\x01\x90P\x92\x91PPV[\x7FPrecompile call failed\0\0\0\0\0\0\0\0\0\0_\x82\x01RPV[_a\x07\xF5`\x16\x83a\x07\xB1V[\x91Pa\x08\0\x82a\x07\xC1V[` \x82\x01\x90P\x91\x90PV[_` \x82\x01\x90P\x81\x81\x03_\x83\x01Ra\x08\"\x81a\x07\xE9V[\x90P\x91\x90PV[\x7FInvalid output length\0\0\0\0\0\0\0\0\0\0\0_\x82\x01RPV[_a\x08]`\x15\x83a\x07\xB1V[\x91Pa\x08h\x82a\x08)V[` \x82\x01\x90P\x91\x90PV[_` \x82\x01\x90P\x81\x81\x03_\x83\x01Ra\x08\x8A\x81a\x08QV[\x90P\x91\x90PV[a\x08\x9A\x81a\x06;V[\x81\x14a\x08\xA4W__\xFD[PV[_\x81Q\x90Pa\x08\xB5\x81a\x08\x91V[\x92\x91PPV[_` \x82\x84\x03\x12\x15a\x08\xD0Wa\x08\xCFa\x05\xD9V[[_a\x08\xDD\x84\x82\x85\x01a\x08\xA7V[\x91PP\x92\x91PPV[_\x81\x15\x15\x90P\x91\x90PV[a\x08\xFA\x81a\x08\xE6V[\x82RPPV[_` \x82\x01\x90Pa\t\x13_\x83\x01\x84a\x08\xF1V[\x92\x91PPV[_\x81Q\x90P\x91\x90PV[\x82\x81\x83^_\x83\x83\x01RPPPV[_a\t;\x82a\t\x19V[a\tE\x81\x85a\x07pV[\x93Pa\tU\x81\x85` \x86\x01a\t#V[\x80\x84\x01\x91PP\x92\x91PPV[_a\tl\x82\x84a\t1V[\x91P\x81\x90P\x92\x91PPV[_\x81Q\x90P\x91\x90PV[_`\x1F\x19`\x1F\x83\x01\x16\x90P\x91\x90PV[_a\t\x9B\x82a\twV[a\t\xA5\x81\x85a\x07\xB1V[\x93Pa\t\xB5\x81\x85` \x86\x01a\t#V[a\t\xBE\x81a\t\x81V[\x84\x01\x91PP\x92\x91PPV[_` \x82\x01\x90P\x81\x81\x03_\x83\x01Ra\t\xE1\x81\x84a\t\x91V[\x90P\x92\x91PPV",
    );
    #[derive(serde::Serialize, serde::Deserialize)]
    #[derive(Default, Debug, PartialEq, Eq, Hash)]
    /**Event with signature `DocumentTimestamped(bytes32,address,uint64)` and selector `0xc8502b80f9a4eddb29943d46e36f689055a259a8be737b8e3d2c902da42a6e83`.
```solidity
event DocumentTimestamped(bytes32 indexed documentHash, address indexed submitter, Time.Timestamp timestamp);
```*/
    #[allow(
        non_camel_case_types,
        non_snake_case,
        clippy::pub_underscore_fields,
        clippy::style
    )]
    #[derive(Clone)]
    pub struct DocumentTimestamped {
        #[allow(missing_docs)]
        pub documentHash: alloy::sol_types::private::FixedBytes<32>,
        #[allow(missing_docs)]
        pub submitter: alloy::sol_types::private::Address,
        #[allow(missing_docs)]
        pub timestamp: <Time::Timestamp as alloy::sol_types::SolType>::RustType,
    }
    #[allow(
        non_camel_case_types,
        non_snake_case,
        clippy::pub_underscore_fields,
        clippy::style
    )]
    const _: () = {
        use alloy::sol_types as alloy_sol_types;
        #[automatically_derived]
        impl alloy_sol_types::SolEvent for DocumentTimestamped {
            type DataTuple<'a> = (Time::Timestamp,);
            type DataToken<'a> = <Self::DataTuple<
                'a,
            > as alloy_sol_types::SolType>::Token<'a>;
            type TopicList = (
                alloy_sol_types::sol_data::FixedBytes<32>,
                alloy::sol_types::sol_data::FixedBytes<32>,
                alloy::sol_types::sol_data::Address,
            );
            const SIGNATURE: &'static str = "DocumentTimestamped(bytes32,address,uint64)";
            const SIGNATURE_HASH: alloy_sol_types::private::B256 = alloy_sol_types::private::B256::new([
                200u8, 80u8, 43u8, 128u8, 249u8, 164u8, 237u8, 219u8, 41u8, 148u8, 61u8,
                70u8, 227u8, 111u8, 104u8, 144u8, 85u8, 162u8, 89u8, 168u8, 190u8, 115u8,
                123u8, 142u8, 61u8, 44u8, 144u8, 45u8, 164u8, 42u8, 110u8, 131u8,
            ]);
            const ANONYMOUS: bool = false;
            #[allow(unused_variables)]
            #[inline]
            fn new(
                topics: <Self::TopicList as alloy_sol_types::SolType>::RustType,
                data: <Self::DataTuple<'_> as alloy_sol_types::SolType>::RustType,
            ) -> Self {
                Self {
                    documentHash: topics.1,
                    submitter: topics.2,
                    timestamp: data.0,
                }
            }
            #[inline]
            fn check_signature(
                topics: &<Self::TopicList as alloy_sol_types::SolType>::RustType,
            ) -> alloy_sol_types::Result<()> {
                if topics.0 != Self::SIGNATURE_HASH {
                    return Err(
                        alloy_sol_types::Error::invalid_event_signature_hash(
                            Self::SIGNATURE,
                            topics.0,
                            Self::SIGNATURE_HASH,
                        ),
                    );
                }
                Ok(())
            }
            #[inline]
            fn tokenize_body(&self) -> Self::DataToken<'_> {
                (
                    <Time::Timestamp as alloy_sol_types::SolType>::tokenize(
                        &self.timestamp,
                    ),
                )
            }
            #[inline]
            fn topics(&self) -> <Self::TopicList as alloy_sol_types::SolType>::RustType {
                (
                    Self::SIGNATURE_HASH.into(),
                    self.documentHash.clone(),
                    self.submitter.clone(),
                )
            }
            #[inline]
            fn encode_topics_raw(
                &self,
                out: &mut [alloy_sol_types::abi::token::WordToken],
            ) -> alloy_sol_types::Result<()> {
                if out.len() < <Self::TopicList as alloy_sol_types::TopicList>::COUNT {
                    return Err(alloy_sol_types::Error::Overrun);
                }
                out[0usize] = alloy_sol_types::abi::token::WordToken(
                    Self::SIGNATURE_HASH,
                );
                out[1usize] = <alloy::sol_types::sol_data::FixedBytes<
                    32,
                > as alloy_sol_types::EventTopic>::encode_topic(&self.documentHash);
                out[2usize] = <alloy::sol_types::sol_data::Address as alloy_sol_types::EventTopic>::encode_topic(
                    &self.submitter,
                );
                Ok(())
            }
        }
        #[automatically_derived]
        impl alloy_sol_types::private::IntoLogData for DocumentTimestamped {
            fn to_log_data(&self) -> alloy_sol_types::private::LogData {
                From::from(self)
            }
            fn into_log_data(self) -> alloy_sol_types::private::LogData {
                From::from(&self)
            }
        }
        #[automatically_derived]
        impl From<&DocumentTimestamped> for alloy_sol_types::private::LogData {
            #[inline]
            fn from(this: &DocumentTimestamped) -> alloy_sol_types::private::LogData {
                alloy_sol_types::SolEvent::encode_log_data(this)
            }
        }
    };
    #[derive(serde::Serialize, serde::Deserialize)]
    #[derive(Default, Debug, PartialEq, Eq, Hash)]
    /**Function with signature `timestamp(bytes32,uint64)` and selector `0xe8d60089`.
```solidity
function timestamp(bytes32 documentHash, Time.Timestamp ts) external;
```*/
    #[allow(non_camel_case_types, non_snake_case, clippy::pub_underscore_fields)]
    #[derive(Clone)]
    pub struct timestampCall {
        #[allow(missing_docs)]
        pub documentHash: alloy::sol_types::private::FixedBytes<32>,
        #[allow(missing_docs)]
        pub ts: <Time::Timestamp as alloy::sol_types::SolType>::RustType,
    }
    ///Container type for the return parameters of the [`timestamp(bytes32,uint64)`](timestampCall) function.
    #[allow(non_camel_case_types, non_snake_case, clippy::pub_underscore_fields)]
    #[derive(Clone)]
    pub struct timestampReturn {}
    #[allow(
        non_camel_case_types,
        non_snake_case,
        clippy::pub_underscore_fields,
        clippy::style
    )]
    const _: () = {
        use alloy::sol_types as alloy_sol_types;
        {
            #[doc(hidden)]
            type UnderlyingSolTuple<'a> = (
                alloy::sol_types::sol_data::FixedBytes<32>,
                Time::Timestamp,
            );
            #[doc(hidden)]
            type UnderlyingRustTuple<'a> = (
                alloy::sol_types::private::FixedBytes<32>,
                <Time::Timestamp as alloy::sol_types::SolType>::RustType,
            );
            #[cfg(test)]
            #[allow(dead_code, unreachable_patterns)]
            fn _type_assertion(
                _t: alloy_sol_types::private::AssertTypeEq<UnderlyingRustTuple>,
            ) {
                match _t {
                    alloy_sol_types::private::AssertTypeEq::<
                        <UnderlyingSolTuple as alloy_sol_types::SolType>::RustType,
                    >(_) => {}
                }
            }
            #[automatically_derived]
            #[doc(hidden)]
            impl ::core::convert::From<timestampCall> for UnderlyingRustTuple<'_> {
                fn from(value: timestampCall) -> Self {
                    (value.documentHash, value.ts)
                }
            }
            #[automatically_derived]
            #[doc(hidden)]
            impl ::core::convert::From<UnderlyingRustTuple<'_>> for timestampCall {
                fn from(tuple: UnderlyingRustTuple<'_>) -> Self {
                    Self {
                        documentHash: tuple.0,
                        ts: tuple.1,
                    }
                }
            }
        }
        {
            #[doc(hidden)]
            type UnderlyingSolTuple<'a> = ();
            #[doc(hidden)]
            type UnderlyingRustTuple<'a> = ();
            #[cfg(test)]
            #[allow(dead_code, unreachable_patterns)]
            fn _type_assertion(
                _t: alloy_sol_types::private::AssertTypeEq<UnderlyingRustTuple>,
            ) {
                match _t {
                    alloy_sol_types::private::AssertTypeEq::<
                        <UnderlyingSolTuple as alloy_sol_types::SolType>::RustType,
                    >(_) => {}
                }
            }
            #[automatically_derived]
            #[doc(hidden)]
            impl ::core::convert::From<timestampReturn> for UnderlyingRustTuple<'_> {
                fn from(value: timestampReturn) -> Self {
                    ()
                }
            }
            #[automatically_derived]
            #[doc(hidden)]
            impl ::core::convert::From<UnderlyingRustTuple<'_>> for timestampReturn {
                fn from(tuple: UnderlyingRustTuple<'_>) -> Self {
                    Self {}
                }
            }
        }
        impl timestampReturn {
            fn _tokenize(
                &self,
            ) -> <timestampCall as alloy_sol_types::SolCall>::ReturnToken<'_> {
                ()
            }
        }
        #[automatically_derived]
        impl alloy_sol_types::SolCall for timestampCall {
            type Parameters<'a> = (
                alloy::sol_types::sol_data::FixedBytes<32>,
                Time::Timestamp,
            );
            type Token<'a> = <Self::Parameters<
                'a,
            > as alloy_sol_types::SolType>::Token<'a>;
            type Return = timestampReturn;
            type ReturnTuple<'a> = ();
            type ReturnToken<'a> = <Self::ReturnTuple<
                'a,
            > as alloy_sol_types::SolType>::Token<'a>;
            const SIGNATURE: &'static str = "timestamp(bytes32,uint64)";
            const SELECTOR: [u8; 4] = [232u8, 214u8, 0u8, 137u8];
            #[inline]
            fn new<'a>(
                tuple: <Self::Parameters<'a> as alloy_sol_types::SolType>::RustType,
            ) -> Self {
                tuple.into()
            }
            #[inline]
            fn tokenize(&self) -> Self::Token<'_> {
                (
                    <alloy::sol_types::sol_data::FixedBytes<
                        32,
                    > as alloy_sol_types::SolType>::tokenize(&self.documentHash),
                    <Time::Timestamp as alloy_sol_types::SolType>::tokenize(&self.ts),
                )
            }
            #[inline]
            fn tokenize_returns(ret: &Self::Return) -> Self::ReturnToken<'_> {
                timestampReturn::_tokenize(ret)
            }
            #[inline]
            fn abi_decode_returns(data: &[u8]) -> alloy_sol_types::Result<Self::Return> {
                <Self::ReturnTuple<
                    '_,
                > as alloy_sol_types::SolType>::abi_decode_sequence(data)
                    .map(Into::into)
            }
            #[inline]
            fn abi_decode_returns_validate(
                data: &[u8],
            ) -> alloy_sol_types::Result<Self::Return> {
                <Self::ReturnTuple<
                    '_,
                > as alloy_sol_types::SolType>::abi_decode_sequence_validate(data)
                    .map(Into::into)
            }
        }
    };
    #[derive(serde::Serialize, serde::Deserialize)]
    #[derive(Default, Debug, PartialEq, Eq, Hash)]
    /**Function with signature `timestamps(bytes32)` and selector `0xb5872958`.
```solidity
function timestamps(bytes32) external view returns (Time.Timestamp);
```*/
    #[allow(non_camel_case_types, non_snake_case, clippy::pub_underscore_fields)]
    #[derive(Clone)]
    pub struct timestampsCall(pub alloy::sol_types::private::FixedBytes<32>);
    #[derive(serde::Serialize, serde::Deserialize)]
    #[derive(Default, Debug, PartialEq, Eq, Hash)]
    ///Container type for the return parameters of the [`timestamps(bytes32)`](timestampsCall) function.
    #[allow(non_camel_case_types, non_snake_case, clippy::pub_underscore_fields)]
    #[derive(Clone)]
    pub struct timestampsReturn {
        #[allow(missing_docs)]
        pub _0: <Time::Timestamp as alloy::sol_types::SolType>::RustType,
    }
    #[allow(
        non_camel_case_types,
        non_snake_case,
        clippy::pub_underscore_fields,
        clippy::style
    )]
    const _: () = {
        use alloy::sol_types as alloy_sol_types;
        {
            #[doc(hidden)]
            type UnderlyingSolTuple<'a> = (alloy::sol_types::sol_data::FixedBytes<32>,);
            #[doc(hidden)]
            type UnderlyingRustTuple<'a> = (alloy::sol_types::private::FixedBytes<32>,);
            #[cfg(test)]
            #[allow(dead_code, unreachable_patterns)]
            fn _type_assertion(
                _t: alloy_sol_types::private::AssertTypeEq<UnderlyingRustTuple>,
            ) {
                match _t {
                    alloy_sol_types::private::AssertTypeEq::<
                        <UnderlyingSolTuple as alloy_sol_types::SolType>::RustType,
                    >(_) => {}
                }
            }
            #[automatically_derived]
            #[doc(hidden)]
            impl ::core::convert::From<timestampsCall> for UnderlyingRustTuple<'_> {
                fn from(value: timestampsCall) -> Self {
                    (value.0,)
                }
            }
            #[automatically_derived]
            #[doc(hidden)]
            impl ::core::convert::From<UnderlyingRustTuple<'_>> for timestampsCall {
                fn from(tuple: UnderlyingRustTuple<'_>) -> Self {
                    Self(tuple.0)
                }
            }
        }
        {
            #[doc(hidden)]
            type UnderlyingSolTuple<'a> = (Time::Timestamp,);
            #[doc(hidden)]
            type UnderlyingRustTuple<'a> = (
                <Time::Timestamp as alloy::sol_types::SolType>::RustType,
            );
            #[cfg(test)]
            #[allow(dead_code, unreachable_patterns)]
            fn _type_assertion(
                _t: alloy_sol_types::private::AssertTypeEq<UnderlyingRustTuple>,
            ) {
                match _t {
                    alloy_sol_types::private::AssertTypeEq::<
                        <UnderlyingSolTuple as alloy_sol_types::SolType>::RustType,
                    >(_) => {}
                }
            }
            #[automatically_derived]
            #[doc(hidden)]
            impl ::core::convert::From<timestampsReturn> for UnderlyingRustTuple<'_> {
                fn from(value: timestampsReturn) -> Self {
                    (value._0,)
                }
            }
            #[automatically_derived]
            #[doc(hidden)]
            impl ::core::convert::From<UnderlyingRustTuple<'_>> for timestampsReturn {
                fn from(tuple: UnderlyingRustTuple<'_>) -> Self {
                    Self { _0: tuple.0 }
                }
            }
        }
        #[automatically_derived]
        impl alloy_sol_types::SolCall for timestampsCall {
            type Parameters<'a> = (alloy::sol_types::sol_data::FixedBytes<32>,);
            type Token<'a> = <Self::Parameters<
                'a,
            > as alloy_sol_types::SolType>::Token<'a>;
            type Return = <Time::Timestamp as alloy::sol_types::SolType>::RustType;
            type ReturnTuple<'a> = (Time::Timestamp,);
            type ReturnToken<'a> = <Self::ReturnTuple<
                'a,
            > as alloy_sol_types::SolType>::Token<'a>;
            const SIGNATURE: &'static str = "timestamps(bytes32)";
            const SELECTOR: [u8; 4] = [181u8, 135u8, 41u8, 88u8];
            #[inline]
            fn new<'a>(
                tuple: <Self::Parameters<'a> as alloy_sol_types::SolType>::RustType,
            ) -> Self {
                tuple.into()
            }
            #[inline]
            fn tokenize(&self) -> Self::Token<'_> {
                (
                    <alloy::sol_types::sol_data::FixedBytes<
                        32,
                    > as alloy_sol_types::SolType>::tokenize(&self.0),
                )
            }
            #[inline]
            fn tokenize_returns(ret: &Self::Return) -> Self::ReturnToken<'_> {
                (<Time::Timestamp as alloy_sol_types::SolType>::tokenize(ret),)
            }
            #[inline]
            fn abi_decode_returns(data: &[u8]) -> alloy_sol_types::Result<Self::Return> {
                <Self::ReturnTuple<
                    '_,
                > as alloy_sol_types::SolType>::abi_decode_sequence(data)
                    .map(|r| {
                        let r: timestampsReturn = r.into();
                        r._0
                    })
            }
            #[inline]
            fn abi_decode_returns_validate(
                data: &[u8],
            ) -> alloy_sol_types::Result<Self::Return> {
                <Self::ReturnTuple<
                    '_,
                > as alloy_sol_types::SolType>::abi_decode_sequence_validate(data)
                    .map(|r| {
                        let r: timestampsReturn = r.into();
                        r._0
                    })
            }
        }
    };
    ///Container for all the [`Notary`](self) function calls.
    #[derive(serde::Serialize, serde::Deserialize)]
    #[derive()]
    pub enum NotaryCalls {
        #[allow(missing_docs)]
        timestamp(timestampCall),
        #[allow(missing_docs)]
        timestamps(timestampsCall),
    }
    #[automatically_derived]
    impl NotaryCalls {
        /// All the selectors of this enum.
        ///
        /// Note that the selectors might not be in the same order as the variants.
        /// No guarantees are made about the order of the selectors.
        ///
        /// Prefer using `SolInterface` methods instead.
        pub const SELECTORS: &'static [[u8; 4usize]] = &[
            [181u8, 135u8, 41u8, 88u8],
            [232u8, 214u8, 0u8, 137u8],
        ];
    }
    #[automatically_derived]
    impl alloy_sol_types::SolInterface for NotaryCalls {
        const NAME: &'static str = "NotaryCalls";
        const MIN_DATA_LENGTH: usize = 32usize;
        const COUNT: usize = 2usize;
        #[inline]
        fn selector(&self) -> [u8; 4] {
            match self {
                Self::timestamp(_) => {
                    <timestampCall as alloy_sol_types::SolCall>::SELECTOR
                }
                Self::timestamps(_) => {
                    <timestampsCall as alloy_sol_types::SolCall>::SELECTOR
                }
            }
        }
        #[inline]
        fn selector_at(i: usize) -> ::core::option::Option<[u8; 4]> {
            Self::SELECTORS.get(i).copied()
        }
        #[inline]
        fn valid_selector(selector: [u8; 4]) -> bool {
            Self::SELECTORS.binary_search(&selector).is_ok()
        }
        #[inline]
        #[allow(non_snake_case)]
        fn abi_decode_raw(
            selector: [u8; 4],
            data: &[u8],
        ) -> alloy_sol_types::Result<Self> {
            static DECODE_SHIMS: &[fn(&[u8]) -> alloy_sol_types::Result<NotaryCalls>] = &[
                {
                    fn timestamps(data: &[u8]) -> alloy_sol_types::Result<NotaryCalls> {
                        <timestampsCall as alloy_sol_types::SolCall>::abi_decode_raw(
                                data,
                            )
                            .map(NotaryCalls::timestamps)
                    }
                    timestamps
                },
                {
                    fn timestamp(data: &[u8]) -> alloy_sol_types::Result<NotaryCalls> {
                        <timestampCall as alloy_sol_types::SolCall>::abi_decode_raw(data)
                            .map(NotaryCalls::timestamp)
                    }
                    timestamp
                },
            ];
            let Ok(idx) = Self::SELECTORS.binary_search(&selector) else {
                return Err(
                    alloy_sol_types::Error::unknown_selector(
                        <Self as alloy_sol_types::SolInterface>::NAME,
                        selector,
                    ),
                );
            };
            DECODE_SHIMS[idx](data)
        }
        #[inline]
        #[allow(non_snake_case)]
        fn abi_decode_raw_validate(
            selector: [u8; 4],
            data: &[u8],
        ) -> alloy_sol_types::Result<Self> {
            static DECODE_VALIDATE_SHIMS: &[fn(
                &[u8],
            ) -> alloy_sol_types::Result<NotaryCalls>] = &[
                {
                    fn timestamps(data: &[u8]) -> alloy_sol_types::Result<NotaryCalls> {
                        <timestampsCall as alloy_sol_types::SolCall>::abi_decode_raw_validate(
                                data,
                            )
                            .map(NotaryCalls::timestamps)
                    }
                    timestamps
                },
                {
                    fn timestamp(data: &[u8]) -> alloy_sol_types::Result<NotaryCalls> {
                        <timestampCall as alloy_sol_types::SolCall>::abi_decode_raw_validate(
                                data,
                            )
                            .map(NotaryCalls::timestamp)
                    }
                    timestamp
                },
            ];
            let Ok(idx) = Self::SELECTORS.binary_search(&selector) else {
                return Err(
                    alloy_sol_types::Error::unknown_selector(
                        <Self as alloy_sol_types::SolInterface>::NAME,
                        selector,
                    ),
                );
            };
            DECODE_VALIDATE_SHIMS[idx](data)
        }
        #[inline]
        fn abi_encoded_size(&self) -> usize {
            match self {
                Self::timestamp(inner) => {
                    <timestampCall as alloy_sol_types::SolCall>::abi_encoded_size(inner)
                }
                Self::timestamps(inner) => {
                    <timestampsCall as alloy_sol_types::SolCall>::abi_encoded_size(inner)
                }
            }
        }
        #[inline]
        fn abi_encode_raw(&self, out: &mut alloy_sol_types::private::Vec<u8>) {
            match self {
                Self::timestamp(inner) => {
                    <timestampCall as alloy_sol_types::SolCall>::abi_encode_raw(
                        inner,
                        out,
                    )
                }
                Self::timestamps(inner) => {
                    <timestampsCall as alloy_sol_types::SolCall>::abi_encode_raw(
                        inner,
                        out,
                    )
                }
            }
        }
    }
    ///Container for all the [`Notary`](self) events.
    #[derive(serde::Serialize, serde::Deserialize)]
    #[derive(Debug, PartialEq, Eq, Hash)]
    pub enum NotaryEvents {
        #[allow(missing_docs)]
        DocumentTimestamped(DocumentTimestamped),
    }
    #[automatically_derived]
    impl NotaryEvents {
        /// All the selectors of this enum.
        ///
        /// Note that the selectors might not be in the same order as the variants.
        /// No guarantees are made about the order of the selectors.
        ///
        /// Prefer using `SolInterface` methods instead.
        pub const SELECTORS: &'static [[u8; 32usize]] = &[
            [
                200u8, 80u8, 43u8, 128u8, 249u8, 164u8, 237u8, 219u8, 41u8, 148u8, 61u8,
                70u8, 227u8, 111u8, 104u8, 144u8, 85u8, 162u8, 89u8, 168u8, 190u8, 115u8,
                123u8, 142u8, 61u8, 44u8, 144u8, 45u8, 164u8, 42u8, 110u8, 131u8,
            ],
        ];
    }
    #[automatically_derived]
    impl alloy_sol_types::SolEventInterface for NotaryEvents {
        const NAME: &'static str = "NotaryEvents";
        const COUNT: usize = 1usize;
        fn decode_raw_log(
            topics: &[alloy_sol_types::Word],
            data: &[u8],
        ) -> alloy_sol_types::Result<Self> {
            match topics.first().copied() {
                Some(
                    <DocumentTimestamped as alloy_sol_types::SolEvent>::SIGNATURE_HASH,
                ) => {
                    <DocumentTimestamped as alloy_sol_types::SolEvent>::decode_raw_log(
                            topics,
                            data,
                        )
                        .map(Self::DocumentTimestamped)
                }
                _ => {
                    alloy_sol_types::private::Err(alloy_sol_types::Error::InvalidLog {
                        name: <Self as alloy_sol_types::SolEventInterface>::NAME,
                        log: alloy_sol_types::private::Box::new(
                            alloy_sol_types::private::LogData::new_unchecked(
                                topics.to_vec(),
                                data.to_vec().into(),
                            ),
                        ),
                    })
                }
            }
        }
    }
    #[automatically_derived]
    impl alloy_sol_types::private::IntoLogData for NotaryEvents {
        fn to_log_data(&self) -> alloy_sol_types::private::LogData {
            match self {
                Self::DocumentTimestamped(inner) => {
                    alloy_sol_types::private::IntoLogData::to_log_data(inner)
                }
            }
        }
        fn into_log_data(self) -> alloy_sol_types::private::LogData {
            match self {
                Self::DocumentTimestamped(inner) => {
                    alloy_sol_types::private::IntoLogData::into_log_data(inner)
                }
            }
        }
    }
    use alloy::contract as alloy_contract;
    /**Creates a new wrapper around an on-chain [`Notary`](self) contract instance.

See the [wrapper's documentation](`NotaryInstance`) for more details.*/
    #[inline]
    pub const fn new<
        P: alloy_contract::private::Provider<N>,
        N: alloy_contract::private::Network,
    >(address: alloy_sol_types::private::Address, provider: P) -> NotaryInstance<P, N> {
        NotaryInstance::<P, N>::new(address, provider)
    }
    /**Deploys this contract using the given `provider` and constructor arguments, if any.

Returns a new instance of the contract, if the deployment was successful.

For more fine-grained control over the deployment process, use [`deploy_builder`] instead.*/
    #[inline]
    pub fn deploy<
        P: alloy_contract::private::Provider<N>,
        N: alloy_contract::private::Network,
    >(
        provider: P,
    ) -> impl ::core::future::Future<
        Output = alloy_contract::Result<NotaryInstance<P, N>>,
    > {
        NotaryInstance::<P, N>::deploy(provider)
    }
    /**Creates a `RawCallBuilder` for deploying this contract using the given `provider`
and constructor arguments, if any.

This is a simple wrapper around creating a `RawCallBuilder` with the data set to
the bytecode concatenated with the constructor's ABI-encoded arguments.*/
    #[inline]
    pub fn deploy_builder<
        P: alloy_contract::private::Provider<N>,
        N: alloy_contract::private::Network,
    >(provider: P) -> alloy_contract::RawCallBuilder<P, N> {
        NotaryInstance::<P, N>::deploy_builder(provider)
    }
    /**A [`Notary`](self) instance.

Contains type-safe methods for interacting with an on-chain instance of the
[`Notary`](self) contract located at a given `address`, using a given
provider `P`.

If the contract bytecode is available (see the [`sol!`](alloy_sol_types::sol!)
documentation on how to provide it), the `deploy` and `deploy_builder` methods can
be used to deploy a new instance of the contract.

See the [module-level documentation](self) for all the available methods.*/
    #[derive(Clone)]
    pub struct NotaryInstance<P, N = alloy_contract::private::Ethereum> {
        address: alloy_sol_types::private::Address,
        provider: P,
        _network: ::core::marker::PhantomData<N>,
    }
    #[automatically_derived]
    impl<P, N> ::core::fmt::Debug for NotaryInstance<P, N> {
        #[inline]
        fn fmt(&self, f: &mut ::core::fmt::Formatter<'_>) -> ::core::fmt::Result {
            f.debug_tuple("NotaryInstance").field(&self.address).finish()
        }
    }
    /// Instantiation and getters/setters.
    #[automatically_derived]
    impl<
        P: alloy_contract::private::Provider<N>,
        N: alloy_contract::private::Network,
    > NotaryInstance<P, N> {
        /**Creates a new wrapper around an on-chain [`Notary`](self) contract instance.

See the [wrapper's documentation](`NotaryInstance`) for more details.*/
        #[inline]
        pub const fn new(
            address: alloy_sol_types::private::Address,
            provider: P,
        ) -> Self {
            Self {
                address,
                provider,
                _network: ::core::marker::PhantomData,
            }
        }
        /**Deploys this contract using the given `provider` and constructor arguments, if any.

Returns a new instance of the contract, if the deployment was successful.

For more fine-grained control over the deployment process, use [`deploy_builder`] instead.*/
        #[inline]
        pub async fn deploy(
            provider: P,
        ) -> alloy_contract::Result<NotaryInstance<P, N>> {
            let call_builder = Self::deploy_builder(provider);
            let contract_address = call_builder.deploy().await?;
            Ok(Self::new(contract_address, call_builder.provider))
        }
        /**Creates a `RawCallBuilder` for deploying this contract using the given `provider`
and constructor arguments, if any.

This is a simple wrapper around creating a `RawCallBuilder` with the data set to
the bytecode concatenated with the constructor's ABI-encoded arguments.*/
        #[inline]
        pub fn deploy_builder(provider: P) -> alloy_contract::RawCallBuilder<P, N> {
            alloy_contract::RawCallBuilder::new_raw_deploy(
                provider,
                ::core::clone::Clone::clone(&BYTECODE),
            )
        }
        /// Returns a reference to the address.
        #[inline]
        pub const fn address(&self) -> &alloy_sol_types::private::Address {
            &self.address
        }
        /// Sets the address.
        #[inline]
        pub fn set_address(&mut self, address: alloy_sol_types::private::Address) {
            self.address = address;
        }
        /// Sets the address and returns `self`.
        pub fn at(mut self, address: alloy_sol_types::private::Address) -> Self {
            self.set_address(address);
            self
        }
        /// Returns a reference to the provider.
        #[inline]
        pub const fn provider(&self) -> &P {
            &self.provider
        }
    }
    impl<P: ::core::clone::Clone, N> NotaryInstance<&P, N> {
        /// Clones the provider and returns a new instance with the cloned provider.
        #[inline]
        pub fn with_cloned_provider(self) -> NotaryInstance<P, N> {
            NotaryInstance {
                address: self.address,
                provider: ::core::clone::Clone::clone(&self.provider),
                _network: ::core::marker::PhantomData,
            }
        }
    }
    /// Function calls.
    #[automatically_derived]
    impl<
        P: alloy_contract::private::Provider<N>,
        N: alloy_contract::private::Network,
    > NotaryInstance<P, N> {
        /// Creates a new call builder using this contract instance's provider and address.
        ///
        /// Note that the call can be any function call, not just those defined in this
        /// contract. Prefer using the other methods for building type-safe contract calls.
        pub fn call_builder<C: alloy_sol_types::SolCall>(
            &self,
            call: &C,
        ) -> alloy_contract::SolCallBuilder<&P, C, N> {
            alloy_contract::SolCallBuilder::new_sol(&self.provider, &self.address, call)
        }
        ///Creates a new call builder for the [`timestamp`] function.
        pub fn timestamp(
            &self,
            documentHash: alloy::sol_types::private::FixedBytes<32>,
            ts: <Time::Timestamp as alloy::sol_types::SolType>::RustType,
        ) -> alloy_contract::SolCallBuilder<&P, timestampCall, N> {
            self.call_builder(&timestampCall { documentHash, ts })
        }
        ///Creates a new call builder for the [`timestamps`] function.
        pub fn timestamps(
            &self,
            _0: alloy::sol_types::private::FixedBytes<32>,
        ) -> alloy_contract::SolCallBuilder<&P, timestampsCall, N> {
            self.call_builder(&timestampsCall(_0))
        }
    }
    /// Event filters.
    #[automatically_derived]
    impl<
        P: alloy_contract::private::Provider<N>,
        N: alloy_contract::private::Network,
    > NotaryInstance<P, N> {
        /// Creates a new event filter using this contract instance's provider and address.
        ///
        /// Note that the type can be any event, not just those defined in this contract.
        /// Prefer using the other methods for building type-safe event filters.
        pub fn event_filter<E: alloy_sol_types::SolEvent>(
            &self,
        ) -> alloy_contract::Event<&P, E, N> {
            alloy_contract::Event::new_sol(&self.provider, &self.address)
        }
        ///Creates a new event filter for the [`DocumentTimestamped`] event.
        pub fn DocumentTimestamped_filter(
            &self,
        ) -> alloy_contract::Event<&P, DocumentTimestamped, N> {
            self.event_filter::<DocumentTimestamped>()
        }
    }
}
