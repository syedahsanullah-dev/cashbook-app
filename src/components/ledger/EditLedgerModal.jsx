import { useState, useEffect } from "react";
import { db } from "../../firebase/config";
import { doc, updateDoc } from "firebase/firestore";
import toast from "react-hot-toast";

export default function EditLedgerModal({ cashbook, isOpen, onClose }) {
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("PKR");
  const [updating, setUpdating] = useState(false);

  const currencies = ["PKR", "USD", "EUR", "GBP", "INR", "AED", "SAR", "CAD", "AUD"];

  useEffect(() => {
    if (cashbook) {
      setName(cashbook.name || "");
      setCurrency(cashbook.currency || "PKR");
    }
  }, [cashbook]);

  if (!isOpen || !cashbook) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Ledger Name cannot be empty.");
      return;
    }

    setUpdating(true);
    try {
      await updateDoc(doc(db, "cashbooks", cashbook.id), {
        name: name.trim(),
        currency,
      });
      toast.success("Ledger updated!");
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update ledger.");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[1000] flex justify-center items-center p-4">
      <div className="bg-bgCard border border-borderLight rounded-2xl p-6 w-full max-w-md shadow-2xl animate-[slideUp_0.3s_ease-out]">
        
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-h2 m-0 text-lg font-bold">✏️ Edit Ledger</h3>
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
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

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

          <button type="submit" className="btn-primary mt-2" disabled={updating}>
            {updating ? "Saving Changes..." : "Save Changes"}
          </button>
        </form>

      </div>
    </div>
  );
}
