import type { Meta, StoryObj } from "@storybook/react";
import { AddNetworkButton } from "../src/components/add-network-button/index.js";
import { useAddNetworkButtonContext } from "../src/components/add-network-button/add-network-context.js";
import { POD_DEV_NETWORK, POD_CHRONOS_DEV_NETWORK } from "@podnetwork/wallet-browser";

const meta: Meta<typeof AddNetworkButton.Root> = {
  title: "Components/AddNetworkButton",
  component: AddNetworkButton.Root,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "AddNetworkButton compound component for adding Pod networks to browser wallets (MetaMask, etc.) using EIP-3085.",
      },
    },
  },
  argTypes: {
    network: {
      control: false,
      description: "Network configuration to add. Defaults to POD_DEV_NETWORK.",
    },
    refreshInterval: {
      control: { type: "number", min: 0, step: 1000 },
      description: "Connection status polling interval in ms. Set to 0 to disable.",
    },
  },
};

export default meta;
type Story = StoryObj<typeof AddNetworkButton.Root>;

// =============================================================================
// Mocked Stories (for documentation)
// =============================================================================

/**
 * Default add network button with standard styling.
 */
export const Default: Story = {
  args: {
    network: POD_DEV_NETWORK,
    refreshInterval: 0, // Disable polling for demo
  },
  render: (args) => (
    <AddNetworkButton.Root {...args}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
        <AddNetworkButton.Trigger
          style={{
            padding: "12px 24px",
            backgroundColor: "#6366f1",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "16px",
            fontWeight: 500,
          }}
        >
          Add devnet
        </AddNetworkButton.Trigger>
        <AddNetworkButton.Status style={{ fontSize: "14px", color: "#666" }} />
      </div>
    </AddNetworkButton.Root>
  ),
};

/**
 * Using the Chronos devnet configuration.
 */
export const ChronosNetwork: Story = {
  args: {
    network: POD_CHRONOS_DEV_NETWORK,
    refreshInterval: 0,
  },
  render: (args) => (
    <AddNetworkButton.Root {...args}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
        <AddNetworkButton.Trigger
          style={{
            padding: "12px 24px",
            backgroundColor: "#10b981",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "16px",
            fontWeight: 500,
          }}
        >
          Add Chronos devnet
        </AddNetworkButton.Trigger>
        <AddNetworkButton.Status showNetworkName style={{ fontSize: "14px", color: "#666" }} />
      </div>
    </AddNetworkButton.Root>
  ),
};

/**
 * Button that hides after successfully connecting.
 * Set connectedText to null to completely hide the button when connected.
 */
export const HideWhenConnected: Story = {
  args: {
    network: POD_DEV_NETWORK,
    refreshInterval: 0,
  },
  render: (args) => (
    <AddNetworkButton.Root {...args}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
        <AddNetworkButton.Trigger
          connectedText={null}
          style={{
            padding: "12px 24px",
            backgroundColor: "#6366f1",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          Add devnet
        </AddNetworkButton.Trigger>
        <AddNetworkButton.Status showNetworkName style={{ fontSize: "14px", color: "#10b981" }} />
      </div>
    </AddNetworkButton.Root>
  ),
};

/**
 * Custom status labels for internationalization or branding.
 */
export const CustomLabels: Story = {
  args: {
    network: POD_DEV_NETWORK,
    refreshInterval: 0,
  },
  render: (args) => (
    <AddNetworkButton.Root {...args}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
        <AddNetworkButton.Trigger
          noWalletText="Please Install MetaMask"
          connectedText="You're Connected!"
          style={{
            padding: "12px 24px",
            backgroundColor: "#6366f1",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          Connect to Pod
        </AddNetworkButton.Trigger>
        <AddNetworkButton.Status
          labels={{
            adding: "Connecting to network...",
            success: "Successfully connected!",
            error: "Connection failed",
          }}
          style={{ fontSize: "14px" }}
        />
      </div>
    </AddNetworkButton.Root>
  ),
};

/**
 * Showing the network name in the status message.
 */
export const WithNetworkName: Story = {
  args: {
    network: POD_DEV_NETWORK,
    refreshInterval: 0,
  },
  render: (args) => (
    <AddNetworkButton.Root {...args}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
        <AddNetworkButton.Trigger
          style={{
            padding: "12px 24px",
            backgroundColor: "#6366f1",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          Add Network
        </AddNetworkButton.Trigger>
        <AddNetworkButton.Status showNetworkName style={{ fontSize: "14px", color: "#666" }} />
      </div>
    </AddNetworkButton.Root>
  ),
};

/**
 * Styling with data attributes for different states.
 */
export const DataStatePatterns: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <style>{`
        .add-network-btn {
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 16px;
          font-weight: 500;
          transition: all 0.2s ease;
        }
        .add-network-btn[data-wallet-available="false"] {
          background: #9ca3af;
          color: white;
          cursor: not-allowed;
        }
        .add-network-btn[data-wallet-available="true"][data-adding="false"][data-connected="false"] {
          background: #6366f1;
          color: white;
        }
        .add-network-btn[data-adding="true"] {
          background: #818cf8;
          color: white;
          cursor: wait;
        }
        .add-network-btn[data-connected="true"] {
          background: #10b981;
          color: white;
        }
        .add-network-status {
          font-size: 14px;
          padding: 8px;
          border-radius: 4px;
        }
        .add-network-status[data-status="adding"] {
          color: #6366f1;
          background: #eef2ff;
        }
        .add-network-status[data-status="success"] {
          color: #10b981;
          background: #ecfdf5;
        }
        .add-network-status[data-status="error"] {
          color: #ef4444;
          background: #fef2f2;
        }
      `}</style>
      <p style={{ color: "#666", fontSize: "14px" }}>
        The button and status change styles based on data-* attributes:
      </p>
      <AddNetworkButton.Root network={POD_DEV_NETWORK} refreshInterval={0}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
          <AddNetworkButton.Trigger className="add-network-btn">
            Add devnet
          </AddNetworkButton.Trigger>
          <AddNetworkButton.Status className="add-network-status" />
        </div>
      </AddNetworkButton.Root>
    </div>
  ),
};

/**
 * Using the asChild pattern for custom button elements.
 */
export const AsChildPattern: Story = {
  render: () => (
    <AddNetworkButton.Root network={POD_DEV_NETWORK} refreshInterval={0}>
      <AddNetworkButton.Trigger asChild>
        <button
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px 20px",
            backgroundColor: "white",
            border: "2px solid #6366f1",
            borderRadius: "999px",
            color: "#6366f1",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: 600,
          }}
        >
          <span style={{ fontSize: "18px" }}>+</span>
          Add to Wallet
        </button>
      </AddNetworkButton.Trigger>
    </AddNetworkButton.Root>
  ),
};

/**
 * Accessing context directly for custom components.
 */
function CustomNetworkInfo(): React.JSX.Element {
  const ctx = useAddNetworkButtonContext("CustomNetworkInfo");

  return (
    <div
      style={{
        padding: "16px",
        backgroundColor: "#f8fafc",
        borderRadius: "8px",
        fontFamily: "monospace",
        fontSize: "12px",
      }}
    >
      <div>
        <strong>Network:</strong> {ctx.network.chainName}
      </div>
      <div>
        <strong>Chain ID:</strong> {ctx.network.chainId.toString()}
      </div>
      <div>
        <strong>Status:</strong> {ctx.status}
      </div>
      <div>
        <strong>Wallet Available:</strong> {ctx.isWalletAvailable ? "Yes" : "No"}
      </div>
      <div>
        <strong>Connected:</strong> {ctx.isConnected ? "Yes" : "No"}
      </div>
      {ctx.error != null && (
        <div style={{ color: "#ef4444" }}>
          <strong>Error:</strong> {ctx.error}
        </div>
      )}
    </div>
  );
}

export const ContextAccess: Story = {
  render: () => (
    <AddNetworkButton.Root network={POD_DEV_NETWORK} refreshInterval={0}>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "300px" }}>
        <CustomNetworkInfo />
        <AddNetworkButton.Trigger
          style={{
            padding: "12px 24px",
            backgroundColor: "#6366f1",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          Add Network
        </AddNetworkButton.Trigger>
      </div>
    </AddNetworkButton.Root>
  ),
};

/**
 * Callback handling with console logging.
 */
export const CallbackHandling: Story = {
  render: () => (
    <AddNetworkButton.Root
      network={POD_DEV_NETWORK}
      refreshInterval={0}
      onAddSuccess={(result) => {
        console.log("Network added successfully!", result);
        alert("Network added successfully!");
      }}
      onAddError={(error) => {
        console.error("Failed to add network:", error);
        alert(`Error: ${error}`);
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
        <AddNetworkButton.Trigger
          style={{
            padding: "12px 24px",
            backgroundColor: "#6366f1",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          Add devnet
        </AddNetworkButton.Trigger>
        <AddNetworkButton.Status style={{ fontSize: "14px", color: "#666" }} />
        <p style={{ fontSize: "12px", color: "#999" }}>Check the console for callback logs</p>
      </div>
    </AddNetworkButton.Root>
  ),
};

/**
 * Complete wallet connection card UI.
 */
export const WalletConnectionCard: Story = {
  render: () => (
    <div
      style={{
        padding: "24px",
        border: "1px solid #e2e8f0",
        borderRadius: "16px",
        maxWidth: "360px",
        backgroundColor: "white",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <div
          style={{
            width: "64px",
            height: "64px",
            margin: "0 auto 12px",
            backgroundColor: "#6366f1",
            borderRadius: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "32px",
          }}
        >
          P
        </div>
        <h3 style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: 600 }}>Pod Network</h3>
        <p style={{ margin: 0, fontSize: "14px", color: "#64748b" }}>
          Add the Pod network to your wallet
        </p>
      </div>

      <AddNetworkButton.Root network={POD_DEV_NETWORK} refreshInterval={0}>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "14px",
              padding: "12px",
              backgroundColor: "#f8fafc",
              borderRadius: "8px",
            }}
          >
            <span style={{ color: "#64748b" }}>Network</span>
            <span style={{ fontWeight: 500 }}>devnet</span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "14px",
              padding: "12px",
              backgroundColor: "#f8fafc",
              borderRadius: "8px",
            }}
          >
            <span style={{ color: "#64748b" }}>Chain ID</span>
            <span style={{ fontWeight: 500, fontFamily: "monospace" }}>1293</span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "14px",
              padding: "12px",
              backgroundColor: "#f8fafc",
              borderRadius: "8px",
            }}
          >
            <span style={{ color: "#64748b" }}>Currency</span>
            <span style={{ fontWeight: 500 }}>POD</span>
          </div>

          <AddNetworkButton.Trigger
            style={{
              marginTop: "8px",
              padding: "14px 24px",
              backgroundColor: "#6366f1",
              color: "white",
              border: "none",
              borderRadius: "12px",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: 600,
              width: "100%",
            }}
          >
            Connect Wallet
          </AddNetworkButton.Trigger>

          <AddNetworkButton.Status
            showNetworkName
            style={{ textAlign: "center", fontSize: "14px", color: "#10b981" }}
          />
        </div>
      </AddNetworkButton.Root>
    </div>
  ),
};

// =============================================================================
// Real Wallet Stories (for live testing)
// =============================================================================

/**
 * **Real wallet story** - Test with an actual browser wallet like MetaMask.
 * This story uses no mocking and will interact with your real wallet.
 */
export const RealWallet: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "This story connects to your real browser wallet. Open MetaMask or another EIP-1193 compatible wallet to test.",
      },
    },
  },
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "400px" }}>
      <div
        style={{
          padding: "12px 16px",
          backgroundColor: "#fef3c7",
          borderRadius: "8px",
          fontSize: "14px",
          color: "#92400e",
        }}
      >
        <strong>Live Test:</strong> This will interact with your real browser wallet.
      </div>

      <AddNetworkButton.Root
        network={POD_DEV_NETWORK}
        refreshInterval={5000}
        onAddSuccess={(result) => console.log("Success:", result)}
        onAddError={(error) => console.error("Error:", error)}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <AddNetworkButton.Trigger
            noWalletText="Install MetaMask to Continue"
            connectedText="Connected to devnet"
            style={{
              padding: "14px 28px",
              backgroundColor: "#6366f1",
              color: "white",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: 500,
            }}
          >
            Add devnet
          </AddNetworkButton.Trigger>
          <AddNetworkButton.Status
            showNetworkName
            style={{ textAlign: "center", fontSize: "14px" }}
          />
        </div>
      </AddNetworkButton.Root>
    </div>
  ),
};

/**
 * **Real wallet story** - Test adding the Chronos Dev network.
 */
export const RealWalletChronos: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Test adding Chronos devnet to your real wallet. This is the latest network with CLOB/auction functionality.",
      },
    },
  },
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "400px" }}>
      <div
        style={{
          padding: "12px 16px",
          backgroundColor: "#d1fae5",
          borderRadius: "8px",
          fontSize: "14px",
          color: "#065f46",
        }}
      >
        <strong>Chronos devnet:</strong> Latest network with CLOB/auction features.
      </div>

      <AddNetworkButton.Root
        network={POD_CHRONOS_DEV_NETWORK}
        refreshInterval={5000}
        onAddSuccess={(result) => console.log("Chronos Success:", result)}
        onAddError={(error) => console.error("Chronos Error:", error)}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <AddNetworkButton.Trigger
            noWalletText="Install MetaMask"
            connectedText="Connected to Chronos"
            style={{
              padding: "14px 28px",
              backgroundColor: "#10b981",
              color: "white",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: 500,
            }}
          >
            Add Chronos devnet
          </AddNetworkButton.Trigger>
          <AddNetworkButton.Status
            showNetworkName
            style={{ textAlign: "center", fontSize: "14px" }}
          />
        </div>
      </AddNetworkButton.Root>
    </div>
  ),
};

/**
 * **Real wallet story** - Network switcher with both networks.
 */
export const NetworkSwitcher: Story = {
  parameters: {
    docs: {
      description: {
        story: "Switch between devnet and Chronos devnet with a real wallet.",
      },
    },
  },
  render: () => (
    <div
      style={{
        display: "flex",
        gap: "24px",
        padding: "24px",
        backgroundColor: "#f8fafc",
        borderRadius: "16px",
      }}
    >
      <AddNetworkButton.Root network={POD_DEV_NETWORK} refreshInterval={3000}>
        <div
          style={{
            padding: "20px",
            backgroundColor: "white",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            minWidth: "180px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "24px", marginBottom: "8px" }}>D</div>
          <div style={{ fontWeight: 600, marginBottom: "4px" }}>devnet</div>
          <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "12px" }}>
            Chain ID: 1293
          </div>
          <AddNetworkButton.Trigger
            connectedText="Active"
            style={{
              padding: "8px 16px",
              backgroundColor: "#6366f1",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
              width: "100%",
            }}
          >
            Switch
          </AddNetworkButton.Trigger>
        </div>
      </AddNetworkButton.Root>

      <AddNetworkButton.Root network={POD_CHRONOS_DEV_NETWORK} refreshInterval={3000}>
        <div
          style={{
            padding: "20px",
            backgroundColor: "white",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            minWidth: "180px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "24px", marginBottom: "8px" }}>C</div>
          <div style={{ fontWeight: 600, marginBottom: "4px" }}>Chronos devnet</div>
          <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "12px" }}>
            Chain ID: {POD_CHRONOS_DEV_NETWORK.chainId.toString()}
          </div>
          <AddNetworkButton.Trigger
            connectedText="Active"
            style={{
              padding: "8px 16px",
              backgroundColor: "#10b981",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
              width: "100%",
            }}
          >
            Switch
          </AddNetworkButton.Trigger>
        </div>
      </AddNetworkButton.Root>
    </div>
  ),
};
