! content id="error-handling-rpc"

## Error Handling

Error responses follow the JSON-RPC 2.0 specification.

## Error Codes

| Code    |                        |
| ------- | ---------------------- |
| `32700` | Parse error            |
| `32600` | Invalid Request        |
| `32601` | Method not found       |
| `32602` | Invalid params         |
| `32603` | Internal error         |
| `32000` | Server error (various) |

! content end

! content

! sticky

Error responses follow the JSON-RPC 2.0 specification:

! codeblock title="Error Response"

```json
{
	"jsonrpc": "2.0",
	"error": {
		"code": -32000,
		"message": "Error message"
	},
	"id": 1
}
```

! codeblock end

! sticky end

! content end
