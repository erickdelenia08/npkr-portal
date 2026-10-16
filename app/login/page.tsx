import React from "react";
import type { Metadata } from "next";
import { LoginForm } from "@/components/forms/login-form";
import { Building2, Layers } from "lucide-react";

export const metadata: Metadata = {
  title: "Login Portal | PT. Simanduta Surya Sentosa",
  description:
    "Portal Terpadu CRM & Sales Management PT. Simanduta Surya Sentosa (NPKR Property)",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 bg-[#f8fafc] text-graphite relative">
      {/* Subtle background decorative grid lines */}
      <div
        className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-35 pointer-events-none"
        aria-hidden="true"
      />

      {/* Main Centered Card Container */}
      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-xl border border-mist shadow-lg p-6 sm:p-8 backdrop-blur-xs">
          {/* Company Branding & Logo Header */}
          <div className="text-center mb-6">
            {/* Logo Badge */}
            <div className="w-12 h-12 rounded-xl bg-carbon-ink text-white flex items-center justify-center mx-auto mb-3 shadow-subtle border border-carbon-ink/10">
              <Building2 className="w-6 h-6 text-prism-teal" />
            </div>

            {/* Company Name */}
            <h1 className="text-lg sm:text-xl font-bold text-carbon-ink tracking-tight">
              PT. Simanduta Surya Sentosa
            </h1>

            {/* Portal Title & Subtitle */}
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <span className="text-xs font-semibold text-deep-teal tracking-wide">
                NPKR PORTAL
              </span>
              <span className="text-xs text-fog">•</span>
              <span className="text-xs text-slate">CRM &amp; Sales Management</span>
            </div>

            <p className="text-xs text-slate mt-2 max-w-xs mx-auto leading-relaxed">
              Silakan masukkan kredensial akun Anda untuk mengakses dashboard operasional.
            </p>
          </div>

          {/* Form Component */}
          <LoginForm />
        </div>

        {/* Footer info */}
        <div className="text-center mt-6 text-xs text-slate space-y-1">
          <p>© {new Date().getFullYear()} PT. Simanduta Surya Sentosa. Hak Cipta Dilindungi.</p>
          <p className="text-[11px] text-fog">
            Kendala akses akun? Hubungi Administrator TI Kantor Pusat.
          </p>
        </div>
      </div>
    </div>
  );
}
