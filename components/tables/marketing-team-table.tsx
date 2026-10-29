// components/tables/marketing-team-table.tsx
"use client";

import React, { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  Search,
  Edit2,
  Loader2,
  X,
  Phone,
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

interface MarketingTeamTableProps {
  initialUsers: SerializedMarketingUser[];
}

export function MarketingTeamTable({ initialUsers }: MarketingTeamTableProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [roleFilter, setRoleFilter] = useState<"ALL" | UserRole>("ALL");

  // Create Modal
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

  // Edit Modal
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

  // Toggle Confirm Modal
  const [isConfirmToggleOpen, setIsConfirmToggleOpen] = useState(false);
  const [targetToggleUser, setTargetToggleUser] = useState<SerializedMarketingUser | null>(null);

  const [isPending, startTransition] = useTransition();

  const formatDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const filteredUsers = useMemo(() => {
    return initialUsers.filter((u) => {
      if (statusFilter === "ACTIVE" && !u.isActive) return false;
      if (statusFilter === "INACTIVE" && u.isActive) return false;
      if (roleFilter !== "ALL" && u.role !== roleFilter) return false;

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

  const handleOpenToggle = (user: SerializedMarketingUser) => {
    setTargetToggleUser(user);
    setIsConfirmToggleOpen(true);
  };

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
        username: createForm.username.trim().toLowerCase(),
        no_hp: createForm.no_hp,
        role: createForm.role,
        password: createForm.password,
      });

      if (!res.success) {
        toast.error(res.error || "Gagal menambahkan akun");
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
        toast.error(res.error || "Gagal memperbarui data");
        return;
      }

      toast.success(res.message || "Data akun berhasil diperbarui");
      setIsEditModalOpen(false);
      setEditingUser(null);
      router.refresh();
    });
  };

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

  const renderRoleBadge = (role: UserRole) => {
    switch (role) {
      case "MANAGER":
        return (
          <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium border bg-purple-50 text-purple-700 border-purple-200">
            Manager
          </span>
        );
      case "ADMIN":
        return (
          <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium border bg-blue-50 text-blue-700 border-blue-200">
            Admin
          </span>
        );
      case "MARKETING":
      default:
        return (
          <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium border bg-zinc-100 text-zinc-700 border-zinc-200">
            Marketing
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 font-sans text-zinc-900">
      {/* Control bar / Filters & Actions */}
      <div className="flex flex-wrap items-center gap-2.5 bg-zinc-50/60 p-2.5 rounded-lg border border-zinc-200">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama, username, nomor HP..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-zinc-200 bg-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as "ALL" | UserRole)}
          className="h-8 px-2.5 text-xs rounded-md border border-zinc-200 bg-white text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-400"
        >
          <option value="ALL">Semua Peran</option>
          <option value="MARKETING">Marketing</option>
          <option value="ADMIN">Admin</option>
          <option value="MANAGER">Manager</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "ALL" | "ACTIVE" | "INACTIVE")}
          className="h-8 px-2.5 text-xs rounded-md border border-zinc-200 bg-white text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-400"
        >
          <option value="ALL">Semua Status</option>
          <option value="ACTIVE">Aktif</option>
          <option value="INACTIVE">Non-aktif</option>
        </select>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium transition-colors shadow-xs"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Tambah Pengguna</span>
        </button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/75 text-zinc-500 font-medium">
                <th className="px-4 py-3 whitespace-nowrap">Pengguna</th>
                <th className="px-4 py-3 whitespace-nowrap">Peran</th>
                <th className="px-4 py-3 whitespace-nowrap">Kontak</th>
                <th className="px-4 py-3 whitespace-nowrap">Status</th>
                <th className="px-4 py-3 text-center whitespace-nowrap">Beban Lead</th>
                <th className="px-4 py-3 text-center whitespace-nowrap">Transaksi</th>
                <th className="px-4 py-3 whitespace-nowrap">Terdaftar</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-zinc-700">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-zinc-500">
                    <p className="text-sm font-medium text-zinc-900">Tidak ada pengguna yang cocok</p>
                    <p className="text-xs text-zinc-500 mt-1">Ubah kata kunci pencarian atau sesuaikan filter Anda.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className={`hover:bg-zinc-50/70 transition-colors ${!user.isActive ? "bg-zinc-50/40 opacity-75" : ""
                      }`}
                  >
                    {/* Nama & Username */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-semibold text-zinc-900 text-[13px]">
                          {user.nama}
                        </span>
                        <span className="text-[11px] font-mono text-zinc-400 mt-0.5">
                          @{user.username}
                        </span>
                      </div>
                    </td>

                    {/* Peran */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {renderRoleBadge(user.role)}
                    </td>

                    {/* Kontak */}
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px]">
                      <span className="inline-flex items-center gap-1.5 text-zinc-700">
                        <Phone className="w-3.5 h-3.5 text-zinc-400" />
                        <span>{user.no_hp}</span>
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {user.isActive ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-300" />
                          Non-aktif
                        </span>
                      )}
                    </td>

                    {/* Beban Lead */}
                    <td className="px-4 py-3 text-center tabular-nums font-medium text-zinc-800">
                      {user._count?.leads ?? 0}
                    </td>

                    {/* Transaksi */}
                    <td className="px-4 py-3 text-center tabular-nums font-medium text-zinc-800">
                      {user._count?.transaksi ?? 0}
                    </td>

                    {/* Tanggal Bergabung */}
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-zinc-500 text-[11px]">
                      {formatDate(user.created_at)}
                    </td>

                    {/* Aksi */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(user)}
                          className="px-2 py-1 rounded text-xs font-medium border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 transition-colors inline-flex items-center gap-1"
                        >
                          <Edit2 className="w-3 h-3 text-zinc-400" />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenToggle(user)}
                          className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${user.isActive
                              ? "border-zinc-200 bg-white text-zinc-600 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50"
                              : "border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100/60"
                            }`}
                        >
                          {user.isActive ? "Nonaktifkan" : "Aktifkan"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-zinc-200 bg-zinc-50/50 flex items-center justify-between text-xs text-zinc-500">
          <span>
            Menampilkan <span className="font-medium text-zinc-800">{filteredUsers.length}</span> dari{" "}
            <span className="font-medium text-zinc-800">{initialUsers.length}</span> pengguna terdaftar
          </span>
        </div>
      </div>

      {/* Modal: Tambah User Baru */}
      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm bg-white rounded-lg border border-zinc-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 bg-zinc-50/50">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-700">
                Tambah Pengguna Baru
              </h2>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Rian Anggara"
                  value={createForm.nama}
                  onChange={(e) => setCreateForm({ ...createForm, nama: e.target.value })}
                  className="w-full h-8 px-2.5 text-xs rounded border border-zinc-200 bg-white placeholder:text-zinc-400 text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  required
                  placeholder="rian.marketing"
                  value={createForm.username}
                  onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                  className="w-full h-8 px-2.5 text-xs font-mono rounded border border-zinc-200 bg-white placeholder:text-zinc-400 text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Peran / Hak Akses (Role)
                </label>
                <select
                  value={createForm.role}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      role: e.target.value as UserRole,
                    })
                  }
                  className="w-full h-8 px-2.5 text-xs rounded border border-zinc-200 bg-white text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                >
                  <option value="MARKETING">MARKETING — Sales & Follow-up Lead</option>
                  <option value="ADMIN">ADMIN — Pengelolaan Berkas & Transaksi</option>
                  <option value="MANAGER">MANAGER — Pengawasan & Rekap Eksekutif</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Nomor HP (WhatsApp)
                </label>
                <input
                  type="tel"
                  required
                  placeholder="081234567890"
                  value={createForm.no_hp}
                  onChange={(e) => setCreateForm({ ...createForm, no_hp: e.target.value })}
                  className="w-full h-8 px-2.5 text-xs font-mono rounded border border-zinc-200 bg-white placeholder:text-zinc-400 text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Password Awal
                </label>
                <input
                  type="password"
                  required
                  placeholder="Minimal 6 karakter"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="w-full h-8 px-2.5 text-xs rounded border border-zinc-200 bg-white placeholder:text-zinc-400 text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isPending}
                  className="px-3 py-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 rounded transition-colors disabled:opacity-50"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan Pengguna</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit User */}
      {isEditModalOpen && editingUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm bg-white rounded-lg border border-zinc-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 bg-zinc-50/50">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-700">
                Edit Akun: @{editingUser.username}
              </h2>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={editForm.nama}
                  onChange={(e) => setEditForm({ ...editForm, nama: e.target.value })}
                  className="w-full h-8 px-2.5 text-xs rounded border border-zinc-200 bg-white text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Peran / Hak Akses (Role)
                </label>
                <select
                  value={editForm.role}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      role: e.target.value as UserRole,
                    })
                  }
                  className="w-full h-8 px-2.5 text-xs rounded border border-zinc-200 bg-white text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                >
                  <option value="MARKETING">MARKETING — Sales & Follow-up Lead</option>
                  <option value="ADMIN">ADMIN — Pengelolaan Berkas & Transaksi</option>
                  <option value="MANAGER">MANAGER — Pengawasan & Rekap Eksekutif</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Nomor HP
                </label>
                <input
                  type="tel"
                  required
                  value={editForm.no_hp}
                  onChange={(e) => setEditForm({ ...editForm, no_hp: e.target.value })}
                  className="w-full h-8 px-2.5 text-xs font-mono rounded border border-zinc-200 bg-white text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Reset Password <span className="text-zinc-400 font-normal">(Kosongkan bila tetap)</span>
                </label>
                <input
                  type="password"
                  placeholder="Password baru (min. 6 karakter)"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  className="w-full h-8 px-2.5 text-xs rounded border border-zinc-200 bg-white placeholder:text-zinc-400 text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isPending}
                  className="px-3 py-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 rounded transition-colors disabled:opacity-50"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Konfirmasi Status Akun */}
      {isConfirmToggleOpen && targetToggleUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm bg-white rounded-lg border border-zinc-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 bg-zinc-50/50">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-700">
                {targetToggleUser.isActive ? "Nonaktifkan Akun" : "Aktifkan Akun"}
              </h2>
              <button
                type="button"
                onClick={() => setIsConfirmToggleOpen(false)}
                className="p-1 rounded text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs text-zinc-600">
              <p>
                {targetToggleUser.isActive ? (
                  <>
                    Apakah Anda yakin ingin menonaktifkan akun{" "}
                    <strong className="text-zinc-900">{targetToggleUser.nama}</strong> (@{targetToggleUser.username})? Pengguna tidak akan dapat masuk kembali ke portal.
                  </>
                ) : (
                  <>
                    Aktifkan kembali akses login untuk{" "}
                    <strong className="text-zinc-900">{targetToggleUser.nama}</strong> (@{targetToggleUser.username})?
                  </>
                )}
              </p>

              {targetToggleUser.isActive && (
                <div className="p-2.5 rounded bg-amber-50/70 border border-amber-200 text-amber-800 text-[11px]">
                  Seluruh data lead dan transaksi yang terkait tetap aman tersimpan di database.
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsConfirmToggleOpen(false)}
                  disabled={isPending}
                  className="px-3 py-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleToggleConfirm}
                  disabled={isPending}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded transition-colors disabled:opacity-50 ${targetToggleUser.isActive
                      ? "bg-rose-600 hover:bg-rose-700"
                      : "bg-zinc-900 hover:bg-zinc-800"
                    }`}
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{targetToggleUser.isActive ? "Nonaktifkan" : "Aktifkan"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}