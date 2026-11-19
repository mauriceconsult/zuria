import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import SafaricomPayouts from "./safaricom-payouts";

export default async function SafaricomPayoutsPage() {
  const { userId } = await auth();
  const allowedIds = (process.env.PAYOUT_ADMIN_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (!userId || !allowedIds.includes(userId)) notFound();

  return <SafaricomPayouts />;
}
