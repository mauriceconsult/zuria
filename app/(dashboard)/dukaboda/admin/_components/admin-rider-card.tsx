"use client";

import { useTransition } from "react";

type Variant = "pending" | "wildcard" | "shop";

interface RiderCardData {
  id: string;
  name: string;
  phone: string;
  vehicleType: string;
  vehicleEmoji: string;
  isApproved: boolean;
  isActive: boolean;
  rating: number;
  jobCount: number;
  approvedAt: string | null;
  createdAt: string;
}

interface AdminRiderCardProps {
  rider: RiderCardData;
  variant: Variant;
}

export function AdminRiderCard({ rider, variant }: AdminRiderCardProps) {
  const [pending, startTransition] = useTransition();

  async function updateApproval(
    approved: boolean,
    approvalSource: "shop" | "platform",
  ) {
    startTransition(async () => {
      try {
        await fetch(`/api/admin/riders/${rider.id}/approval`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            approved,
            approvedBy: approvalSource,
          }),
        });

        // Refresh page
        window.location.reload();
      } catch (err) {
        console.error(err);
        alert("Unable to update rider.");
      }
    });
  }

  async function toggleStatus() {
    startTransition(async () => {
      try {
        await fetch(`/api/admin/riders/${rider.id}/status`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            isActive: !rider.isActive,
          }),
        });

        window.location.reload();
      } catch (err) {
        console.error(err);
        alert("Unable to update rider.");
      }
    });
  }

  return (
    <div className="bg-white border border-gray-100 rounded-xl px-5 py-4 shadow-sm">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <div className="text-3xl">{rider.vehicleEmoji}</div>

          <div>
            <h3 className="font-semibold text-gray-900">{rider.name}</h3>

            <p className="text-sm text-gray-500">{rider.phone}</p>

            <div className="flex gap-4 mt-2 text-xs text-gray-500">
              <span>
                Vehicle: <strong>{rider.vehicleType}</strong>
              </span>

              <span>⭐ {rider.rating.toFixed(1)}</span>

              <span>Jobs: {rider.jobCount}</span>
            </div>

            <div className="mt-2 flex gap-2">
              {rider.isApproved ? (
                <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">
                  Approved
                </span>
              ) : (
                <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs text-yellow-700">
                  Pending
                </span>
              )}

              <span
                className={`rounded-full px-2 py-1 text-xs ${
                  rider.isActive
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {rider.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 items-end">
          {variant === "pending" && (
            <>
              <button
                disabled={pending}
                onClick={() => updateApproval(true, "platform")}
                className="rounded-lg bg-green-600 px-3 py-2 text-white text-sm hover:bg-green-700 disabled:opacity-50"
              >
                Approve
              </button>

              <button
                disabled={pending}
                onClick={() => updateApproval(false, "platform")}
                className="rounded-lg bg-red-600 px-3 py-2 text-white text-sm hover:bg-red-700 disabled:opacity-50"
              >
                Reject
              </button>
            </>
          )}

          {variant === "wildcard" && (
            <>
              <button
                disabled={pending}
                onClick={toggleStatus}
                className="rounded-lg bg-indigo-600 px-3 py-2 text-white text-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                {rider.isActive ? "Suspend" : "Activate"}
              </button>

              <button
                disabled={pending}
                onClick={() => updateApproval(false, "platform")}
                className="rounded-lg bg-red-600 px-3 py-2 text-white text-sm hover:bg-red-700 disabled:opacity-50"
              >
                Revoke
              </button>
            </>
          )}

          {variant === "shop" && (
            <div className="text-xs text-gray-400 text-right">
              Managed by shop
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
