import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts";

// Custom Tooltip for hovering over the trend graph
const CustomTrendTooltip = ({ active, payload, currency }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isNetPositive = data.netChange >= 0;

    return (
      <div className="bg-[#121420]/90 backdrop-blur-md p-3 border border-white/15 rounded-xl shadow-xl min-w-[180px]">
        <p className="m-0 font-semibold text-textMain text-sm border-b border-white/10 pb-1.5 mb-2">
          {data.fullDateLabel}
        </p>
        
        <div className="flex flex-col gap-1 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-textMuted">Running Balance:</span>
            <span className={`font-bold ${data.balance >= 0 ? "text-green" : "text-red"}`}>
              {currency} {data.balance.toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-textMuted">Day Net Flow:</span>
            <span className={`font-semibold ${isNetPositive ? "text-green" : "text-red"}`}>
              {isNetPositive ? "+" : ""}{currency} {data.netChange.toFixed(2)}
            </span>
          </div>

          {data.income > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-textMuted">Cash IN:</span>
              <span className="text-cashIn font-medium">+{currency} {data.income.toFixed(2)}</span>
            </div>
          )}

          {data.expense > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-textMuted">Cash OUT:</span>
              <span className="text-cashOut font-medium">-{currency} {data.expense.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export default function BalanceTrendChart({ transactions, currency }) {
  const [viewMode, setViewMode] = useState("CUMULATIVE"); // "CUMULATIVE" | "DAILY"

  // Process transactions chronologically by txnDate (or createdAt)
  const chartData = useMemo(() => {
    if (!transactions || transactions.length === 0) return [];

    // Sort transactions ascending by transaction date
    const sorted = [...transactions].sort((a, b) => {
      const timeA = a.txnDate ? new Date(a.txnDate).getTime() : (a.createdAt?.toMillis() || 0);
      const timeB = b.txnDate ? new Date(b.txnDate).getTime() : (b.createdAt?.toMillis() || 0);
      return timeA - timeB;
    });

    // Group by YYYY-MM-DD
    const dailyMap = new Map();

    sorted.forEach((tx) => {
      let dateObj = null;
      if (tx.txnDate) {
        dateObj = new Date(tx.txnDate);
      } else if (tx.createdAt) {
        dateObj = tx.createdAt.toDate ? tx.createdAt.toDate() : new Date(tx.createdAt);
      } else {
        dateObj = new Date();
      }

      if (!dateObj || isNaN(dateObj.getTime())) {
        dateObj = new Date();
      }

      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, "0");
      const day = String(dateObj.getDate()).padStart(2, "0");
      const dateKey = `${year}-${month}-${day}`;

      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, {
          dateObj,
          dateKey,
          incomePaisa: 0,
          expensePaisa: 0
        });
      }

      const entry = dailyMap.get(dateKey);
      if (tx.type === "INCOME") {
        entry.incomePaisa += tx.amount;
      } else if (tx.type === "EXPENSE") {
        entry.expensePaisa += tx.amount;
      }
    });

    // Build running balance and format points
    let runningBalancePaisa = 0;
    const points = [];

    dailyMap.forEach((val) => {
      const income = val.incomePaisa / 100;
      const expense = val.expensePaisa / 100;
      const netChange = income - expense;
      
      runningBalancePaisa += (val.incomePaisa - val.expensePaisa);
      const balance = runningBalancePaisa / 100;

      const dateLabel = val.dateObj.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      const fullDateLabel = val.dateObj.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

      points.push({
        dateKey: val.dateKey,
        dateLabel,
        fullDateLabel,
        income,
        expense,
        netChange,
        balance
      });
    });

    return points;
  }, [transactions]);

  if (chartData.length === 0) return null;

  const currentBalance = chartData[chartData.length - 1]?.balance || 0;
  const isPositiveTrend = currentBalance >= 0;
  const strokeColor = isPositiveTrend ? "#6366f1" : "#f43f5e";
  const gradientId = isPositiveTrend ? "balanceGradientPos" : "balanceGradientNeg";

  return (
    <div className="card mb-6 pt-5 bg-bgCard border border-borderLight rounded-xl p-5 shadow-sm">
      
      {/* Header with Title & Mode Toggle */}
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <div>
          <h3 className="text-h2 m-0 text-base font-bold flex items-center gap-2">
            📈 Balance Trend Graph
          </h3>
          <p className="text-xs text-textMuted m-0 mt-0.5">
            {viewMode === "CUMULATIVE" ? "Cumulative balance over time" : "Daily net cash increase & decrease"}
          </p>
        </div>

        <div className="flex bg-black/20 p-1 rounded-lg border border-borderLight text-xs gap-1">
          <button
            type="button"
            onClick={() => setViewMode("CUMULATIVE")}
            className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer transition-all ${
              viewMode === "CUMULATIVE"
                ? "bg-brandBlue text-white shadow-sm"
                : "text-textMuted hover:text-white bg-transparent border-none"
            }`}
          >
            Running Balance
          </button>
          <button
            type="button"
            onClick={() => setViewMode("DAILY")}
            className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer transition-all ${
              viewMode === "DAILY"
                ? "bg-brandBlue text-white shadow-sm"
                : "text-textMuted hover:text-white bg-transparent border-none"
            }`}
          >
            Daily Net Flow
          </button>
        </div>
      </div>

      {/* Recharts Area Chart */}
      <div className="w-full h-[250px]">
        <ResponsiveContainer>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="balanceGradientPos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="balanceGradientNeg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            
            <XAxis 
              dataKey="dateLabel" 
              tick={{ fill: '#94a3b8', fontSize: 11 }} 
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              tickLine={false}
            />
            
            <YAxis 
              tick={{ fill: '#94a3b8', fontSize: 11 }} 
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              tickLine={false}
            />
            
            <Tooltip content={<CustomTrendTooltip currency={currency} />} />
            
            <Area
              type="monotone"
              dataKey={viewMode === "CUMULATIVE" ? "balance" : "netChange"}
              stroke={strokeColor}
              strokeWidth={2.5}
              fillOpacity={1}
              fill={`url(#${gradientId})`}
              activeDot={{ r: 6, fill: strokeColor, stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
}
