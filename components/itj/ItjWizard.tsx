
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
  nominalItj?: string;
  targetDp?: string;
  metodeBayar?: "KPR" | "CASH_KERAS" | "CASH_TEMPO";
  tenor?: string;
}

interface ItjWizardProps {
  leadId: string;
  unitOptions: UnitOption[];
  initialData?: ItjFormInitialData;
  reviewerNote?: string | null;
  isRevision?: boolean;
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
      .date("Tanggal lahir tidak valid"), // Men

    alamatKtp: z
      .string()
      .trim()
      .min(1, "Alamat KTP wajib diisi"),

    // Tidak mengasumsikan ID selalu berbentuk UUID.
    unitId: z
      .string()
      .min(1, "Silakan pilih unit terlebih dahulu"),

    nominalItj: z
      .string()
      .trim()
      .min(1, "Nominal ITJ wajib diisi")
      .refine(
        (value) =>
          Number.isFinite(Number(value)) &&
          Number(value) >= 300000,
        "Nominal ITJ minimal Rp300.000"
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
  reviewerNote,
  isRevision = false,
}: ItjWizardProps) {
  const [step, setStep] = useState(1);
  const [submitError, setSubmitError] = useState("");

  const router = useRouter();

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
      nominalItj: initialData?.nominalItj || "",
      targetDp: initialData?.targetDp || "0",
      metodeBayar: initialData?.metodeBayar || "CASH_KERAS",
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
    2: ["unitId", "nominalItj", "targetDp"],
    3: ["metodeBayar", "tenor"],
  };

  const handleNext = async () => {
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
      // Validasi tambahan agar ID berasal dari pilihan unit yang tersedia
      // pada data yang dikirimkan ke komponen.
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
        setStep(3);
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
      formData.set("nominalItj", data.nominalItj);
      formData.set("targetDp", data.targetDp);
      formData.set("metodeBayar", data.metodeBayar);

      // Jangan mengirim tenor kosong.
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

      toast.success(isRevision ? "Revisi ITJ berhasil diajukan." : "ITJ berhasil diajukan.");

      // Redirect kembali ke halaman Detail Lead (Phase 4 requirement 3)
      router.push(`/marketing/lead/${leadId}`);
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

  return (
    <div className="mx-auto w-full max-w-xl space-y-4">
      {/* Tombol Navigasi Kembali ke Lead */}
      <Link
        href={`/marketing/lead/${leadId}`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        <span>Kembali ke Detail Lead</span>
      </Link>

      <Card className="w-full border-border shadow-sm">
        <CardHeader className="space-y-3">
          {/* Reviewer Note Banner jika status PERLU_REVISI */}
          {reviewerNote && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800">
                  Catatan Revisi dari Reviewer
                </h4>
              </div>
              <p className="text-xs italic bg-white/80 p-2.5 rounded-lg border border-amber-200 text-amber-950">
                &ldquo;{reviewerNote}&rdquo;
              </p>
              <p className="text-[11px] text-amber-700">
                Silakan perbaiki data formulir pengajuan ITJ sesuai catatan di atas, kemudian ajukan ulang.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-xl">
                {isRevision ? "Revisi Pengajuan ITJ" : "Transaksi ITJ"}
              </CardTitle>
              <CardDescription className="mt-1">
                {isRevision
                  ? "Perbaiki data formulir pengajuan ITJ sesuai catatan reviewer."
                  : "Lengkapi data calon pembeli dan transaksi unit."}
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
                className={`h-1.5 rounded-full transition-colors ${step >= item.number
                  ? "bg-primary"
                  : "bg-muted"
                  }`}
              />

              <p
                className={`text-xs ${step === item.number
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

                      if (
                        nextUnit?.kategori?.toUpperCase() === "KAVLING" &&
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
                  <div className="mt-3 rounded-lg border bg-muted/40 p-3">
                    <p className="text-sm text-muted-foreground">
                      Unit terpilih
                    </p>

                    <p className="mt-1 font-semibold">
                      {selectedUnit.name}
                    </p>

                    <p className="text-sm">
                      Harga: {formatRupiah(selectedUnit.price)}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      Kategori: {selectedUnit.kategori}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="nominalItj" className={labelClass}>
                  Nominal ITJ{" "}
                  <span className="text-destructive">*</span>
                </label>

                <Input
                  id="nominalItj"
                  type="number"
                  min={300000}
                  step={1000}
                  inputMode="numeric"
                  {...register("nominalItj")}
                  placeholder="Minimal Rp300.000"
                  aria-invalid={!!errors.nominalItj}
                />

                {errors.nominalItj && (
                  <p className={errorClass}>
                    {errors.nominalItj.message}
                  </p>
                )}

                <p className="mt-1 text-xs text-muted-foreground">
                  Pastikan nominal sesuai kesepakatan transaksi.
                </p>
              </div>

              <div>
                <label htmlFor="targetDp" className={labelClass}>
                  Target DP (Rp)
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
              </div>
            </section>
          )}

          {step === 3 && (
            <section className="space-y-4">
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

              {values.metodeBayar === "KPR" && (
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
                    placeholder="Contoh: 120 untuk 10 tahun"
                    aria-invalid={!!errors.tenor}
                  />

                  {errors.tenor && (
                    <p className={errorClass}>
                      {errors.tenor.message}
                    </p>
                  )}
                </div>
              )}

              <div className="rounded-lg border p-4">
                <h3 className="font-semibold">
                  Ringkasan transaksi
                </h3>

                <dl className="mt-3 space-y-3 text-sm">
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-muted-foreground">Unit</dt>
                    <dd className="text-right font-medium">
                      {selectedUnit?.name || "Belum dipilih"}
                    </dd>
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-muted-foreground">Harga unit</dt>
                    <dd className="text-right font-medium">
                      {selectedUnit
                        ? formatRupiah(selectedUnit.price)
                        : "—"}
                    </dd>
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-muted-foreground">Nominal ITJ</dt>
                    <dd className="text-right font-medium">
                      {values.nominalItj &&
                        Number.isFinite(Number(values.nominalItj))
                        ? formatRupiah(Number(values.nominalItj))
                        : "—"}
                    </dd>
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-muted-foreground">Target DP</dt>
                    <dd className="text-right font-medium">
                      {values.targetDp !== "" &&
                        Number.isFinite(Number(values.targetDp))
                        ? formatRupiah(Number(values.targetDp))
                        : "—"}
                    </dd>
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-muted-foreground">Pembayaran</dt>
                    <dd className="text-right font-medium">
                      {values.metodeBayar === "CASH_KERAS"
                        ? "Cash Keras"
                        : values.metodeBayar === "CASH_TEMPO"
                          ? "Cash Tempo"
                          : "KPR"}
                    </dd>
                  </div>

                  {values.metodeBayar === "KPR" && (
                    <div className="flex items-start justify-between gap-4">
                      <dt className="text-muted-foreground">Tenor</dt>
                      <dd className="text-right font-medium">
                        {values.tenor
                          ? `${values.tenor} bulan`
                          : "Belum diisi"}
                      </dd>
                    </div>
                  )}
                </dl>

                <p className="mt-4 text-xs text-muted-foreground">
                  Periksa kembali seluruh data sebelum menyimpan.
                  Penyimpanan ITJ akan diproses oleh sistem.
                </p>
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
