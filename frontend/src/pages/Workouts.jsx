import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { toast } from "sonner";
import { Dumbbell, Trash2, Flame } from "lucide-react";

export default function Workouts() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [workouts, setWorkouts] = useState([]);
  const [form, setForm] = useState({ exercise: "", sets: 3, reps: 10, weight_kg: 0, duration_min: 0 });

  const load = async () => {
    const { data } = await api.get("/workouts", { params: { date } });
    setWorkouts(data.workouts);
  };
  useEffect(() => { load(); }, [date]); // eslint-disable-line

  const submit = async (e) => {
    e.preventDefault();
    if (!form.exercise) return toast.error("Exercise name required");
    try {
      await api.post("/workouts", { ...form, sets: +form.sets, reps: +form.reps, weight_kg: +form.weight_kg, duration_min: +form.duration_min, date });
      toast.success("Workout logged");
      setForm({ exercise: "", sets: 3, reps: 10, weight_kg: 0, duration_min: 0 });
      load();
    } catch { toast.error("Failed"); }
  };
  const del = async (id) => { await api.delete(`/workouts/${id}`); load(); };

  const totalBurned = workouts.reduce((s, w) => s + (w.calories_burned || 0), 0);
  const totalVolume = workouts.reduce((s, w) => s + w.sets * w.reps * (w.weight_kg || 0), 0);

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <header className="mb-8 flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-[#CCFF00] mb-2">/ Training</div>
          <h1 className="font-display text-5xl md:text-6xl">Workouts</h1>
        </div>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} data-testid="workout-date"
          className="bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-[#CCFF00]"/>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-border mb-8">
        <Tile label="Exercises" value={workouts.length} icon={Dumbbell}/>
        <Tile label="Volume (kg)" value={Math.round(totalVolume)} icon={Dumbbell}/>
        <Tile label="Burned (kcal)" value={Math.round(totalBurned)} icon={Flame}/>
      </div>

      <div className="grid lg:grid-cols-12 gap-px bg-border">
        <div className="lg:col-span-4 bg-card p-6">
          <div className="font-heading text-2xl uppercase mb-4">Log Exercise</div>
          <form onSubmit={submit} className="space-y-3" data-testid="workout-form">
            <F label="Exercise" value={form.exercise} onChange={v => setForm({...form, exercise: v})} testid="workout-exercise"/>
            <div className="grid grid-cols-3 gap-2">
              <F label="Sets" type="number" value={form.sets} onChange={v => setForm({...form, sets: v})} testid="workout-sets"/>
              <F label="Reps" type="number" value={form.reps} onChange={v => setForm({...form, reps: v})} testid="workout-reps"/>
              <F label="Wt (kg)" type="number" step="0.5" value={form.weight_kg} onChange={v => setForm({...form, weight_kg: v})} testid="workout-weight"/>
            </div>
            <F label="Duration (min, optional)" type="number" value={form.duration_min} onChange={v => setForm({...form, duration_min: v})} testid="workout-duration"/>
            <button data-testid="workout-submit" className="w-full bg-[#CCFF00] text-black py-3 text-xs uppercase tracking-widest font-bold hover:bg-[#B3E600] active:scale-95">Log</button>
          </form>
        </div>
        <div className="lg:col-span-8 bg-card p-6">
          <div className="font-heading text-2xl uppercase mb-4">Today's Session</div>
          {workouts.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">No exercises logged.</div>
          ) : (
            <ul className="divide-y divide-border">
              {workouts.map(w => (
                <li key={w.id} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <div className="font-semibold">{w.exercise}</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-widest">{w.sets} × {w.reps} @ {w.weight_kg}kg {w.duration_min ? `· ${w.duration_min}min` : ""}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="font-display text-2xl text-[#CCFF00]">{w.calories_burned}<span className="text-xs text-muted-foreground"> kcal</span></div>
                    <button onClick={() => del(w.id)} data-testid={`del-workout-${w.id}`} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4"/></button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

const Tile = ({ label, value, icon: Icon }) => (
  <div className="bg-card p-6 flex items-center justify-between">
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="font-display text-4xl mt-1">{value}</div>
    </div>
    <Icon className="w-5 h-5 text-[#CCFF00]"/>
  </div>
);

const F = ({ label, value, onChange, type = "text", step, testid }) => (
  <label className="block">
    <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground block mb-1">{label}</span>
    <input type={type} step={step} value={value} onChange={e => onChange(e.target.value)} data-testid={testid}
      className="w-full bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-[#CCFF00]"/>
  </label>
);
