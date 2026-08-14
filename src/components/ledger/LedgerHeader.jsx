import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ShareLedgerModal from "./ShareLedgerModal";

export default function LedgerHeader({ cashbook, currentUser, dues = [], onBack, onExportJSON }) {
  const navigate = useNavigate();
  const [showShareModal, setShowShareModal] = useState(false);

  if (!cashbook) return null;

  const isOwner = cashbook.userId === currentUser?.uid;
  let roleBadge = "👑 Owner";
  let badgeColor = "bg-brandBlue/20 text-brandBlue border-brandBlue/40";

  if (!isOwner) {
    const userEmailKey = currentUser?.email?.toLowerCase().replace(/\./g, "_dot_");
    const collaboratorInfo = cashbook.sharedWith ? cashbook.sharedWith[userEmailKey] : null;
    const role = collaboratorInfo?.role;

    if (role === "CAN_VIEW") {
      roleBadge = "👁️ Shared (Viewer)";
      badgeColor = "bg-amber-500/20 text-amber-300 border-amber-500/40";
    } else {
      roleBadge = "👥 Shared (Editor)";
      badgeColor = "bg-green-500/20 text-green-300 border-green-500/40";
    }
  }

  const balancePaisa = cashbook.balance || 0;
  const balance = (balancePaisa / 100).toFixed(2);
  const totalIn = ((cashbook.totalIncome || 0) / 100).toFixed(2);
  const totalOut = ((cashbook.totalExpense || 0) / 100).toFixed(2);
  const isPositive = balancePaisa >= 0;

  const totalReceivablePaisa = dues.filter(d => d.type === "CREDIT").reduce((sum, d) => sum + d.amount, 0);
  const totalPayablePaisa = dues.filter(d => d.type === "DEBIT").reduce((sum, d) => sum + d.amount, 0);
  const netPendingPaisa = totalReceivablePaisa - totalPayablePaisa;
  
  const totalReceivable = (totalReceivablePaisa / 100).toFixed(2);
  const totalPayable = (totalPayablePaisa / 100).toFixed(2);
  const netPending = (netPendingPaisa / 100).toFixed(2);
  const isPendingPositive = netPendingPaisa >= 0;

  const grandTotalPaisa = balancePaisa + netPendingPaisa;
  const grandTotal = (grandTotalPaisa / 100).toFixed(2);
  const isGrandTotalPositive = grandTotalPaisa >= 0;

  return (
    <header className="px-4 pt-4 pb-6 bg-transparent">
      
      {/* Share Modal */}
      <ShareLedgerModal 
        cashbook={cashbook} 
        isOpen={showShareModal} 
        onClose={() => setShowShareModal(false)} 
      />

      {/* Top Navigation */}
      <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={onBack} className="bg-transparent border-none text-textMuted text-base font-medium cursor-pointer flex items-center pr-3 py-2 transition-colors duration-200 hover:text-brandBlue">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Back
          </button>
          
          <h1 className="text-h1 m-0 text-[20px] font-bold">{cashbook.name}</h1>

          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${badgeColor}`}>
            {roleBadge}
          </span>
        </div>

        <div className="flex gap-2 flex-wrap">
          {isOwner && (
            <button 
              onClick={() => setShowShareModal(true)} 
              className="px-3 py-2 rounded-lg border border-brandBlue/40 bg-brandBlue/10 text-brandBlue font-semibold cursor-pointer text-[13px] hover:bg-brandBlue/20"
            >
              🤝 Share Access
            </button>
          )}

          <button onClick={onExportJSON} className="px-3 py-2 rounded-lg border border-brandBlue text-[#a5b4fc] bg-brandBlue/10 font-semibold cursor-pointer text-[13px] transition-all duration-300 hover:bg-brandBlue/20 hover:text-white">
            Export JSON
          </button>
          
          <button 
            onClick={() => navigate(`/cashbook/${cashbook.id}/bulk-add`)}
            className="px-3 py-2 rounded-lg border border-brandBlue text-[#a5b4fc] bg-brandBlue/10 font-semibold cursor-pointer text-[13px] transition-all duration-300 hover:bg-brandBlue/20 hover:text-white"
          >
            + Bulk Add
          </button>
        </div>
      </div>

      {/* Main Balance Card */}
      <div className="bg-bgCard backdrop-blur-[16px] rounded-2xl p-5 shadow-md border border-borderLight flex flex-col gap-5">
        
        {/* ACTUAL CASH */}
        <div className="bg-black/20 rounded-xl p-4 border border-white/5">
          <div className="text-xs uppercase tracking-[1px] text-brandBlue font-bold mb-3 text-center">Actual Cash</div>
          <div className="text-center mb-4">
            <span className="text-muted text-xs uppercase tracking-[1px] font-semibold">
              Net Balance
            </span>
            <h2 className={`text-balance mt-1 text-[28px] ${isPositive ? 'text-green' : 'text-red'}`}>
              {cashbook.currency} {balance}
            </h2>
          </div>
          <div className="flex justify-between border-t border-white/5 pt-4">
            <div className="flex-1 text-center">
              <span className="text-muted text-xs block mb-1">Total In (+)</span>
              <span className="text-green font-bold text-base">
                {cashbook.currency} {totalIn}
              </span>
            </div>
            <div className="w-px bg-white/5 mx-4"></div>
            <div className="flex-1 text-center">
              <span className="text-muted text-xs block mb-1">Total Out (-)</span>
              <span className="text-red font-bold text-base">
                {cashbook.currency} {totalOut}
              </span>
            </div>
          </div>
        </div>

        {/* PENDING DUES */}
        <div className="bg-black/20 rounded-xl p-4 border border-white/5">
          <div className="text-xs uppercase tracking-[1px] text-brandBlue font-bold mb-3 text-center">Pending Dues</div>
          <div className="text-center mb-4">
            <span className="text-muted text-xs uppercase tracking-[1px] font-semibold">
              Net Pending
            </span>
            <h2 className={`text-balance mt-1 text-[28px] ${isPendingPositive ? 'text-green' : 'text-red'}`}>
              {cashbook.currency} {netPending}
            </h2>
          </div>
          <div className="flex justify-between border-t border-white/5 pt-4">
            <div className="flex-1 text-center">
              <span className="text-muted text-xs block mb-1">Receivable (+)</span>
              <span className="text-green font-bold text-base">
                {cashbook.currency} {totalReceivable}
              </span>
            </div>
            <div className="w-px bg-white/5 mx-4"></div>
            <div className="flex-1 text-center">
              <span className="text-muted text-xs block mb-1">Payable (-)</span>
              <span className="text-red font-bold text-base">
                {cashbook.currency} {totalPayable}
              </span>
            </div>
          </div>
        </div>

        {/* GRAND TOTAL */}
        <div className="bg-grand-total rounded-xl p-4 border border-brandBlue/40">
          <div className="text-xs uppercase tracking-[1px] text-white font-bold mb-3 text-center">Grand Total Projection</div>
          <div className="text-center mb-0">
            <span className="text-white/70 text-xs uppercase tracking-[1px] font-semibold">
              (Actual + Pending)
            </span>
            <h2 className={`text-balance mt-1 text-[36px] ${isGrandTotalPositive ? 'text-green' : 'text-red'}`}>
              {cashbook.currency} {grandTotal}
            </h2>
          </div>
        </div>

      </div>
      
    </header>
  );
}