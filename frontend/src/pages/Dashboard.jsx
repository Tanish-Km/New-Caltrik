import { useEffect, useState, useCallback } from "react";
import { api } from "../lib/api";
import { Flame, Droplets, Activity, Target, TrendingUp, Plus, Minus } from "lucide-react";
import { toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (targetDate) => {
    try {
      const d = targetDate || selectedDate;
      const { data } = await api.get("/dashboard", { params: { date: d } });
      setData(data);
    } catch (e) {
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => { load(selectedDate); }, [load, selectedDate]);

  const updateWater = async (delta) => {
    const next = Math.max(0, (data?.water_glasses || 0) + delta);
    const d = data?.date || selectedDate;
    await api.post("/water", { glasses: next, date: d });
    setData((prev) => ({ ...prev, water_glasses: next }));
  };

  if (loading || !data) return <div className="p-8 text-center text-muted-foreground">Loading telemetry…</div>;

  const t = data.targets;
  const c = data.consumed;
  const macroData = [
    { name: "Protein", value: Math.max(c.protein, 0.01), color: "#CCFF00", target: t.target_protein, unit: "g" },
    { name: "Carbs", value: Math.max(c.carbs, 0.01), color: "#007AFF", target: t.target_carbs, unit: "g" },
    { name: "Fats", value: Math.max(c.fats, 0.01), color: "#FF3B30", target: t.target_fats, unit: "g" },
  ];
  const caloriePct = Math.min(100, (c.calories / t.target_calories) * 100);

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <header className="mb-10 rise flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-[#CCFF00] mb-2">/ Telemetry · {data.date}</div>
          <h1 className="font-display text-5xl md:text-6xl">Daily Command</h1>
          <p className="text-sm text-muted-foreground mt-2">Live telemetry across nutrition, hydration and training.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            data-testid="dashboard-date"
            className="bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-[#CCFF00]"
          />
        </div>
        {data.suggestion && (
          <div data-testid="suggestion-banner" className="w-full mt-2 border border-[#CCFF00] bg-[#CCFF00]/5 p-4 text-sm flex gap-3">
            <TrendingUp className="w-4 h-4 text-[#CCFF00] flex-shrink-0 mt-0.5" />
            <span>{data.suggestion}</span>
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-px bg-border">
        {/* Big calorie tile */}
        <div className="lg:col-span-7 bg-card p-8 rise rise-1">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Calories</div>
              <div className="font-display text-7xl md:text-8xl mt-2 leading-none">
                <span data-testid="cal-consumed">{Math.round(c.calories)}</span>
                <span className="text-muted-foreground text-4xl"> / {t.target_calories}</span>
              </div>
              <div className="mt-2 text-sm">
                <span className="text-[#CCFF00] font-bold" data-testid="cal-remaining">{data.remaining} kcal</span>
                <span className="text-muted-foreground"> remaining · </span>
                <span className="text-muted-foreground">{data.burned} burned</span>
              </div>
            </div>
            <Flame className="w-6 h-6 text-[#CCFF00]" strokeWidth={1.5}/>
          </div>
          <div className="h-2 bg-muted relative overflow-hidden">
            <div className="absolute inset-y-0 left-0 bg-[#CCFF00] transition-all duration-700" style={{ width: `${caloriePct}%` }} />
          </div>
          <div className="grid grid-cols-4 gap-px bg-border mt-6">
            {Object.entries(data.by_category).map(([k, v]) => (
              <div key={k} className="bg-card p-4">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{k}</div>
                <div className="font-display text-2xl mt-1">{Math.round(v)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Macro chart */}
        <div className="lg:col-span-5 bg-card p-8 rise rise-2">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Macro Split</div>
          <div className="font-heading text-2xl uppercase mb-4">Fuel Distribution</div>
          <div className="flex items-center gap-6">
            <div className="w-32 h-32">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={macroData} dataKey="value" innerRadius={40} outerRadius={60} stroke="none">
                    {macroData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-3">
              {macroData.map((m) => {
                const pct = Math.min(100, (m.value / (m.target || 1)) * 100);
                return (
                  <div key={m.name} data-testid={`macro-${m.name.toLowerCase()}`}>
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs uppercase tracking-widest font-bold">{m.name}</span>
                      <span className="text-xs font-mono">{Math.round(m.value)}/{m.target}{m.unit}</span>
                    </div>
                    <div className="h-1 bg-muted mt-1 overflow-hidden">
                      <div className="h-full transition-all duration-500" style={{ width: `${pct}%`, background: m.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Water */}
        <div className="lg:col-span-4 bg-card p-8 rise rise-3">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Hydration</div>
              <div className="font-heading text-2xl uppercase">Water</div>
            </div>
            <Droplets className="w-5 h-5 text-[#007AFF]" strokeWidth={1.5}/>
          </div>
          <div className="font-display text-6xl">
            <span data-testid="water-count">{data.water_glasses}</span>
            <span className="text-muted-foreground text-2xl"> / {data.water_target}</span>
          </div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">glasses (250ml)</div>
          <div className="flex gap-px bg-border mt-4">
            <button onClick={() => updateWater(-1)} data-testid="water-minus" className="flex-1 bg-card py-2 hover:text-destructive transition-colors flex items-center justify-center">
              <Minus className="w-4 h-4"/>
            </button>
            <button onClick={() => updateWater(1)} data-testid="water-plus" className="flex-1 bg-card py-2 hover:text-[#CCFF00] transition-colors flex items-center justify-center">
              <Plus className="w-4 h-4"/>
            </button>
          </div>
        </div>

        {/* Activity */}
        <div className="lg:col-span-4 bg-card p-8 rise rise-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Output</div>
              <div className="font-heading text-2xl uppercase">Training</div>
            </div>
            <Activity className="w-5 h-5 text-[#CCFF00]" strokeWidth={1.5}/>
          </div>
          <div className="font-display text-6xl">{data.burned}</div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">kcal burned · {data.workouts_count} sessions</div>
          <Link to="/app/workouts" className="block mt-4 border border-border text-center py-2 text-xs uppercase tracking-widest font-bold hover:border-[#CCFF00] hover:text-[#CCFF00] transition-colors">Log Workout</Link>
        </div>

        {/* Targets summary */}
        <div className="lg:col-span-4 bg-card p-8 rise rise-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Targets</div>
              <div className="font-heading text-2xl uppercase">Engine</div>
            </div>
            <Target className="w-5 h-5 text-[#CCFF00]" strokeWidth={1.5}/>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground uppercase text-xs tracking-widest">BMR</span><span className="font-mono">{t.bmr} kcal</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground uppercase text-xs tracking-widest">TDEE</span><span className="font-mono">{t.tdee} kcal</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground uppercase text-xs tracking-widest">Target</span><span className="font-mono text-[#CCFF00]">{t.target_calories} kcal</span></div>
          </div>
          <Link to="/app/profile" className="block mt-4 border border-border text-center py-2 text-xs uppercase tracking-widest font-bold hover:border-[#CCFF00] hover:text-[#CCFF00] transition-colors">Calibrate</Link>
        </div>
      </div>
    </div>
  );
}
