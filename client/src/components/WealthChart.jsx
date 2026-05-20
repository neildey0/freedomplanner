import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
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

// Portal tooltip for column headers — bypasses table overflow clipping
function ColTip({ tip }) {
  const [pos, setPos] = useState(null);
  const ref = useRef();
  return (
    <>
      <button
        ref={ref}
        className="ml-1 w-3.5 h-3.5 rounded-full bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-200 text-[8px] font-bold inline-flex items-center justify-center hover:bg-blue-300 dark:hover:bg-blue-600 cursor-help align-middle flex-shrink-0"
        onMouseEnter={() => {
          const r = ref.current.getBoundingClientRect();
          setPos({ x: r.left + r.width / 2, y: r.top });
        }}
        onMouseLeave={() => setPos(null)}
        onClick={e => e.stopPropagation()}
      >?</button>
      {pos && createPortal(
        <div
          style={{ position: 'fixed', left: pos.x, top: pos.y - 8, transform: 'translate(-50%, -100%)', zIndex: 9999 }}
          className="w-60 bg-gray-900 text-gray-100 text-[11px] leading-relaxed rounded-xl p-3 shadow-2xl border border-gray-700 pointer-events-none text-left font-normal normal-case tracking-normal"
        >
          {tip}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-gray-900" />
        </div>,
        document.body
      )}
    </>
  );
}

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
      {d.isFreedom && <p className="text-amber-500 font-semibold mt-1.5">💰 F.U. Date!</p>}
      {d.crashApplied && <p className="text-orange-500 font-semibold mt-1">⚠ Crash -{d.crashPercent}%</p>}
      {d.unexpectedExpenses > 0 && <p className="text-purple-500 mt-1">💸 Purchase: -{fmtFull(d.unexpectedExpenses)}</p>}
      <p className="text-gray-400 mt-1.5 italic">Click to open breakdown in table ↓</p>
    </div>
  );
}

const VIEWS = [
  { id: 'all', label: 'All' },
  { id: 'combined', label: 'Combined' },
  { id: 'me', label: 'Me' },
  { id: 'spouse', label: 'Spouse' },
  { id: 'buckets', label: 'Tax Buckets' },
  { id: 'freedom', label: 'F.U. Track' },
];

function YoyBadge({ current, prev }) {
  if (prev == null || prev === 0 || current === prev) return null;
  const pct = ((current - prev) / Math.abs(prev)) * 100;
  const pos = pct >= 0;
  return (
    <span className={`text-[10px] ml-1 font-normal ${pos ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
      {pos ? '+' : ''}{pct.toFixed(1)}%
    </span>
  );
}

function DraggableCrashLabel({ viewBox, crashYear, crashPercent, onDragStart }) {
  if (!viewBox) return null;
  const { x, y, height } = viewBox;
  return (
    <g style={{ cursor: 'ew-resize', userSelect: 'none' }} onMouseDown={e => { e.stopPropagation(); onDragStart(); }}>
      <rect x={x - 12} y={y} width={24} height={height || 250} fill="transparent" />
      <text x={x + 5} y={y + 15} fill="#f97316" fontSize={11} fontWeight={600}>⚠ -{crashPercent}%</text>
      <text x={x + 5} y={y + 27} fill="#f97316" fontSize={9} opacity={0.8}>{crashYear}</text>
      <text x={x + 5} y={y + 38} fill="#f97316" fontSize={9} opacity={0.6}>↔ drag</text>
    </g>
  );
}

function DraggablePurchaseLabel({ viewBox, name, year, onDragStart }) {
  if (!viewBox) return null;
  const { x, y, height } = viewBox;
  return (
    <g style={{ cursor: 'ew-resize', userSelect: 'none' }} onMouseDown={e => { e.stopPropagation(); onDragStart(); }}>
      <rect x={x - 12} y={y} width={24} height={height || 250} fill="transparent" />
      <text x={x + 5} y={y + 15} fill="#a855f7" fontSize={11} fontWeight={600}>💸 {name || 'Purchase'}</text>
      <text x={x + 5} y={y + 27} fill="#a855f7" fontSize={9} opacity={0.8}>{year}</text>
      <text x={x + 5} y={y + 38} fill="#a855f7" fontSize={9} opacity={0.6}>↔ drag</text>
    </g>
  );
}

// ── Inline breakdown row ────────────────────────────────────────────────────
function InlineBreakdown({ data, myName, spouseName, colSpan, onClose }) {
  return (
    <tr>
      <td colSpan={colSpan} className="p-0 border-b border-amber-200 dark:border-amber-800">
        <div className="bg-amber-50 dark:bg-amber-900/10 p-3">
          <YearlyBreakdown data={data} myName={myName} spouseName={spouseName} onClose={onClose} />
        </div>
      </td>
    </tr>
  );
}

export default function WealthChart() {
  const { state, updateSettings } = usePlan();
  const { simulation, settings, accounts = [], properties = [] } = state;

  const [view,              setView]              = useState('all');
  const [expandedYear,      setExpandedYear]      = useState(null);
  const [showTable,         setShowTable]         = useState(false);
  const [tableTab,          setTableTab]          = useState('summary');
  const [draggingCrashId,   setDraggingCrashId]   = useState(null);
  const [draggingPurchaseId,setDraggingPurchaseId]= useState(null);

  const myName     = settings.myName     || 'Me';
  const spouseName = settings.spouseName || 'Spouse';
  const freedomYear = findFreedomDate(simulation);
  const crashes  = settings.crashes || [];
  const purchases = settings.unexpectedExpenses || [];

  // Account groupings for per-person-sole display
  const meSoleAccts  = accounts.filter(a => !a.owner || a.owner === 'me');
  const spSoleAccts  = accounts.filter(a => a.owner === 'spouse');
  const jointAccts   = accounts.filter(a => a.owner === 'joint');
  const meSoleProps  = properties.filter(p => !p.owner || p.owner === 'me');
  const spSoleProps  = properties.filter(p => p.owner === 'spouse');
  const jointProps   = properties.filter(p => p.owner === 'joint');

  const hasSpouseData = spSoleAccts.length > 0 || spSoleProps.length > 0 || simulation.some(d => d.spouseNetWorth > 0);
  const hasJoint      = jointAccts.length > 0 || jointProps.length > 0;
  const hasPurchases  = purchases.length > 0;

  // Stop drag on mouseup
  useEffect(() => {
    if (!draggingCrashId && !draggingPurchaseId) return;
    const stop = () => { setDraggingCrashId(null); setDraggingPurchaseId(null); };
    window.addEventListener('mouseup', stop);
    return () => window.removeEventListener('mouseup', stop);
  }, [draggingCrashId, draggingPurchaseId]);

  const handleChartMouseMove = useCallback((chartData) => {
    if (!chartData?.activeLabel) return;
    const yr = Number(chartData.activeLabel);
    if (draggingCrashId) {
      updateSettings({ crashes: crashes.map(c => c.id === draggingCrashId ? { ...c, year: yr } : c) });
    } else if (draggingPurchaseId) {
      updateSettings({ unexpectedExpenses: purchases.map(p => p.id === draggingPurchaseId ? { ...p, year: yr } : p) });
    }
  }, [draggingCrashId, draggingPurchaseId, crashes, purchases, updateSettings]);

  const handleChartClick = (chartData) => {
    if (draggingCrashId || draggingPurchaseId) return;
    if (chartData?.activePayload?.[0]) {
      const yr = chartData.activePayload[0].payload.year;
      setExpandedYear(prev => prev === yr ? null : yr);
      setShowTable(true);
      setTableTab('summary');
    }
  };

  if (!simulation.length) {
    return (
      <div className="card flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        No simulation data. Add accounts to get started.
      </div>
    );
  }

  const isDragging = !!(draggingCrashId || draggingPurchaseId);

  const commonChartProps = {
    data: simulation,
    onClick: handleChartClick,
    onMouseMove: handleChartMouseMove,
    style: { cursor: isDragging ? 'ew-resize' : 'pointer' },
    margin: { top: 5, right: 65, bottom: 5, left: 10 },
  };

  const xAxis    = <XAxis dataKey="year" tick={{ fontSize: 11 }} />;
  const yAxisL   = <YAxis yAxisId="left"  tickFormatter={fmtY} tick={{ fontSize: 11 }} width={62} />;
  const yAxisR   = <YAxis yAxisId="right" orientation="right" tickFormatter={fmtY} tick={{ fontSize: 10 }} width={60} stroke="#a855f7" />;

  const refLines = (
    <>
      {freedomYear && (
        <ReferenceLine yAxisId="left" x={freedomYear} stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 3"
          label={{ value: '💰 F.U.', position: 'insideTopRight', fontSize: 11, fill: '#f59e0b' }} />
      )}
      {settings.retirementYear && (
        <ReferenceLine yAxisId="left" x={Number(settings.retirementYear)} stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 3"
          label={{ value: '🏖 Retire', position: 'insideTopLeft', fontSize: 11, fill: '#8b5cf6' }} />
      )}
      {crashes.map(crash => (
        <ReferenceLine key={crash.id} yAxisId="left" x={Number(crash.year)} stroke="#f97316" strokeWidth={2} strokeDasharray="4 3"
          label={<DraggableCrashLabel crashYear={crash.year} crashPercent={crash.percent} onDragStart={() => setDraggingCrashId(crash.id)} />} />
      ))}
      {purchases.map(p => (
        <ReferenceLine key={p.id} yAxisId="left" x={Number(p.year)} stroke="#a855f7" strokeWidth={1.5} strokeDasharray="3 3"
          label={<DraggablePurchaseLabel name={p.name} year={p.year} onDragStart={() => setDraggingPurchaseId(p.id)} />} />
      ))}
    </>
  );

  // ── Per-row sole/joint NW helper ──────────────────────────────────────────
  const soleNW = (d, acctList, propList) =>
    acctList.reduce((s, a) => s + (d.accountBalances?.[a.id] || 0), 0) +
    propList.reduce((s, p) => s + (d.propertyValues?.[p.id]  || 0), 0);

  // ── Summary table column count (for colSpan) ─────────────────────────────
  const summaryColCount = 5 + (hasSpouseData ? 1 : 0) + (hasJoint ? 1 : 0) + (hasPurchases ? 1 : 0) + 2; // base=5 + optional cols + swr+status

  return (
    <div className="card space-y-4">
      {/* View selector */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-gray-800 dark:text-gray-200">Wealth Projection</h2>
        <div className="flex flex-wrap gap-1 bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg">
          {VIEWS.filter(v => v.id !== 'spouse' || hasSpouseData).map(v => (
            <button key={v.id} onClick={() => setView(v.id)}
              className={`text-xs px-2.5 py-1.5 rounded-md transition-colors ${view === v.id
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm font-medium'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
              {v.id === 'me' ? myName : v.id === 'spouse' ? spouseName : v.label}
            </button>
          ))}
          {(crashes.length > 0 || purchases.length > 0) && (
            <span className="text-xs px-2 py-1.5 text-orange-500 italic">↔ drag lines</span>
          )}
        </div>
      </div>

      {/* Chart */}
      <div data-pdf-chart>
        <ResponsiveContainer width="100%" height={300}>
          {view === 'buckets' ? (
            <AreaChart {...commonChartProps}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.4} />
              {xAxis}{yAxisL}
              <Tooltip content={<ChartTooltip />} /><Legend />
              <Area yAxisId="left" type="monotone" dataKey="rothBalance"     name="Roth (Tax-Free)"     stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.6} />
              <Area yAxisId="left" type="monotone" dataKey="deferredBalance" name="Deferred (401k/IRA)" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
              <Area yAxisId="left" type="monotone" dataKey="taxableBalance"  name="Brokerage (Taxable)" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
              {refLines}
            </AreaChart>
          ) : view === 'freedom' ? (
            <LineChart {...commonChartProps}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.4} />
              {xAxis}{yAxisL}{yAxisR}
              <Tooltip content={<ChartTooltip />} /><Legend />
              <Line yAxisId="left" type="monotone" dataKey="postTaxSwr4"   name="SWR Capacity"              stroke="#22c55e" strokeWidth={2.5} dot={false} />
              <Line yAxisId="left" type="monotone" dataKey="freedomTarget" name="Retirement Expenses Target" stroke="#ef4444" strokeWidth={2.5} dot={false} strokeDasharray="5 3" />
              {refLines}
            </LineChart>
          ) : view === 'me' ? (
            <LineChart {...commonChartProps}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.4} />
              {xAxis}{yAxisL}{yAxisR}
              <Tooltip content={<ChartTooltip />} /><Legend />
              <Line yAxisId="left" type="monotone" dataKey="meNetWorth"    name={`${myName} Net Worth`}   stroke="#3b82f6" strokeWidth={2.5} dot={false} />
              <Line yAxisId="left" type="monotone" dataKey="meInvestments" name={`${myName} Investments`} stroke="#8b5cf6" strokeWidth={2}   dot={false} strokeDasharray="4 3" />
              {refLines}
            </LineChart>
          ) : view === 'spouse' ? (
            <LineChart {...commonChartProps}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.4} />
              {xAxis}{yAxisL}{yAxisR}
              <Tooltip content={<ChartTooltip />} /><Legend />
              <Line yAxisId="left" type="monotone" dataKey="spouseNetWorth"    name={`${spouseName} Net Worth`}   stroke="#ec4899" strokeWidth={2.5} dot={false} />
              <Line yAxisId="left" type="monotone" dataKey="spouseInvestments" name={`${spouseName} Investments`} stroke="#f97316" strokeWidth={2}   dot={false} strokeDasharray="4 3" />
              {refLines}
            </LineChart>
          ) : view === 'combined' ? (
            <LineChart {...commonChartProps}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.4} />
              {xAxis}{yAxisL}{yAxisR}
              <Tooltip content={<ChartTooltip />} /><Legend />
              <Line yAxisId="left" type="monotone" dataKey="netWorth"     name="Combined Net Worth" stroke="#22c55e" strokeWidth={2.5} dot={false} />
              <Line yAxisId="left" type="monotone" dataKey="realNetWorth" name="In Today's Dollars" stroke="#8b5cf6" strokeWidth={2}   dot={false} strokeDasharray="5 3" />
              {refLines}
            </LineChart>
          ) : (
            <LineChart {...commonChartProps}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.4} />
              {xAxis}{yAxisL}{yAxisR}
              <Tooltip content={<ChartTooltip />} /><Legend />
              <Line yAxisId="left" type="monotone" dataKey="netWorth"       name="Combined"   stroke="#22c55e" strokeWidth={3}   dot={false} />
              <Line yAxisId="left" type="monotone" dataKey="meNetWorth"     name={myName}     stroke="#3b82f6" strokeWidth={2}   dot={false} strokeDasharray="5 3" />
              <Line yAxisId="left" type="monotone" dataKey="spouseNetWorth" name={spouseName} stroke="#ec4899" strokeWidth={2}   dot={false} strokeDasharray="5 3" />
              {refLines}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
        👆 Click any point to open the full breakdown for that year in the table below
      </p>

      {/* ── Tables ────────────────────────────────────────────────────────── */}
      <div className="border-t border-gray-200 dark:border-gray-800 pt-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <button onClick={() => setShowTable(t => !t)}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            {showTable ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            {showTable ? 'Hide' : 'Show'} year-by-year tables
          </button>
          {showTable && (
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg">
              {[{ id: 'summary', label: 'Summary' }, { id: 'accounts', label: 'Account Balances' }].map(t => (
                <button key={t.id} onClick={() => setTableTab(t.id)}
                  className={`text-xs px-2.5 py-1.5 rounded-md transition-colors ${tableTab === t.id
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm font-medium'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── SUMMARY TABLE ─────────────────────────────────────────────── */}
        {showTable && tableTab === 'summary' && (
          <div className="mt-3 overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">
                    Year
                    <ColTip tip="Calendar year in the simulation. ⚠ = crash year. 💸 = major purchase." />
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-blue-700 dark:text-blue-400">
                    {myName} (Sole)
                    <ColTip tip={`Total value of accounts and real estate owned solely by ${myName} — joint accounts are NOT included here.`} />
                  </th>
                  {hasSpouseData && (
                    <th className="px-3 py-2 text-right font-semibold text-pink-700 dark:text-pink-400">
                      {spouseName} (Sole)
                      <ColTip tip={`Total value of accounts and real estate owned solely by ${spouseName} — joint accounts are NOT included here.`} />
                    </th>
                  )}
                  {hasJoint && (
                    <th className="px-3 py-2 text-right font-semibold text-indigo-700 dark:text-indigo-400">
                      Joint
                      <ColTip tip="Total value of accounts and real estate held jointly (100% shown — not split). Both people own this together." />
                    </th>
                  )}
                  <th className="px-3 py-2 text-right font-semibold text-green-700 dark:text-green-400">
                    Liquid
                    <ColTip tip="All investment accounts combined (brokerage + 401k + Roth). This is the money used to calculate safe withdrawals. Real estate is excluded because it takes months to sell." />
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-emerald-700 dark:text-emerald-400">
                    RE (Illiquid)
                    <ColTip tip="Real estate value. Not counted in withdrawal calculations because you can't easily convert a house to cash to pay monthly bills." />
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-amber-700 dark:text-amber-400">
                    Total NW
                    <ColTip tip="Everything: sole investments + spouse investments + joint investments + all real estate. The full picture." />
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-red-700 dark:text-red-400">
                    Expenses
                    <ColTip tip="Your recurring living expenses this year, adjusted for inflation. This is what you'd need to withdraw to maintain your lifestyle in retirement." />
                  </th>
                  {hasPurchases && (
                    <th className="px-3 py-2 text-right font-semibold text-purple-700 dark:text-purple-400">
                      Purchases
                      <ColTip tip="One-time major purchases (car, vacation home, etc.) deducted from your liquid investment accounts this year." />
                    </th>
                  )}
                  <th className="px-3 py-2 text-right font-semibold text-gray-700 dark:text-gray-300">
                    SWR Cap
                    <ColTip tip={`${settings.withdrawalRate || 4}% of your after-tax liquid investments. This is how much you could safely withdraw every year and never run out of money (based on 95%+ historical success rates). When this number ≥ Expenses, you have financial freedom.`} />
                  </th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-700 dark:text-gray-300">
                    Status
                    <ColTip tip="💰 = first year SWR covers your retirement expenses (your F.U. Date!). ✓ = you're free from this year onward. — = not there yet." />
                  </th>
                </tr>
              </thead>
              <tbody>
                {simulation.map((d, i) => {
                  const prev = i > 0 ? simulation[i - 1] : null;
                  const isExpanded = expandedYear === d.year;
                  const illiquid   = d.netWorth - d.liquidAssets;

                  const meSole = soleNW(d, meSoleAccts, meSoleProps);
                  const spSole = soleNW(d, spSoleAccts, spSoleProps);
                  const joint  = soleNW(d, jointAccts,  jointProps);
                  const prevMe = prev ? soleNW(prev, meSoleAccts, meSoleProps) : null;
                  const prevSp = prev ? soleNW(prev, spSoleAccts, spSoleProps) : null;
                  const prevJt = prev ? soleNW(prev, jointAccts,  jointProps)  : null;

                  return (
                    <React.Fragment key={d.year}>
                      <tr
                        onClick={() => setExpandedYear(p => p === d.year ? null : d.year)}
                        className={`border-b border-gray-100 dark:border-gray-800 cursor-pointer transition-colors
                          ${isExpanded ? 'bg-amber-50 dark:bg-amber-900/20 font-semibold' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}
                          ${d.isFreedom && !isExpanded ? 'font-semibold' : ''}`}
                      >
                        <td className="px-3 py-2 text-gray-800 dark:text-gray-200">
                          {d.year}
                          {d.crashApplied && <span className="ml-1 text-orange-600 dark:text-orange-400" title={`Crash -${d.crashPercent}%`}>⚠</span>}
                          {d.unexpectedExpenses > 0 && <span className="ml-1 text-purple-600 dark:text-purple-400" title="Major purchase">💸</span>}
                          <span className="ml-1 text-gray-400 dark:text-gray-600 text-[10px]">{isExpanded ? '▲' : '▼'}</span>
                        </td>
                        <td className="px-3 py-2 text-right text-blue-700 dark:text-blue-400">
                          {fmtFull(meSole)}<YoyBadge current={meSole} prev={prevMe} />
                        </td>
                        {hasSpouseData && (
                          <td className="px-3 py-2 text-right text-pink-700 dark:text-pink-400">
                            {fmtFull(spSole)}<YoyBadge current={spSole} prev={prevSp} />
                          </td>
                        )}
                        {hasJoint && (
                          <td className="px-3 py-2 text-right text-indigo-700 dark:text-indigo-400">
                            {joint > 0 ? <>{fmtFull(joint)}<YoyBadge current={joint} prev={prevJt} /></> : '—'}
                          </td>
                        )}
                        <td className="px-3 py-2 text-right text-green-700 dark:text-green-400">
                          {fmtFull(d.liquidAssets)}<YoyBadge current={d.liquidAssets} prev={prev?.liquidAssets} />
                        </td>
                        <td className="px-3 py-2 text-right text-emerald-700 dark:text-emerald-400">
                          {illiquid > 0 ? fmtFull(illiquid) : '—'}
                        </td>
                        <td className="px-3 py-2 text-right text-amber-700 dark:text-amber-500 font-medium">
                          {fmtFull(d.netWorth)}<YoyBadge current={d.netWorth} prev={prev?.netWorth} />
                        </td>
                        <td className="px-3 py-2 text-right text-red-700 dark:text-red-400">
                          {d.recurringExpenses > 0 ? <>{fmtFull(d.recurringExpenses)}<YoyBadge current={d.recurringExpenses} prev={prev?.recurringExpenses} /></> : '—'}
                        </td>
                        {hasPurchases && (
                          <td className="px-3 py-2 text-right text-purple-700 dark:text-purple-400">
                            {d.unexpectedExpenses > 0 ? fmtFull(d.unexpectedExpenses) : '—'}
                          </td>
                        )}
                        <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">
                          {fmtFull(d.postTaxSwr4)}<YoyBadge current={d.postTaxSwr4} prev={prev?.postTaxSwr4} />
                        </td>
                        <td className="px-3 py-2 text-center">
                          {d.isFreedom
                            ? <span className="text-amber-600 dark:text-amber-400 font-bold" title="F.U. Date">💰</span>
                            : d.postTaxSwr4 >= d.freedomTarget && d.freedomTarget > 0
                              ? <span className="text-green-600 dark:text-green-500" title="Financially free">✓</span>
                              : '—'}
                        </td>
                      </tr>
                      {isExpanded && (
                        <InlineBreakdown
                          data={d}
                          myName={myName}
                          spouseName={spouseName}
                          colSpan={summaryColCount}
                          onClose={() => setExpandedYear(null)}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
              Sole = accounts/property in name only · Joint = shared (100% shown) · Click any row to expand
            </p>
          </div>
        )}

        {/* ── ACCOUNT BALANCES TABLE ────────────────────────────────────── */}
        {showTable && tableTab === 'accounts' && (
          <div className="mt-3 overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
            {accounts.length === 0 && properties.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-6">No accounts added yet.</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300 sticky left-0 bg-gray-100 dark:bg-gray-800">
                      Year
                      <ColTip tip="Calendar year. ⚠ = market crash applied this year. 💸 = major purchase deducted." />
                    </th>
                    {/* Me sole accounts */}
                    {meSoleAccts.map(a => (
                      <th key={a.id} className="px-3 py-2 text-right font-semibold whitespace-nowrap"
                        style={{ color: a.type === 'brokerage' ? '#92400e' : a.type === 'deferred' ? '#1e40af' : '#166534' }}>
                        {a.name}
                        <span className="block text-[9px] font-normal opacity-70">
                          {a.type === 'brokerage' ? 'Brokerage' : a.type === 'deferred' ? '401k/IRA' : 'Roth'} · {myName}
                        </span>
                        <ColTip tip={`End-of-year balance for ${a.name}. Grows at ${a.cagr || 7}% per year (unless global CAGR override is set). Crashes and expenses reduce it.`} />
                      </th>
                    ))}
                    {/* Spouse sole accounts */}
                    {spSoleAccts.map(a => (
                      <th key={a.id} className="px-3 py-2 text-right font-semibold whitespace-nowrap"
                        style={{ color: a.type === 'brokerage' ? '#9d174d' : a.type === 'deferred' ? '#9d174d' : '#9d174d' }}>
                        {a.name}
                        <span className="block text-[9px] font-normal opacity-70">
                          {a.type === 'brokerage' ? 'Brokerage' : a.type === 'deferred' ? '401k/IRA' : 'Roth'} · {spouseName}
                        </span>
                        <ColTip tip={`End-of-year balance for ${a.name}. Grows at ${a.cagr || 7}% per year. Crashes and expenses reduce it.`} />
                      </th>
                    ))}
                    {/* Joint accounts */}
                    {jointAccts.map(a => (
                      <th key={a.id} className="px-3 py-2 text-right font-semibold whitespace-nowrap text-indigo-700 dark:text-indigo-400">
                        {a.name}
                        <span className="block text-[9px] font-normal opacity-70">
                          {a.type === 'brokerage' ? 'Brokerage' : a.type === 'deferred' ? '401k/IRA' : 'Roth'} · Joint
                        </span>
                        <ColTip tip={`Joint account balance (full, not split). Both people share this ${a.name} account.`} />
                      </th>
                    ))}
                    {/* Properties */}
                    {properties.map(p => (
                      <th key={p.id} className="px-3 py-2 text-right font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                        {p.name}
                        <span className="block text-[9px] font-normal opacity-70">
                          Real Estate · {p.owner === 'spouse' ? spouseName : p.owner === 'joint' ? 'Joint' : myName}
                        </span>
                        <ColTip tip={`Property value growing at ${p.appreciationRate || 3}% per year. Crashes reduce this value too. Not used in SWR calculations.`} />
                      </th>
                    ))}
                    <th className="px-3 py-2 text-right font-semibold text-amber-700 dark:text-amber-400">
                      Total
                      <ColTip tip="Sum of all account balances and property values. Same as Total NW in the Summary tab." />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {simulation.map((d, i) => {
                    const prev = i > 0 ? simulation[i - 1] : null;
                    return (
                      <tr key={d.year}
                        className={`border-b border-gray-100 dark:border-gray-800 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50
                          ${d.crashApplied ? 'bg-orange-50/60 dark:bg-orange-900/5' : ''}
                          ${d.isFreedom ? 'font-semibold' : ''}`}>
                        <td className="px-3 py-2 text-gray-800 dark:text-gray-200 sticky left-0 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800">
                          {d.year}
                          {d.crashApplied && <span className="ml-1 text-orange-500" title={`Crash -${d.crashPercent}%`}>⚠</span>}
                          {d.unexpectedExpenses > 0 && <span className="ml-1 text-purple-500" title="Purchase">💸</span>}
                        </td>
                        {[...meSoleAccts, ...spSoleAccts, ...jointAccts].map(a => {
                          const bal     = d.accountBalances?.[a.id]    ?? 0;
                          const prevBal = prev?.accountBalances?.[a.id] ?? null;
                          const cls = a.owner === 'spouse'
                            ? 'text-pink-700 dark:text-pink-400'
                            : a.owner === 'joint'
                              ? 'text-indigo-700 dark:text-indigo-400'
                              : 'text-gray-700 dark:text-gray-300';
                          return (
                            <td key={a.id} className={`px-3 py-2 text-right ${cls}`}>
                              {fmtFull(bal)}
                              <YoyBadge current={bal} prev={i > 0 ? prevBal : null} />
                            </td>
                          );
                        })}
                        {properties.map(p => {
                          const val     = d.propertyValues?.[p.id]    ?? 0;
                          const prevVal = prev?.propertyValues?.[p.id] ?? null;
                          return (
                            <td key={p.id} className="px-3 py-2 text-right text-emerald-700 dark:text-emerald-400">
                              {fmtFull(val)}<YoyBadge current={val} prev={i > 0 ? prevVal : null} />
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-right text-amber-700 dark:text-amber-500 font-medium">
                          {fmtFull(d.netWorth)}<YoyBadge current={d.netWorth} prev={prev?.netWorth} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
              End-of-year balances after income, savings, expenses, crashes, and annual growth
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
