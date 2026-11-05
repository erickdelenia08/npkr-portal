import React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login Portal | NPKR Property",
  description: "Portal CRM & Sales Management PT. Simanduta Surya Sentosa",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full flex flex-col justify-center bg-paper text-graphite font-sans">
      {children}
    </div>
  );
}

