import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api, formatErr } from "../lib/api";
import { useAuth } from "../lib/auth";

export default function AuthCallback() {
  const nav = useNavigate();
  const { refresh } = useAuth();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const hash = window.location.hash || "";
    const m = hash.match(/session_id=([^&]+)/);
    if (!m) { nav("/", { replace: true }); return; }
    const session_id = m[1];
    (async () => {
      try {
        await api.post("/auth/emergent-session", { session_id });
        await refresh();
        toast.success("Signed in with Google");
      } catch (err) {
        toast.error(formatErr(err));
      } finally {
        // Strip hash, go home
        window.history.replaceState(null, "", window.location.pathname);
        nav("/", { replace: true });
      }
    })();
     
  }, []); // eslint-disable-line

  return (
    <div className="min-h-[50vh] flex items-center justify-center text-ink-500">Signing you in…</div>
  );
}
