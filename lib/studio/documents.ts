import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";

interface StrategyContext {
  courses: { title?: string }[];
  orders: { total?: number }[];
  deliveries: { status?: string }[];
  insights: string;
  meta?: {
    hasData: boolean;
    dataScore: number;
    connectedApps: string[];
  };
}

export async function generateStrategyDoc(context: StrategyContext) {
  const { courses, orders, deliveries, insights, meta } = context;

  const doc = new Document({
    sections: [
      {
        children: [
          // ── TITLE ──
          new Paragraph({
            text: "Studio AI Strategy Report",
            heading: HeadingLevel.TITLE,
          }),

          // ── SUMMARY ──
          new Paragraph({
            text: "Executive Summary",
            heading: HeadingLevel.HEADING_1,
          }),

          new Paragraph({
            children: [
              new TextRun(
                meta?.hasData
                  ? `You are active across ${
                      meta.connectedApps.join(", ") || "platform modules"
                    } with a data score of ${meta.dataScore}.`
                  : "You are at an early stage. No platform activity detected yet.",
              ),
            ],
          }),

          // ── ACTIVITY ──
          new Paragraph({
            text: "Activity Overview",
            heading: HeadingLevel.HEADING_1,
          }),

          new Paragraph({
            children: [new TextRun(`Courses: ${courses.length}`)],
          }),
          new Paragraph({
            children: [new TextRun(`Orders: ${orders.length}`)],
          }),
          new Paragraph({
            children: [new TextRun(`Deliveries: ${deliveries.length}`)],
          }),

          // ── COURSE SAMPLE ──
          ...(courses.length > 0
            ? [
                new Paragraph({
                  text: "Top Courses",
                  heading: HeadingLevel.HEADING_2,
                }),

                ...courses.slice(0, 5).map(
                  (c) =>
                    new Paragraph({
                      children: [
                        new TextRun(`• ${c.title || "Untitled course"}`),
                      ],
                    }),
                ),
              ]
            : []),

          // ── INSIGHTS ──
          new Paragraph({
            text: "AI Insights",
            heading: HeadingLevel.HEADING_1,
          }),

          ...insights.split("\n").map(
            (line) =>
              new Paragraph({
                children: [new TextRun(line)],
              }),
          ),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
