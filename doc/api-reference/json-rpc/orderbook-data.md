# Orderbook Data (ob\_)

Orderbook Data (`ob_`) is a read-focused API surface that provides access to markets and orderbook activity without requiring clients to run their own indexer or interact with the orderbook contracts directly. It is powered by a native indexer built into the Pod protocol, ensuring fast, consistent, and up-to-date views of on-chain state.

The API exposes live orderbook snapshots, historical OHLCV candles, account-level order history and positions, making it ideal for trading interfaces, analytics, and monitoring services.

{% swagger src="openapi.yaml" path="/ob_getMarkets" method="post" %}
[openapi.yaml](openapi.yaml)
{% endswagger %}

{% swagger src="openapi.yaml" path="/ob_getOrderbook" method="post" %}
[openapi.yaml](openapi.yaml)
{% endswagger %}

{% swagger src="openapi.yaml" path="/ob_getCandles" method="post" %}
[openapi.yaml](openapi.yaml)
{% endswagger %}

{% swagger src="openapi.yaml" path="/ob_getOrders" method="post" %}
[openapi.yaml](openapi.yaml)
{% endswagger %}

{% swagger src="openapi.yaml" path="/ob_getPositions" method="post" %}
[openapi.yaml](openapi.yaml)
{% endswagger %}
