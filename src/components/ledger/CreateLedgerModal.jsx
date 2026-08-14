import { useState } from "react";
import { db } from "../../firebase/config";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

export default function CreateLedgerModal({ isOpen, onClose }) {
  const { currentUser } = useAuth();
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("PKR");
  const [initialBalance, setInitialBalance] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [creating, setCreating] = useState(false);

  if (!isOpen) return null;

  const currencies = ["PKR", "USD", "EUR", "GBP", "INR", "AED", "SAR", "CAD", "AUD"];
  const colors = ["#6366f1", "#00ff73", "#f43f5e", "#a855f7", "#0ea5e9", "#eab308"];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Ledger Name is required.");
      return;
    }

    setCreating(true);
    try {
      const parsedBalance = parseFloat(initialBalance) || 0;
      const initialBalancePaisa = Math.round(parsedBalance * 100);

      await addDoc(collection(db, "cashbooks"), {
        userId: currentUser.uid,
        ownerEmail: currentUser.email?.toLowerCase() || "",
        name: name.trim(),
        currency,
        balance: initialBalancePaisa,
        totalIncome: initialBalancePaisa > 0 ? initialBalancePaisa : 0,
        totalExpense: initialBalancePaisa < 0 ? Math.abs(initialBalancePaisa) : 0,
        color,
        isPinned: false,
        createdAt: serverTimestamp(),
      });

      toast.success("New ledger created!");
      setName("");
      setInitialBalance("");
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to create ledger.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[1000] flex justify-center items-center p-4">
      <div className="bg-bgCard border border-borderLight rounded-2xl p-6 w-full max-w-md shadow-2xl animate-[slideUp_0.3s_ease-out]">
        
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-h2 m-0 text-lg font-bold">📓 Create New Ledger</h3>
          <button onClick={onClose} className="bg-transparent border-none text-2xl text-textMuted cursor-pointer hover:text-white leading-none">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-textMuted uppercase tracking-[0.5px]">Ledger Name</label>
            <input
              type="text"
              className="w-full p-3 rounded-lg border border-borderLight bg-white/5 text-textMain text-sm focus:outline-none focus:border-brandBlue focus:bg-white/10"
              placeholder="E.g., Shop, Home, Personal, Business"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-textMuted uppercase tracking-[0.5px]">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full p-3 rounded-lg border border-borderLight bg-bgMain text-textMain text-sm focus:outline-none focus:border-brandBlue"
              >
                {currencies.map((c) => (
                  <option key={c} value={c} className="bg-bgMain text-white">
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-textMuted uppercase tracking-[0.5px]">Starting Balance</label>
              <input
                type="number"
                step="0.01"
                className="w-full p-3 rounded-lg border border-borderLight bg-white/5 text-textMain text-sm focus:outline-none focus:border-brandBlue focus:bg-white/10"
                placeholder="0.00"
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-textMuted uppercase tracking-[0.5px]">Ledger Tag Color</label>
            <div className="flex gap-2">
              {colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${
                    color === c ? "scale-110 border-white shadow-lg" : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <button type="submit" className="btn-primary mt-2" disabled={creating}>
            {creating ? "Creating Ledger..." : "Create Ledger"}
          </button>
        </form>

      </div>
    </div>
  );
}
