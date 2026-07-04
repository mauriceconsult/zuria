// app/dukaboda/page.tsx  (Zuria)
// Public landing page for dukaboda.maxnovate.com
// Recruits riders — explains the opportunity, vehicle types, earnings.
//
// Pricing constants mirror VEHICLE_TIERS in lib/delivery/providers/custom.ts.
// If rates change there, update here too (or import VEHICLE_TIERS directly).

import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { DukabodaLogo } from "@/components/ui/dukaboda-logo";

const APK_URL = process.env.NEXT_PUBLIC_DUKABODA_APK_URL ?? "#";

// ── Vehicle cards — distance limits and descriptions ──────────────────────────
const VEHICLES = [
  {
    icon:        "🚲",
    label:       "Bicycle",
    description: "Short-range deliveries up to 3 km",
    limit:       "Max 3 km",
    badge:       "bg-green-50 text-green-700",
  },
  {
    icon:        "🏍️",
    label:       "Motorcycle / Boda",
    description: "Fast pickups, ideal for most orders",
    limit:       "Max 8 km",
    badge:       "bg-blue-50 text-blue-700",
  },
  {
    icon:        "🚗",
    label:       "Car / Van",
    description: "Large, fragile, or long-distance orders",
    limit:       "Unlimited",
    badge:       "bg-purple-50 text-purple-700",
  },
];

// ── Earnings — derived from VEHICLE_TIERS in custom.ts ────────────────────────
// Bicycle:    UGX 2,000 base + UGX 800/km   · max 3 km
// Motorcycle: UGX 3,000 base + UGX 1,200/km · max 8 km
// Car:        UGX 5,000 base + UGX 2,000/km · unlimited
const VEHICLE_EARNINGS = [
  {
    icon:    "🚲",
    type:    "Bicycle",
    limit:   "Max 3 km",
    formula: "UGX 2,000 base + UGX 800/km",
    accent:  "text-green-600",
    badge:   "bg-green-50 text-green-700",
    border:  "border-green-100",
    rows: [
      { distance: "1 km", fee: "UGX 2,800", note: "Estate drop"   },
      { distance: "2 km", fee: "UGX 3,600", note: "Nearby suburb" },
      { distance: "3 km", fee: "UGX 4,400", note: "Max range"     },
    ],
  },
  {
    icon:    "🏍️",
    type:    "Motorcycle",
    limit:   "Max 8 km",
    formula: "UGX 3,000 base + UGX 1,200/km",
    accent:  "text-[#0286ff]",
    badge:   "bg-blue-50 text-blue-700",
    border:  "border-blue-100",
    rows: [
      { distance: "2 km", fee: "UGX 5,400",  note: "Within suburb"  },
      { distance: "5 km", fee: "UGX 9,000",  note: "Cross-suburb"   },
      { distance: "8 km", fee: "UGX 12,600", note: "Max range"      },
    ],
  },
  {
    icon:    "🚗",
    type:    "Car / Van",
    limit:   "Unlimited",
    formula: "UGX 5,000 base + UGX 2,000/km",
    accent:  "text-purple-600",
    badge:   "bg-purple-50 text-purple-700",
    border:  "border-purple-100",
    rows: [
      { distance: "5 km",  fee: "UGX 15,000", note: "City delivery"    },
      { distance: "10 km", fee: "UGX 25,000", note: "Outer Kampala"    },
      { distance: "15 km", fee: "UGX 35,000", note: "Greater Kampala"  },
    ],
  },
];

// ── How to get started ────────────────────────────────────────────────────────
const STEPS = [
  {
    step:        "1",
    title:       "Download the app",
    description: "Install Dukaboda on your Android phone — free, no Play Store needed.",
  },
  {
    step:        "2",
    title:       "Create your profile",
    description: "Enter your name, MTN MoMo number, and vehicle type.",
  },
  {
    step:        "3",
    title:       "Get approved",
    description: "A Vendly shop owner or Dukaboda admin reviews your application.",
  },
  {
    step:        "4",
    title:       "Start delivering",
    description: "Accept jobs, deliver orders, earn via MoMo after every confirmed drop-off.",
  },
];

export default function DukabodaLandingPage() {
  return (
    <main className="min-h-screen bg-white font-sans">

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <DukabodaLogo variant="primary" size={36} />
        <Link
          href="/dukaboda/admin"
          className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-black transition-colors"
        >
          Admin
          <ArrowRight className="h-4 w-4" />
        </Link>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="px-6 py-20 text-center bg-linear-to-b from-blue-50 to-white">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-center mb-6">
            <DukabodaLogo variant="primary" size={80} />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 mb-4 leading-tight">
            Deliver with Dukaboda.
            <br />
            <span className="text-[#0286ff]">Earn every shilling.</span>
          </h1>
          <p className="text-lg text-gray-500 mb-8 leading-relaxed">
            Join Kampala&apos;s fastest-growing delivery network. Pick up orders
            from Vendly shops and earn the delivery fee — paid directly to your
            MTN MoMo number after every confirmed drop-off.
          </p>
          <a
            href={APK_URL}
            className="inline-flex items-center gap-2 bg-[#0286ff] text-white px-8 py-4 rounded-full text-base font-semibold hover:bg-blue-600 transition-colors shadow-lg shadow-blue-200"
          >
            📱 Download the App
          </a>
          <p className="text-xs text-gray-400 mt-3">
            Android · Free · No Play Store needed
          </p>
          <p className="text-xs text-gray-500 flex items-center justify-center gap-1 mt-1">
            <span className="text-green-500">🔒</span>
            Built by{" "}
            <a href="https://maxnovate.com" className="underline hover:text-gray-700">
              Maxnovate
            </a>{" "}
            · Kampala, Uganda · Safe to install
          </p>
        </div>
      </section>

      {/* ── Installation guide ──────────────────────────────────────────── */}
      <section className="px-6 py-12 bg-amber-50 border-y border-amber-100">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-start gap-3 mb-6">
            <span className="text-2xl mt-0.5">⚠️</span>
            <div>
              <h2 className="text-base font-bold text-amber-900 mb-1">
                Google will warn you — here&apos;s what to do
              </h2>
              <p className="text-sm text-amber-700 leading-relaxed">
                Because Dukaboda is not on the Play Store yet, Android shows a
                security warning when you install it. This is normal for trusted
                apps distributed directly. Follow these steps:
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {[
              {
                step:  "1",
                title: 'Tap "Download anyway"',
                body:  'When Google warns "This file may be harmful", tap Download anyway. The file is safe — Google flags all APKs not on the Play Store.',
              },
              {
                step:  "2",
                title: 'Allow "Install unknown apps"',
                body:  "Android will ask permission to install apps from your browser. Tap Settings → enable Allow from this source → go back and tap Install.",
              },
              {
                step:  "3",
                title: 'Tap "Install" on the next screen',
                body:  'Android shows one final "Do you want to install this app?" screen. Tap Install. The app is now on your phone.',
              },
              {
                step:  "4",
                title: "Open Dukaboda and sign up",
                body:  "Tap Open or find Dukaboda in your app drawer. Create your account, pick your vehicle type, and submit your application.",
              },
            ].map((s) => (
              <div
                key={s.step}
                className="flex items-start gap-4 bg-white rounded-2xl p-4 border border-amber-100"
              >
                <span className="shrink-0 w-7 h-7 rounded-full bg-amber-400 text-white text-xs font-bold flex items-center justify-center">
                  {s.step}
                </span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{s.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{s.body}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-amber-600 text-center mt-5">
            Still unsure?{" "}
            <a href="https://maxnovate.com/contact" className="underline font-medium">
              Contact Maxnovate support
            </a>{" "}
            — we&apos;re happy to help.
          </p>
        </div>
      </section>

      {/* ── Why Dukaboda ────────────────────────────────────────────────── */}
      <section className="px-6 py-16 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">
          Why ride with Dukaboda?
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            {
              icon:  "💰",
              title: "Keep up to 100%",
              body:  "Shop-linked riders keep every shilling of the delivery fee. Wildcard riders retain 90% — still among the best rates in Kampala.",
            },
            {
              icon:  "📱",
              title: "MoMo pay per delivery",
              body:  "Earnings go directly to your registered MTN MoMo number after each confirmed drop-off. No weekly waits.",
            },
            {
              icon:  "🕐",
              title: "Work your hours",
              body:  "Go online when you want, offline when you don't. No shifts, no minimums, no penalties.",
            },
          ].map((item) => (
            <div key={item.title} className="bg-gray-50 rounded-2xl p-6">
              <span className="text-3xl mb-3 block">{item.icon}</span>
              <h3 className="font-bold text-gray-900 mb-1">{item.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Vehicle types ───────────────────────────────────────────────── */}
      <section className="px-6 py-16 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
            All vehicles welcome
          </h2>
          <p className="text-sm text-gray-400 text-center mb-10">
            Choose your vehicle during sign-up · distance limits apply per tier
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {VEHICLES.map((v) => (
              <div
                key={v.label}
                className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm text-center"
              >
                <span className="text-4xl mb-3 block">{v.icon}</span>
                <p className="font-semibold text-gray-900 text-sm">{v.label}</p>
                <p className="text-xs text-gray-400 mt-1 mb-3">{v.description}</p>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${v.badge}`}>
                  {v.limit}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Earnings ────────────────────────────────────────────────────── */}
      <section className="px-6 py-16 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
          Typical earnings per delivery
        </h2>
        <p className="text-sm text-gray-400 text-center mb-10">
          Fees calculated automatically from GPS distance · shop-linked riders
          keep 100% · wildcard riders keep 90%
        </p>

        {/* Per-vehicle earnings tables */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
          {VEHICLE_EARNINGS.map((v) => (
            <div
              key={v.type}
              className={`overflow-hidden rounded-2xl border ${v.border} shadow-sm`}
            >
              {/* Header */}
              <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b border-gray-100">
                <span className="text-sm font-semibold text-gray-800">
                  {v.icon} {v.type}
                </span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${v.badge}`}>
                  {v.limit}
                </span>
              </div>

              {/* Rows */}
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-50">
                    <th className="px-4 py-2 text-left font-medium text-gray-400">
                      Distance
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-400">
                      You earn
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 bg-white">
                  {v.rows.map((row) => (
                    <tr key={row.distance}>
                      <td className="px-4 py-3 text-gray-500">{row.distance}</td>
                      <td className={`px-4 py-3 font-bold ${v.accent}`}>
                        {row.fee}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Formula footnote */}
              <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
                <p className="text-[10px] text-gray-400">{v.formula}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Shop-linked vs wildcard explanation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-green-50 rounded-2xl p-5 border border-green-100">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🏪</span>
              <span className="text-sm font-semibold text-green-800">
                Shop-linked rider
              </span>
            </div>
            <p className="text-xs text-green-700 leading-relaxed">
              Approved directly by a Vendly shop owner. You keep{" "}
              <strong>100%</strong> of every delivery fee — Dukaboda takes no
              commission on shop-linked jobs.
            </p>
          </div>

          <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🌐</span>
              <span className="text-sm font-semibold text-blue-800">
                Wildcard rider
              </span>
            </div>
            <p className="text-xs text-blue-700 leading-relaxed">
              Approved by the Dukaboda platform — eligible for jobs from any
              Vendly shop. A <strong>10% platform fee</strong> applies; you keep{" "}
              <strong>90%</strong> of the delivery fee shown above.
            </p>
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center mt-6">
          All earnings paid to your registered MTN MoMo number after each
          confirmed delivery
        </p>
      </section>

      {/* ── How to get started ──────────────────────────────────────────── */}
      <section className="px-6 py-16 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">
            How to get started
          </h2>
          <div className="space-y-4">
            {STEPS.map((s) => (
              <div
                key={s.step}
                className="flex items-start gap-4 bg-white rounded-2xl p-5 border border-gray-100"
              >
                <span className="shrink-0 w-8 h-8 rounded-full bg-[#0286ff] text-white text-sm font-bold flex items-center justify-center">
                  {s.step}
                </span>
                <div>
                  <p className="font-semibold text-gray-900">{s.title}</p>
                  <p className="text-sm text-gray-400 mt-0.5">{s.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Requirements ────────────────────────────────────────────────── */}
      <section className="px-6 py-16 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
          Requirements
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            "Android smartphone",
            "Active MTN MoMo number (for payouts)",
            "Motorcycle, bicycle, or car",
            "Knowledge of Kampala roads",
            "Reliable mobile data connection",
            "Willingness to deliver professionally",
          ].map((req) => (
            <div
              key={req}
              className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3"
            >
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
              <span className="text-sm text-gray-700">{req}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="px-6 py-20 bg-[#0286ff] text-center">
        <div className="max-w-xl mx-auto">
          <div className="flex justify-center mb-4">
            <DukabodaLogo variant="white" size={64} />
          </div>
          <h2 className="text-3xl font-black text-white mb-3">
            Ready to start earning?
          </h2>
          <p className="text-blue-100 mb-8 text-sm">
            Download the app, create your profile, and start receiving delivery
            jobs from Vendly shops near you.
          </p>
          <a
            href={APK_URL}
            className="inline-flex items-center gap-2 bg-white text-[#0286ff] px-8 py-4 rounded-full text-base font-bold hover:bg-blue-50 transition-colors"
          >
            📱 Download Dukaboda
          </a>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="px-6 py-8 border-t border-gray-100 text-center">
        <p className="text-xs text-gray-400">
          © {new Date().getFullYear()} Dukaboda · Part of the{" "}
          <a
            href="https://maxnovate.com"
            className="underline hover:text-gray-600"
          >
            Maxnovate
          </a>{" "}
          platform · Kampala, Uganda
        </p>
      </footer>

    </main>
  );
}
