import type { Meta, StoryObj } from "@storybook/react";
import { FinalizationStatus } from "../src/components/finalization-status/index.js";

const SAMPLE_TX_HASH = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

const meta: Meta<typeof FinalizationStatus.Root> = {
  title: "Components/FinalizationStatus",
  component: FinalizationStatus.Root,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "FinalizationStatus compound component for displaying transaction finalization progress with visual indicators.",
      },
    },
  },
  argTypes: {
    hash: {
      control: "text",
      description: "Transaction hash to track",
    },
    enabled: {
      control: "boolean",
      description: "Whether to enable tracking",
    },
    pollingInterval: {
      control: { type: "number", min: 100, max: 5000 },
      description: "Polling interval in ms",
    },
  },
};

export default meta;
type Story = StoryObj<typeof FinalizationStatus.Root>;

/**
 * Default finalization status display.
 */
export const Default: Story = {
  args: {
    hash: SAMPLE_TX_HASH,
  },
  render: (args) => (
    <FinalizationStatus.Root {...args}>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", minWidth: "300px" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <FinalizationStatus.Badge />
          <FinalizationStatus.Percentage />
        </div>
        <div
          style={{ background: "#e0e0e0", borderRadius: "4px", height: "8px", overflow: "hidden" }}
        >
          <FinalizationStatus.Progress style={{ background: "#4caf50", height: "100%" }} />
        </div>
        <div style={{ fontSize: "12px", color: "#666" }}>
          <FinalizationStatus.AttestationCount format="ratio" /> attestations
        </div>
      </div>
    </FinalizationStatus.Root>
  ),
};

/**
 * Complete progress bar with all elements.
 */
export const FullProgressBar: Story = {
  args: {
    hash: SAMPLE_TX_HASH,
  },
  render: (args) => (
    <FinalizationStatus.Root {...args}>
      <div
        style={{
          padding: "16px",
          background: "#f5f5f5",
          borderRadius: "8px",
          minWidth: "350px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
          <span style={{ fontWeight: "bold" }}>Finalization Progress</span>
          <FinalizationStatus.ElapsedTime format="auto" />
        </div>
        <div
          style={{
            background: "#e0e0e0",
            borderRadius: "8px",
            height: "24px",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <FinalizationStatus.Progress
            style={{
              background: "linear-gradient(90deg, #4caf50, #8bc34a)",
              height: "100%",
              transition: "width 0.3s ease",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              fontWeight: "bold",
              fontSize: "12px",
            }}
          >
            <FinalizationStatus.Percentage />
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "8px",
            fontSize: "12px",
          }}
        >
          <FinalizationStatus.Badge />
          <span>
            <FinalizationStatus.AttestationCount format="ratio" /> validators
          </span>
        </div>
      </div>
    </FinalizationStatus.Root>
  ),
};

/**
 * Different finalization stages.
 */
export const Stages: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <style>{`
        .status-badge[data-stage="pending"] { background: #9e9e9e; color: white; }
        .status-badge[data-stage="attesting"] { background: #2196f3; color: white; }
        .status-badge[data-stage="finalizing"] { background: #ff9800; color: white; }
        .status-badge[data-stage="finalized"] { background: #4caf50; color: white; }
        .status-badge[data-stage="failed"] { background: #f44336; color: white; }
      `}</style>
      {(["pending", "attesting", "finalizing", "finalized", "failed"] as const).map((stage) => (
        <div
          key={stage}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "12px",
            background: "#f5f5f5",
            borderRadius: "4px",
          }}
        >
          <span
            className="status-badge"
            data-stage={stage}
            style={{
              padding: "4px 12px",
              borderRadius: "16px",
              fontSize: "12px",
              fontWeight: "bold",
              textTransform: "uppercase",
            }}
          >
            {stage}
          </span>
          <div
            style={{
              flex: 1,
              background: "#e0e0e0",
              height: "8px",
              borderRadius: "4px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width:
                  stage === "pending"
                    ? "0%"
                    : stage === "attesting"
                      ? "45%"
                      : stage === "finalizing"
                        ? "85%"
                        : stage === "finalized"
                          ? "100%"
                          : "30%",
                height: "100%",
                background: stage === "failed" ? "#f44336" : "#4caf50",
                transition: "width 0.3s",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  ),
};

/**
 * Attestation count formats.
 */
export const AttestationCountFormats: Story = {
  args: {
    hash: SAMPLE_TX_HASH,
  },
  render: (args) => (
    <FinalizationStatus.Root {...args}>
      <div
        style={{ display: "flex", flexDirection: "column", gap: "8px", fontFamily: "monospace" }}
      >
        <div>
          <strong>Count only:</strong> <FinalizationStatus.AttestationCount format="count" />
        </div>
        <div>
          <strong>Ratio:</strong> <FinalizationStatus.AttestationCount format="ratio" />
        </div>
      </div>
    </FinalizationStatus.Root>
  ),
};

/**
 * Time formats.
 */
export const TimeFormats: Story = {
  args: {
    hash: SAMPLE_TX_HASH,
  },
  render: (args) => (
    <FinalizationStatus.Root {...args}>
      <div
        style={{ display: "flex", flexDirection: "column", gap: "8px", fontFamily: "monospace" }}
      >
        <div>
          <strong>Auto:</strong> <FinalizationStatus.ElapsedTime format="auto" />
        </div>
        <div>
          <strong>Milliseconds:</strong> <FinalizationStatus.ElapsedTime format="ms" />
        </div>
        <div>
          <strong>Seconds:</strong> <FinalizationStatus.ElapsedTime format="s" />
        </div>
      </div>
    </FinalizationStatus.Root>
  ),
};

/**
 * Custom badge labels.
 */
export const CustomLabels: Story = {
  args: {
    hash: SAMPLE_TX_HASH,
  },
  render: (args) => (
    <FinalizationStatus.Root {...args}>
      <FinalizationStatus.Badge
        labels={{
          pending: "Waiting...",
          attesting: "Collecting signatures",
          finalizing: "Almost there!",
          finalized: "Done!",
          failed: "Error!",
        }}
        style={{
          padding: "8px 16px",
          borderRadius: "4px",
          background: "#e3f2fd",
          color: "#1976d2",
        }}
      />
    </FinalizationStatus.Root>
  ),
};

/**
 * Styled with CSS data attributes.
 */
export const StyledWithDataAttributes: Story = {
  args: {
    hash: SAMPLE_TX_HASH,
  },
  render: (args) => (
    <div>
      <style>{`
        .finalization-root[data-stage="pending"] { border-color: #9e9e9e; }
        .finalization-root[data-stage="attesting"] { border-color: #2196f3; }
        .finalization-root[data-stage="finalizing"] { border-color: #ff9800; }
        .finalization-root[data-stage="finalized"] { border-color: #4caf50; }
        .finalization-root[data-finalized="true"] { background: #e8f5e9; }
        .progress-bar { background: #e0e0e0; }
        .progress-bar[data-stage="attesting"] > div { background: #2196f3; }
        .progress-bar[data-stage="finalizing"] > div { background: #ff9800; }
        .progress-bar[data-finalized="true"] > div { background: #4caf50; }
      `}</style>
      <FinalizationStatus.Root
        {...args}
        className="finalization-root"
        style={{
          padding: "16px",
          border: "2px solid",
          borderRadius: "8px",
          minWidth: "300px",
        }}
      >
        <div style={{ marginBottom: "8px" }}>
          <FinalizationStatus.Badge />
        </div>
        <div
          className="progress-bar"
          style={{ height: "12px", borderRadius: "6px", overflow: "hidden" }}
        >
          <FinalizationStatus.Progress style={{ height: "100%" }}>
            <div style={{ height: "100%", background: "#9e9e9e" }} />
          </FinalizationStatus.Progress>
        </div>
        <div style={{ marginTop: "8px", textAlign: "right", fontSize: "12px" }}>
          <FinalizationStatus.Percentage />
        </div>
      </FinalizationStatus.Root>
    </div>
  ),
};

/**
 * Compact inline display.
 */
export const CompactInline: Story = {
  args: {
    hash: SAMPLE_TX_HASH,
  },
  render: (args) => (
    <FinalizationStatus.Root {...args} asChild>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "4px 8px",
          background: "#f5f5f5",
          borderRadius: "4px",
          fontSize: "12px",
        }}
      >
        <FinalizationStatus.Badge />
        <span>•</span>
        <FinalizationStatus.Percentage />
        <span>•</span>
        <FinalizationStatus.ElapsedTime />
      </span>
    </FinalizationStatus.Root>
  ),
};
