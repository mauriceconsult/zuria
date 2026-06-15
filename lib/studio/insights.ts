// lib/studio/insights.ts
// Generates contextual action-plan insights using Claude.
// Uses PlatformContext — InsightContext is retired.

import { PlatformContext } from "./types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildSummary(context: PlatformContext) {
  const { instaskul, vendly, dukaboda, blog } = context;

  return {
    instaskul: {
      admins: instaskul.admins.length,
      courses: instaskul.courses.length,
      tutorials: instaskul.tutorials.length,
      courseworks: instaskul.courseworks.length,
      noticeboards: instaskul.noticeboards.length,
      // Derived gaps
      coursesWithoutCoursework: instaskul.courses.filter(
        (c) => !instaskul.courseworks.some((cw) => cw.courseId === c.id),
      ).length,
      unpricedCourses: instaskul.courses.filter(
        (c) => !c.price || c.price < 10_000,
      ).length,
      unpublishedCourses: instaskul.courses.filter((c) => !c.isPublished)
        .length,
    },
    vendly: {
      shops: vendly.shops.length,
      products: vendly.products.length,
      orders: vendly.orders.length,
      categories: vendly.categories.length,
      billboards: vendly.billboards.length,
      // Derived gaps
      archivedProducts: vendly.products.filter((p) => p.isArchived).length,
      productsWithNoCategory: vendly.products.filter((p) => !p.categoryId)
        .length,
      paidOrders: vendly.orders.filter((o) => o.isPaid).length,
    },
    dukaboda: {
      deliveries: dukaboda.deliveries.length,
      riders: dukaboda.riders.length,
      activeRiders: dukaboda.riders.filter((r) => r.isActive && r.isApproved)
        .length,
    },
    blog: {
      writers: blog.writers.length,
      articles: blog.articles.length,
      // Derived gaps
      publishedArticles: blog.articles.filter((a) => a.isPublished).length,
      unpublishedArticles: blog.articles.filter((a) => !a.isPublished).length,
      writersWithNoArticles: blog.writers.filter(
        (w) => !blog.articles.some((a) => a.writerId === w.id),
      ).length,
    },
    meta: context.meta,
  };
}

function buildActionPlanPrompt(summary: ReturnType<typeof buildSummary>) {
  return `
You are a Max AI Studio action plan advisor. Your role is to give the user
specific, prioritised next steps — not a generic report.

User's current platform summary:
${JSON.stringify(summary, null, 2)}

Rules:
- Only include sections for apps where the user has data (connectedApps).
- Lead each section with the highest-impact gap first.
- Be direct: "You have 3 courses with no coursework set — add one before publishing."
- Pricing context: Instaskul courses should be priced 10,000–50,000 UGX.
- Max 3 action items per app section.
- If a metric looks healthy, say so briefly and move on.
- End with one cross-platform recommendation if the user is on 2+ apps.

Format:
## [App name] Action Items
- [Action]
- [Action]
- [Action]

## Cross-Platform (only if 2+ apps connected)
- [Recommendation]
`.trim();
}

// ── Exports ───────────────────────────────────────────────────────────────────

export async function generateInsights(
  context: PlatformContext,
): Promise<string> {
  const summary = buildSummary(context);
  const prompt = buildActionPlanPrompt(summary);

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      console.error("Claude insights error:", res.status, await res.text());
      return "Action plan could not be generated right now.";
    }

    const data = await res.json();
    return data?.content?.[0]?.text ?? "Action plan could not be generated.";
  } catch (err) {
    console.error("Claude insights exception:", err);
    return "Insights service temporarily unavailable.";
  }
}

export function generateGenericInsights(): string {
  return `
Your workspace is ready — here's where to start:

## Getting started
- Create your first course on Instaskul to begin building an audience
- List at least one product on Vendly to test your market
- Complete a delivery on Dukaboda to activate logistics tracking

Once you have activity, Studio AI will generate a personalised action plan
based on real gaps and growth opportunities in your data.
`.trim();
}
