import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";

import { AuthCard, SpamNotice } from "@/components/auth/auth-card";
import { GoogleSignInButton } from "@/components/auth/google-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  completeSignup,
  loginWithPassword,
  requestResetCode,
  requestSignupCode,
  resetPasswordWithCode,
} from "@/lib/merchant-email-auth.functions";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول · كيوباي" },
      { name: "description", content: "سجّل الدخول أو أنشئ حسابك في كيوباي بالبريد الإلكتروني." },
      { property: "og:title", content: "تسجيل الدخول · كيوباي" },
      { property: "og:description", content: "سجّل الدخول أو أنشئ حسابك في كيوباي." },
    ],
  }),
  component: LoginPage,
});

type Mode = "login" | "signup" | "reset";

function LoginPage() {
  const login = useServerFn(loginWithPassword);
  const sendSignup = useServerFn(requestSignupCode);
  const finishSignup = useServerFn(completeSignup);
  const sendReset = useServerFn(requestResetCode);
  const finishReset = useServerFn(resetPasswordWithCode);

  const [mode, setMode] = useState<Mode>("login");
  const [codeSent, setCodeSent] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  function switchMode(m: Mode) {
    setMode(m);
    setCodeSent(false);
    setCode("");
    setPassword("");
    setError(null);
    setInfo(null);
  }

  async function run(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ.");
    } finally {
      setBusy(false);
    }
  }

  function go(res: { ok: boolean; message: string; nextRoute?: string }) {
    if (!res.ok) return setError(res.message);
    window.location.replace(res.nextRoute ?? "/welcome");
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    run(async () => {
      if (mode === "login") {
        go(await login({ data: { email, password } }));
      } else if (!codeSent) {
        const r = mode === "signup"
          ? await sendSignup({ data: { email } })
          : await sendReset({ data: { email } });
        if (!r.ok) return setError(r.message);
        setInfo(r.message);
        setCodeSent(true);
      } else {
        const payload = { data: { email, code, password } };
        go(mode === "signup" ? await finishSignup(payload) : await finishReset(payload));
      }
    });
  };

  const resend = () =>
    run(async () => {
      const r = mode === "signup"
        ? await sendSignup({ data: { email } })
        : await sendReset({ data: { email } });
      if (r.ok) setInfo(r.message);
      else setError(r.message);
    });

  const titles: Record<Mode, string> = {
    login: "تسجيل الدخول",
    signup: "إنشاء حساب جديد",
    reset: "استعادة كلمة المرور",
  };
  const submitLabel =
    mode === "login"
      ? "دخول"
      : !codeSent
        ? "إرسال رمز التحقق"
        : mode === "signup"
          ? "إنشاء الحساب"
          : "حفظ كلمة المرور الجديدة";

  return (
    <AuthCard
      title={titles[mode]}
      subtitle={codeSent ? `أدخل الرمز المرسل إلى ${email}` : "مرحبًا بك في كيوباي"}
    >
      <form onSubmit={onSubmit} className="space-y-4" dir="rtl">
        <div className="space-y-1.5">
          <Label htmlFor="email">البريد الإلكتروني</Label>
          <Input
            id="email"
            type="email"
            dir="ltr"
            autoComplete="email"
            required
            disabled={codeSent}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {codeSent ? (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="code">رمز التحقق</Label>
              <Input
                id="code"
                inputMode="numeric"
                dir="ltr"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <SpamNotice />
          </>
        ) : null}

        {mode === "login" || codeSent ? (
          <div className="space-y-1.5">
            <Label htmlFor="password">
              {mode === "login" ? "كلمة المرور" : "كلمة المرور الجديدة (8 أحرف على الأقل)"}
            </Label>
            <Input
              id="password"
              type="password"
              dir="ltr"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              minLength={mode === "login" ? 1 : 8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        ) : null}

        {info && !error ? <p className="text-sm text-muted-foreground">{info}</p> : null}
        {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}

        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? "جارٍ التنفيذ…" : submitLabel}
        </Button>

        {codeSent ? (
          <button type="button" onClick={resend} disabled={busy} className="w-full text-sm text-primary hover:underline">
            إعادة إرسال الرمز
          </button>
        ) : null}

        <div className="flex flex-wrap justify-between gap-2 text-sm">
          {mode !== "login" ? (
            <button type="button" className="text-primary hover:underline" onClick={() => switchMode("login")}>
              لديك حساب؟ سجّل الدخول
            </button>
          ) : (
            <>
              <button type="button" className="text-primary hover:underline" onClick={() => switchMode("signup")}>
                إنشاء حساب جديد
              </button>
              <button type="button" className="text-muted-foreground hover:underline" onClick={() => switchMode("reset")}>
                نسيت كلمة المرور؟
              </button>
            </>
          )}
        </div>
      </form>

      {mode === "login" ? (
        <div className="mt-6 space-y-3">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />أو<span className="h-px flex-1 bg-border" />
          </div>
          <GoogleSignInButton intent={{ kind: "merchant" }} onError={setError} />
        </div>
      ) : null}
    </AuthCard>
  );
}
