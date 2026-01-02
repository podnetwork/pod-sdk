import type { Meta, StoryObj } from "@storybook/react";
import { userEvent, within, expect } from "@storybook/test";
import { Hash } from "../src/components/hash/index.js";

const SAMPLE_TX_HASH = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
const SAMPLE_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";

const meta: Meta<typeof Hash.Root> = {
  title: "Components/Hash",
  component: Hash.Root,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Hash compound component for displaying blockchain hashes with truncation and copy functionality.",
      },
    },
  },
  argTypes: {
    value: {
      control: "text",
      description: "The hash value to display",
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
type Story = StoryObj<typeof Hash.Root>;

/**
 * Default hash display with middle truncation.
 */
export const Default: Story = {
  args: {
    value: SAMPLE_TX_HASH,
    truncate: "middle",
    chars: 6,
  },
  render: (args) => (
    <Hash.Root {...args}>
      <Hash.Truncated />
    </Hash.Root>
  ),
};

/**
 * Hash with copy button.
 * Includes play function for keyboard accessibility testing.
 */
export const WithCopyButton: Story = {
  args: {
    value: SAMPLE_TX_HASH,
    truncate: "middle",
    chars: 6,
  },
  render: (args) => (
    <Hash.Root {...args} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <Hash.Truncated style={{ fontFamily: "monospace" }} />
      <Hash.Copy
        style={{
          cursor: "pointer",
          padding: "4px 8px",
          border: "1px solid #ccc",
          borderRadius: "4px",
        }}
      >
        Copy
      </Hash.Copy>
    </Hash.Root>
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
 * Different truncation modes.
 */
export const TruncationModes: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontFamily: "monospace" }}>
      <div>
        <strong>Start:</strong>{" "}
        <Hash.Root value={SAMPLE_TX_HASH} truncate="start" chars={8}>
          <Hash.Truncated />
        </Hash.Root>
      </div>
      <div>
        <strong>Middle:</strong>{" "}
        <Hash.Root value={SAMPLE_TX_HASH} truncate="middle" chars={8}>
          <Hash.Truncated />
        </Hash.Root>
      </div>
      <div>
        <strong>End:</strong>{" "}
        <Hash.Root value={SAMPLE_TX_HASH} truncate="end" chars={8}>
          <Hash.Truncated />
        </Hash.Root>
      </div>
      <div>
        <strong>None:</strong>{" "}
        <Hash.Root value={SAMPLE_TX_HASH} truncate="none">
          <Hash.Truncated />
        </Hash.Root>
      </div>
    </div>
  ),
};

/**
 * Show full hash on hover.
 */
export const HoverToReveal: Story = {
  args: {
    value: SAMPLE_TX_HASH,
  },
  render: (args) => (
    <div>
      <style>{`
        .hash-container .hash-full { display: none; }
        .hash-container:hover .hash-truncated { display: none; }
        .hash-container:hover .hash-full { display: inline; }
      `}</style>
      <Hash.Root
        {...args}
        className="hash-container"
        style={{ fontFamily: "monospace", cursor: "pointer" }}
      >
        <Hash.Truncated className="hash-truncated" />
        <Hash.Full className="hash-full" />
      </Hash.Root>
      <p style={{ fontSize: "12px", color: "#666", marginTop: "8px" }}>Hover to reveal full hash</p>
    </div>
  ),
};

/**
 * Ethereum address display.
 */
export const EthereumAddress: Story = {
  args: {
    value: SAMPLE_ADDRESS,
    truncate: "middle",
    chars: 6,
  },
  render: (args) => (
    <Hash.Root {...args} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <Hash.Truncated style={{ fontFamily: "monospace" }} />
      <Hash.Copy>Copy</Hash.Copy>
    </Hash.Root>
  ),
};

/**
 * Copy button states.
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
      <Hash.Root
        value={SAMPLE_TX_HASH}
        style={{ display: "flex", alignItems: "center", gap: "8px" }}
      >
        <Hash.Truncated style={{ fontFamily: "monospace" }} />
        <Hash.Copy className="copy-btn" feedbackDuration={2000}>
          Copy Hash
        </Hash.Copy>
      </Hash.Root>
    </div>
  ),
};

/**
 * Using asChild pattern for custom elements.
 */
export const AsChildPattern: Story = {
  args: {
    value: SAMPLE_TX_HASH,
  },
  render: (args) => (
    <Hash.Root {...args} asChild>
      <a
        href={`https://explorer.example.com/tx/${args.value}`}
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
        <Hash.Truncated />
        <span>↗</span>
      </a>
    </Hash.Root>
  ),
};

/**
 * Variable character lengths.
 */
export const CharacterLengths: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontFamily: "monospace" }}>
      {[4, 6, 8, 10, 12].map((chars) => (
        <div key={chars}>
          <strong>{chars} chars:</strong>{" "}
          <Hash.Root value={SAMPLE_TX_HASH} chars={chars}>
            <Hash.Truncated />
          </Hash.Root>
        </div>
      ))}
    </div>
  ),
};
