import { useAuth } from "@/hooks/use-auth";
import EmployeeDashboard from "./EmployeeDashboard";
import ManagerOverview from "./ManagerOverview";
import SeniorMgmtOverview from "./SeniorMgmtOverview";
import Landing from "./Landing";
import { Sidebar } from "@/components/Sidebar";
import { Loader2 } from "lucide-react";
import { Redirect } from "wouter";

function AuthenticatedHome() {
  const { user } = useAuth();
  const role = user?.role || "EMPLOYEE";

  if (user?.isAdmin) {
    return <Redirect to="/admin" />;
  }

  const DashboardComponent = {
    "EMPLOYEE": EmployeeDashboard,
    "MANAGER": ManagerOverview,
    "SENIOR_MGMT": SeniorMgmtOverview
  }[role as string] || EmployeeDashboard;

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 lg:p-12 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
           <DashboardComponent />
        </div>
      </main>
    </div>
  );
}

export default function Home() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Landing />;
  }

  return <AuthenticatedHome />;
}
