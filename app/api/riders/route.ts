// app/api/riders/route.ts  (Zuria)
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { VehicleType } from "@prisma/client";

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
    const body = await req.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { clerkId, name, phone, email, vehicleType } = body as {
      clerkId?:    string;
      name?:       string;
      phone?:      string;
      email?:      string;
      vehicleType?: string;
    };

    // ── Validate ──────────────────────────────────────────────────────────
    if (!clerkId || !name || !phone || !vehicleType) {
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

    // ── Upsert ────────────────────────────────────────────────────────────
    const rider = await prisma.rider.upsert({
      where:  { clerkId },
      update: { name, phone, email: email ?? "", vehicleType: vehicleType as VehicleType },
      create: { clerkId, name, phone, email: email ?? "", vehicleType: vehicleType as VehicleType },
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