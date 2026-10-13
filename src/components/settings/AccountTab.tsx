"use client";

import React, { useState } from "react";
import { User, KeyRound, Mail, Smartphone, LogOut, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { clearPWACaches } from "@/components/pwa/PWAProvider";

interface AccountTabProps {
  userEmail: string | null;
  userId: string | null;
}

export function AccountTab({ userEmail, userId }: AccountTabProps) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [signingOutOthers, setSigningOutOthers] = useState(false);
  const [signOutOthersSuccess, setSignOutOthersSuccess] = useState(false);

  // Password update modal states
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Email update modal states
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailPassword, setEmailPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await clearPWACaches();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  };

  const handleSignOutOthers = async () => {
    setSigningOutOthers(true);
    setSignOutOthersSuccess(false);
    try {
      // In Supabase Auth, signOut with scope 'others' invalidates other sessions
      await supabase.auth.signOut({ scope: "others" });
      setSignOutOthersSuccess(true);
      setTimeout(() => setSignOutOthersSuccess(false), 4000);
    } catch (err: any) {
      alert(err.message || "Failed to sign out of other devices");
    } finally {
      setSigningOutOthers(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters long.");
      return;
    }

    setPasswordLoading(true);
    try {
      if (!userEmail) throw new Error("User email not found");

      // 1. Re-authenticate with current password
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: currentPassword,
      });

      if (signInErr) {
        throw new Error("Current password is incorrect.");
      }

      // 2. Update password
      const { error: updateErr } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateErr) throw updateErr;

      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setPasswordSuccess(false);
      }, 2000);
    } catch (err: any) {
      setPasswordError(err.message || "Failed to change password.");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    setEmailSuccess(false);

    if (!newEmail || !newEmail.includes("@")) {
      setEmailError("Please enter a valid email address.");
      return;
    }

    setEmailLoading(true);
    try {
      if (!userEmail) throw new Error("User email not found");

      // 1. Re-authenticate with current password
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: emailPassword,
      });

      if (signInErr) {
        throw new Error("Current password is incorrect.");
      }

      // 2. Request email update
      const { error: updateErr } = await supabase.auth.updateUser({
        email: newEmail,
      });

      if (updateErr) throw updateErr;

      setEmailSuccess(true);
      setEmailPassword("");
      setTimeout(() => {
        setIsEmailModalOpen(false);
        setEmailSuccess(false);
      }, 3000);
    } catch (err: any) {
      setEmailError(err.message || "Failed to change email.");
    } finally {
      setEmailLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Account Identity Card */}
      <div className="p-5 bg-surface-container rounded-2xl border border-border-subtle space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-border-subtle">
          <User className="w-4 h-4 text-primary-lime" />
          <h3 className="text-sm font-bold font-mono text-on-surface">Account Credentials</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3.5 bg-surface-container-low rounded-xl border border-border-subtle space-y-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
              Email Address
            </div>
            <div className="text-xs font-mono text-on-surface truncate">
              {userEmail || "Signed In"}
            </div>
          </div>

          <div className="p-3.5 bg-surface-container-low rounded-xl border border-border-subtle space-y-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
              Account ID (auth.uid)
            </div>
            <div className="text-xs font-mono text-primary-lime truncate">
              {userId || "None"}
            </div>
          </div>
        </div>

        {/* Security Actions */}
        <div className="pt-2 flex flex-wrap gap-3">
          <button
            onClick={() => setIsPasswordModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest border border-border-subtle text-xs font-mono text-on-surface transition-colors cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5 text-primary-lime" />
            <span>Change Password</span>
          </button>

          <button
            onClick={() => setIsEmailModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest border border-border-subtle text-xs font-mono text-on-surface transition-colors cursor-pointer"
          >
            <Mail className="w-3.5 h-3.5 text-tertiary-purple" />
            <span>Change Email</span>
          </button>

          <button
            onClick={handleSignOutOthers}
            disabled={signingOutOthers}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest border border-border-subtle text-xs font-mono text-on-surface transition-colors cursor-pointer disabled:opacity-50"
          >
            {signingOutOthers ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Smartphone className="w-3.5 h-3.5 text-amber-core" />
            )}
            <span>Sign Out Other Devices</span>
          </button>
        </div>

        {signOutOthersSuccess && (
          <div className="p-3 bg-emerald-success/10 border border-emerald-success/20 rounded-xl flex items-center gap-2 text-xs font-mono text-emerald-success">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>All other active device sessions have been revoked.</span>
          </div>
        )}
      </div>

      {/* Sign Out Card */}
      <div className="p-5 bg-surface-container rounded-2xl border border-border-subtle flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold font-mono text-on-surface">End Current Session</h4>
          <p className="text-[11px] text-text-muted mt-0.5">Clears local shell caches and signs out of this device.</p>
        </div>
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-crimson-alert/10 hover:bg-crimson-alert/20 border border-crimson-alert/30 text-crimson-alert text-xs font-mono font-semibold transition-colors cursor-pointer disabled:opacity-50"
        >
          {signingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
          <span>Sign Out</span>
        </button>
      </div>

      {/* Password Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container p-6 rounded-2xl border border-border-subtle max-w-md w-full space-y-4">
            <h3 className="text-sm font-bold font-mono text-on-surface">Change Password</h3>
            <p className="text-xs text-text-muted">Requires re-authentication with your existing password.</p>

            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label className="text-[11px] font-mono text-text-muted uppercase">Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-mono text-on-surface"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-text-muted uppercase">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-mono text-on-surface"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-text-muted uppercase">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-mono text-on-surface"
                />
              </div>

              {passwordError && (
                <div className="p-2.5 bg-crimson-alert/10 border border-crimson-alert/20 rounded-xl flex items-center gap-2 text-xs font-mono text-crimson-alert">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              {passwordSuccess && (
                <div className="p-2.5 bg-emerald-success/10 border border-emerald-success/20 rounded-xl flex items-center gap-2 text-xs font-mono text-emerald-success">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Password updated successfully!</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl bg-surface-container-high border border-border-subtle text-xs font-mono text-on-surface cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="px-4 py-2 rounded-xl bg-primary-lime text-surface text-xs font-mono font-bold hover:bg-primary-lime-dim cursor-pointer disabled:opacity-50"
                >
                  {passwordLoading ? "Verifying..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container p-6 rounded-2xl border border-border-subtle max-w-md w-full space-y-4">
            <h3 className="text-sm font-bold font-mono text-on-surface">Change Email</h3>
            <p className="text-xs text-text-muted">A confirmation link will be sent to both your old and new email addresses.</p>

            <form onSubmit={handleChangeEmail} className="space-y-3">
              <div>
                <label className="text-[11px] font-mono text-text-muted uppercase">Current Password</label>
                <input
                  type="password"
                  required
                  value={emailPassword}
                  onChange={(e) => setEmailPassword(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-mono text-on-surface"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-text-muted uppercase">New Email Address</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-surface-container-low border border-border-subtle rounded-xl text-xs font-mono text-on-surface"
                />
              </div>

              {emailError && (
                <div className="p-2.5 bg-crimson-alert/10 border border-crimson-alert/20 rounded-xl flex items-center gap-2 text-xs font-mono text-crimson-alert">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{emailError}</span>
                </div>
              )}

              {emailSuccess && (
                <div className="p-2.5 bg-emerald-success/10 border border-emerald-success/20 rounded-xl flex items-center gap-2 text-xs font-mono text-emerald-success">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Confirmation link sent to your new email.</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEmailModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl bg-surface-container-high border border-border-subtle text-xs font-mono text-on-surface cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={emailLoading}
                  className="px-4 py-2 rounded-xl bg-primary-lime text-surface text-xs font-mono font-bold hover:bg-primary-lime-dim cursor-pointer disabled:opacity-50"
                >
                  {emailLoading ? "Verifying..." : "Update Email"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
