import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { useAuth } from "../auth";
import { Logo } from "@/components/brand/Logo";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { errorMessage } from "@/lib/api";
import { useSeo } from "@/lib/useSeo";

export default function Login() {
  useSeo({ title: "Staff login", noindex: true });
  const { login, user, ready } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (ready && user) return <Navigate to={(loc.state as { from?: string } | null)?.from ?? "/admin"} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await login(email, password);
      nav((loc.state as { from?: string } | null)?.from ?? "/admin", { replace: true });
    } catch (ex) {
      setErr(errorMessage(ex));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-paper md:grid-cols-12">
      <div className="hidden bg-brand p-10 text-paper md:col-span-5 md:flex md:flex-col md:justify-between">
        <Logo sub="Admin" />
        <div>
          <p className="eyebrow">Staff only</p>
          <p className="font-display text-6xl leading-none uppercase">
            Keys,
            <br />
            calendars,
            <br />
            shillings.
          </p>
        </div>
        <p className="text-xs text-paper/60">Sessions expire after 8 hours. Ten wrong attempts lock the door for fifteen minutes.</p>
      </div>
      <main className="flex items-center justify-center p-6 md:col-span-7">
        <form onSubmit={submit} className="w-full max-w-sm space-y-4 border-2 border-brand bg-white p-6 shadow-hard" aria-label="Staff login">
          <div className="md:hidden">
            <Logo onDark={false} sub="Admin" />
          </div>
          <h1 className="text-3xl">Log in</h1>
          <Input label="Email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label="Password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          {err && (
            <p role="alert" className="text-sm font-bold text-danger">
              {err}
            </p>
          )}
          <Button type="submit" loading={busy} className="w-full">
            Log in
          </Button>
        </form>
      </main>
    </div>
  );
}
