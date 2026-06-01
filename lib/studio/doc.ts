import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";

interface StudioDocContext {
  courses: unknown[];
  orders: unknown[];
  deliveries: unknown[];
}

export async function generateDoc({
  context,
  insights,
}: {
  context: StudioDocContext;
  insights: string;
}) {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            text: "Studio AI Report",
            heading: HeadingLevel.HEADING_1,
          }),

          new Paragraph({
            text: "Generated automatically based on your activity.",
          }),

          new Paragraph({ text: "" }),

          new Paragraph({
            text: "Summary",
            heading: HeadingLevel.HEADING_2,
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: insights,
              }),
            ],
          }),

          new Paragraph({ text: "" }),

          new Paragraph({
            text: "Data Snapshot",
            heading: HeadingLevel.HEADING_2,
          }),

          new Paragraph({
            text: `Courses: ${context.courses.length}`,
          }),
          new Paragraph({
            text: `Orders: ${context.orders.length}`,
          }),
          new Paragraph({
            text: `Deliveries: ${context.deliveries.length}`,
          }),
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
