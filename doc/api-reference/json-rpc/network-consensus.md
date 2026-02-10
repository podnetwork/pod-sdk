# Network & Consensus (pod\_)

Network & Consensus (`pod_`) exposes Pod-specific endpoints that provide visibility into the network's validator set and consensus process. These APIs surface data that is not available through standard Ethereum JSON-RPC methods, such as validator committees and aggregated voting information.

This interface is intended for infrastructure providers, validators, and light clients that need to inspect, monitor, or verify the state of the Pod network.

{% swagger src="openapi.yaml" path="/pod_getCommittee" method="post" %}
[openapi.yaml](openapi.yaml)
{% endswagger %}

{% swagger src="openapi.yaml" path="/pod_getVoteBatches" method="post" %}
[openapi.yaml](openapi.yaml)
{% endswagger %}
