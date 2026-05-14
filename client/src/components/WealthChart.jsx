import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ReferenceLine, ResponsiveContainer, AreaChart, Area,
} from 'recharts';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { usePlan } from '../context/PlanContext';
import { findFreedomDate, fmtFull } from '../utils/mathEngine';
import YearlyBreakdown from './YearlyBreakdown';

const fmtY = (v) => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
};

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-3 text-xs max-w-[240px]">
      <p className="font-bold text-gray-900 dark:text-white mb-1.5">Year {d.year}</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center justify-between gap-3 mb-0.5">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="font-mono font-semibold">{fmtFull(p.value)}</span>
        </div>
      ))}
      {d.yearlyIncome > 0 && (
        <div className="flex items-center justify-between gap-3 mb-0.5 border-t border-gray-100 dark:border-gray-800 pt-1 mt-1">
          <span className="flex items-center gap-1 text-purple-500">
            <span className="w-2 h-2 rounded-full bg-purple-400 flex-shrink-0" />
            Employment Income
          </span>
          <span className="font-mono font-semibold text-purple-600">{fmtFull(d.yearlyIncome)}</span>
        </div>
      )}
      {d.isPostFreedom && d.yearlyIncome === 0 && (
        <p className="text-purple-400 text-xs mt-1">Income: $0 (retired)</p>
      )}
      {d.isFreedom && <p className="text-green-600 dark:text-green-400 font-semibold mt-1.5">🗽 Freedom Date!</p>}
      {d.isRetirement && <p className="text-purple-600 dark:text-purple-400 font-semibold mt-1">🏖 Retirement Year</p>}
      {d.crashApplied && <p className="text-orange-500 font-semibold mt-1">⚠ Crash Applied</p>}
      <p className="text-gray-400 mt-1.5 italic">Click to see full breakdown ↓</p>
    </div>
  );
}

const VIEWS = [
  { id: 'all', label: 'All' },
  { id: 'combined', label: 'Combined' },
  { id: 'me', label: 'Me' },
  { id: 'spouse', label: 'Spouse' },
  { id: 'buckets', label: 'Tax Buckets' },
  { id: 'freedom', label: 'Freedom Track' },
];

function DraggableCrashLabel({ viewBox, crashYear, onDragStart }) {
  if (!viewBox) return null;
  const { x, y, height } = viewBox;
  return (
    <g style={{ cursor: 'ew-resize', userSelect: 'none' }}
      onMouseDown={e => { e.stopPropagation(); onDragStart(); }}>
      <rect x={x - 12} y={y} width={24} height={height || 250}
        fill="transparent" />
      <text x={x + 5} y={y + 15} fill="#f97316" fontSize={11} fontWeight={600}>⚠ Crash</text>
      <text x={x + 5} y={y + 27} fill="#f97316" fontSize={9} opacity={0.8}>{crashYear}</text>
      <text x={x + 5} y={y + 38} fill="#f97316" fontSize={9} opacity={0.6}>↔ drag</text>
    </g>
  );
}

export default function WealthChart() {
  const { state, updateSettings } = usePlan();
  const { simulation, settings } = state;
  const [view, setView] = useState('all');
  const [selectedYear, setSelectedYear] = useState(null);
  const [showTable, setShowTable] = useState(false);
  const [isDraggingCrash, setIsDraggingCrash] = useState(false);

  const myName     = settings.myName     || 'Me';
  const spouseName = settings.spouseName || 'Spouse';
  const freedomYear = findFreedomDate(simulation);

  const hasSpouseData = simulation.some(d => d.spouseNetWorth > 0);

  useEffect(() => {
    if (!isDraggingCrash) return;
    const stop = () => setIsDraggingCrash(false);
    window.addEventListener('mouseup', stop);
    return () => window.removeEventListener('mouseup', stop);
  }, [isDraggingCrash]);

  const handleChartMouseMove = useCallback((chartData) => {
    if (isDraggingCrash && chartData?.activeLabel) {
      updateSettings({ crashYear: Number(chartData.activeLabel) });
    }
  }, [isDraggingCrash, updateSettings]);

  const handleChartClick = (chartData) => {
    if (isDraggingCrash) return;
    if (chartData?.activePayload?.[0]) {
      const yr = chartData.activePayload[0].payload.year;
      setSelectedYear(prev => prev === yr ? null : yr);
    }
  };

  const selectedData = simulation.find(d => d.year === selectedYear);

  if (!simulation.length) {
    return (
      <div className="card flex items-center justify-center h-64 text-gray-400">
        No simulation data. Add accounts to get started.
      </div>
    );
  }

  const commonChartProps = {
    data: simulation,
    onClick: handleChartClick,
    onMouseMove: handleChartMouseMove,
    style: { cursor: isDraggingCrash ? 'ew-resize' : 'pointer' },
    margin: { top: 5, right: 65, bottom: 5, left: 10 },
  };

  const commonAxisProps = {
    xAxis: <XAxis dataKey="year" tick={{ fontSize: 11 }} />,
    yAxisLeft:  <YAxis yAxisId="left"  tickFormatter={fmtY} tick={{ fontSize: 11 }} width={62} />,
    yAxisRight: <YAxis yAxisId="right" orientation="right" tickFormatter={fmtY} tick={{ fontSize: 10 }} width={60} stroke="#a855f7" />,
  };

  // Income line — shares the right axis across all views
  const incomeLine = (
    <Line yAxisId="right" type="monotone" dataKey="yearlyIncome"
      name="Employment Income" stroke="#a855f7" strokeWidth={1.5} dot={false} strokeDasharray="3 2" />
  );

  const refLines = (
    <>
      {freedomYear && (
        <ReferenceLine yAxisId="left" x={freedomYear} stroke="#22c55e" strokeWidth={2} strokeDasharray="5 3"
          label={{ value: '🗽 Freedom', position: 'insideTopRight', fontSize: 11, fill: '#22c55e' }} />
      )}
      {settings.retirementYear && (
        <ReferenceLine yAxisId="left" x={Number(settings.retirementYear)} stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 3"
          label={{ value: '🏖 Retire', position: 'insideTopLeft', fontSize: 11, fill: '#8b5cf6' }} />
      )}
      {settings.crashYear && (
        <ReferenceLine yAxisId="left" x={Number(settings.crashYear)} stroke="#f97316" strokeWidth={2} strokeDasharray="4 3"
          label={<DraggableCrashLabel crashYear={settings.crashYear} onDragStart={() => setIsDraggingCrash(true)} />} />
      )}
    </>
  );

  return (
    <div className="card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-gray-800 dark:text-gray-200">Wealth Projection</h2>
        <div className="flex flex-wrap gap-1 bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg">
          {VIEWS.filter(v => v.id !== 'spouse' || hasSpouseData).map(v => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={`text-xs px-2.5 py-1.5 rounded-md transition-colors ${view === v.id
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm font-medium'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {v.id === 'me' ? myName : v.id === 'spouse' ? spouseName : v.label}
            </button>
          ))}
          {settings.crashYear && (
            <span className="text-xs px-2 py-1.5 text-orange-500 italic">↔ drag crash line</span>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        {view === 'buckets' ? (
          <AreaChart {...commonChartProps}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.4} />
            {commonAxisProps.xAxis}{commonAxisProps.yAxisLeft}{commonAxisProps.yAxisRight}
            <Tooltip content={<ChartTooltip />} />
            <Legend />
            <Area yAxisId="left" type="monotone" dataKey="rothBalance"     name="Roth (Tax-Free)"     stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.6} />
            <Area yAxisId="left" type="monotone" dataKey="deferredBalance" name="Deferred (401k/IRA)" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
            <Area yAxisId="left" type="monotone" dataKey="taxableBalance"  name="Brokerage (Taxable)" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
            {incomeLine}
            {refLines}
          </AreaChart>
        ) : view === 'freedom' ? (
          <LineChart {...commonChartProps}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.4} />
            {commonAxisProps.xAxis}{commonAxisProps.yAxisLeft}{commonAxisProps.yAxisRight}
            <Tooltip content={<ChartTooltip />} />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="postTaxSwr4"   name="4% SWR (post-tax)"         stroke="#22c55e" strokeWidth={2.5} dot={false} />
            <Line yAxisId="left" type="monotone" dataKey="freedomTarget" name="Retirement Expenses Target" stroke="#ef4444" strokeWidth={2.5} dot={false} strokeDasharray="5 3" />
            {incomeLine}
            {refLines}
          </LineChart>
        ) : view === 'me' ? (
          <LineChart {...commonChartProps}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.4} />
            {commonAxisProps.xAxis}{commonAxisProps.yAxisLeft}{commonAxisProps.yAxisRight}
            <Tooltip content={<ChartTooltip />} />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="meNetWorth"    name={`${myName} Net Worth`}   stroke="#3b82f6" strokeWidth={2.5} dot={false} />
            <Line yAxisId="left" type="monotone" dataKey="meInvestments" name={`${myName} Investments`} stroke="#8b5cf6" strokeWidth={2}   dot={false} strokeDasharray="4 3" />
            {incomeLine}
            {refLines}
          </LineChart>
        ) : view === 'spouse' ? (
          <LineChart {...commonChartProps}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.4} />
            {commonAxisProps.xAxis}{commonAxisProps.yAxisLeft}{commonAxisProps.yAxisRight}
            <Tooltip content={<ChartTooltip />} />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="spouseNetWorth"    name={`${spouseName} Net Worth`}   stroke="#ec4899" strokeWidth={2.5} dot={false} />
            <Line yAxisId="left" type="monotone" dataKey="spouseInvestments" name={`${spouseName} Investments`} stroke="#f97316" strokeWidth={2}   dot={false} strokeDasharray="4 3" />
            {incomeLine}
            {refLines}
          </LineChart>
        ) : view === 'combined' ? (
          <LineChart {...commonChartProps}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.4} />
            {commonAxisProps.xAxis}{commonAxisProps.yAxisLeft}{commonAxisProps.yAxisRight}
            <Tooltip content={<ChartTooltip />} />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="netWorth"     name="Combined Net Worth" stroke="#22c55e" strokeWidth={2.5} dot={false} />
            <Line yAxisId="left" type="monotone" dataKey="realNetWorth" name="In Today's Dollars" stroke="#8b5cf6" strokeWidth={2}   dot={false} strokeDasharray="5 3" />
            {incomeLine}
            {refLines}
          </LineChart>
        ) : (
          /* 'all' view — combined + both separate + income */
          <LineChart {...commonChartProps}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.4} />
            {commonAxisProps.xAxis}{commonAxisProps.yAxisLeft}{commonAxisProps.yAxisRight}
            <Tooltip content={<ChartTooltip />} />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="netWorth"       name="Combined"        stroke="#22c55e" strokeWidth={3}   dot={false} />
            <Line yAxisId="left" type="monotone" dataKey="meNetWorth"     name={myName}          stroke="#3b82f6" strokeWidth={2}   dot={false} strokeDasharray="5 3" />
            <Line yAxisId="left" type="monotone" dataKey="spouseNetWorth" name={spouseName}      stroke="#ec4899" strokeWidth={2}   dot={false} strokeDasharray="5 3" />
            {incomeLine}
            {refLines}
          </LineChart>
        )}
      </ResponsiveContainer>

      <p className="text-xs text-gray-400 text-center">
        👆 Click any point on the chart to see the complete math breakdown for that year
      </p>

      {/* Breakdown panel for selected year */}
      {selectedData && (
        <YearlyBreakdown data={selectedData} onClose={() => setSelectedYear(null)} />
      )}

      {/* Year-by-year summary table (collapsible) */}
      <div className="border-t border-gray-100 dark:border-gray-800 pt-3">
        <button
          onClick={() => setShowTable(t => !t)}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          {showTable ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          {showTable ? 'Hide' : 'Show'} year-by-year table
        </button>

        {showTable && (
          <div className="mt-3 overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-400">Year</th>
                  <th className="px-3 py-2 text-right font-semibold text-blue-600 dark:text-blue-400">{myName} Investments</th>
                  <th className="px-3 py-2 text-right font-semibold text-blue-600 dark:text-blue-400">{myName} Property</th>
                  {hasSpouseData && <>
                    <th className="px-3 py-2 text-right font-semibold text-pink-600 dark:text-pink-400">{spouseName} Investments</th>
                    <th className="px-3 py-2 text-right font-semibold text-pink-600 dark:text-pink-400">{spouseName} Property</th>
                  </>}
                  <th className="px-3 py-2 text-right font-semibold text-green-700 dark:text-green-400">Combined</th>
                  <th className="px-3 py-2 text-right font-semibold text-purple-600 dark:text-purple-400">Income</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-600 dark:text-gray-400">Expenses</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-600 dark:text-gray-400">4% SWR</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-600 dark:text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {simulation.map(d => {
                  const isSelected = d.year === selectedYear;
                  return (
                    <tr
                      key={d.year}
                      onClick={() => setSelectedYear(prev => prev === d.year ? null : d.year)}
                      className={`border-b border-gray-100 dark:border-gray-800 cursor-pointer transition-colors
                        ${isSelected ? 'bg-green-50 dark:bg-green-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}
                        ${d.isFreedom ? 'font-semibold' : ''}`}
                    >
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                        {d.year}
                        {d.crashApplied && <span className="ml-1 text-orange-500" title="Crash year">⚠</span>}
                      </td>
                      <td className="px-3 py-2 text-right text-blue-700 dark:text-blue-400">{fmtFull(d.meInvestments)}</td>
                      <td className="px-3 py-2 text-right text-blue-600 dark:text-blue-500">{d.mePropertyValue > 0 ? fmtFull(d.mePropertyValue) : '—'}</td>
                      {hasSpouseData && <>
                        <td className="px-3 py-2 text-right text-pink-700 dark:text-pink-400">{fmtFull(d.spouseInvestments)}</td>
                        <td className="px-3 py-2 text-right text-pink-600 dark:text-pink-500">{d.spousePropertyValue > 0 ? fmtFull(d.spousePropertyValue) : '—'}</td>
                      </>}
                      <td className="px-3 py-2 text-right text-green-700 dark:text-green-400 font-medium">{fmtFull(d.netWorth)}</td>
                      <td className={`px-3 py-2 text-right font-medium ${d.yearlyIncome > 0 ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400'}`}>
                        {d.yearlyIncome > 0 ? fmtFull(d.yearlyIncome) : <span title="Retired — no employment income">$0</span>}
                      </td>
                      <td className="px-3 py-2 text-right text-red-600 dark:text-red-400">{d.recurringExpenses > 0 ? fmtFull(d.recurringExpenses) : '—'}</td>
                      <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">{fmtFull(d.postTaxSwr4)}</td>
                      <td className="px-3 py-2 text-center">
                        {d.isRetirement
                          ? <span className="text-purple-600 dark:text-purple-400 font-bold" title="Retirement Year">🏖</span>
                          : d.isFreedom
                            ? <span className="text-green-600 dark:text-green-400 font-bold" title="Freedom Date">🗽</span>
                            : d.postTaxSwr4 >= d.freedomTarget && d.freedomTarget > 0
                              ? <span className="text-green-500" title="Already free">✓</span>
                              : '—'
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="text-xs text-gray-400 text-center py-2">Click any row to see the full breakdown</p>
          </div>
        )}
      </div>
    </div>
  );
}
