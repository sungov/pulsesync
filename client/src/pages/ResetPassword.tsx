import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowRight, Lock, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import tsworksLogo from "@assets/tsworks_logo_transparent.png";

export default function ResetPassword() {
  const [, navigate] = useLocation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);

  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") || "";

  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      return;
    }
    fetch(`/api/auth/validate-reset-token?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(data => setTokenValid(data.valid))
      .catch(() => setTokenValid(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Something went wrong");
      }
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ background: "#0a1628" }}>
      <div className="max-w-md w-full space-y-8">
        <div className="flex justify-center">
          <img src={tsworksLogo} alt="tsworks" className="h-10 w-auto brightness-0 invert" data-testid="img-reset-logo" />
        </div>

        <div className="rounded-lg p-6" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
          {tokenValid === null ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-white/50" />
            </div>
          ) : tokenValid === false ? (
            <div className="space-y-4 text-center">
              <div className="flex items-center justify-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-red-500/15">
                  <XCircle className="w-6 h-6 text-red-400" />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-white font-medium">Invalid or Expired Link</p>
                <p className="text-sm" style={{ color: "#7a8fa6" }}>
                  This password reset link is invalid or has expired. Please request a new one.
                </p>
              </div>
              <Button
                data-testid="button-back-to-login-expired"
                className="w-full border-white/15 text-white/70 bg-transparent"
                variant="outline"
                onClick={() => navigate("/")}
              >
                Back to Sign In
              </Button>
            </div>
          ) : success ? (
            <div className="space-y-4 text-center">
              <div className="flex items-center justify-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "rgba(45, 127, 249, 0.15)" }}>
                  <CheckCircle2 className="w-6 h-6" style={{ color: "#2d7ff9" }} />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-white font-medium">Password Reset Successful</p>
                <p className="text-sm" style={{ color: "#7a8fa6" }}>
                  Your password has been updated. You can now sign in with your new password.
                </p>
              </div>
              <Button
                data-testid="button-go-to-login"
                className="w-full h-12 text-base font-medium text-white border-[#2d7ff9]"
                style={{ background: "#2d7ff9", boxShadow: "0 4px 14px rgba(45, 127, 249, 0.35)" }}
                onClick={() => navigate("/")}
              >
                Sign In
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          ) : (
            <>
              <div className="text-center mb-6 space-y-2">
                <h2 className="text-2xl font-bold font-display text-white" data-testid="text-reset-title">Set New Password</h2>
                <p className="text-sm" style={{ color: "#7a8fa6" }}>Enter your new password below</p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-white/80">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#5a6f87" }} />
                    <Input
                      id="new-password"
                      data-testid="input-new-password"
                      type="password"
                      placeholder="Min 6 characters"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-[#2d7ff9]"
                      minLength={6}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-white/80">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#5a6f87" }} />
                    <Input
                      id="confirm-password"
                      data-testid="input-confirm-password"
                      type="password"
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-[#2d7ff9]"
                      minLength={6}
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-md p-3 text-sm text-red-400" data-testid="text-reset-error">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  data-testid="button-reset-submit"
                  className="w-full h-12 text-base font-medium text-white border-[#2d7ff9]"
                  style={{ background: "#2d7ff9", boxShadow: "0 4px 14px rgba(45, 127, 249, 0.35)" }}
                  disabled={submitting}
                >
                  {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Reset Password
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
