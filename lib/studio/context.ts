import {
  getAdmins,
  getCourses,
  getShops,
  getOrders,
  getDeliveryJobs,
} from "./connectors";
import { generateInsights } from "./insights";
import { Admin, Article, Billboard, Category, Color, Course, Delivery, Editor, Order, Product, Shop, Size, Tutorial, Writer } from "./types";

type Context = {
  instaskul: {
    admins: Admin[];
    courses: Course[];
    tutorials: Tutorial[];
  };

  vendly: {
    shops: Shop[];
    products: Product[];
    orders: Order[];
    categories: Category[];
    sizes: Size[];
    colors: Color[];
    billboards: Billboard[];
  };

  dukaboda: {
    deliveries: Delivery[];
  };

  blog: {
    writers: Writer[];
    articles: Article[];
    editors: Editor[];
  };

  meta: {
    hasData: boolean;
    dataScore: number;
    connectedApps: string[];
  };
};

type Identity = { id?: string };

export async function buildUserContext(userId: string, token: string) {
  try {
    // 1. Resolve identities in parallel
    const [admins, shops] = await Promise.all([
      getAdmins(userId, token).catch(() => [] as Identity[]),
      getShops(userId, token).catch(() => [] as Identity[]),
    ]);

    const adminId = admins?.[0]?.id;
    const shopId = shops?.[0]?.id;

    // 2. Fetch platform data in parallel (safe fallbacks)
    const [courses, orders, deliveries] = await Promise.all([
      adminId ? getCourses(adminId, token).catch(() => []) : [],
      shopId ? getOrders(shopId, token).catch(() => []) : [],
      getDeliveryJobs(token).catch(() => []),
    ]);

    const context: Context = {
      instaskul: {
        admins: admins || [],
        courses: courses || [],
        tutorials: [],
      },
      vendly: {
        shops: shops || [],
        products: [],
        orders: orders || [],
        categories: [],
        sizes: [],
        colors: [],
        billboards: [],
      },
      dukaboda: {
        deliveries: deliveries || [],
      },
      blog: {
        writers: [],
        articles: [],
        editors: [],
      },
      meta: {
        hasData: false,
        dataScore: 0,
        connectedApps: [],
      },
    };

    // 3. Reliable boolean check
const hasData =
  context.instaskul.courses.length > 0 ||
  context.vendly.orders.length > 0 ||
  context.vendly.products.length > 0 ||
  context.dukaboda.deliveries.length > 0 ||
      context.blog.articles.length > 0;
    
    const connectedApps: string[] = [];

    if (admins.length) connectedApps.push("instaskul");
    if (shops.length) connectedApps.push("vendly");
    if (deliveries.length) connectedApps.push("dukaboda");
    if (context.blog.writers.length) connectedApps.push("blog");

    const dataScore = courses.length + orders.length + deliveries.length + context.blog.articles.length;
    context.meta = {
      hasData,
      dataScore,
      connectedApps,
    };
    // 4. Insights (safe)
    let insights: string;

    if (hasData) {
      try {
        insights = await generateInsights(context);
      } catch {
        insights =
          "We found activity, but couldn’t generate insights right now.";
      }
    } else {
      insights =
        "No activity yet. Start by creating a course (Instaskul), listing a product (Vendly), or completing a delivery (Dukaboda).";
    }

    return {
      ...context,
      insights,
      hasData, // 👈 expose this to UI (VERY useful)
    };
  } catch {
    // 5. Hard fallback (never break Studio)
    return {
      instaskul: {
        admins: [],
        courses: [],
        tutorials: [],
      },
      vendly: {
        shops: [],
        products: [],
        orders: [],
        categories: [],
        sizes: [],
        colors: [],
        billboards: [],
      },
      dukaboda: {
        deliveries: [],
      },
      blog: {
        writers: [],
        articles: [],
        editors: [],
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
