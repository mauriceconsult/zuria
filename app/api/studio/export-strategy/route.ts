import { auth } from "@clerk/nextjs/server";
import { buildUserContext } from "@/lib/studio/context";
import { generateDoc } from "@/lib/studio/doc";
import {
  generateInsights,
  generateGenericInsights,
} from "@/lib/studio/insights";

export async function POST() {
  const { userId, getToken } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const token = await getToken();
  if (!token) return new Response("No token", { status: 401 });

  const context = await buildUserContext(userId, token);

  const insights = context.meta.hasData
    ? await generateInsights(context)
    : await generateGenericInsights();

  const buffer = await generateDoc({ context, insights });

  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;

  return new Response(arrayBuffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": "attachment; filename=Studio_Report.docx",
    },
  });
}
