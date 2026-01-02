import { describe, it, expect } from "vitest";
import {
  AbiParameterSchema,
  AbiFunctionSchema,
  AbiEventSchema,
  AbiErrorSchema,
  AbiConstructorSchema,
  AbiFallbackSchema,
  AbiReceiveSchema,
  AbiItemSchema,
  AbiSchema,
} from "../../../src/schemas/index.js";

describe("ABI Schemas", () => {
  describe("AbiParameterSchema", () => {
    it("should validate simple parameter", () => {
      const param = { name: "amount", type: "uint256" };
      const result = AbiParameterSchema.parse(param);
      expect(result.name).toBe("amount");
      expect(result.type).toBe("uint256");
    });

    it("should validate parameter with internalType", () => {
      const param = {
        name: "token",
        type: "address",
        internalType: "contract IERC20",
      };
      const result = AbiParameterSchema.parse(param);
      expect(result.internalType).toBe("contract IERC20");
    });

    it("should validate indexed event parameter", () => {
      const param = { name: "from", type: "address", indexed: true };
      const result = AbiParameterSchema.parse(param);
      expect(result.indexed).toBe(true);
    });

    it("should validate tuple parameter with components", () => {
      const param = {
        name: "order",
        type: "tuple",
        components: [
          { name: "maker", type: "address" },
          { name: "amount", type: "uint256" },
        ],
      };
      const result = AbiParameterSchema.parse(param);
      expect(result.components).toHaveLength(2);
      expect(result.components?.[0].name).toBe("maker");
    });

    it("should validate nested tuple parameters", () => {
      const param = {
        name: "complex",
        type: "tuple",
        components: [
          {
            name: "inner",
            type: "tuple",
            components: [{ name: "value", type: "uint256" }],
          },
        ],
      };
      const result = AbiParameterSchema.parse(param);
      expect(result.components?.[0].components?.[0].name).toBe("value");
    });

    it("should reject parameter without name", () => {
      const param = { type: "uint256" };
      expect(() => AbiParameterSchema.parse(param)).toThrow();
    });

    it("should reject parameter without type", () => {
      const param = { name: "amount" };
      expect(() => AbiParameterSchema.parse(param)).toThrow();
    });
  });

  describe("AbiFunctionSchema", () => {
    it("should validate view function", () => {
      const func = {
        type: "function" as const,
        name: "balanceOf",
        inputs: [{ name: "owner", type: "address" }],
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view" as const,
      };
      const result = AbiFunctionSchema.parse(func);
      expect(result.name).toBe("balanceOf");
      expect(result.stateMutability).toBe("view");
    });

    it("should validate pure function", () => {
      const func = {
        type: "function" as const,
        name: "add",
        inputs: [
          { name: "a", type: "uint256" },
          { name: "b", type: "uint256" },
        ],
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "pure" as const,
      };
      const result = AbiFunctionSchema.parse(func);
      expect(result.stateMutability).toBe("pure");
    });

    it("should validate payable function", () => {
      const func = {
        type: "function" as const,
        name: "deposit",
        inputs: [],
        outputs: [],
        stateMutability: "payable" as const,
      };
      const result = AbiFunctionSchema.parse(func);
      expect(result.stateMutability).toBe("payable");
    });

    it("should default stateMutability to nonpayable", () => {
      const func = {
        type: "function" as const,
        name: "transfer",
        inputs: [
          { name: "to", type: "address" },
          { name: "amount", type: "uint256" },
        ],
        outputs: [{ name: "", type: "bool" }],
      };
      const result = AbiFunctionSchema.parse(func);
      expect(result.stateMutability).toBe("nonpayable");
    });

    it("should default inputs and outputs to empty arrays", () => {
      const func = {
        type: "function" as const,
        name: "doSomething",
      };
      const result = AbiFunctionSchema.parse(func);
      expect(result.inputs).toEqual([]);
      expect(result.outputs).toEqual([]);
    });
  });

  describe("AbiEventSchema", () => {
    it("should validate event with indexed parameters", () => {
      const event = {
        type: "event" as const,
        name: "Transfer",
        inputs: [
          { name: "from", type: "address", indexed: true },
          { name: "to", type: "address", indexed: true },
          { name: "value", type: "uint256", indexed: false },
        ],
      };
      const result = AbiEventSchema.parse(event);
      expect(result.name).toBe("Transfer");
      expect(result.inputs[0].indexed).toBe(true);
    });

    it("should validate anonymous event", () => {
      const event = {
        type: "event" as const,
        name: "AnonymousEvent",
        inputs: [],
        anonymous: true,
      };
      const result = AbiEventSchema.parse(event);
      expect(result.anonymous).toBe(true);
    });

    it("should default anonymous to false", () => {
      const event = {
        type: "event" as const,
        name: "RegularEvent",
        inputs: [],
      };
      const result = AbiEventSchema.parse(event);
      expect(result.anonymous).toBe(false);
    });
  });

  describe("AbiErrorSchema", () => {
    it("should validate error with parameters", () => {
      const error = {
        type: "error" as const,
        name: "InsufficientBalance",
        inputs: [
          { name: "available", type: "uint256" },
          { name: "required", type: "uint256" },
        ],
      };
      const result = AbiErrorSchema.parse(error);
      expect(result.name).toBe("InsufficientBalance");
      expect(result.inputs).toHaveLength(2);
    });

    it("should validate error without parameters", () => {
      const error = {
        type: "error" as const,
        name: "Unauthorized",
      };
      const result = AbiErrorSchema.parse(error);
      expect(result.inputs).toEqual([]);
    });
  });

  describe("AbiConstructorSchema", () => {
    it("should validate constructor with inputs", () => {
      const ctor = {
        type: "constructor" as const,
        inputs: [
          { name: "name", type: "string" },
          { name: "symbol", type: "string" },
        ],
      };
      const result = AbiConstructorSchema.parse(ctor);
      expect(result.inputs).toHaveLength(2);
    });

    it("should validate payable constructor", () => {
      const ctor = {
        type: "constructor" as const,
        inputs: [],
        stateMutability: "payable" as const,
      };
      const result = AbiConstructorSchema.parse(ctor);
      expect(result.stateMutability).toBe("payable");
    });

    it("should reject constructor with view stateMutability", () => {
      const ctor = {
        type: "constructor" as const,
        inputs: [],
        stateMutability: "view",
      };
      expect(() => AbiConstructorSchema.parse(ctor)).toThrow();
    });
  });

  describe("AbiFallbackSchema", () => {
    it("should validate fallback function", () => {
      const fallback = {
        type: "fallback" as const,
      };
      const result = AbiFallbackSchema.parse(fallback);
      expect(result.type).toBe("fallback");
      expect(result.stateMutability).toBe("nonpayable");
    });

    it("should validate payable fallback", () => {
      const fallback = {
        type: "fallback" as const,
        stateMutability: "payable" as const,
      };
      const result = AbiFallbackSchema.parse(fallback);
      expect(result.stateMutability).toBe("payable");
    });
  });

  describe("AbiReceiveSchema", () => {
    it("should validate receive function", () => {
      const receive = {
        type: "receive" as const,
        stateMutability: "payable" as const,
      };
      const result = AbiReceiveSchema.parse(receive);
      expect(result.type).toBe("receive");
      expect(result.stateMutability).toBe("payable");
    });

    it("should reject non-payable receive", () => {
      const receive = {
        type: "receive" as const,
        stateMutability: "nonpayable",
      };
      expect(() => AbiReceiveSchema.parse(receive)).toThrow();
    });
  });

  describe("AbiItemSchema", () => {
    it("should discriminate function type", () => {
      const item = {
        type: "function" as const,
        name: "test",
        inputs: [],
        outputs: [],
      };
      const result = AbiItemSchema.parse(item);
      expect(result.type).toBe("function");
    });

    it("should discriminate event type", () => {
      const item = {
        type: "event" as const,
        name: "TestEvent",
        inputs: [],
      };
      const result = AbiItemSchema.parse(item);
      expect(result.type).toBe("event");
    });

    it("should discriminate error type", () => {
      const item = {
        type: "error" as const,
        name: "TestError",
        inputs: [],
      };
      const result = AbiItemSchema.parse(item);
      expect(result.type).toBe("error");
    });

    it("should reject unknown type", () => {
      const item = {
        type: "unknown",
        name: "test",
      };
      expect(() => AbiItemSchema.parse(item)).toThrow();
    });
  });

  describe("AbiSchema", () => {
    it("should validate complete ERC20 ABI", () => {
      const abi = [
        {
          type: "function" as const,
          name: "balanceOf",
          inputs: [{ name: "owner", type: "address" }],
          outputs: [{ name: "", type: "uint256" }],
          stateMutability: "view" as const,
        },
        {
          type: "function" as const,
          name: "transfer",
          inputs: [
            { name: "to", type: "address" },
            { name: "amount", type: "uint256" },
          ],
          outputs: [{ name: "", type: "bool" }],
          stateMutability: "nonpayable" as const,
        },
        {
          type: "event" as const,
          name: "Transfer",
          inputs: [
            { name: "from", type: "address", indexed: true },
            { name: "to", type: "address", indexed: true },
            { name: "value", type: "uint256", indexed: false },
          ],
        },
        {
          type: "error" as const,
          name: "InsufficientBalance",
          inputs: [
            { name: "available", type: "uint256" },
            { name: "required", type: "uint256" },
          ],
        },
      ];
      const result = AbiSchema.parse(abi);
      expect(result).toHaveLength(4);
    });

    it("should validate empty ABI", () => {
      const result = AbiSchema.parse([]);
      expect(result).toEqual([]);
    });

    it("should reject non-array input", () => {
      expect(() => AbiSchema.parse({})).toThrow();
      expect(() => AbiSchema.parse("not an array")).toThrow();
    });
  });
});
