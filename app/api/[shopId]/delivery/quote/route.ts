// app/api/[shopId]/delivery/quote/route.ts
// Returns a delivery quote for a given customer address.
// Called by the cart Summary component on address input (debounced).

import { prisma } from "@/lib/prisma";
import { getDeliveryProvider } from "@/lib/delivery/registry";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { geocodeAddress } from "@/lib/delivery/geo-code";
import { signDeliveryQuote } from "@/lib/delivery/quote-token";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ shopId: string }> },
) {
  try {
    const { shopId } = await params;
    const body = await req.json();
    const { address, coords } = body as {
      address: string;
      coords?: { lat: number; lng: number }; // GPS override from browser
    };

    if (!address) {
      return NextResponse.json(
        { error: "Delivery address is required" },
        { status: 400 },
      );
    }

    // ── Get shop location ──────────────────────────────────────────────────
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: {
        latitude: true,
        longitude: true,
        currency: true,
        name: true,
        phone: true,
      },
    });

    if (!shop?.latitude || !shop?.longitude) {
      return NextResponse.json(
        { error: "Shop location not configured. Please contact the shop." },
        { status: 422 },
      );
    }

    // ── Geocode customer address (or use GPS coords directly) ──────────────
    // Resolve coordinates (use GPS override if provided)
    const resolvedCoords = coords ?? (await geocodeAddress(address));
    // Destination shape: LatLng & { address: string }
    const destination = {
      address,
      lat: resolvedCoords.lat,
      lng: resolvedCoords.lng,
    };

    // ── Get quote from configured provider ─────────────────────────────────
    const provider = getDeliveryProvider();
    const quote = await provider.getQuote({
      origin: { lat: shop.latitude, lng: shop.longitude, address: "" },
      destination,
    });

    // ── Convert cost to shop currency if needed ────────────────────────────
    // If provider returns UGX and shop uses UGX, no conversion needed.
    // Add FX conversion here when supporting multi-currency shops.
    if (quote.currency.toUpperCase() !== shop.currency.toUpperCase()) {
      return NextResponse.json(
        { error: "The delivery provider does not support this shop's currency." },
        { status: 422 },
      );
    }
    const cost = Math.round(quote.cost);
    if (!Number.isSafeInteger(cost) || cost < 0) {
      throw new Error("Delivery provider returned an invalid quote amount");
    }

    const quoteId = signDeliveryQuote({
      shopId,
      provider: quote.provider,
      providerQuoteId: quote.quoteId,
      cost,
      currency: shop.currency,
      expiresAt: quote.expiresAt,
      address,
      destination: { lat: destination.lat, lng: destination.lng },
    });

    return NextResponse.json({
      quoteId,
      provider: quote.provider,
      cost,
      currency: shop.currency,
      estimatedMinutes: quote.estimatedMinutes,
      expiresAt: quote.expiresAt,
      destination: { lat: destination.lat, lng: destination.lng }, // return resolved coords for UI
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to get delivery quote";
    console.error("[delivery/quote]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
