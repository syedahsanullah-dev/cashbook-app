import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase/config";
import { doc, collection, writeBatch, increment, serverTimestamp } from "firebase/firestore";

export default function BulkAdd() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [csvData, setCsvData] = useState("");
  const [status, setStatus] = useState("");

  const handleBulkAdd = async () => {
    if (!csvData.trim()) return;
    setStatus("Processing...");

    try {
      const rows = csvData.split("\n");
      const batch = writeBatch(db);
      const cashbookRef = doc(db, "cashbooks", id);
      
      let netBalanceChange = 0;
      let totalIncomeChange = 0;
      let totalExpenseChange = 0;

      rows.forEach((row) => {
        const [type, amountStr, remarks, category, dateStr] = row.split(",");
        if (!type || !amountStr) return;

        const amount = Math.round(parseFloat(amountStr) * 100);
        const isIncome = type.trim().toUpperCase() === "INCOME";
        const txnDate = dateStr && dateStr.trim() ? dateStr.trim() : new Date().toISOString().slice(0, 16);

        const newTxRef = doc(collection(db, "cashbooks", id, "transactions"));
        batch.set(newTxRef, {
          type: isIncome ? "INCOME" : "EXPENSE",
          amount,
          remarks: remarks ? remarks.trim() : "",
          category: category ? category.trim() : "",
          txnDate,
          createdAt: serverTimestamp()
        });

        if (isIncome) {
          netBalanceChange += amount;
          totalIncomeChange += amount;
        } else {
          netBalanceChange -= amount;
          totalExpenseChange += amount;
        }
      });

      batch.update(cashbookRef, {
        balance: increment(netBalanceChange),
        totalIncome: increment(totalIncomeChange),
        totalExpense: increment(totalExpenseChange)
      });

      await batch.commit();
      setStatus("Success! Transactions added.");
      setCsvData("");
    } catch (err) {
      console.error(err);
      setStatus("Error processing data. Check your format.");
    }
  };

  return (
    <div className="p-5">

      <div className="mb-6">
        <button onClick={() => navigate(`/cashbook/${id}`)} className="bg-transparent border-none text-textMuted text-base font-medium cursor-pointer pr-3 py-2 transition-colors duration-200 hover:text-brandBlue">← Back to Ledger</button>
        <h1 className="text-h1 mt-4">Bulk Add Transactions</h1>
      </div>

      <div className="card">
        <div className="bg-brandBlue/15 border-l-4 border-brandBlue p-3 rounded mb-5">
          <p className="text-sm text-[#c7d2fe] m-0 leading-relaxed">
            <strong>Format:</strong> Type,Amount,Remarks,Category,[Date (Optional)] <br/>
            <em>Example:</em> INCOME,7000,Salary,Business,2026-08-06T14:00 <br/>
            <em>Example:</em> EXPENSE,500,Lunch,Food
          </p>
        </div>

        <textarea 
          className="w-full min-h-[300px] p-4 rounded-lg border border-borderLight bg-white/5 text-textMain font-mono text-sm my-4 resize-y transition-all duration-300 focus:outline-none focus:border-brandBlue focus:bg-white/10 focus:shadow-[0_0_10px_rgba(99,102,241,0.3)]"
          value={csvData} 
          onChange={(e) => setCsvData(e.target.value)}
          placeholder="INCOME,7000,Salary,Business,2026-08-06T14:00&#10;EXPENSE,500,Lunch,Food"
        />

        <button 
          onClick={handleBulkAdd} 
          className="btn-primary w-full text-base"
        >
          {status === "Processing..." ? "Processing..." : "Process & Add All"}
        </button>

        {status && (
          <p className={`mt-4 text-center font-semibold ${status.includes("Error") ? "text-cashOut" : "text-cashIn"}`}>
            {status}
          </p>
        )}
      </div>
    </div>
  );
}