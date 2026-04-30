import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { toast } from "sonner";

const GOALS = [
  { key: "fat_loss", label: "Fat Loss" },
  { key: "muscle_gain", label: "Muscle Gain" },
  { key: "maintenance", label: "Maintenance" },
];

const ACTIVITY = [
  { key: "sedentary", label: "Sedentary (little/no exercise)" },
  { key: "light", label: "Light (1-3 days/week)" },
  { key: "moderate", label: "Moderate (3-5 days/week)" },
  { key: "active", label: "Active (6-7 days/week)" },
  { key: "very_active", label: "Very Active (athlete)" },
];

export default function Profile() {
  const { user, targets, refreshProfile } = useAuth();
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [localTargets, setLocalTargets] = useState(targets);

  useEffect(() => {
    if (user) setForm({
      name: user.name || "",
      age: user.age || "",
      gender: user.gender || "male",
      height_cm: user.height_cm || "",
      weight_kg: user.weight_kg || "",
      activity_level: user.activity_level || "moderate",
      goal: user.goal || "maintenance",
    });
    setLocalTargets(targets);
  }, [user, targets]);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {
        ...form,
        age: +form.age || null,
        height_cm: +form.height_cm || null,
        weight_kg: +form.weight_kg || null,
      };
      const { data } = await api.put("/profile", payload);
      setLocalTargets(data.targets);
      await refreshProfile();
      toast.success("Profile calibrated");
    } catch { toast.error("Save failed"); } finally { setBusy(false); }
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <header className="mb-10">
        <div className="text-[10px] uppercase tracking-widest text-[#CCFF00] mb-2">/ Operator Profile</div>
        <h1 className="font-display text-5xl md:text-6xl">Calibrate</h1>
        <p className="text-sm text-muted-foreground mt-2">Your body data powers every target.</p>
      </header>

      <div className="grid lg:grid-cols-12 gap-px bg-border">
        <form onSubmit={save} className="lg:col-span-8 bg-card p-8 space-y-5" data-testid="profile-form">
          <div className="grid md:grid-cols-2 gap-4">
            <F label="Name" value={form.name || ""} onChange={v => setForm({...form, name: v})} testid="profile-name"/>
            <F label="Age" type="number" value={form.age || ""} onChange={v => setForm({...form, age: v})} testid="profile-age"/>
            <Select label="Gender" value={form.gender} onChange={v => setForm({...form, gender: v})} options={[{key: "male", label: "Male"}, {key: "female", label: "Female"}]} testid="profile-gender"/>
            <Select label="Goal" value={form.goal} onChange={v => setForm({...form, goal: v})} options={GOALS} testid="profile-goal"/>
            <F label="Height (cm)" type="number" value={form.height_cm || ""} onChange={v => setForm({...form, height_cm: v})} testid="profile-height"/>
            <F label="Weight (kg)" type="number" step="0.1" value={form.weight_kg || ""} onChange={v => setForm({...form, weight_kg: v})} testid="profile-weight"/>
            <div className="md:col-span-2">
              <Select label="Activity Level" value={form.activity_level} onChange={v => setForm({...form, activity_level: v})} options={ACTIVITY} testid="profile-activity"/>
            </div>
          </div>
          <button disabled={busy} data-testid="profile-submit" className="bg-[#CCFF00] text-black px-6 py-3 text-xs uppercase tracking-widest font-bold hover:bg-[#B3E600] active:scale-95 disabled:opacity-50">
            {busy ? "Saving..." : "Save & Recalculate"}
          </button>
        </form>

        <aside className="lg:col-span-4 bg-card p-8">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Your Targets</div>
          <div className="font-heading text-2xl uppercase mb-6">Engine Output</div>
          {localTargets && (
            <div className="space-y-4" data-testid="target-summary">
              <Big label="Daily Calories" value={localTargets.target_calories} unit="kcal"/>
              <div className="grid grid-cols-3 gap-px bg-border">
                <Mini label="Protein" value={localTargets.target_protein}/>
                <Mini label="Carbs" value={localTargets.target_carbs}/>
                <Mini label="Fats" value={localTargets.target_fats}/>
              </div>
              <div className="pt-4 border-t border-border text-sm space-y-1">
                <Row k="BMR" v={`${localTargets.bmr} kcal`}/>
                <Row k="TDEE" v={`${localTargets.tdee} kcal`}/>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

const F = ({ label, value, onChange, type = "text", step, testid }) => (
  <label className="block">
    <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground block mb-1">{label}</span>
    <input type={type} step={step} value={value} onChange={e => onChange(e.target.value)} data-testid={testid}
      className="w-full bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-[#CCFF00]"/>
  </label>
);

const Select = ({ label, value, onChange, options, testid }) => (
  <label className="block">
    <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground block mb-1">{label}</span>
    <select value={value || ""} onChange={e => onChange(e.target.value)} data-testid={testid}
      className="w-full bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-[#CCFF00]">
      {options.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
    </select>
  </label>
);

const Big = ({ label, value, unit }) => (
  <div className="border border-border p-4 bg-background">
    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
    <div className="font-display text-5xl text-[#CCFF00]">{value}<span className="text-muted-foreground text-lg"> {unit}</span></div>
  </div>
);

const Mini = ({ label, value }) => (
  <div className="bg-card p-3">
    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
    <div className="font-display text-2xl">{value}<span className="text-xs text-muted-foreground">g</span></div>
  </div>
);

const Row = ({ k, v }) => (
  <div className="flex justify-between"><span className="text-muted-foreground uppercase text-xs tracking-widest">{k}</span><span className="font-mono">{v}</span></div>
);
