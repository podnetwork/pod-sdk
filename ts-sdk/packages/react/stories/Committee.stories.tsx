import type { Meta, StoryObj } from "@storybook/react";
import { Committee } from "../src/components/committee/index.js";
import type { Validator } from "../src/types.js";
import type { Address } from "@podnetwork/core";

// Helper to create sample public keys (128 chars hex without 04 prefix)
const makePubKey = (seed: number): string => seed.toString(16).padStart(128, "0");

// Sample validators data
const SAMPLE_VALIDATORS: Validator[] = Array.from({ length: 5 }, (_, i) => ({
  index: i,
  publicKey: makePubKey(i + 1),
  address: `0x${(i + 1).toString().padStart(40, "0")}` as Address,
}));

const LARGE_COMMITTEE: Validator[] = Array.from({ length: 100 }, (_, i) => ({
  index: i,
  publicKey: makePubKey(i + 1),
  address: `0x${(i + 1).toString(16).padStart(40, "0")}` as Address,
}));

const meta: Meta<typeof Committee.Root> = {
  title: "Components/Committee",
  component: Committee.Root,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Committee compound component for displaying pod network committee information including validators and quorum sizes.",
      },
    },
  },
  argTypes: {
    validators: {
      control: false,
      description: "List of validators in the committee",
    },
    quorumSize: {
      control: { type: "number" },
      description: "Required quorum size (n - f)",
    },
    lowQuorumSize: {
      control: { type: "number" },
      description: "Low quorum size (n - 3f)",
    },
    solverQuorumSize: {
      control: { type: "number" },
      description: "Solver quorum size (n - 2f)",
    },
    isLoading: {
      control: { type: "boolean" },
      description: "Whether data is loading",
    },
  },
};

export default meta;
type Story = StoryObj<typeof Committee.Root>;

/**
 * Default committee display showing basic info.
 */
export const Default: Story = {
  args: {
    validators: SAMPLE_VALIDATORS,
    quorumSize: 4,
    lowQuorumSize: 2,
    solverQuorumSize: 3,
  },
  render: (args) => (
    <Committee.Root {...args}>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div>
          Committee Size: <Committee.TotalValidators />
        </div>
        <div>
          Quorum Required: <Committee.QuorumSize />
        </div>
      </div>
    </Committee.Root>
  ),
};

/**
 * Display with custom validator rendering.
 */
export const WithValidators: Story = {
  args: {
    validators: SAMPLE_VALIDATORS,
    quorumSize: 4,
  },
  render: (args) => (
    <Committee.Root {...args}>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <div style={{ borderBottom: "1px solid #eee", paddingBottom: "8px" }}>
          <strong>Committee Info</strong>
          <div>
            Size: <Committee.TotalValidators /> validators
          </div>
          <div>
            Quorum: <Committee.QuorumSize /> required
          </div>
        </div>
        <div>
          <strong>Validators</strong>
          <Committee.Validators
            style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "8px" }}
            renderValidator={(validator) => (
              <div
                key={validator.index}
                style={{
                  padding: "8px",
                  background: "#f5f5f5",
                  borderRadius: "4px",
                  fontFamily: "monospace",
                  fontSize: "12px",
                }}
              >
                #{validator.index}: {validator.address.slice(0, 10)}...{validator.address.slice(-8)}
              </div>
            )}
          />
        </div>
      </div>
    </Committee.Root>
  ),
};

/**
 * Large committee showing quorum calculation.
 */
export const LargeCommittee: Story = {
  args: {
    validators: LARGE_COMMITTEE,
    quorumSize: 67,
    lowQuorumSize: 34,
    solverQuorumSize: 50,
  },
  render: (args) => (
    <Committee.Root {...args}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "16px",
          padding: "16px",
          background: "#f9f9f9",
          borderRadius: "8px",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "24px", fontWeight: "bold" }}>
            <Committee.TotalValidators />
          </div>
          <div style={{ fontSize: "12px", color: "#666" }}>Total Validators</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "24px", fontWeight: "bold" }}>
            <Committee.QuorumSize />
          </div>
          <div style={{ fontSize: "12px", color: "#666" }}>Quorum Required</div>
        </div>
      </div>
    </Committee.Root>
  ),
};

/**
 * Loading state.
 */
export const Loading: Story = {
  args: {
    validators: [],
    isLoading: true,
  },
  render: (args) => (
    <Committee.Root {...args}>
      <div
        data-state="loading"
        style={{
          padding: "16px",
          background: "#f5f5f5",
          borderRadius: "8px",
          textAlign: "center",
        }}
      >
        Loading committee info...
      </div>
    </Committee.Root>
  ),
};

/**
 * Custom quorum size override.
 */
export const CustomQuorum: Story = {
  args: {
    validators: SAMPLE_VALIDATORS,
    quorumSize: 3,
    lowQuorumSize: 1,
    solverQuorumSize: 2,
  },
  render: (args) => (
    <Committee.Root {...args}>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div>
          Total Validators: <Committee.TotalValidators />
        </div>
        <div>
          Quorum Size (n - f): <Committee.QuorumSize />
        </div>
      </div>
    </Committee.Root>
  ),
};

/**
 * Styled with CSS data attributes.
 */
export const StyledWithDataAttributes: Story = {
  args: {
    validators: SAMPLE_VALIDATORS,
    quorumSize: 4,
  },
  render: (args) => (
    <div>
      <style>{`
        .committee-root[data-state="loading"] {
          opacity: 0.5;
        }
        .committee-root[data-state="success"] {
          border: 2px solid #28a745;
        }
        .committee-root[data-committee-size="5"] {
          background: #e8f5e9;
        }
      `}</style>
      <Committee.Root
        {...args}
        className="committee-root"
        style={{ padding: "16px", borderRadius: "8px" }}
      >
        <div>
          Committee Size: <Committee.TotalValidators />
        </div>
        <div>
          Quorum: <Committee.QuorumSize />
        </div>
        <p style={{ fontSize: "12px", color: "#666", marginTop: "8px" }}>
          This component uses data-state and data-committee-size for CSS styling.
        </p>
      </Committee.Root>
    </div>
  ),
};

/**
 * Empty committee state.
 */
export const EmptyCommittee: Story = {
  args: {
    validators: [],
    quorumSize: undefined,
  },
  render: (args) => (
    <Committee.Root {...args}>
      <div style={{ padding: "16px", textAlign: "center", color: "#666" }}>
        <div>
          Total: <Committee.TotalValidators /> validators
        </div>
        <div>
          Quorum: <Committee.QuorumSize />
        </div>
        <p style={{ marginTop: "8px", fontSize: "12px" }}>No committee data available</p>
      </div>
    </Committee.Root>
  ),
};
