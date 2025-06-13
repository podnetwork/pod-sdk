! content

# 🗳 Voting smart contract

The Voting smart contract provides a decentralized poll creation and voting mechanism. It allows designated voters to
participate in polls with single a choice, ensuring integrity through transparent rules and immutable logs. The contract
is built with awareness of the pod's unique characteristics, such as asynchronous execution and eventual consistency.

Key properties include:

- Poll creation with voter registration
- Polls are identified by ID derived from their properties (deadline, owner, voters, possible choices)
- Post-deadline winner resolution
- Events for:
  - poll creation
  - voting
  - poll close (winner selection)

! content end

! content empty
