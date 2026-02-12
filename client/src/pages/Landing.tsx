import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { ArrowRight, Brain, ShieldCheck, Zap, Mail, Lock, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export default function Landing() {
  const { login, signup, isLoggingIn, isSigningUp, loginError, signupError, signupSuccess } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "login") {
      login({ email, password });
    } else {
      signup({ email, password, firstName, lastName });
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      <div className="lg:w-1/2 p-8 lg:p-12 flex flex-col justify-between relative overflow-hidden bg-slate-900 text-white">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/30 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-12">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center border border-white/20">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <span className="font-display font-bold text-2xl tracking-tight">
              Pulse<span className="text-indigo-400">Sync</span>
            </span>
          </div>

          <h1 className="font-display font-bold text-5xl lg:text-7xl leading-[1.1] mb-6">
            Performance <br/> 
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-white">
              Intelligence
            </span>
          </h1>
          <p className="text-lg text-slate-300 max-w-md font-light leading-relaxed">
            AI-driven insights for modern teams. Detect burnout, optimize workflows, and align goals with PulseSync's neural architecture.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-2 gap-8 mt-12 lg:mt-0">
          <div className="space-y-2">
            <ShieldCheck className="w-8 h-8 text-indigo-400 mb-2" />
            <h3 className="font-semibold text-white">Enterprise Secure</h3>
            <p className="text-sm text-slate-400">SOC2 compliant data handling with end-to-end encryption.</p>
          </div>
          <div className="space-y-2">
            <Zap className="w-8 h-8 text-indigo-400 mb-2" />
            <h3 className="font-semibold text-white">Real-time Sync</h3>
            <p className="text-sm text-slate-400">Instant updates across all devices and team members.</p>
          </div>
        </div>

        <div className="relative z-10 text-xs text-slate-500 mt-12">
          &copy; 2026 PulseSync AI Inc. All rights reserved.
        </div>
      </div>

      <div className="lg:w-1/2 flex items-center justify-center p-8 lg:p-12 bg-background">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center lg:text-left space-y-2">
            <h2 className="text-3xl font-bold font-display text-foreground" data-testid="text-auth-title">
              {mode === "login" ? "Welcome Back" : "Create Account"}
            </h2>
            <p className="text-muted-foreground">
              {mode === "login" ? "Sign in to access your dashboard" : "Request access to PulseSync"}
            </p>
          </div>

          <Card className="border-border/50 shadow-sm">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "signup" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="firstName"
                          data-testid="input-first-name"
                          placeholder="Jane"
                          value={firstName}
                          onChange={e => setFirstName(e.target.value)}
                          className="pl-9"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        data-testid="input-last-name"
                        placeholder="Doe"
                        value={lastName}
                        onChange={e => setLastName(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      data-testid="input-email"
                      type="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      data-testid="input-password"
                      type="password"
                      placeholder="Min 6 characters"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="pl-9"
                      minLength={6}
                      required
                    />
                  </div>
                </div>

                {loginError && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 text-sm text-destructive" data-testid="text-login-error">
                    {loginError.message}
                  </div>
                )}

                {signupError && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 text-sm text-destructive" data-testid="text-signup-error">
                    {signupError.message}
                  </div>
                )}

                {signupSuccess && (
                  <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-md p-3 text-sm text-green-700 dark:text-green-300" data-testid="text-signup-success">
                    Account created successfully. An admin will review and approve your access.
                  </div>
                )}

                <Button
                  type="submit"
                  data-testid="button-auth-submit"
                  className="w-full h-12 text-base font-medium shadow-lg shadow-primary/20"
                  disabled={isLoggingIn || isSigningUp}
                >
                  {(isLoggingIn || isSigningUp) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {mode === "login" ? "Sign In" : "Request Access"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">or</span>
                </div>
              </div>

              <Button
                variant="outline"
                data-testid="button-toggle-auth-mode"
                className="w-full"
                onClick={() => {
                  setMode(mode === "login" ? "signup" : "login");
                  setEmail("");
                  setPassword("");
                  setFirstName("");
                  setLastName("");
                }}
              >
                {mode === "login" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </Button>

              <div className="text-center text-xs text-muted-foreground mt-4">
                By continuing, you agree to our <a href="#" className="underline hover:text-foreground">Terms of Service</a> and <a href="#" className="underline hover:text-foreground">Privacy Policy</a>.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
