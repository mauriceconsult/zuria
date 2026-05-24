// app/dukaboda/page.tsx  (Zuria)
// Public landing page for dukaboda.maxnovate.com
// Recruits riders — explains the opportunity, vehicle types, earnings

import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { DukabodaLogo } from "@/components/ui/dukaboda-logo";

const APK_URL = process.env.NEXT_PUBLIC_DUKABODA_APK_URL ?? "#";

const VEHICLES = [
  { icon: "🏍️", label: "Motorcycle / Boda", description: "Fast pickups, ideal for most orders" },
  { icon: "🚲", label: "Bicycle",            description: "Eco-friendly, short distance deliveries" },
  { icon: "🚗", label: "Car",                description: "Large or fragile orders" },
];

const STEPS = [
  { step: "1", title: "Download the app",      description: "Install Dukaboda on your Android phone" },
  { step: "2", title: "Create your profile",   description: "Enter your name, phone number, and vehicle type" },
  { step: "3", title: "Get approved",          description: "A Vendly shop or Dukaboda admin reviews your application" },
  { step: "4", title: "Start delivering",      description: "Accept jobs, deliver orders, earn via MoMo instantly" },
];

const EARNINGS = [
  { distance: "2 km",  fee: "UGX 6,500",  note: "Within suburb" },
  { distance: "5 km",  fee: "UGX 11,000", note: "Cross-city" },
  { distance: "10 km", fee: "UGX 18,500", note: "Outer Kampala" },
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
            from Vendly shops and earn the full delivery fee — paid directly to
            your MoMo number after every drop-off.
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
              icon: "💰",
              title: "Keep 100%",
              body: "Shop-linked riders keep every shilling of the delivery fee. No commission cut.",
            },
            {
              icon: "📱",
              title: "MoMo instant pay",
              body: "Your earnings hit your MTN or Airtel number the moment the delivery is confirmed.",
            },
            {
              icon: "🕐",
              title: "Work your hours",
              body: "Go online when you want, offline when you don't. No shifts, no minimums.",
            },
          ].map((item) => (
            <div key={item.title} className="bg-gray-50 rounded-2xl p-6">
              <span className="text-3xl mb-3 block">{item.icon}</span>
              <h3 className="font-bold text-gray-900 mb-1">{item.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                {item.body}
              </p>
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
            Choose your vehicle during sign-up
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {VEHICLES.map((v) => (
              <div
                key={v.label}
                className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm text-center"
              >
                <span className="text-4xl mb-3 block">{v.icon}</span>
                <p className="font-semibold text-gray-900 text-sm">{v.label}</p>
                <p className="text-xs text-gray-400 mt-1">{v.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Earnings ────────────────────────────────────────────────────── */}
      <section className="px-6 py-16 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
          Typical earnings per delivery
        </h2>
        <p className="text-sm text-gray-400 text-center mb-10">
          Shop-linked riders keep 100% of these amounts
        </p>
        <div className="overflow-hidden rounded-2xl border border-gray-100 shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-gray-600">
                  Distance
                </th>
                <th className="px-6 py-3 text-left font-semibold text-gray-600">
                  You earn
                </th>
                <th className="px-6 py-3 text-left font-semibold text-gray-600">
                  Route type
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {EARNINGS.map((row) => (
                <tr key={row.distance}>
                  <td className="px-6 py-4 text-gray-700">{row.distance}</td>
                  <td className="px-6 py-4 font-bold text-[#0286ff]">
                    {row.fee}
                  </td>
                  <td className="px-6 py-4 text-gray-400">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 text-center mt-3">
          Base fare UGX 3,500 + UGX 1,500/km · Calculated automatically
        </p>
      </section>

      {/* ── How it works ────────────────────────────────────────────────── */}
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
                  <p className="text-sm text-gray-400 mt-0.5">
                    {s.description}
                  </p>
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
            "Valid phone number (MTN or Airtel)",
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
