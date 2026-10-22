"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, X } from "lucide-react";
import { CreateLeadForm } from "@/components/leads/CreateLeadForm";
import { Button } from "@/components/ui/button";

export function CreateLeadModalButton() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const handleSuccess = () => {
    setIsOpen(false);
    router.refresh();
  };

  return (
    <>
      <Button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white text-xs md:text-sm font-semibold shadow-xs"
      >
        <UserPlus className="w-4 h-4" />
        <span>Tambah Lead Baru</span>
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 p-1 animate-in zoom-in-95 duration-200">
            <div className="absolute right-4 top-4 z-10">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
                aria-label="Tutup Modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <CreateLeadForm
              onSuccess={handleSuccess}
              onCancel={() => setIsOpen(false)}
              showTitle={true}
            />
          </div>
        </div>
      )}
    </>
  );
}
