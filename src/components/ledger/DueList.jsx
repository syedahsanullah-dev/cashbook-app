import { useState } from "react";

export default function DueList({ dues, currency, permissions, onEdit, onDelete, onMarkAsPaid }) {
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
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}

      <h3 className="text-h2 mb-4">Upcoming Dues</h3>
      
      {dues.length === 0 ? (
        <div className="text-center py-10 px-5 bg-bgCard rounded-xl border border-dashed border-borderLight mt-6">
          <span className="text-[40px] block mb-3">🗓️</span>
          <h3 className="text-h2 mb-2">No Dues</h3>
          <p className="text-muted">You have no upcoming accounts receivable or payable.</p>
        </div>
      ) : (
        <div className="bg-bgCard rounded-xl shadow-sm border border-borderLight overflow-hidden">
          {dues.map((due) => {
            const isCredit = due.type === "CREDIT";
            const formattedAmount = (due.amount / 100).toFixed(2);
            
            // Format due date safely
            let dateStr = "No date";
            if (due.dueDate) {
               const parsedDate = new Date(due.dueDate);
               if (!isNaN(parsedDate)) {
                 dateStr = parsedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
               } else {
                 dateStr = String(due.dueDate);
               }
            }
            
            // Format created at safely
            let createdAtStr = "";
            if (due.createdAt && due.createdAt.toDate) {
                createdAtStr = "Added on " + due.createdAt.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            }

            return (
              <div key={due.id} className="flex justify-between p-4 border-b border-borderLight transition-colors duration-200 hover:bg-white/[0.03] last:border-b-0">
                
                {/* Left Side: Details */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center">
                    <p className="font-semibold text-textMain text-base m-0">{due.remarks || "No remarks"}</p>
                    {canEdit && (
                      <button onClick={() => onMarkAsPaid(due)} className="bg-cashIn/10 text-cashIn border border-cashIn/20 py-1 px-2 rounded-md ml-2 text-[13px] font-semibold cursor-pointer transition-colors hover:bg-cashIn/20">
                        Mark as Paid ✓
                      </button>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-textMuted flex-wrap">
                    <span className="text-brandBlue font-semibold">Due: {dateStr}</span>
                    {createdAtStr && <span>• {createdAtStr}</span>}
                    {due.category && (
                      <span className="bg-white/10 text-textMuted py-0.5 px-2 rounded-xl font-medium inline-flex items-center gap-1">
                        <span className="text-[10px]">📁</span> {due.category}
                      </span>
                    )}
                  </div>

                  {due.receiptBase64 && (
                    <img 
                      src={due.receiptBase64} 
                      alt="Receipt Thumbnail" 
                      className="w-12 h-12 object-cover rounded-md border border-borderLight mt-2 cursor-pointer transition-opacity duration-200 hover:opacity-80" 
                      onClick={() => setSelectedImage(due.receiptBase64)}
                    />
                  )}

                  {(canEdit || canDelete) && (
                    <div className="flex gap-3 mt-2">
                      {canEdit && (
                        <button onClick={() => onEdit(due)} className="bg-transparent border-none text-[13px] font-semibold p-0 cursor-pointer text-brandBlue hover:underline hover:text-[#a5b4fc]">Edit</button>
                      )}
                      {canDelete && (
                        <button onClick={() => onDelete(due)} className="bg-transparent border-none text-[13px] font-semibold p-0 cursor-pointer text-textMuted hover:underline hover:text-cashOut">Delete</button>
                      )}
                    </div>
                  )}
                </div>

                {/* Right Side: Amounts */}
                <div className="text-right flex flex-col items-end gap-1.5 min-w-[90px]">
                  <p className={`font-bold text-lg m-0 ${isCredit ? 'text-green' : 'text-red'}`}>
                    {isCredit ? "+" : "-"} {currency} {formattedAmount}
                  </p>
                  <span className={`text-[11px] py-0.5 px-2 rounded font-semibold uppercase tracking-[0.5px] ${isCredit ? 'bg-cashInBg text-cashIn' : 'bg-cashOutBg text-cashOut'}`}>
                    {isCredit ? 'RECEIVABLE' : 'PAYABLE'}
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
