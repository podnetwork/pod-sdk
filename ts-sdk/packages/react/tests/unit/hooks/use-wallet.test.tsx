/**
 * Tests for useWallet hook
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { act, type ReactNode } from "react";
import { WalletProvider } from "../../../src/providers/wallet-provider.js";
import { useWallet, WalletProviderError } from "../../../src/hooks/use-wallet.js";

// Mock wallet packages
vi.mock("@podnetwork/wallet", () => ({
  Wallet: {
    fromPrivateKey: vi.fn(),
    fromMnemonic: vi.fn(),
    generate: vi.fn(),
  },
  Mnemonic: {
    fromPhrase: vi.fn(),
  },
}));

vi.mock("@podnetwork/wallet-browser", () => ({
  BrowserWalletSigner: {
    connect: vi.fn(),
    isAvailable: vi.fn(),
  },
}));

import { Wallet, Mnemonic } from "@podnetwork/wallet";
import { BrowserWalletSigner } from "@podnetwork/wallet-browser";

const wrapper = ({ children }: { children: ReactNode }): React.JSX.Element => (
  <WalletProvider>{children}</WalletProvider>
);

describe("useWallet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("should start with disconnected status", () => {
      const { result } = renderHook(() => useWallet(), { wrapper });

      expect(result.current.status).toBe("disconnected");
      expect(result.current.signer).toBeNull();
      expect(result.current.address).toBeNull();
      expect(result.current.walletType).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it("should have computed values as false initially", () => {
      const { result } = renderHook(() => useWallet(), { wrapper });

      expect(result.current.isConnected).toBe(false);
      expect(result.current.isBrowserWallet).toBe(false);
      expect(result.current.isLocalWallet).toBe(false);
    });
  });

  describe("provider requirement", () => {
    it("should throw WalletProviderError when used outside provider", () => {
      expect(() => {
        renderHook(() => useWallet());
      }).toThrow(WalletProviderError);
    });

    it("should include helpful message in error", () => {
      try {
        renderHook(() => useWallet());
      } catch (error) {
        expect(error).toBeInstanceOf(WalletProviderError);
        expect((error as Error).message).toContain("WalletProvider");
      }
    });
  });

  describe("connect with private key", () => {
    const mockAddress = "0x1234567890abcdef1234567890abcdef12345678";

    beforeEach(() => {
      const mockWallet = {
        getAddress: vi.fn().mockResolvedValue(mockAddress),
      };
      vi.mocked(Wallet.fromPrivateKey).mockReturnValue(mockWallet as never);
    });

    it("should connect with private key", async () => {
      const { result } = renderHook(() => useWallet(), { wrapper });

      await act(async () => {
        await result.current.connect({
          type: "privateKey",
          privateKey: "0xprivatekey",
        });
      });

      expect(result.current.status).toBe("connected");
      expect(result.current.address).toBe(mockAddress);
      expect(result.current.walletType).toBe("local");
      expect(result.current.isConnected).toBe(true);
      expect(result.current.isLocalWallet).toBe(true);
    });

    it("should show connecting state during connection", async () => {
      const { result } = renderHook(() => useWallet(), { wrapper });

      let connectPromise: Promise<void>;
      act(() => {
        connectPromise = result.current.connect({
          type: "privateKey",
          privateKey: "0xprivatekey",
        });
      });

      // Should be connecting
      expect(result.current.status).toBe("connecting");

      await act(async () => {
        await connectPromise;
      });

      expect(result.current.status).toBe("connected");
    });
  });

  describe("connect with mnemonic", () => {
    const mockAddress = "0xabcdef1234567890abcdef1234567890abcdef12";

    beforeEach(() => {
      const mockMnemonic = {};
      const mockWallet = {
        getAddress: vi.fn().mockResolvedValue(mockAddress),
      };
      vi.mocked(Mnemonic.fromPhrase).mockReturnValue(mockMnemonic as never);
      vi.mocked(Wallet.fromMnemonic).mockReturnValue(mockWallet as never);
    });

    it("should connect with mnemonic", async () => {
      const { result } = renderHook(() => useWallet(), { wrapper });

      await act(async () => {
        await result.current.connect({
          type: "mnemonic",
          phrase: "test mnemonic phrase",
        });
      });

      expect(result.current.status).toBe("connected");
      expect(result.current.address).toBe(mockAddress);
      expect(result.current.walletType).toBe("local");
    });

    it("should use default index 0", async () => {
      const { result } = renderHook(() => useWallet(), { wrapper });

      await act(async () => {
        await result.current.connect({
          type: "mnemonic",
          phrase: "test mnemonic phrase",
        });
      });

      expect(Wallet.fromMnemonic).toHaveBeenCalledWith(expect.anything(), 0);
    });

    it("should use custom index when provided", async () => {
      const { result } = renderHook(() => useWallet(), { wrapper });

      await act(async () => {
        await result.current.connect({
          type: "mnemonic",
          phrase: "test mnemonic phrase",
          index: 5,
        });
      });

      expect(Wallet.fromMnemonic).toHaveBeenCalledWith(expect.anything(), 5);
    });
  });

  describe("connect with browser wallet", () => {
    const mockAddress = "0xbrowser1234567890abcdef1234567890abcdef12";

    beforeEach(() => {
      const mockSigner = {
        getAddress: vi.fn().mockResolvedValue(mockAddress),
      };
      vi.mocked(BrowserWalletSigner.connect).mockResolvedValue(mockSigner as never);
    });

    it("should connect with browser wallet", async () => {
      const { result } = renderHook(() => useWallet(), { wrapper });

      await act(async () => {
        await result.current.connect({ type: "browser" });
      });

      expect(result.current.status).toBe("connected");
      expect(result.current.address).toBe(mockAddress);
      expect(result.current.walletType).toBe("browser");
      expect(result.current.isBrowserWallet).toBe(true);
    });
  });

  describe("generate wallet", () => {
    const mockAddress = "0xgenerated1234567890abcdef1234567890abcd";

    beforeEach(() => {
      const mockWallet = {
        getAddress: vi.fn().mockResolvedValue(mockAddress),
      };
      vi.mocked(Wallet.generate).mockReturnValue(mockWallet as never);
    });

    it("should generate new wallet", async () => {
      const { result } = renderHook(() => useWallet(), { wrapper });

      await act(async () => {
        await result.current.generateWallet();
      });

      expect(result.current.status).toBe("connected");
      expect(result.current.address).toBe(mockAddress);
      expect(result.current.walletType).toBe("local");
    });

    it("should call Wallet.generate", async () => {
      const { result } = renderHook(() => useWallet(), { wrapper });

      await act(async () => {
        await result.current.generateWallet();
      });

      expect(Wallet.generate).toHaveBeenCalled();
    });
  });

  describe("disconnect", () => {
    it("should reset state on disconnect", async () => {
      const mockAddress = "0x1234567890abcdef1234567890abcdef12345678";
      const mockWallet = {
        getAddress: vi.fn().mockResolvedValue(mockAddress),
      };
      vi.mocked(Wallet.generate).mockReturnValue(mockWallet as never);

      const { result } = renderHook(() => useWallet(), { wrapper });

      // Connect first
      await act(async () => {
        await result.current.generateWallet();
      });

      expect(result.current.isConnected).toBe(true);

      // Now disconnect
      act(() => {
        result.current.disconnect();
      });

      expect(result.current.status).toBe("disconnected");
      expect(result.current.signer).toBeNull();
      expect(result.current.address).toBeNull();
      expect(result.current.walletType).toBeNull();
      expect(result.current.isConnected).toBe(false);
    });
  });

  describe("error handling", () => {
    it("should handle connection errors", async () => {
      vi.mocked(Wallet.fromPrivateKey).mockImplementation(() => {
        throw new Error("Invalid private key");
      });

      const { result } = renderHook(() => useWallet(), { wrapper });

      await act(async () => {
        await result.current.connect({
          type: "privateKey",
          privateKey: "invalid",
        });
      });

      expect(result.current.status).toBe("error");
      expect(result.current.error).not.toBeNull();
      expect(result.current.error?.message).toContain("Invalid private key");
    });

    it("should set POD error code for generic errors", async () => {
      vi.mocked(Wallet.fromPrivateKey).mockImplementation(() => {
        throw new Error("Something went wrong");
      });

      const { result } = renderHook(() => useWallet(), { wrapper });

      await act(async () => {
        await result.current.connect({
          type: "privateKey",
          privateKey: "invalid",
        });
      });

      expect(result.current.error?.code).toBe("POD_0001");
    });

    it("should map rejection errors to POD user rejected code", async () => {
      vi.mocked(BrowserWalletSigner.connect).mockRejectedValue(
        new Error("User rejected the request")
      );

      const { result } = renderHook(() => useWallet(), { wrapper });

      await act(async () => {
        await result.current.connect({ type: "browser" });
      });

      expect(result.current.error?.code).toBe("POD_4009");
    });
  });

  describe("isBrowserAvailable", () => {
    it("should return true when browser wallet is available", () => {
      vi.mocked(BrowserWalletSigner.isAvailable).mockReturnValue(true);

      const { result } = renderHook(() => useWallet(), { wrapper });

      expect(result.current.isBrowserAvailable()).toBe(true);
    });

    it("should return false when browser wallet is not available", () => {
      vi.mocked(BrowserWalletSigner.isAvailable).mockReturnValue(false);

      const { result } = renderHook(() => useWallet(), { wrapper });

      expect(result.current.isBrowserAvailable()).toBe(false);
    });
  });
});
