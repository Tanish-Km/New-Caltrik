import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, UtensilsCrossed, LineChart, Dumbbell, User, Sun, Moon, LogOut, Zap } from "lucide-react";
import { useAuth } from "../lib/auth";
import { useTheme } from "../lib/theme";

const navItems = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true, testid: "nav-dashboard" },
  { to: "/app/food", label: "Food Log", icon: UtensilsCrossed, testid: "nav-food" },
  { to: "/app/progress", label: "Progress", icon: LineChart, testid: "nav-progress" },
  { to: "/app/workouts", label: "Workouts", icon: Dumbbell, testid: "nav-workouts" },
  { to: "/app/profile", label: "Profile", icon: User, testid: "nav-profile" },
];

export const AppShell = ({ children }) => {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Sidebar */}
      <aside className="hidden md:flex w-60 flex-col border-r border-border bg-card sticky top-0 h-screen">
        <div className="p-6 border-b border-border flex items-center gap-2">
          <div className="w-8 h-8 bg-[#CCFF00] flex items-center justify-center">
            <Zap className="w-5 h-5 text-black" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-display text-2xl leading-none">CAL<span className="text-[#CCFF00]">.</span>TRK</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Performance OS</div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ to, label, icon: Icon, end, testid }) => (
            <NavLink
              key={to} to={to} end={end} data-testid={testid}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 text-sm font-heading uppercase tracking-wider transition-all border-l-2 ${
                  isActive
                    ? "bg-[#CCFF00]/10 border-[#CCFF00] text-[#CCFF00]"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted"
                }`
              }
            >
              <Icon className="w-4 h-4" strokeWidth={1.75} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-border space-y-2">
          <div className="px-3 py-2 text-xs">
            <div className="text-muted-foreground uppercase tracking-widest">Operator</div>
            <div className="text-foreground font-semibold truncate">{user?.name}</div>
          </div>
          <button
            data-testid="theme-toggle"
            onClick={toggle}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs uppercase tracking-widest font-bold border border-border hover:border-[#CCFF00] hover:text-[#CCFF00] transition-colors"
          >
            {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            {theme === "dark" ? "Light" : "Dark"} Mode
          </button>
          <button
            data-testid="logout-btn"
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs uppercase tracking-widest font-bold border border-border hover:border-destructive hover:text-destructive transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-card border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="font-display text-xl">CAL<span className="text-[#CCFF00]">.</span>TRK</div>
          <div className="flex gap-2">
            <button onClick={toggle} data-testid="theme-toggle-mobile" className="p-2 border border-border">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button onClick={handleLogout} data-testid="logout-btn-mobile" className="p-2 border border-border">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
        <nav className="flex overflow-x-auto border-t border-border">
          {navItems.map(({ to, label, icon: Icon, end, testid }) => (
            <NavLink
              key={to} to={to} end={end} data-testid={`${testid}-mobile`}
              className={({ isActive }) =>
                `flex-1 min-w-[25%] flex flex-col items-center gap-0.5 px-2 py-2 text-[10px] font-heading uppercase tracking-wider ${
                  isActive ? "text-[#CCFF00]" : "text-muted-foreground"
                }`
              }
            >
              <Icon className="w-4 h-4" strokeWidth={1.75} />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      <main className="flex-1 min-w-0 pt-28 md:pt-0">
        {children}
      </main>
    </div>
  );
};
