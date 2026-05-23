// app/dukaboda/admin/_components/admin-rider-list.tsx
"use client";

import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

interface AdminRiderListProps {
  rider: {
    id:           string;
    name:         string;
    phone:        string;
    email:        string;
    vehicleType:  string;
    vehicleEmoji: string;
    jobCount:     number;
    createdAt:    string;
    approvedAt:   string | null;
  };
  approvalType: "platform";
  approved?:    boolean;
  showFeeNote?: boolean;
}

export function AdminRiderList({
  rider,
  approved = false,
  showFeeNote = false,
}: AdminRiderListProps) {
  const router  = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);

  const handleAction = async (action: "approve" | "reject") => {
    try {
      setLoading(action);
      await axios.patch(`/api/admin/riders/${rider.id}/approval`, {
        approved:    action === "approve",
        approvedBy:  "platform",
      });
      toast.success(
        action === "approve"
          ? `${rider.name} approved as wildcard rider (10% delivery fee applies).`
          : `${rider.name} application rejected.`
      );
      router.refresh();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className={`flex items-center justify-between rounded-xl px-5 py-4 border ${
      approved
        ? "bg-white border-gray-100"
        : "bg-white border-yellow-100"
    }`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{rider.vehicleEmoji}</span>
        <div>
          <p className="text-sm font-semibold text-gray-900">{rider.name}</p>
          <p className="text-xs text-gray-400">{rider.phone}</p>
          <p className="text-xs text-gray-400 capitalize">{rider.vehicleType}</p>
          {showFeeNote && (
            <p className="text-xs text-purple-500 mt-0.5">
              10% delivery fee will apply
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {approved ? (
          <>
            <span className="text-xs text-gray-400">{rider.jobCount} jobs</span>
            <button
              onClick={() => handleAction("reject")}
              disabled={!!loading}
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-500 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              {loading === "reject"
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : <XCircle className="h-3 w-3" />}
              Revoke
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => handleAction("reject")}
              disabled={!!loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              {loading === "reject"
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <XCircle className="h-3.5 w-3.5" />}
              Reject
            </button>
            <button
              onClick={() => handleAction("approve")}
              disabled={!!loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-[#0286ff] rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              {loading === "approve"
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <CheckCircle className="h-3.5 w-3.5" />}
              Approve
            </button>
          </>
        )}
      </div>
    </div>
  );
}
