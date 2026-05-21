import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, useToast } from "../context/AppContext";
import { fetchMe, updateProfile, deleteAccount } from "../services/api";
import ConfirmDialog from "../components/ConfirmDialog";

const Card = ({ title, subtitle, accent, children }) => (
  <div style={{
    background: "var(--bg-card)", border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-sm)",
    overflow: "hidden", marginBottom: 18,
  }}>
    <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", borderLeft: `3px solid ${accent}` }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>{title}</div>
      {subtitle && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>{subtitle}</div>}
    </div>
    <div style={{ padding: 20 }}>{children}</div>
  </div>
);

export default function Settings() {
  const { user, login, logout, isAdmin } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [me, setMe] = useState(null);
  const [profile, setProfile] = useState({ name: "", username: "", email: "" });
  const [pwd, setPwd] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (user) setProfile({ name: user.name || "", username: user.username || "", email: user.email || "" });
    fetchMe().then((res) => setMe(res.data)).catch(() => {});
  }, [user]);

  const onSaveProfile = async (e) => {
    e.preventDefault();
    if (!profile.name.trim() || !profile.username.trim() || !profile.email.trim()) {
      return addToast("All profile fields are required.", "error");
    }
    setSavingProfile(true);
    try {
      const res = await updateProfile({ ...profile });
      login(res.data.user, res.data.token);
      addToast("Profile updated successfully.", "success");
    } catch (err) {
      addToast(err.response?.data?.error || "Failed to update profile.", "error");
    } finally {
      setSavingProfile(false);
    }
  };

  const onChangePassword = async (e) => {
    e.preventDefault();
    if (!pwd.currentPassword || !pwd.newPassword) return addToast("Enter your current and new password.", "error");
    if (pwd.newPassword.length < 6) return addToast("New password must be at least 6 characters.", "error");
    if (pwd.newPassword !== pwd.confirmPassword) return addToast("New passwords do not match.", "error");
    setSavingPwd(true);
    try {
      const res = await updateProfile({
        name: user.name, email: user.email, username: user.username,
        currentPassword: pwd.currentPassword, newPassword: pwd.newPassword,
      });
      login(res.data.user, res.data.token);
      setPwd({ currentPassword: "", newPassword: "", confirmPassword: "" });
      addToast("Password changed successfully.", "success");
    } catch (err) {
      addToast(err.response?.data?.error || "Failed to change password.", "error");
    } finally {
      setSavingPwd(false);
    }
  };

  const onDelete = async () => {
    setConfirm(false);
    setDeleting(true);
    try {
      await deleteAccount();
      addToast("Your account has been deleted.", "success");
      logout();
      navigate("/login");
    } catch (err) {
      addToast(err.response?.data?.error || "Failed to delete account.", "error");
      setDeleting(false);
    }
  };

  const memberSince = me?.created_at
    ? new Date(me.created_at).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })
    : "—";

  return (
    <div className="page-wrapper" style={{ maxWidth: 720 }}>
      {confirm && (
        <ConfirmDialog
          message="Delete your account permanently? This will remove your profile, bids, holdings, transactions, and watchlist. This cannot be undone."
          confirmLabel="Delete Account"
          danger
          onCancel={() => setConfirm(false)}
          onConfirm={onDelete}
        />
      )}

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 className="gradient-text" style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 4 }}>
          Account Settings
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Manage your profile, password, and account</p>
      </div>

      {/* Overview */}
      <Card title="Account Overview" accent="var(--accent)">
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14, flexShrink: 0,
            background: isAdmin ? "var(--grad-sunset)" : "var(--grad-accent)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, fontWeight: 800, color: "#fff",
          }}>
            {user?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>{user?.name}</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>@{user?.username}</div>
          </div>
          <div style={{ display: "flex", gap: 22 }}>
            <div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Role</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: isAdmin ? "var(--yellow)" : "var(--accent)" }}>{(user?.role || "").toUpperCase()}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Balance</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--green)", fontFamily: "var(--font-mono)" }}>
                {me ? `₹${me.balance.toLocaleString("en-IN")}` : "—"}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Member Since</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)" }}>{memberSince}</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Profile */}
      <Card title="Profile Information" subtitle="Update your name, username, and email" accent="var(--purple)">
        <form onSubmit={onSaveProfile}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div className="form-field">
              <label className="form-label">Full Name</label>
              <input className="input-field" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} placeholder="Full name" />
            </div>
            <div className="form-field">
              <label className="form-label">Username</label>
              <input className="input-field" value={profile.username} onChange={(e) => setProfile({ ...profile, username: e.target.value })} placeholder="username" autoComplete="username" />
            </div>
          </div>
          <div className="form-field">
            <label className="form-label">Email Address</label>
            <input className="input-field" type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} placeholder="you@example.com" autoComplete="email" />
          </div>
          <button type="submit" className="btn-primary" disabled={savingProfile} style={{ marginTop: 4 }}>
            {savingProfile ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </Card>

      {/* Password */}
      <Card title="Change Password" subtitle="Choose a strong password you don't use elsewhere" accent="var(--cyan)">
        <form onSubmit={onChangePassword}>
          <div className="form-field">
            <label className="form-label">Current Password</label>
            <input className="input-field" type="password" value={pwd.currentPassword} onChange={(e) => setPwd({ ...pwd, currentPassword: e.target.value })} placeholder="••••••••" autoComplete="current-password" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div className="form-field">
              <label className="form-label">New Password</label>
              <input className="input-field" type="password" value={pwd.newPassword} onChange={(e) => setPwd({ ...pwd, newPassword: e.target.value })} placeholder="At least 6 characters" autoComplete="new-password" />
            </div>
            <div className="form-field">
              <label className="form-label">Confirm New Password</label>
              <input className="input-field" type="password" value={pwd.confirmPassword} onChange={(e) => setPwd({ ...pwd, confirmPassword: e.target.value })} placeholder="••••••••" autoComplete="new-password" />
            </div>
          </div>
          <button type="submit" className="btn-primary" disabled={savingPwd} style={{ marginTop: 4 }}>
            {savingPwd ? "Updating..." : "Update Password"}
          </button>
        </form>
      </Card>

      {/* Danger zone */}
      <div style={{
        background: "var(--bg-card)", border: "1px solid rgba(220,38,38,0.3)",
        borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-sm)", overflow: "hidden",
      }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(220,38,38,0.2)", borderLeft: "3px solid var(--red)" }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "var(--red)", letterSpacing: "-0.01em" }}>Danger Zone</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>Permanently delete your account and all associated data</div>
        </div>
        <div style={{ padding: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", maxWidth: 420 }}>
            Once deleted, your profile, bids, holdings, transactions, and watchlist are removed and cannot be recovered.
          </div>
          <button className="btn-danger" onClick={() => setConfirm(true)} disabled={deleting}>
            {deleting ? "Deleting..." : "Delete Account"}
          </button>
        </div>
      </div>
    </div>
  );
}
