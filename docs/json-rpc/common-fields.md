---
layout: simple
---

! content id="common-fields"

## Common Response Fields

All successful responses include:

! table style1
| Field          | Description                                                     |
| -------------- | --------------------------------------------------------------- |
| `jsonrpc`      | Always "2.0"                                                    |
| `id`           | The request ID                                                  |
| `result`       | The method-specific response data                               |
| `pod_metadata` | Additional POD-specific information (location varies by method) |
! table end

! content end

! content

! sticky

Parameters must match the JSON-RPC 2.0 specification.

! codeblock title="Parameters"

```json
{
	"jsonrpc": "2.0",
	"method": "method_name",
	"params": [],
	"id": 1
}
```

! codeblock end

! sticky end

! content end
