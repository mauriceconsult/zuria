// app/api/riders/route.ts  (Zuria)
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { VehicleType } from "@prisma/client";
import {
  getProvider,
  normalizeProviderPhone,
} from "@/lib/payments/providers";

interface PrismaError extends Error {
  code?: string;
  meta?: Record<string, unknown>;
}

const VALID_VEHICLE_TYPES = Object.values(VehicleType);

export async function POST(req: NextRequest) {
  try {
    // ── Auth ──────────────────────────────────────────────────────────────
    const apiKey = req.headers.get("x-api-key");

    if (!process.env.PLATFORM_API_KEY) {
      console.error("[/api/riders] PLATFORM_API_KEY is not set on this server");
      return NextResponse.json(
        { error: "Server misconfigured" },
        { status: 500 }
      );
    }

    if (apiKey !== process.env.PLATFORM_API_KEY) {
      console.warn("[/api/riders] Invalid API key", {
        receivedPrefix: apiKey?.substring(0, 8) ?? "none",
      });
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ── Parse body ────────────────────────────────────────────────────────
    const body: unknown = await req.json().catch(() => null);

    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const {
      clerkId,
      name,
      phone,
      email,
      vehicleType,
      payoutProvider = "mtn-momo",
    } = body as {
      clerkId?:    string;
      name?:       string;
      phone?:      string;
      email?:      string;
      vehicleType?: string;
      payoutProvider?: string;
    };

    // ── Validate ──────────────────────────────────────────────────────────
    if (
      typeof clerkId !== "string" ||
      typeof name !== "string" ||
      typeof phone !== "string" ||
      typeof vehicleType !== "string" ||
      !clerkId.trim() ||
      !name.trim()
    ) {
      return NextResponse.json(
        { error: "Missing required fields: clerkId, name, phone, vehicleType" },
        { status: 400 }
      );
    }

    // Validate against the DB enum — catches the motorcycle/bicycl/car typo
    // class of error before it hits Postgres
    if (!VALID_VEHICLE_TYPES.includes(vehicleType as VehicleType)) {
      return NextResponse.json(
        {
          error: `Invalid vehicleType "${vehicleType}". Must be one of: ${VALID_VEHICLE_TYPES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const paymentProvider = getProvider(payoutProvider);
    if (!paymentProvider) {
      return NextResponse.json(
        { error: "payoutProvider must be 'mtn-momo' or 'mpesa'." },
        { status: 400 },
      );
    }

    const normalizedPhone = normalizeProviderPhone(paymentProvider, phone);
    if (!normalizedPhone) {
      return NextResponse.json(
        {
          error: `Enter a valid ${paymentProvider.id === "mpesa" ? "Kenyan Safaricom M-Pesa" : "Ugandan MTN MoMo"} number.`,
        },
        { status: 400 },
      );
    }

    const existing = await prisma.rider.findUnique({
      where: { clerkId },
      select: { phone: true, payoutProvider: true },
    });
    const existingProvider = existing
      ? getProvider(existing.payoutProvider)
      : undefined;
    const existingPhone = existingProvider
      ? normalizeProviderPhone(existingProvider, existing?.phone ?? "")
      : existing?.phone;
    if (
      existing &&
      (existingPhone !== normalizedPhone ||
        existing?.payoutProvider !== paymentProvider.id)
    ) {
      return NextResponse.json(
        { error: "Update payout details from your signed-in rider profile." },
        { status: 409 },
      );
    }

    // ── Upsert ────────────────────────────────────────────────────────────
    const rider = await prisma.rider.upsert({
      where:  { clerkId },
      update: {
        name,
        email: email ?? "",
        vehicleType: vehicleType as VehicleType,
      },
      create: {
        clerkId,
        name,
        phone: normalizedPhone,
        email: email ?? "",
        vehicleType: vehicleType as VehicleType,
        payoutProvider: paymentProvider.id,
      },
    });

    console.log("[/api/riders] Rider upserted:", rider.id);
    return NextResponse.json(rider, { status: 200 });

  } catch (error: unknown) {
  const prismaError = error as PrismaError;

  console.error("[/api/riders] Unhandled error:", {
    message:
      error instanceof Error ? error.message : String(error),
    code: prismaError.code,
    meta: prismaError.meta,
  });

  if (prismaError.code === "P2002") {
    return NextResponse.json(
      { error: "Rider already registered" },
      { status: 409 }
    );
  }

  return NextResponse.json(
    { error: "Registration failed — please try again" },
    { status: 500 }
  );
}
}