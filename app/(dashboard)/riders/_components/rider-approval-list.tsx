// app/(dashboard)/riders/_components/rider-approval-list.tsx

"use client";

import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

interface RiderCardProps {
  rider: {
    id:           string;
    name:         string;
    phone:        string;
    email:        string;
    vehicleType:  string;
    vehicleEmoji: string;
    jobCount:     number;
    createdAt:    Date;
  };
}

export function RiderApprovalList({ rider }: RiderCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);

  const handleAction = async (action: "approve" | "reject") => {
    try {
      setLoading(action);
      await axios.patch(`/api/riders/${rider.id}/approval`, {
        approved: action === "approve",
      });
      toast.success(
        action === "approve"
          ? `${rider.name} approved — they can now receive jobs.`
          : `${rider.name} application rejected.`
      );
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex items-center justify-between bg-white border border-yellow-100 rounded-xl px-4 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{rider.vehicleEmoji}</span>
        <div>
          <p className="text-sm font-semibold text-gray-900">{rider.name}</p>
          <p className="text-xs text-gray-400">{rider.phone}</p>
          <p className="text-xs text-gray-400 capitalize">
            {rider.vehicleType}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Reject */}
        <button
          onClick={() => handleAction("reject")}
          disabled={!!loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
        >
          {loading === "reject" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <XCircle className="h-3.5 w-3.5" />
          )}
          Reject
        </button>

        {/* Approve */}
        <button
          onClick={() => handleAction("approve")}
          disabled={!!loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#0286ff] rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
        >
          {loading === "approve" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <CheckCircle className="h-3.5 w-3.5" />
          )}
          Approve
        </button>
      </div>
    </div>
  );
}
