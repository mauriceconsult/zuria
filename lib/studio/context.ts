import {
  getAdmins,
  getCourses,
  getShops,
  getOrders,
  getDeliveryJobs,
} from "./connectors";
import { generateInsights } from "./insights";

export async function buildUserContext(userId: string, token: string) {
  // 1. Resolve identities
  const admins = (await getAdmins(userId, token)) as Array<{ id: string }>;
  const adminId = admins[0]?.id;

  const shops = (await getShops(userId, token)) as Array<{ id: string }>;
  const shopId = shops[0]?.id;

  // 2. Fetch data
  const [courses, orders, deliveries] = await Promise.all([
    adminId ? getCourses(adminId, token) : [],
    shopId ? getOrders(shopId, token) : [],
    getDeliveryJobs(token),
  ]);

  const context = { courses, orders, deliveries };

  // 3. Insights
  const hasData = courses.length || orders.length || deliveries.length;

  const insights = hasData
    ? await generateInsights(context)
    : "No activity yet. Start by creating a course, product, or delivery.";

  return {
    ...context,
    insights,
  };
}
