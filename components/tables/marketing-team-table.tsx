// components/tables/marketing-team-table.tsx
"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  UserPlus,
  Search,
  Phone,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Edit2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  X,
  KeyRound,
  UserCheck,
  UserX,
  Briefcase,
} from "lucide-react";
import { toast } from "sonner";
import {
  createUser,
  updateUser,
  toggleUserStatus,
} from "@/actions/user.action";
import { UserRole } from "@/schemas/user.schema";

export interface SerializedMarketingUser {
  id: number;
  nama: string;
  username: string;
  no_hp: string;
  role: UserRole;
  isActive: boolean;
  created_at: string;
  _count?: {
    leads: number;
    transaksi: number;
  };
}

// Alias for general naming
export type SerializedUser = SerializedMarketingUser;

interface MarketingTeamTableProps {
  initialUsers: SerializedMarketingUser[];
}

export function MarketingTeamTable({ initialUsers }: MarketingTeamTableProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [roleFilter, setRoleFilter] = useState<"ALL" | UserRole>("ALL");

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState<{
    nama: string;
    username: string;
    no_hp: string;
    role: UserRole;
    password: string;
  }>({
    nama: "",
    username: "",
    no_hp: "",
    role: "MARKETING",
    password: "",
  });

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SerializedMarketingUser | null>(null);
  const [editForm, setEditForm] = useState<{
    nama: string;
    no_hp: string;
    role: UserRole;
    password: string;
  }>({
    nama: "",
    no_hp: "",
    role: "MARKETING",
    password: "",
  });

  // Toggle Confirm Modal State
  const [isConfirmToggleOpen, setIsConfirmToggleOpen] = useState(false);
  const [targetToggleUser, setTargetToggleUser] = useState<SerializedMarketingUser | null>(null);

  const [isPending, startTransition] = useTransition();

  // Helper date formatter
  const formatDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Filtered Users
  const filteredUsers = React.useMemo(() => {
    return initialUsers.filter((u) => {
      // Status filter
      if (statusFilter === "ACTIVE" && !u.isActive) return false;
      if (statusFilter === "INACTIVE" && u.isActive) return false;

      // Role filter
      if (roleFilter !== "ALL" && u.role !== roleFilter) return false;

      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        u.nama.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.no_hp.includes(q) ||
        u.role.toLowerCase().includes(q)
      );
    });
  }, [initialUsers, statusFilter, roleFilter, searchQuery]);

  // Open Edit Modal
  const handleOpenEdit = (user: SerializedMarketingUser) => {
    setEditingUser(user);
    setEditForm({
      nama: user.nama,
      no_hp: user.no_hp,
      role: user.role,
      password: "",
    });
    setIsEditModalOpen(true);
  };

  // Open Toggle Confirm Modal
  const handleOpenToggle = (user: SerializedMarketingUser) => {
    setTargetToggleUser(user);
    setIsConfirmToggleOpen(true);
  };

  // Submit Create User
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !createForm.nama.trim() ||
      !createForm.username.trim() ||
      !createForm.no_hp.trim() ||
      !createForm.password
    ) {
      toast.error("Semua kolom formulir wajib diisi");
      return;
    }

    if (createForm.password.length < 6) {
      toast.error("Password minimal 6 karakter");
      return;
    }

    startTransition(async () => {
      const res = await createUser({
        nama: createForm.nama,
        username: createForm.username,
        no_hp: createForm.no_hp,
        role: createForm.role,
        password: createForm.password,
      });

      if (!res.success) {
        toast.error(res.error || "Gagal menambahkan akun pengguna");
        return;
      }

      toast.success(res.message || "Akun berhasil dibuat");
      setIsCreateModalOpen(false);
      setCreateForm({
        nama: "",
        username: "",
        no_hp: "",
        role: "MARKETING",
        password: "",
      });
      router.refresh();
    });
  };

  // Submit Edit User
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (!editForm.nama.trim() || !editForm.no_hp.trim()) {
      toast.error("Nama dan Nomor HP wajib diisi");
      return;
    }

    if (editForm.password && editForm.password.length < 6) {
      toast.error("Password baru minimal 6 karakter");
      return;
    }

    startTransition(async () => {
      const res = await updateUser(editingUser.id, {
        nama: editForm.nama,
        no_hp: editForm.no_hp,
        role: editForm.role,
        password: editForm.password || undefined,
      });

      if (!res.success) {
        toast.error(res.error || "Gagal memperbarui data akun");
        return;
      }

      toast.success(res.message || "Data akun berhasil diperbarui");
      setIsEditModalOpen(false);
      setEditingUser(null);
      router.refresh();
    });
  };

  // Submit Toggle Status (Soft Delete / Reactivate)
  const handleToggleConfirm = () => {
    if (!targetToggleUser) return;

    startTransition(async () => {
      const res = await toggleUserStatus(targetToggleUser.id);

      if (!res.success) {
        toast.error(res.error || "Gagal mengubah status akun");
        return;
      }

      toast.success(res.message || "Status akun berhasil diubah");
      setIsConfirmToggleOpen(false);
      setTargetToggleUser(null);
      router.refresh();
    });
  };

  // Role Badge Helper
  const renderRoleBadge = (role: UserRole) => {
    switch (role) {
      case "MANAGER":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200 shadow-2xs">
            <ShieldAlert className="w-3.5 h-3.5 text-purple-600" />
            <span>Manager</span>
          </span>
        );
      case "ADMIN":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Admin</span>
          </span>
        );
      case "MARKETING":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-50 text-prism-teal border border-teal-200 shadow-2xs">
            <Briefcase className="w-3.5 h-3.5 text-prism-teal" />
            <span>Marketing</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Toolbar & Quick Filters */}
      <div className="flex flex-col gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-mist shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Role Quick Filters */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="text-[11px] font-bold text-slate uppercase tracking-wider mr-1">
              Role:
            </span>
            <button
              type="button"
              onClick={() => setRoleFilter("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                roleFilter === "ALL"
                  ? "bg-carbon-ink text-white shadow-2xs"
                  : "bg-bone text-slate hover:bg-slate-200 hover:text-carbon-ink"
              }`}
            >
              Semua Role ({initialUsers.length})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter("MARKETING")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                roleFilter === "MARKETING"
                  ? "bg-teal-700 text-white shadow-2xs"
                  : "bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100"
              }`}
            >
              Marketing ({initialUsers.filter((u) => u.role === "MARKETING").length})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter("ADMIN")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                roleFilter === "ADMIN"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
              }`}
            >
              Admin ({initialUsers.filter((u) => u.role === "ADMIN").length})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter("MANAGER")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                roleFilter === "MANAGER"
                  ? "bg-purple-700 text-white shadow-2xs"
                  : "bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100"
              }`}
            >
              Manager ({initialUsers.filter((u) => u.role === "MANAGER").length})
            </button>
          </div>

          {/* Action & Search */}
          <div className="flex items-center gap-3">
            {/* Live Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-fog" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama, user, HP, role..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-mist bg-white text-graphite placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal"
              />
            </div>

            {/* Add Button */}
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-prism-teal hover:bg-deep-teal active:bg-deep-teal text-white text-xs font-bold shadow-subtle transition-all cursor-pointer shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Tambah Anggota</span>
            </button>
          </div>
        </div>

        {/* Status Quick Filter Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-mist/80">
          <span className="text-[11px] font-bold text-slate uppercase tracking-wider mr-1">
            Status:
          </span>
          <button
            type="button"
            onClick={() => setStatusFilter("ALL")}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              statusFilter === "ALL"
                ? "bg-carbon-ink text-white"
                : "bg-bone text-slate hover:bg-slate-200 hover:text-carbon-ink"
            }`}
          >
            Semua ({initialUsers.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("ACTIVE")}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              statusFilter === "ACTIVE"
                ? "bg-emerald-600 text-white"
                : "bg-bone text-slate hover:bg-slate-200 hover:text-carbon-ink"
            }`}
          >
            Aktif ({initialUsers.filter((u) => u.isActive).length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("INACTIVE")}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              statusFilter === "INACTIVE"
                ? "bg-rose-600 text-white"
                : "bg-bone text-slate hover:bg-slate-200 hover:text-carbon-ink"
            }`}
          >
            Non-aktif ({initialUsers.filter((u) => !u.isActive).length})
          </button>
        </div>
      </div>

      {/* 2. Desktop-Optimized Data Table */}
      <div className="bg-white rounded-2xl border border-mist shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-bone/70 border-b border-mist text-slate font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Nama Lengkap</th>
                <th className="py-3 px-4">Username</th>
                <th className="py-3 px-4 text-center">Role / Hak Akses</th>
                <th className="py-3 px-4">Kontak / No HP</th>
                <th className="py-3 px-4 text-center">Status Akun</th>
                <th className="py-3 px-4 text-center">Beban Lead</th>
                <th className="py-3 px-4 text-center">Transaksi</th>
                <th className="py-3 px-4">Bergabung</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mist">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Users className="w-8 h-8 text-slate-300 stroke-[1.5]" />
                      <p className="font-semibold text-graphite">Tidak ada data pengguna yang ditemukan</p>
                      <p className="text-[11px] text-slate-400">
                        {searchQuery
                          ? "Coba ubah kata kunci atau filter status/role yang aktif."
                          : "Belum ada akun pengguna yang terdaftar."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className={`hover:bg-bone/30 transition-colors ${
                      !user.isActive ? "bg-slate-50/50 opacity-75" : ""
                    }`}
                  >
                    {/* Nama */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                            !user.isActive
                              ? "bg-slate-100 border border-slate-200 text-slate-500"
                              : user.role === "MANAGER"
                              ? "bg-purple-50 border border-purple-200 text-purple-700"
                              : user.role === "ADMIN"
                              ? "bg-blue-50 border border-blue-200 text-blue-700"
                              : "bg-teal-50 border border-teal-200 text-teal-700"
                          }`}
                        >
                          {user.nama.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-carbon-ink text-xs">{user.nama}</p>
                          <span className="text-[10px] text-slate font-medium">
                            ID #{user.id}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Username */}
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-bone text-graphite border border-mist">
                        @{user.username}
                      </span>
                    </td>

                    {/* Role */}
                    <td className="py-3.5 px-4 text-center">
                      {renderRoleBadge(user.role)}
                    </td>

                    {/* No HP */}
                    <td className="py-3.5 px-4 font-mono text-xs">
                      <div className="flex items-center gap-1.5 text-graphite">
                        <Phone className="w-3.5 h-3.5 text-slate" />
                        <span>{user.no_hp}</span>
                      </div>
                    </td>

                    {/* Status Akun */}
                    <td className="py-3.5 px-4 text-center">
                      {user.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Aktif</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <XCircle className="w-3 h-3 text-rose-600" />
                          <span>Non-aktif</span>
                        </span>
                      )}
                    </td>

                    {/* Beban Lead */}
                    <td className="py-3.5 px-4 text-center font-bold tabular-nums text-carbon-ink">
                      {user._count?.leads ?? 0}
                    </td>

                    {/* Transaksi */}
                    <td className="py-3.5 px-4 text-center font-bold tabular-nums text-carbon-ink">
                      {user._count?.transaksi ?? 0}
                    </td>

                    {/* Tanggal Bergabung */}
                    <td className="py-3.5 px-4 font-mono text-slate text-[11px]">
                      {formatDate(user.created_at)}
                    </td>

                    {/* Aksi */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(user)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-mist bg-white text-slate hover:text-carbon-ink hover:border-slate-300 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                          title="Edit akun"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        {/* Toggle Active / Nonactive */}
                        <button
                          type="button"
                          onClick={() => handleOpenToggle(user)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold shadow-2xs transition-colors cursor-pointer ${
                            user.isActive
                              ? "bg-white text-rose-600 border-rose-200 hover:bg-rose-50"
                              : "bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                          }`}
                          title={user.isActive ? "Nonaktifkan akun" : "Aktifkan akun"}
                        >
                          {user.isActive ? (
                            <>
                              <UserX className="w-3.5 h-3.5" />
                              <span>Nonaktifkan</span>
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Aktifkan</span>
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Modal: Tambah Anggota / User Baru */}
      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-md bg-white rounded-2xl border border-mist shadow-2xl overflow-hidden p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-mist">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-prism-teal flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-carbon-ink">
                    Tambah Pengguna Baru
                  </h3>
                  <p className="text-[11px] text-slate">
                    Daftarkan akun baru untuk Marketing, Admin, atau Manager
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-full text-slate hover:text-graphite hover:bg-bone"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-graphite mb-1">
                  Nama Lengkap <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Rian Anggara"
                  value={createForm.nama}
                  onChange={(e) => setCreateForm({ ...createForm, nama: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-mist bg-white text-graphite placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-graphite mb-1">
                  Username <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: rian.marketing"
                  value={createForm.username}
                  onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-mist bg-white text-graphite placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal"
                />
                <p className="text-[10px] text-slate mt-1">
                  Digunakan untuk login (huruf kecil, angka, titik, atau underscore).
                </p>
              </div>

              {/* Role Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-graphite mb-1">
                  Peran / Hak Akses (Role) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={createForm.role}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      role: e.target.value as UserRole,
                    })
                  }
                  className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-mist bg-white text-carbon-ink focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal"
                >
                  <option value="MARKETING">MARKETING (Sales Lapangan & Kelola Lead)</option>
                  <option value="ADMIN">ADMIN (Review ITJ & Transaksi Keuangan)</option>
                  <option value="MANAGER">MANAGER (Branch Manager & Supervisi)</option>
                </select>
                <p className="text-[10px] text-slate mt-1">
                  Tentukan hak akses login pengguna ke modul portal yang sesuai.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-graphite mb-1">
                  Nomor HP (WhatsApp) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="Contoh: 081234567890"
                  value={createForm.no_hp}
                  onChange={(e) => setCreateForm({ ...createForm, no_hp: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-mist bg-white text-graphite placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-graphite mb-1">
                  Password Awal <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="Minimal 6 karakter"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-mist bg-white text-graphite placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-mist">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isPending}
                  className="px-4 py-2 text-xs font-semibold text-slate hover:text-graphite rounded-lg hover:bg-bone transition-colors disabled:opacity-50"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-prism-teal hover:bg-deep-teal rounded-lg shadow-subtle transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Simpan Pengguna</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Modal: Edit Anggota */}
      {isEditModalOpen && editingUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-md bg-white rounded-2xl border border-mist shadow-2xl overflow-hidden p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-mist">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-prism-teal flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-carbon-ink">
                    Edit Akun Pengguna
                  </h3>
                  <p className="text-[11px] text-slate">
                    Ubah data, role, atau reset password untuk @{editingUser.username}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-full text-slate hover:text-graphite hover:bg-bone"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-graphite mb-1">
                  Nama Lengkap <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.nama}
                  onChange={(e) => setEditForm({ ...editForm, nama: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-mist bg-white text-graphite focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-graphite mb-1">
                  Username <span className="text-fog font-normal">(Tidak dapat diubah)</span>
                </label>
                <input
                  type="text"
                  disabled
                  value={editingUser.username}
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-mist bg-bone/70 text-slate cursor-not-allowed"
                />
              </div>

              {/* Role Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-graphite mb-1">
                  Peran / Hak Akses (Role) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={editForm.role}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      role: e.target.value as UserRole,
                    })
                  }
                  className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-mist bg-white text-carbon-ink focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal"
                >
                  <option value="MARKETING">MARKETING (Sales Lapangan & Kelola Lead)</option>
                  <option value="ADMIN">ADMIN (Review ITJ & Transaksi Keuangan)</option>
                  <option value="MANAGER">MANAGER (Branch Manager & Supervisi)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-graphite mb-1">
                  Nomor HP <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={editForm.no_hp}
                  onChange={(e) => setEditForm({ ...editForm, no_hp: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-mist bg-white text-graphite focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal"
                />
              </div>

              <div className="p-3 rounded-xl bg-bone/50 border border-mist space-y-2">
                <label className="block text-xs font-semibold text-graphite flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-prism-teal" />
                  <span>Reset Password <span className="text-fog font-normal">(Opsional)</span></span>
                </label>
                <input
                  type="password"
                  placeholder="Kosongkan jika password tidak ingin diubah"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-mist bg-white text-graphite placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal"
                />
                <p className="text-[10px] text-slate">
                  Isi hanya jika pengguna lupa password atau ingin mengganti password baru (min. 6 karakter).
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-mist">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isPending}
                  className="px-4 py-2 text-xs font-semibold text-slate hover:text-graphite rounded-lg hover:bg-bone transition-colors disabled:opacity-50"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-prism-teal hover:bg-deep-teal rounded-lg shadow-subtle transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Simpan Perubahan</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Modal: Konfirmasi Nonaktifkan / Aktifkan Akun */}
      {isConfirmToggleOpen && targetToggleUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-sm bg-white rounded-2xl border border-mist shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-mist">
              <div className="flex items-center gap-2">
                {targetToggleUser.isActive ? (
                  <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                    <UserX className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <UserCheck className="w-4 h-4" />
                  </div>
                )}
                <h3 className="text-sm font-bold text-carbon-ink">
                  {targetToggleUser.isActive ? "Nonaktifkan Akun" : "Aktifkan Akun"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsConfirmToggleOpen(false)}
                className="p-1 rounded-full text-slate hover:text-graphite hover:bg-bone"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate">
              {targetToggleUser.isActive ? (
                <>
                  <p>
                    Apakah Anda yakin ingin menonaktifkan akun ({targetToggleUser.role}){" "}
                    <strong>{targetToggleUser.nama}</strong> (@{targetToggleUser.username})?
                  </p>
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] space-y-1">
                    <p className="font-bold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      <span>Data Transaksi &amp; Lead Aman</span>
                    </p>
                    <p>
                      Akun tidak dihapus dari database. Pengguna tidak akan dapat login kembali, namun seluruh histori transaksi tetap tersimpan utuh.
                    </p>
                  </div>
                </>
              ) : (
                <p>
                  Apakah Anda ingin mengaktifkan kembali akun ({targetToggleUser.role}){" "}
                  <strong>{targetToggleUser.nama}</strong> (@{targetToggleUser.username})? Pengguna akan dapat login kembali ke portal.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-mist">
              <button
                type="button"
                onClick={() => setIsConfirmToggleOpen(false)}
                disabled={isPending}
                className="px-3.5 py-2 text-xs font-semibold text-slate hover:text-graphite rounded-lg hover:bg-bone transition-colors disabled:opacity-50"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleToggleConfirm}
                disabled={isPending}
                className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white rounded-lg shadow-subtle transition-all disabled:opacity-50 cursor-pointer ${
                  targetToggleUser.isActive
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <span>
                    {targetToggleUser.isActive ? "Ya, Nonaktifkan" : "Ya, Aktifkan"}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
