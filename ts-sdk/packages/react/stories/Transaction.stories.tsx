import type { Meta, StoryObj } from "@storybook/react";
import { Transaction, useTransactionContext } from "../src/components/transaction/index.js";

const SAMPLE_TX_HASH =
  "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" as const;

const meta: Meta<typeof Transaction.Root> = {
  title: "Components/Transaction",
  component: Transaction.Root,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Transaction compound component for displaying transaction details, status, and receipt information.",
      },
    },
  },
  argTypes: {
    hash: {
      control: "text",
      description: "Transaction hash",
    },
  },
};

export default meta;
type Story = StoryObj<typeof Transaction.Root>;

/**
 * Default transaction display with hash.
 */
export const Default: Story = {
  args: {
    hash: SAMPLE_TX_HASH,
  },
  render: (args) => (
    <Transaction.Root {...args}>
      <Transaction.Hash truncate="middle" />
    </Transaction.Root>
  ),
};

/**
 * Transaction with status badge.
 */
export const WithStatus: Story = {
  args: {
    hash: SAMPLE_TX_HASH,
  },
  render: (args) => (
    <Transaction.Root {...args} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
      <Transaction.Hash truncate="middle" style={{ fontFamily: "monospace" }} />
      <Transaction.Status />
    </Transaction.Root>
  ),
};

/**
 * Full transaction card display.
 */
export const TransactionCard: Story = {
  args: {
    hash: SAMPLE_TX_HASH,
  },
  render: (args) => (
    <div
      style={{
        padding: "16px",
        border: "1px solid #ddd",
        borderRadius: "8px",
        maxWidth: "400px",
      }}
    >
      <style>{`
        .tx-status[data-status="pending"] { background: #fff3cd; color: #856404; }
        .tx-status[data-status="attested"] { background: #cce5ff; color: #004085; }
        .tx-status[data-status="finalized"] { background: #d4edda; color: #155724; }
        .tx-status[data-status="failed"] { background: #f8d7da; color: #721c24; }
        .tx-status { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
      `}</style>
      <Transaction.Root {...args}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "12px",
          }}
        >
          <span style={{ fontWeight: "bold" }}>Transaction</span>
          <Transaction.Status className="tx-status" />
        </div>
        <div style={{ marginBottom: "8px" }}>
          <span style={{ fontSize: "12px", color: "#666" }}>Hash</span>
          <Transaction.Hash
            truncate="middle"
            style={{ display: "block", fontFamily: "monospace" }}
          />
        </div>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "14px" }}
        >
          <div>
            <span style={{ fontSize: "12px", color: "#666" }}>From</span>
            <Transaction.From
              style={{ display: "block", fontFamily: "monospace", fontSize: "12px" }}
            />
          </div>
          <div>
            <span style={{ fontSize: "12px", color: "#666" }}>To</span>
            <Transaction.To
              style={{ display: "block", fontFamily: "monospace", fontSize: "12px" }}
            />
          </div>
        </div>
      </Transaction.Root>
    </div>
  ),
};

/**
 * Transaction status variations using data-status.
 */
export const StatusVariations: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <style>{`
        .status-badge[data-status="pending"] { background: #fff3cd; color: #856404; }
        .status-badge[data-status="attested"] { background: #cce5ff; color: #004085; }
        .status-badge[data-status="finalized"] { background: #d4edda; color: #155724; }
        .status-badge[data-status="failed"] { background: #f8d7da; color: #721c24; }
        .status-badge { padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; display: inline-block; }
      `}</style>
      <p style={{ fontSize: "14px", color: "#666" }}>
        Transaction status is exposed via <code>data-status</code> attribute for CSS styling:
      </p>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <span className="status-badge" data-status="pending">
          Pending
        </span>
        <span className="status-badge" data-status="attested">
          Attested
        </span>
        <span className="status-badge" data-status="finalized">
          Finalized
        </span>
        <span className="status-badge" data-status="failed">
          Failed
        </span>
      </div>
    </div>
  ),
};

/**
 * Transaction with value display.
 */
export const WithValue: Story = {
  args: {
    hash: SAMPLE_TX_HASH,
  },
  render: (args) => (
    <Transaction.Root {...args}>
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <Transaction.Hash truncate="middle" style={{ fontFamily: "monospace" }} />
        <span style={{ color: "#666" }}>→</span>
        <Transaction.Value style={{ fontWeight: "bold" }} />
      </div>
    </Transaction.Root>
  ),
};

/**
 * Transaction with gas information.
 */
export const WithGasInfo: Story = {
  args: {
    hash: SAMPLE_TX_HASH,
  },
  render: (args) => (
    <Transaction.Root {...args}>
      <div
        style={{
          padding: "12px",
          border: "1px solid #eee",
          borderRadius: "6px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#666" }}>Gas Used</span>
          <Transaction.GasUsed style={{ fontFamily: "monospace" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#666" }}>Block Number</span>
          <Transaction.BlockNumber style={{ fontFamily: "monospace" }} />
        </div>
      </div>
    </Transaction.Root>
  ),
};

/**
 * Explorer-like transaction row.
 */
export const ExplorerRow: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <style>{`
        .tx-row { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 16px; padding: 12px; align-items: center; }
        .tx-row:nth-child(odd) { background: #f9f9f9; }
        .tx-row-header { font-weight: bold; font-size: 12px; color: #666; }
      `}</style>
      <div className="tx-row tx-row-header">
        <span>Transaction Hash</span>
        <span>Status</span>
        <span>Value</span>
        <span>Block</span>
      </div>
      {[1, 2, 3].map((i) => (
        <Transaction.Root key={i} hash={SAMPLE_TX_HASH} className="tx-row">
          <Transaction.Hash
            truncate="middle"
            style={{ fontFamily: "monospace", fontSize: "13px" }}
          />
          <Transaction.Status />
          <Transaction.Value style={{ fontSize: "13px" }} />
          <Transaction.BlockNumber style={{ fontFamily: "monospace", fontSize: "13px" }} />
        </Transaction.Root>
      ))}
    </div>
  ),
};

/**
 * Loading and error states.
 */
export const LoadingStates: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <style>{`
        .tx-container[data-state="loading"] { opacity: 0.6; }
        .tx-container[data-state="error"] { border-color: #dc3545; }
      `}</style>
      <p style={{ fontSize: "14px", color: "#666" }}>
        Transaction state is exposed via <code>data-state</code> attribute:
      </p>
      <div
        className="tx-container"
        data-state="loading"
        style={{ padding: "16px", border: "1px solid #ddd", borderRadius: "8px" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ animation: "spin 1s linear infinite" }}>⏳</span>
          <span>Loading transaction...</span>
        </div>
      </div>
    </div>
  ),
};

/**
 * Accessing transaction context.
 */
function TransactionDetails() {
  const ctx = useTransactionContext("TransactionDetails");
  return (
    <div style={{ fontSize: "12px", color: "#666" }}>
      <div>Hash: {ctx.hash.slice(0, 10)}...</div>
      <div>Status: {ctx.status ?? "unknown"}</div>
      <div>Loading: {ctx.isLoading ? "yes" : "no"}</div>
    </div>
  );
}

export const ContextAccess: Story = {
  args: {
    hash: SAMPLE_TX_HASH,
  },
  render: (args) => (
    <Transaction.Root {...args}>
      <div style={{ padding: "16px", border: "1px solid #ddd", borderRadius: "8px" }}>
        <p style={{ marginBottom: "12px" }}>
          Child components can access transaction context via <code>useTransactionContext</code>:
        </p>
        <TransactionDetails />
      </div>
    </Transaction.Root>
  ),
};
