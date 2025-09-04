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
    ///0x6080604052348015600e575f5ffd5b506118c18061001c5f395ff3fe608060405234801561000f575f5ffd5b506004361061004a575f3560e01c8063b4b0713e1461004e578063b829966f1461006a578063cf75ee2a1461009a578063e751f271146100ca575b5f5ffd5b61006860048036038101906100639190610c7e565b6100e6565b005b610084600480360381019061007f9190610db4565b6102e5565b6040516100919190610e34565b60405180910390f35b6100b460048036038101906100af9190610ed5565b610343565b6040516100c19190610e34565b60405180910390f35b6100e460048036038101906100df9190610f78565b6105e9565b005b5f5f5f8481526020019081526020015f209050610131815f015f9054906101000a900467ffffffffffffffff1660405180606001604052806037815260200161188a6037913961075a565b6001600281111561014557610144610fa3565b5b816003015f3373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f9054906101000a900460ff1660028111156101a3576101a2610fa3565b5b146101e3576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016101da9061102a565b60405180910390fd5b5f6101fa8433600261078b9092919063ffffffff16565b1461023a576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161023190611092565b60405180910390fd5b610253833360016002610851909392919063ffffffff16565b61029183836040516020016102699291906110bf565b604051602081830303815290604052805190602001206001806109289092919063ffffffff16565b3373ffffffffffffffffffffffffffffffffffffffff16837fd8a95ca05e9a2656fe21d836329d9cd77830e7fef7acb7c0fd3bf5421ea7ad9a846040516102d891906110e6565b60405180910390a3505050565b5f848484846040516020016102fb9291906111b5565b6040516020818303038152906040528051906020012060405160200161032393929190611215565b604051602081830303815290604052805190602001209050949350505050565b5f610383876040518060400160405280601e81526020017f446561646c696e65206d75737420626520696e2074686520667574757265000081525061075a565b5f86116103c5576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016103bc90611294565b60405180910390fd5b5f858590501161040a576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610401906112fc565b60405180910390fd5b5f610417883388886102e5565b90505f5f5f8381526020019081526020015f2090505f816005015414610472576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161046990611364565b60405180910390fd5b88815f015f6101000a81548167ffffffffffffffff021916908367ffffffffffffffff16021790555033816002015f6101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055508686905081600501819055505f5f90505b87879050811015610594576001826003015f8a8a8581811061051357610512611382565b5b905060200201602081019061052891906113af565b73ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f6101000a81548160ff0219169083600281111561058257610581610fa3565b5b021790555080806001019150506104ee565b508867ffffffffffffffff16827fdd1d43a415e6cf502dcd7b333d320f416829c0f6a43aa9e32d81cd9a3a7147e687876040516105d2929190611434565b60405180910390a381925050509695505050505050565b5f5f5f8381526020019081526020015f209050610634815f015f9054906101000a900467ffffffffffffffff1660405180606001604052806024815260200161186660249139610955565b806006015f9054906101000a900460ff1615610685576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161067c906114a0565b60405180910390fd5b5f82600160405160200161069a9291906114f7565b6040516020818303038152906040528051906020012090506107038183600101546040518060400160405280601081526020017f4e6f7420656e6f75676820766f746573000000000000000000000000000000008152506001610986909392919063ffffffff16565b6001826006015f6101000a81548160ff021916908315150217905550610728836109ab565b827f7b1bcf1ccf901a11589afff5504d59fd0a53780eed2a952adade0348985139e060405160405180910390a2505050565b610787610781836107696109ae565b67ffffffffffffffff16610adc90919063ffffffff16565b82610afc565b5050565b5f3273ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff16146107fa576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016107f19061158e565b60405180910390fd5b835f015f8481526020019081526020015f205f8373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205490509392505050565b3273ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff16146108bf576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016108b69061158e565b60405180910390fd5b80845f015f8581526020019081526020015f205f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f82825461091b91906115d9565b9250508190555050505050565b80835f015f8481526020019081526020015f205f82825461094991906115d9565b92505081905550505050565b61098261097c836109646109ae565b67ffffffffffffffff16610bed90919063ffffffff16565b82610afc565b5050565b6109a582855f015f8681526020019081526020015f2054101582610afc565b50505050565b50565b5f5f5f7fba286e4d89dabf4b2878e896423bb123d9d5143e662606fd343b6766d7bcf7215f1c73ffffffffffffffffffffffffffffffffffffffff166040516109f690611639565b5f60405180830381855afa9150503d805f8114610a2e576040519150601f19603f3d011682016040523d82523d5f602084013e610a33565b606091505b509150915081610a78576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610a6f90611697565b60405180910390fd5b6020815114610abc576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610ab3906116ff565b60405180910390fd5b5f81806020019051810190610ad19190611747565b905080935050505090565b5f8167ffffffffffffffff168367ffffffffffffffff1610905092915050565b5f7f3dcdf63b41c103567d7225976ad9145e866c7a7dccc6c277ea86abbd268fbac95f1c73ffffffffffffffffffffffffffffffffffffffff1683604051602001610b47919061178c565b604051602081830303815290604052604051610b6391906117ed565b5f60405180830381855afa9150503d805f8114610b9b576040519150601f19603f3d011682016040523d82523d5f602084013e610ba0565b606091505b50509050808290610be7576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610bde9190611845565b60405180910390fd5b50505050565b5f8167ffffffffffffffff168367ffffffffffffffff1611905092915050565b5f5ffd5b5f5ffd5b5f819050919050565b610c2781610c15565b8114610c31575f5ffd5b50565b5f81359050610c4281610c1e565b92915050565b5f60ff82169050919050565b610c5d81610c48565b8114610c67575f5ffd5b50565b5f81359050610c7881610c54565b92915050565b5f5f60408385031215610c9457610c93610c0d565b5b5f610ca185828601610c34565b9250506020610cb285828601610c6a565b9150509250929050565b5f67ffffffffffffffff82169050919050565b610cd881610cbc565b8114610ce2575f5ffd5b50565b5f81359050610cf381610ccf565b92915050565b5f73ffffffffffffffffffffffffffffffffffffffff82169050919050565b5f610d2282610cf9565b9050919050565b610d3281610d18565b8114610d3c575f5ffd5b50565b5f81359050610d4d81610d29565b92915050565b5f5ffd5b5f5ffd5b5f5ffd5b5f5f83601f840112610d7457610d73610d53565b5b8235905067ffffffffffffffff811115610d9157610d90610d57565b5b602083019150836020820283011115610dad57610dac610d5b565b5b9250929050565b5f5f5f5f60608587031215610dcc57610dcb610c0d565b5b5f610dd987828801610ce5565b9450506020610dea87828801610d3f565b935050604085013567ffffffffffffffff811115610e0b57610e0a610c11565b5b610e1787828801610d5f565b925092505092959194509250565b610e2e81610c15565b82525050565b5f602082019050610e475f830184610e25565b92915050565b5f819050919050565b610e5f81610e4d565b8114610e69575f5ffd5b50565b5f81359050610e7a81610e56565b92915050565b5f5f83601f840112610e9557610e94610d53565b5b8235905067ffffffffffffffff811115610eb257610eb1610d57565b5b602083019150836001820283011115610ece57610ecd610d5b565b5b9250929050565b5f5f5f5f5f5f60808789031215610eef57610eee610c0d565b5b5f610efc89828a01610ce5565b9650506020610f0d89828a01610e6c565b955050604087013567ffffffffffffffff811115610f2e57610f2d610c11565b5b610f3a89828a01610d5f565b9450945050606087013567ffffffffffffffff811115610f5d57610f5c610c11565b5b610f6989828a01610e80565b92509250509295509295509295565b5f60208284031215610f8d57610f8c610c0d565b5b5f610f9a84828501610c34565b91505092915050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52602160045260245ffd5b5f82825260208201905092915050565b7f73656e646572206e6f74206120766f74657200000000000000000000000000005f82015250565b5f611014601283610fd0565b915061101f82610fe0565b602082019050919050565b5f6020820190508181035f83015261104181611008565b9050919050565b7f616c726561647920766f746564000000000000000000000000000000000000005f82015250565b5f61107c600d83610fd0565b915061108782611048565b602082019050919050565b5f6020820190508181035f8301526110a981611070565b9050919050565b6110b981610c48565b82525050565b5f6040820190506110d25f830185610e25565b6110df60208301846110b0565b9392505050565b5f6020820190506110f95f8301846110b0565b92915050565b5f81905092915050565b5f819050919050565b61111b81610d18565b82525050565b5f61112c8383611112565b60208301905092915050565b5f6111466020840184610d3f565b905092915050565b5f602082019050919050565b5f61116583856110ff565b935061117082611109565b805f5b858110156111a8576111858284611138565b61118f8882611121565b975061119a8361114e565b925050600181019050611173565b5085925050509392505050565b5f6111c182848661115a565b91508190509392505050565b5f819050919050565b5f6111f06111eb6111e684610cbc565b6111cd565b610cbc565b9050919050565b611200816111d6565b82525050565b61120f81610d18565b82525050565b5f6060820190506112285f8301866111f7565b6112356020830185611206565b6112426040830184610e25565b949350505050565b7f5468726573686f6c642073686f756c64206e6f742062652030000000000000005f82015250565b5f61127e601983610fd0565b91506112898261124a565b602082019050919050565b5f6020820190508181035f8301526112ab81611272565b9050919050565b7f5468657265206d757374206265206174206c65617374206f6e6520766f7465725f82015250565b5f6112e6602083610fd0565b91506112f1826112b2565b602082019050919050565b5f6020820190508181035f830152611313816112da565b9050919050565b7f70726f706f73616c20616c7265616479206578697374730000000000000000005f82015250565b5f61134e601783610fd0565b91506113598261131a565b602082019050919050565b5f6020820190508181035f83015261137b81611342565b9050919050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52603260045260245ffd5b5f602082840312156113c4576113c3610c0d565b5b5f6113d184828501610d3f565b91505092915050565b5f82825260208201905092915050565b828183375f83830152505050565b5f601f19601f8301169050919050565b5f61141383856113da565b93506114208385846113ea565b611429836113f8565b840190509392505050565b5f6020820190508181035f83015261144d818486611408565b90509392505050565b7f50726f706f73616c20616c7265616479206578656375746564000000000000005f82015250565b5f61148a601983610fd0565b915061149582611456565b602082019050919050565b5f6020820190508181035f8301526114b78161147e565b9050919050565b5f819050919050565b5f6114e16114dc6114d7846114be565b6111cd565b610c48565b9050919050565b6114f1816114c7565b82525050565b5f60408201905061150a5f830185610e25565b61151760208301846114e8565b9392505050565b7f43616e6e6f7420616363657373204f776e6564436f756e746572206f776e65645f8201527f20627920616e6f74686572206164647265737300000000000000000000000000602082015250565b5f611578603383610fd0565b91506115838261151e565b604082019050919050565b5f6020820190508181035f8301526115a58161156c565b9050919050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b5f6115e382610e4d565b91506115ee83610e4d565b9250828201905080821115611606576116056115ac565b5b92915050565b5f81905092915050565b50565b5f6116245f8361160c565b915061162f82611616565b5f82019050919050565b5f61164382611619565b9150819050919050565b7f507265636f6d70696c652063616c6c206661696c6564000000000000000000005f82015250565b5f611681601683610fd0565b915061168c8261164d565b602082019050919050565b5f6020820190508181035f8301526116ae81611675565b9050919050565b7f496e76616c6964206f7574707574206c656e67746800000000000000000000005f82015250565b5f6116e9601583610fd0565b91506116f4826116b5565b602082019050919050565b5f6020820190508181035f830152611716816116dd565b9050919050565b61172681610cbc565b8114611730575f5ffd5b50565b5f815190506117418161171d565b92915050565b5f6020828403121561175c5761175b610c0d565b5b5f61176984828501611733565b91505092915050565b5f8115159050919050565b61178681611772565b82525050565b5f60208201905061179f5f83018461177d565b92915050565b5f81519050919050565b8281835e5f83830152505050565b5f6117c7826117a5565b6117d1818561160c565b93506117e18185602086016117af565b80840191505092915050565b5f6117f882846117bd565b915081905092915050565b5f81519050919050565b5f61181782611803565b6118218185610fd0565b93506118318185602086016117af565b61183a816113f8565b840191505092915050565b5f6020820190508181035f83015261185d818461180d565b90509291505056fe50726f706f73616c20646561646c696e6520686173206e6f74207061737365642079657450726f706f73616c20646561646c696e652068617320706173736564206f722070726f706f73616c20646f6573206e6f74206578697374
    /// ```
    #[rustfmt::skip]
    #[allow(clippy::all)]
    pub static BYTECODE: alloy_sol_types::private::Bytes = alloy_sol_types::private::Bytes::from_static(
        b"`\x80`@R4\x80\x15`\x0EW__\xFD[Pa\x18\xC1\x80a\0\x1C_9_\xF3\xFE`\x80`@R4\x80\x15a\0\x0FW__\xFD[P`\x046\x10a\0JW_5`\xE0\x1C\x80c\xB4\xB0q>\x14a\0NW\x80c\xB8)\x96o\x14a\0jW\x80c\xCFu\xEE*\x14a\0\x9AW\x80c\xE7Q\xF2q\x14a\0\xCAW[__\xFD[a\0h`\x04\x806\x03\x81\x01\x90a\0c\x91\x90a\x0C~V[a\0\xE6V[\0[a\0\x84`\x04\x806\x03\x81\x01\x90a\0\x7F\x91\x90a\r\xB4V[a\x02\xE5V[`@Qa\0\x91\x91\x90a\x0E4V[`@Q\x80\x91\x03\x90\xF3[a\0\xB4`\x04\x806\x03\x81\x01\x90a\0\xAF\x91\x90a\x0E\xD5V[a\x03CV[`@Qa\0\xC1\x91\x90a\x0E4V[`@Q\x80\x91\x03\x90\xF3[a\0\xE4`\x04\x806\x03\x81\x01\x90a\0\xDF\x91\x90a\x0FxV[a\x05\xE9V[\0[___\x84\x81R` \x01\x90\x81R` \x01_ \x90Pa\x011\x81_\x01_\x90T\x90a\x01\0\n\x90\x04g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16`@Q\x80``\x01`@R\x80`7\x81R` \x01a\x18\x8A`7\x919a\x07ZV[`\x01`\x02\x81\x11\x15a\x01EWa\x01Da\x0F\xA3V[[\x81`\x03\x01_3s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x81R` \x01\x90\x81R` \x01_ _\x90T\x90a\x01\0\n\x90\x04`\xFF\x16`\x02\x81\x11\x15a\x01\xA3Wa\x01\xA2a\x0F\xA3V[[\x14a\x01\xE3W`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x01\xDA\x90a\x10*V[`@Q\x80\x91\x03\x90\xFD[_a\x01\xFA\x843`\x02a\x07\x8B\x90\x92\x91\x90c\xFF\xFF\xFF\xFF\x16V[\x14a\x02:W`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x021\x90a\x10\x92V[`@Q\x80\x91\x03\x90\xFD[a\x02S\x833`\x01`\x02a\x08Q\x90\x93\x92\x91\x90c\xFF\xFF\xFF\xFF\x16V[a\x02\x91\x83\x83`@Q` \x01a\x02i\x92\x91\x90a\x10\xBFV[`@Q` \x81\x83\x03\x03\x81R\x90`@R\x80Q\x90` \x01 `\x01\x80a\t(\x90\x92\x91\x90c\xFF\xFF\xFF\xFF\x16V[3s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83\x7F\xD8\xA9\\\xA0^\x9A&V\xFE!\xD862\x9D\x9C\xD7x0\xE7\xFE\xF7\xAC\xB7\xC0\xFD;\xF5B\x1E\xA7\xAD\x9A\x84`@Qa\x02\xD8\x91\x90a\x10\xE6V[`@Q\x80\x91\x03\x90\xA3PPPV[_\x84\x84\x84\x84`@Q` \x01a\x02\xFB\x92\x91\x90a\x11\xB5V[`@Q` \x81\x83\x03\x03\x81R\x90`@R\x80Q\x90` \x01 `@Q` \x01a\x03#\x93\x92\x91\x90a\x12\x15V[`@Q` \x81\x83\x03\x03\x81R\x90`@R\x80Q\x90` \x01 \x90P\x94\x93PPPPV[_a\x03\x83\x87`@Q\x80`@\x01`@R\x80`\x1E\x81R` \x01\x7FDeadline must be in the future\0\0\x81RPa\x07ZV[_\x86\x11a\x03\xC5W`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x03\xBC\x90a\x12\x94V[`@Q\x80\x91\x03\x90\xFD[_\x85\x85\x90P\x11a\x04\nW`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x04\x01\x90a\x12\xFCV[`@Q\x80\x91\x03\x90\xFD[_a\x04\x17\x883\x88\x88a\x02\xE5V[\x90P___\x83\x81R` \x01\x90\x81R` \x01_ \x90P_\x81`\x05\x01T\x14a\x04rW`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x04i\x90a\x13dV[`@Q\x80\x91\x03\x90\xFD[\x88\x81_\x01_a\x01\0\n\x81T\x81g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x02\x19\x16\x90\x83g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x02\x17\x90UP3\x81`\x02\x01_a\x01\0\n\x81T\x81s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x02\x19\x16\x90\x83s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x02\x17\x90UP\x86\x86\x90P\x81`\x05\x01\x81\x90UP__\x90P[\x87\x87\x90P\x81\x10\x15a\x05\x94W`\x01\x82`\x03\x01_\x8A\x8A\x85\x81\x81\x10a\x05\x13Wa\x05\x12a\x13\x82V[[\x90P` \x02\x01` \x81\x01\x90a\x05(\x91\x90a\x13\xAFV[s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x81R` \x01\x90\x81R` \x01_ _a\x01\0\n\x81T\x81`\xFF\x02\x19\x16\x90\x83`\x02\x81\x11\x15a\x05\x82Wa\x05\x81a\x0F\xA3V[[\x02\x17\x90UP\x80\x80`\x01\x01\x91PPa\x04\xEEV[P\x88g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x82\x7F\xDD\x1DC\xA4\x15\xE6\xCFP-\xCD{3=2\x0FAh)\xC0\xF6\xA4:\xA9\xE3-\x81\xCD\x9A:qG\xE6\x87\x87`@Qa\x05\xD2\x92\x91\x90a\x144V[`@Q\x80\x91\x03\x90\xA3\x81\x92PPP\x96\x95PPPPPPV[___\x83\x81R` \x01\x90\x81R` \x01_ \x90Pa\x064\x81_\x01_\x90T\x90a\x01\0\n\x90\x04g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16`@Q\x80``\x01`@R\x80`$\x81R` \x01a\x18f`$\x919a\tUV[\x80`\x06\x01_\x90T\x90a\x01\0\n\x90\x04`\xFF\x16\x15a\x06\x85W`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x06|\x90a\x14\xA0V[`@Q\x80\x91\x03\x90\xFD[_\x82`\x01`@Q` \x01a\x06\x9A\x92\x91\x90a\x14\xF7V[`@Q` \x81\x83\x03\x03\x81R\x90`@R\x80Q\x90` \x01 \x90Pa\x07\x03\x81\x83`\x01\x01T`@Q\x80`@\x01`@R\x80`\x10\x81R` \x01\x7FNot enough votes\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81RP`\x01a\t\x86\x90\x93\x92\x91\x90c\xFF\xFF\xFF\xFF\x16V[`\x01\x82`\x06\x01_a\x01\0\n\x81T\x81`\xFF\x02\x19\x16\x90\x83\x15\x15\x02\x17\x90UPa\x07(\x83a\t\xABV[\x82\x7F{\x1B\xCF\x1C\xCF\x90\x1A\x11X\x9A\xFF\xF5PMY\xFD\nSx\x0E\xED*\x95*\xDA\xDE\x03H\x98Q9\xE0`@Q`@Q\x80\x91\x03\x90\xA2PPPV[a\x07\x87a\x07\x81\x83a\x07ia\t\xAEV[g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16a\n\xDC\x90\x91\x90c\xFF\xFF\xFF\xFF\x16V[\x82a\n\xFCV[PPV[_2s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x82s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x14a\x07\xFAW`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x07\xF1\x90a\x15\x8EV[`@Q\x80\x91\x03\x90\xFD[\x83_\x01_\x84\x81R` \x01\x90\x81R` \x01_ _\x83s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x81R` \x01\x90\x81R` \x01_ T\x90P\x93\x92PPPV[2s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x82s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x14a\x08\xBFW`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x08\xB6\x90a\x15\x8EV[`@Q\x80\x91\x03\x90\xFD[\x80\x84_\x01_\x85\x81R` \x01\x90\x81R` \x01_ _\x84s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x81R` \x01\x90\x81R` \x01_ _\x82\x82Ta\t\x1B\x91\x90a\x15\xD9V[\x92PP\x81\x90UPPPPPV[\x80\x83_\x01_\x84\x81R` \x01\x90\x81R` \x01_ _\x82\x82Ta\tI\x91\x90a\x15\xD9V[\x92PP\x81\x90UPPPPV[a\t\x82a\t|\x83a\tda\t\xAEV[g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16a\x0B\xED\x90\x91\x90c\xFF\xFF\xFF\xFF\x16V[\x82a\n\xFCV[PPV[a\t\xA5\x82\x85_\x01_\x86\x81R` \x01\x90\x81R` \x01_ T\x10\x15\x82a\n\xFCV[PPPPV[PV[___\x7F\xBA(nM\x89\xDA\xBFK(x\xE8\x96B;\xB1#\xD9\xD5\x14>f&\x06\xFD4;gf\xD7\xBC\xF7!_\x1Cs\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16`@Qa\t\xF6\x90a\x169V[_`@Q\x80\x83\x03\x81\x85Z\xFA\x91PP=\x80_\x81\x14a\n.W`@Q\x91P`\x1F\x19`?=\x01\x16\x82\x01`@R=\x82R=_` \x84\x01>a\n3V[``\x91P[P\x91P\x91P\x81a\nxW`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\no\x90a\x16\x97V[`@Q\x80\x91\x03\x90\xFD[` \x81Q\x14a\n\xBCW`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\n\xB3\x90a\x16\xFFV[`@Q\x80\x91\x03\x90\xFD[_\x81\x80` \x01\x90Q\x81\x01\x90a\n\xD1\x91\x90a\x17GV[\x90P\x80\x93PPPP\x90V[_\x81g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x10\x90P\x92\x91PPV[_\x7F=\xCD\xF6;A\xC1\x03V}r%\x97j\xD9\x14^\x86lz}\xCC\xC6\xC2w\xEA\x86\xAB\xBD&\x8F\xBA\xC9_\x1Cs\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83`@Q` \x01a\x0BG\x91\x90a\x17\x8CV[`@Q` \x81\x83\x03\x03\x81R\x90`@R`@Qa\x0Bc\x91\x90a\x17\xEDV[_`@Q\x80\x83\x03\x81\x85Z\xFA\x91PP=\x80_\x81\x14a\x0B\x9BW`@Q\x91P`\x1F\x19`?=\x01\x16\x82\x01`@R=\x82R=_` \x84\x01>a\x0B\xA0V[``\x91P[PP\x90P\x80\x82\x90a\x0B\xE7W`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x0B\xDE\x91\x90a\x18EV[`@Q\x80\x91\x03\x90\xFD[PPPPV[_\x81g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x11\x90P\x92\x91PPV[__\xFD[__\xFD[_\x81\x90P\x91\x90PV[a\x0C'\x81a\x0C\x15V[\x81\x14a\x0C1W__\xFD[PV[_\x815\x90Pa\x0CB\x81a\x0C\x1EV[\x92\x91PPV[_`\xFF\x82\x16\x90P\x91\x90PV[a\x0C]\x81a\x0CHV[\x81\x14a\x0CgW__\xFD[PV[_\x815\x90Pa\x0Cx\x81a\x0CTV[\x92\x91PPV[__`@\x83\x85\x03\x12\x15a\x0C\x94Wa\x0C\x93a\x0C\rV[[_a\x0C\xA1\x85\x82\x86\x01a\x0C4V[\x92PP` a\x0C\xB2\x85\x82\x86\x01a\x0CjV[\x91PP\x92P\x92\x90PV[_g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x82\x16\x90P\x91\x90PV[a\x0C\xD8\x81a\x0C\xBCV[\x81\x14a\x0C\xE2W__\xFD[PV[_\x815\x90Pa\x0C\xF3\x81a\x0C\xCFV[\x92\x91PPV[_s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x82\x16\x90P\x91\x90PV[_a\r\"\x82a\x0C\xF9V[\x90P\x91\x90PV[a\r2\x81a\r\x18V[\x81\x14a\r<W__\xFD[PV[_\x815\x90Pa\rM\x81a\r)V[\x92\x91PPV[__\xFD[__\xFD[__\xFD[__\x83`\x1F\x84\x01\x12a\rtWa\rsa\rSV[[\x825\x90Pg\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x81\x11\x15a\r\x91Wa\r\x90a\rWV[[` \x83\x01\x91P\x83` \x82\x02\x83\x01\x11\x15a\r\xADWa\r\xACa\r[V[[\x92P\x92\x90PV[____``\x85\x87\x03\x12\x15a\r\xCCWa\r\xCBa\x0C\rV[[_a\r\xD9\x87\x82\x88\x01a\x0C\xE5V[\x94PP` a\r\xEA\x87\x82\x88\x01a\r?V[\x93PP`@\x85\x015g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x81\x11\x15a\x0E\x0BWa\x0E\na\x0C\x11V[[a\x0E\x17\x87\x82\x88\x01a\r_V[\x92P\x92PP\x92\x95\x91\x94P\x92PV[a\x0E.\x81a\x0C\x15V[\x82RPPV[_` \x82\x01\x90Pa\x0EG_\x83\x01\x84a\x0E%V[\x92\x91PPV[_\x81\x90P\x91\x90PV[a\x0E_\x81a\x0EMV[\x81\x14a\x0EiW__\xFD[PV[_\x815\x90Pa\x0Ez\x81a\x0EVV[\x92\x91PPV[__\x83`\x1F\x84\x01\x12a\x0E\x95Wa\x0E\x94a\rSV[[\x825\x90Pg\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x81\x11\x15a\x0E\xB2Wa\x0E\xB1a\rWV[[` \x83\x01\x91P\x83`\x01\x82\x02\x83\x01\x11\x15a\x0E\xCEWa\x0E\xCDa\r[V[[\x92P\x92\x90PV[______`\x80\x87\x89\x03\x12\x15a\x0E\xEFWa\x0E\xEEa\x0C\rV[[_a\x0E\xFC\x89\x82\x8A\x01a\x0C\xE5V[\x96PP` a\x0F\r\x89\x82\x8A\x01a\x0ElV[\x95PP`@\x87\x015g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x81\x11\x15a\x0F.Wa\x0F-a\x0C\x11V[[a\x0F:\x89\x82\x8A\x01a\r_V[\x94P\x94PP``\x87\x015g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x81\x11\x15a\x0F]Wa\x0F\\a\x0C\x11V[[a\x0Fi\x89\x82\x8A\x01a\x0E\x80V[\x92P\x92PP\x92\x95P\x92\x95P\x92\x95V[_` \x82\x84\x03\x12\x15a\x0F\x8DWa\x0F\x8Ca\x0C\rV[[_a\x0F\x9A\x84\x82\x85\x01a\x0C4V[\x91PP\x92\x91PPV[\x7FNH{q\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0_R`!`\x04R`$_\xFD[_\x82\x82R` \x82\x01\x90P\x92\x91PPV[\x7Fsender not a voter\0\0\0\0\0\0\0\0\0\0\0\0\0\0_\x82\x01RPV[_a\x10\x14`\x12\x83a\x0F\xD0V[\x91Pa\x10\x1F\x82a\x0F\xE0V[` \x82\x01\x90P\x91\x90PV[_` \x82\x01\x90P\x81\x81\x03_\x83\x01Ra\x10A\x81a\x10\x08V[\x90P\x91\x90PV[\x7Falready voted\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0_\x82\x01RPV[_a\x10|`\r\x83a\x0F\xD0V[\x91Pa\x10\x87\x82a\x10HV[` \x82\x01\x90P\x91\x90PV[_` \x82\x01\x90P\x81\x81\x03_\x83\x01Ra\x10\xA9\x81a\x10pV[\x90P\x91\x90PV[a\x10\xB9\x81a\x0CHV[\x82RPPV[_`@\x82\x01\x90Pa\x10\xD2_\x83\x01\x85a\x0E%V[a\x10\xDF` \x83\x01\x84a\x10\xB0V[\x93\x92PPPV[_` \x82\x01\x90Pa\x10\xF9_\x83\x01\x84a\x10\xB0V[\x92\x91PPV[_\x81\x90P\x92\x91PPV[_\x81\x90P\x91\x90PV[a\x11\x1B\x81a\r\x18V[\x82RPPV[_a\x11,\x83\x83a\x11\x12V[` \x83\x01\x90P\x92\x91PPV[_a\x11F` \x84\x01\x84a\r?V[\x90P\x92\x91PPV[_` \x82\x01\x90P\x91\x90PV[_a\x11e\x83\x85a\x10\xFFV[\x93Pa\x11p\x82a\x11\tV[\x80_[\x85\x81\x10\x15a\x11\xA8Wa\x11\x85\x82\x84a\x118V[a\x11\x8F\x88\x82a\x11!V[\x97Pa\x11\x9A\x83a\x11NV[\x92PP`\x01\x81\x01\x90Pa\x11sV[P\x85\x92PPP\x93\x92PPPV[_a\x11\xC1\x82\x84\x86a\x11ZV[\x91P\x81\x90P\x93\x92PPPV[_\x81\x90P\x91\x90PV[_a\x11\xF0a\x11\xEBa\x11\xE6\x84a\x0C\xBCV[a\x11\xCDV[a\x0C\xBCV[\x90P\x91\x90PV[a\x12\0\x81a\x11\xD6V[\x82RPPV[a\x12\x0F\x81a\r\x18V[\x82RPPV[_``\x82\x01\x90Pa\x12(_\x83\x01\x86a\x11\xF7V[a\x125` \x83\x01\x85a\x12\x06V[a\x12B`@\x83\x01\x84a\x0E%V[\x94\x93PPPPV[\x7FThreshold should not be 0\0\0\0\0\0\0\0_\x82\x01RPV[_a\x12~`\x19\x83a\x0F\xD0V[\x91Pa\x12\x89\x82a\x12JV[` \x82\x01\x90P\x91\x90PV[_` \x82\x01\x90P\x81\x81\x03_\x83\x01Ra\x12\xAB\x81a\x12rV[\x90P\x91\x90PV[\x7FThere must be at least one voter_\x82\x01RPV[_a\x12\xE6` \x83a\x0F\xD0V[\x91Pa\x12\xF1\x82a\x12\xB2V[` \x82\x01\x90P\x91\x90PV[_` \x82\x01\x90P\x81\x81\x03_\x83\x01Ra\x13\x13\x81a\x12\xDAV[\x90P\x91\x90PV[\x7Fproposal already exists\0\0\0\0\0\0\0\0\0_\x82\x01RPV[_a\x13N`\x17\x83a\x0F\xD0V[\x91Pa\x13Y\x82a\x13\x1AV[` \x82\x01\x90P\x91\x90PV[_` \x82\x01\x90P\x81\x81\x03_\x83\x01Ra\x13{\x81a\x13BV[\x90P\x91\x90PV[\x7FNH{q\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0_R`2`\x04R`$_\xFD[_` \x82\x84\x03\x12\x15a\x13\xC4Wa\x13\xC3a\x0C\rV[[_a\x13\xD1\x84\x82\x85\x01a\r?V[\x91PP\x92\x91PPV[_\x82\x82R` \x82\x01\x90P\x92\x91PPV[\x82\x81\x837_\x83\x83\x01RPPPV[_`\x1F\x19`\x1F\x83\x01\x16\x90P\x91\x90PV[_a\x14\x13\x83\x85a\x13\xDAV[\x93Pa\x14 \x83\x85\x84a\x13\xEAV[a\x14)\x83a\x13\xF8V[\x84\x01\x90P\x93\x92PPPV[_` \x82\x01\x90P\x81\x81\x03_\x83\x01Ra\x14M\x81\x84\x86a\x14\x08V[\x90P\x93\x92PPPV[\x7FProposal already executed\0\0\0\0\0\0\0_\x82\x01RPV[_a\x14\x8A`\x19\x83a\x0F\xD0V[\x91Pa\x14\x95\x82a\x14VV[` \x82\x01\x90P\x91\x90PV[_` \x82\x01\x90P\x81\x81\x03_\x83\x01Ra\x14\xB7\x81a\x14~V[\x90P\x91\x90PV[_\x81\x90P\x91\x90PV[_a\x14\xE1a\x14\xDCa\x14\xD7\x84a\x14\xBEV[a\x11\xCDV[a\x0CHV[\x90P\x91\x90PV[a\x14\xF1\x81a\x14\xC7V[\x82RPPV[_`@\x82\x01\x90Pa\x15\n_\x83\x01\x85a\x0E%V[a\x15\x17` \x83\x01\x84a\x14\xE8V[\x93\x92PPPV[\x7FCannot access OwnedCounter owned_\x82\x01R\x7F by another address\0\0\0\0\0\0\0\0\0\0\0\0\0` \x82\x01RPV[_a\x15x`3\x83a\x0F\xD0V[\x91Pa\x15\x83\x82a\x15\x1EV[`@\x82\x01\x90P\x91\x90PV[_` \x82\x01\x90P\x81\x81\x03_\x83\x01Ra\x15\xA5\x81a\x15lV[\x90P\x91\x90PV[\x7FNH{q\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0_R`\x11`\x04R`$_\xFD[_a\x15\xE3\x82a\x0EMV[\x91Pa\x15\xEE\x83a\x0EMV[\x92P\x82\x82\x01\x90P\x80\x82\x11\x15a\x16\x06Wa\x16\x05a\x15\xACV[[\x92\x91PPV[_\x81\x90P\x92\x91PPV[PV[_a\x16$_\x83a\x16\x0CV[\x91Pa\x16/\x82a\x16\x16V[_\x82\x01\x90P\x91\x90PV[_a\x16C\x82a\x16\x19V[\x91P\x81\x90P\x91\x90PV[\x7FPrecompile call failed\0\0\0\0\0\0\0\0\0\0_\x82\x01RPV[_a\x16\x81`\x16\x83a\x0F\xD0V[\x91Pa\x16\x8C\x82a\x16MV[` \x82\x01\x90P\x91\x90PV[_` \x82\x01\x90P\x81\x81\x03_\x83\x01Ra\x16\xAE\x81a\x16uV[\x90P\x91\x90PV[\x7FInvalid output length\0\0\0\0\0\0\0\0\0\0\0_\x82\x01RPV[_a\x16\xE9`\x15\x83a\x0F\xD0V[\x91Pa\x16\xF4\x82a\x16\xB5V[` \x82\x01\x90P\x91\x90PV[_` \x82\x01\x90P\x81\x81\x03_\x83\x01Ra\x17\x16\x81a\x16\xDDV[\x90P\x91\x90PV[a\x17&\x81a\x0C\xBCV[\x81\x14a\x170W__\xFD[PV[_\x81Q\x90Pa\x17A\x81a\x17\x1DV[\x92\x91PPV[_` \x82\x84\x03\x12\x15a\x17\\Wa\x17[a\x0C\rV[[_a\x17i\x84\x82\x85\x01a\x173V[\x91PP\x92\x91PPV[_\x81\x15\x15\x90P\x91\x90PV[a\x17\x86\x81a\x17rV[\x82RPPV[_` \x82\x01\x90Pa\x17\x9F_\x83\x01\x84a\x17}V[\x92\x91PPV[_\x81Q\x90P\x91\x90PV[\x82\x81\x83^_\x83\x83\x01RPPPV[_a\x17\xC7\x82a\x17\xA5V[a\x17\xD1\x81\x85a\x16\x0CV[\x93Pa\x17\xE1\x81\x85` \x86\x01a\x17\xAFV[\x80\x84\x01\x91PP\x92\x91PPV[_a\x17\xF8\x82\x84a\x17\xBDV[\x91P\x81\x90P\x92\x91PPV[_\x81Q\x90P\x91\x90PV[_a\x18\x17\x82a\x18\x03V[a\x18!\x81\x85a\x0F\xD0V[\x93Pa\x181\x81\x85` \x86\x01a\x17\xAFV[a\x18:\x81a\x13\xF8V[\x84\x01\x91PP\x92\x91PPV[_` \x82\x01\x90P\x81\x81\x03_\x83\x01Ra\x18]\x81\x84a\x18\rV[\x90P\x92\x91PPV\xFEProposal deadline has not passed yetProposal deadline has passed or proposal does not exist",
    );
    /// The runtime bytecode of the contract, as deployed on the network.
    ///
    /// ```text
    ///0x608060405234801561000f575f5ffd5b506004361061004a575f3560e01c8063b4b0713e1461004e578063b829966f1461006a578063cf75ee2a1461009a578063e751f271146100ca575b5f5ffd5b61006860048036038101906100639190610c7e565b6100e6565b005b610084600480360381019061007f9190610db4565b6102e5565b6040516100919190610e34565b60405180910390f35b6100b460048036038101906100af9190610ed5565b610343565b6040516100c19190610e34565b60405180910390f35b6100e460048036038101906100df9190610f78565b6105e9565b005b5f5f5f8481526020019081526020015f209050610131815f015f9054906101000a900467ffffffffffffffff1660405180606001604052806037815260200161188a6037913961075a565b6001600281111561014557610144610fa3565b5b816003015f3373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f9054906101000a900460ff1660028111156101a3576101a2610fa3565b5b146101e3576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016101da9061102a565b60405180910390fd5b5f6101fa8433600261078b9092919063ffffffff16565b1461023a576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161023190611092565b60405180910390fd5b610253833360016002610851909392919063ffffffff16565b61029183836040516020016102699291906110bf565b604051602081830303815290604052805190602001206001806109289092919063ffffffff16565b3373ffffffffffffffffffffffffffffffffffffffff16837fd8a95ca05e9a2656fe21d836329d9cd77830e7fef7acb7c0fd3bf5421ea7ad9a846040516102d891906110e6565b60405180910390a3505050565b5f848484846040516020016102fb9291906111b5565b6040516020818303038152906040528051906020012060405160200161032393929190611215565b604051602081830303815290604052805190602001209050949350505050565b5f610383876040518060400160405280601e81526020017f446561646c696e65206d75737420626520696e2074686520667574757265000081525061075a565b5f86116103c5576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016103bc90611294565b60405180910390fd5b5f858590501161040a576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610401906112fc565b60405180910390fd5b5f610417883388886102e5565b90505f5f5f8381526020019081526020015f2090505f816005015414610472576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161046990611364565b60405180910390fd5b88815f015f6101000a81548167ffffffffffffffff021916908367ffffffffffffffff16021790555033816002015f6101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055508686905081600501819055505f5f90505b87879050811015610594576001826003015f8a8a8581811061051357610512611382565b5b905060200201602081019061052891906113af565b73ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f6101000a81548160ff0219169083600281111561058257610581610fa3565b5b021790555080806001019150506104ee565b508867ffffffffffffffff16827fdd1d43a415e6cf502dcd7b333d320f416829c0f6a43aa9e32d81cd9a3a7147e687876040516105d2929190611434565b60405180910390a381925050509695505050505050565b5f5f5f8381526020019081526020015f209050610634815f015f9054906101000a900467ffffffffffffffff1660405180606001604052806024815260200161186660249139610955565b806006015f9054906101000a900460ff1615610685576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161067c906114a0565b60405180910390fd5b5f82600160405160200161069a9291906114f7565b6040516020818303038152906040528051906020012090506107038183600101546040518060400160405280601081526020017f4e6f7420656e6f75676820766f746573000000000000000000000000000000008152506001610986909392919063ffffffff16565b6001826006015f6101000a81548160ff021916908315150217905550610728836109ab565b827f7b1bcf1ccf901a11589afff5504d59fd0a53780eed2a952adade0348985139e060405160405180910390a2505050565b610787610781836107696109ae565b67ffffffffffffffff16610adc90919063ffffffff16565b82610afc565b5050565b5f3273ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff16146107fa576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016107f19061158e565b60405180910390fd5b835f015f8481526020019081526020015f205f8373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205490509392505050565b3273ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff16146108bf576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016108b69061158e565b60405180910390fd5b80845f015f8581526020019081526020015f205f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f82825461091b91906115d9565b9250508190555050505050565b80835f015f8481526020019081526020015f205f82825461094991906115d9565b92505081905550505050565b61098261097c836109646109ae565b67ffffffffffffffff16610bed90919063ffffffff16565b82610afc565b5050565b6109a582855f015f8681526020019081526020015f2054101582610afc565b50505050565b50565b5f5f5f7fba286e4d89dabf4b2878e896423bb123d9d5143e662606fd343b6766d7bcf7215f1c73ffffffffffffffffffffffffffffffffffffffff166040516109f690611639565b5f60405180830381855afa9150503d805f8114610a2e576040519150601f19603f3d011682016040523d82523d5f602084013e610a33565b606091505b509150915081610a78576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610a6f90611697565b60405180910390fd5b6020815114610abc576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610ab3906116ff565b60405180910390fd5b5f81806020019051810190610ad19190611747565b905080935050505090565b5f8167ffffffffffffffff168367ffffffffffffffff1610905092915050565b5f7f3dcdf63b41c103567d7225976ad9145e866c7a7dccc6c277ea86abbd268fbac95f1c73ffffffffffffffffffffffffffffffffffffffff1683604051602001610b47919061178c565b604051602081830303815290604052604051610b6391906117ed565b5f60405180830381855afa9150503d805f8114610b9b576040519150601f19603f3d011682016040523d82523d5f602084013e610ba0565b606091505b50509050808290610be7576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610bde9190611845565b60405180910390fd5b50505050565b5f8167ffffffffffffffff168367ffffffffffffffff1611905092915050565b5f5ffd5b5f5ffd5b5f819050919050565b610c2781610c15565b8114610c31575f5ffd5b50565b5f81359050610c4281610c1e565b92915050565b5f60ff82169050919050565b610c5d81610c48565b8114610c67575f5ffd5b50565b5f81359050610c7881610c54565b92915050565b5f5f60408385031215610c9457610c93610c0d565b5b5f610ca185828601610c34565b9250506020610cb285828601610c6a565b9150509250929050565b5f67ffffffffffffffff82169050919050565b610cd881610cbc565b8114610ce2575f5ffd5b50565b5f81359050610cf381610ccf565b92915050565b5f73ffffffffffffffffffffffffffffffffffffffff82169050919050565b5f610d2282610cf9565b9050919050565b610d3281610d18565b8114610d3c575f5ffd5b50565b5f81359050610d4d81610d29565b92915050565b5f5ffd5b5f5ffd5b5f5ffd5b5f5f83601f840112610d7457610d73610d53565b5b8235905067ffffffffffffffff811115610d9157610d90610d57565b5b602083019150836020820283011115610dad57610dac610d5b565b5b9250929050565b5f5f5f5f60608587031215610dcc57610dcb610c0d565b5b5f610dd987828801610ce5565b9450506020610dea87828801610d3f565b935050604085013567ffffffffffffffff811115610e0b57610e0a610c11565b5b610e1787828801610d5f565b925092505092959194509250565b610e2e81610c15565b82525050565b5f602082019050610e475f830184610e25565b92915050565b5f819050919050565b610e5f81610e4d565b8114610e69575f5ffd5b50565b5f81359050610e7a81610e56565b92915050565b5f5f83601f840112610e9557610e94610d53565b5b8235905067ffffffffffffffff811115610eb257610eb1610d57565b5b602083019150836001820283011115610ece57610ecd610d5b565b5b9250929050565b5f5f5f5f5f5f60808789031215610eef57610eee610c0d565b5b5f610efc89828a01610ce5565b9650506020610f0d89828a01610e6c565b955050604087013567ffffffffffffffff811115610f2e57610f2d610c11565b5b610f3a89828a01610d5f565b9450945050606087013567ffffffffffffffff811115610f5d57610f5c610c11565b5b610f6989828a01610e80565b92509250509295509295509295565b5f60208284031215610f8d57610f8c610c0d565b5b5f610f9a84828501610c34565b91505092915050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52602160045260245ffd5b5f82825260208201905092915050565b7f73656e646572206e6f74206120766f74657200000000000000000000000000005f82015250565b5f611014601283610fd0565b915061101f82610fe0565b602082019050919050565b5f6020820190508181035f83015261104181611008565b9050919050565b7f616c726561647920766f746564000000000000000000000000000000000000005f82015250565b5f61107c600d83610fd0565b915061108782611048565b602082019050919050565b5f6020820190508181035f8301526110a981611070565b9050919050565b6110b981610c48565b82525050565b5f6040820190506110d25f830185610e25565b6110df60208301846110b0565b9392505050565b5f6020820190506110f95f8301846110b0565b92915050565b5f81905092915050565b5f819050919050565b61111b81610d18565b82525050565b5f61112c8383611112565b60208301905092915050565b5f6111466020840184610d3f565b905092915050565b5f602082019050919050565b5f61116583856110ff565b935061117082611109565b805f5b858110156111a8576111858284611138565b61118f8882611121565b975061119a8361114e565b925050600181019050611173565b5085925050509392505050565b5f6111c182848661115a565b91508190509392505050565b5f819050919050565b5f6111f06111eb6111e684610cbc565b6111cd565b610cbc565b9050919050565b611200816111d6565b82525050565b61120f81610d18565b82525050565b5f6060820190506112285f8301866111f7565b6112356020830185611206565b6112426040830184610e25565b949350505050565b7f5468726573686f6c642073686f756c64206e6f742062652030000000000000005f82015250565b5f61127e601983610fd0565b91506112898261124a565b602082019050919050565b5f6020820190508181035f8301526112ab81611272565b9050919050565b7f5468657265206d757374206265206174206c65617374206f6e6520766f7465725f82015250565b5f6112e6602083610fd0565b91506112f1826112b2565b602082019050919050565b5f6020820190508181035f830152611313816112da565b9050919050565b7f70726f706f73616c20616c7265616479206578697374730000000000000000005f82015250565b5f61134e601783610fd0565b91506113598261131a565b602082019050919050565b5f6020820190508181035f83015261137b81611342565b9050919050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52603260045260245ffd5b5f602082840312156113c4576113c3610c0d565b5b5f6113d184828501610d3f565b91505092915050565b5f82825260208201905092915050565b828183375f83830152505050565b5f601f19601f8301169050919050565b5f61141383856113da565b93506114208385846113ea565b611429836113f8565b840190509392505050565b5f6020820190508181035f83015261144d818486611408565b90509392505050565b7f50726f706f73616c20616c7265616479206578656375746564000000000000005f82015250565b5f61148a601983610fd0565b915061149582611456565b602082019050919050565b5f6020820190508181035f8301526114b78161147e565b9050919050565b5f819050919050565b5f6114e16114dc6114d7846114be565b6111cd565b610c48565b9050919050565b6114f1816114c7565b82525050565b5f60408201905061150a5f830185610e25565b61151760208301846114e8565b9392505050565b7f43616e6e6f7420616363657373204f776e6564436f756e746572206f776e65645f8201527f20627920616e6f74686572206164647265737300000000000000000000000000602082015250565b5f611578603383610fd0565b91506115838261151e565b604082019050919050565b5f6020820190508181035f8301526115a58161156c565b9050919050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b5f6115e382610e4d565b91506115ee83610e4d565b9250828201905080821115611606576116056115ac565b5b92915050565b5f81905092915050565b50565b5f6116245f8361160c565b915061162f82611616565b5f82019050919050565b5f61164382611619565b9150819050919050565b7f507265636f6d70696c652063616c6c206661696c6564000000000000000000005f82015250565b5f611681601683610fd0565b915061168c8261164d565b602082019050919050565b5f6020820190508181035f8301526116ae81611675565b9050919050565b7f496e76616c6964206f7574707574206c656e67746800000000000000000000005f82015250565b5f6116e9601583610fd0565b91506116f4826116b5565b602082019050919050565b5f6020820190508181035f830152611716816116dd565b9050919050565b61172681610cbc565b8114611730575f5ffd5b50565b5f815190506117418161171d565b92915050565b5f6020828403121561175c5761175b610c0d565b5b5f61176984828501611733565b91505092915050565b5f8115159050919050565b61178681611772565b82525050565b5f60208201905061179f5f83018461177d565b92915050565b5f81519050919050565b8281835e5f83830152505050565b5f6117c7826117a5565b6117d1818561160c565b93506117e18185602086016117af565b80840191505092915050565b5f6117f882846117bd565b915081905092915050565b5f81519050919050565b5f61181782611803565b6118218185610fd0565b93506118318185602086016117af565b61183a816113f8565b840191505092915050565b5f6020820190508181035f83015261185d818461180d565b90509291505056fe50726f706f73616c20646561646c696e6520686173206e6f74207061737365642079657450726f706f73616c20646561646c696e652068617320706173736564206f722070726f706f73616c20646f6573206e6f74206578697374
    /// ```
    #[rustfmt::skip]
    #[allow(clippy::all)]
    pub static DEPLOYED_BYTECODE: alloy_sol_types::private::Bytes = alloy_sol_types::private::Bytes::from_static(
        b"`\x80`@R4\x80\x15a\0\x0FW__\xFD[P`\x046\x10a\0JW_5`\xE0\x1C\x80c\xB4\xB0q>\x14a\0NW\x80c\xB8)\x96o\x14a\0jW\x80c\xCFu\xEE*\x14a\0\x9AW\x80c\xE7Q\xF2q\x14a\0\xCAW[__\xFD[a\0h`\x04\x806\x03\x81\x01\x90a\0c\x91\x90a\x0C~V[a\0\xE6V[\0[a\0\x84`\x04\x806\x03\x81\x01\x90a\0\x7F\x91\x90a\r\xB4V[a\x02\xE5V[`@Qa\0\x91\x91\x90a\x0E4V[`@Q\x80\x91\x03\x90\xF3[a\0\xB4`\x04\x806\x03\x81\x01\x90a\0\xAF\x91\x90a\x0E\xD5V[a\x03CV[`@Qa\0\xC1\x91\x90a\x0E4V[`@Q\x80\x91\x03\x90\xF3[a\0\xE4`\x04\x806\x03\x81\x01\x90a\0\xDF\x91\x90a\x0FxV[a\x05\xE9V[\0[___\x84\x81R` \x01\x90\x81R` \x01_ \x90Pa\x011\x81_\x01_\x90T\x90a\x01\0\n\x90\x04g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16`@Q\x80``\x01`@R\x80`7\x81R` \x01a\x18\x8A`7\x919a\x07ZV[`\x01`\x02\x81\x11\x15a\x01EWa\x01Da\x0F\xA3V[[\x81`\x03\x01_3s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x81R` \x01\x90\x81R` \x01_ _\x90T\x90a\x01\0\n\x90\x04`\xFF\x16`\x02\x81\x11\x15a\x01\xA3Wa\x01\xA2a\x0F\xA3V[[\x14a\x01\xE3W`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x01\xDA\x90a\x10*V[`@Q\x80\x91\x03\x90\xFD[_a\x01\xFA\x843`\x02a\x07\x8B\x90\x92\x91\x90c\xFF\xFF\xFF\xFF\x16V[\x14a\x02:W`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x021\x90a\x10\x92V[`@Q\x80\x91\x03\x90\xFD[a\x02S\x833`\x01`\x02a\x08Q\x90\x93\x92\x91\x90c\xFF\xFF\xFF\xFF\x16V[a\x02\x91\x83\x83`@Q` \x01a\x02i\x92\x91\x90a\x10\xBFV[`@Q` \x81\x83\x03\x03\x81R\x90`@R\x80Q\x90` \x01 `\x01\x80a\t(\x90\x92\x91\x90c\xFF\xFF\xFF\xFF\x16V[3s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83\x7F\xD8\xA9\\\xA0^\x9A&V\xFE!\xD862\x9D\x9C\xD7x0\xE7\xFE\xF7\xAC\xB7\xC0\xFD;\xF5B\x1E\xA7\xAD\x9A\x84`@Qa\x02\xD8\x91\x90a\x10\xE6V[`@Q\x80\x91\x03\x90\xA3PPPV[_\x84\x84\x84\x84`@Q` \x01a\x02\xFB\x92\x91\x90a\x11\xB5V[`@Q` \x81\x83\x03\x03\x81R\x90`@R\x80Q\x90` \x01 `@Q` \x01a\x03#\x93\x92\x91\x90a\x12\x15V[`@Q` \x81\x83\x03\x03\x81R\x90`@R\x80Q\x90` \x01 \x90P\x94\x93PPPPV[_a\x03\x83\x87`@Q\x80`@\x01`@R\x80`\x1E\x81R` \x01\x7FDeadline must be in the future\0\0\x81RPa\x07ZV[_\x86\x11a\x03\xC5W`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x03\xBC\x90a\x12\x94V[`@Q\x80\x91\x03\x90\xFD[_\x85\x85\x90P\x11a\x04\nW`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x04\x01\x90a\x12\xFCV[`@Q\x80\x91\x03\x90\xFD[_a\x04\x17\x883\x88\x88a\x02\xE5V[\x90P___\x83\x81R` \x01\x90\x81R` \x01_ \x90P_\x81`\x05\x01T\x14a\x04rW`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x04i\x90a\x13dV[`@Q\x80\x91\x03\x90\xFD[\x88\x81_\x01_a\x01\0\n\x81T\x81g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x02\x19\x16\x90\x83g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x02\x17\x90UP3\x81`\x02\x01_a\x01\0\n\x81T\x81s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x02\x19\x16\x90\x83s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x02\x17\x90UP\x86\x86\x90P\x81`\x05\x01\x81\x90UP__\x90P[\x87\x87\x90P\x81\x10\x15a\x05\x94W`\x01\x82`\x03\x01_\x8A\x8A\x85\x81\x81\x10a\x05\x13Wa\x05\x12a\x13\x82V[[\x90P` \x02\x01` \x81\x01\x90a\x05(\x91\x90a\x13\xAFV[s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x81R` \x01\x90\x81R` \x01_ _a\x01\0\n\x81T\x81`\xFF\x02\x19\x16\x90\x83`\x02\x81\x11\x15a\x05\x82Wa\x05\x81a\x0F\xA3V[[\x02\x17\x90UP\x80\x80`\x01\x01\x91PPa\x04\xEEV[P\x88g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x82\x7F\xDD\x1DC\xA4\x15\xE6\xCFP-\xCD{3=2\x0FAh)\xC0\xF6\xA4:\xA9\xE3-\x81\xCD\x9A:qG\xE6\x87\x87`@Qa\x05\xD2\x92\x91\x90a\x144V[`@Q\x80\x91\x03\x90\xA3\x81\x92PPP\x96\x95PPPPPPV[___\x83\x81R` \x01\x90\x81R` \x01_ \x90Pa\x064\x81_\x01_\x90T\x90a\x01\0\n\x90\x04g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16`@Q\x80``\x01`@R\x80`$\x81R` \x01a\x18f`$\x919a\tUV[\x80`\x06\x01_\x90T\x90a\x01\0\n\x90\x04`\xFF\x16\x15a\x06\x85W`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x06|\x90a\x14\xA0V[`@Q\x80\x91\x03\x90\xFD[_\x82`\x01`@Q` \x01a\x06\x9A\x92\x91\x90a\x14\xF7V[`@Q` \x81\x83\x03\x03\x81R\x90`@R\x80Q\x90` \x01 \x90Pa\x07\x03\x81\x83`\x01\x01T`@Q\x80`@\x01`@R\x80`\x10\x81R` \x01\x7FNot enough votes\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81RP`\x01a\t\x86\x90\x93\x92\x91\x90c\xFF\xFF\xFF\xFF\x16V[`\x01\x82`\x06\x01_a\x01\0\n\x81T\x81`\xFF\x02\x19\x16\x90\x83\x15\x15\x02\x17\x90UPa\x07(\x83a\t\xABV[\x82\x7F{\x1B\xCF\x1C\xCF\x90\x1A\x11X\x9A\xFF\xF5PMY\xFD\nSx\x0E\xED*\x95*\xDA\xDE\x03H\x98Q9\xE0`@Q`@Q\x80\x91\x03\x90\xA2PPPV[a\x07\x87a\x07\x81\x83a\x07ia\t\xAEV[g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16a\n\xDC\x90\x91\x90c\xFF\xFF\xFF\xFF\x16V[\x82a\n\xFCV[PPV[_2s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x82s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x14a\x07\xFAW`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x07\xF1\x90a\x15\x8EV[`@Q\x80\x91\x03\x90\xFD[\x83_\x01_\x84\x81R` \x01\x90\x81R` \x01_ _\x83s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x81R` \x01\x90\x81R` \x01_ T\x90P\x93\x92PPPV[2s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x82s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x14a\x08\xBFW`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x08\xB6\x90a\x15\x8EV[`@Q\x80\x91\x03\x90\xFD[\x80\x84_\x01_\x85\x81R` \x01\x90\x81R` \x01_ _\x84s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x81R` \x01\x90\x81R` \x01_ _\x82\x82Ta\t\x1B\x91\x90a\x15\xD9V[\x92PP\x81\x90UPPPPPV[\x80\x83_\x01_\x84\x81R` \x01\x90\x81R` \x01_ _\x82\x82Ta\tI\x91\x90a\x15\xD9V[\x92PP\x81\x90UPPPPV[a\t\x82a\t|\x83a\tda\t\xAEV[g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16a\x0B\xED\x90\x91\x90c\xFF\xFF\xFF\xFF\x16V[\x82a\n\xFCV[PPV[a\t\xA5\x82\x85_\x01_\x86\x81R` \x01\x90\x81R` \x01_ T\x10\x15\x82a\n\xFCV[PPPPV[PV[___\x7F\xBA(nM\x89\xDA\xBFK(x\xE8\x96B;\xB1#\xD9\xD5\x14>f&\x06\xFD4;gf\xD7\xBC\xF7!_\x1Cs\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16`@Qa\t\xF6\x90a\x169V[_`@Q\x80\x83\x03\x81\x85Z\xFA\x91PP=\x80_\x81\x14a\n.W`@Q\x91P`\x1F\x19`?=\x01\x16\x82\x01`@R=\x82R=_` \x84\x01>a\n3V[``\x91P[P\x91P\x91P\x81a\nxW`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\no\x90a\x16\x97V[`@Q\x80\x91\x03\x90\xFD[` \x81Q\x14a\n\xBCW`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\n\xB3\x90a\x16\xFFV[`@Q\x80\x91\x03\x90\xFD[_\x81\x80` \x01\x90Q\x81\x01\x90a\n\xD1\x91\x90a\x17GV[\x90P\x80\x93PPPP\x90V[_\x81g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x10\x90P\x92\x91PPV[_\x7F=\xCD\xF6;A\xC1\x03V}r%\x97j\xD9\x14^\x86lz}\xCC\xC6\xC2w\xEA\x86\xAB\xBD&\x8F\xBA\xC9_\x1Cs\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83`@Q` \x01a\x0BG\x91\x90a\x17\x8CV[`@Q` \x81\x83\x03\x03\x81R\x90`@R`@Qa\x0Bc\x91\x90a\x17\xEDV[_`@Q\x80\x83\x03\x81\x85Z\xFA\x91PP=\x80_\x81\x14a\x0B\x9BW`@Q\x91P`\x1F\x19`?=\x01\x16\x82\x01`@R=\x82R=_` \x84\x01>a\x0B\xA0V[``\x91P[PP\x90P\x80\x82\x90a\x0B\xE7W`@Q\x7F\x08\xC3y\xA0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x81R`\x04\x01a\x0B\xDE\x91\x90a\x18EV[`@Q\x80\x91\x03\x90\xFD[PPPPV[_\x81g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x83g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x16\x11\x90P\x92\x91PPV[__\xFD[__\xFD[_\x81\x90P\x91\x90PV[a\x0C'\x81a\x0C\x15V[\x81\x14a\x0C1W__\xFD[PV[_\x815\x90Pa\x0CB\x81a\x0C\x1EV[\x92\x91PPV[_`\xFF\x82\x16\x90P\x91\x90PV[a\x0C]\x81a\x0CHV[\x81\x14a\x0CgW__\xFD[PV[_\x815\x90Pa\x0Cx\x81a\x0CTV[\x92\x91PPV[__`@\x83\x85\x03\x12\x15a\x0C\x94Wa\x0C\x93a\x0C\rV[[_a\x0C\xA1\x85\x82\x86\x01a\x0C4V[\x92PP` a\x0C\xB2\x85\x82\x86\x01a\x0CjV[\x91PP\x92P\x92\x90PV[_g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x82\x16\x90P\x91\x90PV[a\x0C\xD8\x81a\x0C\xBCV[\x81\x14a\x0C\xE2W__\xFD[PV[_\x815\x90Pa\x0C\xF3\x81a\x0C\xCFV[\x92\x91PPV[_s\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x82\x16\x90P\x91\x90PV[_a\r\"\x82a\x0C\xF9V[\x90P\x91\x90PV[a\r2\x81a\r\x18V[\x81\x14a\r<W__\xFD[PV[_\x815\x90Pa\rM\x81a\r)V[\x92\x91PPV[__\xFD[__\xFD[__\xFD[__\x83`\x1F\x84\x01\x12a\rtWa\rsa\rSV[[\x825\x90Pg\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x81\x11\x15a\r\x91Wa\r\x90a\rWV[[` \x83\x01\x91P\x83` \x82\x02\x83\x01\x11\x15a\r\xADWa\r\xACa\r[V[[\x92P\x92\x90PV[____``\x85\x87\x03\x12\x15a\r\xCCWa\r\xCBa\x0C\rV[[_a\r\xD9\x87\x82\x88\x01a\x0C\xE5V[\x94PP` a\r\xEA\x87\x82\x88\x01a\r?V[\x93PP`@\x85\x015g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x81\x11\x15a\x0E\x0BWa\x0E\na\x0C\x11V[[a\x0E\x17\x87\x82\x88\x01a\r_V[\x92P\x92PP\x92\x95\x91\x94P\x92PV[a\x0E.\x81a\x0C\x15V[\x82RPPV[_` \x82\x01\x90Pa\x0EG_\x83\x01\x84a\x0E%V[\x92\x91PPV[_\x81\x90P\x91\x90PV[a\x0E_\x81a\x0EMV[\x81\x14a\x0EiW__\xFD[PV[_\x815\x90Pa\x0Ez\x81a\x0EVV[\x92\x91PPV[__\x83`\x1F\x84\x01\x12a\x0E\x95Wa\x0E\x94a\rSV[[\x825\x90Pg\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x81\x11\x15a\x0E\xB2Wa\x0E\xB1a\rWV[[` \x83\x01\x91P\x83`\x01\x82\x02\x83\x01\x11\x15a\x0E\xCEWa\x0E\xCDa\r[V[[\x92P\x92\x90PV[______`\x80\x87\x89\x03\x12\x15a\x0E\xEFWa\x0E\xEEa\x0C\rV[[_a\x0E\xFC\x89\x82\x8A\x01a\x0C\xE5V[\x96PP` a\x0F\r\x89\x82\x8A\x01a\x0ElV[\x95PP`@\x87\x015g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x81\x11\x15a\x0F.Wa\x0F-a\x0C\x11V[[a\x0F:\x89\x82\x8A\x01a\r_V[\x94P\x94PP``\x87\x015g\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF\x81\x11\x15a\x0F]Wa\x0F\\a\x0C\x11V[[a\x0Fi\x89\x82\x8A\x01a\x0E\x80V[\x92P\x92PP\x92\x95P\x92\x95P\x92\x95V[_` \x82\x84\x03\x12\x15a\x0F\x8DWa\x0F\x8Ca\x0C\rV[[_a\x0F\x9A\x84\x82\x85\x01a\x0C4V[\x91PP\x92\x91PPV[\x7FNH{q\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0_R`!`\x04R`$_\xFD[_\x82\x82R` \x82\x01\x90P\x92\x91PPV[\x7Fsender not a voter\0\0\0\0\0\0\0\0\0\0\0\0\0\0_\x82\x01RPV[_a\x10\x14`\x12\x83a\x0F\xD0V[\x91Pa\x10\x1F\x82a\x0F\xE0V[` \x82\x01\x90P\x91\x90PV[_` \x82\x01\x90P\x81\x81\x03_\x83\x01Ra\x10A\x81a\x10\x08V[\x90P\x91\x90PV[\x7Falready voted\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0_\x82\x01RPV[_a\x10|`\r\x83a\x0F\xD0V[\x91Pa\x10\x87\x82a\x10HV[` \x82\x01\x90P\x91\x90PV[_` \x82\x01\x90P\x81\x81\x03_\x83\x01Ra\x10\xA9\x81a\x10pV[\x90P\x91\x90PV[a\x10\xB9\x81a\x0CHV[\x82RPPV[_`@\x82\x01\x90Pa\x10\xD2_\x83\x01\x85a\x0E%V[a\x10\xDF` \x83\x01\x84a\x10\xB0V[\x93\x92PPPV[_` \x82\x01\x90Pa\x10\xF9_\x83\x01\x84a\x10\xB0V[\x92\x91PPV[_\x81\x90P\x92\x91PPV[_\x81\x90P\x91\x90PV[a\x11\x1B\x81a\r\x18V[\x82RPPV[_a\x11,\x83\x83a\x11\x12V[` \x83\x01\x90P\x92\x91PPV[_a\x11F` \x84\x01\x84a\r?V[\x90P\x92\x91PPV[_` \x82\x01\x90P\x91\x90PV[_a\x11e\x83\x85a\x10\xFFV[\x93Pa\x11p\x82a\x11\tV[\x80_[\x85\x81\x10\x15a\x11\xA8Wa\x11\x85\x82\x84a\x118V[a\x11\x8F\x88\x82a\x11!V[\x97Pa\x11\x9A\x83a\x11NV[\x92PP`\x01\x81\x01\x90Pa\x11sV[P\x85\x92PPP\x93\x92PPPV[_a\x11\xC1\x82\x84\x86a\x11ZV[\x91P\x81\x90P\x93\x92PPPV[_\x81\x90P\x91\x90PV[_a\x11\xF0a\x11\xEBa\x11\xE6\x84a\x0C\xBCV[a\x11\xCDV[a\x0C\xBCV[\x90P\x91\x90PV[a\x12\0\x81a\x11\xD6V[\x82RPPV[a\x12\x0F\x81a\r\x18V[\x82RPPV[_``\x82\x01\x90Pa\x12(_\x83\x01\x86a\x11\xF7V[a\x125` \x83\x01\x85a\x12\x06V[a\x12B`@\x83\x01\x84a\x0E%V[\x94\x93PPPPV[\x7FThreshold should not be 0\0\0\0\0\0\0\0_\x82\x01RPV[_a\x12~`\x19\x83a\x0F\xD0V[\x91Pa\x12\x89\x82a\x12JV[` \x82\x01\x90P\x91\x90PV[_` \x82\x01\x90P\x81\x81\x03_\x83\x01Ra\x12\xAB\x81a\x12rV[\x90P\x91\x90PV[\x7FThere must be at least one voter_\x82\x01RPV[_a\x12\xE6` \x83a\x0F\xD0V[\x91Pa\x12\xF1\x82a\x12\xB2V[` \x82\x01\x90P\x91\x90PV[_` \x82\x01\x90P\x81\x81\x03_\x83\x01Ra\x13\x13\x81a\x12\xDAV[\x90P\x91\x90PV[\x7Fproposal already exists\0\0\0\0\0\0\0\0\0_\x82\x01RPV[_a\x13N`\x17\x83a\x0F\xD0V[\x91Pa\x13Y\x82a\x13\x1AV[` \x82\x01\x90P\x91\x90PV[_` \x82\x01\x90P\x81\x81\x03_\x83\x01Ra\x13{\x81a\x13BV[\x90P\x91\x90PV[\x7FNH{q\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0_R`2`\x04R`$_\xFD[_` \x82\x84\x03\x12\x15a\x13\xC4Wa\x13\xC3a\x0C\rV[[_a\x13\xD1\x84\x82\x85\x01a\r?V[\x91PP\x92\x91PPV[_\x82\x82R` \x82\x01\x90P\x92\x91PPV[\x82\x81\x837_\x83\x83\x01RPPPV[_`\x1F\x19`\x1F\x83\x01\x16\x90P\x91\x90PV[_a\x14\x13\x83\x85a\x13\xDAV[\x93Pa\x14 \x83\x85\x84a\x13\xEAV[a\x14)\x83a\x13\xF8V[\x84\x01\x90P\x93\x92PPPV[_` \x82\x01\x90P\x81\x81\x03_\x83\x01Ra\x14M\x81\x84\x86a\x14\x08V[\x90P\x93\x92PPPV[\x7FProposal already executed\0\0\0\0\0\0\0_\x82\x01RPV[_a\x14\x8A`\x19\x83a\x0F\xD0V[\x91Pa\x14\x95\x82a\x14VV[` \x82\x01\x90P\x91\x90PV[_` \x82\x01\x90P\x81\x81\x03_\x83\x01Ra\x14\xB7\x81a\x14~V[\x90P\x91\x90PV[_\x81\x90P\x91\x90PV[_a\x14\xE1a\x14\xDCa\x14\xD7\x84a\x14\xBEV[a\x11\xCDV[a\x0CHV[\x90P\x91\x90PV[a\x14\xF1\x81a\x14\xC7V[\x82RPPV[_`@\x82\x01\x90Pa\x15\n_\x83\x01\x85a\x0E%V[a\x15\x17` \x83\x01\x84a\x14\xE8V[\x93\x92PPPV[\x7FCannot access OwnedCounter owned_\x82\x01R\x7F by another address\0\0\0\0\0\0\0\0\0\0\0\0\0` \x82\x01RPV[_a\x15x`3\x83a\x0F\xD0V[\x91Pa\x15\x83\x82a\x15\x1EV[`@\x82\x01\x90P\x91\x90PV[_` \x82\x01\x90P\x81\x81\x03_\x83\x01Ra\x15\xA5\x81a\x15lV[\x90P\x91\x90PV[\x7FNH{q\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0_R`\x11`\x04R`$_\xFD[_a\x15\xE3\x82a\x0EMV[\x91Pa\x15\xEE\x83a\x0EMV[\x92P\x82\x82\x01\x90P\x80\x82\x11\x15a\x16\x06Wa\x16\x05a\x15\xACV[[\x92\x91PPV[_\x81\x90P\x92\x91PPV[PV[_a\x16$_\x83a\x16\x0CV[\x91Pa\x16/\x82a\x16\x16V[_\x82\x01\x90P\x91\x90PV[_a\x16C\x82a\x16\x19V[\x91P\x81\x90P\x91\x90PV[\x7FPrecompile call failed\0\0\0\0\0\0\0\0\0\0_\x82\x01RPV[_a\x16\x81`\x16\x83a\x0F\xD0V[\x91Pa\x16\x8C\x82a\x16MV[` \x82\x01\x90P\x91\x90PV[_` \x82\x01\x90P\x81\x81\x03_\x83\x01Ra\x16\xAE\x81a\x16uV[\x90P\x91\x90PV[\x7FInvalid output length\0\0\0\0\0\0\0\0\0\0\0_\x82\x01RPV[_a\x16\xE9`\x15\x83a\x0F\xD0V[\x91Pa\x16\xF4\x82a\x16\xB5V[` \x82\x01\x90P\x91\x90PV[_` \x82\x01\x90P\x81\x81\x03_\x83\x01Ra\x17\x16\x81a\x16\xDDV[\x90P\x91\x90PV[a\x17&\x81a\x0C\xBCV[\x81\x14a\x170W__\xFD[PV[_\x81Q\x90Pa\x17A\x81a\x17\x1DV[\x92\x91PPV[_` \x82\x84\x03\x12\x15a\x17\\Wa\x17[a\x0C\rV[[_a\x17i\x84\x82\x85\x01a\x173V[\x91PP\x92\x91PPV[_\x81\x15\x15\x90P\x91\x90PV[a\x17\x86\x81a\x17rV[\x82RPPV[_` \x82\x01\x90Pa\x17\x9F_\x83\x01\x84a\x17}V[\x92\x91PPV[_\x81Q\x90P\x91\x90PV[\x82\x81\x83^_\x83\x83\x01RPPPV[_a\x17\xC7\x82a\x17\xA5V[a\x17\xD1\x81\x85a\x16\x0CV[\x93Pa\x17\xE1\x81\x85` \x86\x01a\x17\xAFV[\x80\x84\x01\x91PP\x92\x91PPV[_a\x17\xF8\x82\x84a\x17\xBDV[\x91P\x81\x90P\x92\x91PPV[_\x81Q\x90P\x91\x90PV[_a\x18\x17\x82a\x18\x03V[a\x18!\x81\x85a\x0F\xD0V[\x93Pa\x181\x81\x85` \x86\x01a\x17\xAFV[a\x18:\x81a\x13\xF8V[\x84\x01\x91PP\x92\x91PPV[_` \x82\x01\x90P\x81\x81\x03_\x83\x01Ra\x18]\x81\x84a\x18\rV[\x90P\x92\x91PPV\xFEProposal deadline has not passed yetProposal deadline has passed or proposal does not exist",
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
        impl castVoteReturn {
            fn _tokenize(
                &self,
            ) -> <castVoteCall as alloy_sol_types::SolCall>::ReturnToken<'_> {
                ()
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
            fn tokenize_returns(ret: &Self::Return) -> Self::ReturnToken<'_> {
                castVoteReturn::_tokenize(ret)
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
            type Return = alloy::sol_types::private::FixedBytes<32>;
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
            fn tokenize_returns(ret: &Self::Return) -> Self::ReturnToken<'_> {
                (
                    <alloy::sol_types::sol_data::FixedBytes<
                        32,
                    > as alloy_sol_types::SolType>::tokenize(ret),
                )
            }
            #[inline]
            fn abi_decode_returns(data: &[u8]) -> alloy_sol_types::Result<Self::Return> {
                <Self::ReturnTuple<
                    '_,
                > as alloy_sol_types::SolType>::abi_decode_sequence(data)
                    .map(|r| {
                        let r: createProposalReturn = r.into();
                        r.proposalId
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
                        let r: createProposalReturn = r.into();
                        r.proposalId
                    })
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
        impl executeReturn {
            fn _tokenize(
                &self,
            ) -> <executeCall as alloy_sol_types::SolCall>::ReturnToken<'_> {
                ()
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
            fn tokenize_returns(ret: &Self::Return) -> Self::ReturnToken<'_> {
                executeReturn::_tokenize(ret)
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
            type Return = alloy::sol_types::private::FixedBytes<32>;
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
            fn tokenize_returns(ret: &Self::Return) -> Self::ReturnToken<'_> {
                (
                    <alloy::sol_types::sol_data::FixedBytes<
                        32,
                    > as alloy_sol_types::SolType>::tokenize(ret),
                )
            }
            #[inline]
            fn abi_decode_returns(data: &[u8]) -> alloy_sol_types::Result<Self::Return> {
                <Self::ReturnTuple<
                    '_,
                > as alloy_sol_types::SolType>::abi_decode_sequence(data)
                    .map(|r| {
                        let r: getProposalIdReturn = r.into();
                        r.proposalId
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
                        let r: getProposalIdReturn = r.into();
                        r.proposalId
                    })
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
        ) -> alloy_sol_types::Result<Self> {
            static DECODE_SHIMS: &[fn(&[u8]) -> alloy_sol_types::Result<VotingCalls>] = &[
                {
                    fn castVote(data: &[u8]) -> alloy_sol_types::Result<VotingCalls> {
                        <castVoteCall as alloy_sol_types::SolCall>::abi_decode_raw(data)
                            .map(VotingCalls::castVote)
                    }
                    castVote
                },
                {
                    fn getProposalId(
                        data: &[u8],
                    ) -> alloy_sol_types::Result<VotingCalls> {
                        <getProposalIdCall as alloy_sol_types::SolCall>::abi_decode_raw(
                                data,
                            )
                            .map(VotingCalls::getProposalId)
                    }
                    getProposalId
                },
                {
                    fn createProposal(
                        data: &[u8],
                    ) -> alloy_sol_types::Result<VotingCalls> {
                        <createProposalCall as alloy_sol_types::SolCall>::abi_decode_raw(
                                data,
                            )
                            .map(VotingCalls::createProposal)
                    }
                    createProposal
                },
                {
                    fn execute(data: &[u8]) -> alloy_sol_types::Result<VotingCalls> {
                        <executeCall as alloy_sol_types::SolCall>::abi_decode_raw(data)
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
            ) -> alloy_sol_types::Result<VotingCalls>] = &[
                {
                    fn castVote(data: &[u8]) -> alloy_sol_types::Result<VotingCalls> {
                        <castVoteCall as alloy_sol_types::SolCall>::abi_decode_raw_validate(
                                data,
                            )
                            .map(VotingCalls::castVote)
                    }
                    castVote
                },
                {
                    fn getProposalId(
                        data: &[u8],
                    ) -> alloy_sol_types::Result<VotingCalls> {
                        <getProposalIdCall as alloy_sol_types::SolCall>::abi_decode_raw_validate(
                                data,
                            )
                            .map(VotingCalls::getProposalId)
                    }
                    getProposalId
                },
                {
                    fn createProposal(
                        data: &[u8],
                    ) -> alloy_sol_types::Result<VotingCalls> {
                        <createProposalCall as alloy_sol_types::SolCall>::abi_decode_raw_validate(
                                data,
                            )
                            .map(VotingCalls::createProposal)
                    }
                    createProposal
                },
                {
                    fn execute(data: &[u8]) -> alloy_sol_types::Result<VotingCalls> {
                        <executeCall as alloy_sol_types::SolCall>::abi_decode_raw_validate(
                                data,
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
            DECODE_VALIDATE_SHIMS[idx](data)
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
        ) -> alloy_sol_types::Result<Self> {
            match topics.first().copied() {
                Some(<ProposalCreated as alloy_sol_types::SolEvent>::SIGNATURE_HASH) => {
                    <ProposalCreated as alloy_sol_types::SolEvent>::decode_raw_log(
                            topics,
                            data,
                        )
                        .map(Self::ProposalCreated)
                }
                Some(<ProposalExecuted as alloy_sol_types::SolEvent>::SIGNATURE_HASH) => {
                    <ProposalExecuted as alloy_sol_types::SolEvent>::decode_raw_log(
                            topics,
                            data,
                        )
                        .map(Self::ProposalExecuted)
                }
                Some(<VoteCast as alloy_sol_types::SolEvent>::SIGNATURE_HASH) => {
                    <VoteCast as alloy_sol_types::SolEvent>::decode_raw_log(topics, data)
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
        P: alloy_contract::private::Provider<N>,
        N: alloy_contract::private::Network,
    >(address: alloy_sol_types::private::Address, provider: P) -> VotingInstance<P, N> {
        VotingInstance::<P, N>::new(address, provider)
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
        Output = alloy_contract::Result<VotingInstance<P, N>>,
    > {
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
    >(provider: P) -> alloy_contract::RawCallBuilder<P, N> {
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
            f.debug_tuple("VotingInstance").field(&self.address).finish()
        }
    }
    /// Instantiation and getters/setters.
    #[automatically_derived]
    impl<
        P: alloy_contract::private::Provider<N>,
        N: alloy_contract::private::Network,
    > VotingInstance<P, N> {
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
                _network: ::core::marker::PhantomData,
            }
        }
        /**Deploys this contract using the given `provider` and constructor arguments, if any.

Returns a new instance of the contract, if the deployment was successful.

For more fine-grained control over the deployment process, use [`deploy_builder`] instead.*/
        #[inline]
        pub async fn deploy(
            provider: P,
        ) -> alloy_contract::Result<VotingInstance<P, N>> {
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
    impl<
        P: alloy_contract::private::Provider<N>,
        N: alloy_contract::private::Network,
    > VotingInstance<P, N> {
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
        ///Creates a new call builder for the [`castVote`] function.
        pub fn castVote(
            &self,
            proposalId: alloy::sol_types::private::FixedBytes<32>,
            choice: u8,
        ) -> alloy_contract::SolCallBuilder<&P, castVoteCall, N> {
            self.call_builder(&castVoteCall { proposalId, choice })
        }
        ///Creates a new call builder for the [`createProposal`] function.
        pub fn createProposal(
            &self,
            deadline: <Time::Timestamp as alloy::sol_types::SolType>::RustType,
            threshold: alloy::sol_types::private::primitives::aliases::U256,
            voters: alloy::sol_types::private::Vec<alloy::sol_types::private::Address>,
            data: alloy::sol_types::private::Bytes,
        ) -> alloy_contract::SolCallBuilder<&P, createProposalCall, N> {
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
        ) -> alloy_contract::SolCallBuilder<&P, executeCall, N> {
            self.call_builder(&executeCall { proposalId })
        }
        ///Creates a new call builder for the [`getProposalId`] function.
        pub fn getProposalId(
            &self,
            deadline: <Time::Timestamp as alloy::sol_types::SolType>::RustType,
            proposer: alloy::sol_types::private::Address,
            voters: alloy::sol_types::private::Vec<alloy::sol_types::private::Address>,
        ) -> alloy_contract::SolCallBuilder<&P, getProposalIdCall, N> {
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
        P: alloy_contract::private::Provider<N>,
        N: alloy_contract::private::Network,
    > VotingInstance<P, N> {
        /// Creates a new event filter using this contract instance's provider and address.
        ///
        /// Note that the type can be any event, not just those defined in this contract.
        /// Prefer using the other methods for building type-safe event filters.
        pub fn event_filter<E: alloy_sol_types::SolEvent>(
            &self,
        ) -> alloy_contract::Event<&P, E, N> {
            alloy_contract::Event::new_sol(&self.provider, &self.address)
        }
        ///Creates a new event filter for the [`ProposalCreated`] event.
        pub fn ProposalCreated_filter(
            &self,
        ) -> alloy_contract::Event<&P, ProposalCreated, N> {
            self.event_filter::<ProposalCreated>()
        }
        ///Creates a new event filter for the [`ProposalExecuted`] event.
        pub fn ProposalExecuted_filter(
            &self,
        ) -> alloy_contract::Event<&P, ProposalExecuted, N> {
            self.event_filter::<ProposalExecuted>()
        }
        ///Creates a new event filter for the [`VoteCast`] event.
        pub fn VoteCast_filter(&self) -> alloy_contract::Event<&P, VoteCast, N> {
            self.event_filter::<VoteCast>()
        }
    }
}
