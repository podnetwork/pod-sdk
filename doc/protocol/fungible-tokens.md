# Tokens

Native transfers and token payments are order-independent - they do not need global ordering and leverage Pod's fast path to finalize in one network round trip. To take advantage of this correctly, tokens are built natively into the protocol rather than deployed as user contracts.

Tokens on Pod support standard ERC-20 transfers. Users can transfer tokens using the familiar `transfer(address to, uint256 amount)` interface.

There is currently no `approve` functionality. Only users themselves can transfer their tokens when interacting with an application - explicit approval to a third party is not required.

See the [Precompiles](../api-reference/applications-precompiles/README.md) page for the list of supported tokens and their addresses.
