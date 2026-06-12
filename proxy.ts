import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhook(.*)",
  "/api/shops",
  "/api/riders(.*)", // Dukaboda cross-app rider registration
  "/api/delivery/jobs(.*)", // Dukaboda job polling
  "/api/admin/riders(.*)", // Platform admin rider approval
  "/api/debug(.*)", // Temporary debug endpoint
  "/dukaboda(.*)", // Public landing + tracking pages
]);

const isPublicApiRoute = createRouteMatcher([
  "/api/:shopId/products(.*)",
  "/api/:shopId/categories(.*)",
  "/api/:shopId/colors(.*)",
  "/api/:shopId/sizes(.*)",
  "/api/:shopId/billboards(.*)",
  "/api/:shopId/checkout/momo/status",
]);

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
