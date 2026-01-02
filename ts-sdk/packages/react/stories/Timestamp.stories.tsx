import type { Meta, StoryObj } from "@storybook/react";
import { Timestamp } from "../src/components/timestamp/index.js";

const NOW = Date.now();
const ONE_MINUTE_AGO = NOW - 60 * 1000;
const ONE_HOUR_AGO = NOW - 60 * 60 * 1000;
const ONE_DAY_AGO = NOW - 24 * 60 * 60 * 1000;
const ONE_WEEK_AGO = NOW - 7 * 24 * 60 * 60 * 1000;

const meta: Meta<typeof Timestamp.Root> = {
  title: "Components/Timestamp",
  component: Timestamp.Root,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Timestamp compound component for displaying times in relative and absolute formats with timezone handling.",
      },
    },
  },
  argTypes: {
    value: {
      control: "date",
      description: "Unix timestamp in milliseconds or Date object",
    },
    format: {
      control: { type: "select" },
      options: ["relative", "absolute", "both"],
      description: "Display format",
    },
    locale: {
      control: "text",
      description: "Locale for formatting",
    },
  },
};

export default meta;
type Story = StoryObj<typeof Timestamp.Root>;

/**
 * Default relative timestamp.
 */
export const Default: Story = {
  args: {
    value: ONE_MINUTE_AGO,
  },
  render: (args) => (
    <Timestamp.Root {...args}>
      <Timestamp.Relative />
    </Timestamp.Root>
  ),
};

/**
 * Various relative times.
 */
export const RelativeTimes: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div>
        <strong>Just now:</strong>{" "}
        <Timestamp.Root value={NOW - 5000}>
          <Timestamp.Relative />
        </Timestamp.Root>
      </div>
      <div>
        <strong>1 minute ago:</strong>{" "}
        <Timestamp.Root value={ONE_MINUTE_AGO}>
          <Timestamp.Relative />
        </Timestamp.Root>
      </div>
      <div>
        <strong>1 hour ago:</strong>{" "}
        <Timestamp.Root value={ONE_HOUR_AGO}>
          <Timestamp.Relative />
        </Timestamp.Root>
      </div>
      <div>
        <strong>1 day ago:</strong>{" "}
        <Timestamp.Root value={ONE_DAY_AGO}>
          <Timestamp.Relative />
        </Timestamp.Root>
      </div>
      <div>
        <strong>1 week ago:</strong>{" "}
        <Timestamp.Root value={ONE_WEEK_AGO}>
          <Timestamp.Relative />
        </Timestamp.Root>
      </div>
    </div>
  ),
};

/**
 * Absolute timestamp display.
 */
export const AbsoluteTime: Story = {
  args: {
    value: ONE_HOUR_AGO,
  },
  render: (args) => (
    <Timestamp.Root {...args}>
      <Timestamp.Absolute />
    </Timestamp.Root>
  ),
};

/**
 * Different date/time styles.
 */
export const DateTimeStyles: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div>
        <strong>Short:</strong>{" "}
        <Timestamp.Root value={ONE_DAY_AGO}>
          <Timestamp.Absolute dateStyle="short" timeStyle="short" />
        </Timestamp.Root>
      </div>
      <div>
        <strong>Medium:</strong>{" "}
        <Timestamp.Root value={ONE_DAY_AGO}>
          <Timestamp.Absolute dateStyle="medium" timeStyle="medium" />
        </Timestamp.Root>
      </div>
      <div>
        <strong>Long:</strong>{" "}
        <Timestamp.Root value={ONE_DAY_AGO}>
          <Timestamp.Absolute dateStyle="long" timeStyle="long" />
        </Timestamp.Root>
      </div>
      <div>
        <strong>Full:</strong>{" "}
        <Timestamp.Root value={ONE_DAY_AGO}>
          <Timestamp.Absolute dateStyle="full" timeStyle="full" />
        </Timestamp.Root>
      </div>
    </div>
  ),
};

/**
 * Combined relative and absolute display.
 */
export const BothFormats: Story = {
  args: {
    value: ONE_HOUR_AGO,
  },
  render: (args) => (
    <Timestamp.Root {...args} format="both">
      <Timestamp.Relative style={{ fontWeight: "bold" }} />
      <span style={{ color: "#666" }}> (</span>
      <Timestamp.Absolute dateStyle="short" timeStyle="short" style={{ color: "#666" }} />
      <span style={{ color: "#666" }}>)</span>
    </Timestamp.Root>
  ),
};

/**
 * Transaction timestamp display.
 */
export const TransactionTimestamp: Story = {
  render: () => (
    <div
      style={{
        padding: "16px",
        border: "1px solid #ddd",
        borderRadius: "8px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        maxWidth: "400px",
      }}
    >
      <div>
        <div style={{ fontWeight: "bold" }}>Transaction Confirmed</div>
        <Timestamp.Root value={ONE_MINUTE_AGO}>
          <Timestamp.Relative style={{ fontSize: "14px", color: "#666" }} />
        </Timestamp.Root>
      </div>
      <div style={{ textAlign: "right" }}>
        <Timestamp.Root value={ONE_MINUTE_AGO}>
          <Timestamp.Absolute
            dateStyle="short"
            timeStyle="medium"
            style={{ fontSize: "12px", color: "#999" }}
          />
        </Timestamp.Root>
      </div>
    </div>
  ),
};

/**
 * Block timestamp in explorer view.
 */
export const BlockTimestamp: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <style>{`
        .timestamp-hover { transition: all 0.2s; }
        .timestamp-hover .absolute { display: none; }
        .timestamp-hover:hover .relative { display: none; }
        .timestamp-hover:hover .absolute { display: inline; }
      `}</style>
      {[NOW - 12000, ONE_MINUTE_AGO, ONE_HOUR_AGO, ONE_DAY_AGO].map((time, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "8px 12px",
            backgroundColor: i % 2 === 0 ? "#f9f9f9" : "white",
            borderRadius: "4px",
          }}
        >
          <span>Block #{12345678 - i}</span>
          <Timestamp.Root value={time} className="timestamp-hover" style={{ cursor: "pointer" }}>
            <Timestamp.Relative className="relative" />
            <Timestamp.Absolute className="absolute" dateStyle="medium" timeStyle="medium" />
          </Timestamp.Root>
        </div>
      ))}
      <p style={{ fontSize: "12px", color: "#666" }}>Hover over timestamps to see absolute time</p>
    </div>
  ),
};

/**
 * Using bigint timestamps (seconds).
 */
export const BigIntTimestamp: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <p style={{ fontSize: "14px", color: "#666" }}>
        The component accepts bigint timestamps (in seconds, like blockchain timestamps):
      </p>
      <Timestamp.Root value={BigInt(Math.floor(ONE_HOUR_AGO / 1000))}>
        <Timestamp.Relative style={{ fontWeight: "bold" }} />
        <span style={{ color: "#666" }}> - </span>
        <Timestamp.Absolute dateStyle="long" timeStyle="short" style={{ color: "#666" }} />
      </Timestamp.Root>
    </div>
  ),
};

/**
 * Future timestamps.
 */
export const FutureTimestamp: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div>
        <strong>In 5 minutes:</strong>{" "}
        <Timestamp.Root value={NOW + 5 * 60 * 1000}>
          <Timestamp.Relative />
        </Timestamp.Root>
      </div>
      <div>
        <strong>In 1 hour:</strong>{" "}
        <Timestamp.Root value={NOW + 60 * 60 * 1000}>
          <Timestamp.Relative />
        </Timestamp.Root>
      </div>
      <div>
        <strong>In 1 day:</strong>{" "}
        <Timestamp.Root value={NOW + 24 * 60 * 60 * 1000}>
          <Timestamp.Relative />
        </Timestamp.Root>
      </div>
    </div>
  ),
};
