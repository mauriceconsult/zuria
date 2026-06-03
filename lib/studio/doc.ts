import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import { PlatformContext } from "./types";

export async function generateDoc({
  context,
  insights,
}: {
  context: PlatformContext;
  insights: string;
}) {
  // ── Extract ───────────────────────────────────────
  const { instaskul, vendly, dukaboda, blog } = context;

  const courses = instaskul.courses;
  const tutorials = instaskul.tutorials;

  const orders = vendly.orders;
  const products = vendly.products;
  const categories = vendly.categories;
  const billboards = vendly.billboards;

  const deliveries = dukaboda.deliveries;

  const articles = blog.articles;
  const writers = blog.writers;

  // ── Computed Metrics ─────────────────────────────
  const avgTutorialsPerCourse = courses.length
    ? (tutorials.length / courses.length).toFixed(1)
    : "0";

  const avgOrdersPerProduct = products.length
    ? (orders.length / products.length).toFixed(1)
    : "0";

  const contentPerWriter = writers.length
    ? (articles.length / writers.length).toFixed(1)
    : "0";

  const safeInsights =
    insights?.trim() || "No insights available at this time.";

  // ── Document ─────────────────────────────────────
  const doc = new Document({
    sections: [
      {
        children: [
          // ── Title ─────────────────────────────
          new Paragraph({
            text: "Studio AI Executive Report",
            heading: HeadingLevel.HEADING_1,
          }),

          new Paragraph({
            text: "A cross-platform performance and strategy overview.",
          }),

          new Paragraph({ text: "" }),

          // ── Summary ───────────────────────────
          new Paragraph({
            text: "Executive Summary",
            heading: HeadingLevel.HEADING_2,
          }),

          ...safeInsights.split("\n").map(
            (line) =>
              new Paragraph({
                children: [new TextRun(line)],
              }),
          ),

          new Paragraph({ text: "" }),

          // =====================================================
          // 🎓 EDUCATION (INSTASKUL)
          // =====================================================
          new Paragraph({
            text: "Education (Instaskul)",
            heading: HeadingLevel.HEADING_2,
          }),

          new Paragraph({
            text: `Courses created: ${courses.length}`,
          }),

          new Paragraph({
            text: `Total tutorials: ${tutorials.length}`,
          }),

          new Paragraph({
            text: `Average lessons per course: ${avgTutorialsPerCourse}`,
          }),

          ...(courses.length
            ? [
                new Paragraph({ text: "Top Courses:" }),

                ...courses.slice(0, 5).map(
                  (c) =>
                    new Paragraph({
                      text: `• ${c.title || "Untitled course"}`,
                    }),
                ),
              ]
            : [
                new Paragraph({
                  text: "No courses yet. Consider launching your first course.",
                }),
              ]),

          new Paragraph({ text: "" }),

          // =====================================================
          // 🛒 COMMERCE (VENDLY)
          // =====================================================
          new Paragraph({
            text: "Commerce (Vendly)",
            heading: HeadingLevel.HEADING_2,
          }),

          new Paragraph({
            text: `Orders processed: ${orders.length}`,
          }),

          new Paragraph({
            text: `Products listed: ${products.length}`,
          }),

          new Paragraph({
            text: `Categories: ${categories.length}`,
          }),

          new Paragraph({
            text: `Marketing assets (billboards): ${billboards.length}`,
          }),

          new Paragraph({
            text: `Orders per product: ${avgOrdersPerProduct}`,
          }),

          new Paragraph({ text: "" }),

          // =====================================================
          // 🚚 LOGISTICS (DUKABODA)
          // =====================================================
          new Paragraph({
            text: "Logistics (Dukaboda)",
            heading: HeadingLevel.HEADING_2,
          }),

          new Paragraph({
            text: `Delivery jobs completed: ${deliveries.length}`,
          }),

          new Paragraph({
            text:
              deliveries.length > 0
                ? "Logistics operations are active."
                : "No delivery activity yet.",
          }),

          new Paragraph({ text: "" }),

          // =====================================================
          // 📰 MEDIA (BLOG)
          // =====================================================
          new Paragraph({
            text: "Media (Maxnovate Blog)",
            heading: HeadingLevel.HEADING_2,
          }),

          new Paragraph({
            text: `Articles published: ${articles.length}`,
          }),

          new Paragraph({
            text: `Writers active: ${writers.length}`,
          }),

          new Paragraph({
            text: `Articles per writer: ${contentPerWriter}`,
          }),

          ...(articles.length
            ? [
                new Paragraph({ text: "Recent Articles:" }),

                ...articles.slice(0, 5).map(
                  (a) =>
                    new Paragraph({
                      text: `• ${a.title || "Untitled article"}`,
                    }),
                ),
              ]
            : [
                new Paragraph({
                  text: "No articles yet. Consider publishing your first content piece.",
                }),
              ]),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
