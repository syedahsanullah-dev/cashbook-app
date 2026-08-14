import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase/config";
import { collection, query, where, onSnapshot, doc, getDocs, deleteDoc, writeBatch, serverTimestamp, increment, addDoc, or } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import ConfirmModal from "../components/ConfirmModal";
import EditLedgerModal from "../components/ledger/EditLedgerModal";
import ShareLedgerModal from "../components/ledger/ShareLedgerModal";
import toast from "react-hot-toast";

export default function ManageLedgers() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [cashbooks, setCashbooks] = useState([]);
  const [modalConfig, setModalConfig] = useState({ isOpen: false, type: "confirm", message: "", onConfirm: null });
  const [editingBook, setEditingBook] = useState(null);
  const [sharingBook, setSharingBook] = useState(null);
  const [importing, setImporting] = useState(false);

  const bulkImportRef = useRef(null);
  const singleImportRef = useRef(null);
  const [targetImportBook, setTargetImportBook] = useState(null);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, "cashbooks"),
      or(
        where("userId", "==", currentUser.uid),
        where("sharedUids", "array-contains", currentUser.uid)
      )
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const booksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const sortedBooks = booksData.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        const dateA = a.createdAt?.toMillis() || 0;
        const dateB = b.createdAt?.toMillis() || 0;
        return dateB - dateA;
      });
      setCashbooks(sortedBooks);
    });
    return unsubscribe;
  }, [currentUser]);

  // --- DEEP COPY / DUPLICATE LEDGER ---
  const handleDuplicateLedger = async (book) => {
    try {
      setImporting(true);
      toast.loading("Duplicating ledger and all subcollections...", { id: "dup" });

      // 1. Create cloned cashbook doc
      const newBookRef = await addDoc(collection(db, "cashbooks"), {
        userId: currentUser.uid,
        ownerEmail: currentUser.email?.toLowerCase() || "",
        name: `[Copy] ${book.name}`,
        currency: book.currency || "PKR",
        balance: book.balance || 0,
        totalIncome: book.totalIncome || 0,
        totalExpense: book.totalExpense || 0,
        color: book.color || "#6366f1",
        isPinned: false,
        createdAt: serverTimestamp(),
      });

      // 2. Clone transactions
      const txSnap = await getDocs(collection(db, "cashbooks", book.id, "transactions"));
      for (const tDoc of txSnap.docs) {
        await addDoc(collection(db, "cashbooks", newBookRef.id, "transactions"), {
          ...tDoc.data()
        });
      }

      // 3. Clone dues
      const duesSnap = await getDocs(collection(db, "cashbooks", book.id, "dues"));
      for (const dDoc of duesSnap.docs) {
        await addDoc(collection(db, "cashbooks", newBookRef.id, "dues"), {
          ...dDoc.data()
        });
      }

      // 4. Clone categories
      const catSnap = await getDocs(collection(db, "cashbooks", book.id, "categories"));
      for (const cDoc of catSnap.docs) {
        await addDoc(collection(db, "cashbooks", newBookRef.id, "categories"), {
          ...cDoc.data()
        });
      }

      toast.success(`Duplicated "${book.name}" successfully!`, { id: "dup" });
    } catch (err) {
      console.error(err);
      toast.error("Failed to duplicate ledger.", { id: "dup" });
    } finally {
      setImporting(false);
    }
  };

  // --- EXPORT LOGIC ---
  const downloadJSON = (data, filename) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleBulkExport = async () => {
    try {
      const exportData = [];
      for (const book of cashbooks) {
        const txSnapshot = await getDocs(collection(db, "cashbooks", book.id, "transactions"));
        const transactions = txSnapshot.docs.map(d => {
          const data = d.data();
          return {
            ...data,
            createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
          };
        });

        const duesSnapshot = await getDocs(collection(db, "cashbooks", book.id, "dues"));
        const dues = duesSnapshot.docs.map(d => {
          const data = d.data();
          return {
            ...data,
            createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
          };
        });

        exportData.push({ ...book, transactions, dues });
      }
      downloadJSON(exportData, `all_ledgers_export_${new Date().toISOString().slice(0,10)}.json`);
      toast.success("Bulk export successful!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to export all ledgers.");
    }
  };

  const handleSingleExport = async (book) => {
    try {
      const txSnapshot = await getDocs(collection(db, "cashbooks", book.id, "transactions"));
      const transactions = txSnapshot.docs.map(d => {
        const data = d.data();
        return {
          ...data,
          createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
        };
      });

      const duesSnapshot = await getDocs(collection(db, "cashbooks", book.id, "dues"));
      const dues = duesSnapshot.docs.map(d => {
        const data = d.data();
        return {
          ...data,
          createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
        };
      });

      downloadJSON({ ...book, transactions, dues }, `${book.name.replace(/\s+/g, '_')}_export.json`);
      toast.success("Export successful!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to export ledger.");
    }
  };

  // --- IMPORT LOGIC ---
  const handleBulkImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!Array.isArray(data)) {
          toast.error("Invalid format for bulk import. Expected an array of ledgers.");
          setImporting(false);
          return;
        }

        for (const book of data) {
          const { transactions, id, ...bookData } = book;
          const newBookRef = await addDoc(collection(db, "cashbooks"), {
            ...bookData,
            userId: currentUser.uid,
            createdAt: serverTimestamp()
          });

          if (transactions && Array.isArray(transactions)) {
            for (const tx of transactions) {
              const { id: txId, createdAt, ...txData } = tx;
              let parsedDate = serverTimestamp();
              if (createdAt) {
                const dateObj = new Date(createdAt);
                if (!isNaN(dateObj)) parsedDate = dateObj;
              }
              await addDoc(collection(db, "cashbooks", newBookRef.id, "transactions"), {
                ...txData,
                createdAt: parsedDate
              });
            }
          }

          if (book.dues && Array.isArray(book.dues)) {
            for (const due of book.dues) {
              const { id: dueId, createdAt, ...dueData } = due;
              let parsedDate = serverTimestamp();
              if (createdAt) {
                const dateObj = new Date(createdAt);
                if (!isNaN(dateObj)) parsedDate = dateObj;
              }
              await addDoc(collection(db, "cashbooks", newBookRef.id, "dues"), {
                ...dueData,
                createdAt: parsedDate
              });
            }
          }
        }
        toast.success("Bulk import completed!");
      } catch (err) {
        console.error(err);
        toast.error("Failed to parse or import data.");
      } finally {
        setImporting(false);
        if (bulkImportRef.current) bulkImportRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  const handleSingleImportClick = (book) => {
    setTargetImportBook(book);
    if (singleImportRef.current) singleImportRef.current.click();
  };

  const handleSingleImport = async (event) => {
    const file = event.target.files[0];
    if (!file || !targetImportBook) return;
    
    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);
        let transactionsToImport = [];
        let duesToImport = [];
        
        if (Array.isArray(data)) {
          toast.error("This looks like a bulk export file. Please use Bulk Import.");
          setImporting(false);
          return;
        } else if (data.transactions && Array.isArray(data.transactions)) {
          transactionsToImport = data.transactions;
          if (data.dues && Array.isArray(data.dues)) duesToImport = data.dues;
        } else {
           toast.error("Invalid file format. Expected a single ledger export file.");
           setImporting(false);
           return;
        }

        let newTotalIncome = 0;
        let newTotalExpense = 0;

        for (const tx of transactionsToImport) {
          const { id: txId, createdAt, ...txData } = tx;
          if (txData.type === 'INCOME') newTotalIncome += txData.amount;
          if (txData.type === 'EXPENSE') newTotalExpense += txData.amount;

          let parsedDate = serverTimestamp();
          if (createdAt) {
            const dateObj = new Date(createdAt);
            if (!isNaN(dateObj)) parsedDate = dateObj;
          }
          await addDoc(collection(db, "cashbooks", targetImportBook.id, "transactions"), {
            ...txData,
            createdAt: parsedDate
          });
        }

        for (const due of duesToImport) {
          const { id: dueId, createdAt, ...dueData } = due;
          let parsedDate = serverTimestamp();
          if (createdAt) {
            const dateObj = new Date(createdAt);
            if (!isNaN(dateObj)) parsedDate = dateObj;
          }
          await addDoc(collection(db, "cashbooks", targetImportBook.id, "dues"), {
            ...dueData,
            createdAt: parsedDate
          });
        }
        
        const netChange = newTotalIncome - newTotalExpense;
        const batch = writeBatch(db);
        batch.update(doc(db, "cashbooks", targetImportBook.id), {
          balance: increment(netChange),
          totalIncome: increment(newTotalIncome),
          totalExpense: increment(newTotalExpense)
        });
        await batch.commit();

        toast.success("Imported transactions successfully!");
      } catch (err) {
        console.error(err);
        toast.error("Failed to parse or import data.");
      } finally {
        setImporting(false);
        setTargetImportBook(null);
        if (singleImportRef.current) singleImportRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  const handleDelete = (bookId, bookName) => {
    setModalConfig({
      isOpen: true,
      type: "confirm",
      message: `Are you sure you want to delete the ledger "${bookName}"? This will permanently delete all transactions and categories inside it.`,
      onConfirm: async () => {
        try {
          const txSnapshot = await getDocs(collection(db, "cashbooks", bookId, "transactions"));
          await Promise.all(txSnapshot.docs.map(d => deleteDoc(d.ref)));

          const duesSnapshot = await getDocs(collection(db, "cashbooks", bookId, "dues"));
          await Promise.all(duesSnapshot.docs.map(d => deleteDoc(d.ref)));

          const catSnapshot = await getDocs(collection(db, "cashbooks", bookId, "categories"));
          await Promise.all(catSnapshot.docs.map(d => deleteDoc(d.ref)));

          await deleteDoc(doc(db, "cashbooks", bookId));
          toast.success("Ledger deleted.");
        } catch (err) {
          console.error(err);
          toast.error("Failed to delete the ledger.");
        }
      }
    });
  };

  const handleBackfillAllTransactions = async () => {
    try {
      setImporting(true);
      let totalUpdated = 0;
      for (const book of cashbooks) {
        const txSnapshot = await getDocs(collection(db, "cashbooks", book.id, "transactions"));
        const batch = writeBatch(db);
        let batchCount = 0;

        txSnapshot.docs.forEach(docSnap => {
          const data = docSnap.data();
          if (!data.txnDate && data.createdAt) {
            const d = data.createdAt.toDate();
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            const formattedDate = `${year}-${month}-${day}T${hours}:${minutes}`;
            batch.update(doc(db, "cashbooks", book.id, "transactions", docSnap.id), {
              txnDate: formattedDate
            });
            batchCount++;
          }
        });

        if (batchCount > 0) {
          await batch.commit();
          totalUpdated += batchCount;
        }
      }
      if (totalUpdated > 0) {
        toast.success(`Successfully updated ${totalUpdated} old transaction(s) across ledgers!`);
      } else {
        toast.success("All transactions already have Date & Time set!");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to backfill transactions.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="p-5 max-w-6xl mx-auto">

      <ConfirmModal 
        isOpen={modalConfig.isOpen} 
        type={modalConfig.type} 
        message={modalConfig.message} 
        onConfirm={modalConfig.onConfirm} 
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })} 
      />

      <EditLedgerModal 
        cashbook={editingBook} 
        isOpen={Boolean(editingBook)} 
        onClose={() => setEditingBook(null)} 
      />

      <ShareLedgerModal 
        cashbook={sharingBook} 
        isOpen={Boolean(sharingBook)} 
        onClose={() => setSharingBook(null)} 
      />

      {/* Hidden file inputs for import */}
      <input type="file" accept=".json" ref={bulkImportRef} style={{ display: 'none' }} onChange={handleBulkImport} />
      <input type="file" accept=".json" ref={singleImportRef} style={{ display: 'none' }} onChange={handleSingleImport} />

      <div className="mb-6 flex justify-between items-end flex-wrap gap-4">
        <div>
          <button onClick={() => navigate("/dashboard")} className="bg-transparent border-none text-textMuted text-base font-medium cursor-pointer pr-3 py-2 transition-colors duration-200 hover:text-brandBlue">← Back to Dashboard</button>
          <h1 className="text-h1 mt-4">Manage Ledgers</h1>
          <p className="text-muted">Rename, duplicate, open, share, or delete ledgers.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={handleBackfillAllTransactions} className="px-3 py-2 rounded-lg border border-brandBlue text-[#a5b4fc] bg-brandBlue/10 font-semibold cursor-pointer text-[13px] transition-all duration-300 hover:bg-brandBlue/20 hover:text-white" disabled={importing}>⚡ Backfill Old Dates</button>
          <button onClick={handleBulkExport} className="px-3 py-2 rounded-lg border border-brandBlue text-[#a5b4fc] bg-brandBlue/10 font-semibold cursor-pointer text-[13px] transition-all duration-300 hover:bg-brandBlue/20 hover:text-white" disabled={importing}>Bulk Export</button>
          <button onClick={() => bulkImportRef.current?.click()} className="px-3 py-2 rounded-lg border border-brandBlue text-[#a5b4fc] bg-brandBlue/10 font-semibold cursor-pointer text-[13px] transition-all duration-300 hover:bg-brandBlue/20 hover:text-white" disabled={importing}>Bulk Import</button>
        </div>
      </div>

      {importing && <div className="text-brandBlue mb-4 font-semibold">Processing action, please wait...</div>}

      <div className="grid gap-4">
        {cashbooks.map(book => {
          const isOwner = book.userId === currentUser?.uid;

          return (
            <div key={book.id} className="card flex justify-between items-center flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-base text-textMain">{book.name}</span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${isOwner ? 'bg-brandBlue/20 text-brandBlue border-brandBlue/40' : 'bg-green-500/20 text-green-300 border-green-500/40'}`}>
                  {isOwner ? '👑 Owner' : '👥 Shared'}
                </span>
              </div>

              <div className="flex gap-2 flex-wrap justify-end">
                <button 
                  onClick={() => navigate(`/cashbook/${book.id}`)}
                  className="px-3 py-2 rounded-lg bg-brandBlue text-white font-semibold cursor-pointer text-[13px] transition-all hover:bg-blue-800"
                  disabled={importing}
                >
                  Open Ledger ➔
                </button>

                {isOwner && (
                  <>
                    <button 
                      onClick={() => setEditingBook(book)}
                      className="px-3 py-2 rounded-lg border border-borderLight bg-white/5 text-textMain font-semibold cursor-pointer text-[13px] hover:bg-white/10"
                      disabled={importing}
                    >
                      ✏️ Edit Name
                    </button>

                    <button 
                      onClick={() => setSharingBook(book)}
                      className="px-3 py-2 rounded-lg border border-brandBlue/40 bg-brandBlue/10 text-brandBlue font-semibold cursor-pointer text-[13px] hover:bg-brandBlue/20"
                      disabled={importing}
                    >
                      🤝 Share
                    </button>
                  </>
                )}

                <button 
                  onClick={() => handleDuplicateLedger(book)}
                  className="px-3 py-2 rounded-lg border border-borderLight bg-white/5 text-textMain font-semibold cursor-pointer text-[13px] hover:bg-white/10"
                  disabled={importing}
                  title="Deep copy ledger and all subcollections"
                >
                  📋 Duplicate
                </button>

                <button 
                  onClick={() => handleSingleExport(book)}
                  className="px-3 py-2 rounded-lg border border-borderLight bg-white/5 text-textMuted font-semibold cursor-pointer text-[13px] hover:bg-white/10 hover:text-white"
                  disabled={importing}
                >
                  Export
                </button>
                
                <button 
                  onClick={() => handleSingleImportClick(book)}
                  className="px-3 py-2 rounded-lg border border-borderLight bg-white/5 text-textMuted font-semibold cursor-pointer text-[13px] hover:bg-white/10 hover:text-white"
                  disabled={importing}
                >
                  Import
                </button>

                <button 
                  onClick={() => navigate(`/cashbook/${book.id}/bulk-add`)}
                  className="px-3 py-2 rounded-lg border border-borderLight bg-white/5 text-textMuted font-semibold cursor-pointer text-[13px] hover:bg-white/10 hover:text-white"
                  disabled={importing}
                >
                  + Bulk Add
                </button>

                {isOwner && (
                  <button 
                    onClick={() => handleDelete(book.id, book.name)}
                    className="px-3 py-2 bg-cashOut text-white border-none rounded-lg cursor-pointer font-semibold text-[13px] shadow-[0_4px_6px_rgba(255,16,83,0.3)] transition-all hover:bg-red-700"
                    disabled={importing}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}