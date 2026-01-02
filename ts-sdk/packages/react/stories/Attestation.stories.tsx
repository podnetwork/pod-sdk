import type { Meta, StoryObj } from "@storybook/react";
import { Attestation, AttestationList } from "../src/components/attestation/index.js";
import type { Attestation as AttestationData, Address } from "../src/types.js";

// Sample attestation data
const SAMPLE_ATTESTATION: AttestationData = {
  validator: "0x1234567890abcdef1234567890abcdef12345678" as Address,
  signature:
    "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
  timeOffset: 150,
  blockNumber: BigInt(1234567),
};

const SAMPLE_ATTESTATIONS: AttestationData[] = [
  {
    validator: "0x1111111111111111111111111111111111111111" as Address,
    signature: "0xaaa111222333444555666777888999000aaabbbcccdddeeefff",
    timeOffset: 50,
    blockNumber: BigInt(1234567),
  },
  {
    validator: "0x2222222222222222222222222222222222222222" as Address,
    signature: "0xbbb111222333444555666777888999000aaabbbcccdddeeefff",
    timeOffset: 100,
    blockNumber: BigInt(1234567),
  },
  {
    validator: "0x3333333333333333333333333333333333333333" as Address,
    signature: "0xccc111222333444555666777888999000aaabbbcccdddeeefff",
    timeOffset: 200,
    blockNumber: BigInt(1234567),
  },
  {
    validator: "0x4444444444444444444444444444444444444444" as Address,
    signature: "0xddd111222333444555666777888999000aaabbbcccdddeeefff",
    timeOffset: 350,
    blockNumber: BigInt(1234568),
  },
];

const meta: Meta<typeof Attestation.Root> = {
  title: "Components/Attestation",
  component: Attestation.Root,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Attestation compound components for displaying pod transaction attestations with validator information, timestamps, and signatures.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Attestation.Root>;

/**
 * Default attestation display.
 */
export const Default: Story = {
  args: {
    attestation: SAMPLE_ATTESTATION,
  },
  render: (args) => (
    <Attestation.Root {...args}>
      <div
        style={{ display: "flex", flexDirection: "column", gap: "8px", fontFamily: "monospace" }}
      >
        <div>
          Validator: <Attestation.Validator />
        </div>
        <div>
          Time Offset: <Attestation.Timestamp />
        </div>
        <div>
          Block: <Attestation.BlockNumber />
        </div>
      </div>
    </Attestation.Root>
  ),
};

/**
 * Attestation with signature display.
 */
export const WithSignature: Story = {
  args: {
    attestation: SAMPLE_ATTESTATION,
  },
  render: (args) => (
    <Attestation.Root {...args}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          fontFamily: "monospace",
          padding: "12px",
          background: "#f5f5f5",
          borderRadius: "8px",
        }}
      >
        <div>
          <strong>Validator</strong>
          <div>
            <Attestation.Validator truncate="middle" chars={8} />
          </div>
        </div>
        <div>
          <strong>Signature</strong>
          <div style={{ fontSize: "12px" }}>
            <Attestation.Signature truncate="middle" chars={12} />
          </div>
        </div>
        <div style={{ display: "flex", gap: "16px" }}>
          <div>
            <strong>Time:</strong> <Attestation.Timestamp format="ms" />
          </div>
          <div>
            <strong>Block:</strong> <Attestation.BlockNumber />
          </div>
        </div>
      </div>
    </Attestation.Root>
  ),
};

/**
 * Different timestamp formats.
 */
export const TimestampFormats: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontFamily: "monospace" }}>
      <div>
        <strong>Relative (default):</strong>{" "}
        <Attestation.Root attestation={SAMPLE_ATTESTATION}>
          <Attestation.Timestamp format="relative" />
        </Attestation.Root>
      </div>
      <div>
        <strong>Milliseconds:</strong>{" "}
        <Attestation.Root attestation={SAMPLE_ATTESTATION}>
          <Attestation.Timestamp format="ms" />
        </Attestation.Root>
      </div>
      <div>
        <strong>Seconds:</strong>{" "}
        <Attestation.Root attestation={SAMPLE_ATTESTATION}>
          <Attestation.Timestamp format="s" />
        </Attestation.Root>
      </div>
      <hr style={{ margin: "8px 0" }} />
      <div>
        <strong>Long Duration (2m 30s):</strong>{" "}
        <Attestation.Root attestation={{ ...SAMPLE_ATTESTATION, timeOffset: 150000 }}>
          <Attestation.Timestamp format="relative" />
        </Attestation.Root>
      </div>
    </div>
  ),
};

/**
 * Attestation list display.
 */
export const AttestationListDisplay: Story = {
  render: () => (
    <AttestationList.Root attestations={SAMPLE_ATTESTATIONS}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          padding: "16px",
          background: "#f9f9f9",
          borderRadius: "8px",
          minWidth: "300px",
        }}
      >
        <div style={{ borderBottom: "1px solid #ddd", paddingBottom: "8px", fontWeight: "bold" }}>
          Attestations (<AttestationList.Count />)
        </div>
        <AttestationList.Item>
          {(attestation, index) => (
            <Attestation.Root
              key={index}
              attestation={attestation}
              isFirst={index === 0}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "8px",
                background: index === 0 ? "#e8f5e9" : "white",
                borderRadius: "4px",
                border: "1px solid #eee",
                fontFamily: "monospace",
                fontSize: "12px",
                marginBottom: "8px",
              }}
            >
              <Attestation.Validator truncate="middle" chars={6} />
              <Attestation.Timestamp format="ms" />
            </Attestation.Root>
          )}
        </AttestationList.Item>
      </div>
    </AttestationList.Root>
  ),
};

/**
 * Attestation list with detailed view.
 */
export const DetailedAttestationList: Story = {
  render: () => (
    <AttestationList.Root attestations={SAMPLE_ATTESTATIONS}>
      <div style={{ minWidth: "400px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "12px",
            background: "#333",
            color: "white",
            borderRadius: "8px 8px 0 0",
          }}
        >
          <span>Validator Attestations</span>
          <span>
            <AttestationList.Count /> / 67 required
          </span>
        </div>
        <div
          style={{
            background: "#fff",
            border: "1px solid #ddd",
            borderTop: "none",
            borderRadius: "0 0 8px 8px",
          }}
        >
          <AttestationList.Item>
            {(attestation, index) => (
              <Attestation.Root
                key={index}
                attestation={attestation}
                isFirst={index === 0}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto auto",
                  gap: "16px",
                  padding: "12px",
                  borderBottom: "1px solid #eee",
                  fontFamily: "monospace",
                  fontSize: "13px",
                }}
              >
                <div>
                  <div style={{ color: "#666", fontSize: "10px", marginBottom: "4px" }}>
                    Validator
                  </div>
                  <Attestation.Validator truncate="middle" chars={8} />
                </div>
                <div>
                  <div style={{ color: "#666", fontSize: "10px", marginBottom: "4px" }}>Block</div>
                  <Attestation.BlockNumber />
                </div>
                <div>
                  <div style={{ color: "#666", fontSize: "10px", marginBottom: "4px" }}>Offset</div>
                  <Attestation.Timestamp format="ms" />
                </div>
              </Attestation.Root>
            )}
          </AttestationList.Item>
        </div>
      </div>
    </AttestationList.Root>
  ),
};

/**
 * Loading state for attestation list.
 */
export const Loading: Story = {
  render: () => (
    <AttestationList.Root attestations={[]} isLoading>
      <div
        style={{
          padding: "24px",
          textAlign: "center",
          background: "#f5f5f5",
          borderRadius: "8px",
        }}
      >
        Loading attestations...
      </div>
    </AttestationList.Root>
  ),
};

/**
 * First attestation highlighted.
 */
export const FirstAttestationHighlighted: Story = {
  render: () => (
    <div>
      <style>{`
        .attestation[data-first="true"] {
          background: linear-gradient(to right, #d4edda, #f8f9fa);
          border-left: 3px solid #28a745;
        }
        .attestation[data-first="true"]::before {
          content: "First";
          position: absolute;
          top: 4px;
          right: 4px;
          font-size: 10px;
          background: #28a745;
          color: white;
          padding: 2px 6px;
          border-radius: 4px;
        }
      `}</style>
      <AttestationList.Root attestations={SAMPLE_ATTESTATIONS}>
        <AttestationList.Item>
          {(attestation, index) => (
            <Attestation.Root
              key={index}
              attestation={attestation}
              isFirst={index === 0}
              className="attestation"
              style={{
                position: "relative",
                padding: "12px",
                marginBottom: "8px",
                background: "white",
                borderRadius: "4px",
                border: "1px solid #eee",
                fontFamily: "monospace",
              }}
            >
              <Attestation.Validator truncate="middle" chars={8} />
              <span style={{ margin: "0 8px" }}>|</span>
              <Attestation.Timestamp format="ms" />
            </Attestation.Root>
          )}
        </AttestationList.Item>
      </AttestationList.Root>
    </div>
  ),
};

/**
 * Using asChild pattern.
 */
export const AsChildPattern: Story = {
  args: {
    attestation: SAMPLE_ATTESTATION,
  },
  render: (args) => (
    <Attestation.Root {...args} asChild>
      <article
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          padding: "16px",
          background: "#f0f9ff",
          borderRadius: "8px",
          border: "1px solid #0369a1",
        }}
      >
        <header style={{ fontWeight: "bold", color: "#0369a1" }}>Attestation Details</header>
        <div style={{ fontFamily: "monospace" }}>
          <div>
            Validator: <Attestation.Validator />
          </div>
          <div>
            Time: <Attestation.Timestamp format="relative" />
          </div>
        </div>
      </article>
    </Attestation.Root>
  ),
};
