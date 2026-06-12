// app/api/debug/token/route.ts  (TEMPORARY — delete after debugging)
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const { userId } = await auth();
  
  return NextResponse.json({
    userId,
    hasAuthHeader: !!authHeader,
    authHeaderPrefix: authHeader?.slice(0, 30),
    zuriaClerKeyPrefix: process.env.CLERK_SECRET_KEY?.slice(0, 15),
  });
}