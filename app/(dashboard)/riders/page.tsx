// app/(dashboard)/riders/page.tsx  (Zuria — shop owner view)
//
// Shop owners see pending rider applications and approve/reject.
// Route: /riders  or  /dashboard/riders

import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { RiderApprovalList } from "./_components/rider-approval-list";

const VEHICLE_EMOJI: Record<string, string> = {
  motorcycle: "🏍️",
  bicycle:    "🚲",
  car:        "🚗",
};

const RidersPage = async () => {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [pendingRiders, approvedRiders] = await Promise.all([
    prisma.rider.findMany({
      where:   { isApproved: false },
      orderBy: { createdAt: "desc" },
    }),
    prisma.rider.findMany({
      where:   { isApproved: true },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { jobs: true } } },
    }),
  ]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Rider Management</h1>
        <p className="text-sm text-gray-500 mt-1">
          Approve riders to let them start accepting Dukaboda delivery jobs from your shop.
        </p>
      </div>

      {/* Pending applications */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-gray-800">
            Pending Applications
          </h2>
          {pendingRiders.length > 0 && (
            <span className="bg-yellow-100 text-yellow-700 text-xs font-mono px-2 py-0.5 rounded-full">
              {pendingRiders.length}
            </span>
          )}
        </div>

        {pendingRiders.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-6 text-center text-sm text-gray-400">
            No pending applications
          </div>
        ) : (
          <div className="space-y-3">
            {pendingRiders.map((rider) => (
              <RiderApprovalList
                key={rider.id}
                rider={{
                  ...rider,
                  vehicleEmoji: VEHICLE_EMOJI[rider.vehicleType] ?? "🚴",
                  jobCount: 0,
                }}
              />
            ))}
          </div>
        )}
      </section>

      {/* Approved riders */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-gray-800">
            Active Riders
          </h2>
          <span className="bg-green-100 text-green-700 text-xs font-mono px-2 py-0.5 rounded-full">
            {approvedRiders.length}
          </span>
        </div>

        {approvedRiders.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-6 text-center text-sm text-gray-400">
            No approved riders yet
          </div>
        ) : (
          <div className="space-y-3">
            {approvedRiders.map((rider) => (
              <div
                key={rider.id}
                className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {VEHICLE_EMOJI[rider.vehicleType] ?? "🚴"}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {rider.name}
                    </p>
                    <p className="text-xs text-gray-400">{rider.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Jobs completed</p>
                    <p className="text-sm font-semibold text-gray-800">
                      {rider._count.jobs}
                    </p>
                  </div>
                  <div
                    className={`w-2 h-2 rounded-full ${
                      rider.isActive ? "bg-green-400" : "bg-gray-300"
                    }`}
                    title={rider.isActive ? "Online" : "Offline"}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default RidersPage;
