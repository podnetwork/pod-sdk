# DID PLC Registry on pod

This is a PoC for a [DID PLC](https://github.com/did-method-plc/did-method-plc) implemented as smart contract on pod
network.

DID PLC is a self-authenticated DID which is strongly-consistent, recoverable, and allows for key rotation. It was
proposed by the [Bluesky](https://bsky.social) team to be used as a DID to store/update user handles and allow for key
rotation.

The current implementation of DID PLC service is
[trusted](https://github.com/did-method-plc/did-method-plc?tab=readme-ov-file#plc-server-trust-model) to:

1. Not censor valid operations.
2. Serve the latest fork.

Using pod, we can relax both of these requirements without sacrifising latency and cost of service.

## Technical Overview

1. `PLCRegistry.sol` is the contract deployed on pod devnet at `0x5cAe4686E2E4445c866678f594C20f946f10D461`. The
   contract is carefully designed to ensure that the state is consistent in the fastpath of pod.
2. `server.py` is a thin http-service that interacts with the registry contract and serves as a drop-in replacement for
   the current PLC service.

## How to run

1. Clone the repo and go the blsk-plc folder.

   ```bash
   git clone -b bsky-plc-service https://github.com/podnetwork/pod-sdk.git; cd pod-sdk/examples/bsky/plc
   ```

2. Generate a test keypair and fund it using the pod [devnet faucet](https://pod-doc-svelte-v1.vercel.app/fund).

   ```bash
   cast wallet new
   ```

3. Run the custom PLC server.

   ```bash
   POD_PLC_PRIVATE_KEY=<test-private-key> cargo run --bin bsky-plc
   ```

4. Run the PDS and point it to the local PLC server.

   ```
   docker run --env-file ./.env.pds -p 2583:2583 ghcr.io/bluesky-social/pds:0.4.107
   ```

5. Use the custom PDS in the [bluesky app](https://bsky.app).

   <img src="https://private-user-images.githubusercontent.com/3966964/438375521-db20bda0-a2e6-4300-8106-94d68a69891d.png?jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NDYwMTMyNjIsIm5iZiI6MTc0NjAxMjk2MiwicGF0aCI6Ii8zOTY2OTY0LzQzODM3NTUyMS1kYjIwYmRhMC1hMmU2LTQzMDAtODEwNi05NGQ2OGE2OTg5MWQucG5nP1gtQW16LUFsZ29yaXRobT1BV1M0LUhNQUMtU0hBMjU2JlgtQW16LUNyZWRlbnRpYWw9QUtJQVZDT0RZTFNBNTNQUUs0WkElMkYyMDI1MDQzMCUyRnVzLWVhc3QtMSUyRnMzJTJGYXdzNF9yZXF1ZXN0JlgtQW16LURhdGU9MjAyNTA0MzBUMTEzNjAyWiZYLUFtei1FeHBpcmVzPTMwMCZYLUFtei1TaWduYXR1cmU9M2YzZDIwYzllMDg4MWVlMzljZTRhYzdlYTkyZjUxZjU4NDI3NWI4ZTA4OTUzOGJlZjlhZGNmYzI0OWYzNmVkYiZYLUFtei1TaWduZWRIZWFkZXJzPWhvc3QifQ.6hL1ngpECDMDmGjmb15BMIJlv4ykVgrso72I0GmTxt8" width="500">
   <img src="https://private-user-images.githubusercontent.com/3966964/438377132-11729073-9cca-47a3-a327-23b6d538b5f6.png?jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NDYwMTU4MzMsIm5iZiI6MTc0NjAxNTUzMywicGF0aCI6Ii8zOTY2OTY0LzQzODM3NzEzMi0xMTcyOTA3My05Y2NhLTQ3YTMtYTMyNy0yM2I2ZDUzOGI1ZjYucG5nP1gtQW16LUFsZ29yaXRobT1BV1M0LUhNQUMtU0hBMjU2JlgtQW16LUNyZWRlbnRpYWw9QUtJQVZDT0RZTFNBNTNQUUs0WkElMkYyMDI1MDQzMCUyRnVzLWVhc3QtMSUyRnMzJTJGYXdzNF9yZXF1ZXN0JlgtQW16LURhdGU9MjAyNTA0MzBUMTIxODUzWiZYLUFtei1FeHBpcmVzPTMwMCZYLUFtei1TaWduYXR1cmU9MjBhNDUyYWNkMDNhYTllNTQwZmMwOTZkMzg1ZGFiMjhlMDBlMjE4ZWViMTJiMDI3N2UxOTg1MjAwMjZmZGU4MiZYLUFtei1TaWduZWRIZWFkZXJzPWhvc3QifQ.fZKTxbrDyyJ4_YSZmZFiLf0uTa0jYVCSvrs-71v2xaw" width="500">

## Next Steps

This is PoC, and here are the things left to do:

- [ ] Add relevant precompile to pod for dag-cbor encoding and signature check.
- [ ] Add support for export, log and audit endpoints.
- [ ] Update the contracts to use the fastpath types lib to ensure. the contract are consistent by design.
- [ ] (optional) Modify the PDS to directly interact with the contract.

## References

1. [Protocol Specification](https://web.plc.directory/spec/v0.1/did-plc)
2. [References Implementation](https://github.com/did-method-plc/did-method-plc)
3. [API Specification](https://web.plc.directory/api/redoc)
