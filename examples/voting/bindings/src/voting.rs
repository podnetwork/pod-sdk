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
            pub const fn from(value: u64) -> Self {
                Self(value)
            }
            /// Return the underlying value.
            #[inline]
            pub const fn into(self) -> u64 {
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
        T: alloy_contract::private::Transport + ::core::clone::Clone,
        P: alloy_contract::private::Provider<T, N>,
        N: alloy_contract::private::Network,
    >(address: alloy_sol_types::private::Address, provider: P) -> TimeInstance<T, P, N> {
        TimeInstance::<T, P, N>::new(address, provider)
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
    pub struct TimeInstance<T, P, N = alloy_contract::private::Ethereum> {
        address: alloy_sol_types::private::Address,
        provider: P,
        _network_transport: ::core::marker::PhantomData<(N, T)>,
    }
    #[automatically_derived]
    impl<T, P, N> ::core::fmt::Debug for TimeInstance<T, P, N> {
        #[inline]
        fn fmt(&self, f: &mut ::core::fmt::Formatter<'_>) -> ::core::fmt::Result {
            f.debug_tuple("TimeInstance").field(&self.address).finish()
        }
    }
    /// Instantiation and getters/setters.
    #[automatically_derived]
    impl<
        T: alloy_contract::private::Transport + ::core::clone::Clone,
        P: alloy_contract::private::Provider<T, N>,
        N: alloy_contract::private::Network,
    > TimeInstance<T, P, N> {
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
                _network_transport: ::core::marker::PhantomData,
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
    impl<T, P: ::core::clone::Clone, N> TimeInstance<T, &P, N> {
        /// Clones the provider and returns a new instance with the cloned provider.
        #[inline]
        pub fn with_cloned_provider(self) -> TimeInstance<T, P, N> {
            TimeInstance {
                address: self.address,
                provider: ::core::clone::Clone::clone(&self.provider),
                _network_transport: ::core::marker::PhantomData,
            }
        }
    }
    /// Function calls.
    #[automatically_derived]
    impl<
        T: alloy_contract::private::Transport + ::core::clone::Clone,
        P: alloy_contract::private::Provider<T, N>,
        N: alloy_contract::private::Network,
    > TimeInstance<T, P, N> {
        /// Creates a new call builder using this contract instance's provider and address.
        ///
        /// Note that the call can be any function call, not just those defined in this
        /// contract. Prefer using the other methods for building type-safe contract calls.
        pub fn call_builder<C: alloy_sol_types::SolCall>(
            &self,
            call: &C,
        ) -> alloy_contract::SolCallBuilder<T, &P, C, N> {
            alloy_contract::SolCallBuilder::new_sol(&self.provider, &self.address, call)
        }
    }
    /// Event filters.
    #[automatically_derived]
    impl<
        T: alloy_contract::private::Transport + ::core::clone::Clone,
        P: alloy_contract::private::Provider<T, N>,
        N: alloy_contract::private::Network,
    > TimeInstance<T, P, N> {
        /// Creates a new event filter using this contract instance's provider and address.
        ///
        /// Note that the type can be any event, not just those defined in this contract.
        /// Prefer using the other methods for building type-safe event filters.
        pub fn event_filter<E: alloy_sol_types::SolEvent>(
            &self,
        ) -> alloy_contract::Event<T, &P, E, N> {
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

interface Voting {
    event PollCreated(bytes32 indexed pollId, Time.Timestamp deadline);
    event Voted(bytes32 indexed pollId, address indexed voter, uint256 indexed choice);
    event Winner(bytes32 indexed pollId, uint256 indexed choice);

    function createPoll(Time.Timestamp deadline, uint256 maxChoice, address[] memory voters) external returns (bytes32 pollId);
    function getPollId(Time.Timestamp deadline, uint256 maxChoice, address owner, address[] memory voters) external pure returns (bytes32 pollId);
    function getVotes(bytes32 pollId) external view returns (uint256 participants, uint256[] memory votes);
    function setWinningChoice(bytes32 pollId, uint256 choice) external;
    function vote(bytes32 pollId, uint256 choice) external;
}
```

...which was generated by the following JSON ABI:
```json
[
  {
    "type": "function",
    "name": "createPoll",
    "inputs": [
      {
        "name": "deadline",
        "type": "uint64",
        "internalType": "Time.Timestamp"
      },
      {
        "name": "maxChoice",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "voters",
        "type": "address[]",
        "internalType": "address[]"
      }
    ],
    "outputs": [
      {
        "name": "pollId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getPollId",
    "inputs": [
      {
        "name": "deadline",
        "type": "uint64",
        "internalType": "Time.Timestamp"
      },
      {
        "name": "maxChoice",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "owner",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "voters",
        "type": "address[]",
        "internalType": "address[]"
      }
    ],
    "outputs": [
      {
        "name": "pollId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "pure"
  },
  {
    "type": "function",
    "name": "getVotes",
    "inputs": [
      {
        "name": "pollId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "participants",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "votes",
        "type": "uint256[]",
        "internalType": "uint256[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "setWinningChoice",
    "inputs": [
      {
        "name": "pollId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "choice",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "vote",
    "inputs": [
      {
        "name": "pollId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "choice",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "PollCreated",
    "inputs": [
      {
        "name": "pollId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "deadline",
        "type": "uint64",
        "indexed": false,
        "internalType": "Time.Timestamp"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Voted",
    "inputs": [
      {
        "name": "pollId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "voter",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "choice",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Winner",
    "inputs": [
      {
        "name": "pollId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "choice",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
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
pub mod Voting {
    use super::*;
    use alloy::sol_types as alloy_sol_types;
    /// The creation / init bytecode of the contract.
    ///
    /// ```text
    ///0x6080604052348015600f57600080fd5b506119508061001f6000396000f3fe608060405234801561001057600080fd5b50600436106100575760003560e01c8063098cf9661461005c5780634c051100146100785780639ef1204c146100a9578063d9207fea146100c5578063efce8440146100f5575b600080fd5b61007660048036038101906100719190610cb1565b610125565b005b610092600480360381019061008d9190610cf1565b6102eb565b6040516100a0929190610deb565b60405180910390f35b6100c360048036038101906100be9190610cb1565b61040c565b005b6100df60048036038101906100da9190610f1e565b61065d565b6040516100ec9190610fb5565b60405180910390f35b61010f600480360381019061010a9190610fd0565b6106bf565b60405161011c9190610fb5565b60405180910390f35b600080600084815260200190815260200160002090506101928160000160009054906101000a900467ffffffffffffffff166040518060400160405280602081526020017f506f6c6c20646561646c696e6520686173206e6f74207061737365642079657481525061096c565b6000821180156101a6575080600101548211155b6101e5576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016101dc906110c7565b60405180910390fd5b60008160040160008481526020019081526020016000205490506000826005015483600601546102159190611116565b9050600080600190505b8460010154811161027c57858103156102695781856004016000838152602001908152602001600020541115610268578460040160008281526020019081526020016000205491505b5b80806102749061114a565b91505061021f565b506102ac82828561028d9190611116565b116040518060600160405280603d81526020016118e4603d913961099d565b84846007018190555084867f269d3a24712436f77df15d63de7d2337a060c9102dee6f46c909fb0fa2d52f0c60405160405180910390a3505050505050565b6000606060008060008581526020019081526020016000209050600081600101541161034c576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610343906111de565b60405180910390fd5b6000816001015467ffffffffffffffff81111561036c5761036b6111fe565b5b60405190808252806020026020018201604052801561039a5781602001602082028036833780820191505090505b50905060005b82600101548110156103fa578260040160006001836103bf919061122d565b8152602001908152602001600020548282815181106103e1576103e0611261565b5b60200260200101818152505080806001019150506103a0565b50816006015481935093505050915091565b6000806000848152602001908152602001600020905061045c8160000160009054906101000a900467ffffffffffffffff166040518060600160405280602f8152602001611921602f9139610a93565b600082118015610470575080600101548211155b6104af576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016104a6906110c7565b60405180910390fd5b600160028111156104c3576104c2611290565b5b8160030160003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060009054906101000a900460ff16600281111561052457610523611290565b5b14610564576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161055b9061130b565b60405180910390fd5b60028160030160003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060006101000a81548160ff021916908360028111156105c9576105c8611290565b5b021790555080600401600083815260200190815260200160002060008154809291906105f49061114a565b919050555080600501600081548092919061060e9061114a565b9190505550813373ffffffffffffffffffffffffffffffffffffffff16847fe4abc5380fa6939d1dc23b5e90b3a8a0e328f0f1a82a5f42bfb795bf9c71750560405160405180910390a4505050565b600085858585856040516020016106759291906113e8565b6040516020818303038152906040528051906020012060405160200161069e949392919061144b565b60405160208183030381529060405280519060200120905095945050505050565b6000610700856040518060400160405280601e81526020017f446561646c696e65206d75737420626520696e20746865206675747572650000815250610a93565b60008411610743576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161073a90611502565b60405180910390fd5b60008383905011610789576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016107809061156e565b60405180910390fd5b6000610798868633878761065d565b90506000806000838152602001908152602001600020905060008160060154146107f7576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016107ee906115da565b60405180910390fd5b868160000160006101000a81548167ffffffffffffffff021916908367ffffffffffffffff160217905550858160010181905550338160020160006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555084849050816006018190555060005b858590508110156109265760018260030160008888858181106108a3576108a2611261565b5b90506020020160208101906108b891906115fa565b73ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060006101000a81548160ff0219169083600281111561091457610913611290565b5b0217905550808060010191505061087d565b50817f8700637663f7841a9da4dfacdf5ea1b0e9a97a8300038e7243176480156666f7886040516109579190611627565b60405180910390a28192505050949350505050565b6109996109938361097b610ac4565b67ffffffffffffffff16610bf990919063ffffffff16565b8261099d565b5050565b60007f3dcdf63b41c103567d7225976ad9145e866c7a7dccc6c277ea86abbd268fbac960001c73ffffffffffffffffffffffffffffffffffffffff16836040516020016109ea919061165d565b604051602081830303815290604052604051610a0691906116e9565b600060405180830381855afa9150503d8060008114610a41576040519150601f19603f3d011682016040523d82523d6000602084013e610a46565b606091505b50509050808290610a8d576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610a849190611755565b60405180910390fd5b50505050565b610ac0610aba83610aa2610ac4565b67ffffffffffffffff16610c1a90919063ffffffff16565b8261099d565b5050565b60008060007fba286e4d89dabf4b2878e896423bb123d9d5143e662606fd343b6766d7bcf72160001c73ffffffffffffffffffffffffffffffffffffffff16604051610b0f9061179d565b600060405180830381855afa9150503d8060008114610b4a576040519150601f19603f3d011682016040523d82523d6000602084013e610b4f565b606091505b509150915081610b94576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610b8b906117fe565b60405180910390fd5b6020815114610bd8576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610bcf9061186a565b60405180910390fd5b600081806020019051810190610bee91906118b6565b905080935050505090565b60008167ffffffffffffffff168367ffffffffffffffff1611905092915050565b60008167ffffffffffffffff168367ffffffffffffffff1610905092915050565b600080fd5b600080fd5b6000819050919050565b610c5881610c45565b8114610c6357600080fd5b50565b600081359050610c7581610c4f565b92915050565b6000819050919050565b610c8e81610c7b565b8114610c9957600080fd5b50565b600081359050610cab81610c85565b92915050565b60008060408385031215610cc857610cc7610c3b565b5b6000610cd685828601610c66565b9250506020610ce785828601610c9c565b9150509250929050565b600060208284031215610d0757610d06610c3b565b5b6000610d1584828501610c66565b91505092915050565b610d2781610c7b565b82525050565b600081519050919050565b600082825260208201905092915050565b6000819050602082019050919050565b610d6281610c7b565b82525050565b6000610d748383610d59565b60208301905092915050565b6000602082019050919050565b6000610d9882610d2d565b610da28185610d38565b9350610dad83610d49565b8060005b83811015610dde578151610dc58882610d68565b9750610dd083610d80565b925050600181019050610db1565b5085935050505092915050565b6000604082019050610e006000830185610d1e565b8181036020830152610e128184610d8d565b90509392505050565b600067ffffffffffffffff82169050919050565b610e3881610e1b565b8114610e4357600080fd5b50565b600081359050610e5581610e2f565b92915050565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b6000610e8682610e5b565b9050919050565b610e9681610e7b565b8114610ea157600080fd5b50565b600081359050610eb381610e8d565b92915050565b600080fd5b600080fd5b600080fd5b60008083601f840112610ede57610edd610eb9565b5b8235905067ffffffffffffffff811115610efb57610efa610ebe565b5b602083019150836020820283011115610f1757610f16610ec3565b5b9250929050565b600080600080600060808688031215610f3a57610f39610c3b565b5b6000610f4888828901610e46565b9550506020610f5988828901610c9c565b9450506040610f6a88828901610ea4565b935050606086013567ffffffffffffffff811115610f8b57610f8a610c40565b5b610f9788828901610ec8565b92509250509295509295909350565b610faf81610c45565b82525050565b6000602082019050610fca6000830184610fa6565b92915050565b60008060008060608587031215610fea57610fe9610c3b565b5b6000610ff887828801610e46565b945050602061100987828801610c9c565b935050604085013567ffffffffffffffff81111561102a57611029610c40565b5b61103687828801610ec8565b925092505092959194509250565b600082825260208201905092915050565b7f43686f696365206d757374206265206265747765656e203120616e64206d617860008201527f43686f6963650000000000000000000000000000000000000000000000000000602082015250565b60006110b1602683611044565b91506110bc82611055565b604082019050919050565b600060208201905081810360008301526110e0816110a4565b9050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b600061112182610c7b565b915061112c83610c7b565b9250828203905081811115611144576111436110e7565b5b92915050565b600061115582610c7b565b91507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff8203611187576111866110e7565b5b600182019050919050565b7f706f6c6c20646f65736e27742065786973740000000000000000000000000000600082015250565b60006111c8601283611044565b91506111d382611192565b602082019050919050565b600060208201905081810360008301526111f7816111bb565b9050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b600061123882610c7b565b915061124383610c7b565b925082820190508082111561125b5761125a6110e7565b5b92915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052603260045260246000fd5b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602160045260246000fd5b7f73656e6465722063616e277420766f7465000000000000000000000000000000600082015250565b60006112f5601183611044565b9150611300826112bf565b602082019050919050565b60006020820190508181036000830152611324816112e8565b9050919050565b600081905092915050565b6000819050919050565b61134981610e7b565b82525050565b600061135b8383611340565b60208301905092915050565b60006113766020840184610ea4565b905092915050565b6000602082019050919050565b6000611397838561132b565b93506113a282611336565b8060005b858110156113db576113b88284611367565b6113c2888261134f565b97506113cd8361137e565b9250506001810190506113a6565b5085925050509392505050565b60006113f582848661138b565b91508190509392505050565b6000819050919050565b600061142661142161141c84610e1b565b611401565b610e1b565b9050919050565b6114368161140b565b82525050565b61144581610e7b565b82525050565b6000608082019050611460600083018761142d565b61146d6020830186610d1e565b61147a604083018561143c565b6114876060830184610fa6565b95945050505050565b7f4d617843686f696365206d7573742062652067726561746572207468616e207a60008201527f65726f0000000000000000000000000000000000000000000000000000000000602082015250565b60006114ec602383611044565b91506114f782611490565b604082019050919050565b6000602082019050818103600083015261151b816114df565b9050919050565b7f5468657265206d757374206265206174206c65617374206f6e6520766f746572600082015250565b6000611558602083611044565b915061156382611522565b602082019050919050565b600060208201905081810360008301526115878161154b565b9050919050565b7f706f6c6c20616c72656164792065786973747300000000000000000000000000600082015250565b60006115c4601383611044565b91506115cf8261158e565b602082019050919050565b600060208201905081810360008301526115f3816115b7565b9050919050565b6000602082840312156116105761160f610c3b565b5b600061161e84828501610ea4565b91505092915050565b600060208201905061163c600083018461142d565b92915050565b60008115159050919050565b61165781611642565b82525050565b6000602082019050611672600083018461164e565b92915050565b600081519050919050565b600081905092915050565b60005b838110156116ac578082015181840152602081019050611691565b60008484015250505050565b60006116c382611678565b6116cd8185611683565b93506116dd81856020860161168e565b80840191505092915050565b60006116f582846116b8565b915081905092915050565b600081519050919050565b6000601f19601f8301169050919050565b600061172782611700565b6117318185611044565b935061174181856020860161168e565b61174a8161170b565b840191505092915050565b6000602082019050818103600083015261176f818461171c565b905092915050565b50565b6000611787600083611683565b915061179282611777565b600082019050919050565b60006117a88261177a565b9150819050919050565b7f507265636f6d70696c652063616c6c206661696c656400000000000000000000600082015250565b60006117e8601683611044565b91506117f3826117b2565b602082019050919050565b60006020820190508181036000830152611817816117db565b9050919050565b7f496e76616c6964206f7574707574206c656e6774680000000000000000000000600082015250565b6000611854601583611044565b915061185f8261181e565b602082019050919050565b6000602082019050818103600083015261188381611847565b9050919050565b61189381610e1b565b811461189e57600080fd5b50565b6000815190506118b08161188a565b92915050565b6000602082840312156118cc576118cb610c3b565b5b60006118da848285016118a1565b9150509291505056fe546869732063686f69636520636f756c64207374696c6c206265206f76657274616b656e2069662072656d61696e696e6720766f7465727320766f7465506f6c6c20646561646c696e652068617320706173736564206f7220706f6c6c20646f6573206e6f74206578697374
    /// ```
    #[rustfmt::skip]
    #[allow(clippy::all)]
    pub static BYTECODE: alloy_sol_types::private::Bytes = alloy_sol_types::private::Bytes::from_static(
        b"`\x80`@R4\x80\x15`\x0FW`\0\x80\xFD[Pa\x19P\x80a\0\x1F`\09`\0\xF3\xFE`\x80`@R4\x80\x15a\0\x10W`\0\x80\xFD[P`\x046\x10a\0WW`\x005`\xE0\x1C\x80c\t\x8C\xF9f\x14a\0\\W\x80cL\x05\x11\0\x14a\0xW\x80c\x9E\xF1 L\x14a\0\xA9W\x80c\xD9 \x7F\xEA\x14a\0\xC5W\x80c\xEF\xCE\x84@\x14a\0\xF5W[`\0\x80\xFD[a\0v`\x04\x806\x03\x81\x01\x90a\0q\x91\x90a\x0C\xB1V[a\x01%V[\0[a\0\x92`\x04\x806\x03\x81\x01\x90a\0\x8D\x91\x90a\x0C\xF1V[a\x02\xEBV[`@Qa\0\xA0\x92\x91\x90a\r\xEBV[`@Q\x80\x91\x03\x90\xF3[a\0\xC3`\x04\x806\x03\x81\x01\x90a\0\xBE\x91\x90a\x0C\xB1V[a\x04\x0CV[\0[a\0\xDF`\x04\x806\x03\x81\x01\x90a\0\xDA\x91\x90a\x0F\x1EV[a\x06]V[`@Qa\0\xEC\x91\x90a\x0F\xB5V[`@Q\x80\x91\x03\x90\xF3[a\x01\x0F`\x04\x806\x03\x81\x01\x90a\x01\n\x91\x90a\x0F\xD0V[a\x06\xBFV[`@Qa\x01\x1C\x91\x90a\x0F\xB5V[`@Q\x80\x91\x03\x90\xF3[`\0\x80`\0\x84\x81R` \x01\x90\x81R` \x01`\0 \x90Pa\x01\x92\x81`\0\x01`\0\x90T\x90a\x01\0\n\x90\x04g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16`@Q\x80`@\x01`@R\x80` \x81R` \x01\x7FPoll deadline has not passed yet\x81RPa\tlV[`\0\x82\x11\x80\x15a\x01\xA6WP\x80`\x01\x01T\x82\x11\x15[a\x01\xE5W`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x01\xDC\x90a\x10\xC7V[`@Q\x80\x91\x03\x90\xFD[`\0\x81`\x04\x01`\0\x84\x81R` \x01\x90\x81R` \x01`\0 T\x90P`\0\x82`\x05\x01T\x83`\x06\x01Ta\x02\x15\x91\x90a\x11\x16V[\x90P`\0\x80`\x01\x90P[\x84`\x01\x01T\x81\x11a\x02|W\x85\x81\x03\x15a\x02iW\x81\x85`\x04\x01`\0\x83\x81R` \x01\x90\x81R` \x01`\0 T\x11\x15a\x02hW\x84`\x04\x01`\0\x82\x81R` \x01\x90\x81R` \x01`\0 T\x91P[[\x80\x80a\x02t\x90a\x11JV[\x91PPa\x02\x1FV[Pa\x02\xAC\x82\x82\x85a\x02\x8D\x91\x90a\x11\x16V[\x11`@Q\x80``\x01`@R\x80`=\x81R` \x01a\x18\xE4`=\x919a\t\x9DV[\x84\x84`\x07\x01\x81\x90UP\x84\x86\x7F&\x9D:$q$6\xF7}\xF1]c\xDE}#7\xA0`\xC9\x10-\xEEoF\xC9\t\xFB\x0F\xA2\xD5/\x0C`@Q`@Q\x80\x91\x03\x90\xA3PPPPPPV[`\0```\0\x80`\0\x85\x81R` \x01\x90\x81R` \x01`\0 \x90P`\0\x81`\x01\x01T\x11a\x03LW`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x03C\x90a\x11\xDEV[`@Q\x80\x91\x03\x90\xFD[`\0\x81`\x01\x01Tg\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x81\x11\x15a\x03lWa\x03ka\x11\xFEV[[`@Q\x90\x80\x82R\x80` \x02` \x01\x82\x01`@R\x80\x15a\x03\x9AW\x81` \x01` \x82\x02\x806\x837\x80\x82\x01\x91PP\x90P[P\x90P`\0[\x82`\x01\x01T\x81\x10\x15a\x03\xFAW\x82`\x04\x01`\0`\x01\x83a\x03\xBF\x91\x90a\x12-V[\x81R` \x01\x90\x81R` \x01`\0 T\x82\x82\x81Q\x81\x10a\x03\xE1Wa\x03\xE0a\x12aV[[` \x02` \x01\x01\x81\x81RPP\x80\x80`\x01\x01\x91PPa\x03\xA0V[P\x81`\x06\x01T\x81\x93P\x93PPP\x91P\x91V[`\0\x80`\0\x84\x81R` \x01\x90\x81R` \x01`\0 \x90Pa\x04\\\x81`\0\x01`\0\x90T\x90a\x01\0\n\x90\x04g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16`@Q\x80``\x01`@R\x80`/\x81R` \x01a\x19!`/\x919a\n\x93V[`\0\x82\x11\x80\x15a\x04pWP\x80`\x01\x01T\x82\x11\x15[a\x04\xAFW`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x04\xA6\x90a\x10\xC7V[`@Q\x80\x91\x03\x90\xFD[`\x01`\x02\x81\x11\x15a\x04\xC3Wa\x04\xC2a\x12\x90V[[\x81`\x03\x01`\x003s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x81R` \x01\x90\x81R` \x01`\0 `\0\x90T\x90a\x01\0\n\x90\x04`\xFF\x16`\x02\x81\x11\x15a\x05$Wa\x05#a\x12\x90V[[\x14a\x05dW`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x05[\x90a\x13\x0BV[`@Q\x80\x91\x03\x90\xFD[`\x02\x81`\x03\x01`\x003s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x81R` \x01\x90\x81R` \x01`\0 `\0a\x01\0\n\x81T\x81`\xFF\x02\x19\x16\x90\x83`\x02\x81\x11\x15a\x05\xC9Wa\x05\xC8a\x12\x90V[[\x02\x17\x90UP\x80`\x04\x01`\0\x83\x81R` \x01\x90\x81R` \x01`\0 `\0\x81T\x80\x92\x91\x90a\x05\xF4\x90a\x11JV[\x91\x90PUP\x80`\x05\x01`\0\x81T\x80\x92\x91\x90a\x06\x0E\x90a\x11JV[\x91\x90PUP\x813s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x84\x7F\xE4\xAB\xC58\x0F\xA6\x93\x9D\x1D\xC2;^\x90\xB3\xA8\xA0\xE3(\xF0\xF1\xA8*_B\xBF\xB7\x95\xBF\x9Cqu\x05`@Q`@Q\x80\x91\x03\x90\xA4PPPV[`\0\x85\x85\x85\x85\x85`@Q` \x01a\x06u\x92\x91\x90a\x13\xE8V[`@Q` \x81\x83\x03\x03\x81R\x90`@R\x80Q\x90` \x01 `@Q` \x01a\x06\x9E\x94\x93\x92\x91\x90a\x14KV[`@Q` \x81\x83\x03\x03\x81R\x90`@R\x80Q\x90` \x01 \x90P\x95\x94PPPPPV[`\0a\x07\0\x85`@Q\x80`@\x01`@R\x80`\x1E\x81R` \x01\x7FDeadline must be in the future\0\0\x81RPa\n\x93V[`\0\x84\x11a\x07CW`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x07:\x90a\x15\x02V[`@Q\x80\x91\x03\x90\xFD[`\0\x83\x83\x90P\x11a\x07\x89W`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x07\x80\x90a\x15nV[`@Q\x80\x91\x03\x90\xFD[`\0a\x07\x98\x86\x863\x87\x87a\x06]V[\x90P`\0\x80`\0\x83\x81R` \x01\x90\x81R` \x01`\0 \x90P`\0\x81`\x06\x01T\x14a\x07\xF7W`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x07\xEE\x90a\x15\xDAV[`@Q\x80\x91\x03\x90\xFD[\x86\x81`\0\x01`\0a\x01\0\n\x81T\x81g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x02\x19\x16\x90\x83g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x02\x17\x90UP\x85\x81`\x01\x01\x81\x90UP3\x81`\x02\x01`\0a\x01\0\n\x81T\x81s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x02\x19\x16\x90\x83s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x02\x17\x90UP\x84\x84\x90P\x81`\x06\x01\x81\x90UP`\0[\x85\x85\x90P\x81\x10\x15a\t&W`\x01\x82`\x03\x01`\0\x88\x88\x85\x81\x81\x10a\x08\xA3Wa\x08\xA2a\x12aV[[\x90P` \x02\x01` \x81\x01\x90a\x08\xB8\x91\x90a\x15\xFAV[s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x81R` \x01\x90\x81R` \x01`\0 `\0a\x01\0\n\x81T\x81`\xFF\x02\x19\x16\x90\x83`\x02\x81\x11\x15a\t\x14Wa\t\x13a\x12\x90V[[\x02\x17\x90UP\x80\x80`\x01\x01\x91PPa\x08}V[P\x81\x7F\x87\0cvc\xF7\x84\x1A\x9D\xA4\xDF\xAC\xDF^\xA1\xB0\xE9\xA9z\x83\0\x03\x8ErC\x17d\x80\x15ff\xF7\x88`@Qa\tW\x91\x90a\x16'V[`@Q\x80\x91\x03\x90\xA2\x81\x92PPP\x94\x93PPPPV[a\t\x99a\t\x93\x83a\t{a\n\xC4V[g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16a\x0B\xF9\x90\x91\x90c\xFF\xFF\xFF\xFF\x16V[\x82a\t\x9DV[PPV[`\0\x7F=\xCD\xF6;A\xC1\x03V}r%\x97j\xD9\x14^\x86lz}\xCC\xC6\xC2w\xEA\x86\xAB\xBD&\x8F\xBA\xC9`\0\x1Cs\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83`@Q` \x01a\t\xEA\x91\x90a\x16]V[`@Q` \x81\x83\x03\x03\x81R\x90`@R`@Qa\n\x06\x91\x90a\x16\xE9V[`\0`@Q\x80\x83\x03\x81\x85Z\xFA\x91PP=\x80`\0\x81\x14a\nAW`@Q\x91P`\x1F\x19`?=\x01\x16\x82\x01`@R=\x82R=`\0` \x84\x01>a\nFV[``\x91P[PP\x90P\x80\x82\x90a\n\x8DW`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\n\x84\x91\x90a\x17UV[`@Q\x80\x91\x03\x90\xFD[PPPPV[a\n\xC0a\n\xBA\x83a\n\xA2a\n\xC4V[g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16a\x0C\x1A\x90\x91\x90c\xFF\xFF\xFF\xFF\x16V[\x82a\t\x9DV[PPV[`\0\x80`\0\x7F\xBA(nM\x89\xDA\xBFK(x\xE8\x96B;\xB1#\xD9\xD5\x14>f&\x06\xFD4;gf\xD7\xBC\xF7!`\0\x1Cs\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16`@Qa\x0B\x0F\x90a\x17\x9DV[`\0`@Q\x80\x83\x03\x81\x85Z\xFA\x91PP=\x80`\0\x81\x14a\x0BJW`@Q\x91P`\x1F\x19`?=\x01\x16\x82\x01`@R=\x82R=`\0` \x84\x01>a\x0BOV[``\x91P[P\x91P\x91P\x81a\x0B\x94W`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x0B\x8B\x90a\x17\xFEV[`@Q\x80\x91\x03\x90\xFD[` \x81Q\x14a\x0B\xD8W`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x0B\xCF\x90a\x18jV[`@Q\x80\x91\x03\x90\xFD[`\0\x81\x80` \x01\x90Q\x81\x01\x90a\x0B\xEE\x91\x90a\x18\xB6V[\x90P\x80\x93PPPP\x90V[`\0\x81g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x11\x90P\x92\x91PPV[`\0\x81g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x10\x90P\x92\x91PPV[`\0\x80\xFD[`\0\x80\xFD[`\0\x81\x90P\x91\x90PV[a\x0CX\x81a\x0CEV[\x81\x14a\x0CcW`\0\x80\xFD[PV[`\0\x815\x90Pa\x0Cu\x81a\x0COV[\x92\x91PPV[`\0\x81\x90P\x91\x90PV[a\x0C\x8E\x81a\x0C{V[\x81\x14a\x0C\x99W`\0\x80\xFD[PV[`\0\x815\x90Pa\x0C\xAB\x81a\x0C\x85V[\x92\x91PPV[`\0\x80`@\x83\x85\x03\x12\x15a\x0C\xC8Wa\x0C\xC7a\x0C;V[[`\0a\x0C\xD6\x85\x82\x86\x01a\x0CfV[\x92PP` a\x0C\xE7\x85\x82\x86\x01a\x0C\x9CV[\x91PP\x92P\x92\x90PV[`\0` \x82\x84\x03\x12\x15a\r\x07Wa\r\x06a\x0C;V[[`\0a\r\x15\x84\x82\x85\x01a\x0CfV[\x91PP\x92\x91PPV[a\r'\x81a\x0C{V[\x82RPPV[`\0\x81Q\x90P\x91\x90PV[`\0\x82\x82R` \x82\x01\x90P\x92\x91PPV[`\0\x81\x90P` \x82\x01\x90P\x91\x90PV[a\rb\x81a\x0C{V[\x82RPPV[`\0a\rt\x83\x83a\rYV[` \x83\x01\x90P\x92\x91PPV[`\0` \x82\x01\x90P\x91\x90PV[`\0a\r\x98\x82a\r-V[a\r\xA2\x81\x85a\r8V[\x93Pa\r\xAD\x83a\rIV[\x80`\0[\x83\x81\x10\x15a\r\xDEW\x81Qa\r\xC5\x88\x82a\rhV[\x97Pa\r\xD0\x83a\r\x80V[\x92PP`\x01\x81\x01\x90Pa\r\xB1V[P\x85\x93PPPP\x92\x91PPV[`\0`@\x82\x01\x90Pa\x0E\0`\0\x83\x01\x85a\r\x1EV[\x81\x81\x03` \x83\x01Ra\x0E\x12\x81\x84a\r\x8DV[\x90P\x93\x92PPPV[`\0g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x82\x16\x90P\x91\x90PV[a\x0E8\x81a\x0E\x1BV[\x81\x14a\x0ECW`\0\x80\xFD[PV[`\0\x815\x90Pa\x0EU\x81a\x0E/V[\x92\x91PPV[`\0s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x82\x16\x90P\x91\x90PV[`\0a\x0E\x86\x82a\x0E[V[\x90P\x91\x90PV[a\x0E\x96\x81a\x0E{V[\x81\x14a\x0E\xA1W`\0\x80\xFD[PV[`\0\x815\x90Pa\x0E\xB3\x81a\x0E\x8DV[\x92\x91PPV[`\0\x80\xFD[`\0\x80\xFD[`\0\x80\xFD[`\0\x80\x83`\x1F\x84\x01\x12a\x0E\xDEWa\x0E\xDDa\x0E\xB9V[[\x825\x90Pg\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x81\x11\x15a\x0E\xFBWa\x0E\xFAa\x0E\xBEV[[` \x83\x01\x91P\x83` \x82\x02\x83\x01\x11\x15a\x0F\x17Wa\x0F\x16a\x0E\xC3V[[\x92P\x92\x90PV[`\0\x80`\0\x80`\0`\x80\x86\x88\x03\x12\x15a\x0F:Wa\x0F9a\x0C;V[[`\0a\x0FH\x88\x82\x89\x01a\x0EFV[\x95PP` a\x0FY\x88\x82\x89\x01a\x0C\x9CV[\x94PP`@a\x0Fj\x88\x82\x89\x01a\x0E\xA4V[\x93PP``\x86\x015g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x81\x11\x15a\x0F\x8BWa\x0F\x8Aa\x0C@V[[a\x0F\x97\x88\x82\x89\x01a\x0E\xC8V[\x92P\x92PP\x92\x95P\x92\x95\x90\x93PV[a\x0F\xAF\x81a\x0CEV[\x82RPPV[`\0` \x82\x01\x90Pa\x0F\xCA`\0\x83\x01\x84a\x0F\xA6V[\x92\x91PPV[`\0\x80`\0\x80``\x85\x87\x03\x12\x15a\x0F\xEAWa\x0F\xE9a\x0C;V[[`\0a\x0F\xF8\x87\x82\x88\x01a\x0EFV[\x94PP` a\x10\t\x87\x82\x88\x01a\x0C\x9CV[\x93PP`@\x85\x015g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x81\x11\x15a\x10*Wa\x10)a\x0C@V[[a\x106\x87\x82\x88\x01a\x0E\xC8V[\x92P\x92PP\x92\x95\x91\x94P\x92PV[`\0\x82\x82R` \x82\x01\x90P\x92\x91PPV[\x7FChoice must be between 1 and max`\0\x82\x01R\x7FChoice\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0` \x82\x01RPV[`\0a\x10\xB1`&\x83a\x10DV[\x91Pa\x10\xBC\x82a\x10UV[`@\x82\x01\x90P\x91\x90PV[`\0` \x82\x01\x90P\x81\x81\x03`\0\x83\x01Ra\x10\xE0\x81a\x10\xA4V[\x90P\x91\x90PV[\x7FNH{q\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0`\0R`\x11`\x04R`$`\0\xFD[`\0a\x11!\x82a\x0C{V[\x91Pa\x11,\x83a\x0C{V[\x92P\x82\x82\x03\x90P\x81\x81\x11\x15a\x11DWa\x11Ca\x10\xE7V[[\x92\x91PPV[`\0a\x11U\x82a\x0C{V[\x91P\x7F\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x82\x03a\x11\x87Wa\x11\x86a\x10\xE7V[[`\x01\x82\x01\x90P\x91\x90PV[\x7Fpoll doesn't exist\0\0\0\0\0\0\0\0\0\0\0\0\0\0`\0\x82\x01RPV[`\0a\x11\xC8`\x12\x83a\x10DV[\x91Pa\x11\xD3\x82a\x11\x92V[` \x82\x01\x90P\x91\x90PV[`\0` \x82\x01\x90P\x81\x81\x03`\0\x83\x01Ra\x11\xF7\x81a\x11\xBBV[\x90P\x91\x90PV[\x7FNH{q\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0`\0R`A`\x04R`$`\0\xFD[`\0a\x128\x82a\x0C{V[\x91Pa\x12C\x83a\x0C{V[\x92P\x82\x82\x01\x90P\x80\x82\x11\x15a\x12[Wa\x12Za\x10\xE7V[[\x92\x91PPV[\x7FNH{q\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0`\0R`2`\x04R`$`\0\xFD[\x7FNH{q\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0`\0R`!`\x04R`$`\0\xFD[\x7Fsender can't vote\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0`\0\x82\x01RPV[`\0a\x12\xF5`\x11\x83a\x10DV[\x91Pa\x13\0\x82a\x12\xBFV[` \x82\x01\x90P\x91\x90PV[`\0` \x82\x01\x90P\x81\x81\x03`\0\x83\x01Ra\x13$\x81a\x12\xE8V[\x90P\x91\x90PV[`\0\x81\x90P\x92\x91PPV[`\0\x81\x90P\x91\x90PV[a\x13I\x81a\x0E{V[\x82RPPV[`\0a\x13[\x83\x83a\x13@V[` \x83\x01\x90P\x92\x91PPV[`\0a\x13v` \x84\x01\x84a\x0E\xA4V[\x90P\x92\x91PPV[`\0` \x82\x01\x90P\x91\x90PV[`\0a\x13\x97\x83\x85a\x13+V[\x93Pa\x13\xA2\x82a\x136V[\x80`\0[\x85\x81\x10\x15a\x13\xDBWa\x13\xB8\x82\x84a\x13gV[a\x13\xC2\x88\x82a\x13OV[\x97Pa\x13\xCD\x83a\x13~V[\x92PP`\x01\x81\x01\x90Pa\x13\xA6V[P\x85\x92PPP\x93\x92PPPV[`\0a\x13\xF5\x82\x84\x86a\x13\x8BV[\x91P\x81\x90P\x93\x92PPPV[`\0\x81\x90P\x91\x90PV[`\0a\x14&a\x14!a\x14\x1C\x84a\x0E\x1BV[a\x14\x01V[a\x0E\x1BV[\x90P\x91\x90PV[a\x146\x81a\x14\x0BV[\x82RPPV[a\x14E\x81a\x0E{V[\x82RPPV[`\0`\x80\x82\x01\x90Pa\x14``\0\x83\x01\x87a\x14-V[a\x14m` \x83\x01\x86a\r\x1EV[a\x14z`@\x83\x01\x85a\x14<V[a\x14\x87``\x83\x01\x84a\x0F\xA6V[\x95\x94PPPPPV[\x7FMaxChoice must be greater than z`\0\x82\x01R\x7Fero\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0` \x82\x01RPV[`\0a\x14\xEC`#\x83a\x10DV[\x91Pa\x14\xF7\x82a\x14\x90V[`@\x82\x01\x90P\x91\x90PV[`\0` \x82\x01\x90P\x81\x81\x03`\0\x83\x01Ra\x15\x1B\x81a\x14\xDFV[\x90P\x91\x90PV[\x7FThere must be at least one voter`\0\x82\x01RPV[`\0a\x15X` \x83a\x10DV[\x91Pa\x15c\x82a\x15\"V[` \x82\x01\x90P\x91\x90PV[`\0` \x82\x01\x90P\x81\x81\x03`\0\x83\x01Ra\x15\x87\x81a\x15KV[\x90P\x91\x90PV[\x7Fpoll already exists\0\0\0\0\0\0\0\0\0\0\0\0\0`\0\x82\x01RPV[`\0a\x15\xC4`\x13\x83a\x10DV[\x91Pa\x15\xCF\x82a\x15\x8EV[` \x82\x01\x90P\x91\x90PV[`\0` \x82\x01\x90P\x81\x81\x03`\0\x83\x01Ra\x15\xF3\x81a\x15\xB7V[\x90P\x91\x90PV[`\0` \x82\x84\x03\x12\x15a\x16\x10Wa\x16\x0Fa\x0C;V[[`\0a\x16\x1E\x84\x82\x85\x01a\x0E\xA4V[\x91PP\x92\x91PPV[`\0` \x82\x01\x90Pa\x16<`\0\x83\x01\x84a\x14-V[\x92\x91PPV[`\0\x81\x15\x15\x90P\x91\x90PV[a\x16W\x81a\x16BV[\x82RPPV[`\0` \x82\x01\x90Pa\x16r`\0\x83\x01\x84a\x16NV[\x92\x91PPV[`\0\x81Q\x90P\x91\x90PV[`\0\x81\x90P\x92\x91PPV[`\0[\x83\x81\x10\x15a\x16\xACW\x80\x82\x01Q\x81\x84\x01R` \x81\x01\x90Pa\x16\x91V[`\0\x84\x84\x01RPPPPV[`\0a\x16\xC3\x82a\x16xV[a\x16\xCD\x81\x85a\x16\x83V[\x93Pa\x16\xDD\x81\x85` \x86\x01a\x16\x8EV[\x80\x84\x01\x91PP\x92\x91PPV[`\0a\x16\xF5\x82\x84a\x16\xB8V[\x91P\x81\x90P\x92\x91PPV[`\0\x81Q\x90P\x91\x90PV[`\0`\x1F\x19`\x1F\x83\x01\x16\x90P\x91\x90PV[`\0a\x17'\x82a\x17\0V[a\x171\x81\x85a\x10DV[\x93Pa\x17A\x81\x85` \x86\x01a\x16\x8EV[a\x17J\x81a\x17\x0BV[\x84\x01\x91PP\x92\x91PPV[`\0` \x82\x01\x90P\x81\x81\x03`\0\x83\x01Ra\x17o\x81\x84a\x17\x1CV[\x90P\x92\x91PPV[PV[`\0a\x17\x87`\0\x83a\x16\x83V[\x91Pa\x17\x92\x82a\x17wV[`\0\x82\x01\x90P\x91\x90PV[`\0a\x17\xA8\x82a\x17zV[\x91P\x81\x90P\x91\x90PV[\x7FPrecompile call failed\0\0\0\0\0\0\0\0\0\0`\0\x82\x01RPV[`\0a\x17\xE8`\x16\x83a\x10DV[\x91Pa\x17\xF3\x82a\x17\xB2V[` \x82\x01\x90P\x91\x90PV[`\0` \x82\x01\x90P\x81\x81\x03`\0\x83\x01Ra\x18\x17\x81a\x17\xDBV[\x90P\x91\x90PV[\x7FInvalid output length\0\0\0\0\0\0\0\0\0\0\0`\0\x82\x01RPV[`\0a\x18T`\x15\x83a\x10DV[\x91Pa\x18_\x82a\x18\x1EV[` \x82\x01\x90P\x91\x90PV[`\0` \x82\x01\x90P\x81\x81\x03`\0\x83\x01Ra\x18\x83\x81a\x18GV[\x90P\x91\x90PV[a\x18\x93\x81a\x0E\x1BV[\x81\x14a\x18\x9EW`\0\x80\xFD[PV[`\0\x81Q\x90Pa\x18\xB0\x81a\x18\x8AV[\x92\x91PPV[`\0` \x82\x84\x03\x12\x15a\x18\xCCWa\x18\xCBa\x0C;V[[`\0a\x18\xDA\x84\x82\x85\x01a\x18\xA1V[\x91PP\x92\x91PPV\xFEThis choice could still be overtaken if remaining voters votePoll deadline has passed or poll does not exist",
    );
    /// The runtime bytecode of the contract, as deployed on the network.
    ///
    /// ```text
    ///0x608060405234801561001057600080fd5b50600436106100575760003560e01c8063098cf9661461005c5780634c051100146100785780639ef1204c146100a9578063d9207fea146100c5578063efce8440146100f5575b600080fd5b61007660048036038101906100719190610cb1565b610125565b005b610092600480360381019061008d9190610cf1565b6102eb565b6040516100a0929190610deb565b60405180910390f35b6100c360048036038101906100be9190610cb1565b61040c565b005b6100df60048036038101906100da9190610f1e565b61065d565b6040516100ec9190610fb5565b60405180910390f35b61010f600480360381019061010a9190610fd0565b6106bf565b60405161011c9190610fb5565b60405180910390f35b600080600084815260200190815260200160002090506101928160000160009054906101000a900467ffffffffffffffff166040518060400160405280602081526020017f506f6c6c20646561646c696e6520686173206e6f74207061737365642079657481525061096c565b6000821180156101a6575080600101548211155b6101e5576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016101dc906110c7565b60405180910390fd5b60008160040160008481526020019081526020016000205490506000826005015483600601546102159190611116565b9050600080600190505b8460010154811161027c57858103156102695781856004016000838152602001908152602001600020541115610268578460040160008281526020019081526020016000205491505b5b80806102749061114a565b91505061021f565b506102ac82828561028d9190611116565b116040518060600160405280603d81526020016118e4603d913961099d565b84846007018190555084867f269d3a24712436f77df15d63de7d2337a060c9102dee6f46c909fb0fa2d52f0c60405160405180910390a3505050505050565b6000606060008060008581526020019081526020016000209050600081600101541161034c576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610343906111de565b60405180910390fd5b6000816001015467ffffffffffffffff81111561036c5761036b6111fe565b5b60405190808252806020026020018201604052801561039a5781602001602082028036833780820191505090505b50905060005b82600101548110156103fa578260040160006001836103bf919061122d565b8152602001908152602001600020548282815181106103e1576103e0611261565b5b60200260200101818152505080806001019150506103a0565b50816006015481935093505050915091565b6000806000848152602001908152602001600020905061045c8160000160009054906101000a900467ffffffffffffffff166040518060600160405280602f8152602001611921602f9139610a93565b600082118015610470575080600101548211155b6104af576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016104a6906110c7565b60405180910390fd5b600160028111156104c3576104c2611290565b5b8160030160003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060009054906101000a900460ff16600281111561052457610523611290565b5b14610564576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161055b9061130b565b60405180910390fd5b60028160030160003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060006101000a81548160ff021916908360028111156105c9576105c8611290565b5b021790555080600401600083815260200190815260200160002060008154809291906105f49061114a565b919050555080600501600081548092919061060e9061114a565b9190505550813373ffffffffffffffffffffffffffffffffffffffff16847fe4abc5380fa6939d1dc23b5e90b3a8a0e328f0f1a82a5f42bfb795bf9c71750560405160405180910390a4505050565b600085858585856040516020016106759291906113e8565b6040516020818303038152906040528051906020012060405160200161069e949392919061144b565b60405160208183030381529060405280519060200120905095945050505050565b6000610700856040518060400160405280601e81526020017f446561646c696e65206d75737420626520696e20746865206675747572650000815250610a93565b60008411610743576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161073a90611502565b60405180910390fd5b60008383905011610789576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016107809061156e565b60405180910390fd5b6000610798868633878761065d565b90506000806000838152602001908152602001600020905060008160060154146107f7576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016107ee906115da565b60405180910390fd5b868160000160006101000a81548167ffffffffffffffff021916908367ffffffffffffffff160217905550858160010181905550338160020160006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555084849050816006018190555060005b858590508110156109265760018260030160008888858181106108a3576108a2611261565b5b90506020020160208101906108b891906115fa565b73ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060006101000a81548160ff0219169083600281111561091457610913611290565b5b0217905550808060010191505061087d565b50817f8700637663f7841a9da4dfacdf5ea1b0e9a97a8300038e7243176480156666f7886040516109579190611627565b60405180910390a28192505050949350505050565b6109996109938361097b610ac4565b67ffffffffffffffff16610bf990919063ffffffff16565b8261099d565b5050565b60007f3dcdf63b41c103567d7225976ad9145e866c7a7dccc6c277ea86abbd268fbac960001c73ffffffffffffffffffffffffffffffffffffffff16836040516020016109ea919061165d565b604051602081830303815290604052604051610a0691906116e9565b600060405180830381855afa9150503d8060008114610a41576040519150601f19603f3d011682016040523d82523d6000602084013e610a46565b606091505b50509050808290610a8d576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610a849190611755565b60405180910390fd5b50505050565b610ac0610aba83610aa2610ac4565b67ffffffffffffffff16610c1a90919063ffffffff16565b8261099d565b5050565b60008060007fba286e4d89dabf4b2878e896423bb123d9d5143e662606fd343b6766d7bcf72160001c73ffffffffffffffffffffffffffffffffffffffff16604051610b0f9061179d565b600060405180830381855afa9150503d8060008114610b4a576040519150601f19603f3d011682016040523d82523d6000602084013e610b4f565b606091505b509150915081610b94576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610b8b906117fe565b60405180910390fd5b6020815114610bd8576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610bcf9061186a565b60405180910390fd5b600081806020019051810190610bee91906118b6565b905080935050505090565b60008167ffffffffffffffff168367ffffffffffffffff1611905092915050565b60008167ffffffffffffffff168367ffffffffffffffff1610905092915050565b600080fd5b600080fd5b6000819050919050565b610c5881610c45565b8114610c6357600080fd5b50565b600081359050610c7581610c4f565b92915050565b6000819050919050565b610c8e81610c7b565b8114610c9957600080fd5b50565b600081359050610cab81610c85565b92915050565b60008060408385031215610cc857610cc7610c3b565b5b6000610cd685828601610c66565b9250506020610ce785828601610c9c565b9150509250929050565b600060208284031215610d0757610d06610c3b565b5b6000610d1584828501610c66565b91505092915050565b610d2781610c7b565b82525050565b600081519050919050565b600082825260208201905092915050565b6000819050602082019050919050565b610d6281610c7b565b82525050565b6000610d748383610d59565b60208301905092915050565b6000602082019050919050565b6000610d9882610d2d565b610da28185610d38565b9350610dad83610d49565b8060005b83811015610dde578151610dc58882610d68565b9750610dd083610d80565b925050600181019050610db1565b5085935050505092915050565b6000604082019050610e006000830185610d1e565b8181036020830152610e128184610d8d565b90509392505050565b600067ffffffffffffffff82169050919050565b610e3881610e1b565b8114610e4357600080fd5b50565b600081359050610e5581610e2f565b92915050565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b6000610e8682610e5b565b9050919050565b610e9681610e7b565b8114610ea157600080fd5b50565b600081359050610eb381610e8d565b92915050565b600080fd5b600080fd5b600080fd5b60008083601f840112610ede57610edd610eb9565b5b8235905067ffffffffffffffff811115610efb57610efa610ebe565b5b602083019150836020820283011115610f1757610f16610ec3565b5b9250929050565b600080600080600060808688031215610f3a57610f39610c3b565b5b6000610f4888828901610e46565b9550506020610f5988828901610c9c565b9450506040610f6a88828901610ea4565b935050606086013567ffffffffffffffff811115610f8b57610f8a610c40565b5b610f9788828901610ec8565b92509250509295509295909350565b610faf81610c45565b82525050565b6000602082019050610fca6000830184610fa6565b92915050565b60008060008060608587031215610fea57610fe9610c3b565b5b6000610ff887828801610e46565b945050602061100987828801610c9c565b935050604085013567ffffffffffffffff81111561102a57611029610c40565b5b61103687828801610ec8565b925092505092959194509250565b600082825260208201905092915050565b7f43686f696365206d757374206265206265747765656e203120616e64206d617860008201527f43686f6963650000000000000000000000000000000000000000000000000000602082015250565b60006110b1602683611044565b91506110bc82611055565b604082019050919050565b600060208201905081810360008301526110e0816110a4565b9050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b600061112182610c7b565b915061112c83610c7b565b9250828203905081811115611144576111436110e7565b5b92915050565b600061115582610c7b565b91507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff8203611187576111866110e7565b5b600182019050919050565b7f706f6c6c20646f65736e27742065786973740000000000000000000000000000600082015250565b60006111c8601283611044565b91506111d382611192565b602082019050919050565b600060208201905081810360008301526111f7816111bb565b9050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b600061123882610c7b565b915061124383610c7b565b925082820190508082111561125b5761125a6110e7565b5b92915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052603260045260246000fd5b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602160045260246000fd5b7f73656e6465722063616e277420766f7465000000000000000000000000000000600082015250565b60006112f5601183611044565b9150611300826112bf565b602082019050919050565b60006020820190508181036000830152611324816112e8565b9050919050565b600081905092915050565b6000819050919050565b61134981610e7b565b82525050565b600061135b8383611340565b60208301905092915050565b60006113766020840184610ea4565b905092915050565b6000602082019050919050565b6000611397838561132b565b93506113a282611336565b8060005b858110156113db576113b88284611367565b6113c2888261134f565b97506113cd8361137e565b9250506001810190506113a6565b5085925050509392505050565b60006113f582848661138b565b91508190509392505050565b6000819050919050565b600061142661142161141c84610e1b565b611401565b610e1b565b9050919050565b6114368161140b565b82525050565b61144581610e7b565b82525050565b6000608082019050611460600083018761142d565b61146d6020830186610d1e565b61147a604083018561143c565b6114876060830184610fa6565b95945050505050565b7f4d617843686f696365206d7573742062652067726561746572207468616e207a60008201527f65726f0000000000000000000000000000000000000000000000000000000000602082015250565b60006114ec602383611044565b91506114f782611490565b604082019050919050565b6000602082019050818103600083015261151b816114df565b9050919050565b7f5468657265206d757374206265206174206c65617374206f6e6520766f746572600082015250565b6000611558602083611044565b915061156382611522565b602082019050919050565b600060208201905081810360008301526115878161154b565b9050919050565b7f706f6c6c20616c72656164792065786973747300000000000000000000000000600082015250565b60006115c4601383611044565b91506115cf8261158e565b602082019050919050565b600060208201905081810360008301526115f3816115b7565b9050919050565b6000602082840312156116105761160f610c3b565b5b600061161e84828501610ea4565b91505092915050565b600060208201905061163c600083018461142d565b92915050565b60008115159050919050565b61165781611642565b82525050565b6000602082019050611672600083018461164e565b92915050565b600081519050919050565b600081905092915050565b60005b838110156116ac578082015181840152602081019050611691565b60008484015250505050565b60006116c382611678565b6116cd8185611683565b93506116dd81856020860161168e565b80840191505092915050565b60006116f582846116b8565b915081905092915050565b600081519050919050565b6000601f19601f8301169050919050565b600061172782611700565b6117318185611044565b935061174181856020860161168e565b61174a8161170b565b840191505092915050565b6000602082019050818103600083015261176f818461171c565b905092915050565b50565b6000611787600083611683565b915061179282611777565b600082019050919050565b60006117a88261177a565b9150819050919050565b7f507265636f6d70696c652063616c6c206661696c656400000000000000000000600082015250565b60006117e8601683611044565b91506117f3826117b2565b602082019050919050565b60006020820190508181036000830152611817816117db565b9050919050565b7f496e76616c6964206f7574707574206c656e6774680000000000000000000000600082015250565b6000611854601583611044565b915061185f8261181e565b602082019050919050565b6000602082019050818103600083015261188381611847565b9050919050565b61189381610e1b565b811461189e57600080fd5b50565b6000815190506118b08161188a565b92915050565b6000602082840312156118cc576118cb610c3b565b5b60006118da848285016118a1565b9150509291505056fe546869732063686f69636520636f756c64207374696c6c206265206f76657274616b656e2069662072656d61696e696e6720766f7465727320766f7465506f6c6c20646561646c696e652068617320706173736564206f7220706f6c6c20646f6573206e6f74206578697374
    /// ```
    #[rustfmt::skip]
    #[allow(clippy::all)]
    pub static DEPLOYED_BYTECODE: alloy_sol_types::private::Bytes = alloy_sol_types::private::Bytes::from_static(
        b"`\x80`@R4\x80\x15a\0\x10W`\0\x80\xFD[P`\x046\x10a\0WW`\x005`\xE0\x1C\x80c\t\x8C\xF9f\x14a\0\\W\x80cL\x05\x11\0\x14a\0xW\x80c\x9E\xF1 L\x14a\0\xA9W\x80c\xD9 \x7F\xEA\x14a\0\xC5W\x80c\xEF\xCE\x84@\x14a\0\xF5W[`\0\x80\xFD[a\0v`\x04\x806\x03\x81\x01\x90a\0q\x91\x90a\x0C\xB1V[a\x01%V[\0[a\0\x92`\x04\x806\x03\x81\x01\x90a\0\x8D\x91\x90a\x0C\xF1V[a\x02\xEBV[`@Qa\0\xA0\x92\x91\x90a\r\xEBV[`@Q\x80\x91\x03\x90\xF3[a\0\xC3`\x04\x806\x03\x81\x01\x90a\0\xBE\x91\x90a\x0C\xB1V[a\x04\x0CV[\0[a\0\xDF`\x04\x806\x03\x81\x01\x90a\0\xDA\x91\x90a\x0F\x1EV[a\x06]V[`@Qa\0\xEC\x91\x90a\x0F\xB5V[`@Q\x80\x91\x03\x90\xF3[a\x01\x0F`\x04\x806\x03\x81\x01\x90a\x01\n\x91\x90a\x0F\xD0V[a\x06\xBFV[`@Qa\x01\x1C\x91\x90a\x0F\xB5V[`@Q\x80\x91\x03\x90\xF3[`\0\x80`\0\x84\x81R` \x01\x90\x81R` \x01`\0 \x90Pa\x01\x92\x81`\0\x01`\0\x90T\x90a\x01\0\n\x90\x04g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16`@Q\x80`@\x01`@R\x80` \x81R` \x01\x7FPoll deadline has not passed yet\x81RPa\tlV[`\0\x82\x11\x80\x15a\x01\xA6WP\x80`\x01\x01T\x82\x11\x15[a\x01\xE5W`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x01\xDC\x90a\x10\xC7V[`@Q\x80\x91\x03\x90\xFD[`\0\x81`\x04\x01`\0\x84\x81R` \x01\x90\x81R` \x01`\0 T\x90P`\0\x82`\x05\x01T\x83`\x06\x01Ta\x02\x15\x91\x90a\x11\x16V[\x90P`\0\x80`\x01\x90P[\x84`\x01\x01T\x81\x11a\x02|W\x85\x81\x03\x15a\x02iW\x81\x85`\x04\x01`\0\x83\x81R` \x01\x90\x81R` \x01`\0 T\x11\x15a\x02hW\x84`\x04\x01`\0\x82\x81R` \x01\x90\x81R` \x01`\0 T\x91P[[\x80\x80a\x02t\x90a\x11JV[\x91PPa\x02\x1FV[Pa\x02\xAC\x82\x82\x85a\x02\x8D\x91\x90a\x11\x16V[\x11`@Q\x80``\x01`@R\x80`=\x81R` \x01a\x18\xE4`=\x919a\t\x9DV[\x84\x84`\x07\x01\x81\x90UP\x84\x86\x7F&\x9D:$q$6\xF7}\xF1]c\xDE}#7\xA0`\xC9\x10-\xEEoF\xC9\t\xFB\x0F\xA2\xD5/\x0C`@Q`@Q\x80\x91\x03\x90\xA3PPPPPPV[`\0```\0\x80`\0\x85\x81R` \x01\x90\x81R` \x01`\0 \x90P`\0\x81`\x01\x01T\x11a\x03LW`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x03C\x90a\x11\xDEV[`@Q\x80\x91\x03\x90\xFD[`\0\x81`\x01\x01Tg\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x81\x11\x15a\x03lWa\x03ka\x11\xFEV[[`@Q\x90\x80\x82R\x80` \x02` \x01\x82\x01`@R\x80\x15a\x03\x9AW\x81` \x01` \x82\x02\x806\x837\x80\x82\x01\x91PP\x90P[P\x90P`\0[\x82`\x01\x01T\x81\x10\x15a\x03\xFAW\x82`\x04\x01`\0`\x01\x83a\x03\xBF\x91\x90a\x12-V[\x81R` \x01\x90\x81R` \x01`\0 T\x82\x82\x81Q\x81\x10a\x03\xE1Wa\x03\xE0a\x12aV[[` \x02` \x01\x01\x81\x81RPP\x80\x80`\x01\x01\x91PPa\x03\xA0V[P\x81`\x06\x01T\x81\x93P\x93PPP\x91P\x91V[`\0\x80`\0\x84\x81R` \x01\x90\x81R` \x01`\0 \x90Pa\x04\\\x81`\0\x01`\0\x90T\x90a\x01\0\n\x90\x04g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16`@Q\x80``\x01`@R\x80`/\x81R` \x01a\x19!`/\x919a\n\x93V[`\0\x82\x11\x80\x15a\x04pWP\x80`\x01\x01T\x82\x11\x15[a\x04\xAFW`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x04\xA6\x90a\x10\xC7V[`@Q\x80\x91\x03\x90\xFD[`\x01`\x02\x81\x11\x15a\x04\xC3Wa\x04\xC2a\x12\x90V[[\x81`\x03\x01`\x003s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x81R` \x01\x90\x81R` \x01`\0 `\0\x90T\x90a\x01\0\n\x90\x04`\xFF\x16`\x02\x81\x11\x15a\x05$Wa\x05#a\x12\x90V[[\x14a\x05dW`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x05[\x90a\x13\x0BV[`@Q\x80\x91\x03\x90\xFD[`\x02\x81`\x03\x01`\x003s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x81R` \x01\x90\x81R` \x01`\0 `\0a\x01\0\n\x81T\x81`\xFF\x02\x19\x16\x90\x83`\x02\x81\x11\x15a\x05\xC9Wa\x05\xC8a\x12\x90V[[\x02\x17\x90UP\x80`\x04\x01`\0\x83\x81R` \x01\x90\x81R` \x01`\0 `\0\x81T\x80\x92\x91\x90a\x05\xF4\x90a\x11JV[\x91\x90PUP\x80`\x05\x01`\0\x81T\x80\x92\x91\x90a\x06\x0E\x90a\x11JV[\x91\x90PUP\x813s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x84\x7F\xE4\xAB\xC58\x0F\xA6\x93\x9D\x1D\xC2;^\x90\xB3\xA8\xA0\xE3(\xF0\xF1\xA8*_B\xBF\xB7\x95\xBF\x9Cqu\x05`@Q`@Q\x80\x91\x03\x90\xA4PPPV[`\0\x85\x85\x85\x85\x85`@Q` \x01a\x06u\x92\x91\x90a\x13\xE8V[`@Q` \x81\x83\x03\x03\x81R\x90`@R\x80Q\x90` \x01 `@Q` \x01a\x06\x9E\x94\x93\x92\x91\x90a\x14KV[`@Q` \x81\x83\x03\x03\x81R\x90`@R\x80Q\x90` \x01 \x90P\x95\x94PPPPPV[`\0a\x07\0\x85`@Q\x80`@\x01`@R\x80`\x1E\x81R` \x01\x7FDeadline must be in the future\0\0\x81RPa\n\x93V[`\0\x84\x11a\x07CW`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x07:\x90a\x15\x02V[`@Q\x80\x91\x03\x90\xFD[`\0\x83\x83\x90P\x11a\x07\x89W`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x07\x80\x90a\x15nV[`@Q\x80\x91\x03\x90\xFD[`\0a\x07\x98\x86\x863\x87\x87a\x06]V[\x90P`\0\x80`\0\x83\x81R` \x01\x90\x81R` \x01`\0 \x90P`\0\x81`\x06\x01T\x14a\x07\xF7W`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x07\xEE\x90a\x15\xDAV[`@Q\x80\x91\x03\x90\xFD[\x86\x81`\0\x01`\0a\x01\0\n\x81T\x81g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x02\x19\x16\x90\x83g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x02\x17\x90UP\x85\x81`\x01\x01\x81\x90UP3\x81`\x02\x01`\0a\x01\0\n\x81T\x81s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x02\x19\x16\x90\x83s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x02\x17\x90UP\x84\x84\x90P\x81`\x06\x01\x81\x90UP`\0[\x85\x85\x90P\x81\x10\x15a\t&W`\x01\x82`\x03\x01`\0\x88\x88\x85\x81\x81\x10a\x08\xA3Wa\x08\xA2a\x12aV[[\x90P` \x02\x01` \x81\x01\x90a\x08\xB8\x91\x90a\x15\xFAV[s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x81R` \x01\x90\x81R` \x01`\0 `\0a\x01\0\n\x81T\x81`\xFF\x02\x19\x16\x90\x83`\x02\x81\x11\x15a\t\x14Wa\t\x13a\x12\x90V[[\x02\x17\x90UP\x80\x80`\x01\x01\x91PPa\x08}V[P\x81\x7F\x87\0cvc\xF7\x84\x1A\x9D\xA4\xDF\xAC\xDF^\xA1\xB0\xE9\xA9z\x83\0\x03\x8ErC\x17d\x80\x15ff\xF7\x88`@Qa\tW\x91\x90a\x16'V[`@Q\x80\x91\x03\x90\xA2\x81\x92PPP\x94\x93PPPPV[a\t\x99a\t\x93\x83a\t{a\n\xC4V[g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16a\x0B\xF9\x90\x91\x90c\xFF\xFF\xFF\xFF\x16V[\x82a\t\x9DV[PPV[`\0\x7F=\xCD\xF6;A\xC1\x03V}r%\x97j\xD9\x14^\x86lz}\xCC\xC6\xC2w\xEA\x86\xAB\xBD&\x8F\xBA\xC9`\0\x1Cs\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83`@Q` \x01a\t\xEA\x91\x90a\x16]V[`@Q` \x81\x83\x03\x03\x81R\x90`@R`@Qa\n\x06\x91\x90a\x16\xE9V[`\0`@Q\x80\x83\x03\x81\x85Z\xFA\x91PP=\x80`\0\x81\x14a\nAW`@Q\x91P`\x1F\x19`?=\x01\x16\x82\x01`@R=\x82R=`\0` \x84\x01>a\nFV[``\x91P[PP\x90P\x80\x82\x90a\n\x8DW`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\n\x84\x91\x90a\x17UV[`@Q\x80\x91\x03\x90\xFD[PPPPV[a\n\xC0a\n\xBA\x83a\n\xA2a\n\xC4V[g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16a\x0C\x1A\x90\x91\x90c\xFF\xFF\xFF\xFF\x16V[\x82a\t\x9DV[PPV[`\0\x80`\0\x7F\xBA(nM\x89\xDA\xBFK(x\xE8\x96B;\xB1#\xD9\xD5\x14>f&\x06\xFD4;gf\xD7\xBC\xF7!`\0\x1Cs\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16`@Qa\x0B\x0F\x90a\x17\x9DV[`\0`@Q\x80\x83\x03\x81\x85Z\xFA\x91PP=\x80`\0\x81\x14a\x0BJW`@Q\x91P`\x1F\x19`?=\x01\x16\x82\x01`@R=\x82R=`\0` \x84\x01>a\x0BOV[``\x91P[P\x91P\x91P\x81a\x0B\x94W`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x0B\x8B\x90a\x17\xFEV[`@Q\x80\x91\x03\x90\xFD[` \x81Q\x14a\x0B\xD8W`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x0B\xCF\x90a\x18jV[`@Q\x80\x91\x03\x90\xFD[`\0\x81\x80` \x01\x90Q\x81\x01\x90a\x0B\xEE\x91\x90a\x18\xB6V[\x90P\x80\x93PPPP\x90V[`\0\x81g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x11\x90P\x92\x91PPV[`\0\x81g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x10\x90P\x92\x91PPV[`\0\x80\xFD[`\0\x80\xFD[`\0\x81\x90P\x91\x90PV[a\x0CX\x81a\x0CEV[\x81\x14a\x0CcW`\0\x80\xFD[PV[`\0\x815\x90Pa\x0Cu\x81a\x0COV[\x92\x91PPV[`\0\x81\x90P\x91\x90PV[a\x0C\x8E\x81a\x0C{V[\x81\x14a\x0C\x99W`\0\x80\xFD[PV[`\0\x815\x90Pa\x0C\xAB\x81a\x0C\x85V[\x92\x91PPV[`\0\x80`@\x83\x85\x03\x12\x15a\x0C\xC8Wa\x0C\xC7a\x0C;V[[`\0a\x0C\xD6\x85\x82\x86\x01a\x0CfV[\x92PP` a\x0C\xE7\x85\x82\x86\x01a\x0C\x9CV[\x91PP\x92P\x92\x90PV[`\0` \x82\x84\x03\x12\x15a\r\x07Wa\r\x06a\x0C;V[[`\0a\r\x15\x84\x82\x85\x01a\x0CfV[\x91PP\x92\x91PPV[a\r'\x81a\x0C{V[\x82RPPV[`\0\x81Q\x90P\x91\x90PV[`\0\x82\x82R` \x82\x01\x90P\x92\x91PPV[`\0\x81\x90P` \x82\x01\x90P\x91\x90PV[a\rb\x81a\x0C{V[\x82RPPV[`\0a\rt\x83\x83a\rYV[` \x83\x01\x90P\x92\x91PPV[`\0` \x82\x01\x90P\x91\x90PV[`\0a\r\x98\x82a\r-V[a\r\xA2\x81\x85a\r8V[\x93Pa\r\xAD\x83a\rIV[\x80`\0[\x83\x81\x10\x15a\r\xDEW\x81Qa\r\xC5\x88\x82a\rhV[\x97Pa\r\xD0\x83a\r\x80V[\x92PP`\x01\x81\x01\x90Pa\r\xB1V[P\x85\x93PPPP\x92\x91PPV[`\0`@\x82\x01\x90Pa\x0E\0`\0\x83\x01\x85a\r\x1EV[\x81\x81\x03` \x83\x01Ra\x0E\x12\x81\x84a\r\x8DV[\x90P\x93\x92PPPV[`\0g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x82\x16\x90P\x91\x90PV[a\x0E8\x81a\x0E\x1BV[\x81\x14a\x0ECW`\0\x80\xFD[PV[`\0\x815\x90Pa\x0EU\x81a\x0E/V[\x92\x91PPV[`\0s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x82\x16\x90P\x91\x90PV[`\0a\x0E\x86\x82a\x0E[V[\x90P\x91\x90PV[a\x0E\x96\x81a\x0E{V[\x81\x14a\x0E\xA1W`\0\x80\xFD[PV[`\0\x815\x90Pa\x0E\xB3\x81a\x0E\x8DV[\x92\x91PPV[`\0\x80\xFD[`\0\x80\xFD[`\0\x80\xFD[`\0\x80\x83`\x1F\x84\x01\x12a\x0E\xDEWa\x0E\xDDa\x0E\xB9V[[\x825\x90Pg\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x81\x11\x15a\x0E\xFBWa\x0E\xFAa\x0E\xBEV[[` \x83\x01\x91P\x83` \x82\x02\x83\x01\x11\x15a\x0F\x17Wa\x0F\x16a\x0E\xC3V[[\x92P\x92\x90PV[`\0\x80`\0\x80`\0`\x80\x86\x88\x03\x12\x15a\x0F:Wa\x0F9a\x0C;V[[`\0a\x0FH\x88\x82\x89\x01a\x0EFV[\x95PP` a\x0FY\x88\x82\x89\x01a\x0C\x9CV[\x94PP`@a\x0Fj\x88\x82\x89\x01a\x0E\xA4V[\x93PP``\x86\x015g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x81\x11\x15a\x0F\x8BWa\x0F\x8Aa\x0C@V[[a\x0F\x97\x88\x82\x89\x01a\x0E\xC8V[\x92P\x92PP\x92\x95P\x92\x95\x90\x93PV[a\x0F\xAF\x81a\x0CEV[\x82RPPV[`\0` \x82\x01\x90Pa\x0F\xCA`\0\x83\x01\x84a\x0F\xA6V[\x92\x91PPV[`\0\x80`\0\x80``\x85\x87\x03\x12\x15a\x0F\xEAWa\x0F\xE9a\x0C;V[[`\0a\x0F\xF8\x87\x82\x88\x01a\x0EFV[\x94PP` a\x10\t\x87\x82\x88\x01a\x0C\x9CV[\x93PP`@\x85\x015g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x81\x11\x15a\x10*Wa\x10)a\x0C@V[[a\x106\x87\x82\x88\x01a\x0E\xC8V[\x92P\x92PP\x92\x95\x91\x94P\x92PV[`\0\x82\x82R` \x82\x01\x90P\x92\x91PPV[\x7FChoice must be between 1 and max`\0\x82\x01R\x7FChoice\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0` \x82\x01RPV[`\0a\x10\xB1`&\x83a\x10DV[\x91Pa\x10\xBC\x82a\x10UV[`@\x82\x01\x90P\x91\x90PV[`\0` \x82\x01\x90P\x81\x81\x03`\0\x83\x01Ra\x10\xE0\x81a\x10\xA4V[\x90P\x91\x90PV[\x7FNH{q\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0`\0R`\x11`\x04R`$`\0\xFD[`\0a\x11!\x82a\x0C{V[\x91Pa\x11,\x83a\x0C{V[\x92P\x82\x82\x03\x90P\x81\x81\x11\x15a\x11DWa\x11Ca\x10\xE7V[[\x92\x91PPV[`\0a\x11U\x82a\x0C{V[\x91P\x7F\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x82\x03a\x11\x87Wa\x11\x86a\x10\xE7V[[`\x01\x82\x01\x90P\x91\x90PV[\x7Fpoll doesn't exist\0\0\0\0\0\0\0\0\0\0\0\0\0\0`\0\x82\x01RPV[`\0a\x11\xC8`\x12\x83a\x10DV[\x91Pa\x11\xD3\x82a\x11\x92V[` \x82\x01\x90P\x91\x90PV[`\0` \x82\x01\x90P\x81\x81\x03`\0\x83\x01Ra\x11\xF7\x81a\x11\xBBV[\x90P\x91\x90PV[\x7FNH{q\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0`\0R`A`\x04R`$`\0\xFD[`\0a\x128\x82a\x0C{V[\x91Pa\x12C\x83a\x0C{V[\x92P\x82\x82\x01\x90P\x80\x82\x11\x15a\x12[Wa\x12Za\x10\xE7V[[\x92\x91PPV[\x7FNH{q\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0`\0R`2`\x04R`$`\0\xFD[\x7FNH{q\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0`\0R`!`\x04R`$`\0\xFD[\x7Fsender can't vote\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0`\0\x82\x01RPV[`\0a\x12\xF5`\x11\x83a\x10DV[\x91Pa\x13\0\x82a\x12\xBFV[` \x82\x01\x90P\x91\x90PV[`\0` \x82\x01\x90P\x81\x81\x03`\0\x83\x01Ra\x13$\x81a\x12\xE8V[\x90P\x91\x90PV[`\0\x81\x90P\x92\x91PPV[`\0\x81\x90P\x91\x90PV[a\x13I\x81a\x0E{V[\x82RPPV[`\0a\x13[\x83\x83a\x13@V[` \x83\x01\x90P\x92\x91PPV[`\0a\x13v` \x84\x01\x84a\x0E\xA4V[\x90P\x92\x91PPV[`\0` \x82\x01\x90P\x91\x90PV[`\0a\x13\x97\x83\x85a\x13+V[\x93Pa\x13\xA2\x82a\x136V[\x80`\0[\x85\x81\x10\x15a\x13\xDBWa\x13\xB8\x82\x84a\x13gV[a\x13\xC2\x88\x82a\x13OV[\x97Pa\x13\xCD\x83a\x13~V[\x92PP`\x01\x81\x01\x90Pa\x13\xA6V[P\x85\x92PPP\x93\x92PPPV[`\0a\x13\xF5\x82\x84\x86a\x13\x8BV[\x91P\x81\x90P\x93\x92PPPV[`\0\x81\x90P\x91\x90PV[`\0a\x14&a\x14!a\x14\x1C\x84a\x0E\x1BV[a\x14\x01V[a\x0E\x1BV[\x90P\x91\x90PV[a\x146\x81a\x14\x0BV[\x82RPPV[a\x14E\x81a\x0E{V[\x82RPPV[`\0`\x80\x82\x01\x90Pa\x14``\0\x83\x01\x87a\x14-V[a\x14m` \x83\x01\x86a\r\x1EV[a\x14z`@\x83\x01\x85a\x14<V[a\x14\x87``\x83\x01\x84a\x0F\xA6V[\x95\x94PPPPPV[\x7FMaxChoice must be greater than z`\0\x82\x01R\x7Fero\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0` \x82\x01RPV[`\0a\x14\xEC`#\x83a\x10DV[\x91Pa\x14\xF7\x82a\x14\x90V[`@\x82\x01\x90P\x91\x90PV[`\0` \x82\x01\x90P\x81\x81\x03`\0\x83\x01Ra\x15\x1B\x81a\x14\xDFV[\x90P\x91\x90PV[\x7FThere must be at least one voter`\0\x82\x01RPV[`\0a\x15X` \x83a\x10DV[\x91Pa\x15c\x82a\x15\"V[` \x82\x01\x90P\x91\x90PV[`\0` \x82\x01\x90P\x81\x81\x03`\0\x83\x01Ra\x15\x87\x81a\x15KV[\x90P\x91\x90PV[\x7Fpoll already exists\0\0\0\0\0\0\0\0\0\0\0\0\0`\0\x82\x01RPV[`\0a\x15\xC4`\x13\x83a\x10DV[\x91Pa\x15\xCF\x82a\x15\x8EV[` \x82\x01\x90P\x91\x90PV[`\0` \x82\x01\x90P\x81\x81\x03`\0\x83\x01Ra\x15\xF3\x81a\x15\xB7V[\x90P\x91\x90PV[`\0` \x82\x84\x03\x12\x15a\x16\x10Wa\x16\x0Fa\x0C;V[[`\0a\x16\x1E\x84\x82\x85\x01a\x0E\xA4V[\x91PP\x92\x91PPV[`\0` \x82\x01\x90Pa\x16<`\0\x83\x01\x84a\x14-V[\x92\x91PPV[`\0\x81\x15\x15\x90P\x91\x90PV[a\x16W\x81a\x16BV[\x82RPPV[`\0` \x82\x01\x90Pa\x16r`\0\x83\x01\x84a\x16NV[\x92\x91PPV[`\0\x81Q\x90P\x91\x90PV[`\0\x81\x90P\x92\x91PPV[`\0[\x83\x81\x10\x15a\x16\xACW\x80\x82\x01Q\x81\x84\x01R` \x81\x01\x90Pa\x16\x91V[`\0\x84\x84\x01RPPPPV[`\0a\x16\xC3\x82a\x16xV[a\x16\xCD\x81\x85a\x16\x83V[\x93Pa\x16\xDD\x81\x85` \x86\x01a\x16\x8EV[\x80\x84\x01\x91PP\x92\x91PPV[`\0a\x16\xF5\x82\x84a\x16\xB8V[\x91P\x81\x90P\x92\x91PPV[`\0\x81Q\x90P\x91\x90PV[`\0`\x1F\x19`\x1F\x83\x01\x16\x90P\x91\x90PV[`\0a\x17'\x82a\x17\0V[a\x171\x81\x85a\x10DV[\x93Pa\x17A\x81\x85` \x86\x01a\x16\x8EV[a\x17J\x81a\x17\x0BV[\x84\x01\x91PP\x92\x91PPV[`\0` \x82\x01\x90P\x81\x81\x03`\0\x83\x01Ra\x17o\x81\x84a\x17\x1CV[\x90P\x92\x91PPV[PV[`\0a\x17\x87`\0\x83a\x16\x83V[\x91Pa\x17\x92\x82a\x17wV[`\0\x82\x01\x90P\x91\x90PV[`\0a\x17\xA8\x82a\x17zV[\x91P\x81\x90P\x91\x90PV[\x7FPrecompile call failed\0\0\0\0\0\0\0\0\0\0`\0\x82\x01RPV[`\0a\x17\xE8`\x16\x83a\x10DV[\x91Pa\x17\xF3\x82a\x17\xB2V[` \x82\x01\x90P\x91\x90PV[`\0` \x82\x01\x90P\x81\x81\x03`\0\x83\x01Ra\x18\x17\x81a\x17\xDBV[\x90P\x91\x90PV[\x7FInvalid output length\0\0\0\0\0\0\0\0\0\0\0`\0\x82\x01RPV[`\0a\x18T`\x15\x83a\x10DV[\x91Pa\x18_\x82a\x18\x1EV[` \x82\x01\x90P\x91\x90PV[`\0` \x82\x01\x90P\x81\x81\x03`\0\x83\x01Ra\x18\x83\x81a\x18GV[\x90P\x91\x90PV[a\x18\x93\x81a\x0E\x1BV[\x81\x14a\x18\x9EW`\0\x80\xFD[PV[`\0\x81Q\x90Pa\x18\xB0\x81a\x18\x8AV[\x92\x91PPV[`\0` \x82\x84\x03\x12\x15a\x18\xCCWa\x18\xCBa\x0C;V[[`\0a\x18\xDA\x84\x82\x85\x01a\x18\xA1V[\x91PP\x92\x91PPV\xFEThis choice could still be overtaken if remaining voters votePoll deadline has passed or poll does not exist",
    );
    #[derive(serde::Serialize, serde::Deserialize)]
    #[derive(Default, Debug, PartialEq, Eq, Hash)]
    /**Event with signature `PollCreated(bytes32,uint64)` and selector `0x8700637663f7841a9da4dfacdf5ea1b0e9a97a8300038e7243176480156666f7`.
```solidity
event PollCreated(bytes32 indexed pollId, Time.Timestamp deadline);
```*/
    #[allow(
        non_camel_case_types,
        non_snake_case,
        clippy::pub_underscore_fields,
        clippy::style
    )]
    #[derive(Clone)]
    pub struct PollCreated {
        #[allow(missing_docs)]
        pub pollId: alloy::sol_types::private::FixedBytes<32>,
        #[allow(missing_docs)]
        pub deadline: <Time::Timestamp as alloy::sol_types::SolType>::RustType,
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
        impl alloy_sol_types::SolEvent for PollCreated {
            type DataTuple<'a> = (Time::Timestamp,);
            type DataToken<'a> = <Self::DataTuple<
                'a,
            > as alloy_sol_types::SolType>::Token<'a>;
            type TopicList = (
                alloy_sol_types::sol_data::FixedBytes<32>,
                alloy::sol_types::sol_data::FixedBytes<32>,
            );
            const SIGNATURE: &'static str = "PollCreated(bytes32,uint64)";
            const SIGNATURE_HASH: alloy_sol_types::private::B256 = alloy_sol_types::private::B256::new([
                135u8, 0u8, 99u8, 118u8, 99u8, 247u8, 132u8, 26u8, 157u8, 164u8, 223u8,
                172u8, 223u8, 94u8, 161u8, 176u8, 233u8, 169u8, 122u8, 131u8, 0u8, 3u8,
                142u8, 114u8, 67u8, 23u8, 100u8, 128u8, 21u8, 102u8, 102u8, 247u8,
            ]);
            const ANONYMOUS: bool = false;
            #[allow(unused_variables)]
            #[inline]
            fn new(
                topics: <Self::TopicList as alloy_sol_types::SolType>::RustType,
                data: <Self::DataTuple<'_> as alloy_sol_types::SolType>::RustType,
            ) -> Self {
                Self {
                    pollId: topics.1,
                    deadline: data.0,
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
                        &self.deadline,
                    ),
                )
            }
            #[inline]
            fn topics(&self) -> <Self::TopicList as alloy_sol_types::SolType>::RustType {
                (Self::SIGNATURE_HASH.into(), self.pollId.clone())
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
                > as alloy_sol_types::EventTopic>::encode_topic(&self.pollId);
                Ok(())
            }
        }
        #[automatically_derived]
        impl alloy_sol_types::private::IntoLogData for PollCreated {
            fn to_log_data(&self) -> alloy_sol_types::private::LogData {
                From::from(self)
            }
            fn into_log_data(self) -> alloy_sol_types::private::LogData {
                From::from(&self)
            }
        }
        #[automatically_derived]
        impl From<&PollCreated> for alloy_sol_types::private::LogData {
            #[inline]
            fn from(this: &PollCreated) -> alloy_sol_types::private::LogData {
                alloy_sol_types::SolEvent::encode_log_data(this)
            }
        }
    };
    #[derive(serde::Serialize, serde::Deserialize)]
    #[derive(Default, Debug, PartialEq, Eq, Hash)]
    /**Event with signature `Voted(bytes32,address,uint256)` and selector `0xe4abc5380fa6939d1dc23b5e90b3a8a0e328f0f1a82a5f42bfb795bf9c717505`.
```solidity
event Voted(bytes32 indexed pollId, address indexed voter, uint256 indexed choice);
```*/
    #[allow(
        non_camel_case_types,
        non_snake_case,
        clippy::pub_underscore_fields,
        clippy::style
    )]
    #[derive(Clone)]
    pub struct Voted {
        #[allow(missing_docs)]
        pub pollId: alloy::sol_types::private::FixedBytes<32>,
        #[allow(missing_docs)]
        pub voter: alloy::sol_types::private::Address,
        #[allow(missing_docs)]
        pub choice: alloy::sol_types::private::primitives::aliases::U256,
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
        impl alloy_sol_types::SolEvent for Voted {
            type DataTuple<'a> = ();
            type DataToken<'a> = <Self::DataTuple<
                'a,
            > as alloy_sol_types::SolType>::Token<'a>;
            type TopicList = (
                alloy_sol_types::sol_data::FixedBytes<32>,
                alloy::sol_types::sol_data::FixedBytes<32>,
                alloy::sol_types::sol_data::Address,
                alloy::sol_types::sol_data::Uint<256>,
            );
            const SIGNATURE: &'static str = "Voted(bytes32,address,uint256)";
            const SIGNATURE_HASH: alloy_sol_types::private::B256 = alloy_sol_types::private::B256::new([
                228u8, 171u8, 197u8, 56u8, 15u8, 166u8, 147u8, 157u8, 29u8, 194u8, 59u8,
                94u8, 144u8, 179u8, 168u8, 160u8, 227u8, 40u8, 240u8, 241u8, 168u8, 42u8,
                95u8, 66u8, 191u8, 183u8, 149u8, 191u8, 156u8, 113u8, 117u8, 5u8,
            ]);
            const ANONYMOUS: bool = false;
            #[allow(unused_variables)]
            #[inline]
            fn new(
                topics: <Self::TopicList as alloy_sol_types::SolType>::RustType,
                data: <Self::DataTuple<'_> as alloy_sol_types::SolType>::RustType,
            ) -> Self {
                Self {
                    pollId: topics.1,
                    voter: topics.2,
                    choice: topics.3,
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
                ()
            }
            #[inline]
            fn topics(&self) -> <Self::TopicList as alloy_sol_types::SolType>::RustType {
                (
                    Self::SIGNATURE_HASH.into(),
                    self.pollId.clone(),
                    self.voter.clone(),
                    self.choice.clone(),
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
                > as alloy_sol_types::EventTopic>::encode_topic(&self.pollId);
                out[2usize] = <alloy::sol_types::sol_data::Address as alloy_sol_types::EventTopic>::encode_topic(
                    &self.voter,
                );
                out[3usize] = <alloy::sol_types::sol_data::Uint<
                    256,
                > as alloy_sol_types::EventTopic>::encode_topic(&self.choice);
                Ok(())
            }
        }
        #[automatically_derived]
        impl alloy_sol_types::private::IntoLogData for Voted {
            fn to_log_data(&self) -> alloy_sol_types::private::LogData {
                From::from(self)
            }
            fn into_log_data(self) -> alloy_sol_types::private::LogData {
                From::from(&self)
            }
        }
        #[automatically_derived]
        impl From<&Voted> for alloy_sol_types::private::LogData {
            #[inline]
            fn from(this: &Voted) -> alloy_sol_types::private::LogData {
                alloy_sol_types::SolEvent::encode_log_data(this)
            }
        }
    };
    #[derive(serde::Serialize, serde::Deserialize)]
    #[derive(Default, Debug, PartialEq, Eq, Hash)]
    /**Event with signature `Winner(bytes32,uint256)` and selector `0x269d3a24712436f77df15d63de7d2337a060c9102dee6f46c909fb0fa2d52f0c`.
```solidity
event Winner(bytes32 indexed pollId, uint256 indexed choice);
```*/
    #[allow(
        non_camel_case_types,
        non_snake_case,
        clippy::pub_underscore_fields,
        clippy::style
    )]
    #[derive(Clone)]
    pub struct Winner {
        #[allow(missing_docs)]
        pub pollId: alloy::sol_types::private::FixedBytes<32>,
        #[allow(missing_docs)]
        pub choice: alloy::sol_types::private::primitives::aliases::U256,
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
        impl alloy_sol_types::SolEvent for Winner {
            type DataTuple<'a> = ();
            type DataToken<'a> = <Self::DataTuple<
                'a,
            > as alloy_sol_types::SolType>::Token<'a>;
            type TopicList = (
                alloy_sol_types::sol_data::FixedBytes<32>,
                alloy::sol_types::sol_data::FixedBytes<32>,
                alloy::sol_types::sol_data::Uint<256>,
            );
            const SIGNATURE: &'static str = "Winner(bytes32,uint256)";
            const SIGNATURE_HASH: alloy_sol_types::private::B256 = alloy_sol_types::private::B256::new([
                38u8, 157u8, 58u8, 36u8, 113u8, 36u8, 54u8, 247u8, 125u8, 241u8, 93u8,
                99u8, 222u8, 125u8, 35u8, 55u8, 160u8, 96u8, 201u8, 16u8, 45u8, 238u8,
                111u8, 70u8, 201u8, 9u8, 251u8, 15u8, 162u8, 213u8, 47u8, 12u8,
            ]);
            const ANONYMOUS: bool = false;
            #[allow(unused_variables)]
            #[inline]
            fn new(
                topics: <Self::TopicList as alloy_sol_types::SolType>::RustType,
                data: <Self::DataTuple<'_> as alloy_sol_types::SolType>::RustType,
            ) -> Self {
                Self {
                    pollId: topics.1,
                    choice: topics.2,
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
                ()
            }
            #[inline]
            fn topics(&self) -> <Self::TopicList as alloy_sol_types::SolType>::RustType {
                (Self::SIGNATURE_HASH.into(), self.pollId.clone(), self.choice.clone())
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
                > as alloy_sol_types::EventTopic>::encode_topic(&self.pollId);
                out[2usize] = <alloy::sol_types::sol_data::Uint<
                    256,
                > as alloy_sol_types::EventTopic>::encode_topic(&self.choice);
                Ok(())
            }
        }
        #[automatically_derived]
        impl alloy_sol_types::private::IntoLogData for Winner {
            fn to_log_data(&self) -> alloy_sol_types::private::LogData {
                From::from(self)
            }
            fn into_log_data(self) -> alloy_sol_types::private::LogData {
                From::from(&self)
            }
        }
        #[automatically_derived]
        impl From<&Winner> for alloy_sol_types::private::LogData {
            #[inline]
            fn from(this: &Winner) -> alloy_sol_types::private::LogData {
                alloy_sol_types::SolEvent::encode_log_data(this)
            }
        }
    };
    #[derive(serde::Serialize, serde::Deserialize)]
    #[derive(Default, Debug, PartialEq, Eq, Hash)]
    /**Function with signature `createPoll(uint64,uint256,address[])` and selector `0xefce8440`.
```solidity
function createPoll(Time.Timestamp deadline, uint256 maxChoice, address[] memory voters) external returns (bytes32 pollId);
```*/
    #[allow(non_camel_case_types, non_snake_case, clippy::pub_underscore_fields)]
    #[derive(Clone)]
    pub struct createPollCall {
        #[allow(missing_docs)]
        pub deadline: <Time::Timestamp as alloy::sol_types::SolType>::RustType,
        #[allow(missing_docs)]
        pub maxChoice: alloy::sol_types::private::primitives::aliases::U256,
        #[allow(missing_docs)]
        pub voters: alloy::sol_types::private::Vec<alloy::sol_types::private::Address>,
    }
    #[derive(serde::Serialize, serde::Deserialize)]
    #[derive(Default, Debug, PartialEq, Eq, Hash)]
    ///Container type for the return parameters of the [`createPoll(uint64,uint256,address[])`](createPollCall) function.
    #[allow(non_camel_case_types, non_snake_case, clippy::pub_underscore_fields)]
    #[derive(Clone)]
    pub struct createPollReturn {
        #[allow(missing_docs)]
        pub pollId: alloy::sol_types::private::FixedBytes<32>,
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
            type UnderlyingSolTuple<'a> = (
                Time::Timestamp,
                alloy::sol_types::sol_data::Uint<256>,
                alloy::sol_types::sol_data::Array<alloy::sol_types::sol_data::Address>,
            );
            #[doc(hidden)]
            type UnderlyingRustTuple<'a> = (
                <Time::Timestamp as alloy::sol_types::SolType>::RustType,
                alloy::sol_types::private::primitives::aliases::U256,
                alloy::sol_types::private::Vec<alloy::sol_types::private::Address>,
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
            impl ::core::convert::From<createPollCall> for UnderlyingRustTuple<'_> {
                fn from(value: createPollCall) -> Self {
                    (value.deadline, value.maxChoice, value.voters)
                }
            }
            #[automatically_derived]
            #[doc(hidden)]
            impl ::core::convert::From<UnderlyingRustTuple<'_>> for createPollCall {
                fn from(tuple: UnderlyingRustTuple<'_>) -> Self {
                    Self {
                        deadline: tuple.0,
                        maxChoice: tuple.1,
                        voters: tuple.2,
                    }
                }
            }
        }
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
            impl ::core::convert::From<createPollReturn> for UnderlyingRustTuple<'_> {
                fn from(value: createPollReturn) -> Self {
                    (value.pollId,)
                }
            }
            #[automatically_derived]
            #[doc(hidden)]
            impl ::core::convert::From<UnderlyingRustTuple<'_>> for createPollReturn {
                fn from(tuple: UnderlyingRustTuple<'_>) -> Self {
                    Self { pollId: tuple.0 }
                }
            }
        }
        #[automatically_derived]
        impl alloy_sol_types::SolCall for createPollCall {
            type Parameters<'a> = (
                Time::Timestamp,
                alloy::sol_types::sol_data::Uint<256>,
                alloy::sol_types::sol_data::Array<alloy::sol_types::sol_data::Address>,
            );
            type Token<'a> = <Self::Parameters<
                'a,
            > as alloy_sol_types::SolType>::Token<'a>;
            type Return = createPollReturn;
            type ReturnTuple<'a> = (alloy::sol_types::sol_data::FixedBytes<32>,);
            type ReturnToken<'a> = <Self::ReturnTuple<
                'a,
            > as alloy_sol_types::SolType>::Token<'a>;
            const SIGNATURE: &'static str = "createPoll(uint64,uint256,address[])";
            const SELECTOR: [u8; 4] = [239u8, 206u8, 132u8, 64u8];
            #[inline]
            fn new<'a>(
                tuple: <Self::Parameters<'a> as alloy_sol_types::SolType>::RustType,
            ) -> Self {
                tuple.into()
            }
            #[inline]
            fn tokenize(&self) -> Self::Token<'_> {
                (
                    <Time::Timestamp as alloy_sol_types::SolType>::tokenize(
                        &self.deadline,
                    ),
                    <alloy::sol_types::sol_data::Uint<
                        256,
                    > as alloy_sol_types::SolType>::tokenize(&self.maxChoice),
                    <alloy::sol_types::sol_data::Array<
                        alloy::sol_types::sol_data::Address,
                    > as alloy_sol_types::SolType>::tokenize(&self.voters),
                )
            }
            #[inline]
            fn abi_decode_returns(
                data: &[u8],
                validate: bool,
            ) -> alloy_sol_types::Result<Self::Return> {
                <Self::ReturnTuple<
                    '_,
                > as alloy_sol_types::SolType>::abi_decode_sequence(data, validate)
                    .map(Into::into)
            }
        }
    };
    #[derive(serde::Serialize, serde::Deserialize)]
    #[derive(Default, Debug, PartialEq, Eq, Hash)]
    /**Function with signature `getPollId(uint64,uint256,address,address[])` and selector `0xd9207fea`.
```solidity
function getPollId(Time.Timestamp deadline, uint256 maxChoice, address owner, address[] memory voters) external pure returns (bytes32 pollId);
```*/
    #[allow(non_camel_case_types, non_snake_case, clippy::pub_underscore_fields)]
    #[derive(Clone)]
    pub struct getPollIdCall {
        #[allow(missing_docs)]
        pub deadline: <Time::Timestamp as alloy::sol_types::SolType>::RustType,
        #[allow(missing_docs)]
        pub maxChoice: alloy::sol_types::private::primitives::aliases::U256,
        #[allow(missing_docs)]
        pub owner: alloy::sol_types::private::Address,
        #[allow(missing_docs)]
        pub voters: alloy::sol_types::private::Vec<alloy::sol_types::private::Address>,
    }
    #[derive(serde::Serialize, serde::Deserialize)]
    #[derive(Default, Debug, PartialEq, Eq, Hash)]
    ///Container type for the return parameters of the [`getPollId(uint64,uint256,address,address[])`](getPollIdCall) function.
    #[allow(non_camel_case_types, non_snake_case, clippy::pub_underscore_fields)]
    #[derive(Clone)]
    pub struct getPollIdReturn {
        #[allow(missing_docs)]
        pub pollId: alloy::sol_types::private::FixedBytes<32>,
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
            type UnderlyingSolTuple<'a> = (
                Time::Timestamp,
                alloy::sol_types::sol_data::Uint<256>,
                alloy::sol_types::sol_data::Address,
                alloy::sol_types::sol_data::Array<alloy::sol_types::sol_data::Address>,
            );
            #[doc(hidden)]
            type UnderlyingRustTuple<'a> = (
                <Time::Timestamp as alloy::sol_types::SolType>::RustType,
                alloy::sol_types::private::primitives::aliases::U256,
                alloy::sol_types::private::Address,
                alloy::sol_types::private::Vec<alloy::sol_types::private::Address>,
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
            impl ::core::convert::From<getPollIdCall> for UnderlyingRustTuple<'_> {
                fn from(value: getPollIdCall) -> Self {
                    (value.deadline, value.maxChoice, value.owner, value.voters)
                }
            }
            #[automatically_derived]
            #[doc(hidden)]
            impl ::core::convert::From<UnderlyingRustTuple<'_>> for getPollIdCall {
                fn from(tuple: UnderlyingRustTuple<'_>) -> Self {
                    Self {
                        deadline: tuple.0,
                        maxChoice: tuple.1,
                        owner: tuple.2,
                        voters: tuple.3,
                    }
                }
            }
        }
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
            impl ::core::convert::From<getPollIdReturn> for UnderlyingRustTuple<'_> {
                fn from(value: getPollIdReturn) -> Self {
                    (value.pollId,)
                }
            }
            #[automatically_derived]
            #[doc(hidden)]
            impl ::core::convert::From<UnderlyingRustTuple<'_>> for getPollIdReturn {
                fn from(tuple: UnderlyingRustTuple<'_>) -> Self {
                    Self { pollId: tuple.0 }
                }
            }
        }
        #[automatically_derived]
        impl alloy_sol_types::SolCall for getPollIdCall {
            type Parameters<'a> = (
                Time::Timestamp,
                alloy::sol_types::sol_data::Uint<256>,
                alloy::sol_types::sol_data::Address,
                alloy::sol_types::sol_data::Array<alloy::sol_types::sol_data::Address>,
            );
            type Token<'a> = <Self::Parameters<
                'a,
            > as alloy_sol_types::SolType>::Token<'a>;
            type Return = getPollIdReturn;
            type ReturnTuple<'a> = (alloy::sol_types::sol_data::FixedBytes<32>,);
            type ReturnToken<'a> = <Self::ReturnTuple<
                'a,
            > as alloy_sol_types::SolType>::Token<'a>;
            const SIGNATURE: &'static str = "getPollId(uint64,uint256,address,address[])";
            const SELECTOR: [u8; 4] = [217u8, 32u8, 127u8, 234u8];
            #[inline]
            fn new<'a>(
                tuple: <Self::Parameters<'a> as alloy_sol_types::SolType>::RustType,
            ) -> Self {
                tuple.into()
            }
            #[inline]
            fn tokenize(&self) -> Self::Token<'_> {
                (
                    <Time::Timestamp as alloy_sol_types::SolType>::tokenize(
                        &self.deadline,
                    ),
                    <alloy::sol_types::sol_data::Uint<
                        256,
                    > as alloy_sol_types::SolType>::tokenize(&self.maxChoice),
                    <alloy::sol_types::sol_data::Address as alloy_sol_types::SolType>::tokenize(
                        &self.owner,
                    ),
                    <alloy::sol_types::sol_data::Array<
                        alloy::sol_types::sol_data::Address,
                    > as alloy_sol_types::SolType>::tokenize(&self.voters),
                )
            }
            #[inline]
            fn abi_decode_returns(
                data: &[u8],
                validate: bool,
            ) -> alloy_sol_types::Result<Self::Return> {
                <Self::ReturnTuple<
                    '_,
                > as alloy_sol_types::SolType>::abi_decode_sequence(data, validate)
                    .map(Into::into)
            }
        }
    };
    #[derive(serde::Serialize, serde::Deserialize)]
    #[derive(Default, Debug, PartialEq, Eq, Hash)]
    /**Function with signature `getVotes(bytes32)` and selector `0x4c051100`.
```solidity
function getVotes(bytes32 pollId) external view returns (uint256 participants, uint256[] memory votes);
```*/
    #[allow(non_camel_case_types, non_snake_case, clippy::pub_underscore_fields)]
    #[derive(Clone)]
    pub struct getVotesCall {
        #[allow(missing_docs)]
        pub pollId: alloy::sol_types::private::FixedBytes<32>,
    }
    #[derive(serde::Serialize, serde::Deserialize)]
    #[derive(Default, Debug, PartialEq, Eq, Hash)]
    ///Container type for the return parameters of the [`getVotes(bytes32)`](getVotesCall) function.
    #[allow(non_camel_case_types, non_snake_case, clippy::pub_underscore_fields)]
    #[derive(Clone)]
    pub struct getVotesReturn {
        #[allow(missing_docs)]
        pub participants: alloy::sol_types::private::primitives::aliases::U256,
        #[allow(missing_docs)]
        pub votes: alloy::sol_types::private::Vec<
            alloy::sol_types::private::primitives::aliases::U256,
        >,
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
            impl ::core::convert::From<getVotesCall> for UnderlyingRustTuple<'_> {
                fn from(value: getVotesCall) -> Self {
                    (value.pollId,)
                }
            }
            #[automatically_derived]
            #[doc(hidden)]
            impl ::core::convert::From<UnderlyingRustTuple<'_>> for getVotesCall {
                fn from(tuple: UnderlyingRustTuple<'_>) -> Self {
                    Self { pollId: tuple.0 }
                }
            }
        }
        {
            #[doc(hidden)]
            type UnderlyingSolTuple<'a> = (
                alloy::sol_types::sol_data::Uint<256>,
                alloy::sol_types::sol_data::Array<alloy::sol_types::sol_data::Uint<256>>,
            );
            #[doc(hidden)]
            type UnderlyingRustTuple<'a> = (
                alloy::sol_types::private::primitives::aliases::U256,
                alloy::sol_types::private::Vec<
                    alloy::sol_types::private::primitives::aliases::U256,
                >,
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
            impl ::core::convert::From<getVotesReturn> for UnderlyingRustTuple<'_> {
                fn from(value: getVotesReturn) -> Self {
                    (value.participants, value.votes)
                }
            }
            #[automatically_derived]
            #[doc(hidden)]
            impl ::core::convert::From<UnderlyingRustTuple<'_>> for getVotesReturn {
                fn from(tuple: UnderlyingRustTuple<'_>) -> Self {
                    Self {
                        participants: tuple.0,
                        votes: tuple.1,
                    }
                }
            }
        }
        #[automatically_derived]
        impl alloy_sol_types::SolCall for getVotesCall {
            type Parameters<'a> = (alloy::sol_types::sol_data::FixedBytes<32>,);
            type Token<'a> = <Self::Parameters<
                'a,
            > as alloy_sol_types::SolType>::Token<'a>;
            type Return = getVotesReturn;
            type ReturnTuple<'a> = (
                alloy::sol_types::sol_data::Uint<256>,
                alloy::sol_types::sol_data::Array<alloy::sol_types::sol_data::Uint<256>>,
            );
            type ReturnToken<'a> = <Self::ReturnTuple<
                'a,
            > as alloy_sol_types::SolType>::Token<'a>;
            const SIGNATURE: &'static str = "getVotes(bytes32)";
            const SELECTOR: [u8; 4] = [76u8, 5u8, 17u8, 0u8];
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
                    > as alloy_sol_types::SolType>::tokenize(&self.pollId),
                )
            }
            #[inline]
            fn abi_decode_returns(
                data: &[u8],
                validate: bool,
            ) -> alloy_sol_types::Result<Self::Return> {
                <Self::ReturnTuple<
                    '_,
                > as alloy_sol_types::SolType>::abi_decode_sequence(data, validate)
                    .map(Into::into)
            }
        }
    };
    #[derive(serde::Serialize, serde::Deserialize)]
    #[derive(Default, Debug, PartialEq, Eq, Hash)]
    /**Function with signature `setWinningChoice(bytes32,uint256)` and selector `0x098cf966`.
```solidity
function setWinningChoice(bytes32 pollId, uint256 choice) external;
```*/
    #[allow(non_camel_case_types, non_snake_case, clippy::pub_underscore_fields)]
    #[derive(Clone)]
    pub struct setWinningChoiceCall {
        #[allow(missing_docs)]
        pub pollId: alloy::sol_types::private::FixedBytes<32>,
        #[allow(missing_docs)]
        pub choice: alloy::sol_types::private::primitives::aliases::U256,
    }
    ///Container type for the return parameters of the [`setWinningChoice(bytes32,uint256)`](setWinningChoiceCall) function.
    #[allow(non_camel_case_types, non_snake_case, clippy::pub_underscore_fields)]
    #[derive(Clone)]
    pub struct setWinningChoiceReturn {}
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
                alloy::sol_types::sol_data::Uint<256>,
            );
            #[doc(hidden)]
            type UnderlyingRustTuple<'a> = (
                alloy::sol_types::private::FixedBytes<32>,
                alloy::sol_types::private::primitives::aliases::U256,
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
            impl ::core::convert::From<setWinningChoiceCall>
            for UnderlyingRustTuple<'_> {
                fn from(value: setWinningChoiceCall) -> Self {
                    (value.pollId, value.choice)
                }
            }
            #[automatically_derived]
            #[doc(hidden)]
            impl ::core::convert::From<UnderlyingRustTuple<'_>>
            for setWinningChoiceCall {
                fn from(tuple: UnderlyingRustTuple<'_>) -> Self {
                    Self {
                        pollId: tuple.0,
                        choice: tuple.1,
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
            impl ::core::convert::From<setWinningChoiceReturn>
            for UnderlyingRustTuple<'_> {
                fn from(value: setWinningChoiceReturn) -> Self {
                    ()
                }
            }
            #[automatically_derived]
            #[doc(hidden)]
            impl ::core::convert::From<UnderlyingRustTuple<'_>>
            for setWinningChoiceReturn {
                fn from(tuple: UnderlyingRustTuple<'_>) -> Self {
                    Self {}
                }
            }
        }
        #[automatically_derived]
        impl alloy_sol_types::SolCall for setWinningChoiceCall {
            type Parameters<'a> = (
                alloy::sol_types::sol_data::FixedBytes<32>,
                alloy::sol_types::sol_data::Uint<256>,
            );
            type Token<'a> = <Self::Parameters<
                'a,
            > as alloy_sol_types::SolType>::Token<'a>;
            type Return = setWinningChoiceReturn;
            type ReturnTuple<'a> = ();
            type ReturnToken<'a> = <Self::ReturnTuple<
                'a,
            > as alloy_sol_types::SolType>::Token<'a>;
            const SIGNATURE: &'static str = "setWinningChoice(bytes32,uint256)";
            const SELECTOR: [u8; 4] = [9u8, 140u8, 249u8, 102u8];
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
                    > as alloy_sol_types::SolType>::tokenize(&self.pollId),
                    <alloy::sol_types::sol_data::Uint<
                        256,
                    > as alloy_sol_types::SolType>::tokenize(&self.choice),
                )
            }
            #[inline]
            fn abi_decode_returns(
                data: &[u8],
                validate: bool,
            ) -> alloy_sol_types::Result<Self::Return> {
                <Self::ReturnTuple<
                    '_,
                > as alloy_sol_types::SolType>::abi_decode_sequence(data, validate)
                    .map(Into::into)
            }
        }
    };
    #[derive(serde::Serialize, serde::Deserialize)]
    #[derive(Default, Debug, PartialEq, Eq, Hash)]
    /**Function with signature `vote(bytes32,uint256)` and selector `0x9ef1204c`.
```solidity
function vote(bytes32 pollId, uint256 choice) external;
```*/
    #[allow(non_camel_case_types, non_snake_case, clippy::pub_underscore_fields)]
    #[derive(Clone)]
    pub struct voteCall {
        #[allow(missing_docs)]
        pub pollId: alloy::sol_types::private::FixedBytes<32>,
        #[allow(missing_docs)]
        pub choice: alloy::sol_types::private::primitives::aliases::U256,
    }
    ///Container type for the return parameters of the [`vote(bytes32,uint256)`](voteCall) function.
    #[allow(non_camel_case_types, non_snake_case, clippy::pub_underscore_fields)]
    #[derive(Clone)]
    pub struct voteReturn {}
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
                alloy::sol_types::sol_data::Uint<256>,
            );
            #[doc(hidden)]
            type UnderlyingRustTuple<'a> = (
                alloy::sol_types::private::FixedBytes<32>,
                alloy::sol_types::private::primitives::aliases::U256,
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
            impl ::core::convert::From<voteCall> for UnderlyingRustTuple<'_> {
                fn from(value: voteCall) -> Self {
                    (value.pollId, value.choice)
                }
            }
            #[automatically_derived]
            #[doc(hidden)]
            impl ::core::convert::From<UnderlyingRustTuple<'_>> for voteCall {
                fn from(tuple: UnderlyingRustTuple<'_>) -> Self {
                    Self {
                        pollId: tuple.0,
                        choice: tuple.1,
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
            impl ::core::convert::From<voteReturn> for UnderlyingRustTuple<'_> {
                fn from(value: voteReturn) -> Self {
                    ()
                }
            }
            #[automatically_derived]
            #[doc(hidden)]
            impl ::core::convert::From<UnderlyingRustTuple<'_>> for voteReturn {
                fn from(tuple: UnderlyingRustTuple<'_>) -> Self {
                    Self {}
                }
            }
        }
        #[automatically_derived]
        impl alloy_sol_types::SolCall for voteCall {
            type Parameters<'a> = (
                alloy::sol_types::sol_data::FixedBytes<32>,
                alloy::sol_types::sol_data::Uint<256>,
            );
            type Token<'a> = <Self::Parameters<
                'a,
            > as alloy_sol_types::SolType>::Token<'a>;
            type Return = voteReturn;
            type ReturnTuple<'a> = ();
            type ReturnToken<'a> = <Self::ReturnTuple<
                'a,
            > as alloy_sol_types::SolType>::Token<'a>;
            const SIGNATURE: &'static str = "vote(bytes32,uint256)";
            const SELECTOR: [u8; 4] = [158u8, 241u8, 32u8, 76u8];
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
                    > as alloy_sol_types::SolType>::tokenize(&self.pollId),
                    <alloy::sol_types::sol_data::Uint<
                        256,
                    > as alloy_sol_types::SolType>::tokenize(&self.choice),
                )
            }
            #[inline]
            fn abi_decode_returns(
                data: &[u8],
                validate: bool,
            ) -> alloy_sol_types::Result<Self::Return> {
                <Self::ReturnTuple<
                    '_,
                > as alloy_sol_types::SolType>::abi_decode_sequence(data, validate)
                    .map(Into::into)
            }
        }
    };
    ///Container for all the [`Voting`](self) function calls.
    #[derive(serde::Serialize, serde::Deserialize)]
    #[derive()]
    pub enum VotingCalls {
        #[allow(missing_docs)]
        createPoll(createPollCall),
        #[allow(missing_docs)]
        getPollId(getPollIdCall),
        #[allow(missing_docs)]
        getVotes(getVotesCall),
        #[allow(missing_docs)]
        setWinningChoice(setWinningChoiceCall),
        #[allow(missing_docs)]
        vote(voteCall),
    }
    #[automatically_derived]
    impl VotingCalls {
        /// All the selectors of this enum.
        ///
        /// Note that the selectors might not be in the same order as the variants.
        /// No guarantees are made about the order of the selectors.
        ///
        /// Prefer using `SolInterface` methods instead.
        pub const SELECTORS: &'static [[u8; 4usize]] = &[
            [9u8, 140u8, 249u8, 102u8],
            [76u8, 5u8, 17u8, 0u8],
            [158u8, 241u8, 32u8, 76u8],
            [217u8, 32u8, 127u8, 234u8],
            [239u8, 206u8, 132u8, 64u8],
        ];
    }
    #[automatically_derived]
    impl alloy_sol_types::SolInterface for VotingCalls {
        const NAME: &'static str = "VotingCalls";
        const MIN_DATA_LENGTH: usize = 32usize;
        const COUNT: usize = 5usize;
        #[inline]
        fn selector(&self) -> [u8; 4] {
            match self {
                Self::createPoll(_) => {
                    <createPollCall as alloy_sol_types::SolCall>::SELECTOR
                }
                Self::getPollId(_) => {
                    <getPollIdCall as alloy_sol_types::SolCall>::SELECTOR
                }
                Self::getVotes(_) => <getVotesCall as alloy_sol_types::SolCall>::SELECTOR,
                Self::setWinningChoice(_) => {
                    <setWinningChoiceCall as alloy_sol_types::SolCall>::SELECTOR
                }
                Self::vote(_) => <voteCall as alloy_sol_types::SolCall>::SELECTOR,
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
            validate: bool,
        ) -> alloy_sol_types::Result<Self> {
            static DECODE_SHIMS: &[fn(
                &[u8],
                bool,
            ) -> alloy_sol_types::Result<VotingCalls>] = &[
                {
                    fn setWinningChoice(
                        data: &[u8],
                        validate: bool,
                    ) -> alloy_sol_types::Result<VotingCalls> {
                        <setWinningChoiceCall as alloy_sol_types::SolCall>::abi_decode_raw(
                                data,
                                validate,
                            )
                            .map(VotingCalls::setWinningChoice)
                    }
                    setWinningChoice
                },
                {
                    fn getVotes(
                        data: &[u8],
                        validate: bool,
                    ) -> alloy_sol_types::Result<VotingCalls> {
                        <getVotesCall as alloy_sol_types::SolCall>::abi_decode_raw(
                                data,
                                validate,
                            )
                            .map(VotingCalls::getVotes)
                    }
                    getVotes
                },
                {
                    fn vote(
                        data: &[u8],
                        validate: bool,
                    ) -> alloy_sol_types::Result<VotingCalls> {
                        <voteCall as alloy_sol_types::SolCall>::abi_decode_raw(
                                data,
                                validate,
                            )
                            .map(VotingCalls::vote)
                    }
                    vote
                },
                {
                    fn getPollId(
                        data: &[u8],
                        validate: bool,
                    ) -> alloy_sol_types::Result<VotingCalls> {
                        <getPollIdCall as alloy_sol_types::SolCall>::abi_decode_raw(
                                data,
                                validate,
                            )
                            .map(VotingCalls::getPollId)
                    }
                    getPollId
                },
                {
                    fn createPoll(
                        data: &[u8],
                        validate: bool,
                    ) -> alloy_sol_types::Result<VotingCalls> {
                        <createPollCall as alloy_sol_types::SolCall>::abi_decode_raw(
                                data,
                                validate,
                            )
                            .map(VotingCalls::createPoll)
                    }
                    createPoll
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
            DECODE_SHIMS[idx](data, validate)
        }
        #[inline]
        fn abi_encoded_size(&self) -> usize {
            match self {
                Self::createPoll(inner) => {
                    <createPollCall as alloy_sol_types::SolCall>::abi_encoded_size(inner)
                }
                Self::getPollId(inner) => {
                    <getPollIdCall as alloy_sol_types::SolCall>::abi_encoded_size(inner)
                }
                Self::getVotes(inner) => {
                    <getVotesCall as alloy_sol_types::SolCall>::abi_encoded_size(inner)
                }
                Self::setWinningChoice(inner) => {
                    <setWinningChoiceCall as alloy_sol_types::SolCall>::abi_encoded_size(
                        inner,
                    )
                }
                Self::vote(inner) => {
                    <voteCall as alloy_sol_types::SolCall>::abi_encoded_size(inner)
                }
            }
        }
        #[inline]
        fn abi_encode_raw(&self, out: &mut alloy_sol_types::private::Vec<u8>) {
            match self {
                Self::createPoll(inner) => {
                    <createPollCall as alloy_sol_types::SolCall>::abi_encode_raw(
                        inner,
                        out,
                    )
                }
                Self::getPollId(inner) => {
                    <getPollIdCall as alloy_sol_types::SolCall>::abi_encode_raw(
                        inner,
                        out,
                    )
                }
                Self::getVotes(inner) => {
                    <getVotesCall as alloy_sol_types::SolCall>::abi_encode_raw(
                        inner,
                        out,
                    )
                }
                Self::setWinningChoice(inner) => {
                    <setWinningChoiceCall as alloy_sol_types::SolCall>::abi_encode_raw(
                        inner,
                        out,
                    )
                }
                Self::vote(inner) => {
                    <voteCall as alloy_sol_types::SolCall>::abi_encode_raw(inner, out)
                }
            }
        }
    }
    ///Container for all the [`Voting`](self) events.
    #[derive(serde::Serialize, serde::Deserialize)]
    #[derive(Debug, PartialEq, Eq, Hash)]
    pub enum VotingEvents {
        #[allow(missing_docs)]
        PollCreated(PollCreated),
        #[allow(missing_docs)]
        Voted(Voted),
        #[allow(missing_docs)]
        Winner(Winner),
    }
    #[automatically_derived]
    impl VotingEvents {
        /// All the selectors of this enum.
        ///
        /// Note that the selectors might not be in the same order as the variants.
        /// No guarantees are made about the order of the selectors.
        ///
        /// Prefer using `SolInterface` methods instead.
        pub const SELECTORS: &'static [[u8; 32usize]] = &[
            [
                38u8, 157u8, 58u8, 36u8, 113u8, 36u8, 54u8, 247u8, 125u8, 241u8, 93u8,
                99u8, 222u8, 125u8, 35u8, 55u8, 160u8, 96u8, 201u8, 16u8, 45u8, 238u8,
                111u8, 70u8, 201u8, 9u8, 251u8, 15u8, 162u8, 213u8, 47u8, 12u8,
            ],
            [
                135u8, 0u8, 99u8, 118u8, 99u8, 247u8, 132u8, 26u8, 157u8, 164u8, 223u8,
                172u8, 223u8, 94u8, 161u8, 176u8, 233u8, 169u8, 122u8, 131u8, 0u8, 3u8,
                142u8, 114u8, 67u8, 23u8, 100u8, 128u8, 21u8, 102u8, 102u8, 247u8,
            ],
            [
                228u8, 171u8, 197u8, 56u8, 15u8, 166u8, 147u8, 157u8, 29u8, 194u8, 59u8,
                94u8, 144u8, 179u8, 168u8, 160u8, 227u8, 40u8, 240u8, 241u8, 168u8, 42u8,
                95u8, 66u8, 191u8, 183u8, 149u8, 191u8, 156u8, 113u8, 117u8, 5u8,
            ],
        ];
    }
    #[automatically_derived]
    impl alloy_sol_types::SolEventInterface for VotingEvents {
        const NAME: &'static str = "VotingEvents";
        const COUNT: usize = 3usize;
        fn decode_raw_log(
            topics: &[alloy_sol_types::Word],
            data: &[u8],
            validate: bool,
        ) -> alloy_sol_types::Result<Self> {
            match topics.first().copied() {
                Some(<PollCreated as alloy_sol_types::SolEvent>::SIGNATURE_HASH) => {
                    <PollCreated as alloy_sol_types::SolEvent>::decode_raw_log(
                            topics,
                            data,
                            validate,
                        )
                        .map(Self::PollCreated)
                }
                Some(<Voted as alloy_sol_types::SolEvent>::SIGNATURE_HASH) => {
                    <Voted as alloy_sol_types::SolEvent>::decode_raw_log(
                            topics,
                            data,
                            validate,
                        )
                        .map(Self::Voted)
                }
                Some(<Winner as alloy_sol_types::SolEvent>::SIGNATURE_HASH) => {
                    <Winner as alloy_sol_types::SolEvent>::decode_raw_log(
                            topics,
                            data,
                            validate,
                        )
                        .map(Self::Winner)
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
    impl alloy_sol_types::private::IntoLogData for VotingEvents {
        fn to_log_data(&self) -> alloy_sol_types::private::LogData {
            match self {
                Self::PollCreated(inner) => {
                    alloy_sol_types::private::IntoLogData::to_log_data(inner)
                }
                Self::Voted(inner) => {
                    alloy_sol_types::private::IntoLogData::to_log_data(inner)
                }
                Self::Winner(inner) => {
                    alloy_sol_types::private::IntoLogData::to_log_data(inner)
                }
            }
        }
        fn into_log_data(self) -> alloy_sol_types::private::LogData {
            match self {
                Self::PollCreated(inner) => {
                    alloy_sol_types::private::IntoLogData::into_log_data(inner)
                }
                Self::Voted(inner) => {
                    alloy_sol_types::private::IntoLogData::into_log_data(inner)
                }
                Self::Winner(inner) => {
                    alloy_sol_types::private::IntoLogData::into_log_data(inner)
                }
            }
        }
    }
    use alloy::contract as alloy_contract;
    /**Creates a new wrapper around an on-chain [`Voting`](self) contract instance.

See the [wrapper's documentation](`VotingInstance`) for more details.*/
    #[inline]
    pub const fn new<
        T: alloy_contract::private::Transport + ::core::clone::Clone,
        P: alloy_contract::private::Provider<T, N>,
        N: alloy_contract::private::Network,
    >(
        address: alloy_sol_types::private::Address,
        provider: P,
    ) -> VotingInstance<T, P, N> {
        VotingInstance::<T, P, N>::new(address, provider)
    }
    /**Deploys this contract using the given `provider` and constructor arguments, if any.

Returns a new instance of the contract, if the deployment was successful.

For more fine-grained control over the deployment process, use [`deploy_builder`] instead.*/
    #[inline]
    pub fn deploy<
        T: alloy_contract::private::Transport + ::core::clone::Clone,
        P: alloy_contract::private::Provider<T, N>,
        N: alloy_contract::private::Network,
    >(
        provider: P,
    ) -> impl ::core::future::Future<
        Output = alloy_contract::Result<VotingInstance<T, P, N>>,
    > {
        VotingInstance::<T, P, N>::deploy(provider)
    }
    /**Creates a `RawCallBuilder` for deploying this contract using the given `provider`
and constructor arguments, if any.

This is a simple wrapper around creating a `RawCallBuilder` with the data set to
the bytecode concatenated with the constructor's ABI-encoded arguments.*/
    #[inline]
    pub fn deploy_builder<
        T: alloy_contract::private::Transport + ::core::clone::Clone,
        P: alloy_contract::private::Provider<T, N>,
        N: alloy_contract::private::Network,
    >(provider: P) -> alloy_contract::RawCallBuilder<T, P, N> {
        VotingInstance::<T, P, N>::deploy_builder(provider)
    }
    /**A [`Voting`](self) instance.

Contains type-safe methods for interacting with an on-chain instance of the
[`Voting`](self) contract located at a given `address`, using a given
provider `P`.

If the contract bytecode is available (see the [`sol!`](alloy_sol_types::sol!)
documentation on how to provide it), the `deploy` and `deploy_builder` methods can
be used to deploy a new instance of the contract.

See the [module-level documentation](self) for all the available methods.*/
    #[derive(Clone)]
    pub struct VotingInstance<T, P, N = alloy_contract::private::Ethereum> {
        address: alloy_sol_types::private::Address,
        provider: P,
        _network_transport: ::core::marker::PhantomData<(N, T)>,
    }
    #[automatically_derived]
    impl<T, P, N> ::core::fmt::Debug for VotingInstance<T, P, N> {
        #[inline]
        fn fmt(&self, f: &mut ::core::fmt::Formatter<'_>) -> ::core::fmt::Result {
            f.debug_tuple("VotingInstance").field(&self.address).finish()
        }
    }
    /// Instantiation and getters/setters.
    #[automatically_derived]
    impl<
        T: alloy_contract::private::Transport + ::core::clone::Clone,
        P: alloy_contract::private::Provider<T, N>,
        N: alloy_contract::private::Network,
    > VotingInstance<T, P, N> {
        /**Creates a new wrapper around an on-chain [`Voting`](self) contract instance.

See the [wrapper's documentation](`VotingInstance`) for more details.*/
        #[inline]
        pub const fn new(
            address: alloy_sol_types::private::Address,
            provider: P,
        ) -> Self {
            Self {
                address,
                provider,
                _network_transport: ::core::marker::PhantomData,
            }
        }
        /**Deploys this contract using the given `provider` and constructor arguments, if any.

Returns a new instance of the contract, if the deployment was successful.

For more fine-grained control over the deployment process, use [`deploy_builder`] instead.*/
        #[inline]
        pub async fn deploy(
            provider: P,
        ) -> alloy_contract::Result<VotingInstance<T, P, N>> {
            let call_builder = Self::deploy_builder(provider);
            let contract_address = call_builder.deploy().await?;
            Ok(Self::new(contract_address, call_builder.provider))
        }
        /**Creates a `RawCallBuilder` for deploying this contract using the given `provider`
and constructor arguments, if any.

This is a simple wrapper around creating a `RawCallBuilder` with the data set to
the bytecode concatenated with the constructor's ABI-encoded arguments.*/
        #[inline]
        pub fn deploy_builder(provider: P) -> alloy_contract::RawCallBuilder<T, P, N> {
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
    impl<T, P: ::core::clone::Clone, N> VotingInstance<T, &P, N> {
        /// Clones the provider and returns a new instance with the cloned provider.
        #[inline]
        pub fn with_cloned_provider(self) -> VotingInstance<T, P, N> {
            VotingInstance {
                address: self.address,
                provider: ::core::clone::Clone::clone(&self.provider),
                _network_transport: ::core::marker::PhantomData,
            }
        }
    }
    /// Function calls.
    #[automatically_derived]
    impl<
        T: alloy_contract::private::Transport + ::core::clone::Clone,
        P: alloy_contract::private::Provider<T, N>,
        N: alloy_contract::private::Network,
    > VotingInstance<T, P, N> {
        /// Creates a new call builder using this contract instance's provider and address.
        ///
        /// Note that the call can be any function call, not just those defined in this
        /// contract. Prefer using the other methods for building type-safe contract calls.
        pub fn call_builder<C: alloy_sol_types::SolCall>(
            &self,
            call: &C,
        ) -> alloy_contract::SolCallBuilder<T, &P, C, N> {
            alloy_contract::SolCallBuilder::new_sol(&self.provider, &self.address, call)
        }
        ///Creates a new call builder for the [`createPoll`] function.
        pub fn createPoll(
            &self,
            deadline: <Time::Timestamp as alloy::sol_types::SolType>::RustType,
            maxChoice: alloy::sol_types::private::primitives::aliases::U256,
            voters: alloy::sol_types::private::Vec<alloy::sol_types::private::Address>,
        ) -> alloy_contract::SolCallBuilder<T, &P, createPollCall, N> {
            self.call_builder(
                &createPollCall {
                    deadline,
                    maxChoice,
                    voters,
                },
            )
        }
        ///Creates a new call builder for the [`getPollId`] function.
        pub fn getPollId(
            &self,
            deadline: <Time::Timestamp as alloy::sol_types::SolType>::RustType,
            maxChoice: alloy::sol_types::private::primitives::aliases::U256,
            owner: alloy::sol_types::private::Address,
            voters: alloy::sol_types::private::Vec<alloy::sol_types::private::Address>,
        ) -> alloy_contract::SolCallBuilder<T, &P, getPollIdCall, N> {
            self.call_builder(
                &getPollIdCall {
                    deadline,
                    maxChoice,
                    owner,
                    voters,
                },
            )
        }
        ///Creates a new call builder for the [`getVotes`] function.
        pub fn getVotes(
            &self,
            pollId: alloy::sol_types::private::FixedBytes<32>,
        ) -> alloy_contract::SolCallBuilder<T, &P, getVotesCall, N> {
            self.call_builder(&getVotesCall { pollId })
        }
        ///Creates a new call builder for the [`setWinningChoice`] function.
        pub fn setWinningChoice(
            &self,
            pollId: alloy::sol_types::private::FixedBytes<32>,
            choice: alloy::sol_types::private::primitives::aliases::U256,
        ) -> alloy_contract::SolCallBuilder<T, &P, setWinningChoiceCall, N> {
            self.call_builder(
                &setWinningChoiceCall {
                    pollId,
                    choice,
                },
            )
        }
        ///Creates a new call builder for the [`vote`] function.
        pub fn vote(
            &self,
            pollId: alloy::sol_types::private::FixedBytes<32>,
            choice: alloy::sol_types::private::primitives::aliases::U256,
        ) -> alloy_contract::SolCallBuilder<T, &P, voteCall, N> {
            self.call_builder(&voteCall { pollId, choice })
        }
    }
    /// Event filters.
    #[automatically_derived]
    impl<
        T: alloy_contract::private::Transport + ::core::clone::Clone,
        P: alloy_contract::private::Provider<T, N>,
        N: alloy_contract::private::Network,
    > VotingInstance<T, P, N> {
        /// Creates a new event filter using this contract instance's provider and address.
        ///
        /// Note that the type can be any event, not just those defined in this contract.
        /// Prefer using the other methods for building type-safe event filters.
        pub fn event_filter<E: alloy_sol_types::SolEvent>(
            &self,
        ) -> alloy_contract::Event<T, &P, E, N> {
            alloy_contract::Event::new_sol(&self.provider, &self.address)
        }
        ///Creates a new event filter for the [`PollCreated`] event.
        pub fn PollCreated_filter(
            &self,
        ) -> alloy_contract::Event<T, &P, PollCreated, N> {
            self.event_filter::<PollCreated>()
        }
        ///Creates a new event filter for the [`Voted`] event.
        pub fn Voted_filter(&self) -> alloy_contract::Event<T, &P, Voted, N> {
            self.event_filter::<Voted>()
        }
        ///Creates a new event filter for the [`Winner`] event.
        pub fn Winner_filter(&self) -> alloy_contract::Event<T, &P, Winner, N> {
            self.event_filter::<Winner>()
        }
    }
}
