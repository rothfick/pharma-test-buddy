import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LayoutDashboard, ListTodo, FileText, FlaskConical, LogOut, User as UserIcon, Beaker, Sparkles, ShieldCheck, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, testid: "nav-dashboard" },
  { to: "/tasks", label: "Tasks", icon: ListTodo, testid: "nav-tasks" },
  { to: "/wizard", label: "New Task Wizard", icon: FileText, testid: "nav-wizard" },
  { to: "/playground", label: "QA Playground", icon: FlaskConical, testid: "nav-playground" },
  { to: "/ai", label: "AI Lab", icon: Sparkles, testid: "nav-ai" },
  { to: "/compliance", label: "Compliance (GxP)", icon: ShieldCheck, testid: "nav-compliance" },
  { to: "/quality-metrics", label: "Quality Metrics", icon: BarChart3, testid: "nav-quality" },
];

export function AppLayout() {
  const { user, roles, signOut } = useAuth();
  const navigate = useNavigate();

  const initials = (user?.email ?? "U").slice(0, 2).toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur" data-testid="app-header">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2 font-semibold" data-testid="logo">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-primary to-accent text-primary-foreground">
                <Beaker className="h-4 w-4" />
              </div>
              <span>QA Playground</span>
            </Link>
            <nav className="hidden gap-1 md:flex">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  data-testid={item.testid}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-secondary text-secondary-foreground"
                        : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                    )
                  }
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {roles.includes("admin") && (
              <Badge variant="secondary" data-testid="role-badge">admin</Badge>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full" data-testid="user-menu-trigger">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" data-testid="user-menu">
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                  {user?.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/profile")} data-testid="menu-profile">
                  <UserIcon className="mr-2 h-4 w-4" /> Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut} data-testid="menu-signout">
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      <main className="container py-8" data-testid="main-content">
        <Outlet />
      </main>
    </div>
  );
}
