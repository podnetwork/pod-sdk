import type { Meta, StoryObj } from "@storybook/react";
import { TransactionList } from "../src/components/transaction-list/index.js";
import type { Transaction } from "../src/types.js";

const SAMPLE_TRANSACTIONS: Transaction[] = [
  {
    hash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" as Transaction["hash"],
    from: "0x742d35Cc6634C0532925a3b844Bc9e7595f0Ab12" as Transaction["from"],
    to: "0x8ba1f109551bD432803012645Ac136ddd64DBA72" as Transaction["to"],
    value: BigInt("1000000000000000000"),
    nonce: 42,
    gasPrice: BigInt("20000000000"),
    maxFeePerGas: BigInt("25000000000"),
    maxPriorityFeePerGas: BigInt("2000000000"),
    gasLimit: BigInt(21000),
    data: "0x",
    chainId: 1,
  },
  {
    hash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890" as Transaction["hash"],
    from: "0x742d35Cc6634C0532925a3b844Bc9e7595f0Ab12" as Transaction["from"],
    to: "0x9876543210fedcba9876543210fedcba98765432" as Transaction["to"],
    value: BigInt("2500000000000000000"),
    nonce: 43,
    gasPrice: BigInt("22000000000"),
    maxFeePerGas: BigInt("27000000000"),
    maxPriorityFeePerGas: BigInt("2500000000"),
    gasLimit: BigInt(21000),
    data: "0x",
    chainId: 1,
  },
  {
    hash: "0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321" as Transaction["hash"],
    from: "0x111111111111111111111111111111111111111" as Transaction["from"],
    to: "0x222222222222222222222222222222222222222" as Transaction["to"],
    value: BigInt("500000000000000000"),
    nonce: 1,
    gasPrice: BigInt("18000000000"),
    maxFeePerGas: BigInt("22000000000"),
    maxPriorityFeePerGas: BigInt("1500000000"),
    gasLimit: BigInt(50000),
    data: "0xa9059cbb",
    chainId: 1,
  },
];

const meta: Meta<typeof TransactionList.Root> = {
  title: "Components/TransactionList",
  component: TransactionList.Root,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "TransactionList compound component for displaying lists of transactions with loading and empty states.",
      },
    },
  },
  argTypes: {
    transactions: {
      description: "List of transactions to display",
    },
    isLoading: {
      control: "boolean",
      description: "Whether the list is loading",
    },
    hasMore: {
      control: "boolean",
      description: "Whether there are more transactions to load",
    },
  },
};

export default meta;
type Story = StoryObj<typeof TransactionList.Root>;

/**
 * Default transaction list display.
 */
export const Default: Story = {
  args: {
    transactions: SAMPLE_TRANSACTIONS,
  },
  render: (args) => (
    <TransactionList.Root {...args}>
      <div style={{ minWidth: "400px" }}>
        <div style={{ marginBottom: "12px", fontWeight: "bold" }}>
          Transactions (<TransactionList.Count />)
        </div>
        <TransactionList.Item>
          {(tx, index) => (
            <div
              key={tx.hash}
              style={{
                padding: "12px",
                background: index % 2 === 0 ? "#f5f5f5" : "#ffffff",
                borderRadius: "4px",
                marginBottom: "4px",
              }}
            >
              <div style={{ fontFamily: "monospace", fontSize: "12px" }}>
                {tx.hash.slice(0, 10)}...{tx.hash.slice(-8)}
              </div>
              <div style={{ fontSize: "11px", color: "#666", marginTop: "4px" }}>
                {(Number(tx.value) / 1e18).toFixed(4)} ETH
              </div>
            </div>
          )}
        </TransactionList.Item>
      </div>
    </TransactionList.Root>
  ),
};

/**
 * Empty state when no transactions.
 */
export const EmptyState: Story = {
  args: {
    transactions: [],
  },
  render: (args) => (
    <TransactionList.Root {...args}>
      <div style={{ minWidth: "300px" }}>
        <TransactionList.Empty>
          <div
            style={{
              padding: "32px",
              textAlign: "center",
              color: "#666",
              background: "#f9f9f9",
              borderRadius: "8px",
            }}
          >
            <div style={{ fontSize: "32px", marginBottom: "8px" }}>📭</div>
            <div>No transactions found</div>
          </div>
        </TransactionList.Empty>
      </div>
    </TransactionList.Root>
  ),
};

/**
 * Loading state.
 */
export const LoadingState: Story = {
  args: {
    transactions: [],
    isLoading: true,
  },
  render: (args) => (
    <TransactionList.Root {...args}>
      <div style={{ minWidth: "300px" }}>
        <TransactionList.Loading>
          <div
            style={{
              padding: "32px",
              textAlign: "center",
              color: "#666",
              background: "#f9f9f9",
              borderRadius: "8px",
            }}
          >
            <div
              style={{
                fontSize: "24px",
                marginBottom: "8px",
                animation: "spin 1s linear infinite",
              }}
            >
              ⏳
            </div>
            <div>Loading transactions...</div>
          </div>
        </TransactionList.Loading>
        <TransactionList.Empty>
          <div style={{ padding: "32px", textAlign: "center" }}>No transactions</div>
        </TransactionList.Empty>
      </div>
    </TransactionList.Root>
  ),
};

/**
 * With load more indicator.
 */
export const WithHasMore: Story = {
  args: {
    transactions: SAMPLE_TRANSACTIONS.slice(0, 2),
    hasMore: true,
  },
  render: (args) => (
    <TransactionList.Root {...args}>
      <div style={{ minWidth: "400px" }}>
        <div style={{ marginBottom: "12px" }}>
          Showing <TransactionList.Count /> transactions
        </div>
        <TransactionList.Item>
          {(tx) => (
            <div
              key={tx.hash}
              style={{
                padding: "12px",
                background: "#f5f5f5",
                borderRadius: "4px",
                marginBottom: "4px",
                fontFamily: "monospace",
                fontSize: "12px",
              }}
            >
              {tx.hash.slice(0, 18)}...
            </div>
          )}
        </TransactionList.Item>
        <button
          style={{
            marginTop: "12px",
            padding: "8px 16px",
            border: "1px solid #ccc",
            borderRadius: "4px",
            background: "#fff",
            cursor: "pointer",
            width: "100%",
          }}
        >
          Load more
        </button>
      </div>
    </TransactionList.Root>
  ),
};

/**
 * Table-style layout.
 */
export const TableLayout: Story = {
  args: {
    transactions: SAMPLE_TRANSACTIONS,
  },
  render: (args) => (
    <TransactionList.Root {...args}>
      <div style={{ minWidth: "600px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f0f0f0" }}>
              <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #ddd" }}>
                Hash
              </th>
              <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #ddd" }}>
                From
              </th>
              <th style={{ padding: "12px", textAlign: "right", borderBottom: "2px solid #ddd" }}>
                Value
              </th>
            </tr>
          </thead>
          <tbody>
            <TransactionList.Item>
              {(tx) => (
                <tr key={tx.hash} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "12px", fontFamily: "monospace", fontSize: "12px" }}>
                    {tx.hash.slice(0, 10)}...
                  </td>
                  <td style={{ padding: "12px", fontFamily: "monospace", fontSize: "12px" }}>
                    {tx.from?.slice(0, 10)}...
                  </td>
                  <td style={{ padding: "12px", textAlign: "right" }}>
                    {(Number(tx.value) / 1e18).toFixed(4)} ETH
                  </td>
                </tr>
              )}
            </TransactionList.Item>
          </tbody>
          <tfoot>
            <tr style={{ background: "#f9f9f9" }}>
              <td
                colSpan={3}
                style={{ padding: "12px", textAlign: "center", fontSize: "12px", color: "#666" }}
              >
                <TransactionList.Count /> transaction(s)
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </TransactionList.Root>
  ),
};

/**
 * Card-based layout with expanded details.
 */
export const CardLayout: Story = {
  args: {
    transactions: SAMPLE_TRANSACTIONS,
  },
  render: (args) => (
    <TransactionList.Root {...args}>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", minWidth: "400px" }}>
        <TransactionList.Item>
          {(tx) => (
            <div
              key={tx.hash}
              style={{
                padding: "16px",
                background: "#fff",
                border: "1px solid #e0e0e0",
                borderRadius: "8px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
              }}
            >
              <div
                style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}
              >
                <span style={{ fontWeight: "bold", color: "#333" }}>Transaction</span>
                <span style={{ color: "#4caf50", fontWeight: "bold" }}>
                  {(Number(tx.value) / 1e18).toFixed(4)} ETH
                </span>
              </div>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: "11px",
                  color: "#666",
                  wordBreak: "break-all",
                }}
              >
                {tx.hash}
              </div>
              <div
                style={{
                  marginTop: "12px",
                  paddingTop: "12px",
                  borderTop: "1px solid #f0f0f0",
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "12px",
                  color: "#888",
                }}
              >
                <span>Nonce: {tx.nonce}</span>
                <span>Gas: {tx.gasLimit?.toString()}</span>
              </div>
            </div>
          )}
        </TransactionList.Item>
      </div>
    </TransactionList.Root>
  ),
};

/**
 * Using data attributes for styling.
 */
export const StyledWithDataAttributes: Story = {
  args: {
    transactions: SAMPLE_TRANSACTIONS,
  },
  render: (args) => (
    <div>
      <style>{`
        .tx-list[data-state="loading"] { opacity: 0.6; }
        .tx-list[data-count="0"] { border-color: #ff9800; }
        .tx-list[data-has-more="true"]::after {
          content: "More available";
          display: block;
          text-align: center;
          padding: 8px;
          color: #2196f3;
          font-size: 12px;
        }
      `}</style>
      <TransactionList.Root
        {...args}
        className="tx-list"
        style={{
          padding: "16px",
          border: "2px solid #e0e0e0",
          borderRadius: "8px",
          minWidth: "300px",
        }}
      >
        <TransactionList.Item>
          {(tx) => (
            <div key={tx.hash} style={{ padding: "8px", borderBottom: "1px solid #f0f0f0" }}>
              {tx.hash.slice(0, 20)}...
            </div>
          )}
        </TransactionList.Item>
      </TransactionList.Root>
    </div>
  ),
};

/**
 * Compact inline list.
 */
export const CompactList: Story = {
  args: {
    transactions: SAMPLE_TRANSACTIONS,
  },
  render: (args) => (
    <TransactionList.Root {...args} asChild>
      <ul
        style={{
          listStyle: "none",
          padding: "0",
          margin: "0",
          fontFamily: "monospace",
          fontSize: "11px",
        }}
      >
        <TransactionList.Item>
          {(tx, i) => (
            <li
              key={tx.hash}
              style={{
                padding: "4px 0",
                borderBottom: i < SAMPLE_TRANSACTIONS.length - 1 ? "1px dotted #ddd" : "none",
              }}
            >
              {tx.hash.slice(0, 14)}...{tx.hash.slice(-6)}
            </li>
          )}
        </TransactionList.Item>
      </ul>
    </TransactionList.Root>
  ),
};
