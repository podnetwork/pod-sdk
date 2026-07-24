# Reset your wallet after a testnet reset

Pod's testnet is periodically reset — for example, at the start of the [Trading Competition](../trading-competition/README.md). When a reset happens, all on-chain state is wiped: balances, positions, and account nonces are cleared and start fresh.

Your wallet itself (your private key / seed phrase) is not affected, but your wallet's local view of the network can become out of sync with the freshly reset testnet. The most common symptom is a **nonce mismatch** — your wallet still remembers the transaction count from before the reset, so new transactions are rejected or stuck pending.

To fix this you need to reset your wallet's account data so it re-reads the nonce and balances from the reset network.

## Steps (Rabby)

1. Open **Settings**.
2. Select **Clear Pending Locally**.
3. Check the box **"Also reset my local nonce data and signature record"**.
4. Click **Confirm**.

Rabby will clear its cached nonce and re-read your account state from the reset network.

{% hint style="info" %}
Clearing pending data only removes Rabby's local transaction history and cached nonce. It does not delete your account or private key.
{% endhint %}

The video below walks through the same steps:

{% embed url="https://www.youtube.com/shorts/t5gkDYd19VI" %}
How to reset your wallet for Pod after a testnet reset
{% endembed %}
