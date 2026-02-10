# Ethereum Interface (eth\_)

Ethereum Interface (`eth_`) provides an Ethereum-compatible JSON-RPC layer that allows existing wallets, tools, and libraries to interact with Pod using familiar methods and conventions. It is designed to be drop-in compatible with standard Ethereum client workflows, allowing developers to use common tooling such as `ethers.js`, `alloy.rs`, and `cast` without modification.

The interface covers the transaction submission and receipt lifecycle, including balance and nonce discovery, read-only contract calls, log queries, and real-time subscriptions.

{% swagger src="openapi.yaml" path="/eth_getBalance" method="post" %}
[openapi.yaml](openapi.yaml)
{% endswagger %}

{% swagger src="openapi.yaml" path="/eth_chainId" method="post" %}
[openapi.yaml](openapi.yaml)
{% endswagger %}

{% swagger src="openapi.yaml" path="/eth_getTransactionCount" method="post" %}
[openapi.yaml](openapi.yaml)
{% endswagger %}

{% swagger src="openapi.yaml" path="/eth_sendRawTransaction" method="post" %}
[openapi.yaml](openapi.yaml)
{% endswagger %}

{% swagger src="openapi.yaml" path="/eth_call" method="post" %}
[openapi.yaml](openapi.yaml)
{% endswagger %}

{% swagger src="openapi.yaml" path="/eth_getTransactionReceipt" method="post" %}
[openapi.yaml](openapi.yaml)
{% endswagger %}

{% swagger src="openapi.yaml" path="/eth_estimateGas" method="post" %}
[openapi.yaml](openapi.yaml)
{% endswagger %}

{% swagger src="openapi.yaml" path="/eth_getLogs" method="post" %}
[openapi.yaml](openapi.yaml)
{% endswagger %}

{% swagger src="openapi.yaml" path="/eth_subscribe" method="post" %}
[openapi.yaml](openapi.yaml)
{% endswagger %}
