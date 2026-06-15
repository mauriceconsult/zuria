// lib/studio/generate-doc.ts
// Generates a downloadable Action Plan .docx from PlatformContext.
// Replaces both generateDoc and generateStrategyDoc.

import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import {
  PlatformContext,
  // Course, Admin
} from "./types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function p(text: string) {
  return new Paragraph({ children: [new TextRun(text)] });
}

function h2(text: string) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_2 });
}

function h3(text: string) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_3 });
}

function bullet(text: string) {
  return new Paragraph({ children: [new TextRun(`• ${text}`)] });
}

function blank() {
  return new Paragraph({ text: "" });
}

function actionItem(text: string) {
  return new Paragraph({
    children: [new TextRun({ text: `→ ${text}`, bold: true })],
  });
}

// ── Section builders ──────────────────────────────────────────────────────────

function inskakulSection(
  admins: PlatformContext["instaskul"]["admins"],
  courses: PlatformContext["instaskul"]["courses"],
  tutorials: PlatformContext["instaskul"]["tutorials"],
  courseworks: PlatformContext["instaskul"]["courseworks"],
  noticeboards: PlatformContext["instaskul"]["noticeboards"],
) {
  if (!admins.length && !courses.length) return [];

  const coursesWithoutCoursework = courses.filter(
    (c) => !courseworks.some((cw) => cw.courseId === c.id),
  );
  const unpricedCourses = courses.filter((c) => !c.price || c.price < 10_000);
  const unpublished = courses.filter((c) => !c.isPublished);
  const avgTutorials = courses.length
    ? (tutorials.length / courses.length).toFixed(1)
    : "0";

  return [
    h2("🎓 Instaskul — Education Action Plan"),
    blank(),

    h3("School Profile"),
    p(`Admins set up: ${admins.length}`),
    admins[0]?.title
      ? p(`School name: ${admins[0].title}`)
      : actionItem("Set your school title — 3–6 words, outcome-led"),
    blank(),

    h3("Courses"),
    p(`Courses created: ${courses.length}`),
    p(`Tutorials across all courses: ${tutorials.length}`),
    p(`Average tutorials per course: ${avgTutorials}`),
    blank(),

    ...(courses.length
      ? [
          p("Your courses:"),
          ...courses
            .slice(0, 5)
            .map((c) =>
              bullet(
                `${c.title || "Untitled"} — ${
                  c.price ? `${c.price.toLocaleString()} UGX` : "No price set"
                } — ${c.isPublished ? "Published" : "Draft"}`,
              ),
            ),
        ]
      : [
          actionItem(
            "Create your first course — add a title, description, cover image, and price",
          ),
        ]),

    blank(),

    h3("Gaps & Actions"),
    ...(coursesWithoutCoursework.length
      ? [
          actionItem(
            `${coursesWithoutCoursework.length} course(s) have no coursework set — each course needs exactly one`,
          ),
        ]
      : [p("✓ All courses have coursework assigned")]),

    ...(unpricedCourses.length
      ? [
          actionItem(
            `${unpricedCourses.length} course(s) are unpriced or below 10,000 UGX — set pricing between 10,000–50,000 UGX`,
          ),
        ]
      : [p("✓ Course pricing looks healthy")]),

    ...(unpublished.length
      ? [
          actionItem(
            `${unpublished.length} course(s) are unpublished — review and publish when ready`,
          ),
        ]
      : [p("✓ All courses are published")]),

    ...(noticeboards.length === 0
      ? [actionItem("Post a welcome message to your school noticeboard")]
      : [p(`✓ Noticeboard active — ${noticeboards.length} post(s)`)]),

    blank(),
  ];
}

function vendlySection(
  shops: PlatformContext["vendly"]["shops"],
  products: PlatformContext["vendly"]["products"],
  orders: PlatformContext["vendly"]["orders"],
  categories: PlatformContext["vendly"]["categories"],
  billboards: PlatformContext["vendly"]["billboards"],
) {
  if (!shops.length && !products.length) return [];

  const paidOrders = orders.filter((o) => o.isPaid);
  const archivedProducts = products.filter((p) => p.isArchived);
  const uncategorised = products.filter((p) => !p.categoryId);
  const avgOrdersPerProduct = products.length
    ? (orders.length / products.length).toFixed(1)
    : "0";

  return [
    h2("🛍️ Vendly — Commerce Action Plan"),
    blank(),

    h3("Store Overview"),
    p(`Shops: ${shops.length}`),
    p(`Products listed: ${products.length}`),
    p(`Categories: ${categories.length}`),
    p(`Marketing billboards: ${billboards.length}`),
    blank(),

    h3("Orders"),
    p(`Total orders: ${orders.length}`),
    p(`Paid orders: ${paidOrders.length}`),
    p(`Orders per product: ${avgOrdersPerProduct}`),
    blank(),

    h3("Gaps & Actions"),
    ...(billboards.length === 0
      ? [actionItem("Add a billboard — your storefront has no hero image yet")]
      : [p(`✓ Billboard set`)]),

    ...(categories.length === 0
      ? [
          actionItem(
            "Create at least one product category before listing products",
          ),
        ]
      : [p(`✓ ${categories.length} categories configured`)]),

    ...(uncategorised.length
      ? [
          actionItem(
            `${uncategorised.length} product(s) have no category — assign them for better discovery`,
          ),
        ]
      : [p("✓ All products are categorised")]),

    ...(archivedProducts.length
      ? [
          bullet(
            `${archivedProducts.length} archived product(s) — review and relist or delete`,
          ),
        ]
      : []),

    blank(),
  ];
}

function dukabodaSection(
  deliveries: PlatformContext["dukaboda"]["deliveries"],
  riders: PlatformContext["dukaboda"]["riders"],
) {
  if (!deliveries.length && !riders.length) return [];

  const activeRiders = riders.filter((r) => r.isApproved && r.isActive);
  const pendingRiders = riders.filter((r) => !r.isApproved);

  return [
    h2("🛵 Dukaboda — Delivery Action Plan"),
    blank(),
    p(`Deliveries completed: ${deliveries.length}`),
    p(`Total riders: ${riders.length}`),
    p(`Active approved riders: ${activeRiders.length}`),
    blank(),

    h3("Gaps & Actions"),
    ...(pendingRiders.length
      ? [
          actionItem(
            `${pendingRiders.length} rider(s) pending approval — review and approve to expand capacity`,
          ),
        ]
      : []),

    ...(activeRiders.length === 0
      ? [
          actionItem(
            "No active riders yet — approve at least one rider to begin fulfilling deliveries",
          ),
        ]
      : [p(`✓ ${activeRiders.length} rider(s) active`)]),

    ...(deliveries.length === 0
      ? [
          actionItem(
            "Complete your first delivery to start building your logistics record",
          ),
        ]
      : [p(`✓ Delivery operations active`)]),

    blank(),
  ];
}

function blogSection(
  writers: PlatformContext["blog"]["writers"],
  articles: PlatformContext["blog"]["articles"],
  categories: PlatformContext["blog"]["categories"],
) {
  if (!writers.length && !articles.length) return [];

  const published = articles.filter((a) => a.isPublished);
  const unpublished = articles.filter((a) => !a.isPublished);
  const writersWithNoArticles = writers.filter(
    (w) => !articles.some((a) => a.writerId === w.id),
  );

  return [
    h2("✍️ Blog — Content Action Plan"),
    blank(),
    p(`Writers: ${writers.length}`),
    p(`Total articles: ${articles.length}`),
    p(`Published: ${published.length} | Drafts: ${unpublished.length}`),
    p(`Categories: ${categories.length}`),
    blank(),

    h3("Gaps & Actions"),
    ...(writersWithNoArticles.length
      ? [
          actionItem(
            `${writersWithNoArticles.length} writer(s) have no articles — assign or prompt them to publish their first piece`,
          ),
        ]
      : [p("✓ All writers have articles")]),

    ...(unpublished.length
      ? [
          actionItem(
            `${unpublished.length} draft article(s) — review and publish to grow your readership`,
          ),
        ]
      : [p("✓ No stale drafts")]),

    ...(categories.length === 0
      ? [actionItem("Add blog categories to make content discoverable")]
      : [p(`✓ ${categories.length} categories set`)]),

    blank(),
  ];
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function generateActionPlanDoc(context: PlatformContext) {
  const { instaskul, vendly, dukaboda, blog } = context;

  const safeInsights =
    context.insights?.trim() ||
    "No action plan insights available at this time.";

  const today = new Date().toLocaleDateString("en-UG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const doc = new Document({
    sections: [
      {
        children: [
          // ── Cover ─────────────────────────────────────────────────────────
          new Paragraph({
            children: [
              new TextRun({
                text: "Max AI Studio — Action Plan",
                bold: true,
                size: 36,
              }),
            ],
          }),
          p(`Generated: ${today}`),
          p(
            `Connected apps: ${context.meta.connectedApps.join(", ") || "None"}`,
          ),
          blank(),

          // ── AI Summary ────────────────────────────────────────────────────
          h2("AI Summary"),
          ...safeInsights.split("\n").map((line) => p(line)),
          blank(),

          // ── Per-app sections ──────────────────────────────────────────────
          ...inskakulSection(
            instaskul.admins,
            instaskul.courses,
            instaskul.tutorials,
            instaskul.courseworks,
            instaskul.noticeboards,
          ),

          ...vendlySection(
            vendly.shops,
            vendly.products,
            vendly.orders,
            vendly.categories,
            vendly.billboards,
          ),

          ...dukabodaSection(dukaboda.deliveries, dukaboda.riders),

          ...blogSection(blog.writers, blog.articles, blog.categories),

          // ── Footer ────────────────────────────────────────────────────────
          blank(),
          p("──────────────────────────────────────────"),
          p("Generated by Max AI Studio · maxnovate.com"),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}

// Keep export alias so any existing imports of generateStrategyDoc don't break
export const generateStrategyDoc = generateActionPlanDoc;
