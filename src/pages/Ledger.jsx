import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase/config";
import { doc, collection, query, orderBy, onSnapshot, writeBatch, serverTimestamp, increment } from "firebase/firestore";
import LedgerHeader from "../components/ledger/LedgerHeader";
import CategoryManager from "../components/ledger/CategoryManager";
import TransactionForm from "../components/ledger/TransactionForm";
import FilterBar from "../components/ledger/FilterBar";
import TransactionList from "../components/ledger/TransactionList";
import LedgerInsights from "../components/ledger/LedgerInsights"; 
import BalanceTrendChart from "../components/ledger/BalanceTrendChart";
import DueForm from "../components/ledger/DueForm";
import DueList from "../components/ledger/DueList";
import ConfirmModal from "../components/ConfirmModal";
import LoadingScreen from "../components/LoadingScreen";
import toast from "react-hot-toast";

export default function Ledger() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // Core State
  const [cashbook, setCashbook] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [dues, setDues] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("TRANSACTIONS");

  // Form State
  const [type, setType] = useState("INCOME");
  const [amount, setAmount] = useState("");
  const [remarks, setRemarks] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [txnDate, setTxnDate] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [receiptBase64, setReceiptBase64] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  // Form UI State
  const [showForm, setShowForm] = useState(false); 
  const [showCharts, setShowCharts] = useState(true);
  const [modalConfig, setModalConfig] = useState({ isOpen: false, type: "confirm", message: "", onConfirm: null });

  // Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  useEffect(() => {
    if (!currentUser) return;

    const unsubCashbook = onSnapshot(doc(db, "cashbooks", id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const isOwner = data.userId === currentUser.uid;
        const isShared = data.sharedUids && data.sharedUids.includes(currentUser.uid);
        if (isOwner || isShared) {
          setCashbook({ id: docSnap.id, ...data });
          setError("");
        } else {
          setError("Cashbook not found or access denied!");
          setCashbook(null);
        }
      } else {
        setError("Cashbook not found!");
        setCashbook(null);
      }
    });

    const unsubTransactions = onSnapshot(query(collection(db, "cashbooks", id, "transactions"), orderBy("createdAt", "desc")), (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    const unsubCategories = onSnapshot(collection(db, "cashbooks", id, "categories"), (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubDues = onSnapshot(query(collection(db, "cashbooks", id, "dues"), orderBy("dueDate", "asc")), (snapshot) => {
      setDues(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubCashbook(); unsubTransactions(); unsubCategories(); unsubDues(); };
  }, [id, currentUser]);

  // Auto-backfill txnDate for old transactions missing txnDate
  useEffect(() => {
    if (!transactions || transactions.length === 0 || !currentUser) return;
    const missing = transactions.filter(tx => !tx.txnDate && tx.createdAt);
    if (missing.length === 0) return;

    const backfill = async () => {
      try {
        const batch = writeBatch(db);
        let count = 0;
        missing.forEach(tx => {
          if (tx.createdAt?.toDate) {
            const d = tx.createdAt.toDate();
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            const formattedDate = `${year}-${month}-${day}T${hours}:${minutes}`;
            batch.update(doc(db, "cashbooks", id, "transactions", tx.id), {
              txnDate: formattedDate
            });
            count++;
          }
        });
        if (count > 0) {
          await batch.commit();
          toast.success(`Updated ${count} old transaction(s) with Date & Time!`);
        }
      } catch (err) {
        console.error("Failed to backfill txnDate:", err);
      }
    };
    backfill();
  }, [transactions, id, currentUser]);

  const handleSubmitTransaction = async (e) => {
    e.preventDefault();
    setError("");
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Invalid amount.");
      return;
    }

    setSaving(true);
    try {
      const amountInPaisa = Math.round(parsedAmount * 100);
      const batch = writeBatch(db);
      const cashbookRef = doc(db, "cashbooks", id);

      if (activeTab === "TRANSACTIONS") {
        const finalTxnDate = txnDate || new Date().toISOString().slice(0, 16);
        if (editingId) {
          const oldTx = transactions.find(t => t.id === editingId);
          const oldImpact = oldTx.type === "INCOME" ? oldTx.amount : -oldTx.amount;
          const newImpact = type === "INCOME" ? amountInPaisa : -amountInPaisa;
          
          let incomeChange = 0; let expenseChange = 0;
          if (oldTx.type === type) {
            if (type === "INCOME") incomeChange = amountInPaisa - oldTx.amount;
            if (type === "EXPENSE") expenseChange = amountInPaisa - oldTx.amount;
          } else {
            if (oldTx.type === "INCOME") { incomeChange = -oldTx.amount; expenseChange = amountInPaisa; } 
            else { expenseChange = -oldTx.amount; incomeChange = amountInPaisa; }
          }

          batch.update(doc(db, "cashbooks", id, "transactions", editingId), { 
            type, 
            amount: amountInPaisa, 
            remarks: remarks.trim(), 
            txnDate: finalTxnDate,
            category: selectedCategory,
            receiptBase64
          });
          batch.update(cashbookRef, { balance: increment(newImpact - oldImpact), totalIncome: increment(incomeChange), totalExpense: increment(expenseChange) });
        } else {
          const newTxRef = doc(collection(db, "cashbooks", id, "transactions"));
          batch.set(newTxRef, { 
            type, 
            amount: amountInPaisa, 
            remarks: remarks.trim(), 
            txnDate: finalTxnDate,
            category: selectedCategory, 
            receiptBase64,
            createdAt: serverTimestamp() 
          });
          batch.update(cashbookRef, { 
            balance: increment(type === "INCOME" ? amountInPaisa : -amountInPaisa), 
            totalIncome: increment(type === "INCOME" ? amountInPaisa : 0), 
            totalExpense: increment(type === "EXPENSE" ? amountInPaisa : 0) 
          });
        }
      } else {
        // DUES Tab Logic
        if (editingId) {
          batch.update(doc(db, "cashbooks", id, "dues", editingId), { 
            type, 
            amount: amountInPaisa, 
            remarks: remarks.trim(), 
            dueDate,
            category: selectedCategory,
            receiptBase64
          });
        } else {
          const newDueRef = doc(collection(db, "cashbooks", id, "dues"));
          batch.set(newDueRef, { 
            type, 
            amount: amountInPaisa, 
            remarks: remarks.trim(), 
            dueDate,
            category: selectedCategory, 
            receiptBase64,
            createdAt: serverTimestamp(),
            status: "PENDING"
          });
        }
      }

      await batch.commit();
      toast.success(editingId ? "Entry updated!" : "Entry saved!");
      cancelEdit();
    } catch (err) {
      console.error(err); 
      toast.error("Failed to save entry.");
    } finally { setSaving(false); }
  };

  const handleDelete = (item) => {
    setModalConfig({
      isOpen: true,
      type: "confirm",
      message: "Are you sure you want to delete this entry?",
      onConfirm: async () => {
        try {
          const batch = writeBatch(db);
          if (activeTab === "TRANSACTIONS") {
            batch.delete(doc(db, "cashbooks", id, "transactions", item.id));
            batch.update(doc(db, "cashbooks", id), { 
              balance: increment(item.type === "INCOME" ? -item.amount : item.amount),
              totalIncome: increment(item.type === "INCOME" ? -item.amount : 0),
              totalExpense: increment(item.type === "EXPENSE" ? -item.amount : 0)
            });
          } else {
            batch.delete(doc(db, "cashbooks", id, "dues", item.id));
          }
          await batch.commit();
          toast.success("Deleted successfully.");
        } catch (err) { 
          console.error(err); 
          toast.error("Failed to delete."); 
        }
      }
    });
  };

  const handleMarkAsPaid = (due) => {
    setModalConfig({
      isOpen: true,
      type: "confirm",
      message: "Mark this as paid? It will be added to your regular transactions.",
      onConfirm: async () => {
        try {
          const batch = writeBatch(db);
          
          const newTxRef = doc(collection(db, "cashbooks", id, "transactions"));
          const isCredit = due.type === "CREDIT";
          const nowIso = new Date().toISOString().slice(0, 16);
          
          batch.set(newTxRef, {
            type: isCredit ? "INCOME" : "EXPENSE",
            amount: due.amount,
            remarks: due.remarks,
            category: due.category || "",
            receiptBase64: due.receiptBase64 || "",
            txnDate: due.dueDate ? `${due.dueDate}T12:00` : nowIso,
            createdAt: serverTimestamp()
          });

          batch.update(doc(db, "cashbooks", id), {
            balance: increment(isCredit ? due.amount : -due.amount),
            totalIncome: increment(isCredit ? due.amount : 0),
            totalExpense: increment(isCredit ? 0 : due.amount)
          });

          batch.delete(doc(db, "cashbooks", id, "dues", due.id));

          await batch.commit();
          toast.success("Marked as paid!");
        } catch (err) {
          console.error(err);
          toast.error("Failed to mark as paid.");
        }
      }
    });
  };

  const handleEditClick = (item) => {
    setEditingId(item.id); 
    setType(item.type); 
    setAmount((item.amount / 100).toString()); 
    setRemarks(item.remarks); 
    if (activeTab === "DUES") {
      setDueDate(item.dueDate || "");
    } else {
      if (item.txnDate) {
        setTxnDate(item.txnDate);
      } else if (item.createdAt) {
        const d = item.createdAt.toDate();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        setTxnDate(`${year}-${month}-${day}T${hours}:${minutes}`);
      } else {
        setTxnDate("");
      }
    }
    setSelectedCategory(item.category || ""); 
    setReceiptBase64(item.receiptBase64 || "");
    setShowForm(true); 
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null); 
    setAmount(""); 
    setRemarks(""); 
    setDueDate("");
    setTxnDate("");
    setSelectedCategory(""); 
    setType(activeTab === "TRANSACTIONS" ? "INCOME" : "CREDIT"); 
    setReceiptBase64(""); 
    setError("");
    setShowForm(false); 
  };

  const handleExportJSON = () => {
    const exportData = {
      transactions: transactions.map(tx => ({
        ...tx,
        amount: tx.amount / 100,
        txnDate: tx.txnDate || null,
        createdAt: tx.createdAt ? tx.createdAt.toDate().toISOString() : null,
      })),
      dues: dues.map(d => ({
        ...d,
        amount: d.amount / 100,
        createdAt: d.createdAt ? d.createdAt.toDate().toISOString() : null,
      }))
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${cashbook?.name || 'ledger'}_export.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    toast.success("Export successful!");
  };

  const sortedTransactions = [...transactions].sort((a, b) => {
    const timeA = a.txnDate ? new Date(a.txnDate).getTime() : (a.createdAt?.toMillis() || 0);
    const timeB = b.txnDate ? new Date(b.txnDate).getTime() : (b.createdAt?.toMillis() || 0);
    return timeB - timeA;
  });

  const filteredTransactions = sortedTransactions.filter(tx => {
    let match = true;
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      const matchRemarks = tx.remarks ? tx.remarks.toLowerCase().includes(q) : false;
      const matchCategory = tx.category ? tx.category.toLowerCase().includes(q) : false;
      const matchAmount = (tx.amount / 100).toString().includes(q);
      const matchTxnDate = tx.txnDate ? tx.txnDate.toLowerCase().includes(q) : false;
      if (!matchRemarks && !matchCategory && !matchAmount && !matchTxnDate) match = false;
    }
    if (filterType !== "ALL" && tx.type !== filterType) match = false;
    if (filterCategory !== "ALL" && tx.category !== filterCategory) match = false;
    if (filterCategory === "Uncategorized" && tx.category) match = false;

    const txDate = tx.txnDate ? new Date(tx.txnDate) : (tx.createdAt ? tx.createdAt.toDate() : null);
    if (txDate) {
      const startDate = filterStartDate ? new Date(filterStartDate + "T00:00:00") : null;
      const endDate = filterEndDate ? new Date(filterEndDate + "T23:59:59") : (filterStartDate ? new Date(filterStartDate + "T23:59:59") : null);
      if (startDate && txDate < startDate) match = false;
      if (endDate && txDate > endDate) match = false;
    }
    return match;
  });

  const filteredDues = dues.filter(tx => {
    let match = true;
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      const matchRemarks = tx.remarks ? tx.remarks.toLowerCase().includes(q) : false;
      const matchCategory = tx.category ? tx.category.toLowerCase().includes(q) : false;
      const matchAmount = (tx.amount / 100).toString().includes(q);
      const matchDueDate = tx.dueDate ? tx.dueDate.toLowerCase().includes(q) : false;
      if (!matchRemarks && !matchCategory && !matchAmount && !matchDueDate) match = false;
    }
    if (filterType !== "ALL" && tx.type !== filterType) match = false;
    if (filterCategory !== "ALL" && tx.category !== filterCategory) match = false;
    if (filterCategory === "Uncategorized" && tx.category) match = false;

    const txDate = tx.dueDate ? new Date(tx.dueDate + "T00:00:00") : (tx.createdAt ? tx.createdAt.toDate() : null);
    if (txDate) {
      const startDate = filterStartDate ? new Date(filterStartDate + "T00:00:00") : null;
      const endDate = filterEndDate ? new Date(filterEndDate + "T23:59:59") : (filterStartDate ? new Date(filterStartDate + "T23:59:59") : null);
      if (startDate && txDate < startDate) match = false;
      if (endDate && txDate > endDate) match = false;
    }
    return match;
  });

  const isFilterActive = searchQuery || filterType !== "ALL" || filterCategory !== "ALL" || filterStartDate || filterEndDate;

  // Compute permissions for current user
  const isOwner = cashbook?.userId === currentUser?.uid;
  const userEmailKey = currentUser?.email?.toLowerCase().replace(/\./g, "_dot_");
  const collaboratorData = cashbook?.sharedWith ? cashbook.sharedWith[userEmailKey] : null;

  const permissions = isOwner
    ? { isOwner: true, canAdd: true, canEdit: true, canDelete: true, role: "OWNER" }
    : collaboratorData
    ? {
        isOwner: false,
        canAdd: collaboratorData.role === "CAN_VIEW" ? false : (collaboratorData.role === "CAN_EDIT" ? true : Boolean(collaboratorData.permissions?.canAdd)),
        canEdit: collaboratorData.role === "CAN_VIEW" ? false : (collaboratorData.role === "CAN_EDIT" ? true : Boolean(collaboratorData.permissions?.canEdit)),
        canDelete: collaboratorData.role === "CAN_VIEW" ? false : (collaboratorData.role === "CAN_EDIT" ? true : Boolean(collaboratorData.permissions?.canDelete)),
        role: collaboratorData.role
      }
    : { isOwner: false, canAdd: false, canEdit: false, canDelete: false, role: "CAN_VIEW" };

  if (loading) return <LoadingScreen message="Loading cashbook transactions..." />;
  if (error && !cashbook) return <div className="p-10 text-center text-cashOut">{error}</div>;

  return (
    <div className="pb-[100px] relative min-h-screen">
      <ConfirmModal 
        isOpen={modalConfig.isOpen} 
        type={modalConfig.type} 
        message={modalConfig.message} 
        onConfirm={modalConfig.onConfirm} 
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })} 
      />
      
      <LedgerHeader cashbook={cashbook} currentUser={currentUser} dues={dues} onBack={() => navigate("/dashboard")} onExportJSON={handleExportJSON} />
      
      <CategoryManager 
        cashbookId={id} categories={categories} 
        show={showCategoryManager} onClose={() => setShowCategoryManager(false)} 
      />
      
      <div className="px-4">
        
        {/* Tab Toggle & Chart Toggle */}
        <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
          <div className="flex gap-2">
            <button 
              className={`px-3 py-2 rounded-lg border border-brandBlue font-semibold cursor-pointer text-[13px] transition-all duration-300 hover:bg-brandBlue/20 hover:shadow-[0_0_10px_rgba(99,102,241,0.4)] hover:text-white ${activeTab === 'TRANSACTIONS' ? 'bg-brandBlue/20 text-white shadow-[0_0_10px_rgba(99,102,241,0.4)]' : 'text-[#a5b4fc] bg-brandBlue/10'}`}
              onClick={() => { setActiveTab('TRANSACTIONS'); setType('INCOME'); setShowForm(false); setFilterType('ALL'); }}
            >
              Transactions
            </button>
            <button 
              className={`px-3 py-2 rounded-lg border border-brandBlue font-semibold cursor-pointer text-[13px] transition-all duration-300 hover:bg-brandBlue/20 hover:shadow-[0_0_10px_rgba(99,102,241,0.4)] hover:text-white ${activeTab === 'DUES' ? 'bg-brandBlue/20 text-white shadow-[0_0_10px_rgba(99,102,241,0.4)]' : 'text-[#a5b4fc] bg-brandBlue/10'}`}
              onClick={() => { setActiveTab('DUES'); setType('CREDIT'); setShowForm(false); setFilterType('ALL'); }}
            >
              Accounts Receivable / Payable
            </button>
          </div>

          <button 
            onClick={() => setShowCharts(!showCharts)}
            className="px-3 py-2 rounded-lg border border-brandBlue text-[#a5b4fc] bg-brandBlue/10 font-semibold cursor-pointer text-[13px] transition-all duration-300 hover:bg-brandBlue/20 hover:text-white flex items-center gap-1.5 ml-auto"
            title={showCharts ? "Hide Graphs" : "Show Graphs"}
          >
            <span className="text-base font-bold leading-none">{showCharts ? "−" : "+"}</span>
            <span>{showCharts ? "Hide Graphs" : "Show Graphs"}</span>
          </button>
        </div>

        {activeTab === "TRANSACTIONS" ? (
          <>
            <TransactionForm 
              type={type} setType={setType} amount={amount} setAmount={setAmount} 
              remarks={remarks} setRemarks={setRemarks}
              txnDate={txnDate} setTxnDate={setTxnDate}
              selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory}
              receiptBase64={receiptBase64} setReceiptBase64={setReceiptBase64}
              categories={categories} saving={saving} error={error} editingId={editingId} 
              onSubmit={handleSubmitTransaction} onCancel={cancelEdit} onToggleCategoryManager={() => setShowCategoryManager(!showCategoryManager)}
              showForm={showForm} setShowForm={setShowForm} permissions={permissions}
            />

            {showCharts && (
              <div className="animate-[fadeIn_0.3s_ease-out]">
                <BalanceTrendChart transactions={filteredTransactions} currency={cashbook.currency} />
                <LedgerInsights data={filteredTransactions} currency={cashbook.currency} filterType="INCOME" title="Income Breakdown" />
                <LedgerInsights data={filteredTransactions} currency={cashbook.currency} filterType="EXPENSE" title="Expense Breakdown" />
              </div>
            )}

            <FilterBar 
              mode="TRANSACTIONS"
              searchQuery={searchQuery} setSearchQuery={setSearchQuery}
              filterType={filterType} setFilterType={setFilterType} filterCategory={filterCategory} setFilterCategory={setFilterCategory}
              filterStartDate={filterStartDate} setFilterStartDate={setFilterStartDate} filterEndDate={filterEndDate} setFilterEndDate={setFilterEndDate}
              categories={categories} isFilterActive={isFilterActive}
              filteredIncome={filteredTransactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0)}
              filteredExpense={filteredTransactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0)}
              resultCount={filteredTransactions.length} currency={cashbook.currency}
            />

            <TransactionList 
              transactions={filteredTransactions} currency={cashbook.currency} permissions={permissions}
              onEdit={handleEditClick} onDelete={handleDelete} 
            />
          </>
        ) : (
          <>
            <DueForm 
              type={type} setType={setType} amount={amount} setAmount={setAmount} 
              dueDate={dueDate} setDueDate={setDueDate}
              remarks={remarks} setRemarks={setRemarks} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory}
              receiptBase64={receiptBase64} setReceiptBase64={setReceiptBase64}
              categories={categories} saving={saving} error={error} editingId={editingId} 
              onSubmit={handleSubmitTransaction} onCancel={cancelEdit} onToggleCategoryManager={() => setShowCategoryManager(!showCategoryManager)}
              showForm={showForm} setShowForm={setShowForm} permissions={permissions}
            />

            {showCharts && (
              <div className="animate-[fadeIn_0.3s_ease-out]">
                <LedgerInsights data={filteredDues} currency={cashbook.currency} filterType="CREDIT" title="Receivable Breakdown" />
                <LedgerInsights data={filteredDues} currency={cashbook.currency} filterType="DEBIT" title="Payable Breakdown" />
              </div>
            )}

            <FilterBar 
              mode="DUES"
              searchQuery={searchQuery} setSearchQuery={setSearchQuery}
              filterType={filterType} setFilterType={setFilterType} filterCategory={filterCategory} setFilterCategory={setFilterCategory}
              filterStartDate={filterStartDate} setFilterStartDate={setFilterStartDate} filterEndDate={filterEndDate} setFilterEndDate={setFilterEndDate}
              categories={categories} isFilterActive={isFilterActive}
              filteredIncome={filteredDues.filter(t => t.type === 'CREDIT').reduce((s, t) => s + t.amount, 0)}
              filteredExpense={filteredDues.filter(t => t.type === 'DEBIT').reduce((s, t) => s + t.amount, 0)}
              resultCount={filteredDues.length} currency={cashbook.currency}
            />

            <DueList 
              dues={filteredDues} currency={cashbook.currency} permissions={permissions}
              onEdit={handleEditClick} onDelete={handleDelete} onMarkAsPaid={handleMarkAsPaid}
            />
          </>
        )}
        
      </div>
    </div>
  );
};