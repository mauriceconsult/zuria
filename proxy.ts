import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhook", // Clerk webhooks must be public
  "/api/shops", // if you want public shop listing
]);

// Public GET API routes (read-only data)
const isPublicApiRoute = createRouteMatcher([
  "/api/:shopId/products(.*)",
  "/api/:shopId/categories(.*)",
  "/api/:shopId/colors(.*)",
  "/api/:shopId/sizes(.*)",
  "/api/:shopId/billboards(.*)",
  "/api/:shopId/checkout/momo/status", // example
]);

export default clerkMiddleware(async (auth, request) => {

  // Allow public routes
  if (isPublicRoute(request)) {
    return;
  }

  // Allow specific public GET API routes
  if (request.method === "GET" && isPublicApiRoute(request)) {
    return;
  }

  // Protect everything else
  await auth.protect();
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
