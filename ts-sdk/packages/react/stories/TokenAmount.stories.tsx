import type { Meta, StoryObj } from "@storybook/react";
import { TokenAmount } from "../src/components/token-amount/index.js";

const meta: Meta<typeof TokenAmount.Root> = {
  title: "Components/TokenAmount",
  component: TokenAmount.Root,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "TokenAmount compound component for displaying token amounts with decimal formatting and symbol display.",
      },
    },
  },
  argTypes: {
    value: {
      control: "text",
      description: "Amount in wei (smallest unit)",
    },
    decimals: {
      control: { type: "number", min: 0, max: 18 },
      description: "Token decimals (default: 18)",
    },
    symbol: {
      control: "text",
      description: "Token symbol",
    },
    compact: {
      control: "boolean",
      description: "Use compact notation for large numbers",
    },
    maxDecimals: {
      control: { type: "number", min: 0, max: 18 },
      description: "Maximum decimal places to show",
    },
  },
};

export default meta;
type Story = StoryObj<typeof TokenAmount.Root>;

/**
 * Default pETH amount display (1 ETH = 10^18 wei).
 */
export const Default: Story = {
  args: {
    value: 1000000000000000000n, // 1 ETH
    symbol: "pETH",
  },
  render: (args) => (
    <TokenAmount.Root {...args}>
      <TokenAmount.Value />
      <span> </span>
      <TokenAmount.Symbol />
    </TokenAmount.Root>
  ),
};

/**
 * Small fractional amounts.
 */
export const FractionalAmounts: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div>
        <strong>0.5 pETH:</strong>{" "}
        <TokenAmount.Root value={500000000000000000n} symbol="pETH">
          <TokenAmount.Value /> <TokenAmount.Symbol />
        </TokenAmount.Root>
      </div>
      <div>
        <strong>0.001 pETH:</strong>{" "}
        <TokenAmount.Root value={1000000000000000n} symbol="pETH">
          <TokenAmount.Value /> <TokenAmount.Symbol />
        </TokenAmount.Root>
      </div>
      <div>
        <strong>0.0001 pETH:</strong>{" "}
        <TokenAmount.Root value={100000000000000n} symbol="pETH" maxDecimals={4}>
          <TokenAmount.Value /> <TokenAmount.Symbol />
        </TokenAmount.Root>
      </div>
    </div>
  ),
};

/**
 * Large amounts with compact notation.
 */
export const CompactNotation: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div>
        <strong>1,000 pETH (normal):</strong>{" "}
        <TokenAmount.Root value={1000000000000000000000n} symbol="pETH" compact={false}>
          <TokenAmount.Value /> <TokenAmount.Symbol />
        </TokenAmount.Root>
      </div>
      <div>
        <strong>1,000 pETH (compact):</strong>{" "}
        <TokenAmount.Root value={1000000000000000000000n} symbol="pETH" compact>
          <TokenAmount.Value /> <TokenAmount.Symbol />
        </TokenAmount.Root>
      </div>
      <div>
        <strong>1,000,000 pETH (compact):</strong>{" "}
        <TokenAmount.Root value={1000000000000000000000000n} symbol="pETH" compact>
          <TokenAmount.Value /> <TokenAmount.Symbol />
        </TokenAmount.Root>
      </div>
    </div>
  ),
};

/**
 * Different token types with various decimals.
 */
export const DifferentTokenTypes: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div>
        <strong>ETH (18 decimals):</strong>{" "}
        <TokenAmount.Root value={1500000000000000000n} decimals={18} symbol="ETH">
          <TokenAmount.Value /> <TokenAmount.Symbol />
        </TokenAmount.Root>
      </div>
      <div>
        <strong>USDC (6 decimals):</strong>{" "}
        <TokenAmount.Root value={1000000n} decimals={6} symbol="USDC">
          <TokenAmount.Value /> <TokenAmount.Symbol />
        </TokenAmount.Root>
      </div>
      <div>
        <strong>WBTC (8 decimals):</strong>{" "}
        <TokenAmount.Root value={100000000n} decimals={8} symbol="WBTC">
          <TokenAmount.Value /> <TokenAmount.Symbol />
        </TokenAmount.Root>
      </div>
    </div>
  ),
};

/**
 * Value only (no symbol).
 */
export const ValueOnly: Story = {
  args: {
    value: 2500000000000000000n,
    decimals: 18,
  },
  render: (args) => (
    <TokenAmount.Root {...args}>
      <TokenAmount.Value style={{ fontFamily: "monospace", fontSize: "24px" }} />
    </TokenAmount.Root>
  ),
};

/**
 * Wallet balance display.
 */
export const WalletBalance: Story = {
  render: () => (
    <div
      style={{
        padding: "20px",
        borderRadius: "12px",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "white",
        maxWidth: "300px",
      }}
    >
      <div style={{ fontSize: "12px", opacity: 0.8, marginBottom: "4px" }}>Total Balance</div>
      <TokenAmount.Root value={12345678901234567890n} symbol="pETH" maxDecimals={4}>
        <TokenAmount.Value style={{ fontSize: "32px", fontWeight: "bold" }} />
        <span style={{ fontSize: "14px", marginLeft: "8px", opacity: 0.9 }}>
          <TokenAmount.Symbol />
        </span>
      </TokenAmount.Root>
      <div style={{ fontSize: "12px", opacity: 0.7, marginTop: "8px" }}>≈ $24,691.36 USD</div>
    </div>
  ),
};

/**
 * Transaction amount in a send form.
 */
export const TransactionAmount: Story = {
  render: () => (
    <div
      style={{
        padding: "16px",
        border: "1px solid #ddd",
        borderRadius: "8px",
        maxWidth: "320px",
      }}
    >
      <div style={{ marginBottom: "12px" }}>
        <label style={{ fontSize: "12px", color: "#666" }}>Amount to Send</label>
        <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
          <TokenAmount.Root value={5000000000000000000n} symbol="pETH">
            <TokenAmount.Value style={{ fontSize: "28px", fontWeight: "bold" }} />
            <TokenAmount.Symbol style={{ fontSize: "16px", color: "#666" }} />
          </TokenAmount.Root>
        </div>
      </div>
      <div style={{ borderTop: "1px solid #eee", paddingTop: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
          <span style={{ color: "#666" }}>Network Fee</span>
          <TokenAmount.Root value={21000000000000n} symbol="pETH" maxDecimals={6}>
            <TokenAmount.Value />
            <span> </span>
            <TokenAmount.Symbol />
          </TokenAmount.Root>
        </div>
      </div>
    </div>
  ),
};

/**
 * Zero amount display.
 */
export const ZeroAmount: Story = {
  args: {
    value: 0n,
    symbol: "pETH",
  },
  render: (args) => (
    <TokenAmount.Root {...args}>
      <TokenAmount.Value />
      <span> </span>
      <TokenAmount.Symbol />
    </TokenAmount.Root>
  ),
};
