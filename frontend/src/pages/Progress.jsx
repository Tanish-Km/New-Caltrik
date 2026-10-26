import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  TrendingUp,
  Scale,
  Trash2,
  Dumbbell,
  Zap,
  Award,
  Search,
  ArrowUpRight,
  Flame,
} from "lucide-react";

const FIELDS = [
  { key: "weight_kg", label: "Weight", unit: "kg", step: 0.1 },
  { key: "waist_cm", label: "Waist", unit: "cm", step: 0.5 },
  { key: "chest_cm", label: "Chest", unit: "cm", step: 0.5 },
  { key: "hips_cm", label: "Hips", unit: "cm", step: 0.5 },
  { key: "arms_cm", label: "Arms", unit: "cm", step: 0.5 },
];

export default function Progress() {
  const [activePhase, setActivePhase] = useState("weight"); // "weight" | "strength"
  const [entries, setEntries] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [selectedExerciseKey, setSelectedExerciseKey] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10) });

  const load = async () => {
    try {
      const [pRes, wRes] = await Promise.all([
        api.get("/progress"),
        api.get("/workouts"),
      ]);
      setEntries(pRes.data.entries || []);
      setWorkouts(wRes.data.workouts || []);
    } catch (err) {
      console.error("Failed to load progress or workouts", err);
    }
  };

  useEffect(() => {
    load();
    const handleFocus = () => load();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  const switchPhase = (phase) => {
    setActivePhase(phase);
    load();
  };

  const submit = async (e) => {
    e.preventDefault();
    const payload = { date: form.date };
    FIELDS.forEach((f) => {
      if (form[f.key]) payload[f.key] = +form[f.key];
    });
    if (Object.keys(payload).length === 1)
      return toast.error("Enter at least one measurement");
    try {
      await api.post("/progress", payload);
      toast.success("Progress logged");
      setForm({ date: form.date });
      load();
    } catch {
      toast.error("Failed to save");
    }
  };

  const del = async (id) => {
    await api.delete(`/progress/${id}`);
    load();
  };

  const delWorkout = async (id) => {
    try {
      await api.delete(`/workouts/${id}`);
      toast.success("Workout session deleted");
      load();
    } catch {
      toast.error("Failed to delete workout session");
    }
  };

  // Weight series & calculations
  const weightSeries = entries
    .filter((e) => e.weight_kg)
    .map((e) => ({ date: e.date, weight: e.weight_kg }));
  const latest = entries[entries.length - 1] || {};
  const first = entries.find((e) => e.weight_kg) || {};
  const delta =
    latest.weight_kg && first.weight_kg
      ? (latest.weight_kg - first.weight_kg).toFixed(1)
      : "0.0";

  // Strength series & statistical processing
  const exerciseStats = useMemo(() => {
    if (!workouts || workouts.length === 0) return [];

    const map = new Map();

    workouts.forEach((w) => {
      if (!w.exercise) return;
      const rawName = w.exercise.trim();
      if (!rawName) return;
      const normKey = rawName.toLowerCase();

      if (!map.has(normKey)) {
        const displayName = rawName
          .split(/\s+/)
          .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
          .join(" ");

        map.set(normKey, {
          key: normKey,
          name: displayName,
          sessions: [],
        });
      }

      const item = map.get(normKey);
      const weight = Number(w.weight_kg) || 0;
      const sets = Number(w.sets) || 1;
      const reps = Number(w.reps) || 0;
      const effectiveReps = Math.min(Math.max(reps, 1), 30);
      const est1RM = weight > 0 ? Math.round(weight * (36 / (37 - effectiveReps))) : 0;
      const sessionVolume = Math.round(sets * reps * weight);

      item.sessions.push({
        id: w.id,
        date: w.date,
        sets,
        reps,
        weight_kg: weight,
        duration_min: w.duration_min || 0,
        calories_burned: w.calories_burned || 0,
        created_at: w.created_at,
        est1RM,
        sessionVolume,
      });
    });

    const list = Array.from(map.values()).map((ex) => {
      const chronological = [...ex.sessions].sort((a, b) => {
        const da = a.date || "";
        const db = b.date || "";
        if (da !== db) return da.localeCompare(db);
        return (a.created_at || "").localeCompare(b.created_at || "");
      });

      const recentFirst = [...chronological].reverse();

      const maxWeight = Math.max(...ex.sessions.map((s) => s.weight_kg), 0);
      const best1RM = Math.max(...ex.sessions.map((s) => s.est1RM), 0);
      const totalVolume = ex.sessions.reduce((sum, s) => sum + s.sessionVolume, 0);
      const totalSets = ex.sessions.reduce((sum, s) => sum + s.sets, 0);
      const totalReps = ex.sessions.reduce((sum, s) => sum + s.sets * s.reps, 0);
      const maxSessionVolume = Math.max(...ex.sessions.map((s) => s.sessionVolume), 0);

      const weightsWithLoad = ex.sessions
        .filter((s) => s.weight_kg > 0)
        .map((s) => s.weight_kg);
      const avgWeight = weightsWithLoad.length
        ? weightsWithLoad.reduce((a, b) => a + b, 0) / weightsWithLoad.length
        : 0;

      const firstSession = chronological[0] || {};
      const latestSession = recentFirst[0] || {};
      const weightDelta = (latestSession.weight_kg || 0) - (firstSession.weight_kg || 0);

      const trendSeries = chronological.map((s) => ({
        date: s.date,
        weight: s.weight_kg,
        est1RM: s.est1RM,
        volume: s.sessionVolume,
        reps: s.reps,
        sets: s.sets,
      }));

      return {
        key: ex.key,
        name: ex.name,
        sessionsCount: ex.sessions.length,
        totalVolume,
        totalSets,
        totalReps,
        maxWeight,
        best1RM,
        maxSessionVolume,
        avgWeight,
        firstSession,
        latestSession,
        weightDelta,
        trendSeries,
        history: recentFirst,
      };
    });

    list.sort((a, b) => {
      const da = a.latestSession.date || "";
      const db = b.latestSession.date || "";
      return db.localeCompare(da);
    });

    return list;
  }, [workouts]);

  const overallStrengthStats = useMemo(() => {
    const totalExercises = exerciseStats.length;
    const totalLifetimeVolume = exerciseStats.reduce((sum, ex) => sum + ex.totalVolume, 0);
    const totalSets = exerciseStats.reduce((sum, ex) => sum + ex.totalSets, 0);
    return {
      totalExercises,
      totalLifetimeVolume,
      totalSets,
      totalSessions: workouts.length,
    };
  }, [exerciseStats, workouts]);

  const activeExerciseObj = useMemo(() => {
    if (!exerciseStats.length) return null;
    if (selectedExerciseKey) {
      const found = exerciseStats.find((e) => e.key === selectedExerciseKey);
      if (found) return found;
    }
    return exerciseStats[0];
  }, [exerciseStats, selectedExerciseKey]);

  const filteredExercises = useMemo(() => {
    if (!searchQuery.trim()) return exerciseStats;
    const q = searchQuery.toLowerCase().trim();
    return exerciseStats.filter((e) => e.name.toLowerCase().includes(q));
  }, [exerciseStats, searchQuery]);

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      {/* Header with Phase Switcher */}
      <header className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-[#CCFF00] mb-2">
            {activePhase === "weight" ? "/ Body Metrics" : "/ Strength Analytics"}
          </div>
          <h1 className="font-display text-5xl md:text-6xl">Progress</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {activePhase === "weight"
              ? "Weight. Measurements. Trends."
              : "Strength. Volume. Exercise Statistics."}
          </p>
        </div>

        {/* Phase Toggle / Switcher */}
        <div className="flex bg-card border border-border p-1 gap-1 self-start md:self-auto">
          <button
            type="button"
            data-testid="phase-toggle-weight"
            onClick={() => switchPhase("weight")}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold font-heading uppercase tracking-widest transition-all ${
              activePhase === "weight"
                ? "bg-[#CCFF00] text-black shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <Scale className="w-4 h-4" />
            Weight Progress
          </button>
          <button
            type="button"
            data-testid="phase-toggle-strength"
            onClick={() => switchPhase("strength")}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold font-heading uppercase tracking-widest transition-all ${
              activePhase === "strength"
                ? "bg-[#CCFF00] text-black shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <Dumbbell className="w-4 h-4" />
            Strength Progress
          </button>
        </div>
      </header>

      {/* ===================== PHASE 1: WEIGHT PROGRESS ===================== */}
      {activePhase === "weight" && (
        <>
          <div className="grid lg:grid-cols-12 gap-px bg-border mb-8">
            <div className="lg:col-span-4 bg-card p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Latest Weight
                </div>
                <Scale className="w-4 h-4 text-[#CCFF00]" />
              </div>
              <div className="font-display text-5xl">
                {latest.weight_kg || "—"}
                <span className="text-muted-foreground text-xl"> kg</span>
              </div>
            </div>
            <div className="lg:col-span-4 bg-card p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Total Change
                </div>
                <TrendingUp className="w-4 h-4 text-[#CCFF00]" />
              </div>
              <div
                className={`font-display text-5xl ${
                  +delta < 0 ? "text-[#CCFF00]" : +delta > 0 ? "text-[#007AFF]" : ""
                }`}
              >
                {+delta > 0 ? "+" : ""}
                {delta}
                <span className="text-muted-foreground text-xl"> kg</span>
              </div>
            </div>
            <div className="lg:col-span-4 bg-card p-6">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                Entries
              </div>
              <div className="font-display text-5xl">{entries.length}</div>
            </div>
          </div>

          <div className="grid lg:grid-cols-12 gap-px bg-border mb-8">
            <div className="lg:col-span-8 bg-card p-6">
              <div className="font-heading text-2xl uppercase mb-4">Weight Trend</div>
              {weightSeries.length < 2 ? (
                <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
                  Log at least 2 entries to see the trend.
                </div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer>
                    <LineChart data={weightSeries}>
                      <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.08)" />
                      <XAxis dataKey="date" stroke="#888" fontSize={11} />
                      <YAxis
                        stroke="#888"
                        fontSize={11}
                        domain={["dataMin - 1", "dataMax + 1"]}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "#0A0A0A",
                          border: "1px solid #CCFF00",
                          borderRadius: 0,
                          fontSize: 12,
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="weight"
                        stroke="#CCFF00"
                        strokeWidth={2}
                        dot={{ fill: "#CCFF00", r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
            <div className="lg:col-span-4 bg-card p-6">
              <div className="font-heading text-2xl uppercase mb-4">New Entry</div>
              <form onSubmit={submit} className="space-y-3" data-testid="progress-form">
                <label className="block">
                  <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground block mb-1">
                    Date
                  </span>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-[#CCFF00]"
                  />
                </label>
                {FIELDS.map((f) => (
                  <label key={f.key} className="block">
                    <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground block mb-1">
                      {f.label} ({f.unit})
                    </span>
                    <input
                      type="number"
                      step={f.step}
                      value={form[f.key] || ""}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                      data-testid={`progress-${f.key}`}
                      className="w-full bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-[#CCFF00]"
                    />
                  </label>
                ))}
                <button
                  data-testid="progress-submit"
                  className="w-full bg-[#CCFF00] text-black py-3 text-xs uppercase tracking-widest font-bold hover:bg-[#B3E600] active:scale-95 transition-all"
                >
                  Log Entry
                </button>
              </form>
            </div>
          </div>

          <section className="bg-card border border-border p-6">
            <div className="font-heading text-2xl uppercase mb-4">All Entries</div>
            {entries.length === 0 ? (
              <div className="text-sm text-muted-foreground">No entries yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-border">
                      <th className="py-2 font-heading uppercase tracking-widest text-xs">Date</th>
                      <th className="font-heading uppercase tracking-widest text-xs">Weight</th>
                      <th className="font-heading uppercase tracking-widest text-xs">Waist</th>
                      <th className="font-heading uppercase tracking-widest text-xs">Chest</th>
                      <th className="font-heading uppercase tracking-widest text-xs">Arms</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...entries].reverse().map((e) => (
                      <tr key={e.id} className="border-b border-border/50">
                        <td className="py-3">{e.date}</td>
                        <td>{e.weight_kg || "—"}</td>
                        <td>{e.waist_cm || "—"}</td>
                        <td>{e.chest_cm || "—"}</td>
                        <td>{e.arms_cm || "—"}</td>
                        <td className="text-right">
                          <button
                            onClick={() => del(e.id)}
                            data-testid={`del-progress-${e.id}`}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {/* ===================== PHASE 2: STRENGTH PROGRESS ===================== */}
      {activePhase === "strength" && (
        <>
          {/* Top Strength Metric Tiles */}
          <div className="grid lg:grid-cols-12 gap-px bg-border mb-8">
            <div className="lg:col-span-4 bg-card p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Exercises Tracked
                </div>
                <Dumbbell className="w-4 h-4 text-[#CCFF00]" />
              </div>
              <div className="font-display text-5xl">
                {overallStrengthStats.totalExercises}
                <span className="text-muted-foreground text-xl"> movements</span>
              </div>
            </div>
            <div className="lg:col-span-4 bg-card p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Total Lifetime Volume
                </div>
                <TrendingUp className="w-4 h-4 text-[#CCFF00]" />
              </div>
              <div className="font-display text-5xl text-[#CCFF00]">
                {Math.round(overallStrengthStats.totalLifetimeVolume).toLocaleString()}
                <span className="text-muted-foreground text-xl"> kg</span>
              </div>
            </div>
            <div className="lg:col-span-4 bg-card p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Total Working Sets
                </div>
                <Zap className="w-4 h-4 text-[#CCFF00]" />
              </div>
              <div className="font-display text-5xl">
                {overallStrengthStats.totalSets}
                <span className="text-muted-foreground text-xl"> sets</span>
              </div>
            </div>
          </div>

          {/* Empty State when no workouts logged */}
          {exerciseStats.length === 0 ? (
            <div className="bg-card border border-border p-12 text-center">
              <Dumbbell className="w-12 h-12 text-[#CCFF00] mx-auto mb-4 opacity-80" />
              <h2 className="font-heading text-2xl uppercase mb-2">
                No Strength Workouts Logged Yet
              </h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                Log your lifting sessions on the Workouts page. Every exercise, set, rep, and weight
                you record will automatically sync here to generate your personal records, 1RM estimates,
                and volume statistics.
              </p>
              <Link
                to="/app/workouts"
                className="inline-flex items-center gap-2 bg-[#CCFF00] text-black px-6 py-3 text-xs uppercase tracking-widest font-bold hover:bg-[#B3E600] active:scale-95 transition-all"
              >
                Log A Workout <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Exercise Selector & Search Bar */}
              <div className="bg-card border border-border p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-heading uppercase tracking-widest text-muted-foreground">
                      Select Exercise:
                    </span>
                    <span className="text-xs font-bold text-[#CCFF00]">
                      {activeExerciseObj?.name}
                    </span>
                  </div>
                  <div className="relative w-full md:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="FILTER EXERCISES..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-background border border-border pl-9 pr-3 py-1.5 text-xs uppercase tracking-wider focus:outline-none focus:border-[#CCFF00]"
                    />
                  </div>
                </div>

                {/* Horizontal scrollable pills */}
                <div className="flex flex-wrap gap-2 overflow-x-auto pb-1">
                  {filteredExercises.map((ex) => {
                    const isSelected = activeExerciseObj?.key === ex.key;
                    return (
                      <button
                        key={ex.key}
                        onClick={() => setSelectedExerciseKey(ex.key)}
                        data-testid={`exercise-tab-${ex.key}`}
                        className={`px-4 py-2 text-xs font-heading uppercase tracking-widest font-bold transition-all border ${
                          isSelected
                            ? "bg-[#CCFF00] text-black border-[#CCFF00] shadow-sm"
                            : "bg-background border-border text-muted-foreground hover:text-foreground hover:border-[#CCFF00]/50"
                        }`}
                      >
                        {ex.name}
                        <span className={`ml-2 text-[10px] ${isSelected ? "text-black/70" : "text-muted-foreground"}`}>
                          ({ex.maxWeight}kg)
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Exercise Statistical Deep Dive */}
              {activeExerciseObj && (
                <div className="space-y-6">
                  {/* Exercise Header & PR Highlights */}
                  <div className="bg-card border border-border p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border">
                      <div>
                        <div className="text-[10px] uppercase tracking-widest text-[#CCFF00] mb-1">
                          / Exercise Statistical Profile
                        </div>
                        <h2 className="font-display text-4xl md:text-5xl uppercase tracking-wider text-white">
                          {activeExerciseObj.name}
                        </h2>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="bg-background border border-border px-3 py-1.5 text-xs uppercase tracking-widest text-muted-foreground">
                          {activeExerciseObj.sessionsCount} {activeExerciseObj.sessionsCount === 1 ? "Session" : "Sessions"} Recorded
                        </div>
                        <div className="bg-background border border-border px-3 py-1.5 text-xs uppercase tracking-widest text-[#CCFF00]">
                          Active Routine
                        </div>
                      </div>
                    </div>

                    {/* Statistical Cards Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border my-6">
                      <div className="bg-background p-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                            Personal Record (PR)
                          </span>
                          <Award className="w-3.5 h-3.5 text-[#CCFF00]" />
                        </div>
                        <div className="font-display text-4xl text-[#CCFF00]">
                          {activeExerciseObj.maxWeight}
                          <span className="text-muted-foreground text-sm font-normal"> kg</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">
                          Max Weight Lifted
                        </div>
                      </div>

                      <div className="bg-background p-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                            Est. 1-Rep Max (1RM)
                          </span>
                          <Flame className="w-3.5 h-3.5 text-[#007AFF]" />
                        </div>
                        <div className="font-display text-4xl text-white">
                          {activeExerciseObj.best1RM > 0 ? activeExerciseObj.best1RM : "—"}
                          <span className="text-muted-foreground text-sm font-normal"> kg</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">
                          Brzycki Formula
                        </div>
                      </div>

                      <div className="bg-background p-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                            Lifetime Volume
                          </span>
                          <TrendingUp className="w-3.5 h-3.5 text-[#CCFF00]" />
                        </div>
                        <div className="font-display text-4xl text-white">
                          {Math.round(activeExerciseObj.totalVolume).toLocaleString()}
                          <span className="text-muted-foreground text-sm font-normal"> kg</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">
                          {activeExerciseObj.totalSets} sets · {activeExerciseObj.totalReps} reps
                        </div>
                      </div>

                      <div className="bg-background p-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                            Strength Delta
                          </span>
                          <Scale className="w-3.5 h-3.5 text-[#CCFF00]" />
                        </div>
                        <div
                          className={`font-display text-4xl ${
                            activeExerciseObj.weightDelta > 0
                              ? "text-[#CCFF00]"
                              : activeExerciseObj.weightDelta < 0
                              ? "text-destructive"
                              : "text-muted-foreground"
                          }`}
                        >
                          {activeExerciseObj.weightDelta > 0 ? "+" : ""}
                          {activeExerciseObj.weightDelta.toFixed(1)}
                          <span className="text-muted-foreground text-sm font-normal"> kg</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">
                          From Initial Session
                        </div>
                      </div>
                    </div>

                    {/* Chart & Deep Metrics Breakdown */}
                    <div className="grid lg:grid-cols-12 gap-px bg-border">
                      {/* Strength Progression Chart */}
                      <div className="lg:col-span-8 bg-background p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="font-heading text-xl uppercase tracking-wider">
                            Strength Progression
                          </div>
                          <div className="flex items-center gap-4 text-[10px] uppercase tracking-widest">
                            <span className="flex items-center gap-1.5 text-[#CCFF00]">
                              <span className="w-2.5 h-0.5 bg-[#CCFF00] inline-block"></span>
                              Working Weight
                            </span>
                            <span className="flex items-center gap-1.5 text-[#007AFF]">
                              <span className="w-2.5 h-0.5 bg-[#007AFF] inline-block"></span>
                              Est. 1RM
                            </span>
                          </div>
                        </div>

                        {activeExerciseObj.trendSeries.length < 2 ? (
                          <div className="h-64 flex flex-col items-center justify-center text-sm text-muted-foreground p-6 text-center">
                            <Dumbbell className="w-8 h-8 text-[#CCFF00] opacity-50 mb-2" />
                            <span>1 session recorded for {activeExerciseObj.name}.</span>
                            <span className="text-xs text-muted-foreground mt-1">
                              Log at least 2 sessions to visualize the overload trend line.
                            </span>
                          </div>
                        ) : (
                          <div className="h-64">
                            <ResponsiveContainer>
                              <LineChart data={activeExerciseObj.trendSeries}>
                                <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.08)" />
                                <XAxis dataKey="date" stroke="#888" fontSize={11} />
                                <YAxis
                                  stroke="#888"
                                  fontSize={11}
                                  domain={["dataMin - 5", "dataMax + 5"]}
                                />
                                <Tooltip
                                  content={({ active, payload, label }) => {
                                    if (active && payload && payload.length) {
                                      const data = payload[0].payload;
                                      return (
                                        <div className="bg-[#0A0A0A] border border-[#CCFF00] p-3 text-xs shadow-lg space-y-1">
                                          <div className="text-muted-foreground font-heading uppercase tracking-wider">
                                            {label}
                                          </div>
                                          <div className="text-[#CCFF00] font-bold">
                                            Weight: {data.weight} kg
                                          </div>
                                          {data.est1RM > 0 && (
                                            <div className="text-[#007AFF]">
                                              Est. 1RM: {data.est1RM} kg
                                            </div>
                                          )}
                                          <div className="text-muted-foreground">
                                            {data.sets} sets × {data.reps} reps
                                          </div>
                                          <div className="text-muted-foreground">
                                            Session Volume: {data.volume.toLocaleString()} kg
                                          </div>
                                        </div>
                                      );
                                    }
                                    return null;
                                  }}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="weight"
                                  stroke="#CCFF00"
                                  strokeWidth={2}
                                  dot={{ fill: "#CCFF00", r: 3 }}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="est1RM"
                                  stroke="#007AFF"
                                  strokeWidth={1.5}
                                  strokeDasharray="3 3"
                                  dot={{ fill: "#007AFF", r: 2 }}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </div>

                      {/* Performance Breakdown Tiles */}
                      <div className="lg:col-span-4 bg-background p-6 flex flex-col justify-between space-y-4">
                        <div className="font-heading text-xl uppercase tracking-wider mb-2">
                          Performance Metrics
                        </div>
                        <div className="space-y-3 flex-1">
                          <div className="flex items-center justify-between pb-2 border-b border-border/60">
                            <span className="text-xs text-muted-foreground uppercase tracking-wider">
                              Peak Session Volume
                            </span>
                            <span className="font-heading text-base font-bold text-white">
                              {activeExerciseObj.maxSessionVolume.toLocaleString()} kg
                            </span>
                          </div>
                          <div className="flex items-center justify-between pb-2 border-b border-border/60">
                            <span className="text-xs text-muted-foreground uppercase tracking-wider">
                              Average Working Weight
                            </span>
                            <span className="font-heading text-base font-bold text-white">
                              {activeExerciseObj.avgWeight.toFixed(1)} kg
                            </span>
                          </div>
                          <div className="flex items-center justify-between pb-2 border-b border-border/60">
                            <span className="text-xs text-muted-foreground uppercase tracking-wider">
                              Total Repetitions
                            </span>
                            <span className="font-heading text-base font-bold text-white">
                              {activeExerciseObj.totalReps}
                            </span>
                          </div>
                          <div className="flex items-center justify-between pb-2 border-b border-border/60">
                            <span className="text-xs text-muted-foreground uppercase tracking-wider">
                              First Session Weight
                            </span>
                            <span className="font-heading text-base font-bold text-muted-foreground">
                              {activeExerciseObj.firstSession.weight_kg || 0} kg ({activeExerciseObj.firstSession.date || "—"})
                            </span>
                          </div>
                          <div className="flex items-center justify-between pb-2 border-b border-border/60">
                            <span className="text-xs text-muted-foreground uppercase tracking-wider">
                              Most Recent Session
                            </span>
                            <span className="font-heading text-base font-bold text-[#CCFF00]">
                              {activeExerciseObj.latestSession.date || "—"}
                            </span>
                          </div>
                        </div>

                        <Link
                          to="/app/workouts"
                          className="w-full inline-flex items-center justify-center gap-2 bg-card border border-border text-foreground hover:border-[#CCFF00] hover:text-[#CCFF00] py-2.5 text-xs font-heading uppercase tracking-widest font-bold transition-all"
                        >
                          Log New Set on Workouts <ArrowUpRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Chronological Session History Table for Selected Exercise */}
                  <div className="bg-card border border-border p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="font-heading text-2xl uppercase">
                          Session History — {activeExerciseObj.name}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Chronological log of all sets and volume recorded from the Workouts page.
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground uppercase tracking-widest">
                        {activeExerciseObj.history.length} records
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left border-b border-border">
                            <th className="py-2.5 font-heading uppercase tracking-widest text-xs">
                              Date
                            </th>
                            <th className="font-heading uppercase tracking-widest text-xs">
                              Sets × Reps
                            </th>
                            <th className="font-heading uppercase tracking-widest text-xs">
                              Weight (kg)
                            </th>
                            <th className="font-heading uppercase tracking-widest text-xs">
                              Session Volume
                            </th>
                            <th className="font-heading uppercase tracking-widest text-xs">
                              Est. 1RM
                            </th>
                            <th className="font-heading uppercase tracking-widest text-xs">
                              Burned
                            </th>
                            <th className="text-right font-heading uppercase tracking-widest text-xs">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeExerciseObj.history.map((s) => (
                            <tr key={s.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                              <td className="py-3 font-mono text-xs">{s.date}</td>
                              <td className="font-semibold">
                                {s.sets} × {s.reps}
                              </td>
                              <td>
                                <span className="font-display text-lg text-[#CCFF00]">
                                  {s.weight_kg}
                                </span>{" "}
                                <span className="text-muted-foreground text-xs">kg</span>
                              </td>
                              <td>
                                {s.sessionVolume.toLocaleString()}{" "}
                                <span className="text-muted-foreground text-xs">kg</span>
                              </td>
                              <td>
                                {s.est1RM > 0 ? (
                                  <span className="text-white font-medium">{s.est1RM} kg</span>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                              <td>
                                <span className="text-muted-foreground text-xs">
                                  {s.calories_burned ? `${s.calories_burned} kcal` : "—"}
                                </span>
                              </td>
                              <td className="text-right">
                                <button
                                  onClick={() => delWorkout(s.id)}
                                  data-testid={`del-strength-workout-${s.id}`}
                                  title="Delete session (syncs with Workouts)"
                                  className="text-muted-foreground hover:text-destructive p-1 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* All Exercises Comparison Table */}
                  <div className="bg-card border border-border p-6">
                    <div className="font-heading text-2xl uppercase mb-1">
                      All Exercises Statistical Summary
                    </div>
                    <div className="text-xs text-muted-foreground mb-4">
                      Comprehensive statistical comparison across all movements logged in your training ledger.
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left border-b border-border">
                            <th className="py-2.5 font-heading uppercase tracking-widest text-xs">
                              Exercise
                            </th>
                            <th className="font-heading uppercase tracking-widest text-xs">
                              PR (Max Wt)
                            </th>
                            <th className="font-heading uppercase tracking-widest text-xs">
                              Est. 1RM
                            </th>
                            <th className="font-heading uppercase tracking-widest text-xs">
                              Total Volume
                            </th>
                            <th className="font-heading uppercase tracking-widest text-xs">
                              Total Sets
                            </th>
                            <th className="font-heading uppercase tracking-widest text-xs">
                              Last Performed
                            </th>
                            <th className="text-right font-heading uppercase tracking-widest text-xs">
                              View Stats
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {exerciseStats.map((ex) => {
                            const isCurrent = activeExerciseObj?.key === ex.key;
                            return (
                              <tr
                                key={ex.key}
                                className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${
                                  isCurrent ? "bg-[#CCFF00]/5" : ""
                                }`}
                              >
                                <td className="py-3 font-bold flex items-center gap-2">
                                  {ex.name}
                                  {isCurrent && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#CCFF00]"></span>
                                  )}
                                </td>
                                <td>
                                  <span className="font-display text-lg text-[#CCFF00]">
                                    {ex.maxWeight}
                                  </span>{" "}
                                  <span className="text-muted-foreground text-xs">kg</span>
                                </td>
                                <td>
                                  {ex.best1RM > 0 ? (
                                    <span>{ex.best1RM} kg</span>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </td>
                                <td>{Math.round(ex.totalVolume).toLocaleString()} kg</td>
                                <td>{ex.totalSets}</td>
                                <td className="font-mono text-xs">{ex.latestSession.date || "—"}</td>
                                <td className="text-right">
                                  <button
                                    onClick={() => setSelectedExerciseKey(ex.key)}
                                    className={`px-3 py-1 text-xs uppercase tracking-wider font-heading font-bold transition-all ${
                                      isCurrent
                                        ? "bg-[#CCFF00] text-black"
                                        : "border border-border text-muted-foreground hover:text-foreground hover:border-[#CCFF00]"
                                    }`}
                                  >
                                    {isCurrent ? "Active" : "Inspect"}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
