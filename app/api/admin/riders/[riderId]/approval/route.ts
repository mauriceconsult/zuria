// app/api/riders/[riderId]/approval/route.ts  (Zuria)
//
// PATCH /api/riders/:riderId/approval
//
// Two callers:
//   1. Shop owner approves from /riders page → approvedBy: "shop"
//   2. Platform admin approves from dukaboda.maxnovate.com → approvedBy: "platform"
//
// The approvedBy value determines whether Vendly takes a delivery cut.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ riderId: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { riderId } = await params;
  const { approved, approvedBy, approvedById } = await req.json();

  if (typeof approved !== "boolean") {
    return NextResponse.json(
      { error: "approved must be a boolean" },
      { status: 400 },
    );
  }

  // approvedBy defaults to "shop" if not specified (backwards compatible)
  const source = approvedBy ?? "shop";

  if (!["shop", "platform"].includes(source)) {
    return NextResponse.json(
      { error: "approvedBy must be 'shop' or 'platform'" },
      { status: 400 },
    );
  }

  const rider = await prisma.rider.update({
    where: { id: riderId },
    data: {
      isApproved:   approved,
      isActive:     approved,                          // activate on approval
      approvedBy:   approved ? source : null,          // clear on rejection
      approvedById: approved ? (approvedById ?? userId) : null,
      approvedAt:   approved ? new Date() : null,
    },
  });

  return NextResponse.json(rider);
}
