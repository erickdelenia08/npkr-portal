"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  useForm,
  type SubmitHandler,
  type FieldErrors,
} from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { submitITJ } from "@/actions/itj";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export interface UnitOption {
  id: string;
  name: string;
  price: number;
  kategori: string;
}

export interface ItjFormInitialData {
  nik?: string;
  namaKtp?: string;
  tempatLahir?: string;
  tglLahir?: string;
  alamatKtp?: string;
  unitId?: string;
  hargaDeal?: string;
  targetItj?: string;
  nominalDibayar?: string;
  targetDp?: string;
  metodeBayar?: "KPR" | "CASH_KERAS" | "CASH_TEMPO";
  tenor?: string;
  nominalItj?: string;
}

export interface ItjWizardProps {
  leadId: string;
  unitOptions: UnitOption[];
  initialData?: ItjFormInitialData;
  userRole?: string;
  basePath?: string;
}

const paymentMethods = ["KPR", "CASH_KERAS", "CASH_TEMPO"] as const;

// Semua nilai form disimpan sebagai string.
// Ini menghindari masalah NaN ketika input angka dikosongkan.
const itjSchema = z
  .object({
    nik: z
      .string()
      .trim()
      .regex(/^\d{16}$/, "NIK harus terdiri dari 16 digit"),

    namaKtp: z
      .string()
      .trim()
      .min(1, "Nama sesuai KTP wajib diisi"),

    tempatLahir: z
      .string()
      .trim()
      .min(1, "Tempat lahir wajib diisi"),

    tglLahir: z
      .string()
      .min(1, "Tanggal lahir wajib diisi")
      .date("Tanggal lahir tidak valid"),

    alamatKtp: z
      .string()
      .trim()
      .min(1, "Alamat KTP wajib diisi"),

    unitId: z
      .string()
      .min(1, "Silakan pilih unit terlebih dahulu"),

    hargaDeal: z
      .string()
      .trim()
      .min(1, "Harga deal wajib diisi")
      .refine(
        (value) =>
          Number.isFinite(Number(value)) &&
          Number(value) > 0,
        "Harga deal harus lebih dari Rp0"
      ),

    targetItj: z
      .string()
      .trim()
      .min(1, "Target total ITJ wajib diisi")
      .refine(
        (value) =>
          Number.isFinite(Number(value)) &&
          Number(value) >= 300000,
        "Target total ITJ minimal Rp300.000"
      ),

    nominalDibayar: z
      .string()
      .trim()
      .min(1, "ITJ dibayar saat ini wajib diisi")
      .refine(
        (value) =>
          Number.isFinite(Number(value)) &&
          Number(value) >= 300000,
        "ITJ dibayar saat ini minimal Rp300.000"
      ),

    targetDp: z
      .string()
      .trim()
      .min(1, "Target DP wajib diisi. Isi 0 jika belum ditentukan.")
      .refine(
        (value) =>
          Number.isFinite(Number(value)) &&
          Number(value) >= 0,
        "Target DP harus berupa angka minimal 0"
      ),

    metodeBayar: z.enum(paymentMethods),

    // Kosong diperbolehkan untuk pembayaran selain KPR.
    tenor: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.metodeBayar === "KPR") {
      if (!/^\d+$/.test(data.tenor) || Number(data.tenor) < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["tenor"],
          message: "Tenor KPR wajib berupa bilangan bulat minimal 1 bulan",
        });
      }
    }
    const numPaid = Number(data.nominalDibayar);
    const numTarget = Number(data.targetItj);
    if (
      Number.isFinite(numPaid) &&
      Number.isFinite(numTarget) &&
      numPaid > numTarget
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["nominalDibayar"],
        message: "ITJ dibayar saat ini tidak boleh melebihi target total ITJ",
      });
    }
  });

type ItjFormValues = z.infer<typeof itjSchema>;

const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

const steps = [
  { number: 1, title: "Data calon pembeli" },
  { number: 2, title: "Unit & pembayaran" },
  { number: 3, title: "Konfirmasi ITJ" },
];

export function ItjWizard({
  leadId,
  unitOptions,
  initialData,
  userRole,
  basePath,
}: ItjWizardProps) {
  const [step, setStep] = useState(1);
  const [submitError, setSubmitError] = useState("");

  const router = useRouter();

  const effectiveBasePath =
    basePath ||
    (userRole === "ADMIN"
      ? "/admin"
      : userRole === "MANAGER"
      ? "/manager"
      : typeof window !== "undefined" && window.location.pathname.startsWith("/admin")
      ? "/admin"
      : typeof window !== "undefined" && window.location.pathname.startsWith("/manager")
      ? "/manager"
      : "/marketing");

  const initialUnit = initialData?.unitId
    ? unitOptions.find((u) => u.id === initialData.unitId)
    : undefined;

  const defaultHargaDeal =
    initialData?.hargaDeal ||
    (initialUnit ? String(initialUnit.price) : "");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<ItjFormValues>({
    resolver: zodResolver(itjSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      nik: initialData?.nik || "",
      namaKtp: initialData?.namaKtp || "",
      tempatLahir: initialData?.tempatLahir || "",
      tglLahir: initialData?.tglLahir || "",
      alamatKtp: initialData?.alamatKtp || "",
      unitId: initialData?.unitId || "",
      hargaDeal: defaultHargaDeal,
      targetItj: initialData?.targetItj || initialData?.nominalItj || "",
      nominalDibayar:
        initialData?.nominalDibayar || initialData?.nominalItj || "",
      targetDp: initialData?.targetDp || "0",
      metodeBayar: initialData?.metodeBayar || "KPR",
      tenor: initialData?.tenor || "",
    },
  });

  const values = watch();

  const selectedUnit = unitOptions.find(
    (unit) => unit.id === values.unitId
  );

  const isKavling =
    selectedUnit?.kategori?.toUpperCase() === "KAVLING";

  const stepFields: Record<number, (keyof ItjFormValues)[]> = {
    1: [
      "nik",
      "namaKtp",
      "tempatLahir",
      "tglLahir",
      "alamatKtp",
    ],
    2: [
      "unitId",
      "metodeBayar",
      "tenor",
      "hargaDeal",
      "targetItj",
      "nominalDibayar",
      "targetDp",
    ],
    3: [],
  };

  const handleNext = async (e: React.MouseEvent) => {
    e.preventDefault();
    setSubmitError("");

    const fields = stepFields[step] ?? [];
    const isValid = await trigger(fields);

    if (!isValid) {
      toast.error("Periksa kembali data yang masih belum valid.");
      return;
    }

    if (step === 2 && unitOptions.length === 0) {
      toast.error("Belum ada unit yang dapat dipilih.");
      return;
    }

    setStep((current) => Math.min(current + 1, 3));
  };

  const handlePrevious = () => {
    setSubmitError("");
    setStep((current) => Math.max(current - 1, 1));
  };

  const onInvalid = (formErrors: FieldErrors<ItjFormValues>) => {
    console.error("ITJ validation errors:", formErrors);

    const firstError = Object.values(formErrors).find(
      (error) => error?.message
    );

    toast.error(
      firstError?.message
        ? String(firstError.message)
        : "Periksa kembali data ITJ."
    );
  };

  const onSubmit: SubmitHandler<ItjFormValues> = async (data) => {
    setSubmitError("");

    try {
      const unit = unitOptions.find((item) => item.id === data.unitId);

      if (!unit) {
        setStep(2);
        toast.error("Unit tidak ditemukan. Silakan pilih ulang.");
        return;
      }

      if (
        unit.kategori?.toUpperCase() === "KAVLING" &&
        data.metodeBayar === "KPR"
      ) {
        setStep(2);
        toast.error("Metode KPR tidak tersedia untuk kategori ini.");
        return;
      }

      const formData = new FormData();

      formData.set("leadId", leadId);
      formData.set("nik", data.nik);
      formData.set("namaKtp", data.namaKtp);
      formData.set("tempatLahir", data.tempatLahir);
      formData.set("tglLahir", data.tglLahir);
      formData.set("alamatKtp", data.alamatKtp);
      formData.set("unitId", data.unitId);
      formData.set("hargaDeal", data.hargaDeal);
      formData.set("targetItj", data.targetItj);
      formData.set("nominalDibayar", data.nominalDibayar);
      formData.set("targetDp", data.targetDp);
      formData.set("metodeBayar", data.metodeBayar);

      if (data.metodeBayar === "KPR") {
        formData.set("tenor", data.tenor);
      }

      const result = await submitITJ(formData);

      if (!result.success) {
        const message = result.error || "ITJ gagal disimpan.";
        setSubmitError(message);
        toast.error(message);
        return;
      }

      toast.success("ITJ berhasil disimpan dan transaksi aktif telah dibuat.");

      if (result.transaksiId) {
        const destination =
          effectiveBasePath === "/marketing"
            ? `/marketing/transaksi/${result.transaksiId}`
            : `/admin/transaksi/${result.transaksiId}`;

        router.push(destination);
      } else {
        router.push(`${effectiveBasePath}/lead/${leadId}`);
      }
      router.refresh();
    } catch (error) {
      console.error("Submit ITJ error:", error);

      const message =
        "Terjadi kesalahan saat menyimpan ITJ. Silakan coba lagi.";

      setSubmitError(message);
      toast.error(message);
    }
  };

  const inputClass = "w-full";
  const labelClass = "mb-1.5 block text-sm font-medium";
  const errorClass = "mt-1 text-sm text-destructive";

  // Financial calculations for live previews
  const numHargaDeal = Number(values.hargaDeal);
  const numTargetItj = Number(values.targetItj);
  const numNominalDibayar = Number(values.nominalDibayar);
  const numTargetDp = Number(values.targetDp);

  const isValidHargaDeal = Number.isFinite(numHargaDeal) && numHargaDeal > 0;
  const isValidTargetDp = Number.isFinite(numTargetDp) && numTargetDp >= 0;
  const estimasiPlafonKpr =
    isValidHargaDeal && isValidTargetDp
      ? Math.max(0, numHargaDeal - numTargetDp)
      : null;

  return (
    <div className="mx-auto w-full max-w-xl space-y-4">
      {/* Tombol Navigasi Kembali ke Lead */}
      <Link
        href={`${effectiveBasePath}/lead/${leadId}`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        <span>Kembali ke Detail Lead</span>
      </Link>

      <Card className="w-full border-border shadow-sm">
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-xl">
                Transaksi ITJ & Pemesanan Unit
              </CardTitle>
              <CardDescription className="mt-1">
                Lengkapi data calon pembeli dan transaksi unit untuk pembuatan berkas.
              </CardDescription>
            </div>

            <span className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs font-medium">
              Tahap {step} dari 3
            </span>
          </div>

          <div
            className="grid grid-cols-3 gap-2"
            aria-label="Progres formulir"
          >
            {steps.map((item) => (
              <div key={item.number} className="space-y-2">
                <div
                  className={`h-1.5 rounded-full transition-colors ${
                    step >= item.number
                      ? "bg-primary"
                      : "bg-muted"
                  }`}
                />

                <p
                  className={`text-xs ${
                    step === item.number
                      ? "font-semibold text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {item.title}
                </p>
              </div>
            ))}
          </div>
        </CardHeader>

        <form
          onSubmit={handleSubmit(onSubmit, onInvalid)}
          noValidate
        >
          <CardContent className="space-y-5">
            {step === 1 && (
              <section className="space-y-4">
                <div>
                  <label htmlFor="nik" className={labelClass}>
                    NIK <span className="text-destructive">*</span>
                  </label>

                  <Input
                    id="nik"
                    {...register("nik")}
                    className={inputClass}
                    inputMode="numeric"
                    maxLength={16}
                    placeholder="Masukkan 16 digit NIK"
                    autoComplete="off"
                    aria-invalid={!!errors.nik}
                    aria-describedby={errors.nik ? "nik-error" : undefined}
                  />

                  {errors.nik && (
                    <p id="nik-error" className={errorClass}>
                      {errors.nik.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="namaKtp" className={labelClass}>
                    Nama sesuai KTP{" "}
                    <span className="text-destructive">*</span>
                  </label>

                  <Input
                    id="namaKtp"
                    {...register("namaKtp")}
                    placeholder="Nama lengkap sesuai KTP"
                    autoComplete="name"
                    aria-invalid={!!errors.namaKtp}
                  />

                  {errors.namaKtp && (
                    <p className={errorClass}>
                      {errors.namaKtp.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="tempatLahir" className={labelClass}>
                    Tempat lahir{" "}
                    <span className="text-destructive">*</span>
                  </label>

                  <Input
                    id="tempatLahir"
                    {...register("tempatLahir")}
                    placeholder="Contoh: Lumajang"
                    aria-invalid={!!errors.tempatLahir}
                  />

                  {errors.tempatLahir && (
                    <p className={errorClass}>
                      {errors.tempatLahir.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="tglLahir" className={labelClass}>
                    Tanggal lahir{" "}
                    <span className="text-destructive">*</span>
                  </label>

                  <Input
                    id="tglLahir"
                    type="date"
                    {...register("tglLahir")}
                    max={new Date().toISOString().slice(0, 10)}
                    aria-invalid={!!errors.tglLahir}
                  />

                  {errors.tglLahir && (
                    <p className={errorClass}>
                      {errors.tglLahir.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="alamatKtp" className={labelClass}>
                    Alamat sesuai KTP{" "}
                    <span className="text-destructive">*</span>
                  </label>

                  <textarea
                    id="alamatKtp"
                    {...register("alamatKtp")}
                    rows={3}
                    placeholder="Masukkan alamat lengkap sesuai KTP"
                    aria-invalid={!!errors.alamatKtp}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  />

                  {errors.alamatKtp && (
                    <p className={errorClass}>
                      {errors.alamatKtp.message}
                    </p>
                  )}
                </div>
              </section>
            )}

            {step === 2 && (
              <section className="space-y-4">
                {/* 1. PILIH UNIT */}
                <div>
                  <label htmlFor="unitId" className={labelClass}>
                    Pilih unit{" "}
                    <span className="text-destructive">*</span>
                  </label>

                  {unitOptions.length === 0 ? (
                    <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                      Belum ada pilihan unit. Periksa inventaris unit
                      atau hubungi administrator.
                    </div>
                  ) : (
                    <Select
                      value={values.unitId}
                      onValueChange={(value) => {
                        if (!value) return;
                        setValue("unitId", value, {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        });

                        const nextUnit = unitOptions.find(
                          (unit) => unit.id === value
                        );

                        if (nextUnit) {
                          // Auto-fill hargaDeal dengan harga unit terpilih
                          setValue("hargaDeal", String(nextUnit.price), {
                            shouldDirty: true,
                            shouldValidate: true,
                          });

                          if (
                            nextUnit.kategori?.toUpperCase() === "KAVLING" &&
                            values.metodeBayar === "KPR"
                          ) {
                            setValue("metodeBayar", "CASH_KERAS", {
                              shouldDirty: true,
                              shouldValidate: true,
                            });

                            setValue("tenor", "", {
                              shouldDirty: true,
                            });
                          }
                        }
                      }}
                    >
                      <SelectTrigger
                        id="unitId"
                        aria-invalid={!!errors.unitId}
                      >
                        <SelectValue placeholder="Pilih unit yang tersedia" />
                      </SelectTrigger>

                      <SelectContent>
                        {unitOptions.map((unit) => (
                          <SelectItem
                            key={unit.id}
                            value={unit.id}
                          >
                            {unit.name} — {formatRupiah(unit.price)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {errors.unitId && (
                    <p className={errorClass}>
                      {errors.unitId.message}
                    </p>
                  )}

                  {selectedUnit && (
                    <div className="mt-2.5 rounded-lg border bg-muted/40 p-3 text-xs sm:text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">
                          {selectedUnit.name}
                        </span>
                        <span className="rounded bg-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                          {selectedUnit.kategori}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Harga Dasar / Katalog: {formatRupiah(selectedUnit.price)}
                      </p>
                    </div>
                  )}
                </div>

                {/* 2. METODE PEMBAYARAN & TENOR */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="metodeBayar"
                      className={labelClass}
                    >
                      Metode pembayaran{" "}
                      <span className="text-destructive">*</span>
                    </label>

                    <Select
                      value={values.metodeBayar}
                      onValueChange={(value) => {
                        const method = value as (typeof paymentMethods)[number];

                        setValue("metodeBayar", method, {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        });

                        if (method !== "KPR") {
                          setValue("tenor", "", {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                        }
                      }}
                    >
                      <SelectTrigger
                        id="metodeBayar"
                        aria-invalid={!!errors.metodeBayar}
                      >
                        <SelectValue placeholder="Pilih metode pembayaran" />
                      </SelectTrigger>

                      <SelectContent>
                        {!isKavling && (
                          <SelectItem value="KPR">
                            KPR
                          </SelectItem>
                        )}

                        <SelectItem value="CASH_KERAS">
                          Cash Keras
                        </SelectItem>

                        <SelectItem value="CASH_TEMPO">
                          Cash Tempo
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    {errors.metodeBayar && (
                      <p className={errorClass}>
                        {errors.metodeBayar.message}
                      </p>
                    )}
                  </div>

                  {values.metodeBayar === "KPR" ? (
                    <div>
                      <label htmlFor="tenor" className={labelClass}>
                        Tenor KPR (bulan){" "}
                        <span className="text-destructive">*</span>
                      </label>

                      <Input
                        id="tenor"
                        type="number"
                        min={1}
                        step={1}
                        inputMode="numeric"
                        {...register("tenor")}
                        placeholder="Contoh: 120 untuk 10 thn"
                        aria-invalid={!!errors.tenor}
                      />

                      {errors.tenor && (
                        <p className={errorClass}>
                          {errors.tenor.message}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="hidden sm:block" />
                  )}
                </div>

                {/* 3. HARGA DEAL (RP) */}
                <div>
                  <label htmlFor="hargaDeal" className={labelClass}>
                    Harga Deal (Rp){" "}
                    <span className="text-destructive">*</span>
                  </label>

                  <Input
                    id="hargaDeal"
                    type="number"
                    min={1}
                    step={1000}
                    inputMode="numeric"
                    {...register("hargaDeal")}
                    placeholder="Masukkan harga kesepakatan deal unit"
                    aria-invalid={!!errors.hargaDeal}
                  />

                  {errors.hargaDeal && (
                    <p className={errorClass}>
                      {errors.hargaDeal.message}
                    </p>
                  )}

                  <p className="mt-1 text-xs text-muted-foreground">
                    Otomatis terisi harga unit saat dipilih, namun dapat diubah sesuai kesepakatan harga deal.
                  </p>
                </div>

                {/* 4. TARGET TOTAL ITJ (RP) */}
                <div>
                  <label htmlFor="targetItj" className={labelClass}>
                    Target Total ITJ (Rp){" "}
                    <span className="text-destructive">*</span>
                  </label>

                  <Input
                    id="targetItj"
                    type="number"
                    min={300000}
                    step={1000}
                    inputMode="numeric"
                    {...register("targetItj")}
                    placeholder="Contoh: 5000000"
                    aria-invalid={!!errors.targetItj}
                  />

                  {errors.targetItj && (
                    <p className={errorClass}>
                      {errors.targetItj.message}
                    </p>
                  )}

                  <p className="mt-1 text-xs text-muted-foreground">
                    Total komitmen biaya tanda jadi (ITJ) yang disepakati pembeli.
                  </p>
                </div>

                {/* 5. ITJ DIBAYAR SAAT INI (RP) */}
                <div>
                  <label htmlFor="nominalDibayar" className={labelClass}>
                    ITJ Dibayar Saat Ini (Rp){" "}
                    <span className="text-destructive">*</span>
                  </label>

                  <Input
                    id="nominalDibayar"
                    type="number"
                    min={300000}
                    step={1000}
                    inputMode="numeric"
                    {...register("nominalDibayar")}
                    placeholder="Minimal Rp300.000"
                    aria-invalid={!!errors.nominalDibayar}
                  />

                  {errors.nominalDibayar && (
                    <p className={errorClass}>
                      {errors.nominalDibayar.message}
                    </p>
                  )}

                  <p className="mt-1 text-xs text-muted-foreground">
                    Nominal tunai/transfer yang dibayarkan hari ini untuk penerbitan kwitansi pertama (minimal Rp300.000).
                  </p>
                </div>

                {/* 6. TARGET DP (RP) */}
                <div>
                  <label htmlFor="targetDp" className={labelClass}>
                    Target DP (Rp){" "}
                    <span className="text-destructive">*</span>
                  </label>

                  <Input
                    id="targetDp"
                    type="number"
                    min={0}
                    step={1000}
                    inputMode="numeric"
                    {...register("targetDp")}
                    placeholder="Isi 0 jika belum ditentukan"
                    aria-invalid={!!errors.targetDp}
                  />

                  {errors.targetDp && (
                    <p className={errorClass}>
                      {errors.targetDp.message}
                    </p>
                  )}

                  <p className="mt-1 text-xs text-muted-foreground">
                    Total target Down Payment (DP) yang disepakati pembeli.
                  </p>
                </div>

                {/* 7. STEP 2 RINGKASAN (SUMMARY) SECTION */}
                <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/90 p-4 sm:p-5">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                    <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-primary" />
                      Ringkasan Pembayaran
                    </h3>
                    <span className="rounded bg-slate-200/80 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                      {values.metodeBayar === "KPR"
                        ? "Metode KPR"
                        : values.metodeBayar === "CASH_KERAS"
                        ? "Cash Keras"
                        : "Cash Tempo"}
                    </span>
                  </div>

                  <dl className="mt-3 space-y-2 text-xs sm:text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-muted-foreground">Harga Deal</dt>
                      <dd className="font-semibold text-slate-900">
                        {isValidHargaDeal ? formatRupiah(numHargaDeal) : "—"}
                      </dd>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-muted-foreground">Target Total ITJ</dt>
                      <dd className="font-medium text-slate-800">
                        {Number.isFinite(numTargetItj) && numTargetItj > 0
                          ? formatRupiah(numTargetItj)
                          : "—"}
                      </dd>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-muted-foreground">ITJ Dibayar Hari Ini</dt>
                      <dd className="font-semibold text-emerald-700">
                        {Number.isFinite(numNominalDibayar) && numNominalDibayar > 0
                          ? formatRupiah(numNominalDibayar)
                          : "—"}
                      </dd>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-muted-foreground">Target DP</dt>
                      <dd className="font-medium text-slate-800">
                        {isValidTargetDp ? formatRupiah(numTargetDp) : "—"}
                      </dd>
                    </div>

                    {values.metodeBayar === "KPR" && (
                      <div className="mt-2.5 rounded-lg border border-blue-200 bg-blue-50/70 p-3">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <dt className="text-xs sm:text-sm font-semibold text-blue-950">
                              Estimasi Plafon KPR
                            </dt>
                            <p className="text-[11px] text-blue-600">
                              Harga Deal - Target DP
                            </p>
                          </div>
                          <dd className="text-sm sm:text-base font-bold text-blue-900">
                            {estimasiPlafonKpr !== null
                              ? formatRupiah(estimasiPlafonKpr)
                              : "—"}
                          </dd>
                        </div>
                      </div>
                    )}
                  </dl>
                </div>
              </section>
            )}

            {step === 3 && (
              <section className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5 space-y-4">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">
                      Konfirmasi Pengajuan ITJ
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Periksa kembali seluruh data calon pembeli dan rincian transaksi sebelum menyimpan berkas.
                    </p>
                  </div>

                  {/* Ringkasan Calon Pembeli */}
                  <div className="rounded-lg border bg-white p-3.5 space-y-2 text-xs sm:text-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Data Calon Pembeli
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-muted-foreground">Nama KTP:</span>{" "}
                        <span className="font-medium text-slate-800">
                          {values.namaKtp || "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">NIK:</span>{" "}
                        <span className="font-medium text-slate-800">
                          {values.nik || "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Tempat / Tgl Lahir:</span>{" "}
                        <span className="font-medium text-slate-800">
                          {values.tempatLahir ? `${values.tempatLahir}, ` : ""}
                          {values.tglLahir || "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Alamat:</span>{" "}
                        <span className="font-medium text-slate-800">
                          {values.alamatKtp || "—"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Ringkasan Finansial & Transaksi */}
                  <div className="rounded-lg border bg-white p-3.5 space-y-2.5 text-xs sm:text-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Rincian Unit & Skema Pembayaran
                    </p>

                    <dl className="space-y-2">
                      <div className="flex items-start justify-between gap-4">
                        <dt className="text-muted-foreground">Unit Terpilih</dt>
                        <dd className="text-right font-medium text-slate-800">
                          {selectedUnit?.name || "Belum dipilih"} ({selectedUnit?.kategori || "—"})
                        </dd>
                      </div>

                      <div className="flex items-start justify-between gap-4">
                        <dt className="text-muted-foreground">Metode Pembayaran</dt>
                        <dd className="text-right font-medium text-slate-800">
                          {values.metodeBayar === "KPR"
                            ? `KPR (${values.tenor || 0} bulan)`
                            : values.metodeBayar === "CASH_KERAS"
                            ? "Cash Keras"
                            : "Cash Tempo"}
                        </dd>
                      </div>

                      <div className="flex items-start justify-between gap-4">
                        <dt className="text-muted-foreground">Harga Deal</dt>
                        <dd className="text-right font-semibold text-slate-900">
                          {isValidHargaDeal ? formatRupiah(numHargaDeal) : "—"}
                        </dd>
                      </div>

                      <div className="flex items-start justify-between gap-4">
                        <dt className="text-muted-foreground">Target Total ITJ</dt>
                        <dd className="text-right font-medium text-slate-800">
                          {Number.isFinite(numTargetItj) && numTargetItj > 0
                            ? formatRupiah(numTargetItj)
                            : "—"}
                        </dd>
                      </div>

                      <div className="flex items-start justify-between gap-4 rounded-md bg-emerald-50 -mx-1 px-2 py-1.5 border border-emerald-200/60">
                        <div>
                          <dt className="font-semibold text-emerald-950">
                            ITJ Dibayar Hari Ini (Kwitansi #1)
                          </dt>
                          <p className="text-[11px] text-emerald-700">
                            Nominal penerbitan kwitansi perdana
                          </p>
                        </div>
                        <dd className="text-right font-bold text-emerald-800 text-sm sm:text-base">
                          {Number.isFinite(numNominalDibayar) && numNominalDibayar > 0
                            ? formatRupiah(numNominalDibayar)
                            : "—"}
                        </dd>
                      </div>

                      <div className="flex items-start justify-between gap-4">
                        <dt className="text-muted-foreground">Target DP</dt>
                        <dd className="text-right font-medium text-slate-800">
                          {isValidTargetDp ? formatRupiah(numTargetDp) : "—"}
                        </dd>
                      </div>

                      {values.metodeBayar === "KPR" && (
                        <div className="flex items-start justify-between gap-4 rounded-md bg-blue-50 -mx-1 px-2 py-1.5 border border-blue-200/60">
                          <div>
                            <dt className="font-semibold text-blue-950">
                              Estimasi Plafon KPR
                            </dt>
                            <p className="text-[11px] text-blue-600">
                              Harga Deal - Target DP
                            </p>
                          </div>
                          <dd className="text-right font-bold text-blue-900 text-sm sm:text-base">
                            {estimasiPlafonKpr !== null
                              ? formatRupiah(estimasiPlafonKpr)
                              : "—"}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  <div className="rounded-lg bg-amber-50 border border-amber-200/80 p-3 text-xs text-amber-800 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">Catatan Transaksi:</span> Menyimpan formulir ini akan mengunci unit menjadi status <strong>BOOKED</strong>, mengonfirmasi closing marketing, serta menerbitkan catatan kwitansi pembayaran pertama sebesar <strong>{Number.isFinite(numNominalDibayar) && numNominalDibayar > 0 ? formatRupiah(numNominalDibayar) : "Rp 0"}</strong>.
                    </div>
                  </div>
                </div>
              </section>
            )}

            {submitError && (
              <div
                role="alert"
                className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
              >
                {submitError}
              </div>
            )}
          </CardContent>

          <CardFooter className="flex justify-between gap-3 border-t pt-5">
            {step > 1 ? (
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                disabled={isSubmitting}
              >
                Sebelumnya
              </Button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <Button
                type="button"
                onClick={handleNext}
                disabled={isSubmitting}
              >
                Selanjutnya
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isSubmitting || unitOptions.length === 0}
              >
                {isSubmitting ? "Menyimpan..." : "Submit ITJ"}
              </Button>
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
