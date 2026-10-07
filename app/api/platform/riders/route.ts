// app/api/platform/riders/route.ts
import { requirePlatformUser } from "@/lib/platform-auth";
import { prisma } from "@/lib/prisma";
import { VehicleType } from "@prisma/client";
import { NextResponse } from "next/server";

const VALID_VEHICLE_TYPES = Object.values(VehicleType);

export async function POST(req: Request) {
  try {
    const userId = await requirePlatformUser(req);
    if (!userId)
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const body = await req.json().catch(() => null);
    if (!body)
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );

    const { name, phone, email, vehicleType } = body as {
      name?: string;
      phone?: string;
      email?: string;
      vehicleType?: string;
    };
    if (!name || !phone || !vehicleType) {
      return NextResponse.json(
        { error: "Missing required fields: name, phone, vehicleType" },
        { status: 400 },
      );
    }
    if (!VALID_VEHICLE_TYPES.includes(vehicleType as VehicleType)) {
      return NextResponse.json(
        {
          error: `Invalid vehicleType. Must be one of: ${VALID_VEHICLE_TYPES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const rider = await prisma.rider.create({
      data: {
        clerkId: userId,
        name,
        phone,
        email: email ?? "",
        vehicleType: vehicleType as VehicleType,
      },
    });
    return NextResponse.json(rider);
  } catch (error) {
    console.error("[PLATFORM_RIDERS_POST]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
