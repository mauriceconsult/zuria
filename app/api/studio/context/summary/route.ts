import { buildUserContext } from "@/lib/studio/context";

export async function GET(req: Request) {
  try {
    const auth = req.headers.get("authorization");

    if (auth !== `Bearer ${process.env.PLATFORM_API_KEY}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");

    if (!userId) {
      return Response.json({ error: "Missing userId" }, { status: 400 });
    }

    const context = await buildUserContext(
      userId,
      process.env.PLATFORM_API_KEY!,
    );

    return Response.json({
      hasData: context.meta.hasData,
      connectedApps: context.meta.connectedApps,
      dataScore: context.meta.dataScore,
    });
  } catch {
    return Response.json({
      hasData: false,
      connectedApps: [],
      dataScore: 0,
    });
  }
}
