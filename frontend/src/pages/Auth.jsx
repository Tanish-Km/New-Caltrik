import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Zap, ArrowRight } from "lucide-react";
import { useAuth } from "../lib/auth";

const HERO_BG = "https://static.prod-images.emergentagent.com/jobs/fe1df52b-6c01-40c5-89da-0f1b51b28d4f/images/d9541ce80f9f4b3a4a9b42f8de4b89bc774f665c8126e30c04e772d1c3160939.png";

export function Login() {
  const { login, formatApiError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email, password);
      toast.success("Welcome back, operator.");
      navigate("/app");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setBusy(false);
    }
  };
  return <AuthShell title="Access Terminal" sub="Login to your command center">
    <form onSubmit={submit} className="space-y-5" data-testid="login-form">
      <Field label="Email" value={email} onChange={setEmail} type="email" testid="login-email" />
      <Field label="Password" value={password} onChange={setPassword} type="password" testid="login-password" />
      <button disabled={busy} data-testid="login-submit" className="w-full bg-[#CCFF00] text-black py-3 text-sm uppercase tracking-widest font-bold hover:bg-[#B3E600] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
        {busy ? "Authenticating..." : "Enter"} <ArrowRight className="w-4 h-4" />
      </button>
      <div className="text-center text-xs uppercase tracking-widest text-muted-foreground">
        No account? <Link to="/register" data-testid="link-register" className="text-[#CCFF00]">Register</Link>
      </div>
    </form>
  </AuthShell>;
}

export function Register() {
  const { register, formatApiError } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await register(name, email, password);
      toast.success("Account deployed. Let's build your profile.");
      navigate("/app/profile");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setBusy(false);
    }
  };
  return <AuthShell title="New Operator" sub="Register to begin tracking">
    <form onSubmit={submit} className="space-y-5" data-testid="register-form">
      <Field label="Name" value={name} onChange={setName} testid="register-name" />
      <Field label="Email" value={email} onChange={setEmail} type="email" testid="register-email" />
      <Field label="Password (min 6)" value={password} onChange={setPassword} type="password" testid="register-password" />
      <button disabled={busy} data-testid="register-submit" className="w-full bg-[#CCFF00] text-black py-3 text-sm uppercase tracking-widest font-bold hover:bg-[#B3E600] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
        {busy ? "Deploying..." : "Create Account"} <ArrowRight className="w-4 h-4" />
      </button>
      <div className="text-center text-xs uppercase tracking-widest text-muted-foreground">
        Have an account? <Link to="/login" data-testid="link-login" className="text-[#CCFF00]">Login</Link>
      </div>
    </form>
  </AuthShell>;
}

const AuthShell = ({ title, sub, children }) => (
  <div className="min-h-screen grid md:grid-cols-2 bg-background text-foreground">
    <div className="relative hidden md:block">
      <img src={HERO_BG} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-br from-black/40 to-background" />
      <div className="relative p-12 h-full flex flex-col justify-between">
        <Link to="/" className="flex items-center gap-2" data-testid="auth-home">
          <div className="w-8 h-8 bg-[#CCFF00] flex items-center justify-center"><Zap className="w-5 h-5 text-black" strokeWidth={2.5}/></div>
          <div className="font-display text-2xl">CAL<span className="text-[#CCFF00]">.</span>TRK</div>
        </Link>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-[#CCFF00] mb-2">Elite Performance OS</div>
          <h2 className="font-display text-5xl leading-none">Every rep.<br/>Every gram.<br/>Tracked.</h2>
          <p className="text-sm text-muted-foreground mt-6 max-w-sm">Built for gym-focused operators who treat their body like a finely tuned machine.</p>
        </div>
      </div>
    </div>
    <div className="flex items-center justify-center p-6 md:p-12">
      <div className="w-full max-w-md">
        <div className="text-[10px] uppercase tracking-widest text-[#CCFF00] mb-2">/ Auth</div>
        <h1 className="font-display text-5xl mb-2">{title}</h1>
        <p className="text-sm text-muted-foreground mb-10">{sub}</p>
        {children}
      </div>
    </div>
  </div>
);

const Field = ({ label, value, onChange, type = "text", testid }) => (
  <label className="block">
    <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground block mb-2 font-heading">{label}</span>
    <input
      data-testid={testid}
      type={type} value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full bg-background border border-border px-4 py-3 text-sm focus:outline-none focus:border-[#CCFF00] focus:ring-1 focus:ring-[#CCFF00] transition-colors"
      required
    />
  </label>
);
