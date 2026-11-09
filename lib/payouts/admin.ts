import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function requirePayoutAdmin() {
  const { userId } = await auth();
  if (!userId) {
    return {
      userId: null,
      response: new NextResponse("Unauthorized", { status: 401 }),
    };
  }

  const allowedIds = (process.env.PAYOUT_ADMIN_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (!allowedIds.includes(userId)) {
    return {
      userId: null,
      response: new NextResponse("Forbidden", { status: 403 }),
    };
  }
  return { userId, response: null };
}

export function requireCronSecret(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return new NextResponse("Cron endpoint is not configured", { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  return null;
}
