import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";
import Landing from "@/pages/Landing";
import { Login, Register } from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import FoodLog from "@/pages/FoodLog";
import ProgressPage from "@/pages/Progress";
import Workouts from "@/pages/Workouts";
import Profile from "@/pages/Profile";
import { AppShell } from "@/components/AppShell";

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm uppercase tracking-widest">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <AppShell>{children}</AppShell>;
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/app" replace />;
  return children;
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster
            position="top-right"
            theme="dark"
            toastOptions={{
              style: { background: "#0A0A0A", border: "1px solid #CCFF00", borderRadius: 0, color: "#fff", fontFamily: "Manrope" },
            }}
          />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
            <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
            <Route path="/app" element={<Protected><Dashboard /></Protected>} />
            <Route path="/app/food" element={<Protected><FoodLog /></Protected>} />
            <Route path="/app/progress" element={<Protected><ProgressPage /></Protected>} />
            <Route path="/app/workouts" element={<Protected><Workouts /></Protected>} />
            <Route path="/app/profile" element={<Protected><Profile /></Protected>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
