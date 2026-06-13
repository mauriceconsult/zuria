// app/api/riders/route.ts  (Zuria)
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");

  if (apiKey !== process.env.PLATFORM_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { clerkId, name, phone, email, vehicleType } = await req.json();

  // validate fields...

const rider = await prisma.rider.upsert({
  where: { clerkId },
  update: {
    name,
    phone,
    email,
    vehicleType,
  },
  create: {
    clerkId,
    name,
    phone,
    email,
    vehicleType,
  },
});

return NextResponse.json(rider, { status: 200 });

}
