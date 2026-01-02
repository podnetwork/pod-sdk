import type { Meta, StoryObj } from "@storybook/react";
import { RequestDuration } from "../src/components/request-duration/index.js";

const meta: Meta<typeof RequestDuration.Root> = {
  title: "Components/RequestDuration",
  component: RequestDuration.Root,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "RequestDuration compound component for displaying transaction timing information with optional breakdown.",
      },
    },
  },
  argTypes: {
    durationMs: {
      control: { type: "number", min: 0, max: 60000 },
      description: "Duration in milliseconds",
    },
    isOngoing: {
      control: "boolean",
      description: "Whether the request is still in progress",
    },
  },
};

export default meta;
type Story = StoryObj<typeof RequestDuration.Root>;

/**
 * Default duration display in sub-second range.
 */
export const Default: Story = {
  args: {
    durationMs: 1500,
  },
  render: (args) => (
    <RequestDuration.Root {...args}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span>Completed in</span>
        <RequestDuration.Value style={{ fontWeight: "bold", color: "#4caf50" }} />
      </div>
    </RequestDuration.Root>
  ),
};

/**
 * Fast response in milliseconds.
 */
export const Milliseconds: Story = {
  args: {
    durationMs: 150,
  },
  render: (args) => (
    <RequestDuration.Root {...args}>
      <div
        style={{
          padding: "12px 16px",
          background: "#e8f5e9",
          borderRadius: "4px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <span style={{ color: "#4caf50" }}>⚡</span>
        <span>Fast response:</span>
        <RequestDuration.Value style={{ fontWeight: "bold" }} />
      </div>
    </RequestDuration.Root>
  ),
};

/**
 * Longer duration in seconds.
 */
export const Seconds: Story = {
  args: {
    durationMs: 3750,
  },
  render: (args) => (
    <RequestDuration.Root {...args}>
      <div style={{ fontFamily: "monospace" }}>
        Duration: <RequestDuration.Value />
      </div>
    </RequestDuration.Root>
  ),
};

/**
 * Very long duration in minutes.
 */
export const Minutes: Story = {
  args: {
    durationMs: 125000,
  },
  render: (args) => (
    <RequestDuration.Root {...args}>
      <div style={{ fontFamily: "monospace" }}>
        Total time: <RequestDuration.Value />
      </div>
    </RequestDuration.Root>
  ),
};

/**
 * Ongoing request with animated indicator.
 */
export const Ongoing: Story = {
  args: {
    durationMs: 0,
    isOngoing: true,
  },
  render: (args) => (
    <RequestDuration.Root {...args}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "12px",
          background: "#fff3e0",
          borderRadius: "4px",
        }}
      >
        <span style={{ animation: "spin 1s linear infinite" }}>⏳</span>
        <span>Processing</span>
        <RequestDuration.Value style={{ color: "#ff9800" }} />
      </div>
    </RequestDuration.Root>
  ),
};

/**
 * With phase breakdown.
 */
export const WithBreakdown: Story = {
  args: {
    durationMs: 1650,
  },
  render: (args) => (
    <RequestDuration.Root {...args}>
      <div style={{ minWidth: "250px" }}>
        <div style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontWeight: "bold" }}>Total Duration</span>
          <RequestDuration.Value style={{ fontWeight: "bold", color: "#1976d2" }} />
        </div>
        <RequestDuration.Breakdown
          phases={[
            { name: "Network", durationMs: 50 },
            { name: "Attestation", durationMs: 800 },
            { name: "Finalization", durationMs: 800 },
          ]}
          style={{
            fontSize: "13px",
            color: "#666",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        />
      </div>
    </RequestDuration.Root>
  ),
};

/**
 * Custom breakdown rendering.
 */
export const CustomBreakdown: Story = {
  args: {
    durationMs: 2500,
  },
  render: (args) => {
    const phases = [
      { name: "RPC Call", durationMs: 100, color: "#2196f3" },
      { name: "Attestation", durationMs: 1000, color: "#ff9800" },
      { name: "Finalization", durationMs: 1400, color: "#4caf50" },
    ];
    const total = phases.reduce((sum, p) => sum + p.durationMs, 0);

    return (
      <RequestDuration.Root {...args}>
        <div style={{ minWidth: "300px" }}>
          <div style={{ marginBottom: "12px" }}>
            <strong>Request Timeline</strong>
          </div>
          <div
            style={{
              display: "flex",
              height: "24px",
              borderRadius: "4px",
              overflow: "hidden",
              marginBottom: "12px",
            }}
          >
            {phases.map((phase) => (
              <div
                key={phase.name}
                style={{
                  width: `${String((phase.durationMs / total) * 100)}%`,
                  background: phase.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "10px",
                  color: "white",
                  fontWeight: "bold",
                }}
              >
                {phase.name}
              </div>
            ))}
          </div>
          <RequestDuration.Breakdown phases={phases}>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {phases.map((phase) => (
                <div
                  key={phase.name}
                  style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: phase.color,
                      }}
                    />
                    {phase.name}
                  </span>
                  <span style={{ fontFamily: "monospace" }}>{phase.durationMs}ms</span>
                </div>
              ))}
            </div>
          </RequestDuration.Breakdown>
        </div>
      </RequestDuration.Root>
    );
  },
};

/**
 * Compact format toggle.
 */
export const FormatComparison: Story = {
  args: {
    durationMs: 1500,
  },
  render: (args) => (
    <RequestDuration.Root {...args}>
      <div
        style={{ display: "flex", flexDirection: "column", gap: "8px", fontFamily: "monospace" }}
      >
        <div>
          <strong>Compact (default):</strong> <RequestDuration.Value compact={true} />
        </div>
        <div>
          <strong>Verbose:</strong> <RequestDuration.Value compact={false} />
        </div>
      </div>
    </RequestDuration.Root>
  ),
};

/**
 * Data attributes for CSS styling.
 */
export const StyledWithDataAttributes: Story = {
  args: {
    durationMs: 500,
  },
  render: (args) => (
    <div>
      <style>{`
        .duration-root[data-ongoing="true"] {
          background: #fff3e0;
          border-color: #ff9800;
        }
        .duration-value[data-compact="true"] {
          font-family: monospace;
        }
        .duration-root[data-duration-ms] {
          position: relative;
        }
      `}</style>
      <RequestDuration.Root
        {...args}
        className="duration-root"
        style={{
          padding: "16px",
          border: "2px solid #e0e0e0",
          borderRadius: "8px",
        }}
      >
        <RequestDuration.Value className="duration-value" />
      </RequestDuration.Root>
    </div>
  ),
};

/**
 * Speed indicator with color coding.
 */
export const SpeedIndicator: Story = {
  render: () => {
    const durations = [50, 500, 2000, 5000];
    const getSpeedColor = (ms: number) => {
      if (ms < 100) return "#4caf50";
      if (ms < 1000) return "#8bc34a";
      if (ms < 3000) return "#ff9800";
      return "#f44336";
    };
    const getSpeedLabel = (ms: number) => {
      if (ms < 100) return "Instant";
      if (ms < 1000) return "Fast";
      if (ms < 3000) return "Normal";
      return "Slow";
    };

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {durations.map((ms) => (
          <RequestDuration.Root key={ms} durationMs={ms}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px",
                background: "#f5f5f5",
                borderRadius: "4px",
                borderLeft: `4px solid ${getSpeedColor(ms)}`,
              }}
            >
              <span
                style={{
                  padding: "2px 8px",
                  borderRadius: "4px",
                  background: getSpeedColor(ms),
                  color: "white",
                  fontSize: "11px",
                  fontWeight: "bold",
                }}
              >
                {getSpeedLabel(ms)}
              </span>
              <RequestDuration.Value style={{ fontFamily: "monospace" }} />
            </div>
          </RequestDuration.Root>
        ))}
      </div>
    );
  },
};

/**
 * Transaction status card.
 */
export const TransactionStatusCard: Story = {
  args: {
    durationMs: 1234,
    startTime: new Date(Date.now() - 1234),
    endTime: new Date(),
  },
  render: (args) => (
    <RequestDuration.Root {...args}>
      <div
        style={{
          padding: "20px",
          background: "#fff",
          border: "1px solid #e0e0e0",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
          minWidth: "280px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <span style={{ fontSize: "16px", fontWeight: "bold" }}>Transaction Complete</span>
          <span style={{ fontSize: "24px" }}>✓</span>
        </div>
        <div
          style={{
            padding: "16px",
            background: "#f5f5f5",
            borderRadius: "8px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>Execution Time</div>
          <RequestDuration.Value
            style={{ fontSize: "24px", fontWeight: "bold", color: "#1976d2" }}
          />
        </div>
        <RequestDuration.Breakdown
          phases={[
            { name: "Submit", durationMs: 34 },
            { name: "Attest", durationMs: 600 },
            { name: "Finalize", durationMs: 600 },
          ]}
          style={{
            marginTop: "16px",
            fontSize: "12px",
            color: "#888",
          }}
        />
      </div>
    </RequestDuration.Root>
  ),
};

/**
 * Using asChild for custom elements.
 */
export const AsChildPattern: Story = {
  args: {
    durationMs: 850,
  },
  render: (args) => (
    <RequestDuration.Root {...args} asChild>
      <article
        style={{
          padding: "16px",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          borderRadius: "8px",
          color: "white",
        }}
      >
        <h3 style={{ margin: "0 0 8px 0", fontSize: "14px", fontWeight: "normal", opacity: 0.8 }}>
          Finalization Speed
        </h3>
        <RequestDuration.Value style={{ fontSize: "32px", fontWeight: "bold" }} />
      </article>
    </RequestDuration.Root>
  ),
};
