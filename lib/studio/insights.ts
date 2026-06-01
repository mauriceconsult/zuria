export async function generateInsights(context: Record<string, unknown>) {
  const prompt = `
You are a business intelligence assistant.

Analyze this user data and produce:
1. Key performance insights
2. Growth opportunities
3. Risks or inefficiencies

Keep it concise and actionable.

DATA:
${JSON.stringify(context, null, 2)}
`;

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

  return data?.choices?.[0]?.message?.content ?? "No insights generated.";
}

export async function generateGenericInsights() {
  return `
You are at an early stage.

Recommended next steps:
- Define a clear niche
- Launch your first product or course
- Focus on consistency over scale
- Track simple metrics (sales, engagement)

Once you start generating activity, Studio AI will provide deeper insights.
`;
}
