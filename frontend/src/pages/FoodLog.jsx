import { useEffect, useState, useCallback } from "react";
import { api } from "../lib/api";
import { toast } from "sonner";
import { Search, Plus, Trash2, History, X } from "lucide-react";

const CATEGORIES = ["breakfast", "lunch", "dinner", "snacks"];

export default function FoodLog() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [meals, setMeals] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [category, setCategory] = useState("breakfast");

  const load = useCallback(async () => {
    const { data } = await api.get("/meals", { params: { date } });
    setMeals(data.meals);
  }, [date]);

  useEffect(() => { load(); }, [load]);

  const del = async (id) => {
    await api.delete(`/meals/${id}`);
    toast.success("Meal removed");
    load();
  };

  const totals = meals.reduce((acc, m) => ({
    calories: acc.calories + m.calories * (m.servings || 1),
    protein: acc.protein + m.protein * (m.servings || 1),
    carbs: acc.carbs + m.carbs * (m.servings || 1),
    fats: acc.fats + m.fats * (m.servings || 1),
  }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

  const byCat = CATEGORIES.map(cat => ({
    cat, items: meals.filter(m => m.category === cat)
  }));

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <header className="mb-8 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-[#CCFF00] mb-2">/ Nutrition</div>
          <h1 className="font-display text-5xl md:text-6xl">Food Log</h1>
        </div>
        <div className="flex gap-2">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} data-testid="food-date"
            className="bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-[#CCFF00]" />
          <button onClick={() => setShowHistory(true)} data-testid="history-btn"
            className="border border-border px-4 py-2 text-xs uppercase tracking-widest font-bold hover:border-[#CCFF00] hover:text-[#CCFF00] flex items-center gap-2">
            <History className="w-3.5 h-3.5"/> History
          </button>
        </div>
      </header>

      {/* Totals */}
      <div className="grid grid-cols-4 gap-px bg-border mb-8">
        {[
          { label: "Calories", val: Math.round(totals.calories), unit: "kcal" },
          { label: "Protein", val: Math.round(totals.protein), unit: "g" },
          { label: "Carbs", val: Math.round(totals.carbs), unit: "g" },
          { label: "Fats", val: Math.round(totals.fats), unit: "g" },
        ].map((s) => (
          <div key={s.label} className="bg-card p-4 md:p-6">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{s.label}</div>
            <div className="font-display text-3xl md:text-4xl mt-1"><span data-testid={`total-${s.label.toLowerCase()}`}>{s.val}</span><span className="text-muted-foreground text-base"> {s.unit}</span></div>
          </div>
        ))}
      </div>

      <div className="grid gap-px bg-border">
        {byCat.map(({ cat, items }) => (
          <section key={cat} className="bg-card p-6" data-testid={`meal-section-${cat}`}>
            <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
              <div className="font-heading text-2xl uppercase">{cat}</div>
              <button onClick={() => { setCategory(cat); setShowAdd(true); }} data-testid={`add-${cat}`}
                className="flex items-center gap-2 text-xs uppercase tracking-widest font-bold text-[#CCFF00] hover:text-[#B3E600]">
                <Plus className="w-3.5 h-3.5"/> Add Item
              </button>
            </div>
            {items.length === 0 ? (
              <div className="text-sm text-muted-foreground">No items logged.</div>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((m) => (
                  <li key={m.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate">{m.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {m.servings}× {m.serving || ""} · {Math.round(m.protein * m.servings)}P · {Math.round(m.carbs * m.servings)}C · {Math.round(m.fats * m.servings)}F
                      </div>
                    </div>
                    <div className="font-display text-2xl">{Math.round(m.calories * m.servings)}</div>
                    <button onClick={() => del(m.id)} data-testid={`delete-meal-${m.id}`} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-4 h-4"/>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      {showAdd && <AddFoodModal category={category} date={date} onClose={() => setShowAdd(false)} onAdded={load} />}
      {showHistory && <HistoryModal date={date} onClose={() => setShowHistory(false)} onReuse={() => load()} />}
    </div>
  );
}

function AddFoodModal({ category, date, onClose, onAdded }) {
  const [q, setQ] = useState("");
  const [foods, setFoods] = useState([]);
  const [custom, setCustom] = useState([]);
  const [servings, setServings] = useState({});
  const [showCustom, setShowCustom] = useState(false);

  const search = useCallback(async (term) => {
    const { data } = await api.get("/foods/search", { params: { q: term } });
    setFoods(data.foods);
    setCustom(data.custom);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(q), 250);
    return () => clearTimeout(t);
  }, [q, search]);

  const add = async (food) => {
    const s = servings[food.name] || 1;
    await api.post("/meals", { ...food, category, servings: s, date });
    toast.success(`${food.name} logged`);
    onAdded();
    onClose();
  };

  return (
    <Modal title={`Add to ${category}`} onClose={onClose}>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} data-testid="food-search"
          placeholder="Search foods (roti, chicken, oats...)"
          className="w-full bg-background border border-border pl-10 pr-3 py-3 text-sm focus:outline-none focus:border-[#CCFF00]" />
      </div>
      <button onClick={() => setShowCustom(!showCustom)} className="text-xs uppercase tracking-widest font-bold text-[#CCFF00] mb-3">
        {showCustom ? "Hide" : "+ Add Custom Food"}
      </button>
      {showCustom && <CustomFoodForm onCreated={() => { setShowCustom(false); search(q); }} />}

      <div className="max-h-96 overflow-y-auto divide-y divide-border">
        {custom.length > 0 && <div className="py-2 text-[10px] uppercase tracking-widest text-[#CCFF00]">My Custom Foods</div>}
        {custom.map((f) => <FoodRow key={f.id} food={f} servings={servings} setServings={setServings} onAdd={add}/>)}
        {foods.length === 0 && custom.length === 0 && <div className="py-6 text-center text-sm text-muted-foreground">No foods found.</div>}
        {foods.map((f) => <FoodRow key={f.name} food={f} servings={servings} setServings={setServings} onAdd={add}/>)}
      </div>
    </Modal>
  );
}

function FoodRow({ food, servings, setServings, onAdd }) {
  const s = servings[food.name] || 1;
  return (
    <div className="py-3 flex items-center gap-3" data-testid={`food-row-${food.name}`}>
      <div className="flex-1 min-w-0">
        <div className="font-semibold truncate">{food.name}</div>
        <div className="text-xs text-muted-foreground">{food.serving} · {food.calories} kcal · {food.protein}P/{food.carbs}C/{food.fats}F</div>
      </div>
      <input type="number" step="0.5" min="0.25" value={s}
        onChange={(e) => setServings({ ...servings, [food.name]: parseFloat(e.target.value) || 1 })}
        className="w-16 bg-background border border-border px-2 py-1 text-sm" />
      <button onClick={() => onAdd(food)} data-testid={`add-food-${food.name}`}
        className="bg-[#CCFF00] text-black px-3 py-1.5 text-xs uppercase tracking-widest font-bold hover:bg-[#B3E600] active:scale-95">
        Add
      </button>
    </div>
  );
}

function CustomFoodForm({ onCreated }) {
  const [f, setF] = useState({ name: "", serving: "1 serving", calories: 0, protein: 0, carbs: 0, fats: 0 });
  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/foods/custom", { ...f, calories: +f.calories, protein: +f.protein, carbs: +f.carbs, fats: +f.fats });
      toast.success("Custom food saved");
      onCreated();
    } catch { toast.error("Failed to save"); }
  };
  return (
    <form onSubmit={submit} className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4 p-3 border border-border bg-background">
      <input required placeholder="Name" value={f.name} onChange={e => setF({...f, name: e.target.value})} className="col-span-2 md:col-span-3 bg-card border border-border px-3 py-2 text-sm" data-testid="custom-name"/>
      <input placeholder="Serving" value={f.serving} onChange={e => setF({...f, serving: e.target.value})} className="bg-card border border-border px-3 py-2 text-sm"/>
      <input type="number" placeholder="Calories" value={f.calories} onChange={e => setF({...f, calories: e.target.value})} className="bg-card border border-border px-3 py-2 text-sm" data-testid="custom-calories"/>
      <input type="number" placeholder="Protein(g)" value={f.protein} onChange={e => setF({...f, protein: e.target.value})} className="bg-card border border-border px-3 py-2 text-sm"/>
      <input type="number" placeholder="Carbs(g)" value={f.carbs} onChange={e => setF({...f, carbs: e.target.value})} className="bg-card border border-border px-3 py-2 text-sm"/>
      <input type="number" placeholder="Fats(g)" value={f.fats} onChange={e => setF({...f, fats: e.target.value})} className="bg-card border border-border px-3 py-2 text-sm"/>
      <button data-testid="save-custom" className="col-span-2 md:col-span-1 bg-[#CCFF00] text-black px-3 py-2 text-xs uppercase tracking-widest font-bold">Save</button>
    </form>
  );
}

function HistoryModal({ date, onClose, onReuse }) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    api.get("/meals/history", { params: { limit: 50 } }).then(({ data }) => setItems(data.meals));
  }, []);
  const reuse = async (m) => {
    const { name, category, calories, protein, carbs, fats, serving, servings } = m;
    await api.post("/meals", { name, category, calories, protein, carbs, fats, serving, servings, date });
    toast.success(`${name} re-logged`);
    onReuse();
    onClose();
  };
  return (
    <Modal title="Meal History" onClose={onClose}>
      <div className="max-h-96 overflow-y-auto divide-y divide-border">
        {items.length === 0 ? <div className="py-6 text-center text-sm text-muted-foreground">No past meals yet.</div> :
          items.map((m) => (
            <div key={m.id} className="py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{m.name}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-widest">{m.date} · {m.category} · {Math.round(m.calories * m.servings)} kcal</div>
              </div>
              <button onClick={() => reuse(m)} data-testid={`reuse-${m.id}`} className="bg-[#CCFF00] text-black px-3 py-1.5 text-xs uppercase tracking-widest font-bold">Repeat</button>
            </div>
          ))
        }
      </div>
    </Modal>
  );
}

export function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="font-heading text-2xl uppercase">{title}</div>
          <button onClick={onClose} data-testid="modal-close" className="hover:text-[#CCFF00]"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
