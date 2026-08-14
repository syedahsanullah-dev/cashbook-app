// components/ledger/LedgerInsights.jsx
import { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

// Custom Tooltip for hovering over the chart
const CustomTooltip = ({ active, payload, currency }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#121420]/80 backdrop-blur-md py-2.5 px-[15px] border border-white/10 rounded-lg shadow-md">
        <p className="m-0 font-semibold text-textMain">{payload[0].name}</p>
        <p className="mt-1 mb-0 font-normal text-cashOut drop-shadow-[0_0_5px_rgba(255,16,83,0.5)]">
          {currency} {payload[0].value.toFixed(2)}
        </p>
      </div>
    );
  }
  return null;
};

export default function LedgerInsights({ data, currency, title, filterType }) {
  const [hiddenCategories, setHiddenCategories] = useState({});

  const handleLegendClick = (e) => {
    // e.value contains the name of the category from Recharts
    if (e && e.value) {
      setHiddenCategories(prev => ({
        ...prev,
        [e.value]: !prev[e.value]
      }));
    }
  };

  // 1. Process data: filter by type and group by category
  const chartData = useMemo(() => {
    const items = data.filter(item => item.type === filterType);
    
    if (items.length === 0) return [];

    // Group by category and sum amounts
    const grouped = items.reduce((acc, item) => {
      const cat = item.category || "Uncategorized";
      acc[cat] = (acc[cat] || 0) + item.amount;
      return acc;
    }, {});

    // Convert object to array for Recharts
    return Object.keys(grouped)
      .map(key => ({
        name: key,
        originalValue: grouped[key] / 100, // Keep original for sorting
        value: hiddenCategories[key] ? 0 : (grouped[key] / 100) // 0 if hidden
      }))
      .sort((a, b) => b.originalValue - a.originalValue); // Sort highest to lowest
  }, [data, filterType, hiddenCategories]);

  // Use a slightly different palette for Income vs Expense
  const isPositive = filterType === "INCOME" || filterType === "CREDIT";
  
  const COLORS = isPositive 
    ? ['#00ff73', '#10b981', '#14b8a6', '#0ea5e9', '#3b82f6', '#6366f1', '#a855f7'] // Greens, Blues, Purples
    : ['#ff1053', '#f43f5e', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#a855f7']; // Reds, Oranges, Yellows

  if (chartData.length === 0) return null; // Hide if no data

  return (
    <div className="card mb-6 pt-5">
      <h3 className="text-h2 m-0 ml-4 mb-4">{title}</h3>
      
      <div className="w-full h-[260px]">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="45%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip currency={currency} />} />
            <Legend 
              verticalAlign="bottom" 
              iconType="circle"
              wrapperStyle={{ fontSize: '12px', cursor: 'pointer', userSelect: 'none' }}
              onClick={handleLegendClick}
              formatter={(value) => (
                <span className={`transition-all ${hiddenCategories[value] ? 'opacity-40 line-through text-textMuted' : 'text-textMuted hover:text-white'}`}>
                  {value}
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}