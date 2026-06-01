// lib/documents/studioStrategy.ts
import {
  Document, Packer, Paragraph, TextRun
  // (keep your full imports)
} from "docx";

export async function generateStudioStrategyDoc() {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [
              new TextRun("STUDIO AI Strategy"),
            ],
          }),
        ],
      },
    ],
  });

  // 👉 paste your FULL document-building logic here
  // (cover, sections, tables, etc.)

  const buffer = await Packer.toBuffer(doc);
  return buffer;
}