import { Link } from "wouter";
import { ArrowRight, Brain, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* Left Panel - Brand */}
      <div className="lg:w-1/2 p-8 lg:p-12 flex flex-col justify-between relative overflow-hidden bg-slate-900 text-white">
        {/* Background Gradients */}
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
          © 2024 PulseSync AI Inc. All rights reserved.
        </div>
      </div>

      {/* Right Panel - Login */}
      <div className="lg:w-1/2 flex items-center justify-center p-8 lg:p-12 bg-background">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center lg:text-left space-y-2">
            <h2 className="text-3xl font-bold font-display text-foreground">Welcome Back</h2>
            <p className="text-muted-foreground">Sign in to access your dashboard</p>
          </div>

          <div className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
              <Button 
                asChild
                className="w-full h-12 text-base font-medium shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
              >
                <a href="/api/login">
                  Login with Replit Auth
                  <ArrowRight className="w-4 h-4 ml-2" />
                </a>
              </Button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Secure Access</span>
                </div>
              </div>

              <div className="text-center text-xs text-muted-foreground">
                By clicking continue, you agree to our <a href="#" className="underline hover:text-foreground">Terms of Service</a> and <a href="#" className="underline hover:text-foreground">Privacy Policy</a>.
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-lg p-4 flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
              <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                <span className="font-semibold block mb-1">New Update v2.4</span>
                Enhanced burnout detection algorithms are now live. Managers can view real-time risk assessments on the Team Radar dashboard.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
