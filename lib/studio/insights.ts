type InsightContext = {
  instaskul?: { courses?: unknown[] };
  blog?: { articles?: unknown[] };
  zuria?: {products?: unknown[]};
  vendly?: { orders?: unknown[] };
  dukaboda?: { deliveries?: unknown[] };
  meta?: {
    hasData: boolean;
    dataScore: number;
    connectedApps: string[];
  };
};

export async function generateInsights(context: InsightContext) {
  const summary = {
    articles: context.blog?.articles?.length || 0,
    products: context.zuria?.products?.length || 0,
    courses: context.instaskul?.courses?.length || 0,
    orders: context.vendly?.orders?.length || 0,
    deliveries: context.dukaboda?.deliveries?.length || 0,
    connectedApps: context.meta?.connectedApps || [],
    dataScore: context.meta?.dataScore || 0,
  };

  const prompt = `
You are a senior business intelligence analyst.

Based on this user summary:

${JSON.stringify(summary, null, 2)}

Generate:

1. Key Insights (max 3 bullet points)
2. Growth Opportunities (max 3 bullet points)
3. Risks (if any)
4. Next Best Actions (clear steps)

Be concise, practical, and specific.
`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await res.json();

    return (
      data?.choices?.[0]?.message?.content ?? "Insights could not be generated."
    );
  } catch {
    return "Insights service temporarily unavailable.";
  }
}

export async function generateGenericInsights() {
  return `
You are at the early stage of building your business.

Recommended next steps:

• Create your first course (Instaskul) or product (Vendly)
• Complete one real transaction or delivery
• Focus on a single niche before expanding
• Use Studio AI tools to generate initial content

Once activity begins, Studio AI will unlock deeper, data-driven insights.
`;
}
