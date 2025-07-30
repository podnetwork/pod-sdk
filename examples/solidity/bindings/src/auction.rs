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
    ///0x6080604052348015600f57600080fd5b5061081a8061001f6000396000f3fe608060405234801561001057600080fd5b506004361061002b5760003560e01c80634a19067e14610030575b600080fd5b61004a60048036038101906100459190610452565b61004c565b005b61008b846040518060400160405280601781526020017f41756374696f6e20646561646c696e65207061737365640000000000000000008152506100f0565b8367ffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16867ffa9544cad94ab8507946215078af54be3ed0a1f19911d5dab2037baf8e064fb08686866040516100e193929190610547565b60405180910390a45050505050565b61011d610117836100ff610121565b67ffffffffffffffff1661025690919063ffffffff16565b82610277565b5050565b60008060007fba286e4d89dabf4b2878e896423bb123d9d5143e662606fd343b6766d7bcf72160001c73ffffffffffffffffffffffffffffffffffffffff1660405161016c906105aa565b600060405180830381855afa9150503d80600081146101a7576040519150601f19603f3d011682016040523d82523d6000602084013e6101ac565b606091505b5091509150816101f1576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016101e89061061c565b60405180910390fd5b6020815114610235576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161022c90610688565b60405180910390fd5b60008180602001905181019061024b91906106d4565b905080935050505090565b60008167ffffffffffffffff168367ffffffffffffffff1610905092915050565b60007f3dcdf63b41c103567d7225976ad9145e866c7a7dccc6c277ea86abbd268fbac960001c73ffffffffffffffffffffffffffffffffffffffff16836040516020016102c4919061071c565b6040516020818303038152906040526040516102e0919061079d565b600060405180830381855afa9150503d806000811461031b576040519150601f19603f3d011682016040523d82523d6000602084013e610320565b606091505b50509050808290610367576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161035e91906107f8565b60405180910390fd5b50505050565b600080fd5b600080fd5b6000819050919050565b61038a81610377565b811461039557600080fd5b50565b6000813590506103a781610381565b92915050565b600067ffffffffffffffff82169050919050565b6103ca816103ad565b81146103d557600080fd5b50565b6000813590506103e7816103c1565b92915050565b600080fd5b600080fd5b600080fd5b60008083601f840112610412576104116103ed565b5b8235905067ffffffffffffffff81111561042f5761042e6103f2565b5b60208301915083600182028301111561044b5761044a6103f7565b5b9250929050565b60008060008060006080868803121561046e5761046d61036d565b5b600061047c88828901610398565b955050602061048d888289016103d8565b945050604061049e88828901610398565b935050606086013567ffffffffffffffff8111156104bf576104be610372565b5b6104cb888289016103fc565b92509250509295509295909350565b6104e381610377565b82525050565b600082825260208201905092915050565b82818337600083830152505050565b6000601f19601f8301169050919050565b600061052683856104e9565b93506105338385846104fa565b61053c83610509565b840190509392505050565b600060408201905061055c60008301866104da565b818103602083015261056f81848661051a565b9050949350505050565b600081905092915050565b50565b6000610594600083610579565b915061059f82610584565b600082019050919050565b60006105b582610587565b9150819050919050565b600082825260208201905092915050565b7f507265636f6d70696c652063616c6c206661696c656400000000000000000000600082015250565b60006106066016836105bf565b9150610611826105d0565b602082019050919050565b60006020820190508181036000830152610635816105f9565b9050919050565b7f496e76616c6964206f7574707574206c656e6774680000000000000000000000600082015250565b60006106726015836105bf565b915061067d8261063c565b602082019050919050565b600060208201905081810360008301526106a181610665565b9050919050565b6106b1816103ad565b81146106bc57600080fd5b50565b6000815190506106ce816106a8565b92915050565b6000602082840312156106ea576106e961036d565b5b60006106f8848285016106bf565b91505092915050565b60008115159050919050565b61071681610701565b82525050565b6000602082019050610731600083018461070d565b92915050565b600081519050919050565b60005b83811015610760578082015181840152602081019050610745565b60008484015250505050565b600061077782610737565b6107818185610579565b9350610791818560208601610742565b80840191505092915050565b60006107a9828461076c565b915081905092915050565b600081519050919050565b60006107ca826107b4565b6107d481856105bf565b93506107e4818560208601610742565b6107ed81610509565b840191505092915050565b6000602082019050818103600083015261081281846107bf565b90509291505056
    /// ```
    #[rustfmt::skip]
    #[allow(clippy::all)]
    pub static BYTECODE: alloy_sol_types::private::Bytes = alloy_sol_types::private::Bytes::from_static(
        b"`\x80`@R4\x80\x15`\x0FW`\0\x80\xFD[Pa\x08\x1A\x80a\0\x1F`\09`\0\xF3\xFE`\x80`@R4\x80\x15a\0\x10W`\0\x80\xFD[P`\x046\x10a\0+W`\x005`\xE0\x1C\x80cJ\x19\x06~\x14a\x000W[`\0\x80\xFD[a\0J`\x04\x806\x03\x81\x01\x90a\0E\x91\x90a\x04RV[a\0LV[\0[a\0\x8B\x84`@Q\x80`@\x01`@R\x80`\x17\x81R` \x01\x7FAuction deadline passed\0\0\0\0\0\0\0\0\0\x81RPa\0\xF0V[\x83g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x163s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x86\x7F\xFA\x95D\xCA\xD9J\xB8PyF!Px\xAFT\xBE>\xD0\xA1\xF1\x99\x11\xD5\xDA\xB2\x03{\xAF\x8E\x06O\xB0\x86\x86\x86`@Qa\0\xE1\x93\x92\x91\x90a\x05GV[`@Q\x80\x91\x03\x90\xA4PPPPPV[a\x01\x1Da\x01\x17\x83a\0\xFFa\x01!V[g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16a\x02V\x90\x91\x90c\xFF\xFF\xFF\xFF\x16V[\x82a\x02wV[PPV[`\0\x80`\0\x7F\xBA(nM\x89\xDA\xBFK(x\xE8\x96B;\xB1#\xD9\xD5\x14>f&\x06\xFD4;gf\xD7\xBC\xF7!`\0\x1Cs\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16`@Qa\x01l\x90a\x05\xAAV[`\0`@Q\x80\x83\x03\x81\x85Z\xFA\x91PP=\x80`\0\x81\x14a\x01\xA7W`@Q\x91P`\x1F\x19`?=\x01\x16\x82\x01`@R=\x82R=`\0` \x84\x01>a\x01\xACV[``\x91P[P\x91P\x91P\x81a\x01\xF1W`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x01\xE8\x90a\x06\x1CV[`@Q\x80\x91\x03\x90\xFD[` \x81Q\x14a\x025W`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x02,\x90a\x06\x88V[`@Q\x80\x91\x03\x90\xFD[`\0\x81\x80` \x01\x90Q\x81\x01\x90a\x02K\x91\x90a\x06\xD4V[\x90P\x80\x93PPPP\x90V[`\0\x81g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x10\x90P\x92\x91PPV[`\0\x7F=\xCD\xF6;A\xC1\x03V}r%\x97j\xD9\x14^\x86lz}\xCC\xC6\xC2w\xEA\x86\xAB\xBD&\x8F\xBA\xC9`\0\x1Cs\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83`@Q` \x01a\x02\xC4\x91\x90a\x07\x1CV[`@Q` \x81\x83\x03\x03\x81R\x90`@R`@Qa\x02\xE0\x91\x90a\x07\x9DV[`\0`@Q\x80\x83\x03\x81\x85Z\xFA\x91PP=\x80`\0\x81\x14a\x03\x1BW`@Q\x91P`\x1F\x19`?=\x01\x16\x82\x01`@R=\x82R=`\0` \x84\x01>a\x03 V[``\x91P[PP\x90P\x80\x82\x90a\x03gW`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x03^\x91\x90a\x07\xF8V[`@Q\x80\x91\x03\x90\xFD[PPPPV[`\0\x80\xFD[`\0\x80\xFD[`\0\x81\x90P\x91\x90PV[a\x03\x8A\x81a\x03wV[\x81\x14a\x03\x95W`\0\x80\xFD[PV[`\0\x815\x90Pa\x03\xA7\x81a\x03\x81V[\x92\x91PPV[`\0g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x82\x16\x90P\x91\x90PV[a\x03\xCA\x81a\x03\xADV[\x81\x14a\x03\xD5W`\0\x80\xFD[PV[`\0\x815\x90Pa\x03\xE7\x81a\x03\xC1V[\x92\x91PPV[`\0\x80\xFD[`\0\x80\xFD[`\0\x80\xFD[`\0\x80\x83`\x1F\x84\x01\x12a\x04\x12Wa\x04\x11a\x03\xEDV[[\x825\x90Pg\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x81\x11\x15a\x04/Wa\x04.a\x03\xF2V[[` \x83\x01\x91P\x83`\x01\x82\x02\x83\x01\x11\x15a\x04KWa\x04Ja\x03\xF7V[[\x92P\x92\x90PV[`\0\x80`\0\x80`\0`\x80\x86\x88\x03\x12\x15a\x04nWa\x04ma\x03mV[[`\0a\x04|\x88\x82\x89\x01a\x03\x98V[\x95PP` a\x04\x8D\x88\x82\x89\x01a\x03\xD8V[\x94PP`@a\x04\x9E\x88\x82\x89\x01a\x03\x98V[\x93PP``\x86\x015g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x81\x11\x15a\x04\xBFWa\x04\xBEa\x03rV[[a\x04\xCB\x88\x82\x89\x01a\x03\xFCV[\x92P\x92PP\x92\x95P\x92\x95\x90\x93PV[a\x04\xE3\x81a\x03wV[\x82RPPV[`\0\x82\x82R` \x82\x01\x90P\x92\x91PPV[\x82\x81\x837`\0\x83\x83\x01RPPPV[`\0`\x1F\x19`\x1F\x83\x01\x16\x90P\x91\x90PV[`\0a\x05&\x83\x85a\x04\xE9V[\x93Pa\x053\x83\x85\x84a\x04\xFAV[a\x05<\x83a\x05\tV[\x84\x01\x90P\x93\x92PPPV[`\0`@\x82\x01\x90Pa\x05\\`\0\x83\x01\x86a\x04\xDAV[\x81\x81\x03` \x83\x01Ra\x05o\x81\x84\x86a\x05\x1AV[\x90P\x94\x93PPPPV[`\0\x81\x90P\x92\x91PPV[PV[`\0a\x05\x94`\0\x83a\x05yV[\x91Pa\x05\x9F\x82a\x05\x84V[`\0\x82\x01\x90P\x91\x90PV[`\0a\x05\xB5\x82a\x05\x87V[\x91P\x81\x90P\x91\x90PV[`\0\x82\x82R` \x82\x01\x90P\x92\x91PPV[\x7FPrecompile call failed\0\0\0\0\0\0\0\0\0\0`\0\x82\x01RPV[`\0a\x06\x06`\x16\x83a\x05\xBFV[\x91Pa\x06\x11\x82a\x05\xD0V[` \x82\x01\x90P\x91\x90PV[`\0` \x82\x01\x90P\x81\x81\x03`\0\x83\x01Ra\x065\x81a\x05\xF9V[\x90P\x91\x90PV[\x7FInvalid output length\0\0\0\0\0\0\0\0\0\0\0`\0\x82\x01RPV[`\0a\x06r`\x15\x83a\x05\xBFV[\x91Pa\x06}\x82a\x06<V[` \x82\x01\x90P\x91\x90PV[`\0` \x82\x01\x90P\x81\x81\x03`\0\x83\x01Ra\x06\xA1\x81a\x06eV[\x90P\x91\x90PV[a\x06\xB1\x81a\x03\xADV[\x81\x14a\x06\xBCW`\0\x80\xFD[PV[`\0\x81Q\x90Pa\x06\xCE\x81a\x06\xA8V[\x92\x91PPV[`\0` \x82\x84\x03\x12\x15a\x06\xEAWa\x06\xE9a\x03mV[[`\0a\x06\xF8\x84\x82\x85\x01a\x06\xBFV[\x91PP\x92\x91PPV[`\0\x81\x15\x15\x90P\x91\x90PV[a\x07\x16\x81a\x07\x01V[\x82RPPV[`\0` \x82\x01\x90Pa\x071`\0\x83\x01\x84a\x07\rV[\x92\x91PPV[`\0\x81Q\x90P\x91\x90PV[`\0[\x83\x81\x10\x15a\x07`W\x80\x82\x01Q\x81\x84\x01R` \x81\x01\x90Pa\x07EV[`\0\x84\x84\x01RPPPPV[`\0a\x07w\x82a\x077V[a\x07\x81\x81\x85a\x05yV[\x93Pa\x07\x91\x81\x85` \x86\x01a\x07BV[\x80\x84\x01\x91PP\x92\x91PPV[`\0a\x07\xA9\x82\x84a\x07lV[\x91P\x81\x90P\x92\x91PPV[`\0\x81Q\x90P\x91\x90PV[`\0a\x07\xCA\x82a\x07\xB4V[a\x07\xD4\x81\x85a\x05\xBFV[\x93Pa\x07\xE4\x81\x85` \x86\x01a\x07BV[a\x07\xED\x81a\x05\tV[\x84\x01\x91PP\x92\x91PPV[`\0` \x82\x01\x90P\x81\x81\x03`\0\x83\x01Ra\x08\x12\x81\x84a\x07\xBFV[\x90P\x92\x91PPV",
    );
    /// The runtime bytecode of the contract, as deployed on the network.
    ///
    /// ```text
    ///0x608060405234801561001057600080fd5b506004361061002b5760003560e01c80634a19067e14610030575b600080fd5b61004a60048036038101906100459190610452565b61004c565b005b61008b846040518060400160405280601781526020017f41756374696f6e20646561646c696e65207061737365640000000000000000008152506100f0565b8367ffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16867ffa9544cad94ab8507946215078af54be3ed0a1f19911d5dab2037baf8e064fb08686866040516100e193929190610547565b60405180910390a45050505050565b61011d610117836100ff610121565b67ffffffffffffffff1661025690919063ffffffff16565b82610277565b5050565b60008060007fba286e4d89dabf4b2878e896423bb123d9d5143e662606fd343b6766d7bcf72160001c73ffffffffffffffffffffffffffffffffffffffff1660405161016c906105aa565b600060405180830381855afa9150503d80600081146101a7576040519150601f19603f3d011682016040523d82523d6000602084013e6101ac565b606091505b5091509150816101f1576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016101e89061061c565b60405180910390fd5b6020815114610235576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161022c90610688565b60405180910390fd5b60008180602001905181019061024b91906106d4565b905080935050505090565b60008167ffffffffffffffff168367ffffffffffffffff1610905092915050565b60007f3dcdf63b41c103567d7225976ad9145e866c7a7dccc6c277ea86abbd268fbac960001c73ffffffffffffffffffffffffffffffffffffffff16836040516020016102c4919061071c565b6040516020818303038152906040526040516102e0919061079d565b600060405180830381855afa9150503d806000811461031b576040519150601f19603f3d011682016040523d82523d6000602084013e610320565b606091505b50509050808290610367576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161035e91906107f8565b60405180910390fd5b50505050565b600080fd5b600080fd5b6000819050919050565b61038a81610377565b811461039557600080fd5b50565b6000813590506103a781610381565b92915050565b600067ffffffffffffffff82169050919050565b6103ca816103ad565b81146103d557600080fd5b50565b6000813590506103e7816103c1565b92915050565b600080fd5b600080fd5b600080fd5b60008083601f840112610412576104116103ed565b5b8235905067ffffffffffffffff81111561042f5761042e6103f2565b5b60208301915083600182028301111561044b5761044a6103f7565b5b9250929050565b60008060008060006080868803121561046e5761046d61036d565b5b600061047c88828901610398565b955050602061048d888289016103d8565b945050604061049e88828901610398565b935050606086013567ffffffffffffffff8111156104bf576104be610372565b5b6104cb888289016103fc565b92509250509295509295909350565b6104e381610377565b82525050565b600082825260208201905092915050565b82818337600083830152505050565b6000601f19601f8301169050919050565b600061052683856104e9565b93506105338385846104fa565b61053c83610509565b840190509392505050565b600060408201905061055c60008301866104da565b818103602083015261056f81848661051a565b9050949350505050565b600081905092915050565b50565b6000610594600083610579565b915061059f82610584565b600082019050919050565b60006105b582610587565b9150819050919050565b600082825260208201905092915050565b7f507265636f6d70696c652063616c6c206661696c656400000000000000000000600082015250565b60006106066016836105bf565b9150610611826105d0565b602082019050919050565b60006020820190508181036000830152610635816105f9565b9050919050565b7f496e76616c6964206f7574707574206c656e6774680000000000000000000000600082015250565b60006106726015836105bf565b915061067d8261063c565b602082019050919050565b600060208201905081810360008301526106a181610665565b9050919050565b6106b1816103ad565b81146106bc57600080fd5b50565b6000815190506106ce816106a8565b92915050565b6000602082840312156106ea576106e961036d565b5b60006106f8848285016106bf565b91505092915050565b60008115159050919050565b61071681610701565b82525050565b6000602082019050610731600083018461070d565b92915050565b600081519050919050565b60005b83811015610760578082015181840152602081019050610745565b60008484015250505050565b600061077782610737565b6107818185610579565b9350610791818560208601610742565b80840191505092915050565b60006107a9828461076c565b915081905092915050565b600081519050919050565b60006107ca826107b4565b6107d481856105bf565b93506107e4818560208601610742565b6107ed81610509565b840191505092915050565b6000602082019050818103600083015261081281846107bf565b90509291505056
    /// ```
    #[rustfmt::skip]
    #[allow(clippy::all)]
    pub static DEPLOYED_BYTECODE: alloy_sol_types::private::Bytes = alloy_sol_types::private::Bytes::from_static(
        b"`\x80`@R4\x80\x15a\0\x10W`\0\x80\xFD[P`\x046\x10a\0+W`\x005`\xE0\x1C\x80cJ\x19\x06~\x14a\x000W[`\0\x80\xFD[a\0J`\x04\x806\x03\x81\x01\x90a\0E\x91\x90a\x04RV[a\0LV[\0[a\0\x8B\x84`@Q\x80`@\x01`@R\x80`\x17\x81R` \x01\x7FAuction deadline passed\0\0\0\0\0\0\0\0\0\x81RPa\0\xF0V[\x83g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x163s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x86\x7F\xFA\x95D\xCA\xD9J\xB8PyF!Px\xAFT\xBE>\xD0\xA1\xF1\x99\x11\xD5\xDA\xB2\x03{\xAF\x8E\x06O\xB0\x86\x86\x86`@Qa\0\xE1\x93\x92\x91\x90a\x05GV[`@Q\x80\x91\x03\x90\xA4PPPPPV[a\x01\x1Da\x01\x17\x83a\0\xFFa\x01!V[g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16a\x02V\x90\x91\x90c\xFF\xFF\xFF\xFF\x16V[\x82a\x02wV[PPV[`\0\x80`\0\x7F\xBA(nM\x89\xDA\xBFK(x\xE8\x96B;\xB1#\xD9\xD5\x14>f&\x06\xFD4;gf\xD7\xBC\xF7!`\0\x1Cs\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16`@Qa\x01l\x90a\x05\xAAV[`\0`@Q\x80\x83\x03\x81\x85Z\xFA\x91PP=\x80`\0\x81\x14a\x01\xA7W`@Q\x91P`\x1F\x19`?=\x01\x16\x82\x01`@R=\x82R=`\0` \x84\x01>a\x01\xACV[``\x91P[P\x91P\x91P\x81a\x01\xF1W`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x01\xE8\x90a\x06\x1CV[`@Q\x80\x91\x03\x90\xFD[` \x81Q\x14a\x025W`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x02,\x90a\x06\x88V[`@Q\x80\x91\x03\x90\xFD[`\0\x81\x80` \x01\x90Q\x81\x01\x90a\x02K\x91\x90a\x06\xD4V[\x90P\x80\x93PPPP\x90V[`\0\x81g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x10\x90P\x92\x91PPV[`\0\x7F=\xCD\xF6;A\xC1\x03V}r%\x97j\xD9\x14^\x86lz}\xCC\xC6\xC2w\xEA\x86\xAB\xBD&\x8F\xBA\xC9`\0\x1Cs\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83`@Q` \x01a\x02\xC4\x91\x90a\x07\x1CV[`@Q` \x81\x83\x03\x03\x81R\x90`@R`@Qa\x02\xE0\x91\x90a\x07\x9DV[`\0`@Q\x80\x83\x03\x81\x85Z\xFA\x91PP=\x80`\0\x81\x14a\x03\x1BW`@Q\x91P`\x1F\x19`?=\x01\x16\x82\x01`@R=\x82R=`\0` \x84\x01>a\x03 V[``\x91P[PP\x90P\x80\x82\x90a\x03gW`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x03^\x91\x90a\x07\xF8V[`@Q\x80\x91\x03\x90\xFD[PPPPV[`\0\x80\xFD[`\0\x80\xFD[`\0\x81\x90P\x91\x90PV[a\x03\x8A\x81a\x03wV[\x81\x14a\x03\x95W`\0\x80\xFD[PV[`\0\x815\x90Pa\x03\xA7\x81a\x03\x81V[\x92\x91PPV[`\0g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x82\x16\x90P\x91\x90PV[a\x03\xCA\x81a\x03\xADV[\x81\x14a\x03\xD5W`\0\x80\xFD[PV[`\0\x815\x90Pa\x03\xE7\x81a\x03\xC1V[\x92\x91PPV[`\0\x80\xFD[`\0\x80\xFD[`\0\x80\xFD[`\0\x80\x83`\x1F\x84\x01\x12a\x04\x12Wa\x04\x11a\x03\xEDV[[\x825\x90Pg\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x81\x11\x15a\x04/Wa\x04.a\x03\xF2V[[` \x83\x01\x91P\x83`\x01\x82\x02\x83\x01\x11\x15a\x04KWa\x04Ja\x03\xF7V[[\x92P\x92\x90PV[`\0\x80`\0\x80`\0`\x80\x86\x88\x03\x12\x15a\x04nWa\x04ma\x03mV[[`\0a\x04|\x88\x82\x89\x01a\x03\x98V[\x95PP` a\x04\x8D\x88\x82\x89\x01a\x03\xD8V[\x94PP`@a\x04\x9E\x88\x82\x89\x01a\x03\x98V[\x93PP``\x86\x015g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x81\x11\x15a\x04\xBFWa\x04\xBEa\x03rV[[a\x04\xCB\x88\x82\x89\x01a\x03\xFCV[\x92P\x92PP\x92\x95P\x92\x95\x90\x93PV[a\x04\xE3\x81a\x03wV[\x82RPPV[`\0\x82\x82R` \x82\x01\x90P\x92\x91PPV[\x82\x81\x837`\0\x83\x83\x01RPPPV[`\0`\x1F\x19`\x1F\x83\x01\x16\x90P\x91\x90PV[`\0a\x05&\x83\x85a\x04\xE9V[\x93Pa\x053\x83\x85\x84a\x04\xFAV[a\x05<\x83a\x05\tV[\x84\x01\x90P\x93\x92PPPV[`\0`@\x82\x01\x90Pa\x05\\`\0\x83\x01\x86a\x04\xDAV[\x81\x81\x03` \x83\x01Ra\x05o\x81\x84\x86a\x05\x1AV[\x90P\x94\x93PPPPV[`\0\x81\x90P\x92\x91PPV[PV[`\0a\x05\x94`\0\x83a\x05yV[\x91Pa\x05\x9F\x82a\x05\x84V[`\0\x82\x01\x90P\x91\x90PV[`\0a\x05\xB5\x82a\x05\x87V[\x91P\x81\x90P\x91\x90PV[`\0\x82\x82R` \x82\x01\x90P\x92\x91PPV[\x7FPrecompile call failed\0\0\0\0\0\0\0\0\0\0`\0\x82\x01RPV[`\0a\x06\x06`\x16\x83a\x05\xBFV[\x91Pa\x06\x11\x82a\x05\xD0V[` \x82\x01\x90P\x91\x90PV[`\0` \x82\x01\x90P\x81\x81\x03`\0\x83\x01Ra\x065\x81a\x05\xF9V[\x90P\x91\x90PV[\x7FInvalid output length\0\0\0\0\0\0\0\0\0\0\0`\0\x82\x01RPV[`\0a\x06r`\x15\x83a\x05\xBFV[\x91Pa\x06}\x82a\x06<V[` \x82\x01\x90P\x91\x90PV[`\0` \x82\x01\x90P\x81\x81\x03`\0\x83\x01Ra\x06\xA1\x81a\x06eV[\x90P\x91\x90PV[a\x06\xB1\x81a\x03\xADV[\x81\x14a\x06\xBCW`\0\x80\xFD[PV[`\0\x81Q\x90Pa\x06\xCE\x81a\x06\xA8V[\x92\x91PPV[`\0` \x82\x84\x03\x12\x15a\x06\xEAWa\x06\xE9a\x03mV[[`\0a\x06\xF8\x84\x82\x85\x01a\x06\xBFV[\x91PP\x92\x91PPV[`\0\x81\x15\x15\x90P\x91\x90PV[a\x07\x16\x81a\x07\x01V[\x82RPPV[`\0` \x82\x01\x90Pa\x071`\0\x83\x01\x84a\x07\rV[\x92\x91PPV[`\0\x81Q\x90P\x91\x90PV[`\0[\x83\x81\x10\x15a\x07`W\x80\x82\x01Q\x81\x84\x01R` \x81\x01\x90Pa\x07EV[`\0\x84\x84\x01RPPPPV[`\0a\x07w\x82a\x077V[a\x07\x81\x81\x85a\x05yV[\x93Pa\x07\x91\x81\x85` \x86\x01a\x07BV[\x80\x84\x01\x91PP\x92\x91PPV[`\0a\x07\xA9\x82\x84a\x07lV[\x91P\x81\x90P\x92\x91PPV[`\0\x81Q\x90P\x91\x90PV[`\0a\x07\xCA\x82a\x07\xB4V[a\x07\xD4\x81\x85a\x05\xBFV[\x93Pa\x07\xE4\x81\x85` \x86\x01a\x07BV[a\x07\xED\x81a\x05\tV[\x84\x01\x91PP\x92\x91PPV[`\0` \x82\x01\x90P\x81\x81\x03`\0\x83\x01Ra\x08\x12\x81\x84a\x07\xBFV[\x90P\x92\x91PPV",
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
