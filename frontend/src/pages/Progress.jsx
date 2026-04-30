import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { TrendingUp, Scale, Trash2 } from "lucide-react";

const FIELDS = [
  { key: "weight_kg", label: "Weight", unit: "kg", step: 0.1 },
  { key: "waist_cm", label: "Waist", unit: "cm", step: 0.5 },
  { key: "chest_cm", label: "Chest", unit: "cm", step: 0.5 },
  { key: "hips_cm", label: "Hips", unit: "cm", step: 0.5 },
  { key: "arms_cm", label: "Arms", unit: "cm", step: 0.5 },
];

export default function Progress() {
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10) });

  const load = async () => {
    const { data } = await api.get("/progress");
    setEntries(data.entries);
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    const payload = { date: form.date };
    FIELDS.forEach(f => { if (form[f.key]) payload[f.key] = +form[f.key]; });
    if (Object.keys(payload).length === 1) return toast.error("Enter at least one measurement");
    try {
      await api.post("/progress", payload);
      toast.success("Progress logged");
      setForm({ date: form.date });
      load();
    } catch { toast.error("Failed to save"); }
  };

  const del = async (id) => {
    await api.delete(`/progress/${id}`);
    load();
  };

  const weightSeries = entries.filter(e => e.weight_kg).map(e => ({ date: e.date, weight: e.weight_kg }));
  const latest = entries[entries.length - 1] || {};
  const first = entries.find(e => e.weight_kg) || {};
  const delta = (latest.weight_kg && first.weight_kg) ? (latest.weight_kg - first.weight_kg).toFixed(1) : "0.0";

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <header className="mb-10">
        <div className="text-[10px] uppercase tracking-widest text-[#CCFF00] mb-2">/ Body Metrics</div>
        <h1 className="font-display text-5xl md:text-6xl">Progress</h1>
        <p className="text-sm text-muted-foreground mt-2">Weight. Measurements. Trends.</p>
      </header>

      <div className="grid lg:grid-cols-12 gap-px bg-border mb-8">
        <div className="lg:col-span-4 bg-card p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Latest Weight</div>
            <Scale className="w-4 h-4 text-[#CCFF00]"/>
          </div>
          <div className="font-display text-5xl">{latest.weight_kg || "—"}<span className="text-muted-foreground text-xl"> kg</span></div>
        </div>
        <div className="lg:col-span-4 bg-card p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Total Change</div>
            <TrendingUp className="w-4 h-4 text-[#CCFF00]"/>
          </div>
          <div className={`font-display text-5xl ${+delta < 0 ? "text-[#CCFF00]" : +delta > 0 ? "text-[#007AFF]" : ""}`}>
            {+delta > 0 ? "+" : ""}{delta}<span className="text-muted-foreground text-xl"> kg</span>
          </div>
        </div>
        <div className="lg:col-span-4 bg-card p-6">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Entries</div>
          <div className="font-display text-5xl">{entries.length}</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-px bg-border mb-8">
        <div className="lg:col-span-8 bg-card p-6">
          <div className="font-heading text-2xl uppercase mb-4">Weight Trend</div>
          {weightSeries.length < 2 ? (
            <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">Log at least 2 entries to see the trend.</div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer>
                <LineChart data={weightSeries}>
                  <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="date" stroke="#888" fontSize={11} />
                  <YAxis stroke="#888" fontSize={11} domain={["dataMin - 1", "dataMax + 1"]}/>
                  <Tooltip contentStyle={{ background: "#0A0A0A", border: "1px solid #CCFF00", borderRadius: 0, fontSize: 12 }} />
                  <Line type="monotone" dataKey="weight" stroke="#CCFF00" strokeWidth={2} dot={{ fill: "#CCFF00", r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        <div className="lg:col-span-4 bg-card p-6">
          <div className="font-heading text-2xl uppercase mb-4">New Entry</div>
          <form onSubmit={submit} className="space-y-3" data-testid="progress-form">
            <label className="block">
              <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground block mb-1">Date</span>
              <input type="date" required value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-[#CCFF00]"/>
            </label>
            {FIELDS.map(f => (
              <label key={f.key} className="block">
                <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground block mb-1">{f.label} ({f.unit})</span>
                <input type="number" step={f.step} value={form[f.key] || ""} onChange={e => setForm({...form, [f.key]: e.target.value})}
                  data-testid={`progress-${f.key}`}
                  className="w-full bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-[#CCFF00]"/>
              </label>
            ))}
            <button data-testid="progress-submit" className="w-full bg-[#CCFF00] text-black py-3 text-xs uppercase tracking-widest font-bold hover:bg-[#B3E600] active:scale-95">Log Entry</button>
          </form>
        </div>
      </div>

      <section className="bg-card border border-border p-6">
        <div className="font-heading text-2xl uppercase mb-4">All Entries</div>
        {entries.length === 0 ? <div className="text-sm text-muted-foreground">No entries yet.</div> : (
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
                {[...entries].reverse().map(e => (
                  <tr key={e.id} className="border-b border-border/50">
                    <td className="py-3">{e.date}</td>
                    <td>{e.weight_kg || "—"}</td>
                    <td>{e.waist_cm || "—"}</td>
                    <td>{e.chest_cm || "—"}</td>
                    <td>{e.arms_cm || "—"}</td>
                    <td className="text-right"><button onClick={() => del(e.id)} data-testid={`del-progress-${e.id}`} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4"/></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
