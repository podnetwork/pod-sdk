# ⚡ Pod Network Studio & MEV-Free L1 Alloy SDK

An interactive **MEV-Free Order Processor**, **PodProvider Connector**, and **VerifiableLog Proof Inspector** for **Pod Network (`podnetwork/pod-sdk`)**.

---

## 🌟 Key Features

- ⚡ **MEV-Free Fair Order Matching**: Execute front-running immune financial transactions on Pod Network L1.
- 🔐 **VerifiableLog Proof Engine**: Generate and verify Merkle log inclusion proofs for light clients.
- 🌐 **Interactive Web Studio**: Real-time order terminal and proof verification console on `http://localhost:3430`.
- ⌨️ **Universal CLI (`pod-cli`)**: Terminal utility for submitting orders and verifying cryptographic proofs.

---

## 🚀 Quickstart

```bash
# Launch Pod Studio
npm start
# Open http://localhost:3430

# Or run via CLI
node bin/pod-cli.js order ETH/USDC
node bin/pod-cli.js verify-log
```
