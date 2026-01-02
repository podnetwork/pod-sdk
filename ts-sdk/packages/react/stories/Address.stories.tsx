import type { Meta, StoryObj } from "@storybook/react";
import { userEvent, within, expect } from "@storybook/test";
import { Address } from "../src/components/address/index.js";

const SAMPLE_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678" as const;
const VITALIK_ADDRESS = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" as const;

const meta: Meta<typeof Address.Root> = {
  title: "Components/Address",
  component: Address.Root,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Address compound component for displaying Ethereum addresses with truncation and copy functionality.",
      },
    },
  },
  argTypes: {
    value: {
      control: "text",
      description: "The Ethereum address to display",
    },
    truncate: {
      control: { type: "select" },
      options: ["start", "middle", "end", "none"],
      description: "Truncation mode",
    },
    chars: {
      control: { type: "number", min: 1, max: 20 },
      description: "Number of characters to show at start/end",
    },
  },
};

export default meta;
type Story = StoryObj<typeof Address.Root>;

/**
 * Default address display with middle truncation.
 */
export const Default: Story = {
  args: {
    value: SAMPLE_ADDRESS,
    truncate: "middle",
    chars: 6,
  },
  render: (args) => (
    <Address.Root {...args}>
      <Address.Truncated />
    </Address.Root>
  ),
};

/**
 * Address with copy button.
 * Includes play function for keyboard accessibility testing.
 */
export const WithCopyButton: Story = {
  args: {
    value: SAMPLE_ADDRESS,
    truncate: "middle",
    chars: 6,
  },
  render: (args) => (
    <Address.Root {...args} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <Address.Truncated style={{ fontFamily: "monospace" }} />
      <Address.Copy
        style={{
          cursor: "pointer",
          padding: "4px 8px",
          border: "1px solid #ccc",
          borderRadius: "4px",
        }}
      >
        Copy
      </Address.Copy>
    </Address.Root>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const copyButton = canvas.getByRole("button", { name: /copy/i });

    // Test keyboard navigation
    await userEvent.tab();
    await expect(copyButton).toHaveFocus();

    // Test keyboard activation
    await userEvent.keyboard("{Enter}");
    await expect(copyButton).toHaveAttribute("data-state", "copied");

    // Wait for feedback to reset
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await expect(copyButton).toHaveAttribute("data-state", "idle");
  },
};

/**
 * Different truncation modes for addresses.
 */
export const TruncationModes: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontFamily: "monospace" }}>
      <div>
        <strong>Start:</strong>{" "}
        <Address.Root value={SAMPLE_ADDRESS} truncate="start" chars={8}>
          <Address.Truncated />
        </Address.Root>
      </div>
      <div>
        <strong>Middle:</strong>{" "}
        <Address.Root value={SAMPLE_ADDRESS} truncate="middle" chars={8}>
          <Address.Truncated />
        </Address.Root>
      </div>
      <div>
        <strong>End:</strong>{" "}
        <Address.Root value={SAMPLE_ADDRESS} truncate="end" chars={8}>
          <Address.Truncated />
        </Address.Root>
      </div>
      <div>
        <strong>None:</strong>{" "}
        <Address.Root value={SAMPLE_ADDRESS} truncate="none">
          <Address.Truncated />
        </Address.Root>
      </div>
    </div>
  ),
};

/**
 * Well-known address (Vitalik's).
 */
export const WellKnownAddress: Story = {
  args: {
    value: VITALIK_ADDRESS,
    truncate: "middle",
    chars: 6,
  },
  render: (args) => (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <span style={{ fontSize: "16px" }}>👤</span>
      <Address.Root {...args} style={{ fontFamily: "monospace" }}>
        <Address.Truncated />
      </Address.Root>
      <span style={{ color: "#666", fontSize: "12px" }}>vitalik.eth</span>
    </div>
  ),
};

/**
 * Copy button with feedback styling using data-state.
 */
export const CopyButtonStates: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <style>{`
        .copy-btn { padding: 4px 12px; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; }
        .copy-btn[data-state="idle"] { background: white; }
        .copy-btn[data-state="copying"] { background: #eee; cursor: wait; }
        .copy-btn[data-state="copied"] { background: #d4edda; border-color: #28a745; color: #155724; }
        .copy-btn[data-state="error"] { background: #f8d7da; border-color: #dc3545; color: #721c24; }
      `}</style>
      <p>Click the button to copy. The button changes state based on copy result.</p>
      <Address.Root
        value={SAMPLE_ADDRESS}
        style={{ display: "flex", alignItems: "center", gap: "8px" }}
      >
        <Address.Truncated style={{ fontFamily: "monospace" }} />
        <Address.Copy className="copy-btn" feedbackDuration={2000}>
          Copy Address
        </Address.Copy>
      </Address.Root>
    </div>
  ),
};

/**
 * Using asChild pattern for custom elements.
 */
export const AsChildPattern: Story = {
  args: {
    value: SAMPLE_ADDRESS,
  },
  render: (args) => (
    <Address.Root {...args} asChild>
      <a
        href={`https://etherscan.io/address/${args.value}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          fontFamily: "monospace",
          textDecoration: "none",
          color: "#0066cc",
        }}
      >
        <Address.Truncated />
        <span>↗</span>
      </a>
    </Address.Root>
  ),
};

/**
 * Address in a wallet-like display.
 */
export const WalletDisplay: Story = {
  render: () => (
    <div
      style={{
        padding: "16px",
        border: "1px solid #ddd",
        borderRadius: "8px",
        maxWidth: "300px",
        backgroundColor: "#f9f9f9",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            backgroundColor: "#6366f1",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: "18px",
          }}
        >
          🔐
        </div>
        <div>
          <div style={{ fontWeight: "bold" }}>My Wallet</div>
          <Address.Root value={SAMPLE_ADDRESS} truncate="middle" chars={6}>
            <Address.Truncated
              style={{ fontFamily: "monospace", fontSize: "12px", color: "#666" }}
            />
          </Address.Root>
        </div>
      </div>
      <Address.Root value={SAMPLE_ADDRESS}>
        <Address.Copy
          style={{
            width: "100%",
            padding: "8px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            cursor: "pointer",
            backgroundColor: "white",
          }}
        >
          Copy Full Address
        </Address.Copy>
      </Address.Root>
    </div>
  ),
};
