"use client";

import React, { useState } from "react";
import {
  Database,
  Download,
  Trash2,
  AlertTriangle,
  Lock,
  CheckCircle2,
  FileSpreadsheet,
  FileCode,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface DataTabProps {
  userEmail: string | null;
}

export function DataTab({ userEmail }: DataTabProps) {
  const router = useRouter();

  // Export states
  const [exportingJson, setExportingJson] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  // Modal states: Delete Data
  const [isDeleteDataModalOpen, setIsDeleteDataModalOpen] = useState(false);
  const [dataPassword, setDataPassword] = useState("");
  const [dataPhrase, setDataPhrase] = useState("");
  const [deleteDataLoading, setDeleteDataLoading] = useState(false);
  const [deleteDataError, setDeleteDataError] = useState<string | null>(null);
  const [deleteDataSuccess, setDeleteDataSuccess] = useState(false);

  // Modal states: Delete Account
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);
  const [accountPassword, setAccountPassword] = useState("");
  const [accountPhrase, setAccountPhrase] = useState("");
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);

  // Trigger file download via authenticated server route
  const handleExport = async (format: "json" | "csv") => {
    if (format === "json") setExportingJson(true);
    if (format === "csv") setExportingCsv(true);
    setExportSuccess(null);

    try {
      const res = await fetch(`/api/user/export?format=${format}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Export failed with status ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const dateStr = new Date().toISOString().split("T")[0];
      a.href = url;
      a.download = `lifemaxxing_export_${dateStr}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportSuccess(`Successfully downloaded full ${format.toUpperCase()} archive.`);
      setTimeout(() => setExportSuccess(null), 4000);
    } catch (err: any) {
      alert(err.message || "Failed to download export.");
    } finally {
      setExportingJson(false);
      setExportingCsv(false);
    }
  };

  const handleDeleteData = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteDataError(null);
    setDeleteDataSuccess(false);

    if (dataPhrase !== "DELETE MY DATA") {
      setDeleteDataError('You must type exactly "DELETE MY DATA" to proceed.');
      return;
    }

    setDeleteDataLoading(true);
    try {
      const res = await fetch("/api/user/delete-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: dataPassword,
          confirmationPhrase: dataPhrase,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to delete data.");
      }

      setDeleteDataSuccess(true);
      setDataPassword("");
      setDataPhrase("");
      setTimeout(() => {
        setIsDeleteDataModalOpen(false);
        setDeleteDataSuccess(false);
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      setDeleteDataError(err.message || "Failed to delete data.");
    } finally {
      setDeleteDataLoading(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteAccountError(null);

    if (accountPhrase !== "DELETE MY ACCOUNT") {
      setDeleteAccountError('You must type exactly "DELETE MY ACCOUNT" to proceed.');
      return;
    }

    setDeleteAccountLoading(true);
    try {
      const res = await fetch("/api/user/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: accountPassword,
          confirmationPhrase: accountPhrase,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to delete account.");
      }

      // Hard account deletion finished, redirect to login
      router.push("/login?deleted=true");
      router.refresh();
    } catch (err: any) {
      setDeleteAccountError(err.message || "Failed to delete account.");
    } finally {
      setDeleteAccountLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Data Export Card */}
      <div className="p-5 bg-surface-container rounded-2xl border border-border-subtle space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-primary-lime" />
            <h3 className="text-sm font-bold font-mono text-on-surface">Data Sovereignty & Export</h3>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-mono text-text-muted">
            <Lock className="w-3 h-3" />
            <span>Encrypted Session</span>
          </div>
        </div>

        <p className="text-xs text-on-surface-variant leading-relaxed">
          Download 100% of your data dynamically generated across every user-owned table in the database schema (workouts, sleep, nutrition, focus sessions, math drills, books, and screen time). Exports are executed server-side under your authenticated session and include soft-deleted records for archival completeness.
        </p>

        <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs font-mono text-text-muted">
            {exportSuccess ? (
              <span className="text-emerald-success flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>{exportSuccess}</span>
              </span>
            ) : (
              <span>Choose format (JSON or CSV):</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport("json")}
              disabled={exportingJson || exportingCsv}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest border border-border-subtle text-xs font-mono text-on-surface transition-all cursor-pointer disabled:opacity-50"
            >
              {exportingJson ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-lime" />
              ) : (
                <FileCode className="w-3.5 h-3.5 text-primary-lime" />
              )}
              <span>Export JSON</span>
            </button>

            <button
              onClick={() => handleExport("csv")}
              disabled={exportingJson || exportingCsv}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest border border-border-subtle text-xs font-mono text-on-surface transition-all cursor-pointer disabled:opacity-50"
            >
              {exportingCsv ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-tertiary-purple" />
              ) : (
                <FileSpreadsheet className="w-3.5 h-3.5 text-tertiary-purple" />
              )}
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone: Dual Action Deletion Card */}
      <div className="p-5 bg-surface-container rounded-2xl border border-crimson-alert/30 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-crimson-alert/20 text-crimson-alert">
          <ShieldAlert className="w-4 h-4" />
          <h3 className="text-sm font-bold font-mono">Danger Zone: Data & Account Deletion</h3>
        </div>

        <p className="text-xs text-on-surface-variant leading-relaxed">
          Permanent actions cannot be undone. We recommend downloading an export of your data before proceeding.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Action 1: Delete My Data */}
          <div className="p-4 bg-surface-container-low rounded-xl border border-border-subtle space-y-3">
            <div>
              <h4 className="text-xs font-bold font-mono text-on-surface">Delete My Data</h4>
              <p className="text-[11px] text-text-muted mt-1 leading-relaxed">
                Permanently deletes all telemetry, workouts, logs, and resets targets to null. <strong>Keeps your account and login active.</strong>
              </p>
            </div>
            <button
              onClick={() => setIsDeleteDataModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-core/10 hover:bg-amber-core/20 border border-amber-core/30 text-amber-core text-xs font-mono font-semibold transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Reset & Delete Data</span>
            </button>
          </div>

          {/* Action 2: Delete My Account */}
          <div className="p-4 bg-surface-container-low rounded-xl border border-crimson-alert/30 space-y-3">
            <div>
              <h4 className="text-xs font-bold font-mono text-crimson-alert">Delete My Account</h4>
              <p className="text-[11px] text-text-muted mt-1 leading-relaxed">
                Permanently hard deletes your authentication user, profile, uploaded files, and all associated database records. Satisfies App Store in-app deletion requirements.
              </p>
            </div>
            <button
              onClick={() => setIsDeleteAccountModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-crimson-alert/15 hover:bg-crimson-alert/25 border border-crimson-alert/40 text-crimson-alert text-xs font-mono font-semibold transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Permanently Delete Account</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Delete Data */}
      {isDeleteDataModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container p-6 rounded-2xl border border-amber-core/30 max-w-md w-full space-y-4">
            <div className="flex items-center gap-2 text-amber-core">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold font-mono">Delete All Telemetry Data</h3>
            </div>

            <p className="text-xs text-on-surface leading-relaxed">
              This will permanently delete all workouts, bodyweights, sleep logs, nutrition logs, focus sessions, and math results across all tables. Your account login will remain active.
            </p>

            <form onSubmit={handleDeleteData} className="space-y-3 pt-1">
              <div>
                <label className="text-[11px] font-mono text-text-muted uppercase">Enter Account Password</label>
                <input
                  type="password"
                  required
                  placeholder="Your password"
                  value={dataPassword}
                  onChange={(e) => setDataPassword(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-mono text-on-surface"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-text-muted uppercase">
                  Type <span className="text-amber-core font-bold">&ldquo;DELETE MY DATA&rdquo;</span> to confirm
                </label>
                <input
                  type="text"
                  required
                  placeholder="DELETE MY DATA"
                  value={dataPhrase}
                  onChange={(e) => setDataPhrase(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-mono text-on-surface"
                />
              </div>

              {deleteDataError && (
                <div className="p-2.5 bg-crimson-alert/10 border border-crimson-alert/20 rounded-xl text-xs font-mono text-crimson-alert">
                  {deleteDataError}
                </div>
              )}

              {deleteDataSuccess && (
                <div className="p-2.5 bg-emerald-success/10 border border-emerald-success/20 rounded-xl text-xs font-mono text-emerald-success">
                  Telemetry data deleted. Reloading...
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteDataModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl bg-surface-container-high border border-border-subtle text-xs font-mono text-on-surface cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deleteDataLoading}
                  className="px-4 py-2 rounded-xl bg-amber-core text-surface text-xs font-mono font-bold hover:bg-amber-core/90 cursor-pointer disabled:opacity-50"
                >
                  {deleteDataLoading ? "Wiping Data..." : "Confirm Data Wipe"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Account */}
      {isDeleteAccountModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container p-6 rounded-2xl border border-crimson-alert/40 max-w-md w-full space-y-4">
            <div className="flex items-center gap-2 text-crimson-alert">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold font-mono">Permanently Delete Account</h3>
            </div>

            <p className="text-xs text-on-surface leading-relaxed">
              This action is <strong>immediate and irreversible</strong>. Your account login, email registration, profile, and all telemetry data will be permanently wiped from the database.
            </p>

            <form onSubmit={handleDeleteAccount} className="space-y-3 pt-1">
              <div>
                <label className="text-[11px] font-mono text-text-muted uppercase">Enter Account Password</label>
                <input
                  type="password"
                  required
                  placeholder="Your password"
                  value={accountPassword}
                  onChange={(e) => setAccountPassword(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-mono text-on-surface"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-text-muted uppercase">
                  Type <span className="text-crimson-alert font-bold">&ldquo;DELETE MY ACCOUNT&rdquo;</span> to confirm
                </label>
                <input
                  type="text"
                  required
                  placeholder="DELETE MY ACCOUNT"
                  value={accountPhrase}
                  onChange={(e) => setAccountPhrase(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-mono text-on-surface"
                />
              </div>

              {deleteAccountError && (
                <div className="p-2.5 bg-crimson-alert/10 border border-crimson-alert/20 rounded-xl text-xs font-mono text-crimson-alert">
                  {deleteAccountError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteAccountModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl bg-surface-container-high border border-border-subtle text-xs font-mono text-on-surface cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deleteAccountLoading}
                  className="px-4 py-2 rounded-xl bg-crimson-alert text-white text-xs font-mono font-bold hover:bg-crimson-alert/90 cursor-pointer disabled:opacity-50"
                >
                  {deleteAccountLoading ? "Deleting Account..." : "Permanently Delete"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
