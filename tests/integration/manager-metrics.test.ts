// tests/integration/manager-metrics.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  Role,
  KategoriUnit,
  StatusUnit,
  StatusItj,
  SumberLead,
  MetodeBayar,
  TahapTransaksi,
  TahapDetail,
  JenisBayar,
  CaraBayar,
} from "@/generated/prisma";
import {
  getManagerDashboardData,
} from "@/lib/dashboard/manager";
import {
  getMarketingReport,
  getPenjualanReport,
  getKasReport,
} from "@/lib/dashboard/reports";
import { parseDateOnlyUTC } from "@/lib/date/wib";

describe("Manager Dashboard & Reports Integration Metrics (Local DB)", () => {
  const timestamp = Date.now();
  const testPrefix = `test_${timestamp}`;

  // Track created entities for thorough cleanup
  const createdUserIds: number[] = [];
  const createdLeadIds: number[] = [];
  const createdItjIds: number[] = [];
  const createdTransaksiIds: number[] = [];
  const createdPembayaranIds: number[] = [];
  let masterTipeId: number | null = null;
  let masterUnitId1: number | null = null;
  let masterUnitId2: number | null = null;
  let masterUnitId3: number | null = null;
  let customerId: number | null = null;

  let activeMarketingId1: number;
  let activeMarketingId2: number;
  let inactiveMarketingId: number;
  let adminId: number;

  beforeAll(async () => {
    // 1. Create test users (Active Marketing 1, Active Marketing 2, Inactive Marketing, Admin)
    const m1 = await prisma.user.create({
      data: {
        username: `${testPrefix}_m1`,
        nama: `${testPrefix} Marketing Satu`,
        no_hp: `0811${timestamp.toString().slice(-8)}1`,
        password: "hashedpassword",
        role: Role.MARKETING,
        isActive: true,
      },
    });
    createdUserIds.push(m1.id);
    activeMarketingId1 = m1.id;

    const m2 = await prisma.user.create({
      data: {
        username: `${testPrefix}_m2`,
        nama: `${testPrefix} Marketing Dua`,
        no_hp: `0811${timestamp.toString().slice(-8)}2`,
        password: "hashedpassword",
        role: Role.MARKETING,
        isActive: true,
      },
    });
    createdUserIds.push(m2.id);
    activeMarketingId2 = m2.id;

    const mInactive = await prisma.user.create({
      data: {
        username: `${testPrefix}_minactive`,
        nama: `${testPrefix} Marketing Nonaktif`,
        no_hp: `0811${timestamp.toString().slice(-8)}3`,
        password: "hashedpassword",
        role: Role.MARKETING,
        isActive: false,
      },
    });
    createdUserIds.push(mInactive.id);
    inactiveMarketingId = mInactive.id;

    const adm = await prisma.user.create({
      data: {
        username: `${testPrefix}_admin`,
        nama: `${testPrefix} Admin`,
        no_hp: `0811${timestamp.toString().slice(-8)}4`,
        password: "hashedpassword",
        role: Role.ADMIN,
        isActive: true,
      },
    });
    createdUserIds.push(adm.id);
    adminId = adm.id;

    // 2. Create Master Tipe & Units
    const tipe = await prisma.masterTipe.create({
      data: {
        nama_tipe: `${testPrefix}_Tipe36`,
        kategori: KategoriUnit.SUBSIDI,
        luas_bangunan: 36,
        luas_tanah: 60,
        harga_dasar: 185000000,
      },
    });
    masterTipeId = tipe.id;

    const u1 = await prisma.masterUnit.create({
      data: {
        tipe_id: tipe.id,
        blok: `${testPrefix}_A1`,
        status_unit: StatusUnit.AVAILABLE,
      },
    });
    masterUnitId1 = u1.id;

    const u2 = await prisma.masterUnit.create({
      data: {
        tipe_id: tipe.id,
        blok: `${testPrefix}_A2`,
        status_unit: StatusUnit.AVAILABLE,
      },
    });
    masterUnitId2 = u2.id;

    const u3 = await prisma.masterUnit.create({
      data: {
        tipe_id: tipe.id,
        blok: `${testPrefix}_A3`,
        status_unit: StatusUnit.AVAILABLE,
      },
    });
    masterUnitId3 = u3.id;

    // 3. Create Customer
    const cust = await prisma.customer.create({
      data: {
        nama_ktp: `${testPrefix} Pembeli Test`,
        nik: `3201${timestamp.toString().slice(-12)}`,
        tempat_lahir: "Jakarta",
        tgl_lahir: new Date("1990-01-01T00:00:00.000Z"),
        alamat_ktp: "Jl. Test No. 1",
        no_hp: `0812${timestamp.toString().slice(-8)}`,
      },
    });
    customerId = cust.id;
  });

  afterAll(async () => {
    // Clean up in reverse dependency order
    if (createdPembayaranIds.length > 0) {
      await prisma.pembayaran.deleteMany({
        where: { id: { in: createdPembayaranIds } },
      });
    }
    if (createdTransaksiIds.length > 0) {
      await prisma.transaksi.deleteMany({
        where: { id: { in: createdTransaksiIds } },
      });
    }
    if (createdItjIds.length > 0) {
      await prisma.itj.deleteMany({
        where: { id: { in: createdItjIds } },
      });
    }
    if (createdLeadIds.length > 0) {
      await prisma.lead.deleteMany({
        where: { id: { in: createdLeadIds } },
      });
    }
    if (masterUnitId1) await prisma.masterUnit.delete({ where: { id: masterUnitId1 } }).catch(() => {});
    if (masterUnitId2) await prisma.masterUnit.delete({ where: { id: masterUnitId2 } }).catch(() => {});
    if (masterUnitId3) await prisma.masterUnit.delete({ where: { id: masterUnitId3 } }).catch(() => {});
    if (masterTipeId) await prisma.masterTipe.delete({ where: { id: masterTipeId } }).catch(() => {});
    if (customerId) await prisma.customer.delete({ where: { id: customerId } }).catch(() => {});
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: createdUserIds } },
      });
    }
  });

  it("1. counts a lead created at 2026-10-31T17:30:00Z in November, not October", async () => {
    // 2026-10-31 17:30:00 UTC = 2026-11-01 00:30:00 WIB
    const boundaryLead = await prisma.lead.create({
      data: {
        nama: `${testPrefix} Boundary Lead Nov`,
        no_hp: `0899${Date.now().toString().slice(-8)}`,
        sumber: SumberLead.WALK_IN,
        marketing_id: activeMarketingId1,
        created_at: new Date("2026-10-31T17:30:00.000Z"),
      },
    });
    createdLeadIds.push(boundaryLead.id);

    const octData = await getManagerDashboardData(2026, 10);
    const novData = await getManagerDashboardData(2026, 11);

    // Look specifically at marketing 1's leadMasuk
    const m1Oct = octData.marketingPerformance.rows.find((r) => r.marketingId === activeMarketingId1);
    const m1Nov = novData.marketingPerformance.rows.find((r) => r.marketingId === activeMarketingId1);

    expect(m1Oct?.leadMasuk || 0).toBe(0);
    expect(m1Nov?.leadMasuk).toBeGreaterThanOrEqual(1);
  });

  it("2. counts closing_at = 2026-10-31 in October and 2026-11-01 in November", async () => {
    // Lead & ITJ for October deal
    const leadOct = await prisma.lead.create({
      data: {
        nama: `${testPrefix} Lead Deal Oct`,
        no_hp: `0899${Date.now().toString().slice(-8)}1`,
        sumber: SumberLead.FACEBOOK_ADS,
        marketing_id: activeMarketingId1,
      },
    });
    createdLeadIds.push(leadOct.id);

    const itjOct = await prisma.itj.create({
      data: {
        lead_id: leadOct.id,
        unit_id: masterUnitId1!,
        marketing_id: activeMarketingId1,
        status: StatusItj.DISETUJUI,
        nik: "3201111111111111",
        nama_ktp: "Pembeli Oct",
        nominal: 1000000,
        target_dp: 10000000,
        metode_bayar: MetodeBayar.KPR,
        diajukan_at: new Date("2026-10-10T10:00:00+07:00"),
        diputuskan_at: new Date("2026-10-12T10:00:00+07:00"),
      },
    });
    createdItjIds.push(itjOct.id);

    const txOct = await prisma.transaksi.create({
      data: {
        customer_id: customerId!,
        unit_id: masterUnitId1!,
        marketing_id: activeMarketingId1,
        itj_id: itjOct.id,
        metode_bayar: MetodeBayar.KPR,
        harga_deal: 200000000,
        target_itj: 1000000,
        target_dp: 10000000,
        status_transaksi: TahapTransaksi.AKAD_AJB,
        tahap_detail: TahapDetail.AKAD_KREDIT,
        closing_at: parseDateOnlyUTC("2026-10-31"), // October 31
      },
    });
    createdTransaksiIds.push(txOct.id);

    // Lead & ITJ for November deal
    const leadNov = await prisma.lead.create({
      data: {
        nama: `${testPrefix} Lead Deal Nov`,
        no_hp: `0899${Date.now().toString().slice(-8)}2`,
        sumber: SumberLead.INSTAGRAM,
        marketing_id: activeMarketingId1,
      },
    });
    createdLeadIds.push(leadNov.id);

    const itjNov = await prisma.itj.create({
      data: {
        lead_id: leadNov.id,
        unit_id: masterUnitId2!,
        marketing_id: activeMarketingId1,
        status: StatusItj.DISETUJUI,
        nik: "3201222222222222",
        nama_ktp: "Pembeli Nov",
        nominal: 1000000,
        target_dp: 10000000,
        metode_bayar: MetodeBayar.KPR,
        diajukan_at: new Date("2026-10-20T10:00:00+07:00"),
        diputuskan_at: new Date("2026-10-22T10:00:00+07:00"),
      },
    });
    createdItjIds.push(itjNov.id);

    const txNov = await prisma.transaksi.create({
      data: {
        customer_id: customerId!,
        unit_id: masterUnitId2!,
        marketing_id: activeMarketingId1,
        itj_id: itjNov.id,
        metode_bayar: MetodeBayar.KPR,
        harga_deal: 250000000,
        target_itj: 1000000,
        target_dp: 10000000,
        status_transaksi: TahapTransaksi.AKAD_AJB,
        tahap_detail: TahapDetail.AKAD_KREDIT,
        closing_at: parseDateOnlyUTC("2026-11-01"), // November 1
      },
    });
    createdTransaksiIds.push(txNov.id);

    const octReport = await getPenjualanReport(2026, 10);
    const novReport = await getPenjualanReport(2026, 11);

    const octDetailRows = octReport.tables[1].rows;
    const novDetailRows = novReport.tables[1].rows;

    expect(octDetailRows.some((r) => r.unit === `${testPrefix}_A1`)).toBe(true);
    expect(octDetailRows.some((r) => r.unit === `${testPrefix}_A2`)).toBe(false);

    expect(novDetailRows.some((r) => r.unit === `${testPrefix}_A2`)).toBe(true);
    expect(novDetailRows.some((r) => r.unit === `${testPrefix}_A1`)).toBe(false);
  });

  it("3. excludes a BATAL transaction with closing_at set from closing counts", async () => {
    const leadBatal = await prisma.lead.create({
      data: {
        nama: `${testPrefix} Lead Batal`,
        no_hp: `0899${Date.now().toString().slice(-8)}3`,
        sumber: SumberLead.TIKTOK,
        marketing_id: activeMarketingId1,
      },
    });
    createdLeadIds.push(leadBatal.id);

    const itjBatal = await prisma.itj.create({
      data: {
        lead_id: leadBatal.id,
        unit_id: masterUnitId3!,
        marketing_id: activeMarketingId1,
        status: StatusItj.DISETUJUI,
        nik: "3201333333333333",
        nama_ktp: "Pembeli Batal",
        nominal: 1000000,
        target_dp: 10000000,
        metode_bayar: MetodeBayar.CASH_KERAS,
        diajukan_at: new Date("2026-10-05T10:00:00+07:00"),
        diputuskan_at: new Date("2026-10-06T10:00:00+07:00"),
      },
    });
    createdItjIds.push(itjBatal.id);

    const txBatal = await prisma.transaksi.create({
      data: {
        customer_id: customerId!,
        unit_id: masterUnitId3!,
        marketing_id: activeMarketingId1,
        itj_id: itjBatal.id,
        metode_bayar: MetodeBayar.CASH_KERAS,
        harga_deal: 300000000,
        target_itj: 1000000,
        target_dp: 10000000,
        status_transaksi: TahapTransaksi.BATAL, // BATAL!
        tahap_detail: TahapDetail.BATAL,
        closing_at: parseDateOnlyUTC("2026-10-25"), // has closing_at set
      },
    });
    createdTransaksiIds.push(txBatal.id);

    const octPenjualan = await getPenjualanReport(2026, 10);
    const detailRows = octPenjualan.tables[1].rows;

    // Unit A3 is BATAL, must NOT appear in closing table
    expect(detailRows.some((r) => r.unit === `${testPrefix}_A3`)).toBe(false);
  });

  it("4. excludes voided payment from kas masuk and uses tgl_bayar (not created_at)", async () => {
    // Valid payment with tgl_bayar in October 2026, created in November
    const pValid = await prisma.pembayaran.create({
      data: {
        transaksi_id: createdTransaksiIds[0],
        admin_id: adminId,
        no_kwitansi: `KW_TEST_${timestamp}_1`,
        jenis_pembayaran: JenisBayar.ITJ,
        cara_bayar: CaraBayar.TRANSFER,
        nominal: 5000000,
        tgl_bayar: parseDateOnlyUTC("2026-10-15"),
        is_void: false,
        created_at: new Date("2026-11-05T10:00:00+07:00"), // created in November!
      },
    });
    createdPembayaranIds.push(pValid.id);

    // Voided payment with tgl_bayar in October 2026
    const pVoid = await prisma.pembayaran.create({
      data: {
        transaksi_id: createdTransaksiIds[0],
        admin_id: adminId,
        no_kwitansi: `KW_TEST_${timestamp}_2`,
        jenis_pembayaran: JenisBayar.DP,
        cara_bayar: CaraBayar.TRANSFER,
        nominal: 20000000,
        tgl_bayar: parseDateOnlyUTC("2026-10-20"),
        is_void: true, // VOID
        void_at: new Date(),
        void_by: adminId,
        void_reason: "Salah nominal input",
      },
    });
    createdPembayaranIds.push(pVoid.id);

    const octKas = await getKasReport(2026, 10);
    const kasDetail = octKas.tables[2].rows;

    // Valid payment must be included
    expect(kasDetail.some((r) => r.no_kwitansi === `KW_TEST_${timestamp}_1`)).toBe(true);

    // Voided payment must NOT be included
    expect(kasDetail.some((r) => r.no_kwitansi === `KW_TEST_${timestamp}_2`)).toBe(false);
  });

  it("5. does not move existing ITJ when a lead is reassigned to another marketing", async () => {
    // Lead originally owned by Marketing 1
    const leadReassign = await prisma.lead.create({
      data: {
        nama: `${testPrefix} Lead Dialihkan`,
        no_hp: `0899${Date.now().toString().slice(-8)}5`,
        sumber: SumberLead.WALK_IN,
        marketing_id: activeMarketingId1,
      },
    });
    createdLeadIds.push(leadReassign.id);

    // ITJ created while owned by Marketing 1
    const itjSnap = await prisma.itj.create({
      data: {
        lead_id: leadReassign.id,
        unit_id: masterUnitId1!,
        marketing_id: activeMarketingId1, // snapshot of owner at ITJ submission
        status: StatusItj.DIAJUKAN,
        nik: "3201444444444444",
        nama_ktp: "Pembeli Snap",
        nominal: 1000000,
        target_dp: 10000000,
        metode_bayar: MetodeBayar.KPR,
        diajukan_at: new Date("2026-10-15T10:00:00+07:00"),
      },
    });
    createdItjIds.push(itjSnap.id);

    // Now reassign lead to Marketing 2
    await prisma.lead.update({
      where: { id: leadReassign.id },
      data: { marketing_id: activeMarketingId2 },
    });

    const octReport = await getMarketingReport(2026, 10);
    const m1Row = octReport.tables[0].rows.find((r) => r.marketing_id === activeMarketingId1);
    const m2Row = octReport.tables[0].rows.find((r) => r.marketing_id === activeMarketingId2);

    // Marketing 1 keeps the ITJ count because Itj.marketing_id == m1.id
    expect((m1Row?.itj_diajukan as number) || 0).toBeGreaterThanOrEqual(1);

    // Marketing 2 does NOT get the ITJ count
    expect(m2Row?.itj_diajukan || 0).toBe(0);
  });

  it("6. increases 'ITJ diajukan' by two for a lead with two ITJ submissions", async () => {
    const leadDoubleItj = await prisma.lead.create({
      data: {
        nama: `${testPrefix} Lead Double ITJ`,
        no_hp: `0899${Date.now().toString().slice(-8)}6`,
        sumber: SumberLead.WALK_IN,
        marketing_id: activeMarketingId2,
      },
    });
    createdLeadIds.push(leadDoubleItj.id);

    const itj1 = await prisma.itj.create({
      data: {
        lead_id: leadDoubleItj.id,
        unit_id: masterUnitId2!,
        marketing_id: activeMarketingId2,
        status: StatusItj.DITOLAK,
        nik: "3201555555555555",
        nama_ktp: "Pembeli Dobel",
        nominal: 1000000,
        target_dp: 10000000,
        metode_bayar: MetodeBayar.KPR,
        diajukan_at: new Date("2026-10-02T10:00:00+07:00"),
      },
    });
    createdItjIds.push(itj1.id);

    const itj2 = await prisma.itj.create({
      data: {
        lead_id: leadDoubleItj.id,
        unit_id: masterUnitId2!,
        marketing_id: activeMarketingId2,
        status: StatusItj.DIAJUKAN,
        nik: "3201555555555555",
        nama_ktp: "Pembeli Dobel 2",
        nominal: 1000000,
        target_dp: 10000000,
        metode_bayar: MetodeBayar.KPR,
        diajukan_at: new Date("2026-10-08T10:00:00+07:00"),
      },
    });
    createdItjIds.push(itj2.id);

    const octReport = await getMarketingReport(2026, 10);
    const m2Row = octReport.tables[0].rows.find((r) => r.marketing_id === activeMarketingId2);

    expect(m2Row?.itj_diajukan).toBe(2);
  });

  it("7. hides inactive marketing with zero numbers and shows inactive marketing with non-zero numbers", async () => {
    // In October, Inactive Marketing has 0 numbers -> must be hidden
    const octReport = await getMarketingReport(2026, 10);
    const inactOct = octReport.tables[0].rows.find((r) => r.marketing_id === inactiveMarketingId);
    expect(inactOct).toBeUndefined();

    // Now give Inactive Marketing a lead in November
    const leadInactive = await prisma.lead.create({
      data: {
        nama: `${testPrefix} Lead Inactive User`,
        no_hp: `0899${Date.now().toString().slice(-8)}7`,
        sumber: SumberLead.WALK_IN,
        marketing_id: inactiveMarketingId,
        created_at: new Date("2026-11-10T10:00:00+07:00"),
      },
    });
    createdLeadIds.push(leadInactive.id);

    // In November, Inactive Marketing has non-zero numbers -> must be shown
    const novReport = await getMarketingReport(2026, 11);
    const inactNov = novReport.tables[0].rows.find((r) => r.marketing_id === inactiveMarketingId);
    expect(inactNov).toBeDefined();
    expect(inactNov?.lead_masuk).toBe(1);
  });

  it("8. counts a lead created in October that closes in November in October's cohort funnel and November's event closing KPI", async () => {
    const leadCohort = await prisma.lead.create({
      data: {
        nama: `${testPrefix} Lead Cohort Oct Nov`,
        no_hp: `0899${Date.now().toString().slice(-8)}8`,
        sumber: SumberLead.REFERRAL,
        marketing_id: activeMarketingId1,
        created_at: new Date("2026-10-05T10:00:00+07:00"),
        survei_selesai_at: new Date("2026-10-08T10:00:00+07:00"),
      },
    });
    createdLeadIds.push(leadCohort.id);

    const itjCohort = await prisma.itj.create({
      data: {
        lead_id: leadCohort.id,
        unit_id: masterUnitId1!,
        marketing_id: activeMarketingId1,
        status: StatusItj.DISETUJUI,
        nik: "3201888888888888",
        nama_ktp: "Pembeli Cohort",
        nominal: 1000000,
        target_dp: 10000000,
        metode_bayar: MetodeBayar.KPR,
        diajukan_at: new Date("2026-10-15T10:00:00+07:00"),
        diputuskan_at: new Date("2026-10-18T10:00:00+07:00"),
      },
    });
    createdItjIds.push(itjCohort.id);

    const txCohort = await prisma.transaksi.create({
      data: {
        customer_id: customerId!,
        unit_id: masterUnitId1!,
        marketing_id: activeMarketingId1,
        itj_id: itjCohort.id,
        metode_bayar: MetodeBayar.KPR,
        harga_deal: 220000000,
        target_itj: 1000000,
        target_dp: 10000000,
        status_transaksi: TahapTransaksi.AKAD_AJB,
        tahap_detail: TahapDetail.AKAD_KREDIT,
        closing_at: parseDateOnlyUTC("2026-11-15"), // Closes in November
      },
    });
    createdTransaksiIds.push(txCohort.id);

    // October Dashboard Cohort Funnel
    const octDashboard = await getManagerDashboardData(2026, 10);
    const octClosingStep = octDashboard.funnel.steps.find((s) => s.key === "closing");

    // Must be counted in October cohort funnel because the lead was born in October!
    expect(octClosingStep?.count).toBeGreaterThanOrEqual(1);

    // November Dashboard Event KPI
    const novDashboard = await getManagerDashboardData(2026, 11);
    // Must be counted in November event KPI because closing_at is in November!
    expect(novDashboard.kpis.closing.current).toBeGreaterThanOrEqual(1);
  });

  it("11. ensures dashboard KPI numbers and corresponding report numbers for the same month are identical", async () => {
    const dashboardOct = await getManagerDashboardData(2026, 10);
    const reportPenjualanOct = await getPenjualanReport(2026, 10);
    const reportKasOct = await getKasReport(2026, 10);

    // Closing count in KPI matches Total Unit Terjual in Laporan Penjualan
    const kpiClosing = dashboardOct.kpis.closing.current;
    const reportClosing = reportPenjualanOct.tables[0].totals?.unit_terjual;
    expect(kpiClosing).toBe(reportClosing);

    // Nilai Closing in KPI matches Total Nilai Closing in Laporan Penjualan
    const kpiNilaiClosing = dashboardOct.kpis.nilaiClosing.current;
    const reportNilaiClosing = reportPenjualanOct.tables[0].totals?.total_harga_deal;
    expect(kpiNilaiClosing).toBe(reportNilaiClosing);

    // Kas Masuk in KPI matches Total Nominal in Laporan Kas
    const kpiKas = dashboardOct.kpis.kasMasuk.current;
    const reportKas = reportKasOct.tables[0].totals?.total_nominal;
    expect(kpiKas).toBe(reportKas);
  });
});
