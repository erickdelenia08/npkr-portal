"use client";

import React, { useEffect, useRef } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
    open: boolean;
    title: string;
    description: React.ReactNode;
    confirmLabel: string;
    cancelLabel?: string;
    tone?: "default" | "danger";
    pending?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

/**
 * Dialog konfirmasi ringan memakai elemen <dialog> native:
 * focus trap, tombol Esc, dan backdrop sudah ditangani browser.
 * Letakkan di luar <form> supaya tidak ikut ter-submit.
 */
export function ConfirmDialog({
    open,
    title,
    description,
    confirmLabel,
    cancelLabel = "Kembali",
    tone = "default",
    pending = false,
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    const ref = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const dialog = ref.current;
        if (!dialog) return;

        if (open && !dialog.open) dialog.showModal();
        if (!open && dialog.open) dialog.close();
    }, [open]);

    const isDanger = tone === "danger";

    return (
        <dialog
            ref={ref}
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            onKeyDown={(event) => {
                if (event.key === "Escape" && pending) {
                    event.preventDefault();
                }
            }}
            onCancel={(event) => {
                event.preventDefault();
                if (!pending) onCancel();
            }}
            onClick={(event) => {
                // Klik pada backdrop = target adalah <dialog> itu sendiri
                if (event.target === ref.current && !pending) onCancel();
            }}
            className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-slate-200 bg-white p-0 shadow-xl backdrop:bg-slate-900/50"
        >
            <div className="space-y-4 p-5">
                <div className="flex items-start gap-3">
                    <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${isDanger ? "bg-red-100 text-red-700" : "bg-teal-50 text-teal-700"
                            }`}
                    >
                        <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                        <h2
                            id="confirm-dialog-title"
                            className="text-base font-semibold text-slate-900"
                        >
                            {title}
                        </h2>
                        <div className="mt-1 text-sm leading-6 text-slate-600">
                            {description}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button
                        type="button"
                        variant="outline"
                        disabled={pending}
                        onClick={onCancel}
                    >
                        {cancelLabel}
                    </Button>
                    <Button
                        type="button"
                        disabled={pending}
                        onClick={onConfirm}
                        className={
                            isDanger
                                ? "bg-red-600 text-white hover:bg-red-700"
                                : "bg-teal-700 text-white hover:bg-teal-800"
                        }
                    >
                        {pending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Memproses...
                            </>
                        ) : (
                            confirmLabel
                        )}
                    </Button>
                </div>
            </div>
        </dialog>
    );
}