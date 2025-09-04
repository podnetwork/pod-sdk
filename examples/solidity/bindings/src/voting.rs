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
    #[derive(serde::Serialize, serde::Deserialize, Default, Debug, PartialEq, Eq, Hash)]
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
            ) -> <alloy::sol_types::sol_data::Uint<64> as alloy_sol_types::SolType>::Token<'_>
            {
                alloy_sol_types::private::SolTypeValue::<
                    alloy::sol_types::sol_data::Uint<64>,
                >::stv_to_tokens(self)
            }
            #[inline]
            fn stv_eip712_data_word(&self) -> alloy_sol_types::Word {
                <alloy::sol_types::sol_data::Uint<64> as alloy_sol_types::SolType>::tokenize(self).0
            }
            #[inline]
            fn stv_abi_encode_packed_to(&self, out: &mut alloy_sol_types::private::Vec<u8>) {
                <alloy::sol_types::sol_data::Uint<
                    64,
                > as alloy_sol_types::SolType>::abi_encode_packed_to(self, out)
            }
            #[inline]
            fn stv_abi_packed_encoded_size(&self) -> usize {
                <alloy::sol_types::sol_data::Uint<64> as alloy_sol_types::SolType>::abi_encoded_size(
                    self,
                )
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
            type Token<'a> =
                <alloy::sol_types::sol_data::Uint<64> as alloy_sol_types::SolType>::Token<'a>;
            const SOL_NAME: &'static str = Self::NAME;
            const ENCODED_SIZE: Option<usize> =
                <alloy::sol_types::sol_data::Uint<64> as alloy_sol_types::SolType>::ENCODED_SIZE;
            const PACKED_ENCODED_SIZE: Option<usize> = <alloy::sol_types::sol_data::Uint<
                64,
            > as alloy_sol_types::SolType>::PACKED_ENCODED_SIZE;
            #[inline]
            fn valid_token(token: &Self::Token<'_>) -> bool {
                Self::type_check(token).is_ok()
            }
            #[inline]
            fn type_check(token: &Self::Token<'_>) -> alloy_sol_types::Result<()> {
                <alloy::sol_types::sol_data::Uint<64> as alloy_sol_types::SolType>::type_check(
                    token,
                )
            }
            #[inline]
            fn detokenize(token: Self::Token<'_>) -> Self::RustType {
                <alloy::sol_types::sol_data::Uint<64> as alloy_sol_types::SolType>::detokenize(
                    token,
                )
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
            fn encode_topic(rust: &Self::RustType) -> alloy_sol_types::abi::token::WordToken {
                <alloy::sol_types::sol_data::Uint<64> as alloy_sol_types::EventTopic>::encode_topic(
                    rust,
                )
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
    >(
        address: alloy_sol_types::private::Address,
        provider: P,
    ) -> TimeInstance<P, N> {
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
    impl<P: alloy_contract::private::Provider<N>, N: alloy_contract::private::Network>
        TimeInstance<P, N>
    {
        /**Creates a new wrapper around an on-chain [`Time`](self) contract instance.

        See the [wrapper's documentation](`TimeInstance`) for more details.*/
        #[inline]
        pub const fn new(address: alloy_sol_types::private::Address, provider: P) -> Self {
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
    impl<P: alloy_contract::private::Provider<N>, N: alloy_contract::private::Network>
        TimeInstance<P, N>
    {
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
    impl<P: alloy_contract::private::Provider<N>, N: alloy_contract::private::Network>
        TimeInstance<P, N>
    {
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
    ///0x6080604052348015600e575f5ffd5b506110518061001c5f395ff3fe608060405234801561000f575f5ffd5b506004361061004a575f3560e01c806324c6e3c41461004e578063995d5d911461007e578063a7d4c4731461009a578063e8021822146100b6575b5f5ffd5b61006860048036038101906100639190610939565b6100d2565b604051610075919061097c565b60405180910390f35b61009860048036038101906100939190610939565b610101565b005b6100b460048036038101906100af91906109c8565b610160565b005b6100d060048036038101906100cb91906109c8565b6102ce565b005b5f816040516020016100e49190610ba9565b604051602081830303815290604052805190602001209050919050565b8060600160208101906101149190610bc2565b73ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff161461014a575f5ffd5b61015d335f6103a190919063ffffffff16565b50565b6101b18260200160208101906101769190610bed565b6040518060400160405280601a81526020017f43616e6e6f7420766f746520616674657220646561646c696e650000000000008152506103c9565b5f6101bb836100d2565b9050610207336040518060400160405280601d81526020017f43616e6e6f7420766f7465206966206e6f7420726567697374657265640000008152505f6103fa9092919063ffffffff16565b5f61021e823360026104249092919063ffffffff16565b14610227575f5ffd5b6102408133600160026104ea909392919063ffffffff16565b5f8183604051602001610254929190610c27565b60405160208183030381529060405280519060200120905061028381600160036105b09092919063ffffffff16565b823373ffffffffffffffffffffffffffffffffffffffff16837fe4abc5380fa6939d1dc23b5e90b3a8a0e328f0f1a82a5f42bfb795bf9c71750560405160405180910390a450505050565b6103028260200160208101906102e49190610bed565b604051806060016040528060248152602001610ffd602491396105dd565b5f61030c836100d2565b90505f8183604051602001610322929190610c27565b60405160208183030381529060405280519060200120905061036d81855f013560405180606001604052806030815260200161102160309139600361060e909392919063ffffffff16565b82827f269d3a24712436f77df15d63de7d2337a060c9102dee6f46c909fb0fa2d52f0c60405160405180910390a350505050565b6103c5825f018273ffffffffffffffffffffffffffffffffffffffff165f1b610633565b5050565b6103f66103f0836103d8610691565b67ffffffffffffffff166107bf90919063ffffffff16565b826107df565b5050565b61041f835f018373ffffffffffffffffffffffffffffffffffffffff165f1b836108d0565b505050565b5f3273ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff1614610493576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161048a90610cce565b60405180910390fd5b835f015f8481526020019081526020015f205f8373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205490509392505050565b3273ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff1614610558576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161054f90610cce565b60405180910390fd5b80845f015f8581526020019081526020015f205f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f208190555050505050565b80835f015f8481526020019081526020015f205f8282546105d19190610d19565b92505081905550505050565b61060a610604836105ec610691565b67ffffffffffffffff166108f390919063ffffffff16565b826107df565b5050565b61062d82855f015f8681526020019081526020015f20541015826107df565b50505050565b5f825f015f8381526020019081526020015f20540361068d576001826001015461065d9190610d19565b825f015f8381526020019081526020015f2081905550816001015f81548092919061068790610d4c565b91905055505b5050565b5f5f5f7fba286e4d89dabf4b2878e896423bb123d9d5143e662606fd343b6766d7bcf7215f1c73ffffffffffffffffffffffffffffffffffffffff166040516106d990610dc0565b5f60405180830381855afa9150503d805f8114610711576040519150601f19603f3d011682016040523d82523d5f602084013e610716565b606091505b50915091508161075b576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161075290610e1e565b60405180910390fd5b602081511461079f576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161079690610e86565b60405180910390fd5b5f818060200190518101906107b49190610ece565b905080935050505090565b5f8167ffffffffffffffff168367ffffffffffffffff1610905092915050565b5f7f3dcdf63b41c103567d7225976ad9145e866c7a7dccc6c277ea86abbd268fbac95f1c73ffffffffffffffffffffffffffffffffffffffff168360405160200161082a9190610f13565b6040516020818303038152906040526040516108469190610f74565b5f60405180830381855afa9150503d805f811461087e576040519150601f19603f3d011682016040523d82523d5f602084013e610883565b606091505b505090508082906108ca576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016108c19190610fdc565b60405180910390fd5b50505050565b6108ee5f845f015f8581526020019081526020015f205411826107df565b505050565b5f8167ffffffffffffffff168367ffffffffffffffff1611905092915050565b5f5ffd5b5f5ffd5b5f608082840312156109305761092f610917565b5b81905092915050565b5f6080828403121561094e5761094d610913565b5b5f61095b8482850161091b565b91505092915050565b5f819050919050565b61097681610964565b82525050565b5f60208201905061098f5f83018461096d565b92915050565b5f819050919050565b6109a781610995565b81146109b1575f5ffd5b50565b5f813590506109c28161099e565b92915050565b5f5f60a083850312156109de576109dd610913565b5b5f6109eb8582860161091b565b92505060806109fc858286016109b4565b9150509250929050565b5f610a1460208401846109b4565b905092915050565b610a2581610995565b82525050565b5f67ffffffffffffffff82169050919050565b610a4781610a2b565b8114610a51575f5ffd5b50565b5f81359050610a6281610a3e565b92915050565b5f610a766020840184610a54565b905092915050565b5f819050919050565b5f610aa1610a9c610a9784610a2b565b610a7e565b610a2b565b9050919050565b610ab181610a87565b82525050565b5f73ffffffffffffffffffffffffffffffffffffffff82169050919050565b5f610ae082610ab7565b9050919050565b610af081610ad6565b8114610afa575f5ffd5b50565b5f81359050610b0b81610ae7565b92915050565b5f610b1f6020840184610afd565b905092915050565b610b3081610ad6565b82525050565b60808201610b465f830183610a06565b610b525f850182610a1c565b50610b606020830183610a68565b610b6d6020850182610aa8565b50610b7b6040830183610a06565b610b886040850182610a1c565b50610b966060830183610b11565b610ba36060850182610b27565b50505050565b5f608082019050610bbc5f830184610b36565b92915050565b5f60208284031215610bd757610bd6610913565b5b5f610be484828501610afd565b91505092915050565b5f60208284031215610c0257610c01610913565b5b5f610c0f84828501610a54565b91505092915050565b610c2181610995565b82525050565b5f604082019050610c3a5f83018561096d565b610c476020830184610c18565b9392505050565b5f82825260208201905092915050565b7f43616e6e6f7420616363657373204f776e6564436f756e746572206f776e65645f8201527f20627920616e6f74686572206164647265737300000000000000000000000000602082015250565b5f610cb8603383610c4e565b9150610cc382610c5e565b604082019050919050565b5f6020820190508181035f830152610ce581610cac565b9050919050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b5f610d2382610995565b9150610d2e83610995565b9250828201905080821115610d4657610d45610cec565b5b92915050565b5f610d5682610995565b91507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff8203610d8857610d87610cec565b5b600182019050919050565b5f81905092915050565b50565b5f610dab5f83610d93565b9150610db682610d9d565b5f82019050919050565b5f610dca82610da0565b9150819050919050565b7f507265636f6d70696c652063616c6c206661696c6564000000000000000000005f82015250565b5f610e08601683610c4e565b9150610e1382610dd4565b602082019050919050565b5f6020820190508181035f830152610e3581610dfc565b9050919050565b7f496e76616c6964206f7574707574206c656e67746800000000000000000000005f82015250565b5f610e70601583610c4e565b9150610e7b82610e3c565b602082019050919050565b5f6020820190508181035f830152610e9d81610e64565b9050919050565b610ead81610a2b565b8114610eb7575f5ffd5b50565b5f81519050610ec881610ea4565b92915050565b5f60208284031215610ee357610ee2610913565b5b5f610ef084828501610eba565b91505092915050565b5f8115159050919050565b610f0d81610ef9565b82525050565b5f602082019050610f265f830184610f04565b92915050565b5f81519050919050565b8281835e5f83830152505050565b5f610f4e82610f2c565b610f588185610d93565b9350610f68818560208601610f36565b80840191505092915050565b5f610f7f8284610f44565b915081905092915050565b5f81519050919050565b5f601f19601f8301169050919050565b5f610fae82610f8a565b610fb88185610c4e565b9350610fc8818560208601610f36565b610fd181610f94565b840191505092915050565b5f6020820190508181035f830152610ff48184610fa4565b90509291505056fe43616e6e6f74206465636964652077696e6e6572206265666f726520646561646c696e6543616e6e6f74207365742077696e6e65722077697468206c65737320766f746573207468616e207468726573686f6c64
    /// ```
    #[rustfmt::skip]
    #[allow(clippy::all)]
    pub static BYTECODE: alloy_sol_types::private::Bytes = alloy_sol_types::private::Bytes::from_static(
        b"`\x80`@R4\x80\x15`\x0EW__\xFD[Pa\x10Q\x80a\0\x1C_9_\xF3\xFE`\x80`@R4\x80\x15a\0\x0FW__\xFD[P`\x046\x10a\0JW_5`\xE0\x1C\x80c$\xC6\xE3\xC4\x14a\0NW\x80c\x99]]\x91\x14a\0~W\x80c\xA7\xD4\xC4s\x14a\0\x9AW\x80c\xE8\x02\x18\"\x14a\0\xB6W[__\xFD[a\0h`\x04\x806\x03\x81\x01\x90a\0c\x91\x90a\t9V[a\0\xD2V[`@Qa\0u\x91\x90a\t|V[`@Q\x80\x91\x03\x90\xF3[a\0\x98`\x04\x806\x03\x81\x01\x90a\0\x93\x91\x90a\t9V[a\x01\x01V[\0[a\0\xB4`\x04\x806\x03\x81\x01\x90a\0\xAF\x91\x90a\t\xC8V[a\x01`V[\0[a\0\xD0`\x04\x806\x03\x81\x01\x90a\0\xCB\x91\x90a\t\xC8V[a\x02\xCEV[\0[_\x81`@Q` \x01a\0\xE4\x91\x90a\x0B\xA9V[`@Q` \x81\x83\x03\x03\x81R\x90`@R\x80Q\x90` \x01 \x90P\x91\x90PV[\x80``\x01` \x81\x01\x90a\x01\x14\x91\x90a\x0B\xC2V[s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x163s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x14a\x01JW__\xFD[a\x01]3_a\x03\xA1\x90\x91\x90c\xFF\xFF\xFF\xFF\x16V[PV[a\x01\xB1\x82` \x01` \x81\x01\x90a\x01v\x91\x90a\x0B\xEDV[`@Q\x80`@\x01`@R\x80`\x1A\x81R` \x01\x7FCannot vote after deadline\0\0\0\0\0\0\x81RPa\x03\xC9V[_a\x01\xBB\x83a\0\xD2V[\x90Pa\x02\x073`@Q\x80`@\x01`@R\x80`\x1D\x81R` \x01\x7FCannot vote if not registered\0\0\0\x81RP_a\x03\xFA\x90\x92\x91\x90c\xFF\xFF\xFF\xFF\x16V[_a\x02\x1E\x823`\x02a\x04$\x90\x92\x91\x90c\xFF\xFF\xFF\xFF\x16V[\x14a\x02'W__\xFD[a\x02@\x813`\x01`\x02a\x04\xEA\x90\x93\x92\x91\x90c\xFF\xFF\xFF\xFF\x16V[_\x81\x83`@Q` \x01a\x02T\x92\x91\x90a\x0C'V[`@Q` \x81\x83\x03\x03\x81R\x90`@R\x80Q\x90` \x01 \x90Pa\x02\x83\x81`\x01`\x03a\x05\xB0\x90\x92\x91\x90c\xFF\xFF\xFF\xFF\x16V[\x823s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83\x7F\xE4\xAB\xC58\x0F\xA6\x93\x9D\x1D\xC2;^\x90\xB3\xA8\xA0\xE3(\xF0\xF1\xA8*_B\xBF\xB7\x95\xBF\x9Cqu\x05`@Q`@Q\x80\x91\x03\x90\xA4PPPPV[a\x03\x02\x82` \x01` \x81\x01\x90a\x02\xE4\x91\x90a\x0B\xEDV[`@Q\x80``\x01`@R\x80`$\x81R` \x01a\x0F\xFD`$\x919a\x05\xDDV[_a\x03\x0C\x83a\0\xD2V[\x90P_\x81\x83`@Q` \x01a\x03\"\x92\x91\x90a\x0C'V[`@Q` \x81\x83\x03\x03\x81R\x90`@R\x80Q\x90` \x01 \x90Pa\x03m\x81\x85_\x015`@Q\x80``\x01`@R\x80`0\x81R` \x01a\x10!`0\x919`\x03a\x06\x0E\x90\x93\x92\x91\x90c\xFF\xFF\xFF\xFF\x16V[\x82\x82\x7F&\x9D:$q$6\xF7}\xF1]c\xDE}#7\xA0`\xC9\x10-\xEEoF\xC9\t\xFB\x0F\xA2\xD5/\x0C`@Q`@Q\x80\x91\x03\x90\xA3PPPPV[a\x03\xC5\x82_\x01\x82s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16_\x1Ba\x063V[PPV[a\x03\xF6a\x03\xF0\x83a\x03\xD8a\x06\x91V[g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16a\x07\xBF\x90\x91\x90c\xFF\xFF\xFF\xFF\x16V[\x82a\x07\xDFV[PPV[a\x04\x1F\x83_\x01\x83s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16_\x1B\x83a\x08\xD0V[PPPV[_2s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x82s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x14a\x04\x93W`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x04\x8A\x90a\x0C\xCEV[`@Q\x80\x91\x03\x90\xFD[\x83_\x01_\x84\x81R` \x01\x90\x81R` \x01_ _\x83s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x81R` \x01\x90\x81R` \x01_ T\x90P\x93\x92PPPV[2s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x82s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x14a\x05XW`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x05O\x90a\x0C\xCEV[`@Q\x80\x91\x03\x90\xFD[\x80\x84_\x01_\x85\x81R` \x01\x90\x81R` \x01_ _\x84s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x81R` \x01\x90\x81R` \x01_ \x81\x90UPPPPPV[\x80\x83_\x01_\x84\x81R` \x01\x90\x81R` \x01_ _\x82\x82Ta\x05\xD1\x91\x90a\r\x19V[\x92PP\x81\x90UPPPPV[a\x06\na\x06\x04\x83a\x05\xECa\x06\x91V[g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16a\x08\xF3\x90\x91\x90c\xFF\xFF\xFF\xFF\x16V[\x82a\x07\xDFV[PPV[a\x06-\x82\x85_\x01_\x86\x81R` \x01\x90\x81R` \x01_ T\x10\x15\x82a\x07\xDFV[PPPPV[_\x82_\x01_\x83\x81R` \x01\x90\x81R` \x01_ T\x03a\x06\x8DW`\x01\x82`\x01\x01Ta\x06]\x91\x90a\r\x19V[\x82_\x01_\x83\x81R` \x01\x90\x81R` \x01_ \x81\x90UP\x81`\x01\x01_\x81T\x80\x92\x91\x90a\x06\x87\x90a\rLV[\x91\x90PUP[PPV[___\x7F\xBA(nM\x89\xDA\xBFK(x\xE8\x96B;\xB1#\xD9\xD5\x14>f&\x06\xFD4;gf\xD7\xBC\xF7!_\x1Cs\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16`@Qa\x06\xD9\x90a\r\xC0V[_`@Q\x80\x83\x03\x81\x85Z\xFA\x91PP=\x80_\x81\x14a\x07\x11W`@Q\x91P`\x1F\x19`?=\x01\x16\x82\x01`@R=\x82R=_` \x84\x01>a\x07\x16V[``\x91P[P\x91P\x91P\x81a\x07[W`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x07R\x90a\x0E\x1EV[`@Q\x80\x91\x03\x90\xFD[` \x81Q\x14a\x07\x9FW`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x07\x96\x90a\x0E\x86V[`@Q\x80\x91\x03\x90\xFD[_\x81\x80` \x01\x90Q\x81\x01\x90a\x07\xB4\x91\x90a\x0E\xCEV[\x90P\x80\x93PPPP\x90V[_\x81g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x10\x90P\x92\x91PPV[_\x7F=\xCD\xF6;A\xC1\x03V}r%\x97j\xD9\x14^\x86lz}\xCC\xC6\xC2w\xEA\x86\xAB\xBD&\x8F\xBA\xC9_\x1Cs\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83`@Q` \x01a\x08*\x91\x90a\x0F\x13V[`@Q` \x81\x83\x03\x03\x81R\x90`@R`@Qa\x08F\x91\x90a\x0FtV[_`@Q\x80\x83\x03\x81\x85Z\xFA\x91PP=\x80_\x81\x14a\x08~W`@Q\x91P`\x1F\x19`?=\x01\x16\x82\x01`@R=\x82R=_` \x84\x01>a\x08\x83V[``\x91P[PP\x90P\x80\x82\x90a\x08\xCAW`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x08\xC1\x91\x90a\x0F\xDCV[`@Q\x80\x91\x03\x90\xFD[PPPPV[a\x08\xEE_\x84_\x01_\x85\x81R` \x01\x90\x81R` \x01_ T\x11\x82a\x07\xDFV[PPPV[_\x81g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x11\x90P\x92\x91PPV[__\xFD[__\xFD[_`\x80\x82\x84\x03\x12\x15a\t0Wa\t/a\t\x17V[[\x81\x90P\x92\x91PPV[_`\x80\x82\x84\x03\x12\x15a\tNWa\tMa\t\x13V[[_a\t[\x84\x82\x85\x01a\t\x1BV[\x91PP\x92\x91PPV[_\x81\x90P\x91\x90PV[a\tv\x81a\tdV[\x82RPPV[_` \x82\x01\x90Pa\t\x8F_\x83\x01\x84a\tmV[\x92\x91PPV[_\x81\x90P\x91\x90PV[a\t\xA7\x81a\t\x95V[\x81\x14a\t\xB1W__\xFD[PV[_\x815\x90Pa\t\xC2\x81a\t\x9EV[\x92\x91PPV[__`\xA0\x83\x85\x03\x12\x15a\t\xDEWa\t\xDDa\t\x13V[[_a\t\xEB\x85\x82\x86\x01a\t\x1BV[\x92PP`\x80a\t\xFC\x85\x82\x86\x01a\t\xB4V[\x91PP\x92P\x92\x90PV[_a\n\x14` \x84\x01\x84a\t\xB4V[\x90P\x92\x91PPV[a\n%\x81a\t\x95V[\x82RPPV[_g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x82\x16\x90P\x91\x90PV[a\nG\x81a\n+V[\x81\x14a\nQW__\xFD[PV[_\x815\x90Pa\nb\x81a\n>V[\x92\x91PPV[_a\nv` \x84\x01\x84a\nTV[\x90P\x92\x91PPV[_\x81\x90P\x91\x90PV[_a\n\xA1a\n\x9Ca\n\x97\x84a\n+V[a\n~V[a\n+V[\x90P\x91\x90PV[a\n\xB1\x81a\n\x87V[\x82RPPV[_s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x82\x16\x90P\x91\x90PV[_a\n\xE0\x82a\n\xB7V[\x90P\x91\x90PV[a\n\xF0\x81a\n\xD6V[\x81\x14a\n\xFAW__\xFD[PV[_\x815\x90Pa\x0B\x0B\x81a\n\xE7V[\x92\x91PPV[_a\x0B\x1F` \x84\x01\x84a\n\xFDV[\x90P\x92\x91PPV[a\x0B0\x81a\n\xD6V[\x82RPPV[`\x80\x82\x01a\x0BF_\x83\x01\x83a\n\x06V[a\x0BR_\x85\x01\x82a\n\x1CV[Pa\x0B`` \x83\x01\x83a\nhV[a\x0Bm` \x85\x01\x82a\n\xA8V[Pa\x0B{`@\x83\x01\x83a\n\x06V[a\x0B\x88`@\x85\x01\x82a\n\x1CV[Pa\x0B\x96``\x83\x01\x83a\x0B\x11V[a\x0B\xA3``\x85\x01\x82a\x0B'V[PPPPV[_`\x80\x82\x01\x90Pa\x0B\xBC_\x83\x01\x84a\x0B6V[\x92\x91PPV[_` \x82\x84\x03\x12\x15a\x0B\xD7Wa\x0B\xD6a\t\x13V[[_a\x0B\xE4\x84\x82\x85\x01a\n\xFDV[\x91PP\x92\x91PPV[_` \x82\x84\x03\x12\x15a\x0C\x02Wa\x0C\x01a\t\x13V[[_a\x0C\x0F\x84\x82\x85\x01a\nTV[\x91PP\x92\x91PPV[a\x0C!\x81a\t\x95V[\x82RPPV[_`@\x82\x01\x90Pa\x0C:_\x83\x01\x85a\tmV[a\x0CG` \x83\x01\x84a\x0C\x18V[\x93\x92PPPV[_\x82\x82R` \x82\x01\x90P\x92\x91PPV[\x7FCannot access OwnedCounter owned_\x82\x01R\x7F by another address\0\0\0\0\0\0\0\0\0\0\0\0\0` \x82\x01RPV[_a\x0C\xB8`3\x83a\x0CNV[\x91Pa\x0C\xC3\x82a\x0C^V[`@\x82\x01\x90P\x91\x90PV[_` \x82\x01\x90P\x81\x81\x03_\x83\x01Ra\x0C\xE5\x81a\x0C\xACV[\x90P\x91\x90PV[\x7FNH{q\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0_R`\x11`\x04R`$_\xFD[_a\r#\x82a\t\x95V[\x91Pa\r.\x83a\t\x95V[\x92P\x82\x82\x01\x90P\x80\x82\x11\x15a\rFWa\rEa\x0C\xECV[[\x92\x91PPV[_a\rV\x82a\t\x95V[\x91P\x7F\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x82\x03a\r\x88Wa\r\x87a\x0C\xECV[[`\x01\x82\x01\x90P\x91\x90PV[_\x81\x90P\x92\x91PPV[PV[_a\r\xAB_\x83a\r\x93V[\x91Pa\r\xB6\x82a\r\x9DV[_\x82\x01\x90P\x91\x90PV[_a\r\xCA\x82a\r\xA0V[\x91P\x81\x90P\x91\x90PV[\x7FPrecompile call failed\0\0\0\0\0\0\0\0\0\0_\x82\x01RPV[_a\x0E\x08`\x16\x83a\x0CNV[\x91Pa\x0E\x13\x82a\r\xD4V[` \x82\x01\x90P\x91\x90PV[_` \x82\x01\x90P\x81\x81\x03_\x83\x01Ra\x0E5\x81a\r\xFCV[\x90P\x91\x90PV[\x7FInvalid output length\0\0\0\0\0\0\0\0\0\0\0_\x82\x01RPV[_a\x0Ep`\x15\x83a\x0CNV[\x91Pa\x0E{\x82a\x0E<V[` \x82\x01\x90P\x91\x90PV[_` \x82\x01\x90P\x81\x81\x03_\x83\x01Ra\x0E\x9D\x81a\x0EdV[\x90P\x91\x90PV[a\x0E\xAD\x81a\n+V[\x81\x14a\x0E\xB7W__\xFD[PV[_\x81Q\x90Pa\x0E\xC8\x81a\x0E\xA4V[\x92\x91PPV[_` \x82\x84\x03\x12\x15a\x0E\xE3Wa\x0E\xE2a\t\x13V[[_a\x0E\xF0\x84\x82\x85\x01a\x0E\xBAV[\x91PP\x92\x91PPV[_\x81\x15\x15\x90P\x91\x90PV[a\x0F\r\x81a\x0E\xF9V[\x82RPPV[_` \x82\x01\x90Pa\x0F&_\x83\x01\x84a\x0F\x04V[\x92\x91PPV[_\x81Q\x90P\x91\x90PV[\x82\x81\x83^_\x83\x83\x01RPPPV[_a\x0FN\x82a\x0F,V[a\x0FX\x81\x85a\r\x93V[\x93Pa\x0Fh\x81\x85` \x86\x01a\x0F6V[\x80\x84\x01\x91PP\x92\x91PPV[_a\x0F\x7F\x82\x84a\x0FDV[\x91P\x81\x90P\x92\x91PPV[_\x81Q\x90P\x91\x90PV[_`\x1F\x19`\x1F\x83\x01\x16\x90P\x91\x90PV[_a\x0F\xAE\x82a\x0F\x8AV[a\x0F\xB8\x81\x85a\x0CNV[\x93Pa\x0F\xC8\x81\x85` \x86\x01a\x0F6V[a\x0F\xD1\x81a\x0F\x94V[\x84\x01\x91PP\x92\x91PPV[_` \x82\x01\x90P\x81\x81\x03_\x83\x01Ra\x0F\xF4\x81\x84a\x0F\xA4V[\x90P\x92\x91PPV\xFECannot decide winner before deadlineCannot set winner with less votes than threshold",
    );
    /// The runtime bytecode of the contract, as deployed on the network.
    ///
    /// ```text
    ///0x608060405234801561000f575f5ffd5b506004361061004a575f3560e01c806324c6e3c41461004e578063995d5d911461007e578063a7d4c4731461009a578063e8021822146100b6575b5f5ffd5b61006860048036038101906100639190610939565b6100d2565b604051610075919061097c565b60405180910390f35b61009860048036038101906100939190610939565b610101565b005b6100b460048036038101906100af91906109c8565b610160565b005b6100d060048036038101906100cb91906109c8565b6102ce565b005b5f816040516020016100e49190610ba9565b604051602081830303815290604052805190602001209050919050565b8060600160208101906101149190610bc2565b73ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff161461014a575f5ffd5b61015d335f6103a190919063ffffffff16565b50565b6101b18260200160208101906101769190610bed565b6040518060400160405280601a81526020017f43616e6e6f7420766f746520616674657220646561646c696e650000000000008152506103c9565b5f6101bb836100d2565b9050610207336040518060400160405280601d81526020017f43616e6e6f7420766f7465206966206e6f7420726567697374657265640000008152505f6103fa9092919063ffffffff16565b5f61021e823360026104249092919063ffffffff16565b14610227575f5ffd5b6102408133600160026104ea909392919063ffffffff16565b5f8183604051602001610254929190610c27565b60405160208183030381529060405280519060200120905061028381600160036105b09092919063ffffffff16565b823373ffffffffffffffffffffffffffffffffffffffff16837fe4abc5380fa6939d1dc23b5e90b3a8a0e328f0f1a82a5f42bfb795bf9c71750560405160405180910390a450505050565b6103028260200160208101906102e49190610bed565b604051806060016040528060248152602001610ffd602491396105dd565b5f61030c836100d2565b90505f8183604051602001610322929190610c27565b60405160208183030381529060405280519060200120905061036d81855f013560405180606001604052806030815260200161102160309139600361060e909392919063ffffffff16565b82827f269d3a24712436f77df15d63de7d2337a060c9102dee6f46c909fb0fa2d52f0c60405160405180910390a350505050565b6103c5825f018273ffffffffffffffffffffffffffffffffffffffff165f1b610633565b5050565b6103f66103f0836103d8610691565b67ffffffffffffffff166107bf90919063ffffffff16565b826107df565b5050565b61041f835f018373ffffffffffffffffffffffffffffffffffffffff165f1b836108d0565b505050565b5f3273ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff1614610493576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161048a90610cce565b60405180910390fd5b835f015f8481526020019081526020015f205f8373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205490509392505050565b3273ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff1614610558576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161054f90610cce565b60405180910390fd5b80845f015f8581526020019081526020015f205f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f208190555050505050565b80835f015f8481526020019081526020015f205f8282546105d19190610d19565b92505081905550505050565b61060a610604836105ec610691565b67ffffffffffffffff166108f390919063ffffffff16565b826107df565b5050565b61062d82855f015f8681526020019081526020015f20541015826107df565b50505050565b5f825f015f8381526020019081526020015f20540361068d576001826001015461065d9190610d19565b825f015f8381526020019081526020015f2081905550816001015f81548092919061068790610d4c565b91905055505b5050565b5f5f5f7fba286e4d89dabf4b2878e896423bb123d9d5143e662606fd343b6766d7bcf7215f1c73ffffffffffffffffffffffffffffffffffffffff166040516106d990610dc0565b5f60405180830381855afa9150503d805f8114610711576040519150601f19603f3d011682016040523d82523d5f602084013e610716565b606091505b50915091508161075b576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161075290610e1e565b60405180910390fd5b602081511461079f576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161079690610e86565b60405180910390fd5b5f818060200190518101906107b49190610ece565b905080935050505090565b5f8167ffffffffffffffff168367ffffffffffffffff1610905092915050565b5f7f3dcdf63b41c103567d7225976ad9145e866c7a7dccc6c277ea86abbd268fbac95f1c73ffffffffffffffffffffffffffffffffffffffff168360405160200161082a9190610f13565b6040516020818303038152906040526040516108469190610f74565b5f60405180830381855afa9150503d805f811461087e576040519150601f19603f3d011682016040523d82523d5f602084013e610883565b606091505b505090508082906108ca576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016108c19190610fdc565b60405180910390fd5b50505050565b6108ee5f845f015f8581526020019081526020015f205411826107df565b505050565b5f8167ffffffffffffffff168367ffffffffffffffff1611905092915050565b5f5ffd5b5f5ffd5b5f608082840312156109305761092f610917565b5b81905092915050565b5f6080828403121561094e5761094d610913565b5b5f61095b8482850161091b565b91505092915050565b5f819050919050565b61097681610964565b82525050565b5f60208201905061098f5f83018461096d565b92915050565b5f819050919050565b6109a781610995565b81146109b1575f5ffd5b50565b5f813590506109c28161099e565b92915050565b5f5f60a083850312156109de576109dd610913565b5b5f6109eb8582860161091b565b92505060806109fc858286016109b4565b9150509250929050565b5f610a1460208401846109b4565b905092915050565b610a2581610995565b82525050565b5f67ffffffffffffffff82169050919050565b610a4781610a2b565b8114610a51575f5ffd5b50565b5f81359050610a6281610a3e565b92915050565b5f610a766020840184610a54565b905092915050565b5f819050919050565b5f610aa1610a9c610a9784610a2b565b610a7e565b610a2b565b9050919050565b610ab181610a87565b82525050565b5f73ffffffffffffffffffffffffffffffffffffffff82169050919050565b5f610ae082610ab7565b9050919050565b610af081610ad6565b8114610afa575f5ffd5b50565b5f81359050610b0b81610ae7565b92915050565b5f610b1f6020840184610afd565b905092915050565b610b3081610ad6565b82525050565b60808201610b465f830183610a06565b610b525f850182610a1c565b50610b606020830183610a68565b610b6d6020850182610aa8565b50610b7b6040830183610a06565b610b886040850182610a1c565b50610b966060830183610b11565b610ba36060850182610b27565b50505050565b5f608082019050610bbc5f830184610b36565b92915050565b5f60208284031215610bd757610bd6610913565b5b5f610be484828501610afd565b91505092915050565b5f60208284031215610c0257610c01610913565b5b5f610c0f84828501610a54565b91505092915050565b610c2181610995565b82525050565b5f604082019050610c3a5f83018561096d565b610c476020830184610c18565b9392505050565b5f82825260208201905092915050565b7f43616e6e6f7420616363657373204f776e6564436f756e746572206f776e65645f8201527f20627920616e6f74686572206164647265737300000000000000000000000000602082015250565b5f610cb8603383610c4e565b9150610cc382610c5e565b604082019050919050565b5f6020820190508181035f830152610ce581610cac565b9050919050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b5f610d2382610995565b9150610d2e83610995565b9250828201905080821115610d4657610d45610cec565b5b92915050565b5f610d5682610995565b91507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff8203610d8857610d87610cec565b5b600182019050919050565b5f81905092915050565b50565b5f610dab5f83610d93565b9150610db682610d9d565b5f82019050919050565b5f610dca82610da0565b9150819050919050565b7f507265636f6d70696c652063616c6c206661696c6564000000000000000000005f82015250565b5f610e08601683610c4e565b9150610e1382610dd4565b602082019050919050565b5f6020820190508181035f830152610e3581610dfc565b9050919050565b7f496e76616c6964206f7574707574206c656e67746800000000000000000000005f82015250565b5f610e70601583610c4e565b9150610e7b82610e3c565b602082019050919050565b5f6020820190508181035f830152610e9d81610e64565b9050919050565b610ead81610a2b565b8114610eb7575f5ffd5b50565b5f81519050610ec881610ea4565b92915050565b5f60208284031215610ee357610ee2610913565b5b5f610ef084828501610eba565b91505092915050565b5f8115159050919050565b610f0d81610ef9565b82525050565b5f602082019050610f265f830184610f04565b92915050565b5f81519050919050565b8281835e5f83830152505050565b5f610f4e82610f2c565b610f588185610d93565b9350610f68818560208601610f36565b80840191505092915050565b5f610f7f8284610f44565b915081905092915050565b5f81519050919050565b5f601f19601f8301169050919050565b5f610fae82610f8a565b610fb88185610c4e565b9350610fc8818560208601610f36565b610fd181610f94565b840191505092915050565b5f6020820190508181035f830152610ff48184610fa4565b90509291505056fe43616e6e6f74206465636964652077696e6e6572206265666f726520646561646c696e6543616e6e6f74207365742077696e6e65722077697468206c65737320766f746573207468616e207468726573686f6c64
    /// ```
    #[rustfmt::skip]
    #[allow(clippy::all)]
    pub static DEPLOYED_BYTECODE: alloy_sol_types::private::Bytes = alloy_sol_types::private::Bytes::from_static(
        b"`\x80`@R4\x80\x15a\0\x0FW__\xFD[P`\x046\x10a\0JW_5`\xE0\x1C\x80c$\xC6\xE3\xC4\x14a\0NW\x80c\x99]]\x91\x14a\0~W\x80c\xA7\xD4\xC4s\x14a\0\x9AW\x80c\xE8\x02\x18\"\x14a\0\xB6W[__\xFD[a\0h`\x04\x806\x03\x81\x01\x90a\0c\x91\x90a\t9V[a\0\xD2V[`@Qa\0u\x91\x90a\t|V[`@Q\x80\x91\x03\x90\xF3[a\0\x98`\x04\x806\x03\x81\x01\x90a\0\x93\x91\x90a\t9V[a\x01\x01V[\0[a\0\xB4`\x04\x806\x03\x81\x01\x90a\0\xAF\x91\x90a\t\xC8V[a\x01`V[\0[a\0\xD0`\x04\x806\x03\x81\x01\x90a\0\xCB\x91\x90a\t\xC8V[a\x02\xCEV[\0[_\x81`@Q` \x01a\0\xE4\x91\x90a\x0B\xA9V[`@Q` \x81\x83\x03\x03\x81R\x90`@R\x80Q\x90` \x01 \x90P\x91\x90PV[\x80``\x01` \x81\x01\x90a\x01\x14\x91\x90a\x0B\xC2V[s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x163s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x14a\x01JW__\xFD[a\x01]3_a\x03\xA1\x90\x91\x90c\xFF\xFF\xFF\xFF\x16V[PV[a\x01\xB1\x82` \x01` \x81\x01\x90a\x01v\x91\x90a\x0B\xEDV[`@Q\x80`@\x01`@R\x80`\x1A\x81R` \x01\x7FCannot vote after deadline\0\0\0\0\0\0\x81RPa\x03\xC9V[_a\x01\xBB\x83a\0\xD2V[\x90Pa\x02\x073`@Q\x80`@\x01`@R\x80`\x1D\x81R` \x01\x7FCannot vote if not registered\0\0\0\x81RP_a\x03\xFA\x90\x92\x91\x90c\xFF\xFF\xFF\xFF\x16V[_a\x02\x1E\x823`\x02a\x04$\x90\x92\x91\x90c\xFF\xFF\xFF\xFF\x16V[\x14a\x02'W__\xFD[a\x02@\x813`\x01`\x02a\x04\xEA\x90\x93\x92\x91\x90c\xFF\xFF\xFF\xFF\x16V[_\x81\x83`@Q` \x01a\x02T\x92\x91\x90a\x0C'V[`@Q` \x81\x83\x03\x03\x81R\x90`@R\x80Q\x90` \x01 \x90Pa\x02\x83\x81`\x01`\x03a\x05\xB0\x90\x92\x91\x90c\xFF\xFF\xFF\xFF\x16V[\x823s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83\x7F\xE4\xAB\xC58\x0F\xA6\x93\x9D\x1D\xC2;^\x90\xB3\xA8\xA0\xE3(\xF0\xF1\xA8*_B\xBF\xB7\x95\xBF\x9Cqu\x05`@Q`@Q\x80\x91\x03\x90\xA4PPPPV[a\x03\x02\x82` \x01` \x81\x01\x90a\x02\xE4\x91\x90a\x0B\xEDV[`@Q\x80``\x01`@R\x80`$\x81R` \x01a\x0F\xFD`$\x919a\x05\xDDV[_a\x03\x0C\x83a\0\xD2V[\x90P_\x81\x83`@Q` \x01a\x03\"\x92\x91\x90a\x0C'V[`@Q` \x81\x83\x03\x03\x81R\x90`@R\x80Q\x90` \x01 \x90Pa\x03m\x81\x85_\x015`@Q\x80``\x01`@R\x80`0\x81R` \x01a\x10!`0\x919`\x03a\x06\x0E\x90\x93\x92\x91\x90c\xFF\xFF\xFF\xFF\x16V[\x82\x82\x7F&\x9D:$q$6\xF7}\xF1]c\xDE}#7\xA0`\xC9\x10-\xEEoF\xC9\t\xFB\x0F\xA2\xD5/\x0C`@Q`@Q\x80\x91\x03\x90\xA3PPPPV[a\x03\xC5\x82_\x01\x82s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16_\x1Ba\x063V[PPV[a\x03\xF6a\x03\xF0\x83a\x03\xD8a\x06\x91V[g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16a\x07\xBF\x90\x91\x90c\xFF\xFF\xFF\xFF\x16V[\x82a\x07\xDFV[PPV[a\x04\x1F\x83_\x01\x83s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16_\x1B\x83a\x08\xD0V[PPPV[_2s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x82s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x14a\x04\x93W`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x04\x8A\x90a\x0C\xCEV[`@Q\x80\x91\x03\x90\xFD[\x83_\x01_\x84\x81R` \x01\x90\x81R` \x01_ _\x83s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x81R` \x01\x90\x81R` \x01_ T\x90P\x93\x92PPPV[2s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x82s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x14a\x05XW`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x05O\x90a\x0C\xCEV[`@Q\x80\x91\x03\x90\xFD[\x80\x84_\x01_\x85\x81R` \x01\x90\x81R` \x01_ _\x84s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x81R` \x01\x90\x81R` \x01_ \x81\x90UPPPPPV[\x80\x83_\x01_\x84\x81R` \x01\x90\x81R` \x01_ _\x82\x82Ta\x05\xD1\x91\x90a\r\x19V[\x92PP\x81\x90UPPPPV[a\x06\na\x06\x04\x83a\x05\xECa\x06\x91V[g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16a\x08\xF3\x90\x91\x90c\xFF\xFF\xFF\xFF\x16V[\x82a\x07\xDFV[PPV[a\x06-\x82\x85_\x01_\x86\x81R` \x01\x90\x81R` \x01_ T\x10\x15\x82a\x07\xDFV[PPPPV[_\x82_\x01_\x83\x81R` \x01\x90\x81R` \x01_ T\x03a\x06\x8DW`\x01\x82`\x01\x01Ta\x06]\x91\x90a\r\x19V[\x82_\x01_\x83\x81R` \x01\x90\x81R` \x01_ \x81\x90UP\x81`\x01\x01_\x81T\x80\x92\x91\x90a\x06\x87\x90a\rLV[\x91\x90PUP[PPV[___\x7F\xBA(nM\x89\xDA\xBFK(x\xE8\x96B;\xB1#\xD9\xD5\x14>f&\x06\xFD4;gf\xD7\xBC\xF7!_\x1Cs\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16`@Qa\x06\xD9\x90a\r\xC0V[_`@Q\x80\x83\x03\x81\x85Z\xFA\x91PP=\x80_\x81\x14a\x07\x11W`@Q\x91P`\x1F\x19`?=\x01\x16\x82\x01`@R=\x82R=_` \x84\x01>a\x07\x16V[``\x91P[P\x91P\x91P\x81a\x07[W`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x07R\x90a\x0E\x1EV[`@Q\x80\x91\x03\x90\xFD[` \x81Q\x14a\x07\x9FW`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x07\x96\x90a\x0E\x86V[`@Q\x80\x91\x03\x90\xFD[_\x81\x80` \x01\x90Q\x81\x01\x90a\x07\xB4\x91\x90a\x0E\xCEV[\x90P\x80\x93PPPP\x90V[_\x81g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x10\x90P\x92\x91PPV[_\x7F=\xCD\xF6;A\xC1\x03V}r%\x97j\xD9\x14^\x86lz}\xCC\xC6\xC2w\xEA\x86\xAB\xBD&\x8F\xBA\xC9_\x1Cs\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83`@Q` \x01a\x08*\x91\x90a\x0F\x13V[`@Q` \x81\x83\x03\x03\x81R\x90`@R`@Qa\x08F\x91\x90a\x0FtV[_`@Q\x80\x83\x03\x81\x85Z\xFA\x91PP=\x80_\x81\x14a\x08~W`@Q\x91P`\x1F\x19`?=\x01\x16\x82\x01`@R=\x82R=_` \x84\x01>a\x08\x83V[``\x91P[PP\x90P\x80\x82\x90a\x08\xCAW`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x08\xC1\x91\x90a\x0F\xDCV[`@Q\x80\x91\x03\x90\xFD[PPPPV[a\x08\xEE_\x84_\x01_\x85\x81R` \x01\x90\x81R` \x01_ T\x11\x82a\x07\xDFV[PPPV[_\x81g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x11\x90P\x92\x91PPV[__\xFD[__\xFD[_`\x80\x82\x84\x03\x12\x15a\t0Wa\t/a\t\x17V[[\x81\x90P\x92\x91PPV[_`\x80\x82\x84\x03\x12\x15a\tNWa\tMa\t\x13V[[_a\t[\x84\x82\x85\x01a\t\x1BV[\x91PP\x92\x91PPV[_\x81\x90P\x91\x90PV[a\tv\x81a\tdV[\x82RPPV[_` \x82\x01\x90Pa\t\x8F_\x83\x01\x84a\tmV[\x92\x91PPV[_\x81\x90P\x91\x90PV[a\t\xA7\x81a\t\x95V[\x81\x14a\t\xB1W__\xFD[PV[_\x815\x90Pa\t\xC2\x81a\t\x9EV[\x92\x91PPV[__`\xA0\x83\x85\x03\x12\x15a\t\xDEWa\t\xDDa\t\x13V[[_a\t\xEB\x85\x82\x86\x01a\t\x1BV[\x92PP`\x80a\t\xFC\x85\x82\x86\x01a\t\xB4V[\x91PP\x92P\x92\x90PV[_a\n\x14` \x84\x01\x84a\t\xB4V[\x90P\x92\x91PPV[a\n%\x81a\t\x95V[\x82RPPV[_g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x82\x16\x90P\x91\x90PV[a\nG\x81a\n+V[\x81\x14a\nQW__\xFD[PV[_\x815\x90Pa\nb\x81a\n>V[\x92\x91PPV[_a\nv` \x84\x01\x84a\nTV[\x90P\x92\x91PPV[_\x81\x90P\x91\x90PV[_a\n\xA1a\n\x9Ca\n\x97\x84a\n+V[a\n~V[a\n+V[\x90P\x91\x90PV[a\n\xB1\x81a\n\x87V[\x82RPPV[_s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x82\x16\x90P\x91\x90PV[_a\n\xE0\x82a\n\xB7V[\x90P\x91\x90PV[a\n\xF0\x81a\n\xD6V[\x81\x14a\n\xFAW__\xFD[PV[_\x815\x90Pa\x0B\x0B\x81a\n\xE7V[\x92\x91PPV[_a\x0B\x1F` \x84\x01\x84a\n\xFDV[\x90P\x92\x91PPV[a\x0B0\x81a\n\xD6V[\x82RPPV[`\x80\x82\x01a\x0BF_\x83\x01\x83a\n\x06V[a\x0BR_\x85\x01\x82a\n\x1CV[Pa\x0B`` \x83\x01\x83a\nhV[a\x0Bm` \x85\x01\x82a\n\xA8V[Pa\x0B{`@\x83\x01\x83a\n\x06V[a\x0B\x88`@\x85\x01\x82a\n\x1CV[Pa\x0B\x96``\x83\x01\x83a\x0B\x11V[a\x0B\xA3``\x85\x01\x82a\x0B'V[PPPPV[_`\x80\x82\x01\x90Pa\x0B\xBC_\x83\x01\x84a\x0B6V[\x92\x91PPV[_` \x82\x84\x03\x12\x15a\x0B\xD7Wa\x0B\xD6a\t\x13V[[_a\x0B\xE4\x84\x82\x85\x01a\n\xFDV[\x91PP\x92\x91PPV[_` \x82\x84\x03\x12\x15a\x0C\x02Wa\x0C\x01a\t\x13V[[_a\x0C\x0F\x84\x82\x85\x01a\nTV[\x91PP\x92\x91PPV[a\x0C!\x81a\t\x95V[\x82RPPV[_`@\x82\x01\x90Pa\x0C:_\x83\x01\x85a\tmV[a\x0CG` \x83\x01\x84a\x0C\x18V[\x93\x92PPPV[_\x82\x82R` \x82\x01\x90P\x92\x91PPV[\x7FCannot access OwnedCounter owned_\x82\x01R\x7F by another address\0\0\0\0\0\0\0\0\0\0\0\0\0` \x82\x01RPV[_a\x0C\xB8`3\x83a\x0CNV[\x91Pa\x0C\xC3\x82a\x0C^V[`@\x82\x01\x90P\x91\x90PV[_` \x82\x01\x90P\x81\x81\x03_\x83\x01Ra\x0C\xE5\x81a\x0C\xACV[\x90P\x91\x90PV[\x7FNH{q\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0_R`\x11`\x04R`$_\xFD[_a\r#\x82a\t\x95V[\x91Pa\r.\x83a\t\x95V[\x92P\x82\x82\x01\x90P\x80\x82\x11\x15a\rFWa\rEa\x0C\xECV[[\x92\x91PPV[_a\rV\x82a\t\x95V[\x91P\x7F\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x82\x03a\r\x88Wa\r\x87a\x0C\xECV[[`\x01\x82\x01\x90P\x91\x90PV[_\x81\x90P\x92\x91PPV[PV[_a\r\xAB_\x83a\r\x93V[\x91Pa\r\xB6\x82a\r\x9DV[_\x82\x01\x90P\x91\x90PV[_a\r\xCA\x82a\r\xA0V[\x91P\x81\x90P\x91\x90PV[\x7FPrecompile call failed\0\0\0\0\0\0\0\0\0\0_\x82\x01RPV[_a\x0E\x08`\x16\x83a\x0CNV[\x91Pa\x0E\x13\x82a\r\xD4V[` \x82\x01\x90P\x91\x90PV[_` \x82\x01\x90P\x81\x81\x03_\x83\x01Ra\x0E5\x81a\r\xFCV[\x90P\x91\x90PV[\x7FInvalid output length\0\0\0\0\0\0\0\0\0\0\0_\x82\x01RPV[_a\x0Ep`\x15\x83a\x0CNV[\x91Pa\x0E{\x82a\x0E<V[` \x82\x01\x90P\x91\x90PV[_` \x82\x01\x90P\x81\x81\x03_\x83\x01Ra\x0E\x9D\x81a\x0EdV[\x90P\x91\x90PV[a\x0E\xAD\x81a\n+V[\x81\x14a\x0E\xB7W__\xFD[PV[_\x81Q\x90Pa\x0E\xC8\x81a\x0E\xA4V[\x92\x91PPV[_` \x82\x84\x03\x12\x15a\x0E\xE3Wa\x0E\xE2a\t\x13V[[_a\x0E\xF0\x84\x82\x85\x01a\x0E\xBAV[\x91PP\x92\x91PPV[_\x81\x15\x15\x90P\x91\x90PV[a\x0F\r\x81a\x0E\xF9V[\x82RPPV[_` \x82\x01\x90Pa\x0F&_\x83\x01\x84a\x0F\x04V[\x92\x91PPV[_\x81Q\x90P\x91\x90PV[\x82\x81\x83^_\x83\x83\x01RPPPV[_a\x0FN\x82a\x0F,V[a\x0FX\x81\x85a\r\x93V[\x93Pa\x0Fh\x81\x85` \x86\x01a\x0F6V[\x80\x84\x01\x91PP\x92\x91PPV[_a\x0F\x7F\x82\x84a\x0FDV[\x91P\x81\x90P\x92\x91PPV[_\x81Q\x90P\x91\x90PV[_`\x1F\x19`\x1F\x83\x01\x16\x90P\x91\x90PV[_a\x0F\xAE\x82a\x0F\x8AV[a\x0F\xB8\x81\x85a\x0CNV[\x93Pa\x0F\xC8\x81\x85` \x86\x01a\x0F6V[a\x0F\xD1\x81a\x0F\x94V[\x84\x01\x91PP\x92\x91PPV[_` \x82\x01\x90P\x81\x81\x03_\x83\x01Ra\x0F\xF4\x81\x84a\x0F\xA4V[\x90P\x92\x91PPV\xFECannot decide winner before deadlineCannot set winner with less votes than threshold",
    );
    #[derive(serde::Serialize, serde::Deserialize, Default, Debug, PartialEq, Eq, Hash)]
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
        fn _type_assertion(_t: alloy_sol_types::private::AssertTypeEq<UnderlyingRustTuple>) {
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
                    <alloy::sol_types::sol_data::Uint<256> as alloy_sol_types::SolType>::tokenize(
                        &self.threshold,
                    ),
                    <Time::Timestamp as alloy_sol_types::SolType>::tokenize(&self.deadline),
                    <alloy::sol_types::sol_data::Uint<256> as alloy_sol_types::SolType>::tokenize(
                        &self.nonce,
                    ),
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
                let tuple =
                    <UnderlyingRustTuple<'_> as ::core::convert::From<Self>>::from(self.clone());
                <UnderlyingSolTuple<'_> as alloy_sol_types::SolType>::abi_encoded_size(&tuple)
            }
            #[inline]
            fn stv_eip712_data_word(&self) -> alloy_sol_types::Word {
                <Self as alloy_sol_types::SolStruct>::eip712_hash_struct(self)
            }
            #[inline]
            fn stv_abi_encode_packed_to(&self, out: &mut alloy_sol_types::private::Vec<u8>) {
                let tuple =
                    <UnderlyingRustTuple<'_> as ::core::convert::From<Self>>::from(self.clone());
                <UnderlyingSolTuple<'_> as alloy_sol_types::SolType>::abi_encode_packed_to(
                    &tuple, out,
                )
            }
            #[inline]
            fn stv_abi_packed_encoded_size(&self) -> usize {
                if let Some(size) = <Self as alloy_sol_types::SolType>::PACKED_ENCODED_SIZE {
                    return size;
                }
                let tuple =
                    <UnderlyingRustTuple<'_> as ::core::convert::From<Self>>::from(self.clone());
                <UnderlyingSolTuple<'_> as alloy_sol_types::SolType>::abi_packed_encoded_size(
                    &tuple,
                )
            }
        }
        #[automatically_derived]
        impl alloy_sol_types::SolType for VotingInfo {
            type RustType = Self;
            type Token<'a> = <UnderlyingSolTuple<'a> as alloy_sol_types::SolType>::Token<'a>;
            const SOL_NAME: &'static str = <Self as alloy_sol_types::SolStruct>::NAME;
            const ENCODED_SIZE: Option<usize> =
                <UnderlyingSolTuple<'_> as alloy_sol_types::SolType>::ENCODED_SIZE;
            const PACKED_ENCODED_SIZE: Option<usize> =
                <UnderlyingSolTuple<'_> as alloy_sol_types::SolType>::PACKED_ENCODED_SIZE;
            #[inline]
            fn valid_token(token: &Self::Token<'_>) -> bool {
                <UnderlyingSolTuple<'_> as alloy_sol_types::SolType>::valid_token(token)
            }
            #[inline]
            fn detokenize(token: Self::Token<'_>) -> Self::RustType {
                let tuple = <UnderlyingSolTuple<'_> as alloy_sol_types::SolType>::detokenize(token);
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
            fn eip712_components(
            ) -> alloy_sol_types::private::Vec<alloy_sol_types::private::Cow<'static, str>>
            {
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
                out.reserve(<Self as alloy_sol_types::EventTopic>::topic_preimage_length(rust));
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
            fn encode_topic(rust: &Self::RustType) -> alloy_sol_types::abi::token::WordToken {
                let mut out = alloy_sol_types::private::Vec::new();
                <Self as alloy_sol_types::EventTopic>::encode_topic_preimage(rust, &mut out);
                alloy_sol_types::abi::token::WordToken(alloy_sol_types::private::keccak256(out))
            }
        }
    };
    #[derive(serde::Serialize, serde::Deserialize, Default, Debug, PartialEq, Eq, Hash)]
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
            type DataToken<'a> = <Self::DataTuple<'a> as alloy_sol_types::SolType>::Token<'a>;
            type TopicList = (
                alloy_sol_types::sol_data::FixedBytes<32>,
                alloy::sol_types::sol_data::FixedBytes<32>,
                alloy::sol_types::sol_data::Address,
                alloy::sol_types::sol_data::Uint<256>,
            );
            const SIGNATURE: &'static str = "Voted(bytes32,address,uint256)";
            const SIGNATURE_HASH: alloy_sol_types::private::B256 =
                alloy_sol_types::private::B256::new([
                    228u8, 171u8, 197u8, 56u8, 15u8, 166u8, 147u8, 157u8, 29u8, 194u8, 59u8, 94u8,
                    144u8, 179u8, 168u8, 160u8, 227u8, 40u8, 240u8, 241u8, 168u8, 42u8, 95u8, 66u8,
                    191u8, 183u8, 149u8, 191u8, 156u8, 113u8, 117u8, 5u8,
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
                    return Err(alloy_sol_types::Error::invalid_event_signature_hash(
                        Self::SIGNATURE,
                        topics.0,
                        Self::SIGNATURE_HASH,
                    ));
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
                out[0usize] = alloy_sol_types::abi::token::WordToken(Self::SIGNATURE_HASH);
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
    #[derive(serde::Serialize, serde::Deserialize, Default, Debug, PartialEq, Eq, Hash)]
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
            type DataToken<'a> = <Self::DataTuple<'a> as alloy_sol_types::SolType>::Token<'a>;
            type TopicList = (
                alloy_sol_types::sol_data::FixedBytes<32>,
                alloy::sol_types::sol_data::FixedBytes<32>,
                alloy::sol_types::sol_data::Uint<256>,
            );
            const SIGNATURE: &'static str = "Winner(bytes32,uint256)";
            const SIGNATURE_HASH: alloy_sol_types::private::B256 =
                alloy_sol_types::private::B256::new([
                    38u8, 157u8, 58u8, 36u8, 113u8, 36u8, 54u8, 247u8, 125u8, 241u8, 93u8, 99u8,
                    222u8, 125u8, 35u8, 55u8, 160u8, 96u8, 201u8, 16u8, 45u8, 238u8, 111u8, 70u8,
                    201u8, 9u8, 251u8, 15u8, 162u8, 213u8, 47u8, 12u8,
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
                    return Err(alloy_sol_types::Error::invalid_event_signature_hash(
                        Self::SIGNATURE,
                        topics.0,
                        Self::SIGNATURE_HASH,
                    ));
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
                out[0usize] = alloy_sol_types::abi::token::WordToken(Self::SIGNATURE_HASH);
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
    #[derive(serde::Serialize, serde::Deserialize, Default, Debug, PartialEq, Eq, Hash)]
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
            type UnderlyingRustTuple<'a> = (<VotingInfo as alloy::sol_types::SolType>::RustType,);
            #[cfg(test)]
            #[allow(dead_code, unreachable_patterns)]
            fn _type_assertion(_t: alloy_sol_types::private::AssertTypeEq<UnderlyingRustTuple>) {
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
            fn _type_assertion(_t: alloy_sol_types::private::AssertTypeEq<UnderlyingRustTuple>) {
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
        impl registerReturn {
            fn _tokenize(&self) -> <registerCall as alloy_sol_types::SolCall>::ReturnToken<'_> {
                ()
            }
        }
        #[automatically_derived]
        impl alloy_sol_types::SolCall for registerCall {
            type Parameters<'a> = (VotingInfo,);
            type Token<'a> = <Self::Parameters<'a> as alloy_sol_types::SolType>::Token<'a>;
            type Return = registerReturn;
            type ReturnTuple<'a> = ();
            type ReturnToken<'a> = <Self::ReturnTuple<'a> as alloy_sol_types::SolType>::Token<'a>;
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
            fn tokenize_returns(ret: &Self::Return) -> Self::ReturnToken<'_> {
                registerReturn::_tokenize(ret)
            }
            #[inline]
            fn abi_decode_returns(data: &[u8]) -> alloy_sol_types::Result<Self::Return> {
                <Self::ReturnTuple<'_> as alloy_sol_types::SolType>::abi_decode_sequence(data)
                    .map(Into::into)
            }
            #[inline]
            fn abi_decode_returns_validate(data: &[u8]) -> alloy_sol_types::Result<Self::Return> {
                <Self::ReturnTuple<'_> as alloy_sol_types::SolType>::abi_decode_sequence_validate(
                    data,
                )
                .map(Into::into)
            }
        }
    };
    #[derive(serde::Serialize, serde::Deserialize, Default, Debug, PartialEq, Eq, Hash)]
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
            type UnderlyingSolTuple<'a> = (VotingInfo, alloy::sol_types::sol_data::Uint<256>);
            #[doc(hidden)]
            type UnderlyingRustTuple<'a> = (
                <VotingInfo as alloy::sol_types::SolType>::RustType,
                alloy::sol_types::private::primitives::aliases::U256,
            );
            #[cfg(test)]
            #[allow(dead_code, unreachable_patterns)]
            fn _type_assertion(_t: alloy_sol_types::private::AssertTypeEq<UnderlyingRustTuple>) {
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
            fn _type_assertion(_t: alloy_sol_types::private::AssertTypeEq<UnderlyingRustTuple>) {
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
        impl setWinnerReturn {
            fn _tokenize(&self) -> <setWinnerCall as alloy_sol_types::SolCall>::ReturnToken<'_> {
                ()
            }
        }
        #[automatically_derived]
        impl alloy_sol_types::SolCall for setWinnerCall {
            type Parameters<'a> = (VotingInfo, alloy::sol_types::sol_data::Uint<256>);
            type Token<'a> = <Self::Parameters<'a> as alloy_sol_types::SolType>::Token<'a>;
            type Return = setWinnerReturn;
            type ReturnTuple<'a> = ();
            type ReturnToken<'a> = <Self::ReturnTuple<'a> as alloy_sol_types::SolType>::Token<'a>;
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
                    <alloy::sol_types::sol_data::Uint<256> as alloy_sol_types::SolType>::tokenize(
                        &self.choice,
                    ),
                )
            }
            #[inline]
            fn tokenize_returns(ret: &Self::Return) -> Self::ReturnToken<'_> {
                setWinnerReturn::_tokenize(ret)
            }
            #[inline]
            fn abi_decode_returns(data: &[u8]) -> alloy_sol_types::Result<Self::Return> {
                <Self::ReturnTuple<'_> as alloy_sol_types::SolType>::abi_decode_sequence(data)
                    .map(Into::into)
            }
            #[inline]
            fn abi_decode_returns_validate(data: &[u8]) -> alloy_sol_types::Result<Self::Return> {
                <Self::ReturnTuple<'_> as alloy_sol_types::SolType>::abi_decode_sequence_validate(
                    data,
                )
                .map(Into::into)
            }
        }
    };
    #[derive(serde::Serialize, serde::Deserialize, Default, Debug, PartialEq, Eq, Hash)]
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
            type UnderlyingSolTuple<'a> = (VotingInfo, alloy::sol_types::sol_data::Uint<256>);
            #[doc(hidden)]
            type UnderlyingRustTuple<'a> = (
                <VotingInfo as alloy::sol_types::SolType>::RustType,
                alloy::sol_types::private::primitives::aliases::U256,
            );
            #[cfg(test)]
            #[allow(dead_code, unreachable_patterns)]
            fn _type_assertion(_t: alloy_sol_types::private::AssertTypeEq<UnderlyingRustTuple>) {
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
            fn _type_assertion(_t: alloy_sol_types::private::AssertTypeEq<UnderlyingRustTuple>) {
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
        impl voteReturn {
            fn _tokenize(&self) -> <voteCall as alloy_sol_types::SolCall>::ReturnToken<'_> {
                ()
            }
        }
        #[automatically_derived]
        impl alloy_sol_types::SolCall for voteCall {
            type Parameters<'a> = (VotingInfo, alloy::sol_types::sol_data::Uint<256>);
            type Token<'a> = <Self::Parameters<'a> as alloy_sol_types::SolType>::Token<'a>;
            type Return = voteReturn;
            type ReturnTuple<'a> = ();
            type ReturnToken<'a> = <Self::ReturnTuple<'a> as alloy_sol_types::SolType>::Token<'a>;
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
                    <alloy::sol_types::sol_data::Uint<256> as alloy_sol_types::SolType>::tokenize(
                        &self.choice,
                    ),
                )
            }
            #[inline]
            fn tokenize_returns(ret: &Self::Return) -> Self::ReturnToken<'_> {
                voteReturn::_tokenize(ret)
            }
            #[inline]
            fn abi_decode_returns(data: &[u8]) -> alloy_sol_types::Result<Self::Return> {
                <Self::ReturnTuple<'_> as alloy_sol_types::SolType>::abi_decode_sequence(data)
                    .map(Into::into)
            }
            #[inline]
            fn abi_decode_returns_validate(data: &[u8]) -> alloy_sol_types::Result<Self::Return> {
                <Self::ReturnTuple<'_> as alloy_sol_types::SolType>::abi_decode_sequence_validate(
                    data,
                )
                .map(Into::into)
            }
        }
    };
    #[derive(serde::Serialize, serde::Deserialize, Default, Debug, PartialEq, Eq, Hash)]
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
    #[derive(serde::Serialize, serde::Deserialize, Default, Debug, PartialEq, Eq, Hash)]
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
            type UnderlyingRustTuple<'a> = (<VotingInfo as alloy::sol_types::SolType>::RustType,);
            #[cfg(test)]
            #[allow(dead_code, unreachable_patterns)]
            fn _type_assertion(_t: alloy_sol_types::private::AssertTypeEq<UnderlyingRustTuple>) {
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
            fn _type_assertion(_t: alloy_sol_types::private::AssertTypeEq<UnderlyingRustTuple>) {
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
            type Token<'a> = <Self::Parameters<'a> as alloy_sol_types::SolType>::Token<'a>;
            type Return = alloy::sol_types::private::FixedBytes<32>;
            type ReturnTuple<'a> = (alloy::sol_types::sol_data::FixedBytes<32>,);
            type ReturnToken<'a> = <Self::ReturnTuple<'a> as alloy_sol_types::SolType>::Token<'a>;
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
            fn tokenize_returns(ret: &Self::Return) -> Self::ReturnToken<'_> {
                (
                    <alloy::sol_types::sol_data::FixedBytes<
                        32,
                    > as alloy_sol_types::SolType>::tokenize(ret),
                )
            }
            #[inline]
            fn abi_decode_returns(data: &[u8]) -> alloy_sol_types::Result<Self::Return> {
                <Self::ReturnTuple<'_> as alloy_sol_types::SolType>::abi_decode_sequence(data).map(
                    |r| {
                        let r: votingIdReturn = r.into();
                        r._0
                    },
                )
            }
            #[inline]
            fn abi_decode_returns_validate(data: &[u8]) -> alloy_sol_types::Result<Self::Return> {
                <Self::ReturnTuple<'_> as alloy_sol_types::SolType>::abi_decode_sequence_validate(
                    data,
                )
                .map(|r| {
                    let r: votingIdReturn = r.into();
                    r._0
                })
            }
        }
    };
    ///Container for all the [`Voting`](self) function calls.
    #[derive(serde::Serialize, serde::Deserialize)]
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
                Self::setWinner(_) => <setWinnerCall as alloy_sol_types::SolCall>::SELECTOR,
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
        fn abi_decode_raw(selector: [u8; 4], data: &[u8]) -> alloy_sol_types::Result<Self> {
            static DECODE_SHIMS: &[fn(&[u8]) -> alloy_sol_types::Result<VotingCalls>] = &[
                {
                    fn votingId(data: &[u8]) -> alloy_sol_types::Result<VotingCalls> {
                        <votingIdCall as alloy_sol_types::SolCall>::abi_decode_raw(data)
                            .map(VotingCalls::votingId)
                    }
                    votingId
                },
                {
                    fn register(data: &[u8]) -> alloy_sol_types::Result<VotingCalls> {
                        <registerCall as alloy_sol_types::SolCall>::abi_decode_raw(data)
                            .map(VotingCalls::register)
                    }
                    register
                },
                {
                    fn vote(data: &[u8]) -> alloy_sol_types::Result<VotingCalls> {
                        <voteCall as alloy_sol_types::SolCall>::abi_decode_raw(data)
                            .map(VotingCalls::vote)
                    }
                    vote
                },
                {
                    fn setWinner(data: &[u8]) -> alloy_sol_types::Result<VotingCalls> {
                        <setWinnerCall as alloy_sol_types::SolCall>::abi_decode_raw(data)
                            .map(VotingCalls::setWinner)
                    }
                    setWinner
                },
            ];
            let Ok(idx) = Self::SELECTORS.binary_search(&selector) else {
                return Err(alloy_sol_types::Error::unknown_selector(
                    <Self as alloy_sol_types::SolInterface>::NAME,
                    selector,
                ));
            };
            DECODE_SHIMS[idx](data)
        }
        #[inline]
        #[allow(non_snake_case)]
        fn abi_decode_raw_validate(
            selector: [u8; 4],
            data: &[u8],
        ) -> alloy_sol_types::Result<Self> {
            static DECODE_VALIDATE_SHIMS: &[fn(&[u8]) -> alloy_sol_types::Result<VotingCalls>] = &[
                {
                    fn votingId(data: &[u8]) -> alloy_sol_types::Result<VotingCalls> {
                        <votingIdCall as alloy_sol_types::SolCall>::abi_decode_raw_validate(data)
                            .map(VotingCalls::votingId)
                    }
                    votingId
                },
                {
                    fn register(data: &[u8]) -> alloy_sol_types::Result<VotingCalls> {
                        <registerCall as alloy_sol_types::SolCall>::abi_decode_raw_validate(data)
                            .map(VotingCalls::register)
                    }
                    register
                },
                {
                    fn vote(data: &[u8]) -> alloy_sol_types::Result<VotingCalls> {
                        <voteCall as alloy_sol_types::SolCall>::abi_decode_raw_validate(data)
                            .map(VotingCalls::vote)
                    }
                    vote
                },
                {
                    fn setWinner(data: &[u8]) -> alloy_sol_types::Result<VotingCalls> {
                        <setWinnerCall as alloy_sol_types::SolCall>::abi_decode_raw_validate(data)
                            .map(VotingCalls::setWinner)
                    }
                    setWinner
                },
            ];
            let Ok(idx) = Self::SELECTORS.binary_search(&selector) else {
                return Err(alloy_sol_types::Error::unknown_selector(
                    <Self as alloy_sol_types::SolInterface>::NAME,
                    selector,
                ));
            };
            DECODE_VALIDATE_SHIMS[idx](data)
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
                    <registerCall as alloy_sol_types::SolCall>::abi_encode_raw(inner, out)
                }
                Self::setWinner(inner) => {
                    <setWinnerCall as alloy_sol_types::SolCall>::abi_encode_raw(inner, out)
                }
                Self::vote(inner) => {
                    <voteCall as alloy_sol_types::SolCall>::abi_encode_raw(inner, out)
                }
                Self::votingId(inner) => {
                    <votingIdCall as alloy_sol_types::SolCall>::abi_encode_raw(inner, out)
                }
            }
        }
    }
    ///Container for all the [`Voting`](self) events.
    #[derive(serde::Serialize, serde::Deserialize, Debug, PartialEq, Eq, Hash)]
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
                38u8, 157u8, 58u8, 36u8, 113u8, 36u8, 54u8, 247u8, 125u8, 241u8, 93u8, 99u8, 222u8,
                125u8, 35u8, 55u8, 160u8, 96u8, 201u8, 16u8, 45u8, 238u8, 111u8, 70u8, 201u8, 9u8,
                251u8, 15u8, 162u8, 213u8, 47u8, 12u8,
            ],
            [
                228u8, 171u8, 197u8, 56u8, 15u8, 166u8, 147u8, 157u8, 29u8, 194u8, 59u8, 94u8,
                144u8, 179u8, 168u8, 160u8, 227u8, 40u8, 240u8, 241u8, 168u8, 42u8, 95u8, 66u8,
                191u8, 183u8, 149u8, 191u8, 156u8, 113u8, 117u8, 5u8,
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
        ) -> alloy_sol_types::Result<Self> {
            match topics.first().copied() {
                Some(<Voted as alloy_sol_types::SolEvent>::SIGNATURE_HASH) => {
                    <Voted as alloy_sol_types::SolEvent>::decode_raw_log(topics, data)
                        .map(Self::Voted)
                }
                Some(<Winner as alloy_sol_types::SolEvent>::SIGNATURE_HASH) => {
                    <Winner as alloy_sol_types::SolEvent>::decode_raw_log(topics, data)
                        .map(Self::Winner)
                }
                _ => alloy_sol_types::private::Err(alloy_sol_types::Error::InvalidLog {
                    name: <Self as alloy_sol_types::SolEventInterface>::NAME,
                    log: alloy_sol_types::private::Box::new(
                        alloy_sol_types::private::LogData::new_unchecked(
                            topics.to_vec(),
                            data.to_vec().into(),
                        ),
                    ),
                }),
            }
        }
    }
    #[automatically_derived]
    impl alloy_sol_types::private::IntoLogData for VotingEvents {
        fn to_log_data(&self) -> alloy_sol_types::private::LogData {
            match self {
                Self::Voted(inner) => alloy_sol_types::private::IntoLogData::to_log_data(inner),
                Self::Winner(inner) => alloy_sol_types::private::IntoLogData::to_log_data(inner),
            }
        }
        fn into_log_data(self) -> alloy_sol_types::private::LogData {
            match self {
                Self::Voted(inner) => alloy_sol_types::private::IntoLogData::into_log_data(inner),
                Self::Winner(inner) => alloy_sol_types::private::IntoLogData::into_log_data(inner),
            }
        }
    }
    use alloy::contract as alloy_contract;
    /**Creates a new wrapper around an on-chain [`Voting`](self) contract instance.

    See the [wrapper's documentation](`VotingInstance`) for more details.*/
    #[inline]
    pub const fn new<
        P: alloy_contract::private::Provider<N>,
        N: alloy_contract::private::Network,
    >(
        address: alloy_sol_types::private::Address,
        provider: P,
    ) -> VotingInstance<P, N> {
        VotingInstance::<P, N>::new(address, provider)
    }
    /**Deploys this contract using the given `provider` and constructor arguments, if any.

    Returns a new instance of the contract, if the deployment was successful.

    For more fine-grained control over the deployment process, use [`deploy_builder`] instead.*/
    #[inline]
    pub fn deploy<P: alloy_contract::private::Provider<N>, N: alloy_contract::private::Network>(
        provider: P,
    ) -> impl ::core::future::Future<Output = alloy_contract::Result<VotingInstance<P, N>>> {
        VotingInstance::<P, N>::deploy(provider)
    }
    /**Creates a `RawCallBuilder` for deploying this contract using the given `provider`
    and constructor arguments, if any.

    This is a simple wrapper around creating a `RawCallBuilder` with the data set to
    the bytecode concatenated with the constructor's ABI-encoded arguments.*/
    #[inline]
    pub fn deploy_builder<
        P: alloy_contract::private::Provider<N>,
        N: alloy_contract::private::Network,
    >(
        provider: P,
    ) -> alloy_contract::RawCallBuilder<P, N> {
        VotingInstance::<P, N>::deploy_builder(provider)
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
    pub struct VotingInstance<P, N = alloy_contract::private::Ethereum> {
        address: alloy_sol_types::private::Address,
        provider: P,
        _network: ::core::marker::PhantomData<N>,
    }
    #[automatically_derived]
    impl<P, N> ::core::fmt::Debug for VotingInstance<P, N> {
        #[inline]
        fn fmt(&self, f: &mut ::core::fmt::Formatter<'_>) -> ::core::fmt::Result {
            f.debug_tuple("VotingInstance")
                .field(&self.address)
                .finish()
        }
    }
    /// Instantiation and getters/setters.
    #[automatically_derived]
    impl<P: alloy_contract::private::Provider<N>, N: alloy_contract::private::Network>
        VotingInstance<P, N>
    {
        /**Creates a new wrapper around an on-chain [`Voting`](self) contract instance.

        See the [wrapper's documentation](`VotingInstance`) for more details.*/
        #[inline]
        pub const fn new(address: alloy_sol_types::private::Address, provider: P) -> Self {
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
        pub async fn deploy(provider: P) -> alloy_contract::Result<VotingInstance<P, N>> {
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
    impl<P: ::core::clone::Clone, N> VotingInstance<&P, N> {
        /// Clones the provider and returns a new instance with the cloned provider.
        #[inline]
        pub fn with_cloned_provider(self) -> VotingInstance<P, N> {
            VotingInstance {
                address: self.address,
                provider: ::core::clone::Clone::clone(&self.provider),
                _network: ::core::marker::PhantomData,
            }
        }
    }
    /// Function calls.
    #[automatically_derived]
    impl<P: alloy_contract::private::Provider<N>, N: alloy_contract::private::Network>
        VotingInstance<P, N>
    {
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
        ///Creates a new call builder for the [`register`] function.
        pub fn register(
            &self,
            v: <VotingInfo as alloy::sol_types::SolType>::RustType,
        ) -> alloy_contract::SolCallBuilder<&P, registerCall, N> {
            self.call_builder(&registerCall { v })
        }
        ///Creates a new call builder for the [`setWinner`] function.
        pub fn setWinner(
            &self,
            v: <VotingInfo as alloy::sol_types::SolType>::RustType,
            choice: alloy::sol_types::private::primitives::aliases::U256,
        ) -> alloy_contract::SolCallBuilder<&P, setWinnerCall, N> {
            self.call_builder(&setWinnerCall { v, choice })
        }
        ///Creates a new call builder for the [`vote`] function.
        pub fn vote(
            &self,
            v: <VotingInfo as alloy::sol_types::SolType>::RustType,
            choice: alloy::sol_types::private::primitives::aliases::U256,
        ) -> alloy_contract::SolCallBuilder<&P, voteCall, N> {
            self.call_builder(&voteCall { v, choice })
        }
        ///Creates a new call builder for the [`votingId`] function.
        pub fn votingId(
            &self,
            v: <VotingInfo as alloy::sol_types::SolType>::RustType,
        ) -> alloy_contract::SolCallBuilder<&P, votingIdCall, N> {
            self.call_builder(&votingIdCall { v })
        }
    }
    /// Event filters.
    #[automatically_derived]
    impl<P: alloy_contract::private::Provider<N>, N: alloy_contract::private::Network>
        VotingInstance<P, N>
    {
        /// Creates a new event filter using this contract instance's provider and address.
        ///
        /// Note that the type can be any event, not just those defined in this contract.
        /// Prefer using the other methods for building type-safe event filters.
        pub fn event_filter<E: alloy_sol_types::SolEvent>(
            &self,
        ) -> alloy_contract::Event<&P, E, N> {
            alloy_contract::Event::new_sol(&self.provider, &self.address)
        }
        ///Creates a new event filter for the [`Voted`] event.
        pub fn Voted_filter(&self) -> alloy_contract::Event<&P, Voted, N> {
            self.event_filter::<Voted>()
        }
        ///Creates a new event filter for the [`Winner`] event.
        pub fn Winner_filter(&self) -> alloy_contract::Event<&P, Winner, N> {
            self.event_filter::<Winner>()
        }
    }
}
