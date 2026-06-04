import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// ─── Public routes — no auth required ────────────────────────────────────────

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhook(.*)",   // covers /api/webhook, /api/webhook/momo, etc.
  "/api/shops",
]);

// ─── Public API routes — GET only, no auth required ──────────────────────────
// These are storefront-facing endpoints consumed by the customer-facing shop UI.

const isPublicApiRoute = createRouteMatcher([
  "/api/:shopId/products(.*)",
  "/api/:shopId/categories(.*)",
  "/api/:shopId/colors(.*)",
  "/api/:shopId/sizes(.*)",
  "/api/:shopId/billboards(.*)",
  "/api/:shopId/checkout/momo/status",
]);

// ─── Middleware ───────────────────────────────────────────────────────────────

export default clerkMiddleware(async (auth, request) => {
  if (isPublicRoute(request)) {
    return NextResponse.next();
  }

  if (request.method === "GET" && isPublicApiRoute(request)) {
    return NextResponse.next();
  }

  const { userId } = await auth();

  if (!userId) {
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const signIn = new URL("/sign-in", request.url);
    signIn.searchParams.set("redirect_url", request.nextUrl.pathname);

    return NextResponse.redirect(signIn);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
