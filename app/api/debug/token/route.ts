// app/api/debug/token/route.ts  (TEMPORARY — delete after debugging)
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const { userId } = await auth();
  
  return NextResponse.json({
    userId,
    hasAuthHeader: !!authHeader,
    authHeaderPrefix: authHeader?.substring(0, 25),
    zuriaClerkKeyPrefix: process.env.CLERK_SECRET_KEY?.substring(0, 12),
    clerkPublishableKeyPrefix:
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.substring(0, 12),
  });
}