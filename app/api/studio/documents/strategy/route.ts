import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { buildUserContext } from "@/lib/studio/context";
import { generateStrategyDoc } from "@/lib/studio/documents";

export async function GET() {
  const { userId, getToken } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = await getToken();

  const context = await buildUserContext(userId, token!);
  const buffer = await generateStrategyDoc(context);

  
  const arrayBuffer = new Uint8Array(buffer).buffer;

  return new NextResponse(arrayBuffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": "attachment; filename=studio-report.docx",
    },
  });
}
