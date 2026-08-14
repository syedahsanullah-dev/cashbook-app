import { useEffect, useRef, useState } from "react";

export default function DueForm(props) {
  const {
    type, setType, amount, setAmount, remarks, setRemarks,
    selectedCategory, setSelectedCategory, categories,
    receiptBase64, setReceiptBase64,
    dueDate, setDueDate,
    saving, error, editingId, onSubmit, onCancel, onToggleCategoryManager,
    showForm, setShowForm
  } = props;

  const formRef = useRef(null);

  const categoryColors = [
    "text-[#6366f1]", "text-[#a855f7]", "text-[#0ea5e9]", 
    "text-[#f43f5e]", "text-[#14b8a6]", "text-[#eab308]"
  ];

  // Auto-focus amount input when form opens
  useEffect(() => {
    if (showForm && formRef.current) {
      setTimeout(() => formRef.current.focus(), 100);
    }
  }, [showForm]);

  const [activeDatePreset, setActiveDatePreset] = useState("TODAY");
  const [showCustomDate, setShowCustomDate] = useState(false);

  useEffect(() => {
    if (showForm && !editingId) {
      applyDatePreset("TODAY");
    } else if (showForm && editingId) {
      setActiveDatePreset("CUSTOM");
      setShowCustomDate(true);
    }
  }, [showForm, editingId]);

  const applyDatePreset = (preset) => {
    setActiveDatePreset(preset);
    const now = new Date();
    
    if (preset === "TODAY") {
      setDueDate(now.toISOString().split('T')[0]);
      setShowCustomDate(false);
    } else if (preset === "YESTERDAY") {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      setDueDate(yesterday.toISOString().split('T')[0]);
      setShowCustomDate(false);
    } else if (preset === "NEXT_WEEK") {
      const nextWeek = new Date(now);
      nextWeek.setDate(now.getDate() + 7);
      setDueDate(nextWeek.toISOString().split('T')[0]);
      setShowCustomDate(false);
    } else if (preset === "CUSTOM") {
      setShowCustomDate(true);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 800;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.6);
        setReceiptBase64(compressedBase64);
      };
    };
  };

  // Component-Specific Styles
  const styles = `
    /* Floating Action Button (FAB) */
    .fab-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 50;
      display: flex;
      gap: 12px;
      flex-direction: column-reverse;
      align-items: flex-end;
    }
    
    @media (min-width: 600px) {
      .fab-container {
        /* Keep it constrained to the app-container width on desktop */
        right: calc(50% - 280px);
      }
    }
  `;

  // Quick action handlers for the FAB
  const handleQuickAdd = (newType) => {
    setType(newType);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    if (editingId) onCancel();
  };

  const canAdd = props.permissions ? props.permissions.canAdd : true;

  return (
    <>
      <style>{styles}</style>

      {/* FAB - Only show if form is hidden AND not editing AND user canAdd */}
      {!showForm && !editingId && canAdd && (
        <div className="fab-container">
          <button className="w-14 h-14 rounded-full bg-brandBlue text-white border-none shadow-md cursor-pointer flex justify-center items-center text-3xl transition-transform duration-200 hover:scale-105 hover:bg-blue-800" onClick={() => setShowForm(true)} aria-label="Add Due">
            +
          </button>
          
          <div className="flex gap-2 mb-2 opacity-100 translate-y-0 pointer-events-auto transition-all duration-200">
            <button className="px-4 py-2.5 rounded-3xl font-semibold text-sm border-none shadow-md cursor-pointer flex items-center gap-1.5 bg-cashOut text-white" onClick={() => handleQuickAdd("DEBIT")}>
              - PAYABLE
            </button>
            <button className="px-4 py-2.5 rounded-3xl font-semibold text-sm border-none shadow-md cursor-pointer flex items-center gap-1.5 bg-cashIn text-white" onClick={() => handleQuickAdd("CREDIT")}>
              + RECEIVABLE
            </button>
          </div>
        </div>
      )}

      {/* The Actual Form */}
      <div className={`bg-bgCard rounded-2xl p-6 shadow-md border border-borderLight mb-6 animate-[slideUp_0.3s_ease-out] ${showForm ? 'block' : 'hidden'}`} id="tx-form-container">
        
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-h2 m-0">
            {editingId ? "Edit Entry" : "New Entry"}
          </h3>
          <button onClick={handleCloseForm} className="bg-transparent border-none text-2xl text-textMuted cursor-pointer leading-none hover:text-white transition-colors">
            ×
          </button>
        </div>

        {error && (
          <div className="bg-cashOutBg text-cashOut p-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}
        
        <form onSubmit={(e) => {
          onSubmit(e);
        }}>
          
          <div className="grid gap-4">
            
            {/* Toggle CREDIT / DEBIT */}
            <div className="flex bg-black/20 rounded-lg p-1 gap-1">
              <button 
                type="button" 
                className={`flex-1 p-2.5 border-none rounded-md font-semibold text-sm cursor-pointer transition-all ${type === "CREDIT" ? "bg-cashIn text-white shadow-sm" : "bg-transparent text-textMuted hover:text-white"}`}
                onClick={() => setType("CREDIT")}
              >
                Receivable (+)
              </button>
              <button 
                type="button" 
                className={`flex-1 p-2.5 border-none rounded-md font-semibold text-sm cursor-pointer transition-all ${type === "DEBIT" ? "bg-cashOut text-white shadow-sm" : "bg-transparent text-textMuted hover:text-white"}`}
                onClick={() => setType("DEBIT")}
              >
                Payable (-)
              </button>
            </div>

            {/* Amount */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-textMuted uppercase tracking-[0.5px]">Amount</label>
              <input 
                ref={formRef}
                type="number" 
                className="w-full p-3 rounded-lg border border-borderLight text-2xl font-bold bg-white/5 text-textMain transition-all focus:outline-none focus:border-brandBlue focus:bg-white/10 focus:shadow-[0_0_10px_rgba(99,102,241,0.3)]"
                placeholder="0.00" 
                value={amount} 
                onChange={(e) => setAmount(e.target.value)} 
                step="0.01" min="0.01" required 
              />
            </div>

            {/* Due Date */}
            <div className="flex flex-col gap-1.5 overflow-hidden">
              <label className="text-[13px] font-semibold text-textMuted uppercase tracking-[0.5px]">Due Date</label>
              
              <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-lg border border-borderLight overflow-x-auto max-w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <button 
                  type="button"
                  onClick={() => applyDatePreset("TODAY")} 
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeDatePreset === "TODAY" ? "bg-brandBlue text-white shadow-md" : "text-textMuted hover:text-white hover:bg-white/5"}`}
                >
                  Today
                </button>
                <button 
                  type="button"
                  onClick={() => applyDatePreset("YESTERDAY")} 
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeDatePreset === "YESTERDAY" ? "bg-brandBlue text-white shadow-md" : "text-textMuted hover:text-white hover:bg-white/5"}`}
                >
                  Yesterday
                </button>
                <button 
                  type="button"
                  onClick={() => applyDatePreset("NEXT_WEEK")} 
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeDatePreset === "NEXT_WEEK" ? "bg-brandBlue text-white shadow-md" : "text-textMuted hover:text-white hover:bg-white/5"}`}
                >
                  Next Week
                </button>
                <button 
                  type="button"
                  onClick={() => applyDatePreset("CUSTOM")} 
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap flex items-center gap-1 ${activeDatePreset === "CUSTOM" ? "bg-brandBlue text-white shadow-md" : "text-textMuted hover:text-white hover:bg-white/5"}`}
                >
                  📅 Custom
                </button>
              </div>

              {showCustomDate && (
                <input 
                  type="date" 
                  className="w-full mt-1 p-3 rounded-lg border border-borderLight text-base bg-white/5 text-textMain transition-all focus:outline-none focus:border-brandBlue focus:bg-white/10 focus:shadow-[0_0_10px_rgba(99,102,241,0.3)] animate-[fadeIn_0.2s_ease-out]"
                  value={dueDate} 
                  onChange={(e) => {
                    setDueDate(e.target.value);
                    setActiveDatePreset("CUSTOM");
                  }} 
                  required 
                />
              )}
            </div>

            {/* Remarks */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-textMuted uppercase tracking-[0.5px]">Remarks</label>
              <input 
                type="text" 
                className="w-full p-3 rounded-lg border border-borderLight text-base bg-white/5 text-textMain transition-all focus:outline-none focus:border-brandBlue focus:bg-white/10 focus:shadow-[0_0_10px_rgba(99,102,241,0.3)]"
                placeholder="E.g. Electricity bill, Rent, etc." 
                value={remarks} 
                onChange={(e) => setRemarks(e.target.value)} 
                required 
              />
            </div>

            {/* Category */}
            <div className="flex flex-col gap-1.5 overflow-hidden">
              <label className="text-[13px] font-semibold text-textMuted uppercase tracking-[0.5px] flex justify-between">
                Category
                <button type="button" onClick={onToggleCategoryManager} className="bg-transparent border-none text-brandBlue cursor-pointer text-xs font-semibold hover:underline">
                  Manage Categories
                </button>
              </label>
              <div className="flex flex-wrap gap-2 py-1 w-full max-h-[160px] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full pr-1">
                <button
                  type="button"
                  onClick={() => setSelectedCategory("")}
                  className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap border ${selectedCategory === "" ? "bg-brandBlue/20 border-brandBlue text-white shadow-[0_0_10px_rgba(99,102,241,0.3)]" : "bg-white/5 border-borderLight text-textMuted hover:text-white"}`}
                >
                  No Category
                </button>
                {categories.map((cat, i) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.name)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap border flex items-center gap-2 ${selectedCategory === cat.name ? "bg-white/10 border-brandBlue text-white shadow-[0_0_10px_rgba(99,102,241,0.3)]" : "bg-white/5 border-borderLight text-textMuted hover:text-white"}`}
                  >
                    <span className={categoryColors[i % categoryColors.length]}>●</span> {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Receipt Upload */}
            <div className="flex flex-col gap-1.5 mt-2">
              <label className="text-[13px] font-semibold text-textMuted uppercase tracking-[0.5px]">Receipt / Invoice (Optional)</label>
              <div className="flex items-center gap-3 mt-1">
                <label className="px-4 py-2 bg-white/5 border border-borderLight rounded-lg text-sm cursor-pointer font-medium text-textMain transition-colors hover:bg-white/10">
                  📎 Choose Image
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
                
                {receiptBase64 && (
                  <div className="flex items-center gap-2 bg-white/5 p-1 rounded-md border border-borderLight">
                    <img src={receiptBase64} alt="Preview" className="h-8 w-8 object-cover rounded" />
                    <button type="button" onClick={() => setReceiptBase64("")} className="bg-transparent border-none text-cashOut cursor-pointer text-xs px-2 font-semibold hover:underline">
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Submit */}
            <button 
              type="submit" 
              className={`btn-primary mt-4 text-lg p-4 transition-opacity ${type === "CREDIT" ? "!bg-cashIn" : "!bg-cashOut"} ${saving ? "opacity-70" : "opacity-100"}`}
              disabled={saving} 
            >
              {saving ? "Saving..." : (editingId ? "Update Entry" : `Save ${type === "CREDIT" ? "Receivable" : "Payable"}`)}
            </button>

          </div>
        </form>
      </div>
    </>
  );
}
