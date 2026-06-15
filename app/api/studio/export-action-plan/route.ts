// app/api/studio/export-action-plan/route.ts
import { auth } from "@clerk/nextjs/server";
import { buildUserContext } from "@/lib/studio/context";
import { generateActionPlanDoc } from "@/lib/studio/doc";

export async function POST() {
  const { userId, getToken } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const token = await getToken();
  if (!token) return new Response("No token", { status: 401 });

  // context.insights is already populated by buildUserContext —
  // no second generateInsights call needed
  const context = await buildUserContext(userId, token);

  const buffer = await generateActionPlanDoc(context);
  const body = new Uint8Array(buffer);

  return new Response(body, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename=Max_AI_Studio_Action_Plan.docx`,
    },
  });
}
