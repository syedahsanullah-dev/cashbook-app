import { useState } from "react";

export default function TransactionList({ transactions, currency, permissions, onEdit, onDelete }) {
  // State for the full-screen image viewer
  const [selectedImage, setSelectedImage] = useState(null);

  const canEdit = permissions ? permissions.canEdit : true;
  const canDelete = permissions ? permissions.canDelete : true;

  return (
    <div className="mt-8">
      {/* Full Screen Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/85 z-[1000] flex justify-center items-center p-5" onClick={() => setSelectedImage(null)}>
          <button className="absolute top-5 right-5 bg-white/10 text-white border-none rounded-full w-9 h-9 text-xl font-bold cursor-pointer flex justify-center items-center" onClick={() => setSelectedImage(null)}>×</button>
          <img 
            src={selectedImage} 
            alt="Receipt Full View" 
            className="max-w-full max-h-[90vh] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()} // Prevents closing when clicking the image itself
          />
        </div>
      )}

      <h3 className="text-h2 mb-4">Transaction History</h3>
      
      {transactions.length === 0 ? (
        <div className="text-center py-10 px-5 bg-bgCard rounded-xl border border-dashed border-borderLight mt-6">
          <span className="text-[40px] block mb-3">🧾</span>
          <h3 className="text-h2 mb-2">No Transactions Yet</h3>
          <p className="text-muted">Your ledger is empty.</p>
        </div>
      ) : (
        <div className="bg-bgCard rounded-xl shadow-sm border border-borderLight overflow-hidden">
          {transactions.map((tx) => {
            const isIncome = tx.type === "INCOME";
            const formattedAmount = (tx.amount / 100).toFixed(2);

            let dateObj = null;
            if (tx.txnDate) {
              dateObj = new Date(tx.txnDate);
            } else if (tx.createdAt) {
              dateObj = tx.createdAt.toDate ? tx.createdAt.toDate() : new Date(tx.createdAt);
            }

            const dateStr = dateObj ? dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : "Just now";
            const timeStr = dateObj ? dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : "";

            return (
              <div key={tx.id} className="flex justify-between p-4 border-b border-borderLight transition-colors duration-200 hover:bg-white/[0.03] last:border-b-0">
                
                {/* Left Side: Details */}
                <div className="flex flex-col gap-1.5">
                  <p className="font-semibold text-textMain text-base m-0">{tx.remarks || "No remarks"}</p>
                  
                  <div className="flex items-center gap-2 text-xs text-textMuted flex-wrap">
                    <span>{dateStr} {timeStr && `• ${timeStr}`}</span>
                    {tx.category && (
                      <span className="bg-white/10 text-textMuted py-0.5 px-2 rounded-xl font-medium inline-flex items-center gap-1">
                        <span className="text-[10px]">📁</span> {tx.category}
                      </span>
                    )}
                  </div>

                  {/* Render receipt thumbnail if it exists */}
                  {tx.receiptBase64 && (
                    <img 
                      src={tx.receiptBase64} 
                      alt="Receipt Thumbnail" 
                      className="w-12 h-12 object-cover rounded-md border border-borderLight mt-2 cursor-pointer transition-opacity duration-200 hover:opacity-80" 
                      onClick={() => setSelectedImage(tx.receiptBase64)}
                    />
                  )}

                  {(canEdit || canDelete) && (
                    <div className="flex gap-3 mt-2">
                      {canEdit && (
                        <button onClick={() => onEdit(tx)} className="bg-transparent border-none text-[13px] font-semibold p-0 cursor-pointer text-brandBlue hover:underline hover:text-[#a5b4fc]">Edit</button>
                      )}
                      {canDelete && (
                        <button onClick={() => onDelete(tx)} className="bg-transparent border-none text-[13px] font-semibold p-0 cursor-pointer text-textMuted hover:underline hover:text-cashOut">Delete</button>
                      )}
                    </div>
                  )}
                </div>

                {/* Right Side: Amounts */}
                <div className="text-right flex flex-col items-end gap-1.5 min-w-[90px]">
                  <p className={`font-bold text-lg m-0 ${isIncome ? 'text-green' : 'text-red'}`}>
                    {isIncome ? "+" : "-"} {currency} {formattedAmount}
                  </p>
                  <span className={`text-[11px] py-0.5 px-2 rounded font-semibold uppercase tracking-[0.5px] ${isIncome ? 'bg-cashInBg text-cashIn' : 'bg-cashOutBg text-cashOut'}`}>
                    {tx.type}
                  </span>
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}