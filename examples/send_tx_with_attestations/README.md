## 📄 `send_tx_with_attestations.js`

This example demonstrates how to send a real transaction to the Pod Network using [Ethers.js](https://github.com/ethers-io/ethers.js) and fetch validator attestations from the Pod-specific `pod_metadata` field in the transaction receipt.

### ✅ Features

- Uses environment variables (`.env`) to manage sensitive data
- Sends EIP-1559 style transactions
- Retrieves and prints validator attestations from the receipt
- Based on Pod Network's blockless consensus design

---

### 🛠 Requirements

- Node.js v18+
- NPM

Install dependencies:

```bash
npm install
```

---

### 📦 .env Configuration

Create a `.env` file in the same folder with the following variables:

```dotenv
RPC_URL=https://rpc.v2.pod.network
PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE
TO_ADDRESS=0xRECEIVER_ADDRESS_HERE
```

> ⚠️ **Never commit your `.env` file** – always add it to `.gitignore`.

---

### 🚀 Run the script

```bash
node send_tx_with_attestations.js
```

If successful, you'll see:

```
🚀 Transaction sent! Hash: 0x...
🧾 Confirmed in block: 1
⛽ Gas used: 21000
🧾 Confirmed with 22 attestations:
  #1 signer: 0xabc...
  ...
```

---

### 📚 How it works

- Sends a small amount of OG to the recipient using EIP-1559
- Waits for confirmation
- Makes a second RPC call to `eth_getTransactionReceipt` to retrieve Pod-specific metadata
- Displays each validator’s signature (attestation)

---

### 🤝 Contributing

This is an external developer contribution to improve onboarding for those integrating Pod's consensus from external clients like Ethers.js.

Feel free to improve it further or adapt it for batch sending, contract calls, or transaction monitoring.
