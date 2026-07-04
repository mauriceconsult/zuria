// app/dukaboda/admin/page.tsx  (Zuria)
// Platform admin dashboard — approve/suspend/revoke wildcard riders.
// Protected: only PLATFORM_ADMIN_CLERK_IDS can access.

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { VehicleType } from "@prisma/client";
import { AdminRiderCard } from "./_components/admin-rider-card";
// import { AdminRiderCard } from "./_components/admin-rider-card";

const PLATFORM_ADMINS = (process.env.PLATFORM_ADMIN_CLERK_IDS ?? "")
  .split(",")
  .filter(Boolean);

// Exhaustive against the VehicleType enum — no fallback needed.
const VEHICLE_EMOJI: Record<VehicleType, string> = {
  motorcycle: "🏍️",
  bicycle: "🚲",
  car: "🚗",
};

const PAGE_SIZE = 50;

export default async function DukabodaAdminPage() {
  const { userId } = await auth();
  if (!userId || !PLATFORM_ADMINS.includes(userId)) {
    redirect("/dukaboda");
  }

  let pending: Awaited<ReturnType<typeof fetchPending>> = [];
  let shopLinked: Awaited<ReturnType<typeof fetchShopLinked>> = [];
  let platformLinked: Awaited<ReturnType<typeof fetchPlatformLinked>> = [];

  try {
    [pending, shopLinked, platformLinked] = await Promise.all([
      fetchPending(),
      fetchShopLinked(),
      fetchPlatformLinked(),
    ]);
  } catch (err) {
    console.error("[DukabodaAdmin] DB fetch failed:", err);
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl mb-2">⚠️</p>
          <p className="text-sm text-gray-500">
            Unable to load rider data. Please try again.
          </p>
        </div>
      </main>
    );
  }

  const totalActive = shopLinked.length + platformLinked.length;

  return (
    <main className="min-h-screen bg-gray-50">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 px-6 py-5 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🛵</span>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Dukaboda Admin
              </h1>
              <p className="text-xs text-gray-400">Platform rider management</p>
            </div>
          </div>

          {/* Live counters */}
          <div className="flex gap-6 text-center">
            <div>
              <p className="text-xl font-bold text-yellow-500">
                {pending.length}
              </p>
              <p className="text-xs text-gray-400">Pending</p>
            </div>
            <div>
              <p className="text-xl font-bold text-green-500">{totalActive}</p>
              <p className="text-xs text-gray-400">Active</p>
            </div>
            <div>
              <p className="text-xl font-bold text-purple-500">
                {platformLinked.length}
              </p>
              <p className="text-xs text-gray-400">Wildcard</p>
            </div>
            <div>
              <p className="text-xl font-bold text-blue-500">
                {shopLinked.length}
              </p>
              <p className="text-xs text-gray-400">Shop-linked</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-12">
        {/* ── Pending applications ───────────────────────────────────── */}
        <section>
          <SectionHeader
            title="Pending Applications"
            count={pending.length}
            countStyle="bg-yellow-100 text-yellow-700"
          />

          {pending.length === 0 ? (
            <EmptyState message="No pending applications" />
          ) : (
            <div className="space-y-3">
              {pending.map((rider) => (
                <AdminRiderCard
                  key={rider.id}
                  rider={{
                    id: rider.id,
                    name: rider.name,
                    phone: rider.phone,
                    vehicleType: rider.vehicleType,
                    vehicleEmoji: VEHICLE_EMOJI[rider.vehicleType],
                    isApproved: rider.isApproved,
                    isActive: rider.isActive,
                    rating: rider.rating,
                    jobCount: 0,
                    approvedAt: rider.approvedAt?.toISOString() ?? null,
                    createdAt: rider.createdAt.toISOString(),
                  }}
                  variant="pending"
                />
              ))}
            </div>
          )}
        </section>

        {/* ── Platform-approved (wildcard) riders ───────────────────── */}
        <section>
          <SectionHeader
            title="Wildcard Riders"
            count={platformLinked.length}
            countStyle="bg-purple-100 text-purple-700"
            subtitle="Platform-approved · 10% platform fee per delivery"
          />

          {platformLinked.length === 0 ? (
            <EmptyState message="No wildcard riders yet" />
          ) : (
            <div className="space-y-3">
              {platformLinked.map((rider) => (
                <AdminRiderCard
                  key={rider.id}
                  rider={{
                    id: rider.id,
                    name: rider.name,
                    phone: rider.phone,
                    vehicleType: rider.vehicleType,
                    vehicleEmoji: VEHICLE_EMOJI[rider.vehicleType],
                    isApproved: rider.isApproved,
                    isActive: rider.isActive,
                    rating: rider.rating,
                    jobCount: rider._count.jobs,
                    approvedAt: rider.approvedAt?.toISOString() ?? null,
                    createdAt: rider.createdAt.toISOString(),
                  }}
                  variant="wildcard"
                />
              ))}
            </div>
          )}
        </section>

        {/* ── Shop-linked riders (read-only) ─────────────────────────── */}
        <section>
          <SectionHeader
            title="Shop-linked Riders"
            count={shopLinked.length}
            countStyle="bg-green-100 text-green-700"
            subtitle="Shop-approved · 0% platform fee"
          />

          <p className="text-xs text-gray-400 mb-4">
            Managed by their respective Vendly shops. Contact the shop owner to
            approve, suspend, or remove a shop-linked rider. The platform cannot
            modify shop-linked rider status directly.
          </p>

          {shopLinked.length === 0 ? (
            <EmptyState message="No shop-linked riders yet" />
          ) : (
            <div className="space-y-3">
              {shopLinked.map((rider) => (
                <AdminRiderCard
                  key={rider.id}
                  rider={{
                    id: rider.id,
                    name: rider.name,
                    phone: rider.phone,
                    vehicleType: rider.vehicleType,
                    vehicleEmoji: VEHICLE_EMOJI[rider.vehicleType],
                    isApproved: rider.isApproved,
                    isActive: rider.isActive,
                    rating: rider.rating,
                    jobCount: rider._count.jobs,
                    approvedAt: rider.approvedAt?.toISOString() ?? null,
                    createdAt: rider.createdAt.toISOString(),
                  }}
                  variant="shop"
                />
              ))}
            </div>
          )}

          {shopLinked.length === PAGE_SIZE && (
            <p className="text-xs text-gray-400 text-center mt-4">
              Showing first {PAGE_SIZE} riders. Use the database dashboard for
              full export.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}

// ─── Data fetchers ────────────────────────────────────────────────────────────

function fetchPending() {
  return prisma.rider.findMany({
    where: { isApproved: false },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE,
  });
}

function fetchShopLinked() {
  return prisma.rider.findMany({
    where: { isApproved: true, approvedBy: "shop" },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE,
    include: { _count: { select: { jobs: true } } },
  });
}

function fetchPlatformLinked() {
  return prisma.rider.findMany({
    where: { isApproved: true, approvedBy: "platform" },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE,
    include: { _count: { select: { jobs: true } } },
  });
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function SectionHeader({
  title,
  count,
  countStyle,
  subtitle,
}: {
  title: string;
  count: number;
  countStyle: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-gray-800">{title}</h2>
          <span
            className={`text-xs font-mono px-2 py-0.5 rounded-full ${countStyle}`}
          >
            {count}
          </span>
        </div>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-white rounded-2xl p-8 text-center text-sm text-gray-400 border border-gray-100">
      {message}
    </div>
  );
}
