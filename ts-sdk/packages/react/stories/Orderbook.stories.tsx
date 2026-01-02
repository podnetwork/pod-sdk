import type { Meta, StoryObj } from "@storybook/react";
import { Orderbook, useOrderbookContext } from "../src/components/orderbook/index.js";

const SAMPLE_ORDERBOOK_ID =
  "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" as const;

const meta: Meta<typeof Orderbook.Root> = {
  title: "Components/Orderbook",
  component: Orderbook.Root,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Orderbook compound component for displaying bids, asks, and spread with real-time updates.",
      },
    },
  },
  argTypes: {
    orderbookId: {
      control: "text",
      description: "Orderbook identifier (hash)",
    },
    maxLevels: {
      control: { type: "number", min: 1, max: 50 },
      description: "Maximum levels to display",
    },
  },
};

export default meta;
type Story = StoryObj<typeof Orderbook.Root>;

/**
 * Default orderbook display.
 */
export const Default: Story = {
  args: {
    orderbookId: SAMPLE_ORDERBOOK_ID,
    maxLevels: 10,
  },
  render: (args) => (
    <Orderbook.Root {...args}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <div>
          <h4 style={{ margin: "0 0 8px 0", color: "#28a745" }}>Bids</h4>
          <Orderbook.Bids />
        </div>
        <div>
          <h4 style={{ margin: "0 0 8px 0", color: "#dc3545" }}>Asks</h4>
          <Orderbook.Asks />
        </div>
      </div>
    </Orderbook.Root>
  ),
};

/**
 * Orderbook with spread display.
 */
export const WithSpread: Story = {
  args: {
    orderbookId: SAMPLE_ORDERBOOK_ID,
  },
  render: (args) => (
    <Orderbook.Root {...args}>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <Orderbook.Bids />
          <Orderbook.Asks />
        </div>
        <div
          style={{
            textAlign: "center",
            padding: "8px",
            backgroundColor: "#f0f0f0",
            borderRadius: "4px",
          }}
        >
          <span style={{ color: "#666" }}>Spread: </span>
          <Orderbook.Spread style={{ fontWeight: "bold", fontFamily: "monospace" }} />
        </div>
      </div>
    </Orderbook.Root>
  ),
};

/**
 * Best bid/ask display.
 */
export const BestPrices: Story = {
  args: {
    orderbookId: SAMPLE_ORDERBOOK_ID,
  },
  render: (args) => (
    <Orderbook.Root {...args}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16px",
          padding: "16px",
          border: "1px solid #ddd",
          borderRadius: "8px",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>Best Bid</div>
          <Orderbook.BestBid
            style={{
              fontSize: "24px",
              fontWeight: "bold",
              color: "#28a745",
              fontFamily: "monospace",
            }}
          />
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>Best Ask</div>
          <Orderbook.BestAsk
            style={{
              fontSize: "24px",
              fontWeight: "bold",
              color: "#dc3545",
              fontFamily: "monospace",
            }}
          />
        </div>
      </div>
    </Orderbook.Root>
  ),
};

/**
 * Trading interface mockup.
 */
export const TradingInterface: Story = {
  args: {
    orderbookId: SAMPLE_ORDERBOOK_ID,
    maxLevels: 8,
  },
  render: (args) => (
    <div
      style={{
        padding: "16px",
        backgroundColor: "#1a1a2e",
        color: "white",
        borderRadius: "8px",
        maxWidth: "500px",
      }}
    >
      <style>{`
        .ob-bids { color: #00ff88; }
        .ob-asks { color: #ff4757; }
        .ob-header { font-size: 11px; color: #888; margin-bottom: 8px; }
        .ob-row { display: flex; justify-content: space-between; font-family: monospace; font-size: 13px; padding: 2px 0; }
      `}</style>
      <Orderbook.Root {...args}>
        <div style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: "14px", marginBottom: "8px" }}>Order Book</div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "12px",
              color: "#888",
            }}
          >
            <span>
              Depth: <Orderbook.Depth />
            </span>
            <Orderbook.Spread style={{ color: "#ffd32a" }} />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          <div>
            <div className="ob-header">BIDS</div>
            <Orderbook.Bids className="ob-bids" />
          </div>
          <div>
            <div className="ob-header">ASKS</div>
            <Orderbook.Asks className="ob-asks" />
          </div>
        </div>
      </Orderbook.Root>
    </div>
  ),
};

/**
 * Connection state display.
 */
export const ConnectionStates: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <style>{`
        .connection-indicator { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 4px; }
        .connection-indicator[data-connection="connecting"] { background: #fff3cd; }
        .connection-indicator[data-connection="connected"] { background: #d4edda; }
        .connection-indicator[data-connection="disconnected"] { background: #f8d7da; }
        .connection-indicator[data-connection="error"] { background: #f8d7da; }
      `}</style>
      <p style={{ fontSize: "14px", color: "#666" }}>
        Connection state is exposed via <code>data-connection</code> attribute:
      </p>
      <div className="connection-indicator" data-connection="connecting">
        <span>🔄</span> Connecting...
      </div>
      <div className="connection-indicator" data-connection="connected">
        <span>🟢</span> Connected
      </div>
      <div className="connection-indicator" data-connection="disconnected">
        <span>🔴</span> Disconnected
      </div>
      <div className="connection-indicator" data-connection="error">
        <span>⚠️</span> Error
      </div>
    </div>
  ),
};

/**
 * Compact orderbook display.
 */
export const CompactDisplay: Story = {
  args: {
    orderbookId: SAMPLE_ORDERBOOK_ID,
    maxLevels: 5,
  },
  render: (args) => (
    <Orderbook.Root {...args}>
      <div
        style={{
          display: "inline-flex",
          gap: "16px",
          padding: "12px",
          border: "1px solid #ddd",
          borderRadius: "6px",
          fontSize: "13px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: "#28a745" }}>Bid:</span>
          <Orderbook.BestBid style={{ fontFamily: "monospace", fontWeight: "bold" }} />
        </div>
        <span style={{ color: "#999" }}>|</span>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: "#dc3545" }}>Ask:</span>
          <Orderbook.BestAsk style={{ fontFamily: "monospace", fontWeight: "bold" }} />
        </div>
        <span style={{ color: "#999" }}>|</span>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: "#666" }}>Spread:</span>
          <Orderbook.Spread style={{ fontFamily: "monospace" }} />
        </div>
      </div>
    </Orderbook.Root>
  ),
};

/**
 * Accessing orderbook context.
 */
function OrderbookInfo() {
  const ctx = useOrderbookContext("OrderbookInfo");
  return (
    <div style={{ fontSize: "12px", color: "#666" }}>
      <div>Orderbook ID: {ctx.orderbookId.slice(0, 10)}...</div>
      <div>Bids: {ctx.bids.length} levels</div>
      <div>Asks: {ctx.asks.length} levels</div>
      <div>Best Bid: {ctx.bestBid?.toString() ?? "N/A"}</div>
      <div>Best Ask: {ctx.bestAsk?.toString() ?? "N/A"}</div>
      <div>Loading: {ctx.isLoading ? "yes" : "no"}</div>
    </div>
  );
}

export const ContextAccess: Story = {
  args: {
    orderbookId: SAMPLE_ORDERBOOK_ID,
  },
  render: (args) => (
    <Orderbook.Root {...args}>
      <div style={{ padding: "16px", border: "1px solid #ddd", borderRadius: "8px" }}>
        <p style={{ marginBottom: "12px" }}>
          Child components can access orderbook context via <code>useOrderbookContext</code>:
        </p>
        <OrderbookInfo />
      </div>
    </Orderbook.Root>
  ),
};

/**
 * Loading state.
 */
export const LoadingState: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <style>{`
        .ob-loading[data-state="loading"] { opacity: 0.5; pointer-events: none; }
        .ob-loading[data-state="loading"]::after { content: "Loading..."; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); }
      `}</style>
      <div
        className="ob-loading"
        data-state="loading"
        style={{
          padding: "32px",
          border: "1px solid #ddd",
          borderRadius: "8px",
          textAlign: "center",
          position: "relative",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "16px",
            filter: "blur(2px)",
          }}
        >
          <div>
            <div style={{ height: "20px", background: "#eee", marginBottom: "4px" }} />
            <div style={{ height: "20px", background: "#eee", marginBottom: "4px" }} />
            <div style={{ height: "20px", background: "#eee" }} />
          </div>
          <div>
            <div style={{ height: "20px", background: "#eee", marginBottom: "4px" }} />
            <div style={{ height: "20px", background: "#eee", marginBottom: "4px" }} />
            <div style={{ height: "20px", background: "#eee" }} />
          </div>
        </div>
      </div>
    </div>
  ),
};
