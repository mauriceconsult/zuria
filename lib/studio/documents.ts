import { Document, Packer, Paragraph, TextRun } from "docx";

type Course = {
  id?: string;
  title?: string;
  // add other course fields as needed
};

type Order = {
  id?: string;
  total?: number;
  // add other order fields as needed
};

type Delivery = {
  id?: string;
  status?: string;
  // add other delivery fields as needed
};

interface StrategyContext {
  courses: Course[];
  orders: Order[];
  deliveries: Delivery[];
  insights: string;
}

export async function generateStrategyDoc(context: StrategyContext) {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: "Studio AI Strategy Report",
                bold: true,
                size: 32,
              }),
            ],
          }),

          new Paragraph({
            children: [new TextRun({ text: "Courses", bold: true })],
          }),

          ...context.courses.slice(0, 5).map(
            (c) =>
              new Paragraph({
                children: [new TextRun(`• ${c.title || "Untitled course"}`)],
              }),
              ),
          

          new Paragraph({
            children: [new TextRun(`Courses: ${context.courses.length}`)],
          }),

          new Paragraph({
            children: [new TextRun(`Orders: ${context.orders.length}`)],
          }),

          new Paragraph({
            children: [new TextRun(`Deliveries: ${context.deliveries.length}`)],
          }),

          new Paragraph({
            children: [new TextRun({ text: "Insights:", bold: true })],
          }),

          new Paragraph({
            children: [new TextRun(context.insights || "")],
          }),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
