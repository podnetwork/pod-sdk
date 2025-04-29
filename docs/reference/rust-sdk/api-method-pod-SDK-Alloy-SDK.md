! content id="alloy-sdk"

### The difference between pod SDK and Alloy SDK

In general, the Alloy SDK could be used to interact with the Pod network. However, this is not recommended, as the Pod SDK extends the Alloy SDK and provides essential functionalities like `wait_past_perfect_time`, which integrate Pod-specific features.

Additionally, using the Alloy SDK directly may lead to unexpected behavior when waiting for transaction confirmations or fetching blocks. Therefore, the Pod SDK is recommended, especially for more secure applications.

! content end

! content empty
