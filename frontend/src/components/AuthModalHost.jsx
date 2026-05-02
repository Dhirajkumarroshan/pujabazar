import React, { useEffect, useState } from "react";
import { X, Mail, Lock, User } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../lib/auth";

export default function AuthModalHost() {
  const { user, login, register, formatErr } = useAuth();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const h = () => setOpen(true);
    window.addEventListener("open-auth", h);
    return () => window.removeEventListener("open-auth", h);
  }, []);
  useEffect(() => { if (user) setOpen(false); }, [user]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") await login(form.email, form.password);
      else await register(form.name || form.email.split("@")[0], form.email, form.password);
      toast.success(mode === "login" ? "Welcome back" : "Account created");
    } catch (err) {
      toast.error(formatErr(err));
    } finally { setBusy(false); }
  };

  const googleSignIn = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  if (!open) return null;
  return (
    <div data-testid="auth-modal" className="fixed inset-0 z-[70] bg-ink-900/60 flex items-center justify-center px-4">
      <div className="relative w-full max-w-md bg-bone-50 rounded-2xl shadow-2xl p-8 fade-in">
        <button data-testid="auth-close" onClick={() => setOpen(false)} className="absolute top-4 right-4 p-2 hover:bg-bone-100 rounded-full">
          <X size={18} strokeWidth={1.5} />
        </button>
        <div className="text-[10px] tracking-[0.3em] uppercase text-terra-600">PujaBazar.in</div>
        <h2 className="font-serif text-3xl mt-1 mb-6">
          {mode === "login" ? "Sign in" : "Create account"}
        </h2>

        <button
          data-testid="google-signin-btn"
          onClick={googleSignIn}
          className="w-full py-3 rounded-full border border-ink-900 text-ink-900 hover:bg-ink-900 hover:text-bone-50 transition-colors text-sm font-medium mb-3"
        >
          Continue with Google
        </button>

        <div className="flex items-center gap-3 my-5 text-xs text-ink-500">
          <div className="h-px flex-1 bg-bone-300" /> OR <div className="h-px flex-1 bg-bone-300" />
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === "register" && (
            <label className="flex items-center gap-3 border-b border-bone-300 pb-2">
              <User size={16} strokeWidth={1.5} className="text-ink-500" />
              <input
                data-testid="auth-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Full name"
                className="flex-1 outline-none bg-transparent text-ink-900"
              />
            </label>
          )}
          <label className="flex items-center gap-3 border-b border-bone-300 pb-2">
            <Mail size={16} strokeWidth={1.5} className="text-ink-500" />
            <input
              data-testid="auth-email"
              type="email" required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Email"
              className="flex-1 outline-none bg-transparent text-ink-900"
            />
          </label>
          <label className="flex items-center gap-3 border-b border-bone-300 pb-2">
            <Lock size={16} strokeWidth={1.5} className="text-ink-500" />
            <input
              data-testid="auth-password"
              type="password" required minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Password (min 6 chars)"
              className="flex-1 outline-none bg-transparent text-ink-900"
            />
          </label>
          <button
            data-testid="auth-submit"
            disabled={busy}
            className="w-full py-3 rounded-full bg-terra-600 text-bone-50 hover:bg-terra-700 disabled:opacity-60 text-sm uppercase tracking-[0.25em] font-medium"
          >
            {busy ? "Please wait…" : (mode === "login" ? "Sign In" : "Create Account")}
          </button>
        </form>

        <div className="mt-5 text-sm text-ink-700 text-center">
          {mode === "login" ? (
            <>
              New here?{" "}
              <button data-testid="switch-to-register" onClick={() => setMode("register")} className="text-terra-600 underline">Create an account</button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button data-testid="switch-to-login" onClick={() => setMode("login")} className="text-terra-600 underline">Sign in</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
