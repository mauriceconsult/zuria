// lib/connectors.ts
// Platform API connectors for Studio AI agent workflows.
// All functions accept a bearer token for authenticated requests.

const headers = (token: string) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
});

async function get<T>(url: string, token: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url, { headers: headers(token) });
    if (!res.ok) return fallback;
    return res.json();
  } catch {
    return fallback;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// INSTASKUL
// Base: process.env.INSTASKUL_API_URL
// ─────────────────────────────────────────────────────────────────────────────

const IS = () => process.env.INSTASKUL_API_URL;

export async function getAdmins(userId: string, token: string) {
  return get(`${IS()}/api/admins?userId=${userId}`, token, []);
}

export async function getAdmin(adminId: string, token: string) {
  return get(`${IS()}/api/admins/${adminId}`, token, null);
}

export async function getCourses(adminId: string, token: string) {
  return get(`${IS()}/api/admins/${adminId}/courses`, token, []);
}

export async function getCourse(
  adminId: string,
  courseId: string,
  token: string,
) {
  return get(`${IS()}/api/admins/${adminId}/courses/${courseId}`, token, null);
}

export async function getTutorials(
  adminId: string,
  courseId: string,
  token: string,
) {
  return get(
    `${IS()}/api/admins/${adminId}/courses/${courseId}/tutors`,
    token,
    [],
  );
}

export async function getCourseworks(
  adminId: string,
  courseId: string,
  token: string,
) {
  return get(
    `${IS()}/api/admins/${adminId}/courses/${courseId}/courseworks`,
    token,
    [],
  );
}

export async function getCourseNoticeboards(
  adminId: string,
  courseId: string,
  token: string,
) {
  return get(
    `${IS()}/api/admins/${adminId}/courses/${courseId}/coursenoticeboards`,
    token,
    [],
  );
}

export async function getNoticeboards(adminId: string, token: string) {
  return get(`${IS()}/api/admins/${adminId}/noticeboards`, token, []);
}

export async function getAssignments(
  adminId: string,
  courseId: string,
  tutorId: string,
  token: string,
) {
  return get(
    `${IS()}/api/admins/${adminId}/courses/${courseId}/tutors/${tutorId}/assignments`,
    token,
    [],
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ZURIA (Vendly backend)
// Base: process.env.ZURIA_API_URL
// ─────────────────────────────────────────────────────────────────────────────

const ZU = () => process.env.ZURIA_API_URL;

// Shops
export async function getShops(userId: string, token: string) {
  return get(`${ZU()}/api/shops?userId=${userId}`, token, []);
}

export async function getShop(shopId: string, token: string) {
  return get(`${ZU()}/api/shops/${shopId}`, token, null);
}

// Products
export async function getProducts(shopId: string, token: string) {
  return get(`${ZU()}/api/${shopId}/products`, token, []);
}

export async function getProduct(
  shopId: string,
  productId: string,
  token: string,
) {
  return get(`${ZU()}/api/${shopId}/products/${productId}`, token, null);
}

// Orders
export async function getOrders(shopId: string, token: string) {
  return get(`${ZU()}/api/${shopId}/orders`, token, []);
}

export async function getOrder(shopId: string, orderId: string, token: string) {
  return get(`${ZU()}/api/${shopId}/orders/${orderId}`, token, null);
}

// Billboards
export async function getBillboards(shopId: string, token: string) {
  return get(`${ZU()}/api/${shopId}/billboards`, token, []);
}

export async function getBillboard(
  shopId: string,
  billboardId: string,
  token: string,
) {
  return get(`${ZU()}/api/${shopId}/billboards/${billboardId}`, token, null);
}

// Categories
export async function getCategories(shopId: string, token: string) {
  return get(`${ZU()}/api/${shopId}/categories`, token, []);
}

// Sizes & Colors
export async function getSizes(shopId: string, token: string) {
  return get(`${ZU()}/api/${shopId}/sizes`, token, []);
}

export async function getColors(shopId: string, token: string) {
  return get(`${ZU()}/api/${shopId}/colors`, token, []);
}

// Refunds
export async function getRefunds(shopId: string, token: string) {
  return get(`${ZU()}/api/${shopId}/refunds`, token, []);
}

export async function getRefund(
  shopId: string,
  refundId: string,
  token: string,
) {
  return get(`${ZU()}/api/${shopId}/refunds/${refundId}`, token, null);
}

// Delivery jobs (Dukaboda)
export async function getDeliveryJobs(token: string) {
  // Uses JWT auth — rider identity comes from the token, not a query param
  return get(`${ZU()}/api/delivery/jobs/mine`, token, []);
}

export async function getAvailableDeliveryJobs(token: string) {
  return get(`${ZU()}/api/delivery/jobs?status=pending`, token, []);
}

export async function getDeliveryJob(jobId: string, token: string) {
  return get(`${ZU()}/api/delivery/jobs/${jobId}`, token, null);
}

// Riders
export async function getRiders(token: string) {
  return get(`${ZU()}/api/riders`, token, []);
}

export async function getRider(riderId: string, token: string) {
  return get(`${ZU()}/api/riders/${riderId}`, token, null);
}

export async function getMyRiderProfile(token: string) {
  return get(`${ZU()}/api/riders/me`, token, null);
}

// ─────────────────────────────────────────────────────────────────────────────
// MAXNOVATE BLOG (Maxnovate)
// Base: process.env.MAXNOVATE_API_URL
// ─────────────────────────────────────────────────────────────────────────────

const MN = () => process.env.MAXNOVATE_API_URL;

// Topics (beats/articles)
export async function getTopics(userId: string, token: string) {
  return get(`${MN()}/api/topics?userId=${userId}`, token, []);
}

export async function getTopic(topicId: string, token: string) {
  return get(`${MN()}/api/topics/${topicId}`, token, null);
}

// Writers
export async function getWriters(userId: string, token: string) {
  return get(`${MN()}/api/writers?userId=${userId}`, token, []);
}

export async function getWriter(writerId: string, token: string) {
  return get(`${MN()}/api/writers/${writerId}`, token, null);
}

// Articles
export async function getArticles(writerId: string, token: string) {
  return get(`${MN()}/api/writers/${writerId}/articles`, token, []);
}

export async function getArticle(
  writerId: string,
  articleId: string,
  token: string,
) {
  return get(
    `${MN()}/api/writers/${writerId}/articles/${articleId}`,
    token,
    null,
  );
}

// Categories
export async function getBlogCategories(token: string) {
  return get(`${MN()}/api/categories`, token, []);
}

// Reading list
export async function getReadingList(userId: string, token: string) {
  return get(`${MN()}/api/reading-list?userId=${userId}`, token, []);
}

// Analytics (editor view)
export async function getWriterAnalytics(writerId: string, token: string) {
  return get(`${MN()}/api/editor/analytics?writerId=${writerId}`, token, null);
}
