import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import ManagerDashboard from "@/pages/ManagerDashboard";
import ExecutiveDashboard from "@/pages/ExecutiveDashboard";
import EmployeeFeedback from "@/pages/EmployeeFeedback";
import AdminPanel from "@/pages/AdminPanel";
import ReviewFeedback from "@/pages/ReviewFeedback";
import EmployeeProgress from "@/pages/EmployeeProgress";
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
      <Route path="/submit-feedback">
         <AuthenticatedLayout><EmployeeFeedback /></AuthenticatedLayout>
      </Route>
      <Route path="/team-radar">
         <AuthenticatedLayout><ManagerDashboard /></AuthenticatedLayout>
      </Route>
      <Route path="/executive">
         <AuthenticatedLayout><ExecutiveDashboard /></AuthenticatedLayout>
      </Route>
      <Route path="/admin">
         <AuthenticatedLayout><AdminPanel /></AuthenticatedLayout>
      </Route>
      <Route path="/review/:feedbackId">
         <AuthenticatedLayout><ReviewFeedback /></AuthenticatedLayout>
      </Route>
      <Route path="/employee-progress/:userId">
         <AuthenticatedLayout><EmployeeProgress /></AuthenticatedLayout>
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
