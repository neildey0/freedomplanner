import React, { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ReferenceLine, ResponsiveContainer, Area, AreaChart,
} from 'recharts';
import { usePlan } from '../context/PlanContext';
import { findFreedomDate, fmtFull } from '../utils/mathEngine';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-4 max-w-xs">
      <div className="font-bold text-gray-900 dark:text-white mb-2 text-sm">Year {d.year}</div>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4 text-xs mb-1">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="font-mono font-semibold">{fmtFull(p.value)}</span>
        </div>
      ))}
      {d.rsuIncome > 0 && (
        <div className="text-xs text-purple-600 dark:text-purple-400 mt-1.5 border-t border-gray-100 dark:border-gray-700 pt-1.5">
          RSU Income: {fmtFull(d.rsuIncome)}
        </div>
      )}
      {d.crashApplied && (
        <div className="text-xs text-orange-600 dark:text-orange-400 mt-1 font-semibold">
          ⚠ Market Crash Applied
        </div>
      )}
      {d.isFreedom && (
        <div className="text-xs text-green-600 dark:text-green-400 mt-1 font-semibold">
          🗽 Freedom Date!
        </div>
      )}
      <details className="mt-2">
        <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 dark:hover:text-gray-300">
          Show formula
        </summary>
        <pre className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 whitespace-pre-wrap font-mono leading-relaxed">
          {d.formula}
        </pre>
      </details>
    </div>
  );
}

const VIEWS = [
  { id: 'networth', label: 'Net Worth' },
  { id: 'buckets', label: 'Tax Buckets' },
  { id: 'freedom', label: 'Freedom Track' },
];

export default function WealthChart() {
  const { state } = usePlan();
  const { simulation, settings } = state;
  const [view, setView] = useState('networth');
  const freedomYear = findFreedomDate(simulation);

  if (!simulation.length) return (
    <div className="card flex items-center justify-center h-64 text-gray-400">
      No simulation data. Add accounts to get started.
    </div>
  );

  const fmtYAxis = (v) => {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
    return `$${v}`;
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-800 dark:text-gray-200">Wealth Projection</h2>
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg">
          {VIEWS.map(v => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={`text-xs px-2.5 py-1.5 rounded-md transition-colors ${view === v.id
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm font-medium'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        {view === 'buckets' ? (
          <AreaChart data={simulation} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
            <XAxis dataKey="year" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={fmtYAxis} tick={{ fontSize: 11 }} width={60} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area type="monotone" dataKey="rothBalance" name="Roth (Tax-Free)" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.6} />
            <Area type="monotone" dataKey="deferredBalance" name="Deferred (401k/IRA)" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
            <Area type="monotone" dataKey="taxableBalance" name="Brokerage (Taxable)" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
            {freedomYear && (
              <ReferenceLine x={freedomYear} stroke="#22c55e" strokeWidth={2} strokeDasharray="4 4"
                label={{ value: '🗽', position: 'top', fontSize: 16 }} />
            )}
            {settings.crashYear && (
              <ReferenceLine x={Number(settings.crashYear)} stroke="#f97316" strokeWidth={2} strokeDasharray="4 4"
                label={{ value: '⚠', position: 'top', fontSize: 14 }} />
            )}
          </AreaChart>
        ) : view === 'freedom' ? (
          <LineChart data={simulation} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
            <XAxis dataKey="year" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={fmtYAxis} tick={{ fontSize: 11 }} width={60} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line type="monotone" dataKey="postTaxSwr4" name="4% SWR (post-tax)" stroke="#22c55e" strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="freedomTarget" name="Freedom Target (recurring)" stroke="#ef4444" strokeWidth={2.5} dot={false} strokeDasharray="5 3" />
            {freedomYear && (
              <ReferenceLine x={freedomYear} stroke="#22c55e" strokeWidth={2} strokeDasharray="4 4"
                label={{ value: '🗽 Freedom', position: 'insideTopRight', fontSize: 12, fill: '#22c55e' }} />
            )}
            {settings.crashYear && (
              <ReferenceLine x={Number(settings.crashYear)} stroke="#f97316" strokeWidth={2} strokeDasharray="4 4"
                label={{ value: '⚠ Crash', position: 'insideTopLeft', fontSize: 11, fill: '#f97316' }} />
            )}
          </LineChart>
        ) : (
          <LineChart data={simulation} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
            <XAxis dataKey="year" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={fmtYAxis} tick={{ fontSize: 11 }} width={60} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line type="monotone" dataKey="netWorth" name="Net Worth (Nominal)" stroke="#3b82f6" strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="realNetWorth" name="Net Worth (Real $)" stroke="#8b5cf6" strokeWidth={2} dot={false} strokeDasharray="6 3" />
            <Line type="monotone" dataKey="swr4Percent" name="4% SWR Target" stroke="#22c55e" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
            {freedomYear && (
              <ReferenceLine x={freedomYear} stroke="#22c55e" strokeWidth={2} strokeDasharray="4 4"
                label={{ value: '🗽 Freedom', position: 'insideTopRight', fontSize: 12, fill: '#22c55e' }} />
            )}
            {settings.crashYear && (
              <ReferenceLine x={Number(settings.crashYear)} stroke="#f97316" strokeWidth={2} strokeDasharray="4 4"
                label={{ value: '⚠ Crash', position: 'insideTopLeft', fontSize: 11, fill: '#f97316' }} />
            )}
          </LineChart>
        )}
      </ResponsiveContainer>
      <p className="text-xs text-gray-400 text-center mt-2">Hover over chart points for full formula breakdown</p>
    </div>
  );
}
