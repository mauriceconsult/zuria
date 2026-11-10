// app/api/platform/riders/me/route.ts
import { requirePlatformUser } from "@/lib/platform-auth";
import { prisma } from "@/lib/prisma";
import {
  getProvider,
  normalizeProviderPhone,
} from "@/lib/payments/providers";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const userId = await requirePlatformUser(req);
  if (!userId)
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const rider = await prisma.rider.findUnique({ where: { clerkId: userId } });
  if (!rider) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(rider);
}

export async function PATCH(req: Request) {
  try {
    const userId = await requirePlatformUser(req);
    if (!userId)
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const body: unknown = await req.json().catch(() => null);
    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body)
    ) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }
    const input = body as Record<string, unknown>;
    const data: {
      isActive?: boolean;
      phone?: string;
      payoutProvider?: string;
      payoutDetailsUpdatedAt?: Date;
    } = {};

    if ("isActive" in input) {
      if (typeof input.isActive !== "boolean") {
        return NextResponse.json({ error: "isActive must be a boolean." }, { status: 400 });
      }
      data.isActive = input.isActive;
    }

    if ("phone" in input || "payoutProvider" in input) {
      if (typeof input.phone !== "string" || typeof input.payoutProvider !== "string") {
        return NextResponse.json(
          { error: "A payout phone and provider are both required." },
          { status: 400 },
        );
      }
      const provider = getProvider(input.payoutProvider);
      if (!provider) {
        return NextResponse.json(
          { error: "payoutProvider must be 'mtn-momo' or 'mpesa'." },
          { status: 400 },
        );
      }
      const phone = normalizeProviderPhone(provider, input.phone);
      if (!phone) {
        return NextResponse.json(
          {
            error: `Enter a valid ${provider.id === "mpesa" ? "Kenyan Safaricom M-Pesa" : "Ugandan MTN MoMo"} number.`,
          },
          { status: 400 },
        );
      }

      const current = await prisma.rider.findUnique({
        where: { clerkId: userId },
        select: { phone: true, payoutProvider: true },
      });
      if (!current) {
        return NextResponse.json({ error: "Rider not found" }, { status: 404 });
      }
      const currentProvider = getProvider(current.payoutProvider);
      const currentPhone = currentProvider
        ? normalizeProviderPhone(currentProvider, current.phone)
        : current.phone;
      if (phone !== currentPhone || provider.id !== current.payoutProvider) {
        data.phone = phone;
        data.payoutProvider = provider.id;
        data.payoutDetailsUpdatedAt = new Date();
      } else if (phone !== current.phone) {
        data.phone = phone;
      }
    }

    if (Object.keys(data).length === 0) {
      if ("phone" in input && "payoutProvider" in input) {
        const rider = await prisma.rider.findUnique({
          where: { clerkId: userId },
        });
        if (!rider) {
          return NextResponse.json({ error: "Rider not found" }, { status: 404 });
        }
        return NextResponse.json(rider);
      }
      return NextResponse.json({ error: "No rider settings were provided." }, { status: 400 });
    }

    const rider = await prisma.rider.update({ where: { clerkId: userId }, data });
    return NextResponse.json(rider);
  } catch (error) {
    console.error("[PLATFORM_RIDERS_ME_PATCH]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
