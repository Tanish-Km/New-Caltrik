import { Link } from "react-router-dom";
import { ArrowRight, Flame, Activity, Dumbbell, BarChart3, Zap, Target } from "lucide-react";
import { useTheme } from "../lib/theme";

const HERO_BG = "https://static.prod-images.emergentagent.com/jobs/fe1df52b-6c01-40c5-89da-0f1b51b28d4f/images/d9541ce80f9f4b3a4a9b42f8de4b89bc774f665c8126e30c04e772d1c3160939.png";
const MEAL_IMG = "https://images.pexels.com/photos/1640775/pexels-photo-1640775.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";
const WORKOUT_IMG = "https://images.unsplash.com/photo-1766287453739-c3ffc3f37d05?crop=entropy&cs=srgb&fm=jpg&q=85";

export default function Landing() {
  const { theme, toggle } = useTheme();
  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-2xl bg-background/80 border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#CCFF00] flex items-center justify-center">
              <Zap className="w-5 h-5 text-black" strokeWidth={2.5} />
            </div>
            <div className="font-display text-2xl leading-none">CAL<span className="text-[#CCFF00]">.</span>TRK</div>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-xs uppercase tracking-widest font-bold">
            <a href="#features" className="hover:text-[#CCFF00] transition-colors">Systems</a>
            <a href="#calc" className="hover:text-[#CCFF00] transition-colors">Calculator</a>
            <a href="#stats" className="hover:text-[#CCFF00] transition-colors">Metrics</a>
          </nav>
          <div className="flex items-center gap-3">
            <button data-testid="theme-toggle-landing" onClick={toggle} className="text-xs uppercase tracking-widest font-bold text-muted-foreground hover:text-foreground">
              {theme === "dark" ? "Light" : "Dark"}
            </button>
            <Link to="/login" data-testid="nav-login" className="text-xs uppercase tracking-widest font-bold hover:text-[#CCFF00] transition-colors">Login</Link>
            <Link to="/register" data-testid="nav-register" className="bg-[#CCFF00] text-black px-4 py-2 text-xs uppercase tracking-widest font-bold hover:bg-[#B3E600] active:scale-95 transition-all">
              Start
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-32 pb-24 px-6">
        <div className="absolute inset-0 opacity-30">
          <img src={HERO_BG} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
        </div>
        <div className="relative max-w-7xl mx-auto grid lg:grid-cols-12 gap-8 items-end">
          <div className="lg:col-span-8 rise">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-border bg-card/50 backdrop-blur mb-6">
              <div className="w-1.5 h-1.5 bg-[#CCFF00] pulse-volt rounded-full" />
              <span className="text-[10px] uppercase tracking-widest font-bold">System Online · v1.0</span>
            </div>
            <h1 className="font-display text-6xl md:text-8xl lg:text-[9rem] leading-[0.9] tracking-tight">
              TRAIN<br /> LIKE A <span className="text-[#CCFF00]">MACHINE</span>.<br /> EAT LIKE A <span className="text-[#CCFF00]">PRO</span>.
            </h1>
            <p className="mt-8 max-w-xl text-base md:text-lg text-muted-foreground leading-relaxed">
              A command center for athletes. Track calories, macros, lifts and measurements with tactical precision. Built for operators who don't guess.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link to="/register" data-testid="hero-cta-primary" className="group bg-[#CCFF00] text-black px-6 py-4 text-sm uppercase tracking-widest font-bold hover:bg-[#B3E600] active:scale-95 transition-all flex items-center gap-2">
                Deploy Free <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link to="/login" data-testid="hero-cta-secondary" className="border border-border px-6 py-4 text-sm uppercase tracking-widest font-bold hover:border-[#CCFF00] hover:text-[#CCFF00] transition-colors">
                Login
              </Link>
            </div>
          </div>
          <div className="lg:col-span-4 space-y-4 rise rise-2">
            <StatTile label="Foods Indexed" value="58+" sub="Indian + Global" />
            <StatTile label="Macro Precision" value="±1g" sub="Protein / Carb / Fat" />
            <StatTile label="BMR Formula" value="M-SJ" sub="Mifflin-St Jeor" />
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section id="features" className="relative py-24 px-6 border-t border-border">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-12">
            <div>
              <div className="text-xs uppercase tracking-widest text-[#CCFF00] mb-2">/ 01 · Systems</div>
              <h2 className="text-4xl md:text-6xl font-display">Ten Modules. One Stack.</h2>
            </div>
            <div className="hidden md:block text-xs uppercase tracking-widest text-muted-foreground">Full-Spectrum Athletic Ops</div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
            {FEATURES.map((f, i) => (
              <article key={f.title} className="tactical-card bg-card p-8 rounded-none relative group">
                <f.icon className="w-6 h-6 text-[#CCFF00] mb-4" strokeWidth={1.5} />
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">/ {String(i + 1).padStart(2, "0")}</div>
                <h3 className="text-2xl font-heading mb-3">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Split: Meal + Workout */}
      <section id="calc" className="py-24 px-6 border-t border-border">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-px bg-border">
          <div className="bg-card p-10 relative overflow-hidden">
            <div className="text-xs uppercase tracking-widest text-[#CCFF00]">/ Nutrition</div>
            <h3 className="text-3xl md:text-5xl font-display mt-2 mb-4">Precision Fueling</h3>
            <p className="text-muted-foreground mb-8 max-w-md">BMR → TDEE → Goal-adjusted targets. Protein locked at 2g/kg for growth. Carbs fill the rest.</p>
            <ul className="space-y-3 text-sm">
              {["Mifflin-St Jeor BMR engine", "Macro auto-split by goal", "Indian + global food DB"].map((t) => (
                <li key={t} className="flex items-center gap-3"><div className="w-1.5 h-1.5 bg-[#CCFF00]" />{t}</li>
              ))}
            </ul>
            <img src={MEAL_IMG} alt="meal prep" className="absolute -right-10 -bottom-10 w-64 h-64 object-cover opacity-20 grayscale" />
          </div>
          <div className="bg-card p-10 relative overflow-hidden">
            <div className="text-xs uppercase tracking-widest text-[#CCFF00]">/ Training</div>
            <h3 className="text-3xl md:text-5xl font-display mt-2 mb-4">Rep It. Log It. Own It.</h3>
            <p className="text-muted-foreground mb-8 max-w-md">Log sets, reps, weights. Estimate calories burned. Sync to your daily balance.</p>
            <ul className="space-y-3 text-sm">
              {["Volume & intensity tracking", "Calorie burn estimator", "Connected to daily nutrition"].map((t) => (
                <li key={t} className="flex items-center gap-3"><div className="w-1.5 h-1.5 bg-[#CCFF00]" />{t}</li>
              ))}
            </ul>
            <img src={WORKOUT_IMG} alt="workout" className="absolute -right-10 -bottom-10 w-64 h-64 object-cover opacity-20 grayscale" />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="stats" className="py-24 px-6 border-t border-border">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-5xl md:text-7xl font-display">READY TO RUN <span className="text-[#CCFF00]">LEAN</span>?</h2>
          <p className="mt-6 text-muted-foreground max-w-xl mx-auto">Free forever. No credit card. No ads. Just signal.</p>
          <Link to="/register" data-testid="bottom-cta" className="inline-flex items-center gap-2 mt-8 bg-[#CCFF00] text-black px-8 py-4 text-sm uppercase tracking-widest font-bold hover:bg-[#B3E600] active:scale-95 transition-all">
            Create Account <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <footer className="py-8 px-6 border-t border-border">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-xs uppercase tracking-widest text-muted-foreground">
          <div>© {new Date().getFullYear()} CAL.TRK · Built for operators.</div>
          <div>v1.0 · System Online</div>
        </div>
      </footer>
    </div>
  );
}

const StatTile = ({ label, value, sub }) => (
  <div className="bg-card border border-border p-6 backdrop-blur">
    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
    <div className="font-display text-5xl text-[#CCFF00] leading-none mt-2">{value}</div>
    <div className="text-xs mt-2 text-foreground">{sub}</div>
  </div>
);

const FEATURES = [
  { title: "Account & Profile", desc: "Secure JWT auth. Age, weight, height, goals—all on file.", icon: Target },
  { title: "Food Logger", desc: "Log meals by category. Search, favorite, reuse.", icon: Flame },
  { title: "Macro Calculator", desc: "BMR, TDEE, and macro targets auto-calibrated.", icon: BarChart3 },
  { title: "Daily Dashboard", desc: "Consumed, remaining, macros, water—at a glance.", icon: Activity },
  { title: "Progress Tracking", desc: "Weight, waist, chest, arms with clean charts.", icon: BarChart3 },
  { title: "Food Database", desc: "Indian staples + global favorites with macro data.", icon: Flame },
  { title: "Meal History", desc: "Repeat yesterday's winning meals with one tap.", icon: Target },
  { title: "Auto Adjustments", desc: "Suggestions when trends slow or drift.", icon: Zap },
  { title: "Workout Integration", desc: "Log lifts, track volume, burn calories.", icon: Dumbbell },
];
