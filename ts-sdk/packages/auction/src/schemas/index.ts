/**
 * @module auction/schemas
 * @description Zod schemas for auction data validation
 */

export { type AuctionBidData, AuctionBidDataSchema } from "./bid.js";

export {
  type AuctionStatusData,
  AuctionStatusDataSchema,
  AuctionStatusDataOrNullSchema,
} from "./status.js";
