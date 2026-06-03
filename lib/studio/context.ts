import {
  getAdmins,
  getCourses,
  getShops,
  getOrders,
  getDeliveryJobs,
} from "./connectors";

import { generateInsights } from "./insights";
import { PlatformContext, Admin, Shop } from "./types";

export async function buildUserContext(
  userId: string,
  token: string,
): Promise<PlatformContext> {
  try {
    // ── 1. Resolve identities ─────────────────────────
    const [admins, shops, ] = await Promise.all([
      getAdmins(userId, token).catch(() => [] as Admin[]),
      getShops(userId, token).catch(() => [] as Shop[]),
    ]);

    const adminId = admins?.[0]?.id;
    const shopId = shops?.[0]?.id;

    // ── 2. Fetch core data ────────────────────────────
    const [courses, orders, deliveries] = await Promise.all([
      adminId ? getCourses(adminId, token).catch(() => []) : [],
      shopId ? getOrders(shopId, token).catch(() => []) : [],
      getDeliveryJobs(token).catch(() => []),
    ]);

    // ── 3. Compute meta BEFORE building context ───────
    const hasData =
      courses.length > 0 || orders.length > 0 || deliveries.length > 0;

    const connectedApps: string[] = [];
    if (admins.length) connectedApps.push("instaskul");
    if (shops.length) connectedApps.push("vendly");
    if (deliveries.length) connectedApps.push("dukaboda");

    const dataScore = courses.length + orders.length + deliveries.length;

    // ── 4. Build FULL PlatformContext (strict match) ──
    const context: PlatformContext = {
      instaskul: {
        admins,
        courses,
        tutorials: [],
        courseworks: [],
        noticeboards: [],
      },

      vendly: {
        shops,
        products: [],
        orders,
        categories: [],
        sizes: [],
        colors: [],
        billboards: [],
        refunds: [],
      },

      dukaboda: {
        deliveries,
        riders: [],
      },

      blog: {
        writers: [],
        articles: [],
        categories: [],
      },

      meta: {
        hasData,
        dataScore,
        connectedApps,
      },
    };

    // ── 5. Generate insights ─────────────────────────
    try {
      context.insights = hasData
        ? await generateInsights(context)
        : `No activity yet.

Start by:
• Creating a course (Instaskul)
• Listing a product (Vendly)
• Completing a delivery (Dukaboda)

Once activity starts, Studio AI will generate deeper insights.`;
    } catch {
      context.insights =
        "We found activity, but couldn’t generate insights right now.";
    }

    return context;
  } catch {
    // ── 6. HARD SAFE FALLBACK (same shape) ────────────
    return {
      instaskul: {
        admins: [],
        courses: [],
        tutorials: [],
        courseworks: [],
        noticeboards: [],
      },

      vendly: {
        shops: [],
        products: [],
        orders: [],
        categories: [],
        sizes: [],
        colors: [],
        billboards: [],
        refunds: [],
      },

      dukaboda: {
        deliveries: [],
        riders: [],
      },

      blog: {
        writers: [],
        articles: [],
        categories: [],
      },

      meta: {
        hasData: false,
        dataScore: 0,
        connectedApps: [],
      },

      insights:
        "We couldn’t load your data right now. Please try again shortly.",
    };
  }
}
