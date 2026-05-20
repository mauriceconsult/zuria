// app/api/riders/[riderId]/approval/route.ts  (Zuria)
//
// PATCH /api/riders/:riderId/approval
// Shop owner approves or rejects a rider application.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ riderId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { riderId }  = await params;
  const { approved } = await req.json();

  if (typeof approved !== "boolean") {
    return NextResponse.json(
      { error: "approved must be a boolean" },
      { status: 400 }
    );
  }

  const rider = await prisma.rider.update({
    where: { id: riderId },
    data:  {
      isApproved: approved,
      isActive:   approved ? true : false, // activate on approval, deactivate on rejection
    },
  });

  return NextResponse.json(rider);
}
