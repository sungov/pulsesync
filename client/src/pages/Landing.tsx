import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { ArrowRight, ArrowLeft, ShieldCheck, Zap, BarChart3, Mail, Lock, User, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import tsworksLogo from "@assets/tsworks_logo_transparent.png";

type AuthMode = "login" | "signup" | "forgot";

export default function Landing() {
  const { login, signup, isLoggingIn, isSigningUp, loginError, signupError, signupSuccess } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotError, setForgotError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "login") {
      login({ email, password });
    } else if (mode === "signup") {
      signup({ email, password, firstName, lastName });
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotSubmitting(true);
    setForgotError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Something went wrong");
      }
      setForgotSuccess(true);
    } catch (err: any) {
      setForgotError(err.message);
    } finally {
      setForgotSubmitting(false);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setEmail("");
    setPassword("");
    setFirstName("");
    setLastName("");
    setForgotSuccess(false);
    setForgotError("");
  };

  const inputClass = "pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-[#2d7ff9]";

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div
        className="lg:w-1/2 p-8 lg:p-12 flex flex-col justify-between relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #f0f4fa 0%, #dce6f5 40%, #c5d8f0 100%)" }}
      >
        <div
          className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"
          style={{ background: "rgba(45, 127, 249, 0.15)" }}
        />
        <div
          className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4"
          style={{ background: "rgba(10, 22, 40, 0.08)" }}
        />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <img src={tsworksLogo} alt="tsworks" className="h-12 w-auto" data-testid="img-landing-logo" />
          </div>

          <h1 className="font-display font-bold text-5xl lg:text-7xl leading-[1.1] mb-6" style={{ color: "#0a1628" }}>
            Performance <br />
            <span
              className="text-transparent bg-clip-text"
              style={{ backgroundImage: "linear-gradient(135deg, #2d7ff9, #0a1628)" }}
            >
              Intelligence
            </span>
          </h1>
          <p className="text-lg max-w-md font-light leading-relaxed" style={{ color: "#3d5068" }}>
            AI-driven insights for modern teams. Detect burnout, optimize workflows, and align goals with PulseSync AI by tsworks.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-6 mt-12 lg:mt-0">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(45, 127, 249, 0.12)" }}>
              <ShieldCheck className="w-5 h-5" style={{ color: "#2d7ff9" }} />
            </div>
            <h3 className="font-semibold text-sm" style={{ color: "#0a1628" }}>Role-Based Access</h3>
            <p className="text-xs" style={{ color: "#5a6f87" }}>Secure dashboards tailored for every role.</p>
          </div>
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(45, 127, 249, 0.12)" }}>
              <Zap className="w-5 h-5" style={{ color: "#2d7ff9" }} />
            </div>
            <h3 className="font-semibold text-sm" style={{ color: "#0a1628" }}>Real-time Sync</h3>
            <p className="text-xs" style={{ color: "#5a6f87" }}>Instant updates across all devices and teams.</p>
          </div>
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(45, 127, 249, 0.12)" }}>
              <BarChart3 className="w-5 h-5" style={{ color: "#2d7ff9" }} />
            </div>
            <h3 className="font-semibold text-sm" style={{ color: "#0a1628" }}>AI Analytics</h3>
            <p className="text-xs" style={{ color: "#5a6f87" }}>Sentiment analysis and burnout detection.</p>
          </div>
        </div>

        <div className="relative z-10 text-xs mt-12" style={{ color: "#8197ad" }}>
          &copy; 2026 tsworks. All rights reserved.
        </div>
      </div>

      <div
        className="lg:w-1/2 flex items-center justify-center p-8 lg:p-12"
        style={{ background: "#0a1628" }}
      >
        <div className="max-w-md w-full space-y-8">
          <div className="text-center lg:text-left space-y-2">
            <h2 className="text-3xl font-bold font-display text-white" data-testid="text-auth-title">
              {mode === "login" ? "Welcome Back" : mode === "signup" ? "Create Account" : "Reset Password"}
            </h2>
            <p style={{ color: "#7a8fa6" }}>
              {mode === "login"
                ? "Sign in to access your dashboard"
                : mode === "signup"
                ? "Request access to PulseSync"
                : "Enter your email to request a password reset"}
            </p>
          </div>

          <div className="rounded-lg p-6" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
            {mode === "forgot" ? (
              forgotSuccess ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "rgba(45, 127, 249, 0.15)" }}>
                      <CheckCircle2 className="w-6 h-6" style={{ color: "#2d7ff9" }} />
                    </div>
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-white font-medium">Reset request submitted</p>
                    <p className="text-sm" style={{ color: "#7a8fa6" }}>
                      If an account exists with that email, a password reset has been initiated. Please contact your administrator for the reset link.
                    </p>
                  </div>
                  <Button
                    data-testid="button-back-to-login"
                    className="w-full border-white/15 text-white/70 bg-transparent"
                    variant="outline"
                    onClick={() => switchMode("login")}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Sign In
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email" className="text-white/80">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#5a6f87" }} />
                      <Input
                        id="forgot-email"
                        data-testid="input-forgot-email"
                        type="email"
                        placeholder="you@company.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className={inputClass}
                        required
                      />
                    </div>
                  </div>

                  {forgotError && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-md p-3 text-sm text-red-400" data-testid="text-forgot-error">
                      {forgotError}
                    </div>
                  )}

                  <Button
                    type="submit"
                    data-testid="button-forgot-submit"
                    className="w-full h-12 text-base font-medium text-white border-[#2d7ff9]"
                    style={{ background: "#2d7ff9", boxShadow: "0 4px 14px rgba(45, 127, 249, 0.35)" }}
                    disabled={forgotSubmitting}
                  >
                    {forgotSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Send Reset Request
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    data-testid="button-back-to-login-form"
                    className="w-full border-white/15 text-white/70 bg-transparent"
                    onClick={() => switchMode("login")}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Sign In
                  </Button>
                </form>
              )
            ) : (
              <>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {mode === "signup" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName" className="text-white/80">First Name</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#5a6f87" }} />
                          <Input
                            id="firstName"
                            data-testid="input-first-name"
                            placeholder="Jane"
                            value={firstName}
                            onChange={e => setFirstName(e.target.value)}
                            className={`${inputClass}`}
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName" className="text-white/80">Last Name</Label>
                        <Input
                          id="lastName"
                          data-testid="input-last-name"
                          placeholder="Doe"
                          value={lastName}
                          onChange={e => setLastName(e.target.value)}
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-[#2d7ff9]"
                          required
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-white/80">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#5a6f87" }} />
                      <Input
                        id="email"
                        data-testid="input-email"
                        type="email"
                        placeholder="you@company.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className={inputClass}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <Label htmlFor="password" className="text-white/80">Password</Label>
                      {mode === "login" && (
                        <button
                          type="button"
                          data-testid="button-forgot-password"
                          className="text-xs hover:underline"
                          style={{ color: "#2d7ff9" }}
                          onClick={() => switchMode("forgot")}
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#5a6f87" }} />
                      <Input
                        id="password"
                        data-testid="input-password"
                        type="password"
                        placeholder="Min 6 characters"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className={inputClass}
                        minLength={6}
                        required
                      />
                    </div>
                  </div>

                  {loginError && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-md p-3 text-sm text-red-400" data-testid="text-login-error">
                      {loginError.message}
                    </div>
                  )}

                  {signupError && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-md p-3 text-sm text-red-400" data-testid="text-signup-error">
                      {signupError.message}
                    </div>
                  )}

                  {signupSuccess && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-md p-3 text-sm text-green-400" data-testid="text-signup-success">
                      Account created successfully. An admin will review and approve your access.
                    </div>
                  )}

                  <Button
                    type="submit"
                    data-testid="button-auth-submit"
                    className="w-full h-12 text-base font-medium text-white border-[#2d7ff9]"
                    style={{ background: "#2d7ff9", boxShadow: "0 4px 14px rgba(45, 127, 249, 0.35)" }}
                    disabled={isLoggingIn || isSigningUp}
                  >
                    {(isLoggingIn || isSigningUp) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {mode === "login" ? "Sign In" : "Request Access"}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </form>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="px-2" style={{ background: "rgba(255,255,255,0.05)", color: "#5a6f87" }}>or</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  data-testid="button-toggle-auth-mode"
                  className="w-full border-white/15 text-white/70 bg-transparent"
                  onClick={() => switchMode(mode === "login" ? "signup" : "login")}
                >
                  {mode === "login" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                </Button>

                <div className="text-center text-xs mt-4" style={{ color: "#5a6f87" }}>
                  By continuing, you agree to our <a href="#" className="underline hover:text-white/80">Terms of Service</a> and <a href="#" className="underline hover:text-white/80">Privacy Policy</a>.
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
