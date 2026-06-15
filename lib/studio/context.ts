import {
  getAdmins,
  getCourses,
  getTutorials,
  getCourseworks,
  getNoticeboards,
  getShops,
  getProducts,
  getOrders,
  getBillboards,
  getCategories,
  getSizes,
  getColors,
  getRefunds,
  getDeliveryJobs,
  getRiders,
  getWriters,
  getArticles,
  getBlogCategories,
} from "./connectors";

import { generateInsights, generateGenericInsights } from "./insights";
import {
  PlatformContext,
  Admin,
  Course,
  Tutorial,
  Coursework,
  Noticeboard,
  Shop,
  Product,
  Order,
  Billboard,
  Category,
  Size,
  Color,
  RefundRequest,
  Delivery,
  Rider,
  Writer,
  Article,
  BlogCategory,
} from "./types";

// ── Helper ────────────────────────────────────────────────────────────────────
const safe = <T>(promise: Promise<T>, fallback: T): Promise<T> =>
  promise.catch(() => fallback);

// ── Main export ───────────────────────────────────────────────────────────────
export async function buildUserContext(
  userId: string,
  token: string,
): Promise<PlatformContext> {
  try {
    // ── 1. Top-level identities ───────────────────────────────────────────────
    const [admins, shops, writers] = await Promise.all([
      safe(getAdmins(userId, token) as Promise<Admin[]>, []),
      safe(getShops(userId, token) as Promise<Shop[]>, []),
      safe(getWriters(userId, token) as Promise<Writer[]>, []),
    ]);

    const adminId = admins[0]?.id;
    const shopId = shops[0]?.id;
    const writerId = writers[0]?.id;

    // ── 2. Full data graph ────────────────────────────────────────────────────
    const [
      courses,
      noticeboards,
      products,
      orders,
      billboards,
      categories,
      sizes,
      colors,
      refunds,
      deliveries,
      riders,
      articles,
      blogCategories,
    ] = await Promise.all([
      adminId
        ? safe(getCourses(adminId, token) as Promise<Course[]>, [])
        : Promise.resolve([] as Course[]),
      adminId
        ? safe(getNoticeboards(adminId, token) as Promise<Noticeboard[]>, [])
        : Promise.resolve([] as Noticeboard[]),
      shopId
        ? safe(getProducts(shopId, token) as Promise<Product[]>, [])
        : Promise.resolve([] as Product[]),
      shopId
        ? safe(getOrders(shopId, token) as Promise<Order[]>, [])
        : Promise.resolve([] as Order[]),
      shopId
        ? safe(getBillboards(shopId, token) as Promise<Billboard[]>, [])
        : Promise.resolve([] as Billboard[]),
      shopId
        ? safe(getCategories(shopId, token) as Promise<Category[]>, [])
        : Promise.resolve([] as Category[]),
      shopId
        ? safe(getSizes(shopId, token) as Promise<Size[]>, [])
        : Promise.resolve([] as Size[]),
      shopId
        ? safe(getColors(shopId, token) as Promise<Color[]>, [])
        : Promise.resolve([] as Color[]),
      shopId
        ? safe(getRefunds(shopId, token) as Promise<RefundRequest[]>, [])
        : Promise.resolve([] as RefundRequest[]),
      safe(getDeliveryJobs(token) as Promise<Delivery[]>, []),
      safe(getRiders(token) as Promise<Rider[]>, []),
      writerId
        ? safe(getArticles(writerId, token) as Promise<Article[]>, [])
        : Promise.resolve([] as Article[]),
      safe(getBlogCategories(token) as Promise<BlogCategory[]>, []),
    ]);

    // ── 3. Per-course tutorials + courseworks ─────────────────────────────────
    const courseDetails = await Promise.all(
      courses.map(async (course: Course) => {
        if (!adminId || !course.id) {
          return {
            tutorials: [] as Tutorial[],
            courseworks: [] as Coursework[],
          };
        }
        const [tutorials, courseworks] = await Promise.all([
          safe(
            getTutorials(adminId, course.id, token) as Promise<Tutorial[]>,
            [],
          ),
          safe(
            getCourseworks(adminId, course.id, token) as Promise<Coursework[]>,
            [],
          ),
        ]);
        return { tutorials, courseworks };
      }),
    );

    const tutorials: Tutorial[] = courseDetails.flatMap((d) => d.tutorials);
    const courseworks: Coursework[] = courseDetails.flatMap(
      (d) => d.courseworks,
    );

    // ── 4. Meta ───────────────────────────────────────────────────────────────
    const connectedApps: string[] = [];
    if (admins.length) connectedApps.push("instaskul");
    if (shops.length) connectedApps.push("vendly");
    if (deliveries.length || riders.length) connectedApps.push("dukaboda");
    if (writers.length) connectedApps.push("blog");

    const dataScore =
      courses.length + orders.length + deliveries.length + articles.length;
    const hasData = dataScore > 0;

    // ── 5. Assemble ───────────────────────────────────────────────────────────
    const context: PlatformContext = {
      instaskul: { admins, courses, tutorials, courseworks, noticeboards },
      vendly: {
        shops,
        products,
        orders,
        categories,
        sizes,
        colors,
        billboards,
        refunds,
      },
      dukaboda: { deliveries, riders },
      blog: { writers, articles, categories: blogCategories },
      meta: { hasData, dataScore, connectedApps },
    };

    // ── 6. Insights ───────────────────────────────────────────────────────────
    context.insights = hasData
      ? await safe(
          generateInsights(context),
          "Action plan could not be generated right now.",
        )
      : generateGenericInsights();

    return context;
  } catch (err) {
    console.error("buildUserContext hard failure:", err);
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
      dukaboda: { deliveries: [], riders: [] },
      blog: { writers: [], articles: [], categories: [] },
      meta: { hasData: false, dataScore: 0, connectedApps: [] },
      insights:
        "We couldn't load your data right now. Please try again shortly.",
    };
  }
}
