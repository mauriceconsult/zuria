// app/dukaboda/admin/page.tsx  (Zuria)
// Platform admin dashboard — approve/reject wildcard riders
// Protected: only PLATFORM_ADMIN_CLERK_IDS can access

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AdminRiderList } from "./_components/admin-rider-list";

const PLATFORM_ADMINS = (process.env.PLATFORM_ADMIN_CLERK_IDS ?? "").split(",").filter(Boolean);

const VEHICLE_EMOJI: Record<string, string> = {
  motorcycle: "🏍️",
  bicycle:    "🚲",
  car:        "🚗",
};

export default async function DukabodaAdminPage() {
  const { userId } = await auth();
  if (!userId || !PLATFORM_ADMINS.includes(userId)) {
    redirect("/dukaboda");
  }

  const [pending, shopLinked, platformLinked] = await Promise.all([
    // Unapproved applications
    prisma.rider.findMany({
      where:   { isApproved: false },
      orderBy: { createdAt: "desc" },
    }),
    // Shop-approved riders
    prisma.rider.findMany({
      where:   { isApproved: true, approvedBy: "shop" },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { jobs: true } } },
    }),
    // Platform-approved (wildcard) riders
    prisma.rider.findMany({
      where:   { isApproved: true, approvedBy: "platform" },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { jobs: true } } },
    }),
  ]);

  const totalActive = shopLinked.length + platformLinked.length;

  return (
    <main className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🛵</span>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Dukaboda Admin</h1>
              <p className="text-xs text-gray-400">Platform rider management</p>
            </div>
          </div>
          <div className="flex gap-4 text-center">
            <div>
              <p className="text-lg font-bold text-yellow-500">{pending.length}</p>
              <p className="text-xs text-gray-400">Pending</p>
            </div>
            <div>
              <p className="text-lg font-bold text-green-500">{totalActive}</p>
              <p className="text-xs text-gray-400">Active</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-10">

        {/* Pending applications */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-base font-semibold text-gray-800">
              Pending Applications
            </h2>
            {pending.length > 0 && (
              <span className="bg-yellow-100 text-yellow-700 text-xs font-mono px-2 py-0.5 rounded-full">
                {pending.length}
              </span>
            )}
          </div>

          {pending.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center text-sm text-gray-400 border border-gray-100">
              No pending applications
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map((rider) => (
                <AdminRiderList
                  key={rider.id}
                  rider={{
                    ...rider,
                    vehicleEmoji: VEHICLE_EMOJI[rider.vehicleType] ?? "🚴",
                    jobCount:     0,
                    approvedAt:   rider.approvedAt?.toISOString() ?? null,
                    createdAt:    rider.createdAt.toISOString(),
                  }}
                  approvalType="platform"
                  showFeeNote
                />
              ))}
            </div>
          )}
        </section>

        {/* Platform-approved (wildcard) */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-base font-semibold text-gray-800">
              Wildcard Riders
            </h2>
            <span className="bg-purple-100 text-purple-700 text-xs font-mono px-2 py-0.5 rounded-full">
              {platformLinked.length} · 10% delivery fee
            </span>
          </div>

          {platformLinked.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center text-sm text-gray-400 border border-gray-100">
              No wildcard riders yet
            </div>
          ) : (
            <div className="space-y-3">
              {platformLinked.map((rider) => (
                <AdminRiderList
                  key={rider.id}
                  rider={{
                    ...rider,
                    vehicleEmoji: VEHICLE_EMOJI[rider.vehicleType] ?? "🚴",
                    jobCount:     rider._count.jobs,
                    approvedAt:   rider.approvedAt?.toISOString() ?? null,
                    createdAt:    rider.createdAt.toISOString(),
                  }}
                  approvalType="platform"
                  approved
                />
              ))}
            </div>
          )}
        </section>

        {/* Shop-linked riders (read-only here) */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-base font-semibold text-gray-800">
              Shop-linked Riders
            </h2>
            <span className="bg-green-100 text-green-700 text-xs font-mono px-2 py-0.5 rounded-full">
              {shopLinked.length} · 0% delivery fee
            </span>
          </div>

          {shopLinked.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center text-sm text-gray-400 border border-gray-100">
              No shop-linked riders yet
            </div>
          ) : (
            <div className="space-y-3">
              {shopLinked.map((rider) => (
                <div
                  key={rider.id}
                  className="flex items-center justify-between bg-white rounded-xl px-5 py-4 border border-gray-100"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{VEHICLE_EMOJI[rider.vehicleType] ?? "🚴"}</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{rider.name}</p>
                      <p className="text-xs text-gray-400">{rider.phone}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-800">{rider._count.jobs} jobs</p>
                    <p className="text-xs text-gray-400">Shop approved</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </main>
  );
}
