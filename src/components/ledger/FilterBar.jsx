import { useState, useEffect } from "react";

export default function FilterBar(props) {
  const {
    mode = "TRANSACTIONS",
    searchQuery, setSearchQuery,
    filterType, setFilterType, filterCategory, setFilterCategory,
    filterStartDate, setFilterStartDate, filterEndDate, setFilterEndDate,
    categories, isFilterActive, filteredIncome, filteredExpense, resultCount, currency
  } = props;

  const categoryColors = [
    "text-[#6366f1]", "text-[#a855f7]", "text-[#0ea5e9]", 
    "text-[#f43f5e]", "text-[#14b8a6]", "text-[#eab308]"
  ];

  const [activePreset, setActivePreset] = useState("ALL");
  const [showCustomDate, setShowCustomDate] = useState(false);

  useEffect(() => {
    if (!filterStartDate && !filterEndDate) {
      setActivePreset("ALL");
      setShowCustomDate(false);
    }
  }, [filterStartDate, filterEndDate]);

  const applyPreset = (preset) => {
    setActivePreset(preset);
    
    if (preset === "ALL") {
      setFilterStartDate("");
      setFilterEndDate("");
      setShowCustomDate(false);
      return;
    } 
    
    if (preset === "CUSTOM") {
      setShowCustomDate(true);
      return;
    }

    setShowCustomDate(false);
    const now = new Date();
    
    if (preset === "TODAY") {
      setFilterStartDate(now.toISOString().split('T')[0]);
      setFilterEndDate(now.toISOString().split('T')[0]);
    } else if (preset === "YESTERDAY") {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      setFilterStartDate(yesterday.toISOString().split('T')[0]);
      setFilterEndDate(yesterday.toISOString().split('T')[0]);
    } else if (preset === "THIS_WEEK") {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      setFilterStartDate(start.toISOString().split('T')[0]);
      setFilterEndDate(end.toISOString().split('T')[0]);
    } else if (preset === "LAST_WEEK") {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay() - 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      setFilterStartDate(start.toISOString().split('T')[0]);
      setFilterEndDate(end.toISOString().split('T')[0]);
    } else if (preset === "THIS_MONTH") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setFilterStartDate(start.toISOString().split('T')[0]);
      setFilterEndDate(end.toISOString().split('T')[0]);
    }
  };

  return (
    <div className="mt-8 mb-4">
      
      <div className="bg-bgCard rounded-xl p-4 border border-borderLight shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-h2 m-0 text-base">🔍 Search & Filter</h4>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <input 
            type="text" 
            placeholder="Search remarks, category, date..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 min-w-[200px] p-2.5 rounded-lg border border-borderLight bg-white/5 text-sm text-textMain transition-all focus:outline-none focus:border-brandBlue focus:bg-white/10 focus:shadow-[0_0_10px_rgba(99,102,241,0.3)]"
          />

          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="p-2.5 rounded-lg border border-borderLight bg-bgMain text-sm text-textMain transition-all focus:outline-none focus:border-brandBlue focus:shadow-[0_0_10px_rgba(99,102,241,0.3)]">
            <option value="ALL" className="text-white bg-bgMain">All Types</option>
            {mode === "TRANSACTIONS" ? (
              <>
                <option value="INCOME" className="text-cashIn bg-bgMain font-semibold">Cash In Only</option>
                <option value="EXPENSE" className="text-cashOut bg-bgMain font-semibold">Cash Out Only</option>
              </>
            ) : (
              <>
                <option value="CREDIT" className="text-cashIn bg-bgMain font-semibold">Receivable Only</option>
                <option value="DEBIT" className="text-cashOut bg-bgMain font-semibold">Payable Only</option>
              </>
            )}
          </select>
          
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="p-2.5 rounded-lg border border-borderLight bg-bgMain text-sm text-textMain transition-all focus:outline-none focus:border-brandBlue focus:shadow-[0_0_10px_rgba(99,102,241,0.3)]">
            <option value="ALL" className="text-white bg-bgMain">All Categories</option>
            <option value="Uncategorized" className="text-white bg-bgMain">Uncategorized</option>
            {categories.map((cat, i) => (
              <option key={cat.id} value={cat.name} className={`${categoryColors[i % categoryColors.length]} bg-bgMain font-semibold`}>
                {cat.name}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-lg border border-borderLight overflow-x-auto max-w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <button 
              onClick={() => applyPreset("ALL")} 
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activePreset === "ALL" ? "bg-brandBlue text-white shadow-md" : "text-textMuted hover:text-white hover:bg-white/5"}`}
            >
              All Time
            </button>
            <button 
              onClick={() => applyPreset("TODAY")} 
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activePreset === "TODAY" ? "bg-brandBlue text-white shadow-md" : "text-textMuted hover:text-white hover:bg-white/5"}`}
            >
              Today
            </button>
            <button 
              onClick={() => applyPreset("YESTERDAY")} 
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activePreset === "YESTERDAY" ? "bg-brandBlue text-white shadow-md" : "text-textMuted hover:text-white hover:bg-white/5"}`}
            >
              Yesterday
            </button>
            <button 
              onClick={() => applyPreset("THIS_WEEK")} 
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activePreset === "THIS_WEEK" ? "bg-brandBlue text-white shadow-md" : "text-textMuted hover:text-white hover:bg-white/5"}`}
            >
              This Week
            </button>
            <button 
              onClick={() => applyPreset("LAST_WEEK")} 
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activePreset === "LAST_WEEK" ? "bg-brandBlue text-white shadow-md" : "text-textMuted hover:text-white hover:bg-white/5"}`}
            >
              Last Week
            </button>
            <button 
              onClick={() => applyPreset("THIS_MONTH")} 
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activePreset === "THIS_MONTH" ? "bg-brandBlue text-white shadow-md" : "text-textMuted hover:text-white hover:bg-white/5"}`}
            >
              This Month
            </button>
            <button 
              onClick={() => applyPreset("CUSTOM")} 
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap flex items-center gap-1 ${activePreset === "CUSTOM" ? "bg-brandBlue text-white shadow-md" : "text-textMuted hover:text-white hover:bg-white/5"}`}
            >
              📅 Custom
            </button>
          </div>

          {showCustomDate && (
            <div className="flex items-center gap-2 animate-[fadeIn_0.2s_ease-out] flex-wrap">
              <span className="text-textMuted text-xs font-semibold uppercase">Date:</span>
              <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className="p-2.5 rounded-lg border border-borderLight bg-white/5 text-sm text-textMain transition-all focus:outline-none focus:border-brandBlue focus:bg-white/10 focus:shadow-[0_0_10px_rgba(99,102,241,0.3)]" title="Start Date or Single Date" />
              <span className="text-textMuted text-sm">to (optional)</span>
              <input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} className="p-2.5 rounded-lg border border-borderLight bg-white/5 text-sm text-textMain transition-all focus:outline-none focus:border-brandBlue focus:bg-white/10 focus:shadow-[0_0_10px_rgba(99,102,241,0.3)]" title="End Date (Optional)" />
            </div>
          )}

          {isFilterActive && (
            <button 
              onClick={() => { setFilterType("ALL"); setFilterCategory("ALL"); setFilterStartDate(""); setFilterEndDate(""); setSearchQuery(""); }} 
              className="py-2.5 px-4 bg-white/10 text-textMuted border border-borderLight rounded-lg font-semibold text-sm cursor-pointer transition-all hover:bg-white/20 hover:text-textMain"
            >
              Clear
            </button>
          )}
        </div>

        {isFilterActive && (
          <div className="flex gap-6 mt-4 pt-4 border-t border-dashed border-borderLight">
            <div className="text-sm text-textMuted">
              Matches: <span className="font-bold ml-1 text-textMain">{resultCount}</span>
            </div>
            <div className="text-sm text-textMuted">
              {mode === "TRANSACTIONS" ? "In:" : "Receivable:"} <span className="font-bold ml-1 text-green">{currency} {(filteredIncome / 100).toFixed(2)}</span>
            </div>
            <div className="text-sm text-textMuted">
              {mode === "TRANSACTIONS" ? "Out:" : "Payable:"} <span className="font-bold ml-1 text-red">{currency} {(filteredExpense / 100).toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}