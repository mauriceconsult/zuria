import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateStudioStrategyDoc } from "@/lib/documents/studio-strategy";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const buffer = await generateStudioStrategyDoc();
  const body = new Uint8Array(buffer);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": 'attachment; filename="StudioAI_Strategy.docx"',
    },
  });
}
