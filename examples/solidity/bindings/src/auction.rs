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

interface Auction {
    event BidSubmitted(uint256 indexed auction_id, address indexed bidder, Time.Timestamp indexed deadline, uint256 value, bytes data);

    function submitBid(uint256 auction_id, Time.Timestamp deadline, uint256 value, bytes memory data) external;
}
```

...which was generated by the following JSON ABI:
```json
[
  {
    "type": "function",
    "name": "submitBid",
    "inputs": [
      {
        "name": "auction_id",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "deadline",
        "type": "uint64",
        "internalType": "Time.Timestamp"
      },
      {
        "name": "value",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "data",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "BidSubmitted",
    "inputs": [
      {
        "name": "auction_id",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "bidder",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "deadline",
        "type": "uint64",
        "indexed": true,
        "internalType": "Time.Timestamp"
      },
      {
        "name": "value",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "data",
        "type": "bytes",
        "indexed": false,
        "internalType": "bytes"
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
pub mod Auction {
    use super::*;
    use alloy::sol_types as alloy_sol_types;
    /// The creation / init bytecode of the contract.
    ///
    /// ```text
    ///0x6080604052348015600e575f5ffd5b506107bc8061001c5f395ff3fe608060405234801561000f575f5ffd5b5060043610610029575f3560e01c80634a19067e1461002d575b5f5ffd5b61004760048036038101906100429190610436565b610049565b005b610088846040518060400160405280601781526020017f41756374696f6e20646561646c696e65207061737365640000000000000000008152506100ed565b8367ffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16867ffa9544cad94ab8507946215078af54be3ed0a1f19911d5dab2037baf8e064fb08686866040516100de93929190610523565b60405180910390a45050505050565b61011a610114836100fc61011e565b67ffffffffffffffff1661024c90919063ffffffff16565b8261026c565b5050565b5f5f5f7fba286e4d89dabf4b2878e896423bb123d9d5143e662606fd343b6766d7bcf7215f1c73ffffffffffffffffffffffffffffffffffffffff1660405161016690610580565b5f60405180830381855afa9150503d805f811461019e576040519150601f19603f3d011682016040523d82523d5f602084013e6101a3565b606091505b5091509150816101e8576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016101df906105ee565b60405180910390fd5b602081511461022c576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161022390610656565b60405180910390fd5b5f81806020019051810190610241919061069e565b905080935050505090565b5f8167ffffffffffffffff168367ffffffffffffffff1610905092915050565b5f7f3dcdf63b41c103567d7225976ad9145e866c7a7dccc6c277ea86abbd268fbac95f1c73ffffffffffffffffffffffffffffffffffffffff16836040516020016102b791906106e3565b6040516020818303038152906040526040516102d39190610744565b5f60405180830381855afa9150503d805f811461030b576040519150601f19603f3d011682016040523d82523d5f602084013e610310565b606091505b50509050808290610357576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161034e919061079c565b60405180910390fd5b50505050565b5f5ffd5b5f5ffd5b5f819050919050565b61037781610365565b8114610381575f5ffd5b50565b5f813590506103928161036e565b92915050565b5f67ffffffffffffffff82169050919050565b6103b481610398565b81146103be575f5ffd5b50565b5f813590506103cf816103ab565b92915050565b5f5ffd5b5f5ffd5b5f5ffd5b5f5f83601f8401126103f6576103f56103d5565b5b8235905067ffffffffffffffff811115610413576104126103d9565b5b60208301915083600182028301111561042f5761042e6103dd565b5b9250929050565b5f5f5f5f5f6080868803121561044f5761044e61035d565b5b5f61045c88828901610384565b955050602061046d888289016103c1565b945050604061047e88828901610384565b935050606086013567ffffffffffffffff81111561049f5761049e610361565b5b6104ab888289016103e1565b92509250509295509295909350565b6104c381610365565b82525050565b5f82825260208201905092915050565b828183375f83830152505050565b5f601f19601f8301169050919050565b5f61050283856104c9565b935061050f8385846104d9565b610518836104e7565b840190509392505050565b5f6040820190506105365f8301866104ba565b81810360208301526105498184866104f7565b9050949350505050565b5f81905092915050565b50565b5f61056b5f83610553565b91506105768261055d565b5f82019050919050565b5f61058a82610560565b9150819050919050565b5f82825260208201905092915050565b7f507265636f6d70696c652063616c6c206661696c6564000000000000000000005f82015250565b5f6105d8601683610594565b91506105e3826105a4565b602082019050919050565b5f6020820190508181035f830152610605816105cc565b9050919050565b7f496e76616c6964206f7574707574206c656e67746800000000000000000000005f82015250565b5f610640601583610594565b915061064b8261060c565b602082019050919050565b5f6020820190508181035f83015261066d81610634565b9050919050565b61067d81610398565b8114610687575f5ffd5b50565b5f8151905061069881610674565b92915050565b5f602082840312156106b3576106b261035d565b5b5f6106c08482850161068a565b91505092915050565b5f8115159050919050565b6106dd816106c9565b82525050565b5f6020820190506106f65f8301846106d4565b92915050565b5f81519050919050565b8281835e5f83830152505050565b5f61071e826106fc565b6107288185610553565b9350610738818560208601610706565b80840191505092915050565b5f61074f8284610714565b915081905092915050565b5f81519050919050565b5f61076e8261075a565b6107788185610594565b9350610788818560208601610706565b610791816104e7565b840191505092915050565b5f6020820190508181035f8301526107b48184610764565b90509291505056
    /// ```
    #[rustfmt::skip]
    #[allow(clippy::all)]
    pub static BYTECODE: alloy_sol_types::private::Bytes = alloy_sol_types::private::Bytes::from_static(
        b"`\x80`@R4\x80\x15`\x0EW__\xFD[Pa\x07\xBC\x80a\0\x1C_9_\xF3\xFE`\x80`@R4\x80\x15a\0\x0FW__\xFD[P`\x046\x10a\0)W_5`\xE0\x1C\x80cJ\x19\x06~\x14a\0-W[__\xFD[a\0G`\x04\x806\x03\x81\x01\x90a\0B\x91\x90a\x046V[a\0IV[\0[a\0\x88\x84`@Q\x80`@\x01`@R\x80`\x17\x81R` \x01\x7FAuction deadline passed\0\0\0\0\0\0\0\0\0\x81RPa\0\xEDV[\x83g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x163s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x86\x7F\xFA\x95D\xCA\xD9J\xB8PyF!Px\xAFT\xBE>\xD0\xA1\xF1\x99\x11\xD5\xDA\xB2\x03{\xAF\x8E\x06O\xB0\x86\x86\x86`@Qa\0\xDE\x93\x92\x91\x90a\x05#V[`@Q\x80\x91\x03\x90\xA4PPPPPV[a\x01\x1Aa\x01\x14\x83a\0\xFCa\x01\x1EV[g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16a\x02L\x90\x91\x90c\xFF\xFF\xFF\xFF\x16V[\x82a\x02lV[PPV[___\x7F\xBA(nM\x89\xDA\xBFK(x\xE8\x96B;\xB1#\xD9\xD5\x14>f&\x06\xFD4;gf\xD7\xBC\xF7!_\x1Cs\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16`@Qa\x01f\x90a\x05\x80V[_`@Q\x80\x83\x03\x81\x85Z\xFA\x91PP=\x80_\x81\x14a\x01\x9EW`@Q\x91P`\x1F\x19`?=\x01\x16\x82\x01`@R=\x82R=_` \x84\x01>a\x01\xA3V[``\x91P[P\x91P\x91P\x81a\x01\xE8W`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x01\xDF\x90a\x05\xEEV[`@Q\x80\x91\x03\x90\xFD[` \x81Q\x14a\x02,W`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x02#\x90a\x06VV[`@Q\x80\x91\x03\x90\xFD[_\x81\x80` \x01\x90Q\x81\x01\x90a\x02A\x91\x90a\x06\x9EV[\x90P\x80\x93PPPP\x90V[_\x81g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x10\x90P\x92\x91PPV[_\x7F=\xCD\xF6;A\xC1\x03V}r%\x97j\xD9\x14^\x86lz}\xCC\xC6\xC2w\xEA\x86\xAB\xBD&\x8F\xBA\xC9_\x1Cs\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83`@Q` \x01a\x02\xB7\x91\x90a\x06\xE3V[`@Q` \x81\x83\x03\x03\x81R\x90`@R`@Qa\x02\xD3\x91\x90a\x07DV[_`@Q\x80\x83\x03\x81\x85Z\xFA\x91PP=\x80_\x81\x14a\x03\x0BW`@Q\x91P`\x1F\x19`?=\x01\x16\x82\x01`@R=\x82R=_` \x84\x01>a\x03\x10V[``\x91P[PP\x90P\x80\x82\x90a\x03WW`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x03N\x91\x90a\x07\x9CV[`@Q\x80\x91\x03\x90\xFD[PPPPV[__\xFD[__\xFD[_\x81\x90P\x91\x90PV[a\x03w\x81a\x03eV[\x81\x14a\x03\x81W__\xFD[PV[_\x815\x90Pa\x03\x92\x81a\x03nV[\x92\x91PPV[_g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x82\x16\x90P\x91\x90PV[a\x03\xB4\x81a\x03\x98V[\x81\x14a\x03\xBEW__\xFD[PV[_\x815\x90Pa\x03\xCF\x81a\x03\xABV[\x92\x91PPV[__\xFD[__\xFD[__\xFD[__\x83`\x1F\x84\x01\x12a\x03\xF6Wa\x03\xF5a\x03\xD5V[[\x825\x90Pg\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x81\x11\x15a\x04\x13Wa\x04\x12a\x03\xD9V[[` \x83\x01\x91P\x83`\x01\x82\x02\x83\x01\x11\x15a\x04/Wa\x04.a\x03\xDDV[[\x92P\x92\x90PV[_____`\x80\x86\x88\x03\x12\x15a\x04OWa\x04Na\x03]V[[_a\x04\\\x88\x82\x89\x01a\x03\x84V[\x95PP` a\x04m\x88\x82\x89\x01a\x03\xC1V[\x94PP`@a\x04~\x88\x82\x89\x01a\x03\x84V[\x93PP``\x86\x015g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x81\x11\x15a\x04\x9FWa\x04\x9Ea\x03aV[[a\x04\xAB\x88\x82\x89\x01a\x03\xE1V[\x92P\x92PP\x92\x95P\x92\x95\x90\x93PV[a\x04\xC3\x81a\x03eV[\x82RPPV[_\x82\x82R` \x82\x01\x90P\x92\x91PPV[\x82\x81\x837_\x83\x83\x01RPPPV[_`\x1F\x19`\x1F\x83\x01\x16\x90P\x91\x90PV[_a\x05\x02\x83\x85a\x04\xC9V[\x93Pa\x05\x0F\x83\x85\x84a\x04\xD9V[a\x05\x18\x83a\x04\xE7V[\x84\x01\x90P\x93\x92PPPV[_`@\x82\x01\x90Pa\x056_\x83\x01\x86a\x04\xBAV[\x81\x81\x03` \x83\x01Ra\x05I\x81\x84\x86a\x04\xF7V[\x90P\x94\x93PPPPV[_\x81\x90P\x92\x91PPV[PV[_a\x05k_\x83a\x05SV[\x91Pa\x05v\x82a\x05]V[_\x82\x01\x90P\x91\x90PV[_a\x05\x8A\x82a\x05`V[\x91P\x81\x90P\x91\x90PV[_\x82\x82R` \x82\x01\x90P\x92\x91PPV[\x7FPrecompile call failed\0\0\0\0\0\0\0\0\0\0_\x82\x01RPV[_a\x05\xD8`\x16\x83a\x05\x94V[\x91Pa\x05\xE3\x82a\x05\xA4V[` \x82\x01\x90P\x91\x90PV[_` \x82\x01\x90P\x81\x81\x03_\x83\x01Ra\x06\x05\x81a\x05\xCCV[\x90P\x91\x90PV[\x7FInvalid output length\0\0\0\0\0\0\0\0\0\0\0_\x82\x01RPV[_a\x06@`\x15\x83a\x05\x94V[\x91Pa\x06K\x82a\x06\x0CV[` \x82\x01\x90P\x91\x90PV[_` \x82\x01\x90P\x81\x81\x03_\x83\x01Ra\x06m\x81a\x064V[\x90P\x91\x90PV[a\x06}\x81a\x03\x98V[\x81\x14a\x06\x87W__\xFD[PV[_\x81Q\x90Pa\x06\x98\x81a\x06tV[\x92\x91PPV[_` \x82\x84\x03\x12\x15a\x06\xB3Wa\x06\xB2a\x03]V[[_a\x06\xC0\x84\x82\x85\x01a\x06\x8AV[\x91PP\x92\x91PPV[_\x81\x15\x15\x90P\x91\x90PV[a\x06\xDD\x81a\x06\xC9V[\x82RPPV[_` \x82\x01\x90Pa\x06\xF6_\x83\x01\x84a\x06\xD4V[\x92\x91PPV[_\x81Q\x90P\x91\x90PV[\x82\x81\x83^_\x83\x83\x01RPPPV[_a\x07\x1E\x82a\x06\xFCV[a\x07(\x81\x85a\x05SV[\x93Pa\x078\x81\x85` \x86\x01a\x07\x06V[\x80\x84\x01\x91PP\x92\x91PPV[_a\x07O\x82\x84a\x07\x14V[\x91P\x81\x90P\x92\x91PPV[_\x81Q\x90P\x91\x90PV[_a\x07n\x82a\x07ZV[a\x07x\x81\x85a\x05\x94V[\x93Pa\x07\x88\x81\x85` \x86\x01a\x07\x06V[a\x07\x91\x81a\x04\xE7V[\x84\x01\x91PP\x92\x91PPV[_` \x82\x01\x90P\x81\x81\x03_\x83\x01Ra\x07\xB4\x81\x84a\x07dV[\x90P\x92\x91PPV",
    );
    /// The runtime bytecode of the contract, as deployed on the network.
    ///
    /// ```text
    ///0x608060405234801561000f575f5ffd5b5060043610610029575f3560e01c80634a19067e1461002d575b5f5ffd5b61004760048036038101906100429190610436565b610049565b005b610088846040518060400160405280601781526020017f41756374696f6e20646561646c696e65207061737365640000000000000000008152506100ed565b8367ffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16867ffa9544cad94ab8507946215078af54be3ed0a1f19911d5dab2037baf8e064fb08686866040516100de93929190610523565b60405180910390a45050505050565b61011a610114836100fc61011e565b67ffffffffffffffff1661024c90919063ffffffff16565b8261026c565b5050565b5f5f5f7fba286e4d89dabf4b2878e896423bb123d9d5143e662606fd343b6766d7bcf7215f1c73ffffffffffffffffffffffffffffffffffffffff1660405161016690610580565b5f60405180830381855afa9150503d805f811461019e576040519150601f19603f3d011682016040523d82523d5f602084013e6101a3565b606091505b5091509150816101e8576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016101df906105ee565b60405180910390fd5b602081511461022c576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161022390610656565b60405180910390fd5b5f81806020019051810190610241919061069e565b905080935050505090565b5f8167ffffffffffffffff168367ffffffffffffffff1610905092915050565b5f7f3dcdf63b41c103567d7225976ad9145e866c7a7dccc6c277ea86abbd268fbac95f1c73ffffffffffffffffffffffffffffffffffffffff16836040516020016102b791906106e3565b6040516020818303038152906040526040516102d39190610744565b5f60405180830381855afa9150503d805f811461030b576040519150601f19603f3d011682016040523d82523d5f602084013e610310565b606091505b50509050808290610357576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161034e919061079c565b60405180910390fd5b50505050565b5f5ffd5b5f5ffd5b5f819050919050565b61037781610365565b8114610381575f5ffd5b50565b5f813590506103928161036e565b92915050565b5f67ffffffffffffffff82169050919050565b6103b481610398565b81146103be575f5ffd5b50565b5f813590506103cf816103ab565b92915050565b5f5ffd5b5f5ffd5b5f5ffd5b5f5f83601f8401126103f6576103f56103d5565b5b8235905067ffffffffffffffff811115610413576104126103d9565b5b60208301915083600182028301111561042f5761042e6103dd565b5b9250929050565b5f5f5f5f5f6080868803121561044f5761044e61035d565b5b5f61045c88828901610384565b955050602061046d888289016103c1565b945050604061047e88828901610384565b935050606086013567ffffffffffffffff81111561049f5761049e610361565b5b6104ab888289016103e1565b92509250509295509295909350565b6104c381610365565b82525050565b5f82825260208201905092915050565b828183375f83830152505050565b5f601f19601f8301169050919050565b5f61050283856104c9565b935061050f8385846104d9565b610518836104e7565b840190509392505050565b5f6040820190506105365f8301866104ba565b81810360208301526105498184866104f7565b9050949350505050565b5f81905092915050565b50565b5f61056b5f83610553565b91506105768261055d565b5f82019050919050565b5f61058a82610560565b9150819050919050565b5f82825260208201905092915050565b7f507265636f6d70696c652063616c6c206661696c6564000000000000000000005f82015250565b5f6105d8601683610594565b91506105e3826105a4565b602082019050919050565b5f6020820190508181035f830152610605816105cc565b9050919050565b7f496e76616c6964206f7574707574206c656e67746800000000000000000000005f82015250565b5f610640601583610594565b915061064b8261060c565b602082019050919050565b5f6020820190508181035f83015261066d81610634565b9050919050565b61067d81610398565b8114610687575f5ffd5b50565b5f8151905061069881610674565b92915050565b5f602082840312156106b3576106b261035d565b5b5f6106c08482850161068a565b91505092915050565b5f8115159050919050565b6106dd816106c9565b82525050565b5f6020820190506106f65f8301846106d4565b92915050565b5f81519050919050565b8281835e5f83830152505050565b5f61071e826106fc565b6107288185610553565b9350610738818560208601610706565b80840191505092915050565b5f61074f8284610714565b915081905092915050565b5f81519050919050565b5f61076e8261075a565b6107788185610594565b9350610788818560208601610706565b610791816104e7565b840191505092915050565b5f6020820190508181035f8301526107b48184610764565b90509291505056
    /// ```
    #[rustfmt::skip]
    #[allow(clippy::all)]
    pub static DEPLOYED_BYTECODE: alloy_sol_types::private::Bytes = alloy_sol_types::private::Bytes::from_static(
        b"`\x80`@R4\x80\x15a\0\x0FW__\xFD[P`\x046\x10a\0)W_5`\xE0\x1C\x80cJ\x19\x06~\x14a\0-W[__\xFD[a\0G`\x04\x806\x03\x81\x01\x90a\0B\x91\x90a\x046V[a\0IV[\0[a\0\x88\x84`@Q\x80`@\x01`@R\x80`\x17\x81R` \x01\x7FAuction deadline passed\0\0\0\0\0\0\0\0\0\x81RPa\0\xEDV[\x83g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x163s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x86\x7F\xFA\x95D\xCA\xD9J\xB8PyF!Px\xAFT\xBE>\xD0\xA1\xF1\x99\x11\xD5\xDA\xB2\x03{\xAF\x8E\x06O\xB0\x86\x86\x86`@Qa\0\xDE\x93\x92\x91\x90a\x05#V[`@Q\x80\x91\x03\x90\xA4PPPPPV[a\x01\x1Aa\x01\x14\x83a\0\xFCa\x01\x1EV[g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16a\x02L\x90\x91\x90c\xFF\xFF\xFF\xFF\x16V[\x82a\x02lV[PPV[___\x7F\xBA(nM\x89\xDA\xBFK(x\xE8\x96B;\xB1#\xD9\xD5\x14>f&\x06\xFD4;gf\xD7\xBC\xF7!_\x1Cs\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16`@Qa\x01f\x90a\x05\x80V[_`@Q\x80\x83\x03\x81\x85Z\xFA\x91PP=\x80_\x81\x14a\x01\x9EW`@Q\x91P`\x1F\x19`?=\x01\x16\x82\x01`@R=\x82R=_` \x84\x01>a\x01\xA3V[``\x91P[P\x91P\x91P\x81a\x01\xE8W`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x01\xDF\x90a\x05\xEEV[`@Q\x80\x91\x03\x90\xFD[` \x81Q\x14a\x02,W`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x02#\x90a\x06VV[`@Q\x80\x91\x03\x90\xFD[_\x81\x80` \x01\x90Q\x81\x01\x90a\x02A\x91\x90a\x06\x9EV[\x90P\x80\x93PPPP\x90V[_\x81g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x10\x90P\x92\x91PPV[_\x7F=\xCD\xF6;A\xC1\x03V}r%\x97j\xD9\x14^\x86lz}\xCC\xC6\xC2w\xEA\x86\xAB\xBD&\x8F\xBA\xC9_\x1Cs\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83`@Q` \x01a\x02\xB7\x91\x90a\x06\xE3V[`@Q` \x81\x83\x03\x03\x81R\x90`@R`@Qa\x02\xD3\x91\x90a\x07DV[_`@Q\x80\x83\x03\x81\x85Z\xFA\x91PP=\x80_\x81\x14a\x03\x0BW`@Q\x91P`\x1F\x19`?=\x01\x16\x82\x01`@R=\x82R=_` \x84\x01>a\x03\x10V[``\x91P[PP\x90P\x80\x82\x90a\x03WW`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x03N\x91\x90a\x07\x9CV[`@Q\x80\x91\x03\x90\xFD[PPPPV[__\xFD[__\xFD[_\x81\x90P\x91\x90PV[a\x03w\x81a\x03eV[\x81\x14a\x03\x81W__\xFD[PV[_\x815\x90Pa\x03\x92\x81a\x03nV[\x92\x91PPV[_g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x82\x16\x90P\x91\x90PV[a\x03\xB4\x81a\x03\x98V[\x81\x14a\x03\xBEW__\xFD[PV[_\x815\x90Pa\x03\xCF\x81a\x03\xABV[\x92\x91PPV[__\xFD[__\xFD[__\xFD[__\x83`\x1F\x84\x01\x12a\x03\xF6Wa\x03\xF5a\x03\xD5V[[\x825\x90Pg\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x81\x11\x15a\x04\x13Wa\x04\x12a\x03\xD9V[[` \x83\x01\x91P\x83`\x01\x82\x02\x83\x01\x11\x15a\x04/Wa\x04.a\x03\xDDV[[\x92P\x92\x90PV[_____`\x80\x86\x88\x03\x12\x15a\x04OWa\x04Na\x03]V[[_a\x04\\\x88\x82\x89\x01a\x03\x84V[\x95PP` a\x04m\x88\x82\x89\x01a\x03\xC1V[\x94PP`@a\x04~\x88\x82\x89\x01a\x03\x84V[\x93PP``\x86\x015g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x81\x11\x15a\x04\x9FWa\x04\x9Ea\x03aV[[a\x04\xAB\x88\x82\x89\x01a\x03\xE1V[\x92P\x92PP\x92\x95P\x92\x95\x90\x93PV[a\x04\xC3\x81a\x03eV[\x82RPPV[_\x82\x82R` \x82\x01\x90P\x92\x91PPV[\x82\x81\x837_\x83\x83\x01RPPPV[_`\x1F\x19`\x1F\x83\x01\x16\x90P\x91\x90PV[_a\x05\x02\x83\x85a\x04\xC9V[\x93Pa\x05\x0F\x83\x85\x84a\x04\xD9V[a\x05\x18\x83a\x04\xE7V[\x84\x01\x90P\x93\x92PPPV[_`@\x82\x01\x90Pa\x056_\x83\x01\x86a\x04\xBAV[\x81\x81\x03` \x83\x01Ra\x05I\x81\x84\x86a\x04\xF7V[\x90P\x94\x93PPPPV[_\x81\x90P\x92\x91PPV[PV[_a\x05k_\x83a\x05SV[\x91Pa\x05v\x82a\x05]V[_\x82\x01\x90P\x91\x90PV[_a\x05\x8A\x82a\x05`V[\x91P\x81\x90P\x91\x90PV[_\x82\x82R` \x82\x01\x90P\x92\x91PPV[\x7FPrecompile call failed\0\0\0\0\0\0\0\0\0\0_\x82\x01RPV[_a\x05\xD8`\x16\x83a\x05\x94V[\x91Pa\x05\xE3\x82a\x05\xA4V[` \x82\x01\x90P\x91\x90PV[_` \x82\x01\x90P\x81\x81\x03_\x83\x01Ra\x06\x05\x81a\x05\xCCV[\x90P\x91\x90PV[\x7FInvalid output length\0\0\0\0\0\0\0\0\0\0\0_\x82\x01RPV[_a\x06@`\x15\x83a\x05\x94V[\x91Pa\x06K\x82a\x06\x0CV[` \x82\x01\x90P\x91\x90PV[_` \x82\x01\x90P\x81\x81\x03_\x83\x01Ra\x06m\x81a\x064V[\x90P\x91\x90PV[a\x06}\x81a\x03\x98V[\x81\x14a\x06\x87W__\xFD[PV[_\x81Q\x90Pa\x06\x98\x81a\x06tV[\x92\x91PPV[_` \x82\x84\x03\x12\x15a\x06\xB3Wa\x06\xB2a\x03]V[[_a\x06\xC0\x84\x82\x85\x01a\x06\x8AV[\x91PP\x92\x91PPV[_\x81\x15\x15\x90P\x91\x90PV[a\x06\xDD\x81a\x06\xC9V[\x82RPPV[_` \x82\x01\x90Pa\x06\xF6_\x83\x01\x84a\x06\xD4V[\x92\x91PPV[_\x81Q\x90P\x91\x90PV[\x82\x81\x83^_\x83\x83\x01RPPPV[_a\x07\x1E\x82a\x06\xFCV[a\x07(\x81\x85a\x05SV[\x93Pa\x078\x81\x85` \x86\x01a\x07\x06V[\x80\x84\x01\x91PP\x92\x91PPV[_a\x07O\x82\x84a\x07\x14V[\x91P\x81\x90P\x92\x91PPV[_\x81Q\x90P\x91\x90PV[_a\x07n\x82a\x07ZV[a\x07x\x81\x85a\x05\x94V[\x93Pa\x07\x88\x81\x85` \x86\x01a\x07\x06V[a\x07\x91\x81a\x04\xE7V[\x84\x01\x91PP\x92\x91PPV[_` \x82\x01\x90P\x81\x81\x03_\x83\x01Ra\x07\xB4\x81\x84a\x07dV[\x90P\x92\x91PPV",
    );
    #[derive(serde::Serialize, serde::Deserialize)]
    #[derive(Default, Debug, PartialEq, Eq, Hash)]
    /**Event with signature `BidSubmitted(uint256,address,uint64,uint256,bytes)` and selector `0xfa9544cad94ab8507946215078af54be3ed0a1f19911d5dab2037baf8e064fb0`.
```solidity
event BidSubmitted(uint256 indexed auction_id, address indexed bidder, Time.Timestamp indexed deadline, uint256 value, bytes data);
```*/
    #[allow(
        non_camel_case_types,
        non_snake_case,
        clippy::pub_underscore_fields,
        clippy::style
    )]
    #[derive(Clone)]
    pub struct BidSubmitted {
        #[allow(missing_docs)]
        pub auction_id: alloy::sol_types::private::primitives::aliases::U256,
        #[allow(missing_docs)]
        pub bidder: alloy::sol_types::private::Address,
        #[allow(missing_docs)]
        pub deadline: <Time::Timestamp as alloy::sol_types::SolType>::RustType,
        #[allow(missing_docs)]
        pub value: alloy::sol_types::private::primitives::aliases::U256,
        #[allow(missing_docs)]
        pub data: alloy::sol_types::private::Bytes,
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
        impl alloy_sol_types::SolEvent for BidSubmitted {
            type DataTuple<'a> = (
                alloy::sol_types::sol_data::Uint<256>,
                alloy::sol_types::sol_data::Bytes,
            );
            type DataToken<'a> = <Self::DataTuple<
                'a,
            > as alloy_sol_types::SolType>::Token<'a>;
            type TopicList = (
                alloy_sol_types::sol_data::FixedBytes<32>,
                alloy::sol_types::sol_data::Uint<256>,
                alloy::sol_types::sol_data::Address,
                Time::Timestamp,
            );
            const SIGNATURE: &'static str = "BidSubmitted(uint256,address,uint64,uint256,bytes)";
            const SIGNATURE_HASH: alloy_sol_types::private::B256 = alloy_sol_types::private::B256::new([
                250u8, 149u8, 68u8, 202u8, 217u8, 74u8, 184u8, 80u8, 121u8, 70u8, 33u8,
                80u8, 120u8, 175u8, 84u8, 190u8, 62u8, 208u8, 161u8, 241u8, 153u8, 17u8,
                213u8, 218u8, 178u8, 3u8, 123u8, 175u8, 142u8, 6u8, 79u8, 176u8,
            ]);
            const ANONYMOUS: bool = false;
            #[allow(unused_variables)]
            #[inline]
            fn new(
                topics: <Self::TopicList as alloy_sol_types::SolType>::RustType,
                data: <Self::DataTuple<'_> as alloy_sol_types::SolType>::RustType,
            ) -> Self {
                Self {
                    auction_id: topics.1,
                    bidder: topics.2,
                    deadline: topics.3,
                    value: data.0,
                    data: data.1,
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
                    <alloy::sol_types::sol_data::Uint<
                        256,
                    > as alloy_sol_types::SolType>::tokenize(&self.value),
                    <alloy::sol_types::sol_data::Bytes as alloy_sol_types::SolType>::tokenize(
                        &self.data,
                    ),
                )
            }
            #[inline]
            fn topics(&self) -> <Self::TopicList as alloy_sol_types::SolType>::RustType {
                (
                    Self::SIGNATURE_HASH.into(),
                    self.auction_id.clone(),
                    self.bidder.clone(),
                    self.deadline.clone(),
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
                out[1usize] = <alloy::sol_types::sol_data::Uint<
                    256,
                > as alloy_sol_types::EventTopic>::encode_topic(&self.auction_id);
                out[2usize] = <alloy::sol_types::sol_data::Address as alloy_sol_types::EventTopic>::encode_topic(
                    &self.bidder,
                );
                out[3usize] = <Time::Timestamp as alloy_sol_types::EventTopic>::encode_topic(
                    &self.deadline,
                );
                Ok(())
            }
        }
        #[automatically_derived]
        impl alloy_sol_types::private::IntoLogData for BidSubmitted {
            fn to_log_data(&self) -> alloy_sol_types::private::LogData {
                From::from(self)
            }
            fn into_log_data(self) -> alloy_sol_types::private::LogData {
                From::from(&self)
            }
        }
        #[automatically_derived]
        impl From<&BidSubmitted> for alloy_sol_types::private::LogData {
            #[inline]
            fn from(this: &BidSubmitted) -> alloy_sol_types::private::LogData {
                alloy_sol_types::SolEvent::encode_log_data(this)
            }
        }
    };
    #[derive(serde::Serialize, serde::Deserialize)]
    #[derive(Default, Debug, PartialEq, Eq, Hash)]
    /**Function with signature `submitBid(uint256,uint64,uint256,bytes)` and selector `0x4a19067e`.
```solidity
function submitBid(uint256 auction_id, Time.Timestamp deadline, uint256 value, bytes memory data) external;
```*/
    #[allow(non_camel_case_types, non_snake_case, clippy::pub_underscore_fields)]
    #[derive(Clone)]
    pub struct submitBidCall {
        #[allow(missing_docs)]
        pub auction_id: alloy::sol_types::private::primitives::aliases::U256,
        #[allow(missing_docs)]
        pub deadline: <Time::Timestamp as alloy::sol_types::SolType>::RustType,
        #[allow(missing_docs)]
        pub value: alloy::sol_types::private::primitives::aliases::U256,
        #[allow(missing_docs)]
        pub data: alloy::sol_types::private::Bytes,
    }
    ///Container type for the return parameters of the [`submitBid(uint256,uint64,uint256,bytes)`](submitBidCall) function.
    #[allow(non_camel_case_types, non_snake_case, clippy::pub_underscore_fields)]
    #[derive(Clone)]
    pub struct submitBidReturn {}
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
                alloy::sol_types::sol_data::Uint<256>,
                Time::Timestamp,
                alloy::sol_types::sol_data::Uint<256>,
                alloy::sol_types::sol_data::Bytes,
            );
            #[doc(hidden)]
            type UnderlyingRustTuple<'a> = (
                alloy::sol_types::private::primitives::aliases::U256,
                <Time::Timestamp as alloy::sol_types::SolType>::RustType,
                alloy::sol_types::private::primitives::aliases::U256,
                alloy::sol_types::private::Bytes,
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
            impl ::core::convert::From<submitBidCall> for UnderlyingRustTuple<'_> {
                fn from(value: submitBidCall) -> Self {
                    (value.auction_id, value.deadline, value.value, value.data)
                }
            }
            #[automatically_derived]
            #[doc(hidden)]
            impl ::core::convert::From<UnderlyingRustTuple<'_>> for submitBidCall {
                fn from(tuple: UnderlyingRustTuple<'_>) -> Self {
                    Self {
                        auction_id: tuple.0,
                        deadline: tuple.1,
                        value: tuple.2,
                        data: tuple.3,
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
            impl ::core::convert::From<submitBidReturn> for UnderlyingRustTuple<'_> {
                fn from(value: submitBidReturn) -> Self {
                    ()
                }
            }
            #[automatically_derived]
            #[doc(hidden)]
            impl ::core::convert::From<UnderlyingRustTuple<'_>> for submitBidReturn {
                fn from(tuple: UnderlyingRustTuple<'_>) -> Self {
                    Self {}
                }
            }
        }
        impl submitBidReturn {
            fn _tokenize(
                &self,
            ) -> <submitBidCall as alloy_sol_types::SolCall>::ReturnToken<'_> {
                ()
            }
        }
        #[automatically_derived]
        impl alloy_sol_types::SolCall for submitBidCall {
            type Parameters<'a> = (
                alloy::sol_types::sol_data::Uint<256>,
                Time::Timestamp,
                alloy::sol_types::sol_data::Uint<256>,
                alloy::sol_types::sol_data::Bytes,
            );
            type Token<'a> = <Self::Parameters<
                'a,
            > as alloy_sol_types::SolType>::Token<'a>;
            type Return = submitBidReturn;
            type ReturnTuple<'a> = ();
            type ReturnToken<'a> = <Self::ReturnTuple<
                'a,
            > as alloy_sol_types::SolType>::Token<'a>;
            const SIGNATURE: &'static str = "submitBid(uint256,uint64,uint256,bytes)";
            const SELECTOR: [u8; 4] = [74u8, 25u8, 6u8, 126u8];
            #[inline]
            fn new<'a>(
                tuple: <Self::Parameters<'a> as alloy_sol_types::SolType>::RustType,
            ) -> Self {
                tuple.into()
            }
            #[inline]
            fn tokenize(&self) -> Self::Token<'_> {
                (
                    <alloy::sol_types::sol_data::Uint<
                        256,
                    > as alloy_sol_types::SolType>::tokenize(&self.auction_id),
                    <Time::Timestamp as alloy_sol_types::SolType>::tokenize(
                        &self.deadline,
                    ),
                    <alloy::sol_types::sol_data::Uint<
                        256,
                    > as alloy_sol_types::SolType>::tokenize(&self.value),
                    <alloy::sol_types::sol_data::Bytes as alloy_sol_types::SolType>::tokenize(
                        &self.data,
                    ),
                )
            }
            #[inline]
            fn tokenize_returns(ret: &Self::Return) -> Self::ReturnToken<'_> {
                submitBidReturn::_tokenize(ret)
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
    ///Container for all the [`Auction`](self) function calls.
    #[derive(serde::Serialize, serde::Deserialize)]
    #[derive()]
    pub enum AuctionCalls {
        #[allow(missing_docs)]
        submitBid(submitBidCall),
    }
    #[automatically_derived]
    impl AuctionCalls {
        /// All the selectors of this enum.
        ///
        /// Note that the selectors might not be in the same order as the variants.
        /// No guarantees are made about the order of the selectors.
        ///
        /// Prefer using `SolInterface` methods instead.
        pub const SELECTORS: &'static [[u8; 4usize]] = &[[74u8, 25u8, 6u8, 126u8]];
    }
    #[automatically_derived]
    impl alloy_sol_types::SolInterface for AuctionCalls {
        const NAME: &'static str = "AuctionCalls";
        const MIN_DATA_LENGTH: usize = 160usize;
        const COUNT: usize = 1usize;
        #[inline]
        fn selector(&self) -> [u8; 4] {
            match self {
                Self::submitBid(_) => {
                    <submitBidCall as alloy_sol_types::SolCall>::SELECTOR
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
            static DECODE_SHIMS: &[fn(&[u8]) -> alloy_sol_types::Result<AuctionCalls>] = &[
                {
                    fn submitBid(data: &[u8]) -> alloy_sol_types::Result<AuctionCalls> {
                        <submitBidCall as alloy_sol_types::SolCall>::abi_decode_raw(data)
                            .map(AuctionCalls::submitBid)
                    }
                    submitBid
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
            ) -> alloy_sol_types::Result<AuctionCalls>] = &[
                {
                    fn submitBid(data: &[u8]) -> alloy_sol_types::Result<AuctionCalls> {
                        <submitBidCall as alloy_sol_types::SolCall>::abi_decode_raw_validate(
                                data,
                            )
                            .map(AuctionCalls::submitBid)
                    }
                    submitBid
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
                Self::submitBid(inner) => {
                    <submitBidCall as alloy_sol_types::SolCall>::abi_encoded_size(inner)
                }
            }
        }
        #[inline]
        fn abi_encode_raw(&self, out: &mut alloy_sol_types::private::Vec<u8>) {
            match self {
                Self::submitBid(inner) => {
                    <submitBidCall as alloy_sol_types::SolCall>::abi_encode_raw(
                        inner,
                        out,
                    )
                }
            }
        }
    }
    ///Container for all the [`Auction`](self) events.
    #[derive(serde::Serialize, serde::Deserialize)]
    #[derive(Debug, PartialEq, Eq, Hash)]
    pub enum AuctionEvents {
        #[allow(missing_docs)]
        BidSubmitted(BidSubmitted),
    }
    #[automatically_derived]
    impl AuctionEvents {
        /// All the selectors of this enum.
        ///
        /// Note that the selectors might not be in the same order as the variants.
        /// No guarantees are made about the order of the selectors.
        ///
        /// Prefer using `SolInterface` methods instead.
        pub const SELECTORS: &'static [[u8; 32usize]] = &[
            [
                250u8, 149u8, 68u8, 202u8, 217u8, 74u8, 184u8, 80u8, 121u8, 70u8, 33u8,
                80u8, 120u8, 175u8, 84u8, 190u8, 62u8, 208u8, 161u8, 241u8, 153u8, 17u8,
                213u8, 218u8, 178u8, 3u8, 123u8, 175u8, 142u8, 6u8, 79u8, 176u8,
            ],
        ];
    }
    #[automatically_derived]
    impl alloy_sol_types::SolEventInterface for AuctionEvents {
        const NAME: &'static str = "AuctionEvents";
        const COUNT: usize = 1usize;
        fn decode_raw_log(
            topics: &[alloy_sol_types::Word],
            data: &[u8],
        ) -> alloy_sol_types::Result<Self> {
            match topics.first().copied() {
                Some(<BidSubmitted as alloy_sol_types::SolEvent>::SIGNATURE_HASH) => {
                    <BidSubmitted as alloy_sol_types::SolEvent>::decode_raw_log(
                            topics,
                            data,
                        )
                        .map(Self::BidSubmitted)
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
    impl alloy_sol_types::private::IntoLogData for AuctionEvents {
        fn to_log_data(&self) -> alloy_sol_types::private::LogData {
            match self {
                Self::BidSubmitted(inner) => {
                    alloy_sol_types::private::IntoLogData::to_log_data(inner)
                }
            }
        }
        fn into_log_data(self) -> alloy_sol_types::private::LogData {
            match self {
                Self::BidSubmitted(inner) => {
                    alloy_sol_types::private::IntoLogData::into_log_data(inner)
                }
            }
        }
    }
    use alloy::contract as alloy_contract;
    /**Creates a new wrapper around an on-chain [`Auction`](self) contract instance.

See the [wrapper's documentation](`AuctionInstance`) for more details.*/
    #[inline]
    pub const fn new<
        P: alloy_contract::private::Provider<N>,
        N: alloy_contract::private::Network,
    >(address: alloy_sol_types::private::Address, provider: P) -> AuctionInstance<P, N> {
        AuctionInstance::<P, N>::new(address, provider)
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
        Output = alloy_contract::Result<AuctionInstance<P, N>>,
    > {
        AuctionInstance::<P, N>::deploy(provider)
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
        AuctionInstance::<P, N>::deploy_builder(provider)
    }
    /**A [`Auction`](self) instance.

Contains type-safe methods for interacting with an on-chain instance of the
[`Auction`](self) contract located at a given `address`, using a given
provider `P`.

If the contract bytecode is available (see the [`sol!`](alloy_sol_types::sol!)
documentation on how to provide it), the `deploy` and `deploy_builder` methods can
be used to deploy a new instance of the contract.

See the [module-level documentation](self) for all the available methods.*/
    #[derive(Clone)]
    pub struct AuctionInstance<P, N = alloy_contract::private::Ethereum> {
        address: alloy_sol_types::private::Address,
        provider: P,
        _network: ::core::marker::PhantomData<N>,
    }
    #[automatically_derived]
    impl<P, N> ::core::fmt::Debug for AuctionInstance<P, N> {
        #[inline]
        fn fmt(&self, f: &mut ::core::fmt::Formatter<'_>) -> ::core::fmt::Result {
            f.debug_tuple("AuctionInstance").field(&self.address).finish()
        }
    }
    /// Instantiation and getters/setters.
    #[automatically_derived]
    impl<
        P: alloy_contract::private::Provider<N>,
        N: alloy_contract::private::Network,
    > AuctionInstance<P, N> {
        /**Creates a new wrapper around an on-chain [`Auction`](self) contract instance.

See the [wrapper's documentation](`AuctionInstance`) for more details.*/
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
        ) -> alloy_contract::Result<AuctionInstance<P, N>> {
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
    impl<P: ::core::clone::Clone, N> AuctionInstance<&P, N> {
        /// Clones the provider and returns a new instance with the cloned provider.
        #[inline]
        pub fn with_cloned_provider(self) -> AuctionInstance<P, N> {
            AuctionInstance {
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
    > AuctionInstance<P, N> {
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
        ///Creates a new call builder for the [`submitBid`] function.
        pub fn submitBid(
            &self,
            auction_id: alloy::sol_types::private::primitives::aliases::U256,
            deadline: <Time::Timestamp as alloy::sol_types::SolType>::RustType,
            value: alloy::sol_types::private::primitives::aliases::U256,
            data: alloy::sol_types::private::Bytes,
        ) -> alloy_contract::SolCallBuilder<&P, submitBidCall, N> {
            self.call_builder(
                &submitBidCall {
                    auction_id,
                    deadline,
                    value,
                    data,
                },
            )
        }
    }
    /// Event filters.
    #[automatically_derived]
    impl<
        P: alloy_contract::private::Provider<N>,
        N: alloy_contract::private::Network,
    > AuctionInstance<P, N> {
        /// Creates a new event filter using this contract instance's provider and address.
        ///
        /// Note that the type can be any event, not just those defined in this contract.
        /// Prefer using the other methods for building type-safe event filters.
        pub fn event_filter<E: alloy_sol_types::SolEvent>(
            &self,
        ) -> alloy_contract::Event<&P, E, N> {
            alloy_contract::Event::new_sol(&self.provider, &self.address)
        }
        ///Creates a new event filter for the [`BidSubmitted`] event.
        pub fn BidSubmitted_filter(&self) -> alloy_contract::Event<&P, BidSubmitted, N> {
            self.event_filter::<BidSubmitted>()
        }
    }
}
