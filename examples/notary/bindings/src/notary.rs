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
    ///0x6080604052348015600f57600080fd5b50610a5d8061001f6000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c8063b58729581461003b578063e8d600891461006b575b600080fd5b6100556004803603810190610050919061063d565b610087565b60405161006291906106b9565b60405180910390f35b61008560048036038101906100809190610700565b6100ae565b005b60006020528060005260406000206000915054906101000a900467ffffffffffffffff1681565b6100ed816040518060400160405280601f81526020017f74696d657374616d70206d75737420626520696e2074686520667574757265008152506102cf565b61012660008084815260200190815260200160002060009054906101000a900467ffffffffffffffff1667ffffffffffffffff16610300565b156101b8578060008084815260200190815260200160002060006101000a81548167ffffffffffffffff021916908367ffffffffffffffff1602179055503373ffffffffffffffffffffffffffffffffffffffff16827fc8502b80f9a4eddb29943d46e36f689055a259a8be737b8e3d2c902da42a6e83836040516101ab91906106b9565b60405180910390a36102cb565b60006101ea8260008086815260200190815260200160002060009054906101000a900467ffffffffffffffff16610316565b9050600061023160008086815260200190815260200160002060009054906101000a900467ffffffffffffffff168367ffffffffffffffff1661034990919063ffffffff16565b67ffffffffffffffff16146102c9578060008085815260200190815260200160002060006101000a81548167ffffffffffffffff021916908367ffffffffffffffff1602179055503373ffffffffffffffffffffffffffffffffffffffff16837fc8502b80f9a4eddb29943d46e36f689055a259a8be737b8e3d2c902da42a6e83836040516102c091906106b9565b60405180910390a35b505b5050565b6102fc6102f6836102de610395565b67ffffffffffffffff166104ca90919063ffffffff16565b826104eb565b5050565b6000808267ffffffffffffffff16149050919050565b6000610335828467ffffffffffffffff166104ca90919063ffffffff16565b61033f5781610341565b825b905092915050565b6000610368828467ffffffffffffffff166105e190919063ffffffff16565b15610380578183610379919061076f565b905061038f565b828261038c919061076f565b90505b92915050565b60008060007fba286e4d89dabf4b2878e896423bb123d9d5143e662606fd343b6766d7bcf72160001c73ffffffffffffffffffffffffffffffffffffffff166040516103e0906107dc565b600060405180830381855afa9150503d806000811461041b576040519150601f19603f3d011682016040523d82523d6000602084013e610420565b606091505b509150915081610465576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161045c9061084e565b60405180910390fd5b60208151146104a9576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016104a0906108ba565b60405180910390fd5b6000818060200190518101906104bf9190610906565b905080935050505090565b60008167ffffffffffffffff168367ffffffffffffffff1610905092915050565b60007f3dcdf63b41c103567d7225976ad9145e866c7a7dccc6c277ea86abbd268fbac960001c73ffffffffffffffffffffffffffffffffffffffff1683604051602001610538919061094e565b60405160208183030381529060405260405161055491906109cf565b600060405180830381855afa9150503d806000811461058f576040519150601f19603f3d011682016040523d82523d6000602084013e610594565b606091505b505090508082906105db576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016105d29190610a3b565b60405180910390fd5b50505050565b60008167ffffffffffffffff168367ffffffffffffffff1611905092915050565b600080fd5b6000819050919050565b61061a81610607565b811461062557600080fd5b50565b60008135905061063781610611565b92915050565b60006020828403121561065357610652610602565b5b600061066184828501610628565b91505092915050565b600067ffffffffffffffff82169050919050565b6000819050919050565b60006106a361069e6106998461066a565b61067e565b61066a565b9050919050565b6106b381610688565b82525050565b60006020820190506106ce60008301846106aa565b92915050565b6106dd8161066a565b81146106e857600080fd5b50565b6000813590506106fa816106d4565b92915050565b6000806040838503121561071757610716610602565b5b600061072585828601610628565b9250506020610736858286016106eb565b9150509250929050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b600061077a8261066a565b91506107858361066a565b9250828203905067ffffffffffffffff8111156107a5576107a4610740565b5b92915050565b600081905092915050565b50565b60006107c66000836107ab565b91506107d1826107b6565b600082019050919050565b60006107e7826107b9565b9150819050919050565b600082825260208201905092915050565b7f507265636f6d70696c652063616c6c206661696c656400000000000000000000600082015250565b60006108386016836107f1565b915061084382610802565b602082019050919050565b600060208201905081810360008301526108678161082b565b9050919050565b7f496e76616c6964206f7574707574206c656e6774680000000000000000000000600082015250565b60006108a46015836107f1565b91506108af8261086e565b602082019050919050565b600060208201905081810360008301526108d381610897565b9050919050565b6108e38161066a565b81146108ee57600080fd5b50565b600081519050610900816108da565b92915050565b60006020828403121561091c5761091b610602565b5b600061092a848285016108f1565b91505092915050565b60008115159050919050565b61094881610933565b82525050565b6000602082019050610963600083018461093f565b92915050565b600081519050919050565b60005b83811015610992578082015181840152602081019050610977565b60008484015250505050565b60006109a982610969565b6109b381856107ab565b93506109c3818560208601610974565b80840191505092915050565b60006109db828461099e565b915081905092915050565b600081519050919050565b6000601f19601f8301169050919050565b6000610a0d826109e6565b610a1781856107f1565b9350610a27818560208601610974565b610a30816109f1565b840191505092915050565b60006020820190508181036000830152610a558184610a02565b90509291505056
    /// ```
    #[rustfmt::skip]
    #[allow(clippy::all)]
    pub static BYTECODE: alloy_sol_types::private::Bytes = alloy_sol_types::private::Bytes::from_static(
        b"`\x80`@R4\x80\x15`\x0FW`\0\x80\xFD[Pa\n]\x80a\0\x1F`\09`\0\xF3\xFE`\x80`@R4\x80\x15a\0\x10W`\0\x80\xFD[P`\x046\x10a\x006W`\x005`\xE0\x1C\x80c\xB5\x87)X\x14a\0;W\x80c\xE8\xD6\0\x89\x14a\0kW[`\0\x80\xFD[a\0U`\x04\x806\x03\x81\x01\x90a\0P\x91\x90a\x06=V[a\0\x87V[`@Qa\0b\x91\x90a\x06\xB9V[`@Q\x80\x91\x03\x90\xF3[a\0\x85`\x04\x806\x03\x81\x01\x90a\0\x80\x91\x90a\x07\0V[a\0\xAEV[\0[`\0` R\x80`\0R`@`\0 `\0\x91PT\x90a\x01\0\n\x90\x04g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x81V[a\0\xED\x81`@Q\x80`@\x01`@R\x80`\x1F\x81R` \x01\x7Ftimestamp must be in the future\0\x81RPa\x02\xCFV[a\x01&`\0\x80\x84\x81R` \x01\x90\x81R` \x01`\0 `\0\x90T\x90a\x01\0\n\x90\x04g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16a\x03\0V[\x15a\x01\xB8W\x80`\0\x80\x84\x81R` \x01\x90\x81R` \x01`\0 `\0a\x01\0\n\x81T\x81g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x02\x19\x16\x90\x83g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x02\x17\x90UP3s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x82\x7F\xC8P+\x80\xF9\xA4\xED\xDB)\x94=F\xE3oh\x90U\xA2Y\xA8\xBEs{\x8E=,\x90-\xA4*n\x83\x83`@Qa\x01\xAB\x91\x90a\x06\xB9V[`@Q\x80\x91\x03\x90\xA3a\x02\xCBV[`\0a\x01\xEA\x82`\0\x80\x86\x81R` \x01\x90\x81R` \x01`\0 `\0\x90T\x90a\x01\0\n\x90\x04g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16a\x03\x16V[\x90P`\0a\x021`\0\x80\x86\x81R` \x01\x90\x81R` \x01`\0 `\0\x90T\x90a\x01\0\n\x90\x04g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16a\x03I\x90\x91\x90c\xFF\xFF\xFF\xFF\x16V[g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x14a\x02\xC9W\x80`\0\x80\x85\x81R` \x01\x90\x81R` \x01`\0 `\0a\x01\0\n\x81T\x81g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x02\x19\x16\x90\x83g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x02\x17\x90UP3s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83\x7F\xC8P+\x80\xF9\xA4\xED\xDB)\x94=F\xE3oh\x90U\xA2Y\xA8\xBEs{\x8E=,\x90-\xA4*n\x83\x83`@Qa\x02\xC0\x91\x90a\x06\xB9V[`@Q\x80\x91\x03\x90\xA3[P[PPV[a\x02\xFCa\x02\xF6\x83a\x02\xDEa\x03\x95V[g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16a\x04\xCA\x90\x91\x90c\xFF\xFF\xFF\xFF\x16V[\x82a\x04\xEBV[PPV[`\0\x80\x82g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x14\x90P\x91\x90PV[`\0a\x035\x82\x84g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16a\x04\xCA\x90\x91\x90c\xFF\xFF\xFF\xFF\x16V[a\x03?W\x81a\x03AV[\x82[\x90P\x92\x91PPV[`\0a\x03h\x82\x84g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16a\x05\xE1\x90\x91\x90c\xFF\xFF\xFF\xFF\x16V[\x15a\x03\x80W\x81\x83a\x03y\x91\x90a\x07oV[\x90Pa\x03\x8FV[\x82\x82a\x03\x8C\x91\x90a\x07oV[\x90P[\x92\x91PPV[`\0\x80`\0\x7F\xBA(nM\x89\xDA\xBFK(x\xE8\x96B;\xB1#\xD9\xD5\x14>f&\x06\xFD4;gf\xD7\xBC\xF7!`\0\x1Cs\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16`@Qa\x03\xE0\x90a\x07\xDCV[`\0`@Q\x80\x83\x03\x81\x85Z\xFA\x91PP=\x80`\0\x81\x14a\x04\x1BW`@Q\x91P`\x1F\x19`?=\x01\x16\x82\x01`@R=\x82R=`\0` \x84\x01>a\x04 V[``\x91P[P\x91P\x91P\x81a\x04eW`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x04\\\x90a\x08NV[`@Q\x80\x91\x03\x90\xFD[` \x81Q\x14a\x04\xA9W`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x04\xA0\x90a\x08\xBAV[`@Q\x80\x91\x03\x90\xFD[`\0\x81\x80` \x01\x90Q\x81\x01\x90a\x04\xBF\x91\x90a\t\x06V[\x90P\x80\x93PPPP\x90V[`\0\x81g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x10\x90P\x92\x91PPV[`\0\x7F=\xCD\xF6;A\xC1\x03V}r%\x97j\xD9\x14^\x86lz}\xCC\xC6\xC2w\xEA\x86\xAB\xBD&\x8F\xBA\xC9`\0\x1Cs\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83`@Q` \x01a\x058\x91\x90a\tNV[`@Q` \x81\x83\x03\x03\x81R\x90`@R`@Qa\x05T\x91\x90a\t\xCFV[`\0`@Q\x80\x83\x03\x81\x85Z\xFA\x91PP=\x80`\0\x81\x14a\x05\x8FW`@Q\x91P`\x1F\x19`?=\x01\x16\x82\x01`@R=\x82R=`\0` \x84\x01>a\x05\x94V[``\x91P[PP\x90P\x80\x82\x90a\x05\xDBW`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x05\xD2\x91\x90a\n;V[`@Q\x80\x91\x03\x90\xFD[PPPPV[`\0\x81g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x11\x90P\x92\x91PPV[`\0\x80\xFD[`\0\x81\x90P\x91\x90PV[a\x06\x1A\x81a\x06\x07V[\x81\x14a\x06%W`\0\x80\xFD[PV[`\0\x815\x90Pa\x067\x81a\x06\x11V[\x92\x91PPV[`\0` \x82\x84\x03\x12\x15a\x06SWa\x06Ra\x06\x02V[[`\0a\x06a\x84\x82\x85\x01a\x06(V[\x91PP\x92\x91PPV[`\0g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x82\x16\x90P\x91\x90PV[`\0\x81\x90P\x91\x90PV[`\0a\x06\xA3a\x06\x9Ea\x06\x99\x84a\x06jV[a\x06~V[a\x06jV[\x90P\x91\x90PV[a\x06\xB3\x81a\x06\x88V[\x82RPPV[`\0` \x82\x01\x90Pa\x06\xCE`\0\x83\x01\x84a\x06\xAAV[\x92\x91PPV[a\x06\xDD\x81a\x06jV[\x81\x14a\x06\xE8W`\0\x80\xFD[PV[`\0\x815\x90Pa\x06\xFA\x81a\x06\xD4V[\x92\x91PPV[`\0\x80`@\x83\x85\x03\x12\x15a\x07\x17Wa\x07\x16a\x06\x02V[[`\0a\x07%\x85\x82\x86\x01a\x06(V[\x92PP` a\x076\x85\x82\x86\x01a\x06\xEBV[\x91PP\x92P\x92\x90PV[\x7FNH{q\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0`\0R`\x11`\x04R`$`\0\xFD[`\0a\x07z\x82a\x06jV[\x91Pa\x07\x85\x83a\x06jV[\x92P\x82\x82\x03\x90Pg\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x81\x11\x15a\x07\xA5Wa\x07\xA4a\x07@V[[\x92\x91PPV[`\0\x81\x90P\x92\x91PPV[PV[`\0a\x07\xC6`\0\x83a\x07\xABV[\x91Pa\x07\xD1\x82a\x07\xB6V[`\0\x82\x01\x90P\x91\x90PV[`\0a\x07\xE7\x82a\x07\xB9V[\x91P\x81\x90P\x91\x90PV[`\0\x82\x82R` \x82\x01\x90P\x92\x91PPV[\x7FPrecompile call failed\0\0\0\0\0\0\0\0\0\0`\0\x82\x01RPV[`\0a\x088`\x16\x83a\x07\xF1V[\x91Pa\x08C\x82a\x08\x02V[` \x82\x01\x90P\x91\x90PV[`\0` \x82\x01\x90P\x81\x81\x03`\0\x83\x01Ra\x08g\x81a\x08+V[\x90P\x91\x90PV[\x7FInvalid output length\0\0\0\0\0\0\0\0\0\0\0`\0\x82\x01RPV[`\0a\x08\xA4`\x15\x83a\x07\xF1V[\x91Pa\x08\xAF\x82a\x08nV[` \x82\x01\x90P\x91\x90PV[`\0` \x82\x01\x90P\x81\x81\x03`\0\x83\x01Ra\x08\xD3\x81a\x08\x97V[\x90P\x91\x90PV[a\x08\xE3\x81a\x06jV[\x81\x14a\x08\xEEW`\0\x80\xFD[PV[`\0\x81Q\x90Pa\t\0\x81a\x08\xDAV[\x92\x91PPV[`\0` \x82\x84\x03\x12\x15a\t\x1CWa\t\x1Ba\x06\x02V[[`\0a\t*\x84\x82\x85\x01a\x08\xF1V[\x91PP\x92\x91PPV[`\0\x81\x15\x15\x90P\x91\x90PV[a\tH\x81a\t3V[\x82RPPV[`\0` \x82\x01\x90Pa\tc`\0\x83\x01\x84a\t?V[\x92\x91PPV[`\0\x81Q\x90P\x91\x90PV[`\0[\x83\x81\x10\x15a\t\x92W\x80\x82\x01Q\x81\x84\x01R` \x81\x01\x90Pa\twV[`\0\x84\x84\x01RPPPPV[`\0a\t\xA9\x82a\tiV[a\t\xB3\x81\x85a\x07\xABV[\x93Pa\t\xC3\x81\x85` \x86\x01a\ttV[\x80\x84\x01\x91PP\x92\x91PPV[`\0a\t\xDB\x82\x84a\t\x9EV[\x91P\x81\x90P\x92\x91PPV[`\0\x81Q\x90P\x91\x90PV[`\0`\x1F\x19`\x1F\x83\x01\x16\x90P\x91\x90PV[`\0a\n\r\x82a\t\xE6V[a\n\x17\x81\x85a\x07\xF1V[\x93Pa\n'\x81\x85` \x86\x01a\ttV[a\n0\x81a\t\xF1V[\x84\x01\x91PP\x92\x91PPV[`\0` \x82\x01\x90P\x81\x81\x03`\0\x83\x01Ra\nU\x81\x84a\n\x02V[\x90P\x92\x91PPV",
    );
    /// The runtime bytecode of the contract, as deployed on the network.
    ///
    /// ```text
    ///0x608060405234801561001057600080fd5b50600436106100365760003560e01c8063b58729581461003b578063e8d600891461006b575b600080fd5b6100556004803603810190610050919061063d565b610087565b60405161006291906106b9565b60405180910390f35b61008560048036038101906100809190610700565b6100ae565b005b60006020528060005260406000206000915054906101000a900467ffffffffffffffff1681565b6100ed816040518060400160405280601f81526020017f74696d657374616d70206d75737420626520696e2074686520667574757265008152506102cf565b61012660008084815260200190815260200160002060009054906101000a900467ffffffffffffffff1667ffffffffffffffff16610300565b156101b8578060008084815260200190815260200160002060006101000a81548167ffffffffffffffff021916908367ffffffffffffffff1602179055503373ffffffffffffffffffffffffffffffffffffffff16827fc8502b80f9a4eddb29943d46e36f689055a259a8be737b8e3d2c902da42a6e83836040516101ab91906106b9565b60405180910390a36102cb565b60006101ea8260008086815260200190815260200160002060009054906101000a900467ffffffffffffffff16610316565b9050600061023160008086815260200190815260200160002060009054906101000a900467ffffffffffffffff168367ffffffffffffffff1661034990919063ffffffff16565b67ffffffffffffffff16146102c9578060008085815260200190815260200160002060006101000a81548167ffffffffffffffff021916908367ffffffffffffffff1602179055503373ffffffffffffffffffffffffffffffffffffffff16837fc8502b80f9a4eddb29943d46e36f689055a259a8be737b8e3d2c902da42a6e83836040516102c091906106b9565b60405180910390a35b505b5050565b6102fc6102f6836102de610395565b67ffffffffffffffff166104ca90919063ffffffff16565b826104eb565b5050565b6000808267ffffffffffffffff16149050919050565b6000610335828467ffffffffffffffff166104ca90919063ffffffff16565b61033f5781610341565b825b905092915050565b6000610368828467ffffffffffffffff166105e190919063ffffffff16565b15610380578183610379919061076f565b905061038f565b828261038c919061076f565b90505b92915050565b60008060007fba286e4d89dabf4b2878e896423bb123d9d5143e662606fd343b6766d7bcf72160001c73ffffffffffffffffffffffffffffffffffffffff166040516103e0906107dc565b600060405180830381855afa9150503d806000811461041b576040519150601f19603f3d011682016040523d82523d6000602084013e610420565b606091505b509150915081610465576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161045c9061084e565b60405180910390fd5b60208151146104a9576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016104a0906108ba565b60405180910390fd5b6000818060200190518101906104bf9190610906565b905080935050505090565b60008167ffffffffffffffff168367ffffffffffffffff1610905092915050565b60007f3dcdf63b41c103567d7225976ad9145e866c7a7dccc6c277ea86abbd268fbac960001c73ffffffffffffffffffffffffffffffffffffffff1683604051602001610538919061094e565b60405160208183030381529060405260405161055491906109cf565b600060405180830381855afa9150503d806000811461058f576040519150601f19603f3d011682016040523d82523d6000602084013e610594565b606091505b505090508082906105db576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016105d29190610a3b565b60405180910390fd5b50505050565b60008167ffffffffffffffff168367ffffffffffffffff1611905092915050565b600080fd5b6000819050919050565b61061a81610607565b811461062557600080fd5b50565b60008135905061063781610611565b92915050565b60006020828403121561065357610652610602565b5b600061066184828501610628565b91505092915050565b600067ffffffffffffffff82169050919050565b6000819050919050565b60006106a361069e6106998461066a565b61067e565b61066a565b9050919050565b6106b381610688565b82525050565b60006020820190506106ce60008301846106aa565b92915050565b6106dd8161066a565b81146106e857600080fd5b50565b6000813590506106fa816106d4565b92915050565b6000806040838503121561071757610716610602565b5b600061072585828601610628565b9250506020610736858286016106eb565b9150509250929050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b600061077a8261066a565b91506107858361066a565b9250828203905067ffffffffffffffff8111156107a5576107a4610740565b5b92915050565b600081905092915050565b50565b60006107c66000836107ab565b91506107d1826107b6565b600082019050919050565b60006107e7826107b9565b9150819050919050565b600082825260208201905092915050565b7f507265636f6d70696c652063616c6c206661696c656400000000000000000000600082015250565b60006108386016836107f1565b915061084382610802565b602082019050919050565b600060208201905081810360008301526108678161082b565b9050919050565b7f496e76616c6964206f7574707574206c656e6774680000000000000000000000600082015250565b60006108a46015836107f1565b91506108af8261086e565b602082019050919050565b600060208201905081810360008301526108d381610897565b9050919050565b6108e38161066a565b81146108ee57600080fd5b50565b600081519050610900816108da565b92915050565b60006020828403121561091c5761091b610602565b5b600061092a848285016108f1565b91505092915050565b60008115159050919050565b61094881610933565b82525050565b6000602082019050610963600083018461093f565b92915050565b600081519050919050565b60005b83811015610992578082015181840152602081019050610977565b60008484015250505050565b60006109a982610969565b6109b381856107ab565b93506109c3818560208601610974565b80840191505092915050565b60006109db828461099e565b915081905092915050565b600081519050919050565b6000601f19601f8301169050919050565b6000610a0d826109e6565b610a1781856107f1565b9350610a27818560208601610974565b610a30816109f1565b840191505092915050565b60006020820190508181036000830152610a558184610a02565b90509291505056
    /// ```
    #[rustfmt::skip]
    #[allow(clippy::all)]
    pub static DEPLOYED_BYTECODE: alloy_sol_types::private::Bytes = alloy_sol_types::private::Bytes::from_static(
        b"`\x80`@R4\x80\x15a\0\x10W`\0\x80\xFD[P`\x046\x10a\x006W`\x005`\xE0\x1C\x80c\xB5\x87)X\x14a\0;W\x80c\xE8\xD6\0\x89\x14a\0kW[`\0\x80\xFD[a\0U`\x04\x806\x03\x81\x01\x90a\0P\x91\x90a\x06=V[a\0\x87V[`@Qa\0b\x91\x90a\x06\xB9V[`@Q\x80\x91\x03\x90\xF3[a\0\x85`\x04\x806\x03\x81\x01\x90a\0\x80\x91\x90a\x07\0V[a\0\xAEV[\0[`\0` R\x80`\0R`@`\0 `\0\x91PT\x90a\x01\0\n\x90\x04g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x81V[a\0\xED\x81`@Q\x80`@\x01`@R\x80`\x1F\x81R` \x01\x7Ftimestamp must be in the future\0\x81RPa\x02\xCFV[a\x01&`\0\x80\x84\x81R` \x01\x90\x81R` \x01`\0 `\0\x90T\x90a\x01\0\n\x90\x04g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16a\x03\0V[\x15a\x01\xB8W\x80`\0\x80\x84\x81R` \x01\x90\x81R` \x01`\0 `\0a\x01\0\n\x81T\x81g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x02\x19\x16\x90\x83g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x02\x17\x90UP3s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x82\x7F\xC8P+\x80\xF9\xA4\xED\xDB)\x94=F\xE3oh\x90U\xA2Y\xA8\xBEs{\x8E=,\x90-\xA4*n\x83\x83`@Qa\x01\xAB\x91\x90a\x06\xB9V[`@Q\x80\x91\x03\x90\xA3a\x02\xCBV[`\0a\x01\xEA\x82`\0\x80\x86\x81R` \x01\x90\x81R` \x01`\0 `\0\x90T\x90a\x01\0\n\x90\x04g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16a\x03\x16V[\x90P`\0a\x021`\0\x80\x86\x81R` \x01\x90\x81R` \x01`\0 `\0\x90T\x90a\x01\0\n\x90\x04g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16a\x03I\x90\x91\x90c\xFF\xFF\xFF\xFF\x16V[g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x14a\x02\xC9W\x80`\0\x80\x85\x81R` \x01\x90\x81R` \x01`\0 `\0a\x01\0\n\x81T\x81g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x02\x19\x16\x90\x83g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x02\x17\x90UP3s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83\x7F\xC8P+\x80\xF9\xA4\xED\xDB)\x94=F\xE3oh\x90U\xA2Y\xA8\xBEs{\x8E=,\x90-\xA4*n\x83\x83`@Qa\x02\xC0\x91\x90a\x06\xB9V[`@Q\x80\x91\x03\x90\xA3[P[PPV[a\x02\xFCa\x02\xF6\x83a\x02\xDEa\x03\x95V[g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16a\x04\xCA\x90\x91\x90c\xFF\xFF\xFF\xFF\x16V[\x82a\x04\xEBV[PPV[`\0\x80\x82g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x14\x90P\x91\x90PV[`\0a\x035\x82\x84g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16a\x04\xCA\x90\x91\x90c\xFF\xFF\xFF\xFF\x16V[a\x03?W\x81a\x03AV[\x82[\x90P\x92\x91PPV[`\0a\x03h\x82\x84g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16a\x05\xE1\x90\x91\x90c\xFF\xFF\xFF\xFF\x16V[\x15a\x03\x80W\x81\x83a\x03y\x91\x90a\x07oV[\x90Pa\x03\x8FV[\x82\x82a\x03\x8C\x91\x90a\x07oV[\x90P[\x92\x91PPV[`\0\x80`\0\x7F\xBA(nM\x89\xDA\xBFK(x\xE8\x96B;\xB1#\xD9\xD5\x14>f&\x06\xFD4;gf\xD7\xBC\xF7!`\0\x1Cs\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16`@Qa\x03\xE0\x90a\x07\xDCV[`\0`@Q\x80\x83\x03\x81\x85Z\xFA\x91PP=\x80`\0\x81\x14a\x04\x1BW`@Q\x91P`\x1F\x19`?=\x01\x16\x82\x01`@R=\x82R=`\0` \x84\x01>a\x04 V[``\x91P[P\x91P\x91P\x81a\x04eW`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x04\\\x90a\x08NV[`@Q\x80\x91\x03\x90\xFD[` \x81Q\x14a\x04\xA9W`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x04\xA0\x90a\x08\xBAV[`@Q\x80\x91\x03\x90\xFD[`\0\x81\x80` \x01\x90Q\x81\x01\x90a\x04\xBF\x91\x90a\t\x06V[\x90P\x80\x93PPPP\x90V[`\0\x81g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x10\x90P\x92\x91PPV[`\0\x7F=\xCD\xF6;A\xC1\x03V}r%\x97j\xD9\x14^\x86lz}\xCC\xC6\xC2w\xEA\x86\xAB\xBD&\x8F\xBA\xC9`\0\x1Cs\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83`@Q` \x01a\x058\x91\x90a\tNV[`@Q` \x81\x83\x03\x03\x81R\x90`@R`@Qa\x05T\x91\x90a\t\xCFV[`\0`@Q\x80\x83\x03\x81\x85Z\xFA\x91PP=\x80`\0\x81\x14a\x05\x8FW`@Q\x91P`\x1F\x19`?=\x01\x16\x82\x01`@R=\x82R=`\0` \x84\x01>a\x05\x94V[``\x91P[PP\x90P\x80\x82\x90a\x05\xDBW`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x05\xD2\x91\x90a\n;V[`@Q\x80\x91\x03\x90\xFD[PPPPV[`\0\x81g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x11\x90P\x92\x91PPV[`\0\x80\xFD[`\0\x81\x90P\x91\x90PV[a\x06\x1A\x81a\x06\x07V[\x81\x14a\x06%W`\0\x80\xFD[PV[`\0\x815\x90Pa\x067\x81a\x06\x11V[\x92\x91PPV[`\0` \x82\x84\x03\x12\x15a\x06SWa\x06Ra\x06\x02V[[`\0a\x06a\x84\x82\x85\x01a\x06(V[\x91PP\x92\x91PPV[`\0g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x82\x16\x90P\x91\x90PV[`\0\x81\x90P\x91\x90PV[`\0a\x06\xA3a\x06\x9Ea\x06\x99\x84a\x06jV[a\x06~V[a\x06jV[\x90P\x91\x90PV[a\x06\xB3\x81a\x06\x88V[\x82RPPV[`\0` \x82\x01\x90Pa\x06\xCE`\0\x83\x01\x84a\x06\xAAV[\x92\x91PPV[a\x06\xDD\x81a\x06jV[\x81\x14a\x06\xE8W`\0\x80\xFD[PV[`\0\x815\x90Pa\x06\xFA\x81a\x06\xD4V[\x92\x91PPV[`\0\x80`@\x83\x85\x03\x12\x15a\x07\x17Wa\x07\x16a\x06\x02V[[`\0a\x07%\x85\x82\x86\x01a\x06(V[\x92PP` a\x076\x85\x82\x86\x01a\x06\xEBV[\x91PP\x92P\x92\x90PV[\x7FNH{q\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0`\0R`\x11`\x04R`$`\0\xFD[`\0a\x07z\x82a\x06jV[\x91Pa\x07\x85\x83a\x06jV[\x92P\x82\x82\x03\x90Pg\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x81\x11\x15a\x07\xA5Wa\x07\xA4a\x07@V[[\x92\x91PPV[`\0\x81\x90P\x92\x91PPV[PV[`\0a\x07\xC6`\0\x83a\x07\xABV[\x91Pa\x07\xD1\x82a\x07\xB6V[`\0\x82\x01\x90P\x91\x90PV[`\0a\x07\xE7\x82a\x07\xB9V[\x91P\x81\x90P\x91\x90PV[`\0\x82\x82R` \x82\x01\x90P\x92\x91PPV[\x7FPrecompile call failed\0\0\0\0\0\0\0\0\0\0`\0\x82\x01RPV[`\0a\x088`\x16\x83a\x07\xF1V[\x91Pa\x08C\x82a\x08\x02V[` \x82\x01\x90P\x91\x90PV[`\0` \x82\x01\x90P\x81\x81\x03`\0\x83\x01Ra\x08g\x81a\x08+V[\x90P\x91\x90PV[\x7FInvalid output length\0\0\0\0\0\0\0\0\0\0\0`\0\x82\x01RPV[`\0a\x08\xA4`\x15\x83a\x07\xF1V[\x91Pa\x08\xAF\x82a\x08nV[` \x82\x01\x90P\x91\x90PV[`\0` \x82\x01\x90P\x81\x81\x03`\0\x83\x01Ra\x08\xD3\x81a\x08\x97V[\x90P\x91\x90PV[a\x08\xE3\x81a\x06jV[\x81\x14a\x08\xEEW`\0\x80\xFD[PV[`\0\x81Q\x90Pa\t\0\x81a\x08\xDAV[\x92\x91PPV[`\0` \x82\x84\x03\x12\x15a\t\x1CWa\t\x1Ba\x06\x02V[[`\0a\t*\x84\x82\x85\x01a\x08\xF1V[\x91PP\x92\x91PPV[`\0\x81\x15\x15\x90P\x91\x90PV[a\tH\x81a\t3V[\x82RPPV[`\0` \x82\x01\x90Pa\tc`\0\x83\x01\x84a\t?V[\x92\x91PPV[`\0\x81Q\x90P\x91\x90PV[`\0[\x83\x81\x10\x15a\t\x92W\x80\x82\x01Q\x81\x84\x01R` \x81\x01\x90Pa\twV[`\0\x84\x84\x01RPPPPV[`\0a\t\xA9\x82a\tiV[a\t\xB3\x81\x85a\x07\xABV[\x93Pa\t\xC3\x81\x85` \x86\x01a\ttV[\x80\x84\x01\x91PP\x92\x91PPV[`\0a\t\xDB\x82\x84a\t\x9EV[\x91P\x81\x90P\x92\x91PPV[`\0\x81Q\x90P\x91\x90PV[`\0`\x1F\x19`\x1F\x83\x01\x16\x90P\x91\x90PV[`\0a\n\r\x82a\t\xE6V[a\n\x17\x81\x85a\x07\xF1V[\x93Pa\n'\x81\x85` \x86\x01a\ttV[a\n0\x81a\t\xF1V[\x84\x01\x91PP\x92\x91PPV[`\0` \x82\x01\x90P\x81\x81\x03`\0\x83\x01Ra\nU\x81\x84a\n\x02V[\x90P\x92\x91PPV",
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
