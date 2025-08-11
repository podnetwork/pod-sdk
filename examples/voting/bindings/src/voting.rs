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
    event ProposalCreated(bytes32 indexed proposalId, Time.Timestamp indexed deadline, bytes data);
    event ProposalExecuted(bytes32 indexed proposalId);
    event VoteCast(bytes32 indexed proposalId, address indexed voter, uint8 choice);

    function castVote(bytes32 proposalId, uint8 choice) external;
    function createProposal(Time.Timestamp deadline, uint256 threshold, address[] memory voters, bytes memory data) external returns (bytes32 proposalId);
    function execute(bytes32 proposalId) external;
    function getProposalId(Time.Timestamp deadline, address proposer, address[] memory voters) external pure returns (bytes32 proposalId);
}
```

...which was generated by the following JSON ABI:
```json
[
  {
    "type": "function",
    "name": "castVote",
    "inputs": [
      {
        "name": "proposalId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "choice",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "createProposal",
    "inputs": [
      {
        "name": "deadline",
        "type": "uint64",
        "internalType": "Time.Timestamp"
      },
      {
        "name": "threshold",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "voters",
        "type": "address[]",
        "internalType": "address[]"
      },
      {
        "name": "data",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [
      {
        "name": "proposalId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "execute",
    "inputs": [
      {
        "name": "proposalId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getProposalId",
    "inputs": [
      {
        "name": "deadline",
        "type": "uint64",
        "internalType": "Time.Timestamp"
      },
      {
        "name": "proposer",
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
        "name": "proposalId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "pure"
  },
  {
    "type": "event",
    "name": "ProposalCreated",
    "inputs": [
      {
        "name": "proposalId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "deadline",
        "type": "uint64",
        "indexed": true,
        "internalType": "Time.Timestamp"
      },
      {
        "name": "data",
        "type": "bytes",
        "indexed": false,
        "internalType": "bytes"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ProposalExecuted",
    "inputs": [
      {
        "name": "proposalId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "VoteCast",
    "inputs": [
      {
        "name": "proposalId",
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
        "type": "uint8",
        "indexed": false,
        "internalType": "uint8"
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
    ///0x6080604052348015600f57600080fd5b5061199e8061001f6000396000f3fe608060405234801561001057600080fd5b506004361061004c5760003560e01c8063b4b0713e14610051578063b829966f1461006d578063cf75ee2a1461009d578063e751f271146100cd575b600080fd5b61006b60048036038101906100669190610cc8565b6100e9565b005b61008760048036038101906100829190610e0b565b6102f1565b6040516100949190610e8e565b60405180910390f35b6100b760048036038101906100b29190610f35565b610350565b6040516100c49190610e8e565b60405180910390f35b6100e760048036038101906100e29190610fdc565b610602565b005b600080600084815260200190815260200160002090506101398160000160009054906101000a900467ffffffffffffffff166040518060600160405280603781526020016119676037913961077b565b6001600281111561014d5761014c611009565b5b8160030160003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060009054906101000a900460ff1660028111156101ae576101ad611009565b5b146101ee576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016101e590611095565b60405180910390fd5b6000610206843360026107ac9092919063ffffffff16565b14610246576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161023d90611101565b60405180910390fd5b61025f833360016002610878909392919063ffffffff16565b61029d8383604051602001610275929190611130565b604051602081830303815290604052805190602001206001806109559092919063ffffffff16565b3373ffffffffffffffffffffffffffffffffffffffff16837fd8a95ca05e9a2656fe21d836329d9cd77830e7fef7acb7c0fd3bf5421ea7ad9a846040516102e49190611159565b60405180910390a3505050565b600084848484604051602001610308929190611231565b6040516020818303038152906040528051906020012060405160200161033093929190611294565b604051602081830303815290604052805190602001209050949350505050565b6000610391876040518060400160405280601e81526020017f446561646c696e65206d75737420626520696e2074686520667574757265000081525061077b565b600086116103d4576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016103cb90611317565b60405180910390fd5b6000858590501161041a576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161041190611383565b60405180910390fd5b6000610428883388886102f1565b9050600080600083815260200190815260200160002090506000816005015414610487576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161047e906113ef565b60405180910390fd5b888160000160006101000a81548167ffffffffffffffff021916908367ffffffffffffffff160217905550338160020160006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555086869050816005018190555060005b878790508110156105ad5760018260030160008a8a8581811061052a5761052961140f565b5b905060200201602081019061053f919061143e565b73ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060006101000a81548160ff0219169083600281111561059b5761059a611009565b5b02179055508080600101915050610504565b508867ffffffffffffffff16827fdd1d43a415e6cf502dcd7b333d320f416829c0f6a43aa9e32d81cd9a3a7147e687876040516105eb9291906114c9565b60405180910390a381925050509695505050505050565b600080600083815260200190815260200160002090506106528160000160009054906101000a900467ffffffffffffffff1660405180606001604052806024815260200161194360249139610986565b8060060160009054906101000a900460ff16156106a4576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161069b90611539565b60405180910390fd5b60008260016040516020016106ba929190611594565b6040516020818303038152906040528051906020012090506107238183600101546040518060400160405280601081526020017f4e6f7420656e6f75676820766f7465730000000000000000000000000000000081525060016109b7909392919063ffffffff16565b60018260060160006101000a81548160ff021916908315150217905550610749836109df565b827f7b1bcf1ccf901a11589afff5504d59fd0a53780eed2a952adade0348985139e060405160405180910390a2505050565b6107a86107a28361078a6109e2565b67ffffffffffffffff16610b1790919063ffffffff16565b82610b38565b5050565b60003273ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff161461081c576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016108139061162f565b60405180910390fd5b83600001600084815260200190815260200160002060008373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000205490509392505050565b3273ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff16146108e6576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016108dd9061162f565b60405180910390fd5b8084600001600085815260200190815260200160002060008473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000206000828254610948919061167e565b9250508190555050505050565b80836000016000848152602001908152602001600020600082825461097a919061167e565b92505081905550505050565b6109b36109ad836109956109e2565b67ffffffffffffffff16610c2e90919063ffffffff16565b82610b38565b5050565b6109d98285600001600086815260200190815260200160002054101582610b38565b50505050565b50565b60008060007fba286e4d89dabf4b2878e896423bb123d9d5143e662606fd343b6766d7bcf72160001c73ffffffffffffffffffffffffffffffffffffffff16604051610a2d906116e3565b600060405180830381855afa9150503d8060008114610a68576040519150601f19603f3d011682016040523d82523d6000602084013e610a6d565b606091505b509150915081610ab2576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610aa990611744565b60405180910390fd5b6020815114610af6576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610aed906117b0565b60405180910390fd5b600081806020019051810190610b0c91906117fc565b905080935050505090565b60008167ffffffffffffffff168367ffffffffffffffff1610905092915050565b60007f3dcdf63b41c103567d7225976ad9145e866c7a7dccc6c277ea86abbd268fbac960001c73ffffffffffffffffffffffffffffffffffffffff1683604051602001610b859190611844565b604051602081830303815290604052604051610ba191906118c5565b600060405180830381855afa9150503d8060008114610bdc576040519150601f19603f3d011682016040523d82523d6000602084013e610be1565b606091505b50509050808290610c28576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610c1f9190611920565b60405180910390fd5b50505050565b60008167ffffffffffffffff168367ffffffffffffffff1611905092915050565b600080fd5b600080fd5b6000819050919050565b610c6c81610c59565b8114610c7757600080fd5b50565b600081359050610c8981610c63565b92915050565b600060ff82169050919050565b610ca581610c8f565b8114610cb057600080fd5b50565b600081359050610cc281610c9c565b92915050565b60008060408385031215610cdf57610cde610c4f565b5b6000610ced85828601610c7a565b9250506020610cfe85828601610cb3565b9150509250929050565b600067ffffffffffffffff82169050919050565b610d2581610d08565b8114610d3057600080fd5b50565b600081359050610d4281610d1c565b92915050565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b6000610d7382610d48565b9050919050565b610d8381610d68565b8114610d8e57600080fd5b50565b600081359050610da081610d7a565b92915050565b600080fd5b600080fd5b600080fd5b60008083601f840112610dcb57610dca610da6565b5b8235905067ffffffffffffffff811115610de857610de7610dab565b5b602083019150836020820283011115610e0457610e03610db0565b5b9250929050565b60008060008060608587031215610e2557610e24610c4f565b5b6000610e3387828801610d33565b9450506020610e4487828801610d91565b935050604085013567ffffffffffffffff811115610e6557610e64610c54565b5b610e7187828801610db5565b925092505092959194509250565b610e8881610c59565b82525050565b6000602082019050610ea36000830184610e7f565b92915050565b6000819050919050565b610ebc81610ea9565b8114610ec757600080fd5b50565b600081359050610ed981610eb3565b92915050565b60008083601f840112610ef557610ef4610da6565b5b8235905067ffffffffffffffff811115610f1257610f11610dab565b5b602083019150836001820283011115610f2e57610f2d610db0565b5b9250929050565b60008060008060008060808789031215610f5257610f51610c4f565b5b6000610f6089828a01610d33565b9650506020610f7189828a01610eca565b955050604087013567ffffffffffffffff811115610f9257610f91610c54565b5b610f9e89828a01610db5565b9450945050606087013567ffffffffffffffff811115610fc157610fc0610c54565b5b610fcd89828a01610edf565b92509250509295509295509295565b600060208284031215610ff257610ff1610c4f565b5b600061100084828501610c7a565b91505092915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602160045260246000fd5b600082825260208201905092915050565b7f73656e646572206e6f74206120766f7465720000000000000000000000000000600082015250565b600061107f601283611038565b915061108a82611049565b602082019050919050565b600060208201905081810360008301526110ae81611072565b9050919050565b7f616c726561647920766f74656400000000000000000000000000000000000000600082015250565b60006110eb600d83611038565b91506110f6826110b5565b602082019050919050565b6000602082019050818103600083015261111a816110de565b9050919050565b61112a81610c8f565b82525050565b60006040820190506111456000830185610e7f565b6111526020830184611121565b9392505050565b600060208201905061116e6000830184611121565b92915050565b600081905092915050565b6000819050919050565b61119281610d68565b82525050565b60006111a48383611189565b60208301905092915050565b60006111bf6020840184610d91565b905092915050565b6000602082019050919050565b60006111e08385611174565b93506111eb8261117f565b8060005b858110156112245761120182846111b0565b61120b8882611198565b9750611216836111c7565b9250506001810190506111ef565b5085925050509392505050565b600061123e8284866111d4565b91508190509392505050565b6000819050919050565b600061126f61126a61126584610d08565b61124a565b610d08565b9050919050565b61127f81611254565b82525050565b61128e81610d68565b82525050565b60006060820190506112a96000830186611276565b6112b66020830185611285565b6112c36040830184610e7f565b949350505050565b7f5468726573686f6c642073686f756c64206e6f74206265203000000000000000600082015250565b6000611301601983611038565b915061130c826112cb565b602082019050919050565b60006020820190508181036000830152611330816112f4565b9050919050565b7f5468657265206d757374206265206174206c65617374206f6e6520766f746572600082015250565b600061136d602083611038565b915061137882611337565b602082019050919050565b6000602082019050818103600083015261139c81611360565b9050919050565b7f70726f706f73616c20616c726561647920657869737473000000000000000000600082015250565b60006113d9601783611038565b91506113e4826113a3565b602082019050919050565b60006020820190508181036000830152611408816113cc565b9050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052603260045260246000fd5b60006020828403121561145457611453610c4f565b5b600061146284828501610d91565b91505092915050565b600082825260208201905092915050565b82818337600083830152505050565b6000601f19601f8301169050919050565b60006114a8838561146b565b93506114b583858461147c565b6114be8361148b565b840190509392505050565b600060208201905081810360008301526114e481848661149c565b90509392505050565b7f50726f706f73616c20616c726561647920657865637574656400000000000000600082015250565b6000611523601983611038565b915061152e826114ed565b602082019050919050565b6000602082019050818103600083015261155281611516565b9050919050565b6000819050919050565b600061157e61157961157484611559565b61124a565b610c8f565b9050919050565b61158e81611563565b82525050565b60006040820190506115a96000830185610e7f565b6115b66020830184611585565b9392505050565b7f43616e6e6f7420616363657373204f776e6564436f756e746572206f776e656460008201527f20627920616e6f74686572206164647265737300000000000000000000000000602082015250565b6000611619603383611038565b9150611624826115bd565b604082019050919050565b600060208201905081810360008301526116488161160c565b9050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b600061168982610ea9565b915061169483610ea9565b92508282019050808211156116ac576116ab61164f565b5b92915050565b600081905092915050565b50565b60006116cd6000836116b2565b91506116d8826116bd565b600082019050919050565b60006116ee826116c0565b9150819050919050565b7f507265636f6d70696c652063616c6c206661696c656400000000000000000000600082015250565b600061172e601683611038565b9150611739826116f8565b602082019050919050565b6000602082019050818103600083015261175d81611721565b9050919050565b7f496e76616c6964206f7574707574206c656e6774680000000000000000000000600082015250565b600061179a601583611038565b91506117a582611764565b602082019050919050565b600060208201905081810360008301526117c98161178d565b9050919050565b6117d981610d08565b81146117e457600080fd5b50565b6000815190506117f6816117d0565b92915050565b60006020828403121561181257611811610c4f565b5b6000611820848285016117e7565b91505092915050565b60008115159050919050565b61183e81611829565b82525050565b60006020820190506118596000830184611835565b92915050565b600081519050919050565b60005b8381101561188857808201518184015260208101905061186d565b60008484015250505050565b600061189f8261185f565b6118a981856116b2565b93506118b981856020860161186a565b80840191505092915050565b60006118d18284611894565b915081905092915050565b600081519050919050565b60006118f2826118dc565b6118fc8185611038565b935061190c81856020860161186a565b6119158161148b565b840191505092915050565b6000602082019050818103600083015261193a81846118e7565b90509291505056fe50726f706f73616c20646561646c696e6520686173206e6f74207061737365642079657450726f706f73616c20646561646c696e652068617320706173736564206f722070726f706f73616c20646f6573206e6f74206578697374
    /// ```
    #[rustfmt::skip]
    #[allow(clippy::all)]
    pub static BYTECODE: alloy_sol_types::private::Bytes = alloy_sol_types::private::Bytes::from_static(
        b"`\x80`@R4\x80\x15`\x0FW`\0\x80\xFD[Pa\x19\x9E\x80a\0\x1F`\09`\0\xF3\xFE`\x80`@R4\x80\x15a\0\x10W`\0\x80\xFD[P`\x046\x10a\0LW`\x005`\xE0\x1C\x80c\xB4\xB0q>\x14a\0QW\x80c\xB8)\x96o\x14a\0mW\x80c\xCFu\xEE*\x14a\0\x9DW\x80c\xE7Q\xF2q\x14a\0\xCDW[`\0\x80\xFD[a\0k`\x04\x806\x03\x81\x01\x90a\0f\x91\x90a\x0C\xC8V[a\0\xE9V[\0[a\0\x87`\x04\x806\x03\x81\x01\x90a\0\x82\x91\x90a\x0E\x0BV[a\x02\xF1V[`@Qa\0\x94\x91\x90a\x0E\x8EV[`@Q\x80\x91\x03\x90\xF3[a\0\xB7`\x04\x806\x03\x81\x01\x90a\0\xB2\x91\x90a\x0F5V[a\x03PV[`@Qa\0\xC4\x91\x90a\x0E\x8EV[`@Q\x80\x91\x03\x90\xF3[a\0\xE7`\x04\x806\x03\x81\x01\x90a\0\xE2\x91\x90a\x0F\xDCV[a\x06\x02V[\0[`\0\x80`\0\x84\x81R` \x01\x90\x81R` \x01`\0 \x90Pa\x019\x81`\0\x01`\0\x90T\x90a\x01\0\n\x90\x04g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16`@Q\x80``\x01`@R\x80`7\x81R` \x01a\x19g`7\x919a\x07{V[`\x01`\x02\x81\x11\x15a\x01MWa\x01La\x10\tV[[\x81`\x03\x01`\x003s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x81R` \x01\x90\x81R` \x01`\0 `\0\x90T\x90a\x01\0\n\x90\x04`\xFF\x16`\x02\x81\x11\x15a\x01\xAEWa\x01\xADa\x10\tV[[\x14a\x01\xEEW`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x01\xE5\x90a\x10\x95V[`@Q\x80\x91\x03\x90\xFD[`\0a\x02\x06\x843`\x02a\x07\xAC\x90\x92\x91\x90c\xFF\xFF\xFF\xFF\x16V[\x14a\x02FW`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x02=\x90a\x11\x01V[`@Q\x80\x91\x03\x90\xFD[a\x02_\x833`\x01`\x02a\x08x\x90\x93\x92\x91\x90c\xFF\xFF\xFF\xFF\x16V[a\x02\x9D\x83\x83`@Q` \x01a\x02u\x92\x91\x90a\x110V[`@Q` \x81\x83\x03\x03\x81R\x90`@R\x80Q\x90` \x01 `\x01\x80a\tU\x90\x92\x91\x90c\xFF\xFF\xFF\xFF\x16V[3s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83\x7F\xD8\xA9\\\xA0^\x9A&V\xFE!\xD862\x9D\x9C\xD7x0\xE7\xFE\xF7\xAC\xB7\xC0\xFD;\xF5B\x1E\xA7\xAD\x9A\x84`@Qa\x02\xE4\x91\x90a\x11YV[`@Q\x80\x91\x03\x90\xA3PPPV[`\0\x84\x84\x84\x84`@Q` \x01a\x03\x08\x92\x91\x90a\x121V[`@Q` \x81\x83\x03\x03\x81R\x90`@R\x80Q\x90` \x01 `@Q` \x01a\x030\x93\x92\x91\x90a\x12\x94V[`@Q` \x81\x83\x03\x03\x81R\x90`@R\x80Q\x90` \x01 \x90P\x94\x93PPPPV[`\0a\x03\x91\x87`@Q\x80`@\x01`@R\x80`\x1E\x81R` \x01\x7FDeadline must be in the future\0\0\x81RPa\x07{V[`\0\x86\x11a\x03\xD4W`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x03\xCB\x90a\x13\x17V[`@Q\x80\x91\x03\x90\xFD[`\0\x85\x85\x90P\x11a\x04\x1AW`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x04\x11\x90a\x13\x83V[`@Q\x80\x91\x03\x90\xFD[`\0a\x04(\x883\x88\x88a\x02\xF1V[\x90P`\0\x80`\0\x83\x81R` \x01\x90\x81R` \x01`\0 \x90P`\0\x81`\x05\x01T\x14a\x04\x87W`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x04~\x90a\x13\xEFV[`@Q\x80\x91\x03\x90\xFD[\x88\x81`\0\x01`\0a\x01\0\n\x81T\x81g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x02\x19\x16\x90\x83g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x02\x17\x90UP3\x81`\x02\x01`\0a\x01\0\n\x81T\x81s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x02\x19\x16\x90\x83s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x02\x17\x90UP\x86\x86\x90P\x81`\x05\x01\x81\x90UP`\0[\x87\x87\x90P\x81\x10\x15a\x05\xADW`\x01\x82`\x03\x01`\0\x8A\x8A\x85\x81\x81\x10a\x05*Wa\x05)a\x14\x0FV[[\x90P` \x02\x01` \x81\x01\x90a\x05?\x91\x90a\x14>V[s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x81R` \x01\x90\x81R` \x01`\0 `\0a\x01\0\n\x81T\x81`\xFF\x02\x19\x16\x90\x83`\x02\x81\x11\x15a\x05\x9BWa\x05\x9Aa\x10\tV[[\x02\x17\x90UP\x80\x80`\x01\x01\x91PPa\x05\x04V[P\x88g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x82\x7F\xDD\x1DC\xA4\x15\xE6\xCFP-\xCD{3=2\x0FAh)\xC0\xF6\xA4:\xA9\xE3-\x81\xCD\x9A:qG\xE6\x87\x87`@Qa\x05\xEB\x92\x91\x90a\x14\xC9V[`@Q\x80\x91\x03\x90\xA3\x81\x92PPP\x96\x95PPPPPPV[`\0\x80`\0\x83\x81R` \x01\x90\x81R` \x01`\0 \x90Pa\x06R\x81`\0\x01`\0\x90T\x90a\x01\0\n\x90\x04g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16`@Q\x80``\x01`@R\x80`$\x81R` \x01a\x19C`$\x919a\t\x86V[\x80`\x06\x01`\0\x90T\x90a\x01\0\n\x90\x04`\xFF\x16\x15a\x06\xA4W`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x06\x9B\x90a\x159V[`@Q\x80\x91\x03\x90\xFD[`\0\x82`\x01`@Q` \x01a\x06\xBA\x92\x91\x90a\x15\x94V[`@Q` \x81\x83\x03\x03\x81R\x90`@R\x80Q\x90` \x01 \x90Pa\x07#\x81\x83`\x01\x01T`@Q\x80`@\x01`@R\x80`\x10\x81R` \x01\x7FNot enough votes\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81RP`\x01a\t\xB7\x90\x93\x92\x91\x90c\xFF\xFF\xFF\xFF\x16V[`\x01\x82`\x06\x01`\0a\x01\0\n\x81T\x81`\xFF\x02\x19\x16\x90\x83\x15\x15\x02\x17\x90UPa\x07I\x83a\t\xDFV[\x82\x7F{\x1B\xCF\x1C\xCF\x90\x1A\x11X\x9A\xFF\xF5PMY\xFD\nSx\x0E\xED*\x95*\xDA\xDE\x03H\x98Q9\xE0`@Q`@Q\x80\x91\x03\x90\xA2PPPV[a\x07\xA8a\x07\xA2\x83a\x07\x8Aa\t\xE2V[g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16a\x0B\x17\x90\x91\x90c\xFF\xFF\xFF\xFF\x16V[\x82a\x0B8V[PPV[`\x002s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x82s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x14a\x08\x1CW`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x08\x13\x90a\x16/V[`@Q\x80\x91\x03\x90\xFD[\x83`\0\x01`\0\x84\x81R` \x01\x90\x81R` \x01`\0 `\0\x83s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x81R` \x01\x90\x81R` \x01`\0 T\x90P\x93\x92PPPV[2s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x82s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x14a\x08\xE6W`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x08\xDD\x90a\x16/V[`@Q\x80\x91\x03\x90\xFD[\x80\x84`\0\x01`\0\x85\x81R` \x01\x90\x81R` \x01`\0 `\0\x84s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x81R` \x01\x90\x81R` \x01`\0 `\0\x82\x82Ta\tH\x91\x90a\x16~V[\x92PP\x81\x90UPPPPPV[\x80\x83`\0\x01`\0\x84\x81R` \x01\x90\x81R` \x01`\0 `\0\x82\x82Ta\tz\x91\x90a\x16~V[\x92PP\x81\x90UPPPPV[a\t\xB3a\t\xAD\x83a\t\x95a\t\xE2V[g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16a\x0C.\x90\x91\x90c\xFF\xFF\xFF\xFF\x16V[\x82a\x0B8V[PPV[a\t\xD9\x82\x85`\0\x01`\0\x86\x81R` \x01\x90\x81R` \x01`\0 T\x10\x15\x82a\x0B8V[PPPPV[PV[`\0\x80`\0\x7F\xBA(nM\x89\xDA\xBFK(x\xE8\x96B;\xB1#\xD9\xD5\x14>f&\x06\xFD4;gf\xD7\xBC\xF7!`\0\x1Cs\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16`@Qa\n-\x90a\x16\xE3V[`\0`@Q\x80\x83\x03\x81\x85Z\xFA\x91PP=\x80`\0\x81\x14a\nhW`@Q\x91P`\x1F\x19`?=\x01\x16\x82\x01`@R=\x82R=`\0` \x84\x01>a\nmV[``\x91P[P\x91P\x91P\x81a\n\xB2W`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\n\xA9\x90a\x17DV[`@Q\x80\x91\x03\x90\xFD[` \x81Q\x14a\n\xF6W`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\n\xED\x90a\x17\xB0V[`@Q\x80\x91\x03\x90\xFD[`\0\x81\x80` \x01\x90Q\x81\x01\x90a\x0B\x0C\x91\x90a\x17\xFCV[\x90P\x80\x93PPPP\x90V[`\0\x81g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x10\x90P\x92\x91PPV[`\0\x7F=\xCD\xF6;A\xC1\x03V}r%\x97j\xD9\x14^\x86lz}\xCC\xC6\xC2w\xEA\x86\xAB\xBD&\x8F\xBA\xC9`\0\x1Cs\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83`@Q` \x01a\x0B\x85\x91\x90a\x18DV[`@Q` \x81\x83\x03\x03\x81R\x90`@R`@Qa\x0B\xA1\x91\x90a\x18\xC5V[`\0`@Q\x80\x83\x03\x81\x85Z\xFA\x91PP=\x80`\0\x81\x14a\x0B\xDCW`@Q\x91P`\x1F\x19`?=\x01\x16\x82\x01`@R=\x82R=`\0` \x84\x01>a\x0B\xE1V[``\x91P[PP\x90P\x80\x82\x90a\x0C(W`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x0C\x1F\x91\x90a\x19 V[`@Q\x80\x91\x03\x90\xFD[PPPPV[`\0\x81g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x11\x90P\x92\x91PPV[`\0\x80\xFD[`\0\x80\xFD[`\0\x81\x90P\x91\x90PV[a\x0Cl\x81a\x0CYV[\x81\x14a\x0CwW`\0\x80\xFD[PV[`\0\x815\x90Pa\x0C\x89\x81a\x0CcV[\x92\x91PPV[`\0`\xFF\x82\x16\x90P\x91\x90PV[a\x0C\xA5\x81a\x0C\x8FV[\x81\x14a\x0C\xB0W`\0\x80\xFD[PV[`\0\x815\x90Pa\x0C\xC2\x81a\x0C\x9CV[\x92\x91PPV[`\0\x80`@\x83\x85\x03\x12\x15a\x0C\xDFWa\x0C\xDEa\x0COV[[`\0a\x0C\xED\x85\x82\x86\x01a\x0CzV[\x92PP` a\x0C\xFE\x85\x82\x86\x01a\x0C\xB3V[\x91PP\x92P\x92\x90PV[`\0g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x82\x16\x90P\x91\x90PV[a\r%\x81a\r\x08V[\x81\x14a\r0W`\0\x80\xFD[PV[`\0\x815\x90Pa\rB\x81a\r\x1CV[\x92\x91PPV[`\0s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x82\x16\x90P\x91\x90PV[`\0a\rs\x82a\rHV[\x90P\x91\x90PV[a\r\x83\x81a\rhV[\x81\x14a\r\x8EW`\0\x80\xFD[PV[`\0\x815\x90Pa\r\xA0\x81a\rzV[\x92\x91PPV[`\0\x80\xFD[`\0\x80\xFD[`\0\x80\xFD[`\0\x80\x83`\x1F\x84\x01\x12a\r\xCBWa\r\xCAa\r\xA6V[[\x825\x90Pg\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x81\x11\x15a\r\xE8Wa\r\xE7a\r\xABV[[` \x83\x01\x91P\x83` \x82\x02\x83\x01\x11\x15a\x0E\x04Wa\x0E\x03a\r\xB0V[[\x92P\x92\x90PV[`\0\x80`\0\x80``\x85\x87\x03\x12\x15a\x0E%Wa\x0E$a\x0COV[[`\0a\x0E3\x87\x82\x88\x01a\r3V[\x94PP` a\x0ED\x87\x82\x88\x01a\r\x91V[\x93PP`@\x85\x015g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x81\x11\x15a\x0EeWa\x0Eda\x0CTV[[a\x0Eq\x87\x82\x88\x01a\r\xB5V[\x92P\x92PP\x92\x95\x91\x94P\x92PV[a\x0E\x88\x81a\x0CYV[\x82RPPV[`\0` \x82\x01\x90Pa\x0E\xA3`\0\x83\x01\x84a\x0E\x7FV[\x92\x91PPV[`\0\x81\x90P\x91\x90PV[a\x0E\xBC\x81a\x0E\xA9V[\x81\x14a\x0E\xC7W`\0\x80\xFD[PV[`\0\x815\x90Pa\x0E\xD9\x81a\x0E\xB3V[\x92\x91PPV[`\0\x80\x83`\x1F\x84\x01\x12a\x0E\xF5Wa\x0E\xF4a\r\xA6V[[\x825\x90Pg\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x81\x11\x15a\x0F\x12Wa\x0F\x11a\r\xABV[[` \x83\x01\x91P\x83`\x01\x82\x02\x83\x01\x11\x15a\x0F.Wa\x0F-a\r\xB0V[[\x92P\x92\x90PV[`\0\x80`\0\x80`\0\x80`\x80\x87\x89\x03\x12\x15a\x0FRWa\x0FQa\x0COV[[`\0a\x0F`\x89\x82\x8A\x01a\r3V[\x96PP` a\x0Fq\x89\x82\x8A\x01a\x0E\xCAV[\x95PP`@\x87\x015g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x81\x11\x15a\x0F\x92Wa\x0F\x91a\x0CTV[[a\x0F\x9E\x89\x82\x8A\x01a\r\xB5V[\x94P\x94PP``\x87\x015g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x81\x11\x15a\x0F\xC1Wa\x0F\xC0a\x0CTV[[a\x0F\xCD\x89\x82\x8A\x01a\x0E\xDFV[\x92P\x92PP\x92\x95P\x92\x95P\x92\x95V[`\0` \x82\x84\x03\x12\x15a\x0F\xF2Wa\x0F\xF1a\x0COV[[`\0a\x10\0\x84\x82\x85\x01a\x0CzV[\x91PP\x92\x91PPV[\x7FNH{q\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0`\0R`!`\x04R`$`\0\xFD[`\0\x82\x82R` \x82\x01\x90P\x92\x91PPV[\x7Fsender not a voter\0\0\0\0\0\0\0\0\0\0\0\0\0\0`\0\x82\x01RPV[`\0a\x10\x7F`\x12\x83a\x108V[\x91Pa\x10\x8A\x82a\x10IV[` \x82\x01\x90P\x91\x90PV[`\0` \x82\x01\x90P\x81\x81\x03`\0\x83\x01Ra\x10\xAE\x81a\x10rV[\x90P\x91\x90PV[\x7Falready voted\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0`\0\x82\x01RPV[`\0a\x10\xEB`\r\x83a\x108V[\x91Pa\x10\xF6\x82a\x10\xB5V[` \x82\x01\x90P\x91\x90PV[`\0` \x82\x01\x90P\x81\x81\x03`\0\x83\x01Ra\x11\x1A\x81a\x10\xDEV[\x90P\x91\x90PV[a\x11*\x81a\x0C\x8FV[\x82RPPV[`\0`@\x82\x01\x90Pa\x11E`\0\x83\x01\x85a\x0E\x7FV[a\x11R` \x83\x01\x84a\x11!V[\x93\x92PPPV[`\0` \x82\x01\x90Pa\x11n`\0\x83\x01\x84a\x11!V[\x92\x91PPV[`\0\x81\x90P\x92\x91PPV[`\0\x81\x90P\x91\x90PV[a\x11\x92\x81a\rhV[\x82RPPV[`\0a\x11\xA4\x83\x83a\x11\x89V[` \x83\x01\x90P\x92\x91PPV[`\0a\x11\xBF` \x84\x01\x84a\r\x91V[\x90P\x92\x91PPV[`\0` \x82\x01\x90P\x91\x90PV[`\0a\x11\xE0\x83\x85a\x11tV[\x93Pa\x11\xEB\x82a\x11\x7FV[\x80`\0[\x85\x81\x10\x15a\x12$Wa\x12\x01\x82\x84a\x11\xB0V[a\x12\x0B\x88\x82a\x11\x98V[\x97Pa\x12\x16\x83a\x11\xC7V[\x92PP`\x01\x81\x01\x90Pa\x11\xEFV[P\x85\x92PPP\x93\x92PPPV[`\0a\x12>\x82\x84\x86a\x11\xD4V[\x91P\x81\x90P\x93\x92PPPV[`\0\x81\x90P\x91\x90PV[`\0a\x12oa\x12ja\x12e\x84a\r\x08V[a\x12JV[a\r\x08V[\x90P\x91\x90PV[a\x12\x7F\x81a\x12TV[\x82RPPV[a\x12\x8E\x81a\rhV[\x82RPPV[`\0``\x82\x01\x90Pa\x12\xA9`\0\x83\x01\x86a\x12vV[a\x12\xB6` \x83\x01\x85a\x12\x85V[a\x12\xC3`@\x83\x01\x84a\x0E\x7FV[\x94\x93PPPPV[\x7FThreshold should not be 0\0\0\0\0\0\0\0`\0\x82\x01RPV[`\0a\x13\x01`\x19\x83a\x108V[\x91Pa\x13\x0C\x82a\x12\xCBV[` \x82\x01\x90P\x91\x90PV[`\0` \x82\x01\x90P\x81\x81\x03`\0\x83\x01Ra\x130\x81a\x12\xF4V[\x90P\x91\x90PV[\x7FThere must be at least one voter`\0\x82\x01RPV[`\0a\x13m` \x83a\x108V[\x91Pa\x13x\x82a\x137V[` \x82\x01\x90P\x91\x90PV[`\0` \x82\x01\x90P\x81\x81\x03`\0\x83\x01Ra\x13\x9C\x81a\x13`V[\x90P\x91\x90PV[\x7Fproposal already exists\0\0\0\0\0\0\0\0\0`\0\x82\x01RPV[`\0a\x13\xD9`\x17\x83a\x108V[\x91Pa\x13\xE4\x82a\x13\xA3V[` \x82\x01\x90P\x91\x90PV[`\0` \x82\x01\x90P\x81\x81\x03`\0\x83\x01Ra\x14\x08\x81a\x13\xCCV[\x90P\x91\x90PV[\x7FNH{q\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0`\0R`2`\x04R`$`\0\xFD[`\0` \x82\x84\x03\x12\x15a\x14TWa\x14Sa\x0COV[[`\0a\x14b\x84\x82\x85\x01a\r\x91V[\x91PP\x92\x91PPV[`\0\x82\x82R` \x82\x01\x90P\x92\x91PPV[\x82\x81\x837`\0\x83\x83\x01RPPPV[`\0`\x1F\x19`\x1F\x83\x01\x16\x90P\x91\x90PV[`\0a\x14\xA8\x83\x85a\x14kV[\x93Pa\x14\xB5\x83\x85\x84a\x14|V[a\x14\xBE\x83a\x14\x8BV[\x84\x01\x90P\x93\x92PPPV[`\0` \x82\x01\x90P\x81\x81\x03`\0\x83\x01Ra\x14\xE4\x81\x84\x86a\x14\x9CV[\x90P\x93\x92PPPV[\x7FProposal already executed\0\0\0\0\0\0\0`\0\x82\x01RPV[`\0a\x15#`\x19\x83a\x108V[\x91Pa\x15.\x82a\x14\xEDV[` \x82\x01\x90P\x91\x90PV[`\0` \x82\x01\x90P\x81\x81\x03`\0\x83\x01Ra\x15R\x81a\x15\x16V[\x90P\x91\x90PV[`\0\x81\x90P\x91\x90PV[`\0a\x15~a\x15ya\x15t\x84a\x15YV[a\x12JV[a\x0C\x8FV[\x90P\x91\x90PV[a\x15\x8E\x81a\x15cV[\x82RPPV[`\0`@\x82\x01\x90Pa\x15\xA9`\0\x83\x01\x85a\x0E\x7FV[a\x15\xB6` \x83\x01\x84a\x15\x85V[\x93\x92PPPV[\x7FCannot access OwnedCounter owned`\0\x82\x01R\x7F by another address\0\0\0\0\0\0\0\0\0\0\0\0\0` \x82\x01RPV[`\0a\x16\x19`3\x83a\x108V[\x91Pa\x16$\x82a\x15\xBDV[`@\x82\x01\x90P\x91\x90PV[`\0` \x82\x01\x90P\x81\x81\x03`\0\x83\x01Ra\x16H\x81a\x16\x0CV[\x90P\x91\x90PV[\x7FNH{q\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0`\0R`\x11`\x04R`$`\0\xFD[`\0a\x16\x89\x82a\x0E\xA9V[\x91Pa\x16\x94\x83a\x0E\xA9V[\x92P\x82\x82\x01\x90P\x80\x82\x11\x15a\x16\xACWa\x16\xABa\x16OV[[\x92\x91PPV[`\0\x81\x90P\x92\x91PPV[PV[`\0a\x16\xCD`\0\x83a\x16\xB2V[\x91Pa\x16\xD8\x82a\x16\xBDV[`\0\x82\x01\x90P\x91\x90PV[`\0a\x16\xEE\x82a\x16\xC0V[\x91P\x81\x90P\x91\x90PV[\x7FPrecompile call failed\0\0\0\0\0\0\0\0\0\0`\0\x82\x01RPV[`\0a\x17.`\x16\x83a\x108V[\x91Pa\x179\x82a\x16\xF8V[` \x82\x01\x90P\x91\x90PV[`\0` \x82\x01\x90P\x81\x81\x03`\0\x83\x01Ra\x17]\x81a\x17!V[\x90P\x91\x90PV[\x7FInvalid output length\0\0\0\0\0\0\0\0\0\0\0`\0\x82\x01RPV[`\0a\x17\x9A`\x15\x83a\x108V[\x91Pa\x17\xA5\x82a\x17dV[` \x82\x01\x90P\x91\x90PV[`\0` \x82\x01\x90P\x81\x81\x03`\0\x83\x01Ra\x17\xC9\x81a\x17\x8DV[\x90P\x91\x90PV[a\x17\xD9\x81a\r\x08V[\x81\x14a\x17\xE4W`\0\x80\xFD[PV[`\0\x81Q\x90Pa\x17\xF6\x81a\x17\xD0V[\x92\x91PPV[`\0` \x82\x84\x03\x12\x15a\x18\x12Wa\x18\x11a\x0COV[[`\0a\x18 \x84\x82\x85\x01a\x17\xE7V[\x91PP\x92\x91PPV[`\0\x81\x15\x15\x90P\x91\x90PV[a\x18>\x81a\x18)V[\x82RPPV[`\0` \x82\x01\x90Pa\x18Y`\0\x83\x01\x84a\x185V[\x92\x91PPV[`\0\x81Q\x90P\x91\x90PV[`\0[\x83\x81\x10\x15a\x18\x88W\x80\x82\x01Q\x81\x84\x01R` \x81\x01\x90Pa\x18mV[`\0\x84\x84\x01RPPPPV[`\0a\x18\x9F\x82a\x18_V[a\x18\xA9\x81\x85a\x16\xB2V[\x93Pa\x18\xB9\x81\x85` \x86\x01a\x18jV[\x80\x84\x01\x91PP\x92\x91PPV[`\0a\x18\xD1\x82\x84a\x18\x94V[\x91P\x81\x90P\x92\x91PPV[`\0\x81Q\x90P\x91\x90PV[`\0a\x18\xF2\x82a\x18\xDCV[a\x18\xFC\x81\x85a\x108V[\x93Pa\x19\x0C\x81\x85` \x86\x01a\x18jV[a\x19\x15\x81a\x14\x8BV[\x84\x01\x91PP\x92\x91PPV[`\0` \x82\x01\x90P\x81\x81\x03`\0\x83\x01Ra\x19:\x81\x84a\x18\xE7V[\x90P\x92\x91PPV\xFEProposal deadline has not passed yetProposal deadline has passed or proposal does not exist",
    );
    /// The runtime bytecode of the contract, as deployed on the network.
    ///
    /// ```text
    ///0x608060405234801561001057600080fd5b506004361061004c5760003560e01c8063b4b0713e14610051578063b829966f1461006d578063cf75ee2a1461009d578063e751f271146100cd575b600080fd5b61006b60048036038101906100669190610cc8565b6100e9565b005b61008760048036038101906100829190610e0b565b6102f1565b6040516100949190610e8e565b60405180910390f35b6100b760048036038101906100b29190610f35565b610350565b6040516100c49190610e8e565b60405180910390f35b6100e760048036038101906100e29190610fdc565b610602565b005b600080600084815260200190815260200160002090506101398160000160009054906101000a900467ffffffffffffffff166040518060600160405280603781526020016119676037913961077b565b6001600281111561014d5761014c611009565b5b8160030160003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060009054906101000a900460ff1660028111156101ae576101ad611009565b5b146101ee576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016101e590611095565b60405180910390fd5b6000610206843360026107ac9092919063ffffffff16565b14610246576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161023d90611101565b60405180910390fd5b61025f833360016002610878909392919063ffffffff16565b61029d8383604051602001610275929190611130565b604051602081830303815290604052805190602001206001806109559092919063ffffffff16565b3373ffffffffffffffffffffffffffffffffffffffff16837fd8a95ca05e9a2656fe21d836329d9cd77830e7fef7acb7c0fd3bf5421ea7ad9a846040516102e49190611159565b60405180910390a3505050565b600084848484604051602001610308929190611231565b6040516020818303038152906040528051906020012060405160200161033093929190611294565b604051602081830303815290604052805190602001209050949350505050565b6000610391876040518060400160405280601e81526020017f446561646c696e65206d75737420626520696e2074686520667574757265000081525061077b565b600086116103d4576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016103cb90611317565b60405180910390fd5b6000858590501161041a576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161041190611383565b60405180910390fd5b6000610428883388886102f1565b9050600080600083815260200190815260200160002090506000816005015414610487576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161047e906113ef565b60405180910390fd5b888160000160006101000a81548167ffffffffffffffff021916908367ffffffffffffffff160217905550338160020160006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555086869050816005018190555060005b878790508110156105ad5760018260030160008a8a8581811061052a5761052961140f565b5b905060200201602081019061053f919061143e565b73ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060006101000a81548160ff0219169083600281111561059b5761059a611009565b5b02179055508080600101915050610504565b508867ffffffffffffffff16827fdd1d43a415e6cf502dcd7b333d320f416829c0f6a43aa9e32d81cd9a3a7147e687876040516105eb9291906114c9565b60405180910390a381925050509695505050505050565b600080600083815260200190815260200160002090506106528160000160009054906101000a900467ffffffffffffffff1660405180606001604052806024815260200161194360249139610986565b8060060160009054906101000a900460ff16156106a4576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161069b90611539565b60405180910390fd5b60008260016040516020016106ba929190611594565b6040516020818303038152906040528051906020012090506107238183600101546040518060400160405280601081526020017f4e6f7420656e6f75676820766f7465730000000000000000000000000000000081525060016109b7909392919063ffffffff16565b60018260060160006101000a81548160ff021916908315150217905550610749836109df565b827f7b1bcf1ccf901a11589afff5504d59fd0a53780eed2a952adade0348985139e060405160405180910390a2505050565b6107a86107a28361078a6109e2565b67ffffffffffffffff16610b1790919063ffffffff16565b82610b38565b5050565b60003273ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff161461081c576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016108139061162f565b60405180910390fd5b83600001600084815260200190815260200160002060008373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000205490509392505050565b3273ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff16146108e6576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016108dd9061162f565b60405180910390fd5b8084600001600085815260200190815260200160002060008473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000206000828254610948919061167e565b9250508190555050505050565b80836000016000848152602001908152602001600020600082825461097a919061167e565b92505081905550505050565b6109b36109ad836109956109e2565b67ffffffffffffffff16610c2e90919063ffffffff16565b82610b38565b5050565b6109d98285600001600086815260200190815260200160002054101582610b38565b50505050565b50565b60008060007fba286e4d89dabf4b2878e896423bb123d9d5143e662606fd343b6766d7bcf72160001c73ffffffffffffffffffffffffffffffffffffffff16604051610a2d906116e3565b600060405180830381855afa9150503d8060008114610a68576040519150601f19603f3d011682016040523d82523d6000602084013e610a6d565b606091505b509150915081610ab2576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610aa990611744565b60405180910390fd5b6020815114610af6576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610aed906117b0565b60405180910390fd5b600081806020019051810190610b0c91906117fc565b905080935050505090565b60008167ffffffffffffffff168367ffffffffffffffff1610905092915050565b60007f3dcdf63b41c103567d7225976ad9145e866c7a7dccc6c277ea86abbd268fbac960001c73ffffffffffffffffffffffffffffffffffffffff1683604051602001610b859190611844565b604051602081830303815290604052604051610ba191906118c5565b600060405180830381855afa9150503d8060008114610bdc576040519150601f19603f3d011682016040523d82523d6000602084013e610be1565b606091505b50509050808290610c28576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610c1f9190611920565b60405180910390fd5b50505050565b60008167ffffffffffffffff168367ffffffffffffffff1611905092915050565b600080fd5b600080fd5b6000819050919050565b610c6c81610c59565b8114610c7757600080fd5b50565b600081359050610c8981610c63565b92915050565b600060ff82169050919050565b610ca581610c8f565b8114610cb057600080fd5b50565b600081359050610cc281610c9c565b92915050565b60008060408385031215610cdf57610cde610c4f565b5b6000610ced85828601610c7a565b9250506020610cfe85828601610cb3565b9150509250929050565b600067ffffffffffffffff82169050919050565b610d2581610d08565b8114610d3057600080fd5b50565b600081359050610d4281610d1c565b92915050565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b6000610d7382610d48565b9050919050565b610d8381610d68565b8114610d8e57600080fd5b50565b600081359050610da081610d7a565b92915050565b600080fd5b600080fd5b600080fd5b60008083601f840112610dcb57610dca610da6565b5b8235905067ffffffffffffffff811115610de857610de7610dab565b5b602083019150836020820283011115610e0457610e03610db0565b5b9250929050565b60008060008060608587031215610e2557610e24610c4f565b5b6000610e3387828801610d33565b9450506020610e4487828801610d91565b935050604085013567ffffffffffffffff811115610e6557610e64610c54565b5b610e7187828801610db5565b925092505092959194509250565b610e8881610c59565b82525050565b6000602082019050610ea36000830184610e7f565b92915050565b6000819050919050565b610ebc81610ea9565b8114610ec757600080fd5b50565b600081359050610ed981610eb3565b92915050565b60008083601f840112610ef557610ef4610da6565b5b8235905067ffffffffffffffff811115610f1257610f11610dab565b5b602083019150836001820283011115610f2e57610f2d610db0565b5b9250929050565b60008060008060008060808789031215610f5257610f51610c4f565b5b6000610f6089828a01610d33565b9650506020610f7189828a01610eca565b955050604087013567ffffffffffffffff811115610f9257610f91610c54565b5b610f9e89828a01610db5565b9450945050606087013567ffffffffffffffff811115610fc157610fc0610c54565b5b610fcd89828a01610edf565b92509250509295509295509295565b600060208284031215610ff257610ff1610c4f565b5b600061100084828501610c7a565b91505092915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602160045260246000fd5b600082825260208201905092915050565b7f73656e646572206e6f74206120766f7465720000000000000000000000000000600082015250565b600061107f601283611038565b915061108a82611049565b602082019050919050565b600060208201905081810360008301526110ae81611072565b9050919050565b7f616c726561647920766f74656400000000000000000000000000000000000000600082015250565b60006110eb600d83611038565b91506110f6826110b5565b602082019050919050565b6000602082019050818103600083015261111a816110de565b9050919050565b61112a81610c8f565b82525050565b60006040820190506111456000830185610e7f565b6111526020830184611121565b9392505050565b600060208201905061116e6000830184611121565b92915050565b600081905092915050565b6000819050919050565b61119281610d68565b82525050565b60006111a48383611189565b60208301905092915050565b60006111bf6020840184610d91565b905092915050565b6000602082019050919050565b60006111e08385611174565b93506111eb8261117f565b8060005b858110156112245761120182846111b0565b61120b8882611198565b9750611216836111c7565b9250506001810190506111ef565b5085925050509392505050565b600061123e8284866111d4565b91508190509392505050565b6000819050919050565b600061126f61126a61126584610d08565b61124a565b610d08565b9050919050565b61127f81611254565b82525050565b61128e81610d68565b82525050565b60006060820190506112a96000830186611276565b6112b66020830185611285565b6112c36040830184610e7f565b949350505050565b7f5468726573686f6c642073686f756c64206e6f74206265203000000000000000600082015250565b6000611301601983611038565b915061130c826112cb565b602082019050919050565b60006020820190508181036000830152611330816112f4565b9050919050565b7f5468657265206d757374206265206174206c65617374206f6e6520766f746572600082015250565b600061136d602083611038565b915061137882611337565b602082019050919050565b6000602082019050818103600083015261139c81611360565b9050919050565b7f70726f706f73616c20616c726561647920657869737473000000000000000000600082015250565b60006113d9601783611038565b91506113e4826113a3565b602082019050919050565b60006020820190508181036000830152611408816113cc565b9050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052603260045260246000fd5b60006020828403121561145457611453610c4f565b5b600061146284828501610d91565b91505092915050565b600082825260208201905092915050565b82818337600083830152505050565b6000601f19601f8301169050919050565b60006114a8838561146b565b93506114b583858461147c565b6114be8361148b565b840190509392505050565b600060208201905081810360008301526114e481848661149c565b90509392505050565b7f50726f706f73616c20616c726561647920657865637574656400000000000000600082015250565b6000611523601983611038565b915061152e826114ed565b602082019050919050565b6000602082019050818103600083015261155281611516565b9050919050565b6000819050919050565b600061157e61157961157484611559565b61124a565b610c8f565b9050919050565b61158e81611563565b82525050565b60006040820190506115a96000830185610e7f565b6115b66020830184611585565b9392505050565b7f43616e6e6f7420616363657373204f776e6564436f756e746572206f776e656460008201527f20627920616e6f74686572206164647265737300000000000000000000000000602082015250565b6000611619603383611038565b9150611624826115bd565b604082019050919050565b600060208201905081810360008301526116488161160c565b9050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b600061168982610ea9565b915061169483610ea9565b92508282019050808211156116ac576116ab61164f565b5b92915050565b600081905092915050565b50565b60006116cd6000836116b2565b91506116d8826116bd565b600082019050919050565b60006116ee826116c0565b9150819050919050565b7f507265636f6d70696c652063616c6c206661696c656400000000000000000000600082015250565b600061172e601683611038565b9150611739826116f8565b602082019050919050565b6000602082019050818103600083015261175d81611721565b9050919050565b7f496e76616c6964206f7574707574206c656e6774680000000000000000000000600082015250565b600061179a601583611038565b91506117a582611764565b602082019050919050565b600060208201905081810360008301526117c98161178d565b9050919050565b6117d981610d08565b81146117e457600080fd5b50565b6000815190506117f6816117d0565b92915050565b60006020828403121561181257611811610c4f565b5b6000611820848285016117e7565b91505092915050565b60008115159050919050565b61183e81611829565b82525050565b60006020820190506118596000830184611835565b92915050565b600081519050919050565b60005b8381101561188857808201518184015260208101905061186d565b60008484015250505050565b600061189f8261185f565b6118a981856116b2565b93506118b981856020860161186a565b80840191505092915050565b60006118d18284611894565b915081905092915050565b600081519050919050565b60006118f2826118dc565b6118fc8185611038565b935061190c81856020860161186a565b6119158161148b565b840191505092915050565b6000602082019050818103600083015261193a81846118e7565b90509291505056fe50726f706f73616c20646561646c696e6520686173206e6f74207061737365642079657450726f706f73616c20646561646c696e652068617320706173736564206f722070726f706f73616c20646f6573206e6f74206578697374
    /// ```
    #[rustfmt::skip]
    #[allow(clippy::all)]
    pub static DEPLOYED_BYTECODE: alloy_sol_types::private::Bytes = alloy_sol_types::private::Bytes::from_static(
        b"`\x80`@R4\x80\x15a\0\x10W`\0\x80\xFD[P`\x046\x10a\0LW`\x005`\xE0\x1C\x80c\xB4\xB0q>\x14a\0QW\x80c\xB8)\x96o\x14a\0mW\x80c\xCFu\xEE*\x14a\0\x9DW\x80c\xE7Q\xF2q\x14a\0\xCDW[`\0\x80\xFD[a\0k`\x04\x806\x03\x81\x01\x90a\0f\x91\x90a\x0C\xC8V[a\0\xE9V[\0[a\0\x87`\x04\x806\x03\x81\x01\x90a\0\x82\x91\x90a\x0E\x0BV[a\x02\xF1V[`@Qa\0\x94\x91\x90a\x0E\x8EV[`@Q\x80\x91\x03\x90\xF3[a\0\xB7`\x04\x806\x03\x81\x01\x90a\0\xB2\x91\x90a\x0F5V[a\x03PV[`@Qa\0\xC4\x91\x90a\x0E\x8EV[`@Q\x80\x91\x03\x90\xF3[a\0\xE7`\x04\x806\x03\x81\x01\x90a\0\xE2\x91\x90a\x0F\xDCV[a\x06\x02V[\0[`\0\x80`\0\x84\x81R` \x01\x90\x81R` \x01`\0 \x90Pa\x019\x81`\0\x01`\0\x90T\x90a\x01\0\n\x90\x04g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16`@Q\x80``\x01`@R\x80`7\x81R` \x01a\x19g`7\x919a\x07{V[`\x01`\x02\x81\x11\x15a\x01MWa\x01La\x10\tV[[\x81`\x03\x01`\x003s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x81R` \x01\x90\x81R` \x01`\0 `\0\x90T\x90a\x01\0\n\x90\x04`\xFF\x16`\x02\x81\x11\x15a\x01\xAEWa\x01\xADa\x10\tV[[\x14a\x01\xEEW`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x01\xE5\x90a\x10\x95V[`@Q\x80\x91\x03\x90\xFD[`\0a\x02\x06\x843`\x02a\x07\xAC\x90\x92\x91\x90c\xFF\xFF\xFF\xFF\x16V[\x14a\x02FW`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x02=\x90a\x11\x01V[`@Q\x80\x91\x03\x90\xFD[a\x02_\x833`\x01`\x02a\x08x\x90\x93\x92\x91\x90c\xFF\xFF\xFF\xFF\x16V[a\x02\x9D\x83\x83`@Q` \x01a\x02u\x92\x91\x90a\x110V[`@Q` \x81\x83\x03\x03\x81R\x90`@R\x80Q\x90` \x01 `\x01\x80a\tU\x90\x92\x91\x90c\xFF\xFF\xFF\xFF\x16V[3s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83\x7F\xD8\xA9\\\xA0^\x9A&V\xFE!\xD862\x9D\x9C\xD7x0\xE7\xFE\xF7\xAC\xB7\xC0\xFD;\xF5B\x1E\xA7\xAD\x9A\x84`@Qa\x02\xE4\x91\x90a\x11YV[`@Q\x80\x91\x03\x90\xA3PPPV[`\0\x84\x84\x84\x84`@Q` \x01a\x03\x08\x92\x91\x90a\x121V[`@Q` \x81\x83\x03\x03\x81R\x90`@R\x80Q\x90` \x01 `@Q` \x01a\x030\x93\x92\x91\x90a\x12\x94V[`@Q` \x81\x83\x03\x03\x81R\x90`@R\x80Q\x90` \x01 \x90P\x94\x93PPPPV[`\0a\x03\x91\x87`@Q\x80`@\x01`@R\x80`\x1E\x81R` \x01\x7FDeadline must be in the future\0\0\x81RPa\x07{V[`\0\x86\x11a\x03\xD4W`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x03\xCB\x90a\x13\x17V[`@Q\x80\x91\x03\x90\xFD[`\0\x85\x85\x90P\x11a\x04\x1AW`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x04\x11\x90a\x13\x83V[`@Q\x80\x91\x03\x90\xFD[`\0a\x04(\x883\x88\x88a\x02\xF1V[\x90P`\0\x80`\0\x83\x81R` \x01\x90\x81R` \x01`\0 \x90P`\0\x81`\x05\x01T\x14a\x04\x87W`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x04~\x90a\x13\xEFV[`@Q\x80\x91\x03\x90\xFD[\x88\x81`\0\x01`\0a\x01\0\n\x81T\x81g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x02\x19\x16\x90\x83g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x02\x17\x90UP3\x81`\x02\x01`\0a\x01\0\n\x81T\x81s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x02\x19\x16\x90\x83s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x02\x17\x90UP\x86\x86\x90P\x81`\x05\x01\x81\x90UP`\0[\x87\x87\x90P\x81\x10\x15a\x05\xADW`\x01\x82`\x03\x01`\0\x8A\x8A\x85\x81\x81\x10a\x05*Wa\x05)a\x14\x0FV[[\x90P` \x02\x01` \x81\x01\x90a\x05?\x91\x90a\x14>V[s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x81R` \x01\x90\x81R` \x01`\0 `\0a\x01\0\n\x81T\x81`\xFF\x02\x19\x16\x90\x83`\x02\x81\x11\x15a\x05\x9BWa\x05\x9Aa\x10\tV[[\x02\x17\x90UP\x80\x80`\x01\x01\x91PPa\x05\x04V[P\x88g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x82\x7F\xDD\x1DC\xA4\x15\xE6\xCFP-\xCD{3=2\x0FAh)\xC0\xF6\xA4:\xA9\xE3-\x81\xCD\x9A:qG\xE6\x87\x87`@Qa\x05\xEB\x92\x91\x90a\x14\xC9V[`@Q\x80\x91\x03\x90\xA3\x81\x92PPP\x96\x95PPPPPPV[`\0\x80`\0\x83\x81R` \x01\x90\x81R` \x01`\0 \x90Pa\x06R\x81`\0\x01`\0\x90T\x90a\x01\0\n\x90\x04g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16`@Q\x80``\x01`@R\x80`$\x81R` \x01a\x19C`$\x919a\t\x86V[\x80`\x06\x01`\0\x90T\x90a\x01\0\n\x90\x04`\xFF\x16\x15a\x06\xA4W`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x06\x9B\x90a\x159V[`@Q\x80\x91\x03\x90\xFD[`\0\x82`\x01`@Q` \x01a\x06\xBA\x92\x91\x90a\x15\x94V[`@Q` \x81\x83\x03\x03\x81R\x90`@R\x80Q\x90` \x01 \x90Pa\x07#\x81\x83`\x01\x01T`@Q\x80`@\x01`@R\x80`\x10\x81R` \x01\x7FNot enough votes\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81RP`\x01a\t\xB7\x90\x93\x92\x91\x90c\xFF\xFF\xFF\xFF\x16V[`\x01\x82`\x06\x01`\0a\x01\0\n\x81T\x81`\xFF\x02\x19\x16\x90\x83\x15\x15\x02\x17\x90UPa\x07I\x83a\t\xDFV[\x82\x7F{\x1B\xCF\x1C\xCF\x90\x1A\x11X\x9A\xFF\xF5PMY\xFD\nSx\x0E\xED*\x95*\xDA\xDE\x03H\x98Q9\xE0`@Q`@Q\x80\x91\x03\x90\xA2PPPV[a\x07\xA8a\x07\xA2\x83a\x07\x8Aa\t\xE2V[g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16a\x0B\x17\x90\x91\x90c\xFF\xFF\xFF\xFF\x16V[\x82a\x0B8V[PPV[`\x002s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x82s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x14a\x08\x1CW`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x08\x13\x90a\x16/V[`@Q\x80\x91\x03\x90\xFD[\x83`\0\x01`\0\x84\x81R` \x01\x90\x81R` \x01`\0 `\0\x83s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x81R` \x01\x90\x81R` \x01`\0 T\x90P\x93\x92PPPV[2s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x82s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x14a\x08\xE6W`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x08\xDD\x90a\x16/V[`@Q\x80\x91\x03\x90\xFD[\x80\x84`\0\x01`\0\x85\x81R` \x01\x90\x81R` \x01`\0 `\0\x84s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x81R` \x01\x90\x81R` \x01`\0 `\0\x82\x82Ta\tH\x91\x90a\x16~V[\x92PP\x81\x90UPPPPPV[\x80\x83`\0\x01`\0\x84\x81R` \x01\x90\x81R` \x01`\0 `\0\x82\x82Ta\tz\x91\x90a\x16~V[\x92PP\x81\x90UPPPPV[a\t\xB3a\t\xAD\x83a\t\x95a\t\xE2V[g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16a\x0C.\x90\x91\x90c\xFF\xFF\xFF\xFF\x16V[\x82a\x0B8V[PPV[a\t\xD9\x82\x85`\0\x01`\0\x86\x81R` \x01\x90\x81R` \x01`\0 T\x10\x15\x82a\x0B8V[PPPPV[PV[`\0\x80`\0\x7F\xBA(nM\x89\xDA\xBFK(x\xE8\x96B;\xB1#\xD9\xD5\x14>f&\x06\xFD4;gf\xD7\xBC\xF7!`\0\x1Cs\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16`@Qa\n-\x90a\x16\xE3V[`\0`@Q\x80\x83\x03\x81\x85Z\xFA\x91PP=\x80`\0\x81\x14a\nhW`@Q\x91P`\x1F\x19`?=\x01\x16\x82\x01`@R=\x82R=`\0` \x84\x01>a\nmV[``\x91P[P\x91P\x91P\x81a\n\xB2W`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\n\xA9\x90a\x17DV[`@Q\x80\x91\x03\x90\xFD[` \x81Q\x14a\n\xF6W`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\n\xED\x90a\x17\xB0V[`@Q\x80\x91\x03\x90\xFD[`\0\x81\x80` \x01\x90Q\x81\x01\x90a\x0B\x0C\x91\x90a\x17\xFCV[\x90P\x80\x93PPPP\x90V[`\0\x81g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x10\x90P\x92\x91PPV[`\0\x7F=\xCD\xF6;A\xC1\x03V}r%\x97j\xD9\x14^\x86lz}\xCC\xC6\xC2w\xEA\x86\xAB\xBD&\x8F\xBA\xC9`\0\x1Cs\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83`@Q` \x01a\x0B\x85\x91\x90a\x18DV[`@Q` \x81\x83\x03\x03\x81R\x90`@R`@Qa\x0B\xA1\x91\x90a\x18\xC5V[`\0`@Q\x80\x83\x03\x81\x85Z\xFA\x91PP=\x80`\0\x81\x14a\x0B\xDCW`@Q\x91P`\x1F\x19`?=\x01\x16\x82\x01`@R=\x82R=`\0` \x84\x01>a\x0B\xE1V[``\x91P[PP\x90P\x80\x82\x90a\x0C(W`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x0C\x1F\x91\x90a\x19 V[`@Q\x80\x91\x03\x90\xFD[PPPPV[`\0\x81g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x11\x90P\x92\x91PPV[`\0\x80\xFD[`\0\x80\xFD[`\0\x81\x90P\x91\x90PV[a\x0Cl\x81a\x0CYV[\x81\x14a\x0CwW`\0\x80\xFD[PV[`\0\x815\x90Pa\x0C\x89\x81a\x0CcV[\x92\x91PPV[`\0`\xFF\x82\x16\x90P\x91\x90PV[a\x0C\xA5\x81a\x0C\x8FV[\x81\x14a\x0C\xB0W`\0\x80\xFD[PV[`\0\x815\x90Pa\x0C\xC2\x81a\x0C\x9CV[\x92\x91PPV[`\0\x80`@\x83\x85\x03\x12\x15a\x0C\xDFWa\x0C\xDEa\x0COV[[`\0a\x0C\xED\x85\x82\x86\x01a\x0CzV[\x92PP` a\x0C\xFE\x85\x82\x86\x01a\x0C\xB3V[\x91PP\x92P\x92\x90PV[`\0g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x82\x16\x90P\x91\x90PV[a\r%\x81a\r\x08V[\x81\x14a\r0W`\0\x80\xFD[PV[`\0\x815\x90Pa\rB\x81a\r\x1CV[\x92\x91PPV[`\0s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x82\x16\x90P\x91\x90PV[`\0a\rs\x82a\rHV[\x90P\x91\x90PV[a\r\x83\x81a\rhV[\x81\x14a\r\x8EW`\0\x80\xFD[PV[`\0\x815\x90Pa\r\xA0\x81a\rzV[\x92\x91PPV[`\0\x80\xFD[`\0\x80\xFD[`\0\x80\xFD[`\0\x80\x83`\x1F\x84\x01\x12a\r\xCBWa\r\xCAa\r\xA6V[[\x825\x90Pg\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x81\x11\x15a\r\xE8Wa\r\xE7a\r\xABV[[` \x83\x01\x91P\x83` \x82\x02\x83\x01\x11\x15a\x0E\x04Wa\x0E\x03a\r\xB0V[[\x92P\x92\x90PV[`\0\x80`\0\x80``\x85\x87\x03\x12\x15a\x0E%Wa\x0E$a\x0COV[[`\0a\x0E3\x87\x82\x88\x01a\r3V[\x94PP` a\x0ED\x87\x82\x88\x01a\r\x91V[\x93PP`@\x85\x015g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x81\x11\x15a\x0EeWa\x0Eda\x0CTV[[a\x0Eq\x87\x82\x88\x01a\r\xB5V[\x92P\x92PP\x92\x95\x91\x94P\x92PV[a\x0E\x88\x81a\x0CYV[\x82RPPV[`\0` \x82\x01\x90Pa\x0E\xA3`\0\x83\x01\x84a\x0E\x7FV[\x92\x91PPV[`\0\x81\x90P\x91\x90PV[a\x0E\xBC\x81a\x0E\xA9V[\x81\x14a\x0E\xC7W`\0\x80\xFD[PV[`\0\x815\x90Pa\x0E\xD9\x81a\x0E\xB3V[\x92\x91PPV[`\0\x80\x83`\x1F\x84\x01\x12a\x0E\xF5Wa\x0E\xF4a\r\xA6V[[\x825\x90Pg\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x81\x11\x15a\x0F\x12Wa\x0F\x11a\r\xABV[[` \x83\x01\x91P\x83`\x01\x82\x02\x83\x01\x11\x15a\x0F.Wa\x0F-a\r\xB0V[[\x92P\x92\x90PV[`\0\x80`\0\x80`\0\x80`\x80\x87\x89\x03\x12\x15a\x0FRWa\x0FQa\x0COV[[`\0a\x0F`\x89\x82\x8A\x01a\r3V[\x96PP` a\x0Fq\x89\x82\x8A\x01a\x0E\xCAV[\x95PP`@\x87\x015g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x81\x11\x15a\x0F\x92Wa\x0F\x91a\x0CTV[[a\x0F\x9E\x89\x82\x8A\x01a\r\xB5V[\x94P\x94PP``\x87\x015g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x81\x11\x15a\x0F\xC1Wa\x0F\xC0a\x0CTV[[a\x0F\xCD\x89\x82\x8A\x01a\x0E\xDFV[\x92P\x92PP\x92\x95P\x92\x95P\x92\x95V[`\0` \x82\x84\x03\x12\x15a\x0F\xF2Wa\x0F\xF1a\x0COV[[`\0a\x10\0\x84\x82\x85\x01a\x0CzV[\x91PP\x92\x91PPV[\x7FNH{q\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0`\0R`!`\x04R`$`\0\xFD[`\0\x82\x82R` \x82\x01\x90P\x92\x91PPV[\x7Fsender not a voter\0\0\0\0\0\0\0\0\0\0\0\0\0\0`\0\x82\x01RPV[`\0a\x10\x7F`\x12\x83a\x108V[\x91Pa\x10\x8A\x82a\x10IV[` \x82\x01\x90P\x91\x90PV[`\0` \x82\x01\x90P\x81\x81\x03`\0\x83\x01Ra\x10\xAE\x81a\x10rV[\x90P\x91\x90PV[\x7Falready voted\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0`\0\x82\x01RPV[`\0a\x10\xEB`\r\x83a\x108V[\x91Pa\x10\xF6\x82a\x10\xB5V[` \x82\x01\x90P\x91\x90PV[`\0` \x82\x01\x90P\x81\x81\x03`\0\x83\x01Ra\x11\x1A\x81a\x10\xDEV[\x90P\x91\x90PV[a\x11*\x81a\x0C\x8FV[\x82RPPV[`\0`@\x82\x01\x90Pa\x11E`\0\x83\x01\x85a\x0E\x7FV[a\x11R` \x83\x01\x84a\x11!V[\x93\x92PPPV[`\0` \x82\x01\x90Pa\x11n`\0\x83\x01\x84a\x11!V[\x92\x91PPV[`\0\x81\x90P\x92\x91PPV[`\0\x81\x90P\x91\x90PV[a\x11\x92\x81a\rhV[\x82RPPV[`\0a\x11\xA4\x83\x83a\x11\x89V[` \x83\x01\x90P\x92\x91PPV[`\0a\x11\xBF` \x84\x01\x84a\r\x91V[\x90P\x92\x91PPV[`\0` \x82\x01\x90P\x91\x90PV[`\0a\x11\xE0\x83\x85a\x11tV[\x93Pa\x11\xEB\x82a\x11\x7FV[\x80`\0[\x85\x81\x10\x15a\x12$Wa\x12\x01\x82\x84a\x11\xB0V[a\x12\x0B\x88\x82a\x11\x98V[\x97Pa\x12\x16\x83a\x11\xC7V[\x92PP`\x01\x81\x01\x90Pa\x11\xEFV[P\x85\x92PPP\x93\x92PPPV[`\0a\x12>\x82\x84\x86a\x11\xD4V[\x91P\x81\x90P\x93\x92PPPV[`\0\x81\x90P\x91\x90PV[`\0a\x12oa\x12ja\x12e\x84a\r\x08V[a\x12JV[a\r\x08V[\x90P\x91\x90PV[a\x12\x7F\x81a\x12TV[\x82RPPV[a\x12\x8E\x81a\rhV[\x82RPPV[`\0``\x82\x01\x90Pa\x12\xA9`\0\x83\x01\x86a\x12vV[a\x12\xB6` \x83\x01\x85a\x12\x85V[a\x12\xC3`@\x83\x01\x84a\x0E\x7FV[\x94\x93PPPPV[\x7FThreshold should not be 0\0\0\0\0\0\0\0`\0\x82\x01RPV[`\0a\x13\x01`\x19\x83a\x108V[\x91Pa\x13\x0C\x82a\x12\xCBV[` \x82\x01\x90P\x91\x90PV[`\0` \x82\x01\x90P\x81\x81\x03`\0\x83\x01Ra\x130\x81a\x12\xF4V[\x90P\x91\x90PV[\x7FThere must be at least one voter`\0\x82\x01RPV[`\0a\x13m` \x83a\x108V[\x91Pa\x13x\x82a\x137V[` \x82\x01\x90P\x91\x90PV[`\0` \x82\x01\x90P\x81\x81\x03`\0\x83\x01Ra\x13\x9C\x81a\x13`V[\x90P\x91\x90PV[\x7Fproposal already exists\0\0\0\0\0\0\0\0\0`\0\x82\x01RPV[`\0a\x13\xD9`\x17\x83a\x108V[\x91Pa\x13\xE4\x82a\x13\xA3V[` \x82\x01\x90P\x91\x90PV[`\0` \x82\x01\x90P\x81\x81\x03`\0\x83\x01Ra\x14\x08\x81a\x13\xCCV[\x90P\x91\x90PV[\x7FNH{q\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0`\0R`2`\x04R`$`\0\xFD[`\0` \x82\x84\x03\x12\x15a\x14TWa\x14Sa\x0COV[[`\0a\x14b\x84\x82\x85\x01a\r\x91V[\x91PP\x92\x91PPV[`\0\x82\x82R` \x82\x01\x90P\x92\x91PPV[\x82\x81\x837`\0\x83\x83\x01RPPPV[`\0`\x1F\x19`\x1F\x83\x01\x16\x90P\x91\x90PV[`\0a\x14\xA8\x83\x85a\x14kV[\x93Pa\x14\xB5\x83\x85\x84a\x14|V[a\x14\xBE\x83a\x14\x8BV[\x84\x01\x90P\x93\x92PPPV[`\0` \x82\x01\x90P\x81\x81\x03`\0\x83\x01Ra\x14\xE4\x81\x84\x86a\x14\x9CV[\x90P\x93\x92PPPV[\x7FProposal already executed\0\0\0\0\0\0\0`\0\x82\x01RPV[`\0a\x15#`\x19\x83a\x108V[\x91Pa\x15.\x82a\x14\xEDV[` \x82\x01\x90P\x91\x90PV[`\0` \x82\x01\x90P\x81\x81\x03`\0\x83\x01Ra\x15R\x81a\x15\x16V[\x90P\x91\x90PV[`\0\x81\x90P\x91\x90PV[`\0a\x15~a\x15ya\x15t\x84a\x15YV[a\x12JV[a\x0C\x8FV[\x90P\x91\x90PV[a\x15\x8E\x81a\x15cV[\x82RPPV[`\0`@\x82\x01\x90Pa\x15\xA9`\0\x83\x01\x85a\x0E\x7FV[a\x15\xB6` \x83\x01\x84a\x15\x85V[\x93\x92PPPV[\x7FCannot access OwnedCounter owned`\0\x82\x01R\x7F by another address\0\0\0\0\0\0\0\0\0\0\0\0\0` \x82\x01RPV[`\0a\x16\x19`3\x83a\x108V[\x91Pa\x16$\x82a\x15\xBDV[`@\x82\x01\x90P\x91\x90PV[`\0` \x82\x01\x90P\x81\x81\x03`\0\x83\x01Ra\x16H\x81a\x16\x0CV[\x90P\x91\x90PV[\x7FNH{q\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0`\0R`\x11`\x04R`$`\0\xFD[`\0a\x16\x89\x82a\x0E\xA9V[\x91Pa\x16\x94\x83a\x0E\xA9V[\x92P\x82\x82\x01\x90P\x80\x82\x11\x15a\x16\xACWa\x16\xABa\x16OV[[\x92\x91PPV[`\0\x81\x90P\x92\x91PPV[PV[`\0a\x16\xCD`\0\x83a\x16\xB2V[\x91Pa\x16\xD8\x82a\x16\xBDV[`\0\x82\x01\x90P\x91\x90PV[`\0a\x16\xEE\x82a\x16\xC0V[\x91P\x81\x90P\x91\x90PV[\x7FPrecompile call failed\0\0\0\0\0\0\0\0\0\0`\0\x82\x01RPV[`\0a\x17.`\x16\x83a\x108V[\x91Pa\x179\x82a\x16\xF8V[` \x82\x01\x90P\x91\x90PV[`\0` \x82\x01\x90P\x81\x81\x03`\0\x83\x01Ra\x17]\x81a\x17!V[\x90P\x91\x90PV[\x7FInvalid output length\0\0\0\0\0\0\0\0\0\0\0`\0\x82\x01RPV[`\0a\x17\x9A`\x15\x83a\x108V[\x91Pa\x17\xA5\x82a\x17dV[` \x82\x01\x90P\x91\x90PV[`\0` \x82\x01\x90P\x81\x81\x03`\0\x83\x01Ra\x17\xC9\x81a\x17\x8DV[\x90P\x91\x90PV[a\x17\xD9\x81a\r\x08V[\x81\x14a\x17\xE4W`\0\x80\xFD[PV[`\0\x81Q\x90Pa\x17\xF6\x81a\x17\xD0V[\x92\x91PPV[`\0` \x82\x84\x03\x12\x15a\x18\x12Wa\x18\x11a\x0COV[[`\0a\x18 \x84\x82\x85\x01a\x17\xE7V[\x91PP\x92\x91PPV[`\0\x81\x15\x15\x90P\x91\x90PV[a\x18>\x81a\x18)V[\x82RPPV[`\0` \x82\x01\x90Pa\x18Y`\0\x83\x01\x84a\x185V[\x92\x91PPV[`\0\x81Q\x90P\x91\x90PV[`\0[\x83\x81\x10\x15a\x18\x88W\x80\x82\x01Q\x81\x84\x01R` \x81\x01\x90Pa\x18mV[`\0\x84\x84\x01RPPPPV[`\0a\x18\x9F\x82a\x18_V[a\x18\xA9\x81\x85a\x16\xB2V[\x93Pa\x18\xB9\x81\x85` \x86\x01a\x18jV[\x80\x84\x01\x91PP\x92\x91PPV[`\0a\x18\xD1\x82\x84a\x18\x94V[\x91P\x81\x90P\x92\x91PPV[`\0\x81Q\x90P\x91\x90PV[`\0a\x18\xF2\x82a\x18\xDCV[a\x18\xFC\x81\x85a\x108V[\x93Pa\x19\x0C\x81\x85` \x86\x01a\x18jV[a\x19\x15\x81a\x14\x8BV[\x84\x01\x91PP\x92\x91PPV[`\0` \x82\x01\x90P\x81\x81\x03`\0\x83\x01Ra\x19:\x81\x84a\x18\xE7V[\x90P\x92\x91PPV\xFEProposal deadline has not passed yetProposal deadline has passed or proposal does not exist",
    );
    #[derive(serde::Serialize, serde::Deserialize)]
    #[derive(Default, Debug, PartialEq, Eq, Hash)]
    /**Event with signature `ProposalCreated(bytes32,uint64,bytes)` and selector `0xdd1d43a415e6cf502dcd7b333d320f416829c0f6a43aa9e32d81cd9a3a7147e6`.
```solidity
event ProposalCreated(bytes32 indexed proposalId, Time.Timestamp indexed deadline, bytes data);
```*/
    #[allow(
        non_camel_case_types,
        non_snake_case,
        clippy::pub_underscore_fields,
        clippy::style
    )]
    #[derive(Clone)]
    pub struct ProposalCreated {
        #[allow(missing_docs)]
        pub proposalId: alloy::sol_types::private::FixedBytes<32>,
        #[allow(missing_docs)]
        pub deadline: <Time::Timestamp as alloy::sol_types::SolType>::RustType,
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
        impl alloy_sol_types::SolEvent for ProposalCreated {
            type DataTuple<'a> = (alloy::sol_types::sol_data::Bytes,);
            type DataToken<'a> = <Self::DataTuple<
                'a,
            > as alloy_sol_types::SolType>::Token<'a>;
            type TopicList = (
                alloy_sol_types::sol_data::FixedBytes<32>,
                alloy::sol_types::sol_data::FixedBytes<32>,
                Time::Timestamp,
            );
            const SIGNATURE: &'static str = "ProposalCreated(bytes32,uint64,bytes)";
            const SIGNATURE_HASH: alloy_sol_types::private::B256 = alloy_sol_types::private::B256::new([
                221u8, 29u8, 67u8, 164u8, 21u8, 230u8, 207u8, 80u8, 45u8, 205u8, 123u8,
                51u8, 61u8, 50u8, 15u8, 65u8, 104u8, 41u8, 192u8, 246u8, 164u8, 58u8,
                169u8, 227u8, 45u8, 129u8, 205u8, 154u8, 58u8, 113u8, 71u8, 230u8,
            ]);
            const ANONYMOUS: bool = false;
            #[allow(unused_variables)]
            #[inline]
            fn new(
                topics: <Self::TopicList as alloy_sol_types::SolType>::RustType,
                data: <Self::DataTuple<'_> as alloy_sol_types::SolType>::RustType,
            ) -> Self {
                Self {
                    proposalId: topics.1,
                    deadline: topics.2,
                    data: data.0,
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
                    <alloy::sol_types::sol_data::Bytes as alloy_sol_types::SolType>::tokenize(
                        &self.data,
                    ),
                )
            }
            #[inline]
            fn topics(&self) -> <Self::TopicList as alloy_sol_types::SolType>::RustType {
                (
                    Self::SIGNATURE_HASH.into(),
                    self.proposalId.clone(),
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
                out[1usize] = <alloy::sol_types::sol_data::FixedBytes<
                    32,
                > as alloy_sol_types::EventTopic>::encode_topic(&self.proposalId);
                out[2usize] = <Time::Timestamp as alloy_sol_types::EventTopic>::encode_topic(
                    &self.deadline,
                );
                Ok(())
            }
        }
        #[automatically_derived]
        impl alloy_sol_types::private::IntoLogData for ProposalCreated {
            fn to_log_data(&self) -> alloy_sol_types::private::LogData {
                From::from(self)
            }
            fn into_log_data(self) -> alloy_sol_types::private::LogData {
                From::from(&self)
            }
        }
        #[automatically_derived]
        impl From<&ProposalCreated> for alloy_sol_types::private::LogData {
            #[inline]
            fn from(this: &ProposalCreated) -> alloy_sol_types::private::LogData {
                alloy_sol_types::SolEvent::encode_log_data(this)
            }
        }
    };
    #[derive(serde::Serialize, serde::Deserialize)]
    #[derive(Default, Debug, PartialEq, Eq, Hash)]
    /**Event with signature `ProposalExecuted(bytes32)` and selector `0x7b1bcf1ccf901a11589afff5504d59fd0a53780eed2a952adade0348985139e0`.
```solidity
event ProposalExecuted(bytes32 indexed proposalId);
```*/
    #[allow(
        non_camel_case_types,
        non_snake_case,
        clippy::pub_underscore_fields,
        clippy::style
    )]
    #[derive(Clone)]
    pub struct ProposalExecuted {
        #[allow(missing_docs)]
        pub proposalId: alloy::sol_types::private::FixedBytes<32>,
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
        impl alloy_sol_types::SolEvent for ProposalExecuted {
            type DataTuple<'a> = ();
            type DataToken<'a> = <Self::DataTuple<
                'a,
            > as alloy_sol_types::SolType>::Token<'a>;
            type TopicList = (
                alloy_sol_types::sol_data::FixedBytes<32>,
                alloy::sol_types::sol_data::FixedBytes<32>,
            );
            const SIGNATURE: &'static str = "ProposalExecuted(bytes32)";
            const SIGNATURE_HASH: alloy_sol_types::private::B256 = alloy_sol_types::private::B256::new([
                123u8, 27u8, 207u8, 28u8, 207u8, 144u8, 26u8, 17u8, 88u8, 154u8, 255u8,
                245u8, 80u8, 77u8, 89u8, 253u8, 10u8, 83u8, 120u8, 14u8, 237u8, 42u8,
                149u8, 42u8, 218u8, 222u8, 3u8, 72u8, 152u8, 81u8, 57u8, 224u8,
            ]);
            const ANONYMOUS: bool = false;
            #[allow(unused_variables)]
            #[inline]
            fn new(
                topics: <Self::TopicList as alloy_sol_types::SolType>::RustType,
                data: <Self::DataTuple<'_> as alloy_sol_types::SolType>::RustType,
            ) -> Self {
                Self { proposalId: topics.1 }
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
                (Self::SIGNATURE_HASH.into(), self.proposalId.clone())
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
                > as alloy_sol_types::EventTopic>::encode_topic(&self.proposalId);
                Ok(())
            }
        }
        #[automatically_derived]
        impl alloy_sol_types::private::IntoLogData for ProposalExecuted {
            fn to_log_data(&self) -> alloy_sol_types::private::LogData {
                From::from(self)
            }
            fn into_log_data(self) -> alloy_sol_types::private::LogData {
                From::from(&self)
            }
        }
        #[automatically_derived]
        impl From<&ProposalExecuted> for alloy_sol_types::private::LogData {
            #[inline]
            fn from(this: &ProposalExecuted) -> alloy_sol_types::private::LogData {
                alloy_sol_types::SolEvent::encode_log_data(this)
            }
        }
    };
    #[derive(serde::Serialize, serde::Deserialize)]
    #[derive(Default, Debug, PartialEq, Eq, Hash)]
    /**Event with signature `VoteCast(bytes32,address,uint8)` and selector `0xd8a95ca05e9a2656fe21d836329d9cd77830e7fef7acb7c0fd3bf5421ea7ad9a`.
```solidity
event VoteCast(bytes32 indexed proposalId, address indexed voter, uint8 choice);
```*/
    #[allow(
        non_camel_case_types,
        non_snake_case,
        clippy::pub_underscore_fields,
        clippy::style
    )]
    #[derive(Clone)]
    pub struct VoteCast {
        #[allow(missing_docs)]
        pub proposalId: alloy::sol_types::private::FixedBytes<32>,
        #[allow(missing_docs)]
        pub voter: alloy::sol_types::private::Address,
        #[allow(missing_docs)]
        pub choice: u8,
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
        impl alloy_sol_types::SolEvent for VoteCast {
            type DataTuple<'a> = (alloy::sol_types::sol_data::Uint<8>,);
            type DataToken<'a> = <Self::DataTuple<
                'a,
            > as alloy_sol_types::SolType>::Token<'a>;
            type TopicList = (
                alloy_sol_types::sol_data::FixedBytes<32>,
                alloy::sol_types::sol_data::FixedBytes<32>,
                alloy::sol_types::sol_data::Address,
            );
            const SIGNATURE: &'static str = "VoteCast(bytes32,address,uint8)";
            const SIGNATURE_HASH: alloy_sol_types::private::B256 = alloy_sol_types::private::B256::new([
                216u8, 169u8, 92u8, 160u8, 94u8, 154u8, 38u8, 86u8, 254u8, 33u8, 216u8,
                54u8, 50u8, 157u8, 156u8, 215u8, 120u8, 48u8, 231u8, 254u8, 247u8, 172u8,
                183u8, 192u8, 253u8, 59u8, 245u8, 66u8, 30u8, 167u8, 173u8, 154u8,
            ]);
            const ANONYMOUS: bool = false;
            #[allow(unused_variables)]
            #[inline]
            fn new(
                topics: <Self::TopicList as alloy_sol_types::SolType>::RustType,
                data: <Self::DataTuple<'_> as alloy_sol_types::SolType>::RustType,
            ) -> Self {
                Self {
                    proposalId: topics.1,
                    voter: topics.2,
                    choice: data.0,
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
                        8,
                    > as alloy_sol_types::SolType>::tokenize(&self.choice),
                )
            }
            #[inline]
            fn topics(&self) -> <Self::TopicList as alloy_sol_types::SolType>::RustType {
                (
                    Self::SIGNATURE_HASH.into(),
                    self.proposalId.clone(),
                    self.voter.clone(),
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
                > as alloy_sol_types::EventTopic>::encode_topic(&self.proposalId);
                out[2usize] = <alloy::sol_types::sol_data::Address as alloy_sol_types::EventTopic>::encode_topic(
                    &self.voter,
                );
                Ok(())
            }
        }
        #[automatically_derived]
        impl alloy_sol_types::private::IntoLogData for VoteCast {
            fn to_log_data(&self) -> alloy_sol_types::private::LogData {
                From::from(self)
            }
            fn into_log_data(self) -> alloy_sol_types::private::LogData {
                From::from(&self)
            }
        }
        #[automatically_derived]
        impl From<&VoteCast> for alloy_sol_types::private::LogData {
            #[inline]
            fn from(this: &VoteCast) -> alloy_sol_types::private::LogData {
                alloy_sol_types::SolEvent::encode_log_data(this)
            }
        }
    };
    #[derive(serde::Serialize, serde::Deserialize)]
    #[derive(Default, Debug, PartialEq, Eq, Hash)]
    /**Function with signature `castVote(bytes32,uint8)` and selector `0xb4b0713e`.
```solidity
function castVote(bytes32 proposalId, uint8 choice) external;
```*/
    #[allow(non_camel_case_types, non_snake_case, clippy::pub_underscore_fields)]
    #[derive(Clone)]
    pub struct castVoteCall {
        #[allow(missing_docs)]
        pub proposalId: alloy::sol_types::private::FixedBytes<32>,
        #[allow(missing_docs)]
        pub choice: u8,
    }
    ///Container type for the return parameters of the [`castVote(bytes32,uint8)`](castVoteCall) function.
    #[allow(non_camel_case_types, non_snake_case, clippy::pub_underscore_fields)]
    #[derive(Clone)]
    pub struct castVoteReturn {}
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
                alloy::sol_types::sol_data::Uint<8>,
            );
            #[doc(hidden)]
            type UnderlyingRustTuple<'a> = (
                alloy::sol_types::private::FixedBytes<32>,
                u8,
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
            impl ::core::convert::From<castVoteCall> for UnderlyingRustTuple<'_> {
                fn from(value: castVoteCall) -> Self {
                    (value.proposalId, value.choice)
                }
            }
            #[automatically_derived]
            #[doc(hidden)]
            impl ::core::convert::From<UnderlyingRustTuple<'_>> for castVoteCall {
                fn from(tuple: UnderlyingRustTuple<'_>) -> Self {
                    Self {
                        proposalId: tuple.0,
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
            impl ::core::convert::From<castVoteReturn> for UnderlyingRustTuple<'_> {
                fn from(value: castVoteReturn) -> Self {
                    ()
                }
            }
            #[automatically_derived]
            #[doc(hidden)]
            impl ::core::convert::From<UnderlyingRustTuple<'_>> for castVoteReturn {
                fn from(tuple: UnderlyingRustTuple<'_>) -> Self {
                    Self {}
                }
            }
        }
        #[automatically_derived]
        impl alloy_sol_types::SolCall for castVoteCall {
            type Parameters<'a> = (
                alloy::sol_types::sol_data::FixedBytes<32>,
                alloy::sol_types::sol_data::Uint<8>,
            );
            type Token<'a> = <Self::Parameters<
                'a,
            > as alloy_sol_types::SolType>::Token<'a>;
            type Return = castVoteReturn;
            type ReturnTuple<'a> = ();
            type ReturnToken<'a> = <Self::ReturnTuple<
                'a,
            > as alloy_sol_types::SolType>::Token<'a>;
            const SIGNATURE: &'static str = "castVote(bytes32,uint8)";
            const SELECTOR: [u8; 4] = [180u8, 176u8, 113u8, 62u8];
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
                    > as alloy_sol_types::SolType>::tokenize(&self.proposalId),
                    <alloy::sol_types::sol_data::Uint<
                        8,
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
    /**Function with signature `createProposal(uint64,uint256,address[],bytes)` and selector `0xcf75ee2a`.
```solidity
function createProposal(Time.Timestamp deadline, uint256 threshold, address[] memory voters, bytes memory data) external returns (bytes32 proposalId);
```*/
    #[allow(non_camel_case_types, non_snake_case, clippy::pub_underscore_fields)]
    #[derive(Clone)]
    pub struct createProposalCall {
        #[allow(missing_docs)]
        pub deadline: <Time::Timestamp as alloy::sol_types::SolType>::RustType,
        #[allow(missing_docs)]
        pub threshold: alloy::sol_types::private::primitives::aliases::U256,
        #[allow(missing_docs)]
        pub voters: alloy::sol_types::private::Vec<alloy::sol_types::private::Address>,
        #[allow(missing_docs)]
        pub data: alloy::sol_types::private::Bytes,
    }
    #[derive(serde::Serialize, serde::Deserialize)]
    #[derive(Default, Debug, PartialEq, Eq, Hash)]
    ///Container type for the return parameters of the [`createProposal(uint64,uint256,address[],bytes)`](createProposalCall) function.
    #[allow(non_camel_case_types, non_snake_case, clippy::pub_underscore_fields)]
    #[derive(Clone)]
    pub struct createProposalReturn {
        #[allow(missing_docs)]
        pub proposalId: alloy::sol_types::private::FixedBytes<32>,
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
                alloy::sol_types::sol_data::Bytes,
            );
            #[doc(hidden)]
            type UnderlyingRustTuple<'a> = (
                <Time::Timestamp as alloy::sol_types::SolType>::RustType,
                alloy::sol_types::private::primitives::aliases::U256,
                alloy::sol_types::private::Vec<alloy::sol_types::private::Address>,
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
            impl ::core::convert::From<createProposalCall> for UnderlyingRustTuple<'_> {
                fn from(value: createProposalCall) -> Self {
                    (value.deadline, value.threshold, value.voters, value.data)
                }
            }
            #[automatically_derived]
            #[doc(hidden)]
            impl ::core::convert::From<UnderlyingRustTuple<'_>> for createProposalCall {
                fn from(tuple: UnderlyingRustTuple<'_>) -> Self {
                    Self {
                        deadline: tuple.0,
                        threshold: tuple.1,
                        voters: tuple.2,
                        data: tuple.3,
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
            impl ::core::convert::From<createProposalReturn>
            for UnderlyingRustTuple<'_> {
                fn from(value: createProposalReturn) -> Self {
                    (value.proposalId,)
                }
            }
            #[automatically_derived]
            #[doc(hidden)]
            impl ::core::convert::From<UnderlyingRustTuple<'_>>
            for createProposalReturn {
                fn from(tuple: UnderlyingRustTuple<'_>) -> Self {
                    Self { proposalId: tuple.0 }
                }
            }
        }
        #[automatically_derived]
        impl alloy_sol_types::SolCall for createProposalCall {
            type Parameters<'a> = (
                Time::Timestamp,
                alloy::sol_types::sol_data::Uint<256>,
                alloy::sol_types::sol_data::Array<alloy::sol_types::sol_data::Address>,
                alloy::sol_types::sol_data::Bytes,
            );
            type Token<'a> = <Self::Parameters<
                'a,
            > as alloy_sol_types::SolType>::Token<'a>;
            type Return = createProposalReturn;
            type ReturnTuple<'a> = (alloy::sol_types::sol_data::FixedBytes<32>,);
            type ReturnToken<'a> = <Self::ReturnTuple<
                'a,
            > as alloy_sol_types::SolType>::Token<'a>;
            const SIGNATURE: &'static str = "createProposal(uint64,uint256,address[],bytes)";
            const SELECTOR: [u8; 4] = [207u8, 117u8, 238u8, 42u8];
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
                    > as alloy_sol_types::SolType>::tokenize(&self.threshold),
                    <alloy::sol_types::sol_data::Array<
                        alloy::sol_types::sol_data::Address,
                    > as alloy_sol_types::SolType>::tokenize(&self.voters),
                    <alloy::sol_types::sol_data::Bytes as alloy_sol_types::SolType>::tokenize(
                        &self.data,
                    ),
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
    /**Function with signature `execute(bytes32)` and selector `0xe751f271`.
```solidity
function execute(bytes32 proposalId) external;
```*/
    #[allow(non_camel_case_types, non_snake_case, clippy::pub_underscore_fields)]
    #[derive(Clone)]
    pub struct executeCall {
        #[allow(missing_docs)]
        pub proposalId: alloy::sol_types::private::FixedBytes<32>,
    }
    ///Container type for the return parameters of the [`execute(bytes32)`](executeCall) function.
    #[allow(non_camel_case_types, non_snake_case, clippy::pub_underscore_fields)]
    #[derive(Clone)]
    pub struct executeReturn {}
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
            impl ::core::convert::From<executeCall> for UnderlyingRustTuple<'_> {
                fn from(value: executeCall) -> Self {
                    (value.proposalId,)
                }
            }
            #[automatically_derived]
            #[doc(hidden)]
            impl ::core::convert::From<UnderlyingRustTuple<'_>> for executeCall {
                fn from(tuple: UnderlyingRustTuple<'_>) -> Self {
                    Self { proposalId: tuple.0 }
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
            impl ::core::convert::From<executeReturn> for UnderlyingRustTuple<'_> {
                fn from(value: executeReturn) -> Self {
                    ()
                }
            }
            #[automatically_derived]
            #[doc(hidden)]
            impl ::core::convert::From<UnderlyingRustTuple<'_>> for executeReturn {
                fn from(tuple: UnderlyingRustTuple<'_>) -> Self {
                    Self {}
                }
            }
        }
        #[automatically_derived]
        impl alloy_sol_types::SolCall for executeCall {
            type Parameters<'a> = (alloy::sol_types::sol_data::FixedBytes<32>,);
            type Token<'a> = <Self::Parameters<
                'a,
            > as alloy_sol_types::SolType>::Token<'a>;
            type Return = executeReturn;
            type ReturnTuple<'a> = ();
            type ReturnToken<'a> = <Self::ReturnTuple<
                'a,
            > as alloy_sol_types::SolType>::Token<'a>;
            const SIGNATURE: &'static str = "execute(bytes32)";
            const SELECTOR: [u8; 4] = [231u8, 81u8, 242u8, 113u8];
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
                    > as alloy_sol_types::SolType>::tokenize(&self.proposalId),
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
    /**Function with signature `getProposalId(uint64,address,address[])` and selector `0xb829966f`.
```solidity
function getProposalId(Time.Timestamp deadline, address proposer, address[] memory voters) external pure returns (bytes32 proposalId);
```*/
    #[allow(non_camel_case_types, non_snake_case, clippy::pub_underscore_fields)]
    #[derive(Clone)]
    pub struct getProposalIdCall {
        #[allow(missing_docs)]
        pub deadline: <Time::Timestamp as alloy::sol_types::SolType>::RustType,
        #[allow(missing_docs)]
        pub proposer: alloy::sol_types::private::Address,
        #[allow(missing_docs)]
        pub voters: alloy::sol_types::private::Vec<alloy::sol_types::private::Address>,
    }
    #[derive(serde::Serialize, serde::Deserialize)]
    #[derive(Default, Debug, PartialEq, Eq, Hash)]
    ///Container type for the return parameters of the [`getProposalId(uint64,address,address[])`](getProposalIdCall) function.
    #[allow(non_camel_case_types, non_snake_case, clippy::pub_underscore_fields)]
    #[derive(Clone)]
    pub struct getProposalIdReturn {
        #[allow(missing_docs)]
        pub proposalId: alloy::sol_types::private::FixedBytes<32>,
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
                alloy::sol_types::sol_data::Address,
                alloy::sol_types::sol_data::Array<alloy::sol_types::sol_data::Address>,
            );
            #[doc(hidden)]
            type UnderlyingRustTuple<'a> = (
                <Time::Timestamp as alloy::sol_types::SolType>::RustType,
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
            impl ::core::convert::From<getProposalIdCall> for UnderlyingRustTuple<'_> {
                fn from(value: getProposalIdCall) -> Self {
                    (value.deadline, value.proposer, value.voters)
                }
            }
            #[automatically_derived]
            #[doc(hidden)]
            impl ::core::convert::From<UnderlyingRustTuple<'_>> for getProposalIdCall {
                fn from(tuple: UnderlyingRustTuple<'_>) -> Self {
                    Self {
                        deadline: tuple.0,
                        proposer: tuple.1,
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
            impl ::core::convert::From<getProposalIdReturn> for UnderlyingRustTuple<'_> {
                fn from(value: getProposalIdReturn) -> Self {
                    (value.proposalId,)
                }
            }
            #[automatically_derived]
            #[doc(hidden)]
            impl ::core::convert::From<UnderlyingRustTuple<'_>> for getProposalIdReturn {
                fn from(tuple: UnderlyingRustTuple<'_>) -> Self {
                    Self { proposalId: tuple.0 }
                }
            }
        }
        #[automatically_derived]
        impl alloy_sol_types::SolCall for getProposalIdCall {
            type Parameters<'a> = (
                Time::Timestamp,
                alloy::sol_types::sol_data::Address,
                alloy::sol_types::sol_data::Array<alloy::sol_types::sol_data::Address>,
            );
            type Token<'a> = <Self::Parameters<
                'a,
            > as alloy_sol_types::SolType>::Token<'a>;
            type Return = getProposalIdReturn;
            type ReturnTuple<'a> = (alloy::sol_types::sol_data::FixedBytes<32>,);
            type ReturnToken<'a> = <Self::ReturnTuple<
                'a,
            > as alloy_sol_types::SolType>::Token<'a>;
            const SIGNATURE: &'static str = "getProposalId(uint64,address,address[])";
            const SELECTOR: [u8; 4] = [184u8, 41u8, 150u8, 111u8];
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
                    <alloy::sol_types::sol_data::Address as alloy_sol_types::SolType>::tokenize(
                        &self.proposer,
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
    ///Container for all the [`Voting`](self) function calls.
    #[derive(serde::Serialize, serde::Deserialize)]
    #[derive()]
    pub enum VotingCalls {
        #[allow(missing_docs)]
        castVote(castVoteCall),
        #[allow(missing_docs)]
        createProposal(createProposalCall),
        #[allow(missing_docs)]
        execute(executeCall),
        #[allow(missing_docs)]
        getProposalId(getProposalIdCall),
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
            [180u8, 176u8, 113u8, 62u8],
            [184u8, 41u8, 150u8, 111u8],
            [207u8, 117u8, 238u8, 42u8],
            [231u8, 81u8, 242u8, 113u8],
        ];
    }
    #[automatically_derived]
    impl alloy_sol_types::SolInterface for VotingCalls {
        const NAME: &'static str = "VotingCalls";
        const MIN_DATA_LENGTH: usize = 32usize;
        const COUNT: usize = 4usize;
        #[inline]
        fn selector(&self) -> [u8; 4] {
            match self {
                Self::castVote(_) => <castVoteCall as alloy_sol_types::SolCall>::SELECTOR,
                Self::createProposal(_) => {
                    <createProposalCall as alloy_sol_types::SolCall>::SELECTOR
                }
                Self::execute(_) => <executeCall as alloy_sol_types::SolCall>::SELECTOR,
                Self::getProposalId(_) => {
                    <getProposalIdCall as alloy_sol_types::SolCall>::SELECTOR
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
            validate: bool,
        ) -> alloy_sol_types::Result<Self> {
            static DECODE_SHIMS: &[fn(
                &[u8],
                bool,
            ) -> alloy_sol_types::Result<VotingCalls>] = &[
                {
                    fn castVote(
                        data: &[u8],
                        validate: bool,
                    ) -> alloy_sol_types::Result<VotingCalls> {
                        <castVoteCall as alloy_sol_types::SolCall>::abi_decode_raw(
                                data,
                                validate,
                            )
                            .map(VotingCalls::castVote)
                    }
                    castVote
                },
                {
                    fn getProposalId(
                        data: &[u8],
                        validate: bool,
                    ) -> alloy_sol_types::Result<VotingCalls> {
                        <getProposalIdCall as alloy_sol_types::SolCall>::abi_decode_raw(
                                data,
                                validate,
                            )
                            .map(VotingCalls::getProposalId)
                    }
                    getProposalId
                },
                {
                    fn createProposal(
                        data: &[u8],
                        validate: bool,
                    ) -> alloy_sol_types::Result<VotingCalls> {
                        <createProposalCall as alloy_sol_types::SolCall>::abi_decode_raw(
                                data,
                                validate,
                            )
                            .map(VotingCalls::createProposal)
                    }
                    createProposal
                },
                {
                    fn execute(
                        data: &[u8],
                        validate: bool,
                    ) -> alloy_sol_types::Result<VotingCalls> {
                        <executeCall as alloy_sol_types::SolCall>::abi_decode_raw(
                                data,
                                validate,
                            )
                            .map(VotingCalls::execute)
                    }
                    execute
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
                Self::castVote(inner) => {
                    <castVoteCall as alloy_sol_types::SolCall>::abi_encoded_size(inner)
                }
                Self::createProposal(inner) => {
                    <createProposalCall as alloy_sol_types::SolCall>::abi_encoded_size(
                        inner,
                    )
                }
                Self::execute(inner) => {
                    <executeCall as alloy_sol_types::SolCall>::abi_encoded_size(inner)
                }
                Self::getProposalId(inner) => {
                    <getProposalIdCall as alloy_sol_types::SolCall>::abi_encoded_size(
                        inner,
                    )
                }
            }
        }
        #[inline]
        fn abi_encode_raw(&self, out: &mut alloy_sol_types::private::Vec<u8>) {
            match self {
                Self::castVote(inner) => {
                    <castVoteCall as alloy_sol_types::SolCall>::abi_encode_raw(
                        inner,
                        out,
                    )
                }
                Self::createProposal(inner) => {
                    <createProposalCall as alloy_sol_types::SolCall>::abi_encode_raw(
                        inner,
                        out,
                    )
                }
                Self::execute(inner) => {
                    <executeCall as alloy_sol_types::SolCall>::abi_encode_raw(inner, out)
                }
                Self::getProposalId(inner) => {
                    <getProposalIdCall as alloy_sol_types::SolCall>::abi_encode_raw(
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
        ProposalCreated(ProposalCreated),
        #[allow(missing_docs)]
        ProposalExecuted(ProposalExecuted),
        #[allow(missing_docs)]
        VoteCast(VoteCast),
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
                123u8, 27u8, 207u8, 28u8, 207u8, 144u8, 26u8, 17u8, 88u8, 154u8, 255u8,
                245u8, 80u8, 77u8, 89u8, 253u8, 10u8, 83u8, 120u8, 14u8, 237u8, 42u8,
                149u8, 42u8, 218u8, 222u8, 3u8, 72u8, 152u8, 81u8, 57u8, 224u8,
            ],
            [
                216u8, 169u8, 92u8, 160u8, 94u8, 154u8, 38u8, 86u8, 254u8, 33u8, 216u8,
                54u8, 50u8, 157u8, 156u8, 215u8, 120u8, 48u8, 231u8, 254u8, 247u8, 172u8,
                183u8, 192u8, 253u8, 59u8, 245u8, 66u8, 30u8, 167u8, 173u8, 154u8,
            ],
            [
                221u8, 29u8, 67u8, 164u8, 21u8, 230u8, 207u8, 80u8, 45u8, 205u8, 123u8,
                51u8, 61u8, 50u8, 15u8, 65u8, 104u8, 41u8, 192u8, 246u8, 164u8, 58u8,
                169u8, 227u8, 45u8, 129u8, 205u8, 154u8, 58u8, 113u8, 71u8, 230u8,
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
                Some(<ProposalCreated as alloy_sol_types::SolEvent>::SIGNATURE_HASH) => {
                    <ProposalCreated as alloy_sol_types::SolEvent>::decode_raw_log(
                            topics,
                            data,
                            validate,
                        )
                        .map(Self::ProposalCreated)
                }
                Some(<ProposalExecuted as alloy_sol_types::SolEvent>::SIGNATURE_HASH) => {
                    <ProposalExecuted as alloy_sol_types::SolEvent>::decode_raw_log(
                            topics,
                            data,
                            validate,
                        )
                        .map(Self::ProposalExecuted)
                }
                Some(<VoteCast as alloy_sol_types::SolEvent>::SIGNATURE_HASH) => {
                    <VoteCast as alloy_sol_types::SolEvent>::decode_raw_log(
                            topics,
                            data,
                            validate,
                        )
                        .map(Self::VoteCast)
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
                Self::ProposalCreated(inner) => {
                    alloy_sol_types::private::IntoLogData::to_log_data(inner)
                }
                Self::ProposalExecuted(inner) => {
                    alloy_sol_types::private::IntoLogData::to_log_data(inner)
                }
                Self::VoteCast(inner) => {
                    alloy_sol_types::private::IntoLogData::to_log_data(inner)
                }
            }
        }
        fn into_log_data(self) -> alloy_sol_types::private::LogData {
            match self {
                Self::ProposalCreated(inner) => {
                    alloy_sol_types::private::IntoLogData::into_log_data(inner)
                }
                Self::ProposalExecuted(inner) => {
                    alloy_sol_types::private::IntoLogData::into_log_data(inner)
                }
                Self::VoteCast(inner) => {
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
        ///Creates a new call builder for the [`castVote`] function.
        pub fn castVote(
            &self,
            proposalId: alloy::sol_types::private::FixedBytes<32>,
            choice: u8,
        ) -> alloy_contract::SolCallBuilder<T, &P, castVoteCall, N> {
            self.call_builder(&castVoteCall { proposalId, choice })
        }
        ///Creates a new call builder for the [`createProposal`] function.
        pub fn createProposal(
            &self,
            deadline: <Time::Timestamp as alloy::sol_types::SolType>::RustType,
            threshold: alloy::sol_types::private::primitives::aliases::U256,
            voters: alloy::sol_types::private::Vec<alloy::sol_types::private::Address>,
            data: alloy::sol_types::private::Bytes,
        ) -> alloy_contract::SolCallBuilder<T, &P, createProposalCall, N> {
            self.call_builder(
                &createProposalCall {
                    deadline,
                    threshold,
                    voters,
                    data,
                },
            )
        }
        ///Creates a new call builder for the [`execute`] function.
        pub fn execute(
            &self,
            proposalId: alloy::sol_types::private::FixedBytes<32>,
        ) -> alloy_contract::SolCallBuilder<T, &P, executeCall, N> {
            self.call_builder(&executeCall { proposalId })
        }
        ///Creates a new call builder for the [`getProposalId`] function.
        pub fn getProposalId(
            &self,
            deadline: <Time::Timestamp as alloy::sol_types::SolType>::RustType,
            proposer: alloy::sol_types::private::Address,
            voters: alloy::sol_types::private::Vec<alloy::sol_types::private::Address>,
        ) -> alloy_contract::SolCallBuilder<T, &P, getProposalIdCall, N> {
            self.call_builder(
                &getProposalIdCall {
                    deadline,
                    proposer,
                    voters,
                },
            )
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
        ///Creates a new event filter for the [`ProposalCreated`] event.
        pub fn ProposalCreated_filter(
            &self,
        ) -> alloy_contract::Event<T, &P, ProposalCreated, N> {
            self.event_filter::<ProposalCreated>()
        }
        ///Creates a new event filter for the [`ProposalExecuted`] event.
        pub fn ProposalExecuted_filter(
            &self,
        ) -> alloy_contract::Event<T, &P, ProposalExecuted, N> {
            self.event_filter::<ProposalExecuted>()
        }
        ///Creates a new event filter for the [`VoteCast`] event.
        pub fn VoteCast_filter(&self) -> alloy_contract::Event<T, &P, VoteCast, N> {
            self.event_filter::<VoteCast>()
        }
    }
}
