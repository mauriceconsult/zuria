// lib/platform.ts (Vendly storefront)

export const PLATFORM_FEE_PERCENT  = 10;
export const DELIVERY_FEE_PERCENT  = 10;

export type ApprovalSource = "shop" | "platform";

/**
 * calculateFees
 *
 * Sales commission (10%) always applies to subtotal.
 * Delivery commission (10%) only applies when rider was approved
 * by the platform (wildcard) — not by a shop (shop-linked).
 *
 * The delivery cut comes out of the rider's payout, NOT added
 * to the customer's grand total. Customer price is always the same.
 */
export const calculateFees = (
  subtotal:       number,
  deliveryCost:   number,
  approvalSource: ApprovalSource = "shop",  // default: no delivery cut
) => {
  // Sales commission — always
  const platformFee = Math.round((subtotal * PLATFORM_FEE_PERCENT) / 100);

  // Delivery commission — only for wildcard (platform-approved) riders
  const deliveryFee = approvalSource === "platform"
    ? Math.round((deliveryCost * DELIVERY_FEE_PERCENT) / 100)
    : 0;

  // What the rider actually receives
  const riderPayout = deliveryCost - deliveryFee;

  // What the shop receives (items minus sales commission)
  const shopPayout = subtotal - platformFee;

  // Grand total customer pays — unchanged regardless of rider type
  const grandTotal = subtotal + deliveryCost + platformFee;

  // What Vendly/Dukaboda keeps in total
  const vendlyTotal = platformFee + deliveryFee;

  return {
    platformFee,   // 10% of items — always
    deliveryFee,   // 10% of delivery — wildcard riders only
    riderPayout,   // delivery fee minus Vendly cut
    shopPayout,    // items minus platform fee
    grandTotal,    // customer pays this
    vendlyTotal,   // Vendly keeps this
  };
};
