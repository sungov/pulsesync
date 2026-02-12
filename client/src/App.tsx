import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";

// Import dashboards directly for direct routing if needed
import ManagerDashboard from "@/pages/ManagerDashboard";
import ExecutiveDashboard from "@/pages/ExecutiveDashboard";
import EmployeeDashboard from "@/pages/EmployeeDashboard";

// Layout wrapper for authenticated routes (if separate layout needed)
import { Sidebar } from "@/components/Sidebar";

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 lg:p-12 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
           {children}
        </div>
      </main>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      
      {/* Explicit routes for direct navigation via Sidebar */}
      <Route path="/my-feedback">
         <AuthenticatedLayout><EmployeeDashboard /></AuthenticatedLayout>
      </Route>
      <Route path="/team-radar">
         <AuthenticatedLayout><ManagerDashboard /></AuthenticatedLayout>
      </Route>
      <Route path="/executive">
         <AuthenticatedLayout><ExecutiveDashboard /></AuthenticatedLayout>
      </Route>
      <Route path="/analytics">
         <AuthenticatedLayout><ExecutiveDashboard /></AuthenticatedLayout>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
