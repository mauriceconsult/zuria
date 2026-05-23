// app/dukaboda/track/[jobId]/_components/tracking-client.tsx
"use client";

import { useEffect, useState } from "react";
import axios from "axios";

type DeliveryStatus =
  | "pending" | "accepted" | "picking_up" | "picked_up"
  | "in_transit" | "delivered" | "cancelled" | "failed";

interface TrackingData {
  jobId:          string;
  status:         string;
  shopName:       string;
  shopAddress:    string;
  dropoffAddress: string;
  riderName:      string | null;
  riderVehicle:   string | null;
  acceptedAt:     string | null;
  deliveredAt:    string | null;
  createdAt:      string;
}

const STATUS_CONFIG: Record<string, {
  icon:    string;
  label:   string;
  color:   string;
  bgColor: string;
  done:    boolean;
}> = {
  pending:    { icon: "⏳", label: "Order placed",       color: "text-yellow-600", bgColor: "bg-yellow-50",  done: false },
  accepted:   { icon: "🏍️", label: "Rider assigned",     color: "text-blue-600",   bgColor: "bg-blue-50",    done: false },
  picking_up: { icon: "🏪", label: "Heading to shop",    color: "text-blue-600",   bgColor: "bg-blue-50",    done: false },
  picked_up:  { icon: "📦", label: "Package collected",  color: "text-purple-600", bgColor: "bg-purple-50",  done: false },
  in_transit: { icon: "🛵", label: "On the way to you",  color: "text-indigo-600", bgColor: "bg-indigo-50",  done: false },
  delivered:  { icon: "✅", label: "Delivered",           color: "text-green-600",  bgColor: "bg-green-50",   done: true  },
  cancelled:  { icon: "❌", label: "Cancelled",           color: "text-gray-500",   bgColor: "bg-gray-50",    done: true  },
  failed:     { icon: "⚠️", label: "Delivery failed",    color: "text-red-600",    bgColor: "bg-red-50",     done: true  },
};

const STEPS: DeliveryStatus[] = [
  "pending", "accepted", "picking_up", "picked_up", "in_transit", "delivered",
];

const VEHICLE_EMOJI: Record<string, string> = {
  motorcycle: "🏍️",
  bicycle:    "🚲",
  car:        "🚗",
};

export function TrackingClient({ initialData }: { initialData: TrackingData }) {
  const [data, setData] = useState(initialData);

  // Poll every 15 seconds until delivered/cancelled/failed
  useEffect(() => {
    const isDone = ["delivered", "cancelled", "failed"].includes(data.status);
    if (isDone) return;

    const interval = setInterval(async () => {
      try {
        const { data: fresh } = await axios.get(
          `/api/delivery/jobs/${data.jobId}/track`
        );
        setData(fresh);
      } catch {
        // silently ignore — show stale data
      }
    }, 15_000);

    return () => clearInterval(interval);
  }, [data.jobId, data.status]);

  const config       = STATUS_CONFIG[data.status] ?? STATUS_CONFIG.pending;
  const currentIndex = STEPS.indexOf(data.status as DeliveryStatus);
  const isTerminal   = ["delivered", "cancelled", "failed"].includes(data.status);

  return (
    <main className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-2">
          <span className="text-xl">🛵</span>
          <span className="font-bold text-gray-900">Dukaboda</span>
          <span className="text-xs text-gray-400 ml-auto font-mono">
            #{data.jobId.slice(0, 8)}
          </span>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 py-8 space-y-5">

        {/* Status hero */}
        <div className={`rounded-2xl p-6 text-center ${config.bgColor}`}>
          <span className="text-5xl mb-3 block">{config.icon}</span>
          <h1 className={`text-xl font-bold ${config.color}`}>
            {config.label}
          </h1>
          {!isTerminal && (
            <p className="text-xs text-gray-400 mt-1">
              Updates every 15 seconds
            </p>
          )}
        </div>

        {/* Progress steps */}
        {!["cancelled", "failed"].includes(data.status) && (
          <div className="bg-white rounded-2xl p-5 border border-gray-100">
            <div className="flex justify-between items-center">
              {STEPS.map((step, i) => {
                const stepConfig = STATUS_CONFIG[step];
                const done       = i < currentIndex;
                const active     = i === currentIndex;
                return (
                  <div key={step} className="flex flex-col items-center flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm mb-1 ${
                      done   ? "bg-[#0286ff] text-white" :
                      active ? "bg-blue-100 text-[#0286ff] border-2 border-[#0286ff]" :
                               "bg-gray-100 text-gray-300"
                    }`}>
                      {done ? "✓" : stepConfig.icon}
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className={`h-0.5 w-full mt-3 ${
                        i < currentIndex ? "bg-[#0286ff]" : "bg-gray-200"
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Rider info */}
        {data.riderName && (
          <div className="bg-white rounded-2xl p-5 border border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
              Your Rider
            </p>
            <div className="flex items-center gap-3">
              <span className="text-3xl">
                {VEHICLE_EMOJI[data.riderVehicle ?? ""] ?? "🚴"}
              </span>
              <div>
                <p className="font-semibold text-gray-900">{data.riderName}</p>
                <p className="text-xs text-gray-400 capitalize">
                  {data.riderVehicle} · Dukaboda rider
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Route */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
            Delivery Route
          </p>
          <div className="flex items-start gap-3">
            <span className="text-lg mt-0.5">🏪</span>
            <div>
              <p className="text-xs text-gray-400">Pickup</p>
              <p className="text-sm font-semibold text-gray-900">{data.shopName}</p>
              <p className="text-xs text-gray-400">{data.shopAddress}</p>
            </div>
          </div>
          <div className="w-0.5 h-4 bg-gray-200 ml-3.5" />
          <div className="flex items-start gap-3">
            <span className="text-lg mt-0.5">📍</span>
            <div>
              <p className="text-xs text-gray-400">Dropoff</p>
              <p className="text-sm font-semibold text-gray-900">Your location</p>
              <p className="text-xs text-gray-400">{data.dropoffAddress}</p>
            </div>
          </div>
        </div>

        {/* Delivered */}
        {data.status === "delivered" && (
          <div className="bg-green-50 border border-green-100 rounded-2xl p-5 text-center">
            <span className="text-4xl mb-2 block">🎉</span>
            <p className="font-bold text-green-700">Your order has been delivered!</p>
            <p className="text-xs text-green-600 mt-1">
              Thank you for shopping on Vendly
            </p>
          </div>
        )}

      </div>
    </main>
  );
}
