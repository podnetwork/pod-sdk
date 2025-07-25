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
    struct VotingInfo {
        uint256 threshold;
        Time.Timestamp deadline;
        uint256 nonce;
        address owner;
    }

    event Voted(bytes32 indexed votingId, address indexed voter, uint256 indexed choice);
    event Winner(bytes32 indexed votingId, uint256 indexed choice);

    function register(VotingInfo memory v) external;
    function setWinner(VotingInfo memory v, uint256 choice) external;
    function vote(VotingInfo memory v, uint256 choice) external;
    function votingId(VotingInfo memory v) external pure returns (bytes32);
}
```

...which was generated by the following JSON ABI:
```json
[
  {
    "type": "function",
    "name": "register",
    "inputs": [
      {
        "name": "v",
        "type": "tuple",
        "internalType": "struct Voting.VotingInfo",
        "components": [
          {
            "name": "threshold",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "deadline",
            "type": "uint64",
            "internalType": "Time.Timestamp"
          },
          {
            "name": "nonce",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "owner",
            "type": "address",
            "internalType": "address"
          }
        ]
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setWinner",
    "inputs": [
      {
        "name": "v",
        "type": "tuple",
        "internalType": "struct Voting.VotingInfo",
        "components": [
          {
            "name": "threshold",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "deadline",
            "type": "uint64",
            "internalType": "Time.Timestamp"
          },
          {
            "name": "nonce",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "owner",
            "type": "address",
            "internalType": "address"
          }
        ]
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
        "name": "v",
        "type": "tuple",
        "internalType": "struct Voting.VotingInfo",
        "components": [
          {
            "name": "threshold",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "deadline",
            "type": "uint64",
            "internalType": "Time.Timestamp"
          },
          {
            "name": "nonce",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "owner",
            "type": "address",
            "internalType": "address"
          }
        ]
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
    "name": "votingId",
    "inputs": [
      {
        "name": "v",
        "type": "tuple",
        "internalType": "struct Voting.VotingInfo",
        "components": [
          {
            "name": "threshold",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "deadline",
            "type": "uint64",
            "internalType": "Time.Timestamp"
          },
          {
            "name": "nonce",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "owner",
            "type": "address",
            "internalType": "address"
          }
        ]
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "pure"
  },
  {
    "type": "event",
    "name": "Voted",
    "inputs": [
      {
        "name": "votingId",
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
        "name": "votingId",
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
    ///0x6080604052348015600f57600080fd5b506110f38061001f6000396000f3fe608060405234801561001057600080fd5b506004361061004c5760003560e01c806324c6e3c414610051578063995d5d9114610081578063a7d4c4731461009d578063e8021822146100b9575b600080fd5b61006b6004803603810190610066919061097a565b6100d5565b60405161007891906109c0565b60405180910390f35b61009b6004803603810190610096919061097a565b610105565b005b6100b760048036038101906100b29190610a11565b610166565b005b6100d360048036038101906100ce9190610a11565b6102d9565b005b6000816040516020016100e89190610c02565b604051602081830303815290604052805190602001209050919050565b8060600160208101906101189190610c1d565b73ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff161461014f57600080fd5b6101633360006103af90919063ffffffff16565b50565b6101b782602001602081019061017c9190610c4a565b6040518060400160405280601a81526020017f43616e6e6f7420766f746520616674657220646561646c696e650000000000008152506103d9565b60006101c2836100d5565b905061020f336040518060400160405280601d81526020017f43616e6e6f7420766f7465206966206e6f742072656769737465726564000000815250600061040a9092919063ffffffff16565b6000610227823360026104369092919063ffffffff16565b1461023157600080fd5b61024a813360016002610502909392919063ffffffff16565b6000818360405160200161025f929190610c86565b60405160208183030381529060405280519060200120905061028e81600160036105cd9092919063ffffffff16565b823373ffffffffffffffffffffffffffffffffffffffff16837fe4abc5380fa6939d1dc23b5e90b3a8a0e328f0f1a82a5f42bfb795bf9c71750560405160405180910390a450505050565b61030d8260200160208101906102ef9190610c4a565b60405180606001604052806024815260200161109f602491396105fe565b6000610318836100d5565b90506000818360405160200161032f929190610c86565b60405160208183030381529060405280519060200120905061037b8185600001356040518060600160405280603081526020016110c360309139600361062f909392919063ffffffff16565b82827f269d3a24712436f77df15d63de7d2337a060c9102dee6f46c909fb0fa2d52f0c60405160405180910390a350505050565b6103d5826000018273ffffffffffffffffffffffffffffffffffffffff1660001b610657565b5050565b610406610400836103e86106bd565b67ffffffffffffffff166107f290919063ffffffff16565b82610813565b5050565b610431836000018373ffffffffffffffffffffffffffffffffffffffff1660001b83610909565b505050565b60003273ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff16146104a6576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161049d90610d32565b60405180910390fd5b83600001600084815260200190815260200160002060008373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000205490509392505050565b3273ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff1614610570576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161056790610d32565b60405180910390fd5b8084600001600085815260200190815260200160002060008473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000208190555050505050565b8083600001600084815260200190815260200160002060008282546105f29190610d81565b92505081905550505050565b61062b6106258361060d6106bd565b67ffffffffffffffff1661093090919063ffffffff16565b82610813565b5050565b6106518285600001600086815260200190815260200160002054101582610813565b50505050565b600082600001600083815260200190815260200160002054036106b957600182600101546106859190610d81565b826000016000838152602001908152602001600020819055508160010160008154809291906106b390610db5565b91905055505b5050565b60008060007fba286e4d89dabf4b2878e896423bb123d9d5143e662606fd343b6766d7bcf72160001c73ffffffffffffffffffffffffffffffffffffffff1660405161070890610e2e565b600060405180830381855afa9150503d8060008114610743576040519150601f19603f3d011682016040523d82523d6000602084013e610748565b606091505b50915091508161078d576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161078490610e8f565b60405180910390fd5b60208151146107d1576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016107c890610efb565b60405180910390fd5b6000818060200190518101906107e79190610f47565b905080935050505090565b60008167ffffffffffffffff168367ffffffffffffffff1610905092915050565b60007f3dcdf63b41c103567d7225976ad9145e866c7a7dccc6c277ea86abbd268fbac960001c73ffffffffffffffffffffffffffffffffffffffff16836040516020016108609190610f8f565b60405160208183030381529060405260405161087c9190611010565b600060405180830381855afa9150503d80600081146108b7576040519150601f19603f3d011682016040523d82523d6000602084013e6108bc565b606091505b50509050808290610903576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016108fa919061107c565b60405180910390fd5b50505050565b61092b6000846000016000858152602001908152602001600020541182610813565b505050565b60008167ffffffffffffffff168367ffffffffffffffff1611905092915050565b600080fd5b600080fd5b60006080828403121561097157610970610956565b5b81905092915050565b6000608082840312156109905761098f610951565b5b600061099e8482850161095b565b91505092915050565b6000819050919050565b6109ba816109a7565b82525050565b60006020820190506109d560008301846109b1565b92915050565b6000819050919050565b6109ee816109db565b81146109f957600080fd5b50565b600081359050610a0b816109e5565b92915050565b60008060a08385031215610a2857610a27610951565b5b6000610a368582860161095b565b9250506080610a47858286016109fc565b9150509250929050565b6000610a6060208401846109fc565b905092915050565b610a71816109db565b82525050565b600067ffffffffffffffff82169050919050565b610a9481610a77565b8114610a9f57600080fd5b50565b600081359050610ab181610a8b565b92915050565b6000610ac66020840184610aa2565b905092915050565b6000819050919050565b6000610af3610aee610ae984610a77565b610ace565b610a77565b9050919050565b610b0381610ad8565b82525050565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b6000610b3482610b09565b9050919050565b610b4481610b29565b8114610b4f57600080fd5b50565b600081359050610b6181610b3b565b92915050565b6000610b766020840184610b52565b905092915050565b610b8781610b29565b82525050565b60808201610b9e6000830183610a51565b610bab6000850182610a68565b50610bb96020830183610ab7565b610bc66020850182610afa565b50610bd46040830183610a51565b610be16040850182610a68565b50610bef6060830183610b67565b610bfc6060850182610b7e565b50505050565b6000608082019050610c176000830184610b8d565b92915050565b600060208284031215610c3357610c32610951565b5b6000610c4184828501610b52565b91505092915050565b600060208284031215610c6057610c5f610951565b5b6000610c6e84828501610aa2565b91505092915050565b610c80816109db565b82525050565b6000604082019050610c9b60008301856109b1565b610ca86020830184610c77565b9392505050565b600082825260208201905092915050565b7f43616e6e6f7420616363657373204f776e6564436f756e746572206f776e656460008201527f20627920616e6f74686572206164647265737300000000000000000000000000602082015250565b6000610d1c603383610caf565b9150610d2782610cc0565b604082019050919050565b60006020820190508181036000830152610d4b81610d0f565b9050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b6000610d8c826109db565b9150610d97836109db565b9250828201905080821115610daf57610dae610d52565b5b92915050565b6000610dc0826109db565b91507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff8203610df257610df1610d52565b5b600182019050919050565b600081905092915050565b50565b6000610e18600083610dfd565b9150610e2382610e08565b600082019050919050565b6000610e3982610e0b565b9150819050919050565b7f507265636f6d70696c652063616c6c206661696c656400000000000000000000600082015250565b6000610e79601683610caf565b9150610e8482610e43565b602082019050919050565b60006020820190508181036000830152610ea881610e6c565b9050919050565b7f496e76616c6964206f7574707574206c656e6774680000000000000000000000600082015250565b6000610ee5601583610caf565b9150610ef082610eaf565b602082019050919050565b60006020820190508181036000830152610f1481610ed8565b9050919050565b610f2481610a77565b8114610f2f57600080fd5b50565b600081519050610f4181610f1b565b92915050565b600060208284031215610f5d57610f5c610951565b5b6000610f6b84828501610f32565b91505092915050565b60008115159050919050565b610f8981610f74565b82525050565b6000602082019050610fa46000830184610f80565b92915050565b600081519050919050565b60005b83811015610fd3578082015181840152602081019050610fb8565b60008484015250505050565b6000610fea82610faa565b610ff48185610dfd565b9350611004818560208601610fb5565b80840191505092915050565b600061101c8284610fdf565b915081905092915050565b600081519050919050565b6000601f19601f8301169050919050565b600061104e82611027565b6110588185610caf565b9350611068818560208601610fb5565b61107181611032565b840191505092915050565b600060208201905081810360008301526110968184611043565b90509291505056fe43616e6e6f74206465636964652077696e6e6572206265666f726520646561646c696e6543616e6e6f74207365742077696e6e65722077697468206c65737320766f746573207468616e207468726573686f6c64
    /// ```
    #[rustfmt::skip]
    #[allow(clippy::all)]
    pub static BYTECODE: alloy_sol_types::private::Bytes = alloy_sol_types::private::Bytes::from_static(
        b"`\x80`@R4\x80\x15`\x0FW`\0\x80\xFD[Pa\x10\xF3\x80a\0\x1F`\09`\0\xF3\xFE`\x80`@R4\x80\x15a\0\x10W`\0\x80\xFD[P`\x046\x10a\0LW`\x005`\xE0\x1C\x80c$\xC6\xE3\xC4\x14a\0QW\x80c\x99]]\x91\x14a\0\x81W\x80c\xA7\xD4\xC4s\x14a\0\x9DW\x80c\xE8\x02\x18\"\x14a\0\xB9W[`\0\x80\xFD[a\0k`\x04\x806\x03\x81\x01\x90a\0f\x91\x90a\tzV[a\0\xD5V[`@Qa\0x\x91\x90a\t\xC0V[`@Q\x80\x91\x03\x90\xF3[a\0\x9B`\x04\x806\x03\x81\x01\x90a\0\x96\x91\x90a\tzV[a\x01\x05V[\0[a\0\xB7`\x04\x806\x03\x81\x01\x90a\0\xB2\x91\x90a\n\x11V[a\x01fV[\0[a\0\xD3`\x04\x806\x03\x81\x01\x90a\0\xCE\x91\x90a\n\x11V[a\x02\xD9V[\0[`\0\x81`@Q` \x01a\0\xE8\x91\x90a\x0C\x02V[`@Q` \x81\x83\x03\x03\x81R\x90`@R\x80Q\x90` \x01 \x90P\x91\x90PV[\x80``\x01` \x81\x01\x90a\x01\x18\x91\x90a\x0C\x1DV[s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x163s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x14a\x01OW`\0\x80\xFD[a\x01c3`\0a\x03\xAF\x90\x91\x90c\xFF\xFF\xFF\xFF\x16V[PV[a\x01\xB7\x82` \x01` \x81\x01\x90a\x01|\x91\x90a\x0CJV[`@Q\x80`@\x01`@R\x80`\x1A\x81R` \x01\x7FCannot vote after deadline\0\0\0\0\0\0\x81RPa\x03\xD9V[`\0a\x01\xC2\x83a\0\xD5V[\x90Pa\x02\x0F3`@Q\x80`@\x01`@R\x80`\x1D\x81R` \x01\x7FCannot vote if not registered\0\0\0\x81RP`\0a\x04\n\x90\x92\x91\x90c\xFF\xFF\xFF\xFF\x16V[`\0a\x02'\x823`\x02a\x046\x90\x92\x91\x90c\xFF\xFF\xFF\xFF\x16V[\x14a\x021W`\0\x80\xFD[a\x02J\x813`\x01`\x02a\x05\x02\x90\x93\x92\x91\x90c\xFF\xFF\xFF\xFF\x16V[`\0\x81\x83`@Q` \x01a\x02_\x92\x91\x90a\x0C\x86V[`@Q` \x81\x83\x03\x03\x81R\x90`@R\x80Q\x90` \x01 \x90Pa\x02\x8E\x81`\x01`\x03a\x05\xCD\x90\x92\x91\x90c\xFF\xFF\xFF\xFF\x16V[\x823s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83\x7F\xE4\xAB\xC58\x0F\xA6\x93\x9D\x1D\xC2;^\x90\xB3\xA8\xA0\xE3(\xF0\xF1\xA8*_B\xBF\xB7\x95\xBF\x9Cqu\x05`@Q`@Q\x80\x91\x03\x90\xA4PPPPV[a\x03\r\x82` \x01` \x81\x01\x90a\x02\xEF\x91\x90a\x0CJV[`@Q\x80``\x01`@R\x80`$\x81R` \x01a\x10\x9F`$\x919a\x05\xFEV[`\0a\x03\x18\x83a\0\xD5V[\x90P`\0\x81\x83`@Q` \x01a\x03/\x92\x91\x90a\x0C\x86V[`@Q` \x81\x83\x03\x03\x81R\x90`@R\x80Q\x90` \x01 \x90Pa\x03{\x81\x85`\0\x015`@Q\x80``\x01`@R\x80`0\x81R` \x01a\x10\xC3`0\x919`\x03a\x06/\x90\x93\x92\x91\x90c\xFF\xFF\xFF\xFF\x16V[\x82\x82\x7F&\x9D:$q$6\xF7}\xF1]c\xDE}#7\xA0`\xC9\x10-\xEEoF\xC9\t\xFB\x0F\xA2\xD5/\x0C`@Q`@Q\x80\x91\x03\x90\xA3PPPPV[a\x03\xD5\x82`\0\x01\x82s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16`\0\x1Ba\x06WV[PPV[a\x04\x06a\x04\0\x83a\x03\xE8a\x06\xBDV[g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16a\x07\xF2\x90\x91\x90c\xFF\xFF\xFF\xFF\x16V[\x82a\x08\x13V[PPV[a\x041\x83`\0\x01\x83s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16`\0\x1B\x83a\t\tV[PPPV[`\x002s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x82s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x14a\x04\xA6W`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x04\x9D\x90a\r2V[`@Q\x80\x91\x03\x90\xFD[\x83`\0\x01`\0\x84\x81R` \x01\x90\x81R` \x01`\0 `\0\x83s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x81R` \x01\x90\x81R` \x01`\0 T\x90P\x93\x92PPPV[2s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x82s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x14a\x05pW`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x05g\x90a\r2V[`@Q\x80\x91\x03\x90\xFD[\x80\x84`\0\x01`\0\x85\x81R` \x01\x90\x81R` \x01`\0 `\0\x84s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x81R` \x01\x90\x81R` \x01`\0 \x81\x90UPPPPPV[\x80\x83`\0\x01`\0\x84\x81R` \x01\x90\x81R` \x01`\0 `\0\x82\x82Ta\x05\xF2\x91\x90a\r\x81V[\x92PP\x81\x90UPPPPV[a\x06+a\x06%\x83a\x06\ra\x06\xBDV[g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16a\t0\x90\x91\x90c\xFF\xFF\xFF\xFF\x16V[\x82a\x08\x13V[PPV[a\x06Q\x82\x85`\0\x01`\0\x86\x81R` \x01\x90\x81R` \x01`\0 T\x10\x15\x82a\x08\x13V[PPPPV[`\0\x82`\0\x01`\0\x83\x81R` \x01\x90\x81R` \x01`\0 T\x03a\x06\xB9W`\x01\x82`\x01\x01Ta\x06\x85\x91\x90a\r\x81V[\x82`\0\x01`\0\x83\x81R` \x01\x90\x81R` \x01`\0 \x81\x90UP\x81`\x01\x01`\0\x81T\x80\x92\x91\x90a\x06\xB3\x90a\r\xB5V[\x91\x90PUP[PPV[`\0\x80`\0\x7F\xBA(nM\x89\xDA\xBFK(x\xE8\x96B;\xB1#\xD9\xD5\x14>f&\x06\xFD4;gf\xD7\xBC\xF7!`\0\x1Cs\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16`@Qa\x07\x08\x90a\x0E.V[`\0`@Q\x80\x83\x03\x81\x85Z\xFA\x91PP=\x80`\0\x81\x14a\x07CW`@Q\x91P`\x1F\x19`?=\x01\x16\x82\x01`@R=\x82R=`\0` \x84\x01>a\x07HV[``\x91P[P\x91P\x91P\x81a\x07\x8DW`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x07\x84\x90a\x0E\x8FV[`@Q\x80\x91\x03\x90\xFD[` \x81Q\x14a\x07\xD1W`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x07\xC8\x90a\x0E\xFBV[`@Q\x80\x91\x03\x90\xFD[`\0\x81\x80` \x01\x90Q\x81\x01\x90a\x07\xE7\x91\x90a\x0FGV[\x90P\x80\x93PPPP\x90V[`\0\x81g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x10\x90P\x92\x91PPV[`\0\x7F=\xCD\xF6;A\xC1\x03V}r%\x97j\xD9\x14^\x86lz}\xCC\xC6\xC2w\xEA\x86\xAB\xBD&\x8F\xBA\xC9`\0\x1Cs\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83`@Q` \x01a\x08`\x91\x90a\x0F\x8FV[`@Q` \x81\x83\x03\x03\x81R\x90`@R`@Qa\x08|\x91\x90a\x10\x10V[`\0`@Q\x80\x83\x03\x81\x85Z\xFA\x91PP=\x80`\0\x81\x14a\x08\xB7W`@Q\x91P`\x1F\x19`?=\x01\x16\x82\x01`@R=\x82R=`\0` \x84\x01>a\x08\xBCV[``\x91P[PP\x90P\x80\x82\x90a\t\x03W`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x08\xFA\x91\x90a\x10|V[`@Q\x80\x91\x03\x90\xFD[PPPPV[a\t+`\0\x84`\0\x01`\0\x85\x81R` \x01\x90\x81R` \x01`\0 T\x11\x82a\x08\x13V[PPPV[`\0\x81g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x11\x90P\x92\x91PPV[`\0\x80\xFD[`\0\x80\xFD[`\0`\x80\x82\x84\x03\x12\x15a\tqWa\tpa\tVV[[\x81\x90P\x92\x91PPV[`\0`\x80\x82\x84\x03\x12\x15a\t\x90Wa\t\x8Fa\tQV[[`\0a\t\x9E\x84\x82\x85\x01a\t[V[\x91PP\x92\x91PPV[`\0\x81\x90P\x91\x90PV[a\t\xBA\x81a\t\xA7V[\x82RPPV[`\0` \x82\x01\x90Pa\t\xD5`\0\x83\x01\x84a\t\xB1V[\x92\x91PPV[`\0\x81\x90P\x91\x90PV[a\t\xEE\x81a\t\xDBV[\x81\x14a\t\xF9W`\0\x80\xFD[PV[`\0\x815\x90Pa\n\x0B\x81a\t\xE5V[\x92\x91PPV[`\0\x80`\xA0\x83\x85\x03\x12\x15a\n(Wa\n'a\tQV[[`\0a\n6\x85\x82\x86\x01a\t[V[\x92PP`\x80a\nG\x85\x82\x86\x01a\t\xFCV[\x91PP\x92P\x92\x90PV[`\0a\n`` \x84\x01\x84a\t\xFCV[\x90P\x92\x91PPV[a\nq\x81a\t\xDBV[\x82RPPV[`\0g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x82\x16\x90P\x91\x90PV[a\n\x94\x81a\nwV[\x81\x14a\n\x9FW`\0\x80\xFD[PV[`\0\x815\x90Pa\n\xB1\x81a\n\x8BV[\x92\x91PPV[`\0a\n\xC6` \x84\x01\x84a\n\xA2V[\x90P\x92\x91PPV[`\0\x81\x90P\x91\x90PV[`\0a\n\xF3a\n\xEEa\n\xE9\x84a\nwV[a\n\xCEV[a\nwV[\x90P\x91\x90PV[a\x0B\x03\x81a\n\xD8V[\x82RPPV[`\0s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x82\x16\x90P\x91\x90PV[`\0a\x0B4\x82a\x0B\tV[\x90P\x91\x90PV[a\x0BD\x81a\x0B)V[\x81\x14a\x0BOW`\0\x80\xFD[PV[`\0\x815\x90Pa\x0Ba\x81a\x0B;V[\x92\x91PPV[`\0a\x0Bv` \x84\x01\x84a\x0BRV[\x90P\x92\x91PPV[a\x0B\x87\x81a\x0B)V[\x82RPPV[`\x80\x82\x01a\x0B\x9E`\0\x83\x01\x83a\nQV[a\x0B\xAB`\0\x85\x01\x82a\nhV[Pa\x0B\xB9` \x83\x01\x83a\n\xB7V[a\x0B\xC6` \x85\x01\x82a\n\xFAV[Pa\x0B\xD4`@\x83\x01\x83a\nQV[a\x0B\xE1`@\x85\x01\x82a\nhV[Pa\x0B\xEF``\x83\x01\x83a\x0BgV[a\x0B\xFC``\x85\x01\x82a\x0B~V[PPPPV[`\0`\x80\x82\x01\x90Pa\x0C\x17`\0\x83\x01\x84a\x0B\x8DV[\x92\x91PPV[`\0` \x82\x84\x03\x12\x15a\x0C3Wa\x0C2a\tQV[[`\0a\x0CA\x84\x82\x85\x01a\x0BRV[\x91PP\x92\x91PPV[`\0` \x82\x84\x03\x12\x15a\x0C`Wa\x0C_a\tQV[[`\0a\x0Cn\x84\x82\x85\x01a\n\xA2V[\x91PP\x92\x91PPV[a\x0C\x80\x81a\t\xDBV[\x82RPPV[`\0`@\x82\x01\x90Pa\x0C\x9B`\0\x83\x01\x85a\t\xB1V[a\x0C\xA8` \x83\x01\x84a\x0CwV[\x93\x92PPPV[`\0\x82\x82R` \x82\x01\x90P\x92\x91PPV[\x7FCannot access OwnedCounter owned`\0\x82\x01R\x7F by another address\0\0\0\0\0\0\0\0\0\0\0\0\0` \x82\x01RPV[`\0a\r\x1C`3\x83a\x0C\xAFV[\x91Pa\r'\x82a\x0C\xC0V[`@\x82\x01\x90P\x91\x90PV[`\0` \x82\x01\x90P\x81\x81\x03`\0\x83\x01Ra\rK\x81a\r\x0FV[\x90P\x91\x90PV[\x7FNH{q\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0`\0R`\x11`\x04R`$`\0\xFD[`\0a\r\x8C\x82a\t\xDBV[\x91Pa\r\x97\x83a\t\xDBV[\x92P\x82\x82\x01\x90P\x80\x82\x11\x15a\r\xAFWa\r\xAEa\rRV[[\x92\x91PPV[`\0a\r\xC0\x82a\t\xDBV[\x91P\x7F\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x82\x03a\r\xF2Wa\r\xF1a\rRV[[`\x01\x82\x01\x90P\x91\x90PV[`\0\x81\x90P\x92\x91PPV[PV[`\0a\x0E\x18`\0\x83a\r\xFDV[\x91Pa\x0E#\x82a\x0E\x08V[`\0\x82\x01\x90P\x91\x90PV[`\0a\x0E9\x82a\x0E\x0BV[\x91P\x81\x90P\x91\x90PV[\x7FPrecompile call failed\0\0\0\0\0\0\0\0\0\0`\0\x82\x01RPV[`\0a\x0Ey`\x16\x83a\x0C\xAFV[\x91Pa\x0E\x84\x82a\x0ECV[` \x82\x01\x90P\x91\x90PV[`\0` \x82\x01\x90P\x81\x81\x03`\0\x83\x01Ra\x0E\xA8\x81a\x0ElV[\x90P\x91\x90PV[\x7FInvalid output length\0\0\0\0\0\0\0\0\0\0\0`\0\x82\x01RPV[`\0a\x0E\xE5`\x15\x83a\x0C\xAFV[\x91Pa\x0E\xF0\x82a\x0E\xAFV[` \x82\x01\x90P\x91\x90PV[`\0` \x82\x01\x90P\x81\x81\x03`\0\x83\x01Ra\x0F\x14\x81a\x0E\xD8V[\x90P\x91\x90PV[a\x0F$\x81a\nwV[\x81\x14a\x0F/W`\0\x80\xFD[PV[`\0\x81Q\x90Pa\x0FA\x81a\x0F\x1BV[\x92\x91PPV[`\0` \x82\x84\x03\x12\x15a\x0F]Wa\x0F\\a\tQV[[`\0a\x0Fk\x84\x82\x85\x01a\x0F2V[\x91PP\x92\x91PPV[`\0\x81\x15\x15\x90P\x91\x90PV[a\x0F\x89\x81a\x0FtV[\x82RPPV[`\0` \x82\x01\x90Pa\x0F\xA4`\0\x83\x01\x84a\x0F\x80V[\x92\x91PPV[`\0\x81Q\x90P\x91\x90PV[`\0[\x83\x81\x10\x15a\x0F\xD3W\x80\x82\x01Q\x81\x84\x01R` \x81\x01\x90Pa\x0F\xB8V[`\0\x84\x84\x01RPPPPV[`\0a\x0F\xEA\x82a\x0F\xAAV[a\x0F\xF4\x81\x85a\r\xFDV[\x93Pa\x10\x04\x81\x85` \x86\x01a\x0F\xB5V[\x80\x84\x01\x91PP\x92\x91PPV[`\0a\x10\x1C\x82\x84a\x0F\xDFV[\x91P\x81\x90P\x92\x91PPV[`\0\x81Q\x90P\x91\x90PV[`\0`\x1F\x19`\x1F\x83\x01\x16\x90P\x91\x90PV[`\0a\x10N\x82a\x10'V[a\x10X\x81\x85a\x0C\xAFV[\x93Pa\x10h\x81\x85` \x86\x01a\x0F\xB5V[a\x10q\x81a\x102V[\x84\x01\x91PP\x92\x91PPV[`\0` \x82\x01\x90P\x81\x81\x03`\0\x83\x01Ra\x10\x96\x81\x84a\x10CV[\x90P\x92\x91PPV\xFECannot decide winner before deadlineCannot set winner with less votes than threshold",
    );
    /// The runtime bytecode of the contract, as deployed on the network.
    ///
    /// ```text
    ///0x608060405234801561001057600080fd5b506004361061004c5760003560e01c806324c6e3c414610051578063995d5d9114610081578063a7d4c4731461009d578063e8021822146100b9575b600080fd5b61006b6004803603810190610066919061097a565b6100d5565b60405161007891906109c0565b60405180910390f35b61009b6004803603810190610096919061097a565b610105565b005b6100b760048036038101906100b29190610a11565b610166565b005b6100d360048036038101906100ce9190610a11565b6102d9565b005b6000816040516020016100e89190610c02565b604051602081830303815290604052805190602001209050919050565b8060600160208101906101189190610c1d565b73ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff161461014f57600080fd5b6101633360006103af90919063ffffffff16565b50565b6101b782602001602081019061017c9190610c4a565b6040518060400160405280601a81526020017f43616e6e6f7420766f746520616674657220646561646c696e650000000000008152506103d9565b60006101c2836100d5565b905061020f336040518060400160405280601d81526020017f43616e6e6f7420766f7465206966206e6f742072656769737465726564000000815250600061040a9092919063ffffffff16565b6000610227823360026104369092919063ffffffff16565b1461023157600080fd5b61024a813360016002610502909392919063ffffffff16565b6000818360405160200161025f929190610c86565b60405160208183030381529060405280519060200120905061028e81600160036105cd9092919063ffffffff16565b823373ffffffffffffffffffffffffffffffffffffffff16837fe4abc5380fa6939d1dc23b5e90b3a8a0e328f0f1a82a5f42bfb795bf9c71750560405160405180910390a450505050565b61030d8260200160208101906102ef9190610c4a565b60405180606001604052806024815260200161109f602491396105fe565b6000610318836100d5565b90506000818360405160200161032f929190610c86565b60405160208183030381529060405280519060200120905061037b8185600001356040518060600160405280603081526020016110c360309139600361062f909392919063ffffffff16565b82827f269d3a24712436f77df15d63de7d2337a060c9102dee6f46c909fb0fa2d52f0c60405160405180910390a350505050565b6103d5826000018273ffffffffffffffffffffffffffffffffffffffff1660001b610657565b5050565b610406610400836103e86106bd565b67ffffffffffffffff166107f290919063ffffffff16565b82610813565b5050565b610431836000018373ffffffffffffffffffffffffffffffffffffffff1660001b83610909565b505050565b60003273ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff16146104a6576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161049d90610d32565b60405180910390fd5b83600001600084815260200190815260200160002060008373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000205490509392505050565b3273ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff1614610570576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161056790610d32565b60405180910390fd5b8084600001600085815260200190815260200160002060008473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000208190555050505050565b8083600001600084815260200190815260200160002060008282546105f29190610d81565b92505081905550505050565b61062b6106258361060d6106bd565b67ffffffffffffffff1661093090919063ffffffff16565b82610813565b5050565b6106518285600001600086815260200190815260200160002054101582610813565b50505050565b600082600001600083815260200190815260200160002054036106b957600182600101546106859190610d81565b826000016000838152602001908152602001600020819055508160010160008154809291906106b390610db5565b91905055505b5050565b60008060007fba286e4d89dabf4b2878e896423bb123d9d5143e662606fd343b6766d7bcf72160001c73ffffffffffffffffffffffffffffffffffffffff1660405161070890610e2e565b600060405180830381855afa9150503d8060008114610743576040519150601f19603f3d011682016040523d82523d6000602084013e610748565b606091505b50915091508161078d576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161078490610e8f565b60405180910390fd5b60208151146107d1576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016107c890610efb565b60405180910390fd5b6000818060200190518101906107e79190610f47565b905080935050505090565b60008167ffffffffffffffff168367ffffffffffffffff1610905092915050565b60007f3dcdf63b41c103567d7225976ad9145e866c7a7dccc6c277ea86abbd268fbac960001c73ffffffffffffffffffffffffffffffffffffffff16836040516020016108609190610f8f565b60405160208183030381529060405260405161087c9190611010565b600060405180830381855afa9150503d80600081146108b7576040519150601f19603f3d011682016040523d82523d6000602084013e6108bc565b606091505b50509050808290610903576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016108fa919061107c565b60405180910390fd5b50505050565b61092b6000846000016000858152602001908152602001600020541182610813565b505050565b60008167ffffffffffffffff168367ffffffffffffffff1611905092915050565b600080fd5b600080fd5b60006080828403121561097157610970610956565b5b81905092915050565b6000608082840312156109905761098f610951565b5b600061099e8482850161095b565b91505092915050565b6000819050919050565b6109ba816109a7565b82525050565b60006020820190506109d560008301846109b1565b92915050565b6000819050919050565b6109ee816109db565b81146109f957600080fd5b50565b600081359050610a0b816109e5565b92915050565b60008060a08385031215610a2857610a27610951565b5b6000610a368582860161095b565b9250506080610a47858286016109fc565b9150509250929050565b6000610a6060208401846109fc565b905092915050565b610a71816109db565b82525050565b600067ffffffffffffffff82169050919050565b610a9481610a77565b8114610a9f57600080fd5b50565b600081359050610ab181610a8b565b92915050565b6000610ac66020840184610aa2565b905092915050565b6000819050919050565b6000610af3610aee610ae984610a77565b610ace565b610a77565b9050919050565b610b0381610ad8565b82525050565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b6000610b3482610b09565b9050919050565b610b4481610b29565b8114610b4f57600080fd5b50565b600081359050610b6181610b3b565b92915050565b6000610b766020840184610b52565b905092915050565b610b8781610b29565b82525050565b60808201610b9e6000830183610a51565b610bab6000850182610a68565b50610bb96020830183610ab7565b610bc66020850182610afa565b50610bd46040830183610a51565b610be16040850182610a68565b50610bef6060830183610b67565b610bfc6060850182610b7e565b50505050565b6000608082019050610c176000830184610b8d565b92915050565b600060208284031215610c3357610c32610951565b5b6000610c4184828501610b52565b91505092915050565b600060208284031215610c6057610c5f610951565b5b6000610c6e84828501610aa2565b91505092915050565b610c80816109db565b82525050565b6000604082019050610c9b60008301856109b1565b610ca86020830184610c77565b9392505050565b600082825260208201905092915050565b7f43616e6e6f7420616363657373204f776e6564436f756e746572206f776e656460008201527f20627920616e6f74686572206164647265737300000000000000000000000000602082015250565b6000610d1c603383610caf565b9150610d2782610cc0565b604082019050919050565b60006020820190508181036000830152610d4b81610d0f565b9050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b6000610d8c826109db565b9150610d97836109db565b9250828201905080821115610daf57610dae610d52565b5b92915050565b6000610dc0826109db565b91507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff8203610df257610df1610d52565b5b600182019050919050565b600081905092915050565b50565b6000610e18600083610dfd565b9150610e2382610e08565b600082019050919050565b6000610e3982610e0b565b9150819050919050565b7f507265636f6d70696c652063616c6c206661696c656400000000000000000000600082015250565b6000610e79601683610caf565b9150610e8482610e43565b602082019050919050565b60006020820190508181036000830152610ea881610e6c565b9050919050565b7f496e76616c6964206f7574707574206c656e6774680000000000000000000000600082015250565b6000610ee5601583610caf565b9150610ef082610eaf565b602082019050919050565b60006020820190508181036000830152610f1481610ed8565b9050919050565b610f2481610a77565b8114610f2f57600080fd5b50565b600081519050610f4181610f1b565b92915050565b600060208284031215610f5d57610f5c610951565b5b6000610f6b84828501610f32565b91505092915050565b60008115159050919050565b610f8981610f74565b82525050565b6000602082019050610fa46000830184610f80565b92915050565b600081519050919050565b60005b83811015610fd3578082015181840152602081019050610fb8565b60008484015250505050565b6000610fea82610faa565b610ff48185610dfd565b9350611004818560208601610fb5565b80840191505092915050565b600061101c8284610fdf565b915081905092915050565b600081519050919050565b6000601f19601f8301169050919050565b600061104e82611027565b6110588185610caf565b9350611068818560208601610fb5565b61107181611032565b840191505092915050565b600060208201905081810360008301526110968184611043565b90509291505056fe43616e6e6f74206465636964652077696e6e6572206265666f726520646561646c696e6543616e6e6f74207365742077696e6e65722077697468206c65737320766f746573207468616e207468726573686f6c64
    /// ```
    #[rustfmt::skip]
    #[allow(clippy::all)]
    pub static DEPLOYED_BYTECODE: alloy_sol_types::private::Bytes = alloy_sol_types::private::Bytes::from_static(
        b"`\x80`@R4\x80\x15a\0\x10W`\0\x80\xFD[P`\x046\x10a\0LW`\x005`\xE0\x1C\x80c$\xC6\xE3\xC4\x14a\0QW\x80c\x99]]\x91\x14a\0\x81W\x80c\xA7\xD4\xC4s\x14a\0\x9DW\x80c\xE8\x02\x18\"\x14a\0\xB9W[`\0\x80\xFD[a\0k`\x04\x806\x03\x81\x01\x90a\0f\x91\x90a\tzV[a\0\xD5V[`@Qa\0x\x91\x90a\t\xC0V[`@Q\x80\x91\x03\x90\xF3[a\0\x9B`\x04\x806\x03\x81\x01\x90a\0\x96\x91\x90a\tzV[a\x01\x05V[\0[a\0\xB7`\x04\x806\x03\x81\x01\x90a\0\xB2\x91\x90a\n\x11V[a\x01fV[\0[a\0\xD3`\x04\x806\x03\x81\x01\x90a\0\xCE\x91\x90a\n\x11V[a\x02\xD9V[\0[`\0\x81`@Q` \x01a\0\xE8\x91\x90a\x0C\x02V[`@Q` \x81\x83\x03\x03\x81R\x90`@R\x80Q\x90` \x01 \x90P\x91\x90PV[\x80``\x01` \x81\x01\x90a\x01\x18\x91\x90a\x0C\x1DV[s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x163s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x14a\x01OW`\0\x80\xFD[a\x01c3`\0a\x03\xAF\x90\x91\x90c\xFF\xFF\xFF\xFF\x16V[PV[a\x01\xB7\x82` \x01` \x81\x01\x90a\x01|\x91\x90a\x0CJV[`@Q\x80`@\x01`@R\x80`\x1A\x81R` \x01\x7FCannot vote after deadline\0\0\0\0\0\0\x81RPa\x03\xD9V[`\0a\x01\xC2\x83a\0\xD5V[\x90Pa\x02\x0F3`@Q\x80`@\x01`@R\x80`\x1D\x81R` \x01\x7FCannot vote if not registered\0\0\0\x81RP`\0a\x04\n\x90\x92\x91\x90c\xFF\xFF\xFF\xFF\x16V[`\0a\x02'\x823`\x02a\x046\x90\x92\x91\x90c\xFF\xFF\xFF\xFF\x16V[\x14a\x021W`\0\x80\xFD[a\x02J\x813`\x01`\x02a\x05\x02\x90\x93\x92\x91\x90c\xFF\xFF\xFF\xFF\x16V[`\0\x81\x83`@Q` \x01a\x02_\x92\x91\x90a\x0C\x86V[`@Q` \x81\x83\x03\x03\x81R\x90`@R\x80Q\x90` \x01 \x90Pa\x02\x8E\x81`\x01`\x03a\x05\xCD\x90\x92\x91\x90c\xFF\xFF\xFF\xFF\x16V[\x823s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83\x7F\xE4\xAB\xC58\x0F\xA6\x93\x9D\x1D\xC2;^\x90\xB3\xA8\xA0\xE3(\xF0\xF1\xA8*_B\xBF\xB7\x95\xBF\x9Cqu\x05`@Q`@Q\x80\x91\x03\x90\xA4PPPPV[a\x03\r\x82` \x01` \x81\x01\x90a\x02\xEF\x91\x90a\x0CJV[`@Q\x80``\x01`@R\x80`$\x81R` \x01a\x10\x9F`$\x919a\x05\xFEV[`\0a\x03\x18\x83a\0\xD5V[\x90P`\0\x81\x83`@Q` \x01a\x03/\x92\x91\x90a\x0C\x86V[`@Q` \x81\x83\x03\x03\x81R\x90`@R\x80Q\x90` \x01 \x90Pa\x03{\x81\x85`\0\x015`@Q\x80``\x01`@R\x80`0\x81R` \x01a\x10\xC3`0\x919`\x03a\x06/\x90\x93\x92\x91\x90c\xFF\xFF\xFF\xFF\x16V[\x82\x82\x7F&\x9D:$q$6\xF7}\xF1]c\xDE}#7\xA0`\xC9\x10-\xEEoF\xC9\t\xFB\x0F\xA2\xD5/\x0C`@Q`@Q\x80\x91\x03\x90\xA3PPPPV[a\x03\xD5\x82`\0\x01\x82s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16`\0\x1Ba\x06WV[PPV[a\x04\x06a\x04\0\x83a\x03\xE8a\x06\xBDV[g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16a\x07\xF2\x90\x91\x90c\xFF\xFF\xFF\xFF\x16V[\x82a\x08\x13V[PPV[a\x041\x83`\0\x01\x83s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16`\0\x1B\x83a\t\tV[PPPV[`\x002s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x82s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x14a\x04\xA6W`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x04\x9D\x90a\r2V[`@Q\x80\x91\x03\x90\xFD[\x83`\0\x01`\0\x84\x81R` \x01\x90\x81R` \x01`\0 `\0\x83s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x81R` \x01\x90\x81R` \x01`\0 T\x90P\x93\x92PPPV[2s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x82s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x14a\x05pW`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x05g\x90a\r2V[`@Q\x80\x91\x03\x90\xFD[\x80\x84`\0\x01`\0\x85\x81R` \x01\x90\x81R` \x01`\0 `\0\x84s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x81R` \x01\x90\x81R` \x01`\0 \x81\x90UPPPPPV[\x80\x83`\0\x01`\0\x84\x81R` \x01\x90\x81R` \x01`\0 `\0\x82\x82Ta\x05\xF2\x91\x90a\r\x81V[\x92PP\x81\x90UPPPPV[a\x06+a\x06%\x83a\x06\ra\x06\xBDV[g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16a\t0\x90\x91\x90c\xFF\xFF\xFF\xFF\x16V[\x82a\x08\x13V[PPV[a\x06Q\x82\x85`\0\x01`\0\x86\x81R` \x01\x90\x81R` \x01`\0 T\x10\x15\x82a\x08\x13V[PPPPV[`\0\x82`\0\x01`\0\x83\x81R` \x01\x90\x81R` \x01`\0 T\x03a\x06\xB9W`\x01\x82`\x01\x01Ta\x06\x85\x91\x90a\r\x81V[\x82`\0\x01`\0\x83\x81R` \x01\x90\x81R` \x01`\0 \x81\x90UP\x81`\x01\x01`\0\x81T\x80\x92\x91\x90a\x06\xB3\x90a\r\xB5V[\x91\x90PUP[PPV[`\0\x80`\0\x7F\xBA(nM\x89\xDA\xBFK(x\xE8\x96B;\xB1#\xD9\xD5\x14>f&\x06\xFD4;gf\xD7\xBC\xF7!`\0\x1Cs\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16`@Qa\x07\x08\x90a\x0E.V[`\0`@Q\x80\x83\x03\x81\x85Z\xFA\x91PP=\x80`\0\x81\x14a\x07CW`@Q\x91P`\x1F\x19`?=\x01\x16\x82\x01`@R=\x82R=`\0` \x84\x01>a\x07HV[``\x91P[P\x91P\x91P\x81a\x07\x8DW`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x07\x84\x90a\x0E\x8FV[`@Q\x80\x91\x03\x90\xFD[` \x81Q\x14a\x07\xD1W`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x07\xC8\x90a\x0E\xFBV[`@Q\x80\x91\x03\x90\xFD[`\0\x81\x80` \x01\x90Q\x81\x01\x90a\x07\xE7\x91\x90a\x0FGV[\x90P\x80\x93PPPP\x90V[`\0\x81g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x10\x90P\x92\x91PPV[`\0\x7F=\xCD\xF6;A\xC1\x03V}r%\x97j\xD9\x14^\x86lz}\xCC\xC6\xC2w\xEA\x86\xAB\xBD&\x8F\xBA\xC9`\0\x1Cs\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83`@Q` \x01a\x08`\x91\x90a\x0F\x8FV[`@Q` \x81\x83\x03\x03\x81R\x90`@R`@Qa\x08|\x91\x90a\x10\x10V[`\0`@Q\x80\x83\x03\x81\x85Z\xFA\x91PP=\x80`\0\x81\x14a\x08\xB7W`@Q\x91P`\x1F\x19`?=\x01\x16\x82\x01`@R=\x82R=`\0` \x84\x01>a\x08\xBCV[``\x91P[PP\x90P\x80\x82\x90a\t\x03W`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x08\xFA\x91\x90a\x10|V[`@Q\x80\x91\x03\x90\xFD[PPPPV[a\t+`\0\x84`\0\x01`\0\x85\x81R` \x01\x90\x81R` \x01`\0 T\x11\x82a\x08\x13V[PPPV[`\0\x81g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x11\x90P\x92\x91PPV[`\0\x80\xFD[`\0\x80\xFD[`\0`\x80\x82\x84\x03\x12\x15a\tqWa\tpa\tVV[[\x81\x90P\x92\x91PPV[`\0`\x80\x82\x84\x03\x12\x15a\t\x90Wa\t\x8Fa\tQV[[`\0a\t\x9E\x84\x82\x85\x01a\t[V[\x91PP\x92\x91PPV[`\0\x81\x90P\x91\x90PV[a\t\xBA\x81a\t\xA7V[\x82RPPV[`\0` \x82\x01\x90Pa\t\xD5`\0\x83\x01\x84a\t\xB1V[\x92\x91PPV[`\0\x81\x90P\x91\x90PV[a\t\xEE\x81a\t\xDBV[\x81\x14a\t\xF9W`\0\x80\xFD[PV[`\0\x815\x90Pa\n\x0B\x81a\t\xE5V[\x92\x91PPV[`\0\x80`\xA0\x83\x85\x03\x12\x15a\n(Wa\n'a\tQV[[`\0a\n6\x85\x82\x86\x01a\t[V[\x92PP`\x80a\nG\x85\x82\x86\x01a\t\xFCV[\x91PP\x92P\x92\x90PV[`\0a\n`` \x84\x01\x84a\t\xFCV[\x90P\x92\x91PPV[a\nq\x81a\t\xDBV[\x82RPPV[`\0g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x82\x16\x90P\x91\x90PV[a\n\x94\x81a\nwV[\x81\x14a\n\x9FW`\0\x80\xFD[PV[`\0\x815\x90Pa\n\xB1\x81a\n\x8BV[\x92\x91PPV[`\0a\n\xC6` \x84\x01\x84a\n\xA2V[\x90P\x92\x91PPV[`\0\x81\x90P\x91\x90PV[`\0a\n\xF3a\n\xEEa\n\xE9\x84a\nwV[a\n\xCEV[a\nwV[\x90P\x91\x90PV[a\x0B\x03\x81a\n\xD8V[\x82RPPV[`\0s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x82\x16\x90P\x91\x90PV[`\0a\x0B4\x82a\x0B\tV[\x90P\x91\x90PV[a\x0BD\x81a\x0B)V[\x81\x14a\x0BOW`\0\x80\xFD[PV[`\0\x815\x90Pa\x0Ba\x81a\x0B;V[\x92\x91PPV[`\0a\x0Bv` \x84\x01\x84a\x0BRV[\x90P\x92\x91PPV[a\x0B\x87\x81a\x0B)V[\x82RPPV[`\x80\x82\x01a\x0B\x9E`\0\x83\x01\x83a\nQV[a\x0B\xAB`\0\x85\x01\x82a\nhV[Pa\x0B\xB9` \x83\x01\x83a\n\xB7V[a\x0B\xC6` \x85\x01\x82a\n\xFAV[Pa\x0B\xD4`@\x83\x01\x83a\nQV[a\x0B\xE1`@\x85\x01\x82a\nhV[Pa\x0B\xEF``\x83\x01\x83a\x0BgV[a\x0B\xFC``\x85\x01\x82a\x0B~V[PPPPV[`\0`\x80\x82\x01\x90Pa\x0C\x17`\0\x83\x01\x84a\x0B\x8DV[\x92\x91PPV[`\0` \x82\x84\x03\x12\x15a\x0C3Wa\x0C2a\tQV[[`\0a\x0CA\x84\x82\x85\x01a\x0BRV[\x91PP\x92\x91PPV[`\0` \x82\x84\x03\x12\x15a\x0C`Wa\x0C_a\tQV[[`\0a\x0Cn\x84\x82\x85\x01a\n\xA2V[\x91PP\x92\x91PPV[a\x0C\x80\x81a\t\xDBV[\x82RPPV[`\0`@\x82\x01\x90Pa\x0C\x9B`\0\x83\x01\x85a\t\xB1V[a\x0C\xA8` \x83\x01\x84a\x0CwV[\x93\x92PPPV[`\0\x82\x82R` \x82\x01\x90P\x92\x91PPV[\x7FCannot access OwnedCounter owned`\0\x82\x01R\x7F by another address\0\0\0\0\0\0\0\0\0\0\0\0\0` \x82\x01RPV[`\0a\r\x1C`3\x83a\x0C\xAFV[\x91Pa\r'\x82a\x0C\xC0V[`@\x82\x01\x90P\x91\x90PV[`\0` \x82\x01\x90P\x81\x81\x03`\0\x83\x01Ra\rK\x81a\r\x0FV[\x90P\x91\x90PV[\x7FNH{q\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0`\0R`\x11`\x04R`$`\0\xFD[`\0a\r\x8C\x82a\t\xDBV[\x91Pa\r\x97\x83a\t\xDBV[\x92P\x82\x82\x01\x90P\x80\x82\x11\x15a\r\xAFWa\r\xAEa\rRV[[\x92\x91PPV[`\0a\r\xC0\x82a\t\xDBV[\x91P\x7F\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x82\x03a\r\xF2Wa\r\xF1a\rRV[[`\x01\x82\x01\x90P\x91\x90PV[`\0\x81\x90P\x92\x91PPV[PV[`\0a\x0E\x18`\0\x83a\r\xFDV[\x91Pa\x0E#\x82a\x0E\x08V[`\0\x82\x01\x90P\x91\x90PV[`\0a\x0E9\x82a\x0E\x0BV[\x91P\x81\x90P\x91\x90PV[\x7FPrecompile call failed\0\0\0\0\0\0\0\0\0\0`\0\x82\x01RPV[`\0a\x0Ey`\x16\x83a\x0C\xAFV[\x91Pa\x0E\x84\x82a\x0ECV[` \x82\x01\x90P\x91\x90PV[`\0` \x82\x01\x90P\x81\x81\x03`\0\x83\x01Ra\x0E\xA8\x81a\x0ElV[\x90P\x91\x90PV[\x7FInvalid output length\0\0\0\0\0\0\0\0\0\0\0`\0\x82\x01RPV[`\0a\x0E\xE5`\x15\x83a\x0C\xAFV[\x91Pa\x0E\xF0\x82a\x0E\xAFV[` \x82\x01\x90P\x91\x90PV[`\0` \x82\x01\x90P\x81\x81\x03`\0\x83\x01Ra\x0F\x14\x81a\x0E\xD8V[\x90P\x91\x90PV[a\x0F$\x81a\nwV[\x81\x14a\x0F/W`\0\x80\xFD[PV[`\0\x81Q\x90Pa\x0FA\x81a\x0F\x1BV[\x92\x91PPV[`\0` \x82\x84\x03\x12\x15a\x0F]Wa\x0F\\a\tQV[[`\0a\x0Fk\x84\x82\x85\x01a\x0F2V[\x91PP\x92\x91PPV[`\0\x81\x15\x15\x90P\x91\x90PV[a\x0F\x89\x81a\x0FtV[\x82RPPV[`\0` \x82\x01\x90Pa\x0F\xA4`\0\x83\x01\x84a\x0F\x80V[\x92\x91PPV[`\0\x81Q\x90P\x91\x90PV[`\0[\x83\x81\x10\x15a\x0F\xD3W\x80\x82\x01Q\x81\x84\x01R` \x81\x01\x90Pa\x0F\xB8V[`\0\x84\x84\x01RPPPPV[`\0a\x0F\xEA\x82a\x0F\xAAV[a\x0F\xF4\x81\x85a\r\xFDV[\x93Pa\x10\x04\x81\x85` \x86\x01a\x0F\xB5V[\x80\x84\x01\x91PP\x92\x91PPV[`\0a\x10\x1C\x82\x84a\x0F\xDFV[\x91P\x81\x90P\x92\x91PPV[`\0\x81Q\x90P\x91\x90PV[`\0`\x1F\x19`\x1F\x83\x01\x16\x90P\x91\x90PV[`\0a\x10N\x82a\x10'V[a\x10X\x81\x85a\x0C\xAFV[\x93Pa\x10h\x81\x85` \x86\x01a\x0F\xB5V[a\x10q\x81a\x102V[\x84\x01\x91PP\x92\x91PPV[`\0` \x82\x01\x90P\x81\x81\x03`\0\x83\x01Ra\x10\x96\x81\x84a\x10CV[\x90P\x92\x91PPV\xFECannot decide winner before deadlineCannot set winner with less votes than threshold",
    );
    #[derive(serde::Serialize, serde::Deserialize)]
    #[derive(Default, Debug, PartialEq, Eq, Hash)]
    /**```solidity
struct VotingInfo { uint256 threshold; Time.Timestamp deadline; uint256 nonce; address owner; }
```*/
    #[allow(non_camel_case_types, non_snake_case, clippy::pub_underscore_fields)]
    #[derive(Clone)]
    pub struct VotingInfo {
        #[allow(missing_docs)]
        pub threshold: alloy::sol_types::private::primitives::aliases::U256,
        #[allow(missing_docs)]
        pub deadline: <Time::Timestamp as alloy::sol_types::SolType>::RustType,
        #[allow(missing_docs)]
        pub nonce: alloy::sol_types::private::primitives::aliases::U256,
        #[allow(missing_docs)]
        pub owner: alloy::sol_types::private::Address,
    }
    #[allow(
        non_camel_case_types,
        non_snake_case,
        clippy::pub_underscore_fields,
        clippy::style
    )]
    const _: () = {
        use alloy::sol_types as alloy_sol_types;
        #[doc(hidden)]
        type UnderlyingSolTuple<'a> = (
            alloy::sol_types::sol_data::Uint<256>,
            Time::Timestamp,
            alloy::sol_types::sol_data::Uint<256>,
            alloy::sol_types::sol_data::Address,
        );
        #[doc(hidden)]
        type UnderlyingRustTuple<'a> = (
            alloy::sol_types::private::primitives::aliases::U256,
            <Time::Timestamp as alloy::sol_types::SolType>::RustType,
            alloy::sol_types::private::primitives::aliases::U256,
            alloy::sol_types::private::Address,
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
        impl ::core::convert::From<VotingInfo> for UnderlyingRustTuple<'_> {
            fn from(value: VotingInfo) -> Self {
                (value.threshold, value.deadline, value.nonce, value.owner)
            }
        }
        #[automatically_derived]
        #[doc(hidden)]
        impl ::core::convert::From<UnderlyingRustTuple<'_>> for VotingInfo {
            fn from(tuple: UnderlyingRustTuple<'_>) -> Self {
                Self {
                    threshold: tuple.0,
                    deadline: tuple.1,
                    nonce: tuple.2,
                    owner: tuple.3,
                }
            }
        }
        #[automatically_derived]
        impl alloy_sol_types::SolValue for VotingInfo {
            type SolType = Self;
        }
        #[automatically_derived]
        impl alloy_sol_types::private::SolTypeValue<Self> for VotingInfo {
            #[inline]
            fn stv_to_tokens(&self) -> <Self as alloy_sol_types::SolType>::Token<'_> {
                (
                    <alloy::sol_types::sol_data::Uint<
                        256,
                    > as alloy_sol_types::SolType>::tokenize(&self.threshold),
                    <Time::Timestamp as alloy_sol_types::SolType>::tokenize(
                        &self.deadline,
                    ),
                    <alloy::sol_types::sol_data::Uint<
                        256,
                    > as alloy_sol_types::SolType>::tokenize(&self.nonce),
                    <alloy::sol_types::sol_data::Address as alloy_sol_types::SolType>::tokenize(
                        &self.owner,
                    ),
                )
            }
            #[inline]
            fn stv_abi_encoded_size(&self) -> usize {
                if let Some(size) = <Self as alloy_sol_types::SolType>::ENCODED_SIZE {
                    return size;
                }
                let tuple = <UnderlyingRustTuple<
                    '_,
                > as ::core::convert::From<Self>>::from(self.clone());
                <UnderlyingSolTuple<
                    '_,
                > as alloy_sol_types::SolType>::abi_encoded_size(&tuple)
            }
            #[inline]
            fn stv_eip712_data_word(&self) -> alloy_sol_types::Word {
                <Self as alloy_sol_types::SolStruct>::eip712_hash_struct(self)
            }
            #[inline]
            fn stv_abi_encode_packed_to(
                &self,
                out: &mut alloy_sol_types::private::Vec<u8>,
            ) {
                let tuple = <UnderlyingRustTuple<
                    '_,
                > as ::core::convert::From<Self>>::from(self.clone());
                <UnderlyingSolTuple<
                    '_,
                > as alloy_sol_types::SolType>::abi_encode_packed_to(&tuple, out)
            }
            #[inline]
            fn stv_abi_packed_encoded_size(&self) -> usize {
                if let Some(size) = <Self as alloy_sol_types::SolType>::PACKED_ENCODED_SIZE {
                    return size;
                }
                let tuple = <UnderlyingRustTuple<
                    '_,
                > as ::core::convert::From<Self>>::from(self.clone());
                <UnderlyingSolTuple<
                    '_,
                > as alloy_sol_types::SolType>::abi_packed_encoded_size(&tuple)
            }
        }
        #[automatically_derived]
        impl alloy_sol_types::SolType for VotingInfo {
            type RustType = Self;
            type Token<'a> = <UnderlyingSolTuple<
                'a,
            > as alloy_sol_types::SolType>::Token<'a>;
            const SOL_NAME: &'static str = <Self as alloy_sol_types::SolStruct>::NAME;
            const ENCODED_SIZE: Option<usize> = <UnderlyingSolTuple<
                '_,
            > as alloy_sol_types::SolType>::ENCODED_SIZE;
            const PACKED_ENCODED_SIZE: Option<usize> = <UnderlyingSolTuple<
                '_,
            > as alloy_sol_types::SolType>::PACKED_ENCODED_SIZE;
            #[inline]
            fn valid_token(token: &Self::Token<'_>) -> bool {
                <UnderlyingSolTuple<'_> as alloy_sol_types::SolType>::valid_token(token)
            }
            #[inline]
            fn detokenize(token: Self::Token<'_>) -> Self::RustType {
                let tuple = <UnderlyingSolTuple<
                    '_,
                > as alloy_sol_types::SolType>::detokenize(token);
                <Self as ::core::convert::From<UnderlyingRustTuple<'_>>>::from(tuple)
            }
        }
        #[automatically_derived]
        impl alloy_sol_types::SolStruct for VotingInfo {
            const NAME: &'static str = "VotingInfo";
            #[inline]
            fn eip712_root_type() -> alloy_sol_types::private::Cow<'static, str> {
                alloy_sol_types::private::Cow::Borrowed(
                    "VotingInfo(uint256 threshold,uint64 deadline,uint256 nonce,address owner)",
                )
            }
            #[inline]
            fn eip712_components() -> alloy_sol_types::private::Vec<
                alloy_sol_types::private::Cow<'static, str>,
            > {
                alloy_sol_types::private::Vec::new()
            }
            #[inline]
            fn eip712_encode_type() -> alloy_sol_types::private::Cow<'static, str> {
                <Self as alloy_sol_types::SolStruct>::eip712_root_type()
            }
            #[inline]
            fn eip712_encode_data(&self) -> alloy_sol_types::private::Vec<u8> {
                [
                    <alloy::sol_types::sol_data::Uint<
                        256,
                    > as alloy_sol_types::SolType>::eip712_data_word(&self.threshold)
                        .0,
                    <Time::Timestamp as alloy_sol_types::SolType>::eip712_data_word(
                            &self.deadline,
                        )
                        .0,
                    <alloy::sol_types::sol_data::Uint<
                        256,
                    > as alloy_sol_types::SolType>::eip712_data_word(&self.nonce)
                        .0,
                    <alloy::sol_types::sol_data::Address as alloy_sol_types::SolType>::eip712_data_word(
                            &self.owner,
                        )
                        .0,
                ]
                    .concat()
            }
        }
        #[automatically_derived]
        impl alloy_sol_types::EventTopic for VotingInfo {
            #[inline]
            fn topic_preimage_length(rust: &Self::RustType) -> usize {
                0usize
                    + <alloy::sol_types::sol_data::Uint<
                        256,
                    > as alloy_sol_types::EventTopic>::topic_preimage_length(
                        &rust.threshold,
                    )
                    + <Time::Timestamp as alloy_sol_types::EventTopic>::topic_preimage_length(
                        &rust.deadline,
                    )
                    + <alloy::sol_types::sol_data::Uint<
                        256,
                    > as alloy_sol_types::EventTopic>::topic_preimage_length(&rust.nonce)
                    + <alloy::sol_types::sol_data::Address as alloy_sol_types::EventTopic>::topic_preimage_length(
                        &rust.owner,
                    )
            }
            #[inline]
            fn encode_topic_preimage(
                rust: &Self::RustType,
                out: &mut alloy_sol_types::private::Vec<u8>,
            ) {
                out.reserve(
                    <Self as alloy_sol_types::EventTopic>::topic_preimage_length(rust),
                );
                <alloy::sol_types::sol_data::Uint<
                    256,
                > as alloy_sol_types::EventTopic>::encode_topic_preimage(
                    &rust.threshold,
                    out,
                );
                <Time::Timestamp as alloy_sol_types::EventTopic>::encode_topic_preimage(
                    &rust.deadline,
                    out,
                );
                <alloy::sol_types::sol_data::Uint<
                    256,
                > as alloy_sol_types::EventTopic>::encode_topic_preimage(
                    &rust.nonce,
                    out,
                );
                <alloy::sol_types::sol_data::Address as alloy_sol_types::EventTopic>::encode_topic_preimage(
                    &rust.owner,
                    out,
                );
            }
            #[inline]
            fn encode_topic(
                rust: &Self::RustType,
            ) -> alloy_sol_types::abi::token::WordToken {
                let mut out = alloy_sol_types::private::Vec::new();
                <Self as alloy_sol_types::EventTopic>::encode_topic_preimage(
                    rust,
                    &mut out,
                );
                alloy_sol_types::abi::token::WordToken(
                    alloy_sol_types::private::keccak256(out),
                )
            }
        }
    };
    #[derive(serde::Serialize, serde::Deserialize)]
    #[derive(Default, Debug, PartialEq, Eq, Hash)]
    /**Event with signature `Voted(bytes32,address,uint256)` and selector `0xe4abc5380fa6939d1dc23b5e90b3a8a0e328f0f1a82a5f42bfb795bf9c717505`.
```solidity
event Voted(bytes32 indexed votingId, address indexed voter, uint256 indexed choice);
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
        pub votingId: alloy::sol_types::private::FixedBytes<32>,
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
                    votingId: topics.1,
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
                    self.votingId.clone(),
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
                > as alloy_sol_types::EventTopic>::encode_topic(&self.votingId);
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
event Winner(bytes32 indexed votingId, uint256 indexed choice);
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
        pub votingId: alloy::sol_types::private::FixedBytes<32>,
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
                    votingId: topics.1,
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
                (Self::SIGNATURE_HASH.into(), self.votingId.clone(), self.choice.clone())
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
                > as alloy_sol_types::EventTopic>::encode_topic(&self.votingId);
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
    /**Function with signature `register((uint256,uint64,uint256,address))` and selector `0x995d5d91`.
```solidity
function register(VotingInfo memory v) external;
```*/
    #[allow(non_camel_case_types, non_snake_case, clippy::pub_underscore_fields)]
    #[derive(Clone)]
    pub struct registerCall {
        #[allow(missing_docs)]
        pub v: <VotingInfo as alloy::sol_types::SolType>::RustType,
    }
    ///Container type for the return parameters of the [`register((uint256,uint64,uint256,address))`](registerCall) function.
    #[allow(non_camel_case_types, non_snake_case, clippy::pub_underscore_fields)]
    #[derive(Clone)]
    pub struct registerReturn {}
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
            type UnderlyingSolTuple<'a> = (VotingInfo,);
            #[doc(hidden)]
            type UnderlyingRustTuple<'a> = (
                <VotingInfo as alloy::sol_types::SolType>::RustType,
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
            impl ::core::convert::From<registerCall> for UnderlyingRustTuple<'_> {
                fn from(value: registerCall) -> Self {
                    (value.v,)
                }
            }
            #[automatically_derived]
            #[doc(hidden)]
            impl ::core::convert::From<UnderlyingRustTuple<'_>> for registerCall {
                fn from(tuple: UnderlyingRustTuple<'_>) -> Self {
                    Self { v: tuple.0 }
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
            impl ::core::convert::From<registerReturn> for UnderlyingRustTuple<'_> {
                fn from(value: registerReturn) -> Self {
                    ()
                }
            }
            #[automatically_derived]
            #[doc(hidden)]
            impl ::core::convert::From<UnderlyingRustTuple<'_>> for registerReturn {
                fn from(tuple: UnderlyingRustTuple<'_>) -> Self {
                    Self {}
                }
            }
        }
        #[automatically_derived]
        impl alloy_sol_types::SolCall for registerCall {
            type Parameters<'a> = (VotingInfo,);
            type Token<'a> = <Self::Parameters<
                'a,
            > as alloy_sol_types::SolType>::Token<'a>;
            type Return = registerReturn;
            type ReturnTuple<'a> = ();
            type ReturnToken<'a> = <Self::ReturnTuple<
                'a,
            > as alloy_sol_types::SolType>::Token<'a>;
            const SIGNATURE: &'static str = "register((uint256,uint64,uint256,address))";
            const SELECTOR: [u8; 4] = [153u8, 93u8, 93u8, 145u8];
            #[inline]
            fn new<'a>(
                tuple: <Self::Parameters<'a> as alloy_sol_types::SolType>::RustType,
            ) -> Self {
                tuple.into()
            }
            #[inline]
            fn tokenize(&self) -> Self::Token<'_> {
                (<VotingInfo as alloy_sol_types::SolType>::tokenize(&self.v),)
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
    /**Function with signature `setWinner((uint256,uint64,uint256,address),uint256)` and selector `0xe8021822`.
```solidity
function setWinner(VotingInfo memory v, uint256 choice) external;
```*/
    #[allow(non_camel_case_types, non_snake_case, clippy::pub_underscore_fields)]
    #[derive(Clone)]
    pub struct setWinnerCall {
        #[allow(missing_docs)]
        pub v: <VotingInfo as alloy::sol_types::SolType>::RustType,
        #[allow(missing_docs)]
        pub choice: alloy::sol_types::private::primitives::aliases::U256,
    }
    ///Container type for the return parameters of the [`setWinner((uint256,uint64,uint256,address),uint256)`](setWinnerCall) function.
    #[allow(non_camel_case_types, non_snake_case, clippy::pub_underscore_fields)]
    #[derive(Clone)]
    pub struct setWinnerReturn {}
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
                VotingInfo,
                alloy::sol_types::sol_data::Uint<256>,
            );
            #[doc(hidden)]
            type UnderlyingRustTuple<'a> = (
                <VotingInfo as alloy::sol_types::SolType>::RustType,
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
            impl ::core::convert::From<setWinnerCall> for UnderlyingRustTuple<'_> {
                fn from(value: setWinnerCall) -> Self {
                    (value.v, value.choice)
                }
            }
            #[automatically_derived]
            #[doc(hidden)]
            impl ::core::convert::From<UnderlyingRustTuple<'_>> for setWinnerCall {
                fn from(tuple: UnderlyingRustTuple<'_>) -> Self {
                    Self {
                        v: tuple.0,
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
            impl ::core::convert::From<setWinnerReturn> for UnderlyingRustTuple<'_> {
                fn from(value: setWinnerReturn) -> Self {
                    ()
                }
            }
            #[automatically_derived]
            #[doc(hidden)]
            impl ::core::convert::From<UnderlyingRustTuple<'_>> for setWinnerReturn {
                fn from(tuple: UnderlyingRustTuple<'_>) -> Self {
                    Self {}
                }
            }
        }
        #[automatically_derived]
        impl alloy_sol_types::SolCall for setWinnerCall {
            type Parameters<'a> = (VotingInfo, alloy::sol_types::sol_data::Uint<256>);
            type Token<'a> = <Self::Parameters<
                'a,
            > as alloy_sol_types::SolType>::Token<'a>;
            type Return = setWinnerReturn;
            type ReturnTuple<'a> = ();
            type ReturnToken<'a> = <Self::ReturnTuple<
                'a,
            > as alloy_sol_types::SolType>::Token<'a>;
            const SIGNATURE: &'static str = "setWinner((uint256,uint64,uint256,address),uint256)";
            const SELECTOR: [u8; 4] = [232u8, 2u8, 24u8, 34u8];
            #[inline]
            fn new<'a>(
                tuple: <Self::Parameters<'a> as alloy_sol_types::SolType>::RustType,
            ) -> Self {
                tuple.into()
            }
            #[inline]
            fn tokenize(&self) -> Self::Token<'_> {
                (
                    <VotingInfo as alloy_sol_types::SolType>::tokenize(&self.v),
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
    /**Function with signature `vote((uint256,uint64,uint256,address),uint256)` and selector `0xa7d4c473`.
```solidity
function vote(VotingInfo memory v, uint256 choice) external;
```*/
    #[allow(non_camel_case_types, non_snake_case, clippy::pub_underscore_fields)]
    #[derive(Clone)]
    pub struct voteCall {
        #[allow(missing_docs)]
        pub v: <VotingInfo as alloy::sol_types::SolType>::RustType,
        #[allow(missing_docs)]
        pub choice: alloy::sol_types::private::primitives::aliases::U256,
    }
    ///Container type for the return parameters of the [`vote((uint256,uint64,uint256,address),uint256)`](voteCall) function.
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
                VotingInfo,
                alloy::sol_types::sol_data::Uint<256>,
            );
            #[doc(hidden)]
            type UnderlyingRustTuple<'a> = (
                <VotingInfo as alloy::sol_types::SolType>::RustType,
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
                    (value.v, value.choice)
                }
            }
            #[automatically_derived]
            #[doc(hidden)]
            impl ::core::convert::From<UnderlyingRustTuple<'_>> for voteCall {
                fn from(tuple: UnderlyingRustTuple<'_>) -> Self {
                    Self {
                        v: tuple.0,
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
            type Parameters<'a> = (VotingInfo, alloy::sol_types::sol_data::Uint<256>);
            type Token<'a> = <Self::Parameters<
                'a,
            > as alloy_sol_types::SolType>::Token<'a>;
            type Return = voteReturn;
            type ReturnTuple<'a> = ();
            type ReturnToken<'a> = <Self::ReturnTuple<
                'a,
            > as alloy_sol_types::SolType>::Token<'a>;
            const SIGNATURE: &'static str = "vote((uint256,uint64,uint256,address),uint256)";
            const SELECTOR: [u8; 4] = [167u8, 212u8, 196u8, 115u8];
            #[inline]
            fn new<'a>(
                tuple: <Self::Parameters<'a> as alloy_sol_types::SolType>::RustType,
            ) -> Self {
                tuple.into()
            }
            #[inline]
            fn tokenize(&self) -> Self::Token<'_> {
                (
                    <VotingInfo as alloy_sol_types::SolType>::tokenize(&self.v),
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
    /**Function with signature `votingId((uint256,uint64,uint256,address))` and selector `0x24c6e3c4`.
```solidity
function votingId(VotingInfo memory v) external pure returns (bytes32);
```*/
    #[allow(non_camel_case_types, non_snake_case, clippy::pub_underscore_fields)]
    #[derive(Clone)]
    pub struct votingIdCall {
        #[allow(missing_docs)]
        pub v: <VotingInfo as alloy::sol_types::SolType>::RustType,
    }
    #[derive(serde::Serialize, serde::Deserialize)]
    #[derive(Default, Debug, PartialEq, Eq, Hash)]
    ///Container type for the return parameters of the [`votingId((uint256,uint64,uint256,address))`](votingIdCall) function.
    #[allow(non_camel_case_types, non_snake_case, clippy::pub_underscore_fields)]
    #[derive(Clone)]
    pub struct votingIdReturn {
        #[allow(missing_docs)]
        pub _0: alloy::sol_types::private::FixedBytes<32>,
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
            type UnderlyingSolTuple<'a> = (VotingInfo,);
            #[doc(hidden)]
            type UnderlyingRustTuple<'a> = (
                <VotingInfo as alloy::sol_types::SolType>::RustType,
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
            impl ::core::convert::From<votingIdCall> for UnderlyingRustTuple<'_> {
                fn from(value: votingIdCall) -> Self {
                    (value.v,)
                }
            }
            #[automatically_derived]
            #[doc(hidden)]
            impl ::core::convert::From<UnderlyingRustTuple<'_>> for votingIdCall {
                fn from(tuple: UnderlyingRustTuple<'_>) -> Self {
                    Self { v: tuple.0 }
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
            impl ::core::convert::From<votingIdReturn> for UnderlyingRustTuple<'_> {
                fn from(value: votingIdReturn) -> Self {
                    (value._0,)
                }
            }
            #[automatically_derived]
            #[doc(hidden)]
            impl ::core::convert::From<UnderlyingRustTuple<'_>> for votingIdReturn {
                fn from(tuple: UnderlyingRustTuple<'_>) -> Self {
                    Self { _0: tuple.0 }
                }
            }
        }
        #[automatically_derived]
        impl alloy_sol_types::SolCall for votingIdCall {
            type Parameters<'a> = (VotingInfo,);
            type Token<'a> = <Self::Parameters<
                'a,
            > as alloy_sol_types::SolType>::Token<'a>;
            type Return = votingIdReturn;
            type ReturnTuple<'a> = (alloy::sol_types::sol_data::FixedBytes<32>,);
            type ReturnToken<'a> = <Self::ReturnTuple<
                'a,
            > as alloy_sol_types::SolType>::Token<'a>;
            const SIGNATURE: &'static str = "votingId((uint256,uint64,uint256,address))";
            const SELECTOR: [u8; 4] = [36u8, 198u8, 227u8, 196u8];
            #[inline]
            fn new<'a>(
                tuple: <Self::Parameters<'a> as alloy_sol_types::SolType>::RustType,
            ) -> Self {
                tuple.into()
            }
            #[inline]
            fn tokenize(&self) -> Self::Token<'_> {
                (<VotingInfo as alloy_sol_types::SolType>::tokenize(&self.v),)
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
        register(registerCall),
        #[allow(missing_docs)]
        setWinner(setWinnerCall),
        #[allow(missing_docs)]
        vote(voteCall),
        #[allow(missing_docs)]
        votingId(votingIdCall),
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
            [36u8, 198u8, 227u8, 196u8],
            [153u8, 93u8, 93u8, 145u8],
            [167u8, 212u8, 196u8, 115u8],
            [232u8, 2u8, 24u8, 34u8],
        ];
    }
    #[automatically_derived]
    impl alloy_sol_types::SolInterface for VotingCalls {
        const NAME: &'static str = "VotingCalls";
        const MIN_DATA_LENGTH: usize = 128usize;
        const COUNT: usize = 4usize;
        #[inline]
        fn selector(&self) -> [u8; 4] {
            match self {
                Self::register(_) => <registerCall as alloy_sol_types::SolCall>::SELECTOR,
                Self::setWinner(_) => {
                    <setWinnerCall as alloy_sol_types::SolCall>::SELECTOR
                }
                Self::vote(_) => <voteCall as alloy_sol_types::SolCall>::SELECTOR,
                Self::votingId(_) => <votingIdCall as alloy_sol_types::SolCall>::SELECTOR,
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
                    fn votingId(
                        data: &[u8],
                        validate: bool,
                    ) -> alloy_sol_types::Result<VotingCalls> {
                        <votingIdCall as alloy_sol_types::SolCall>::abi_decode_raw(
                                data,
                                validate,
                            )
                            .map(VotingCalls::votingId)
                    }
                    votingId
                },
                {
                    fn register(
                        data: &[u8],
                        validate: bool,
                    ) -> alloy_sol_types::Result<VotingCalls> {
                        <registerCall as alloy_sol_types::SolCall>::abi_decode_raw(
                                data,
                                validate,
                            )
                            .map(VotingCalls::register)
                    }
                    register
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
                    fn setWinner(
                        data: &[u8],
                        validate: bool,
                    ) -> alloy_sol_types::Result<VotingCalls> {
                        <setWinnerCall as alloy_sol_types::SolCall>::abi_decode_raw(
                                data,
                                validate,
                            )
                            .map(VotingCalls::setWinner)
                    }
                    setWinner
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
                Self::register(inner) => {
                    <registerCall as alloy_sol_types::SolCall>::abi_encoded_size(inner)
                }
                Self::setWinner(inner) => {
                    <setWinnerCall as alloy_sol_types::SolCall>::abi_encoded_size(inner)
                }
                Self::vote(inner) => {
                    <voteCall as alloy_sol_types::SolCall>::abi_encoded_size(inner)
                }
                Self::votingId(inner) => {
                    <votingIdCall as alloy_sol_types::SolCall>::abi_encoded_size(inner)
                }
            }
        }
        #[inline]
        fn abi_encode_raw(&self, out: &mut alloy_sol_types::private::Vec<u8>) {
            match self {
                Self::register(inner) => {
                    <registerCall as alloy_sol_types::SolCall>::abi_encode_raw(
                        inner,
                        out,
                    )
                }
                Self::setWinner(inner) => {
                    <setWinnerCall as alloy_sol_types::SolCall>::abi_encode_raw(
                        inner,
                        out,
                    )
                }
                Self::vote(inner) => {
                    <voteCall as alloy_sol_types::SolCall>::abi_encode_raw(inner, out)
                }
                Self::votingId(inner) => {
                    <votingIdCall as alloy_sol_types::SolCall>::abi_encode_raw(
                        inner,
                        out,
                    )
                }
            }
        }
    }
    ///Container for all the [`Voting`](self) events.
    #[derive(serde::Serialize, serde::Deserialize)]
    #[derive(Debug, PartialEq, Eq, Hash)]
    pub enum VotingEvents {
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
                228u8, 171u8, 197u8, 56u8, 15u8, 166u8, 147u8, 157u8, 29u8, 194u8, 59u8,
                94u8, 144u8, 179u8, 168u8, 160u8, 227u8, 40u8, 240u8, 241u8, 168u8, 42u8,
                95u8, 66u8, 191u8, 183u8, 149u8, 191u8, 156u8, 113u8, 117u8, 5u8,
            ],
        ];
    }
    #[automatically_derived]
    impl alloy_sol_types::SolEventInterface for VotingEvents {
        const NAME: &'static str = "VotingEvents";
        const COUNT: usize = 2usize;
        fn decode_raw_log(
            topics: &[alloy_sol_types::Word],
            data: &[u8],
            validate: bool,
        ) -> alloy_sol_types::Result<Self> {
            match topics.first().copied() {
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
        ///Creates a new call builder for the [`register`] function.
        pub fn register(
            &self,
            v: <VotingInfo as alloy::sol_types::SolType>::RustType,
        ) -> alloy_contract::SolCallBuilder<T, &P, registerCall, N> {
            self.call_builder(&registerCall { v })
        }
        ///Creates a new call builder for the [`setWinner`] function.
        pub fn setWinner(
            &self,
            v: <VotingInfo as alloy::sol_types::SolType>::RustType,
            choice: alloy::sol_types::private::primitives::aliases::U256,
        ) -> alloy_contract::SolCallBuilder<T, &P, setWinnerCall, N> {
            self.call_builder(&setWinnerCall { v, choice })
        }
        ///Creates a new call builder for the [`vote`] function.
        pub fn vote(
            &self,
            v: <VotingInfo as alloy::sol_types::SolType>::RustType,
            choice: alloy::sol_types::private::primitives::aliases::U256,
        ) -> alloy_contract::SolCallBuilder<T, &P, voteCall, N> {
            self.call_builder(&voteCall { v, choice })
        }
        ///Creates a new call builder for the [`votingId`] function.
        pub fn votingId(
            &self,
            v: <VotingInfo as alloy::sol_types::SolType>::RustType,
        ) -> alloy_contract::SolCallBuilder<T, &P, votingIdCall, N> {
            self.call_builder(&votingIdCall { v })
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
