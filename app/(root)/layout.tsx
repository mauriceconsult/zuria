// app/(root)/layout.tsx
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export default async function SetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ── Dukaboda subdomain — bypass Zuria auth entirely ───────────────────────
  const headersList = await headers();
  const host = headersList.get("host") ?? "";

  if (host.includes("dukaboda")) {
    redirect("/dukaboda");
  }

  // ── Normal Zuria flow ─────────────────────────────────────────────────────
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const shop = await prisma.shop.findFirst({
    where: { userId },
  });

  if (shop) {
    redirect(`/${shop.id}`);
  }

  return <>{children}</>;
}
