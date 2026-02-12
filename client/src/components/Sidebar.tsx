import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { 
  LayoutDashboard, 
  Users, 
  LineChart, 
  ListTodo, 
  LogOut, 
  BrainCircuit,
  Settings,
  ChevronRight
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  
  // Extend user type locally since we don't have the full User schema with role yet in auth types
  // In a real app, ensure User type in auth hooks includes role.
  const userRole = (user as any)?.role || "EMPLOYEE"; 

  const navItems = [
    {
      label: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
      roles: ["EMPLOYEE", "MANAGER", "SENIOR_MGMT"],
    },
    {
      label: "My Feedback",
      href: "/my-feedback",
      icon: ListTodo,
      roles: ["EMPLOYEE"],
    },
    {
      label: "Team Radar",
      href: "/team-radar",
      icon: Users,
      roles: ["MANAGER", "SENIOR_MGMT"],
    },
    {
      label: "Executive Hub",
      href: "/executive",
      icon: BrainCircuit,
      roles: ["SENIOR_MGMT"],
    },
    {
      label: "Analytics",
      href: "/analytics",
      icon: LineChart,
      roles: ["MANAGER", "SENIOR_MGMT"],
    },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-card border-r border-border shadow-sm flex flex-col z-20">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold font-display text-lg shadow-lg shadow-primary/30">
            P
          </div>
          <span className="font-display font-bold text-xl tracking-tight text-foreground">
            Pulse<span className="text-primary">Sync</span>
          </span>
        </div>

        <nav className="space-y-1">
          {navItems
            .filter(item => item.roles.includes(userRole))
            .map((item) => {
              const isActive = location === item.href;
              const Icon = item.icon;
              
              return (
                <Link key={item.href} href={item.href}>
                  <div className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group cursor-pointer",
                    isActive 
                      ? "bg-primary/10 text-primary shadow-sm" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}>
                    <Icon className={cn("w-4 h-4 transition-colors", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                    {item.label}
                    {isActive && <ChevronRight className="w-3 h-3 ml-auto text-primary" />}
                  </div>
                </Link>
              );
            })}
        </nav>
      </div>

      <div className="mt-auto p-4 space-y-4">
        <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="h-9 w-9 border border-border shadow-sm">
              <AvatarImage src={(user as any)?.profileImageUrl} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-foreground">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-muted-foreground truncate font-mono">
                {userRole.replace("_", " ")}
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8"
            onClick={() => logout()}
          >
            <LogOut className="w-3.5 h-3.5 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </aside>
  );
}
