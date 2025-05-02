! content id="coming-from-alloy"

## Coming from alloy

pod Rust SDK is built on top of alloy. Therefore, alloy could be used to interact with the pod
network, however, this is not recommended, as the pod SDK provides additional essential
functionality such as `wait_past_perfect_time`, which integrate pod-specific features. Additionally,
using alloy directly may lead to unexpected behavior when waiting for transaction confirmations or
fetching blocks.

! content end

! content empty
