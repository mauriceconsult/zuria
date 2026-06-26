import { Document, Paragraph, TextRun, Packer } from "docx";
import { PlatformContext } from "./types";

export async function generateStrategyDoc(context: PlatformContext) {
  const courses = context.instaskul.courses;
  const orders = context.vendly.orders;
  const deliveries = context.dukaboda.deliveries;
  const insights = context.insights || "";

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: "Max AI Studio Strategy Report",
                bold: true,
                size: 32,
              }),
            ],
          }),

          new Paragraph({
            children: [new TextRun({ text: "Courses", bold: true })],
          }),

          ...courses.slice(0, 5).map(
            (c) =>
              new Paragraph({
                children: [new TextRun(`• ${c.title || "Untitled course"}`)],
              }),
          ),

          new Paragraph({
            children: [new TextRun(`Total Courses: ${courses.length}`)],
          }),

          new Paragraph({
            children: [new TextRun(`Orders: ${orders.length}`)],
          }),

          new Paragraph({
            children: [new TextRun(`Deliveries: ${deliveries.length}`)],
          }),

          new Paragraph({
            children: [new TextRun({ text: "Insights:", bold: true })],
          }),

          new Paragraph({
            children: [new TextRun(insights)],
          }),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
