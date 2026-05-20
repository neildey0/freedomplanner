import React from 'react';
import { DollarSign, Calendar, Target, Wallet, PiggyBank, Home } from 'lucide-react';
import { usePlan } from '../context/PlanContext';
import { findFreedomDate, fmtFull } from '../utils/mathEngine';
import WealthChart from './WealthChart';

function MetricCard({ icon: Icon, label, value, sub, color = 'blue', highlight = false }) {
  const colors = {
    green:  'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20',
    blue:   'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20',
    purple: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20',
    orange: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20',
    pink:   'text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-900/20',
    emerald:'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20',
  };
  return (
    <div className={`card flex items-start gap-3 ${highlight ? 'ring-2 ring-amber-500' : ''}`}>
      <div className={`p-2.5 rounded-lg flex-shrink-0 ${colors[color]}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-xl font-bold text-gray-900 dark:text-white leading-tight mt-0.5 truncate">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function PersonSummary({ name, investments, propertyTotal, postTax, swr4, color }) {
  const netWorth = investments + propertyTotal;
  const border   = color === 'blue' ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/10'
                                    : 'border-pink-200 dark:border-pink-800 bg-pink-50 dark:bg-pink-900/10';
  const titleCls = color === 'blue' ? 'text-blue-800 dark:text-blue-300' : 'text-pink-800 dark:text-pink-300';

  if (netWorth === 0 && swr4 === 0) return null;

  return (
    <div className={`rounded-xl border p-4 ${border}`}>
      <h3 className={`font-semibold text-sm mb-3 ${titleCls}`}>{name}</h3>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-gray-500 dark:text-gray-400">Investments</p>
          <p className="font-bold text-gray-900 dark:text-white">{fmtFull(investments)}</p>
        </div>
        {propertyTotal > 0 && (
          <div>
            <p className="text-gray-500 dark:text-gray-400">Real Estate</p>
            <p className="font-bold text-gray-900 dark:text-white">{fmtFull(propertyTotal)}</p>
          </div>
        )}
        <div>
          <p className="text-gray-500 dark:text-gray-400">Net Worth</p>
          <p className="font-bold text-gray-900 dark:text-white">{fmtFull(netWorth)}</p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400">After-Tax Liquid</p>
          <p className="font-bold text-gray-900 dark:text-white">{fmtFull(postTax)}</p>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { state } = usePlan();
  const { accounts, simulation, settings } = state;
  const properties = state.properties || [];

  const myName     = settings.myName     || 'Me';
  const spouseName = settings.spouseName || 'Spouse';

  // Current totals
  const totalNetWorth = accounts.reduce((s, a) => s + Number(a.balance || 0), 0)
    + properties.reduce((s, p) => s + Number(p.currentValue || 0), 0);

  const myInvestments     = accounts.filter(a => (a.owner || 'me') === 'me').reduce((s, a) => s + Number(a.balance || 0), 0)
    + accounts.filter(a => (a.owner || 'me') === 'joint').reduce((s, a) => s + Number(a.balance || 0) / 2, 0);
  const spouseInvestments = accounts.filter(a => (a.owner || 'me') === 'spouse').reduce((s, a) => s + Number(a.balance || 0), 0)
    + accounts.filter(a => (a.owner || 'me') === 'joint').reduce((s, a) => s + Number(a.balance || 0) / 2, 0);

  const myProperties     = properties.filter(p => (p.owner || 'me') === 'me').reduce((s, p) => s + Number(p.currentValue || 0), 0)
    + properties.filter(p => (p.owner || 'me') === 'joint').reduce((s, p) => s + Number(p.currentValue || 0) / 2, 0);
  const spouseProperties = properties.filter(p => (p.owner || 'me') === 'spouse').reduce((s, p) => s + Number(p.currentValue || 0), 0)
    + properties.filter(p => (p.owner || 'me') === 'joint').reduce((s, p) => s + Number(p.currentValue || 0) / 2, 0);

  const myTaxable      = accounts.filter(a => (a.owner || 'me') === 'me'     && a.type === 'brokerage').reduce((s, a) => s + Number(a.balance || 0), 0);
  const myDeferred     = accounts.filter(a => (a.owner || 'me') === 'me'     && a.type === 'deferred' ).reduce((s, a) => s + Number(a.balance || 0), 0);
  const myRoth         = accounts.filter(a => (a.owner || 'me') === 'me'     && a.type === 'roth'     ).reduce((s, a) => s + Number(a.balance || 0), 0);
  const spTaxable      = accounts.filter(a => (a.owner || 'me') === 'spouse' && a.type === 'brokerage').reduce((s, a) => s + Number(a.balance || 0), 0);
  const spDeferred     = accounts.filter(a => (a.owner || 'me') === 'spouse' && a.type === 'deferred' ).reduce((s, a) => s + Number(a.balance || 0), 0);
  const spRoth         = accounts.filter(a => (a.owner || 'me') === 'spouse' && a.type === 'roth'     ).reduce((s, a) => s + Number(a.balance || 0), 0);

  const myPostTax      = myRoth + myTaxable * 0.85 + myDeferred * 0.80;
  const spPostTax      = spRoth + spTaxable * 0.85 + spDeferred * 0.80;
  const combinedPostTax= myPostTax + spPostTax;

  const freedomYear    = findFreedomDate(simulation);
  const yearsToFreedom = freedomYear ? freedomYear - settings.currentYear : null;
  const currentSwr     = combinedPostTax * 0.04;
  const freedomData    = simulation.find(d => d.isFreedom);
  const peakData       = simulation.reduce((max, d) => d.netWorth > (max?.netWorth || 0) ? d : max, null);

  const totalAnnualExpenses = state.expenses
    .filter(e => e.type === 'recurring')
    .reduce((s, e) => s + Number(e.amount || 0), 0) || Number(settings.targetRetirementIncome || 0);

  const hasSpouseAssets = spouseInvestments > 0 || spouseProperties > 0;

  return (
    <div className="space-y-6">
      {/* Freedom Date Hero */}
      {freedomYear ? (
        <div className="bg-gradient-to-r from-amber-600 to-yellow-500 rounded-2xl p-6 text-gray-950 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-900 text-sm font-medium mb-1">Your F.U. Date</p>
              <h2 className="text-5xl font-black">{freedomYear}</h2>
              <p className="text-amber-900 mt-2">
                {yearsToFreedom <= 0
                  ? 'You already have F**K YOU Money!'
                  : `${yearsToFreedom} year${yearsToFreedom === 1 ? '' : 's'} until you can say F**K YOU`}
              </p>
              {freedomData && (
                <p className="text-amber-800 text-sm mt-1">
                  Net worth target: {fmtFull(freedomData.netWorth)} · 4% SWR: {fmtFull(freedomData.postTaxSwr4)}/yr
                </p>
              )}
            </div>
            <div className="text-7xl opacity-30">💰</div>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-2xl p-6 text-white shadow-lg border border-amber-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium mb-1">F.U. Date</p>
              <h2 className="text-3xl font-black text-amber-400">Beyond Horizon</h2>
              <p className="text-gray-400 mt-2">Add recurring expenses or a target retirement income to find your date</p>
            </div>
            <div className="text-7xl opacity-30">📈</div>
          </div>
        </div>
      )}

      {/* Per-person summary */}
      {(myInvestments > 0 || myProperties > 0 || hasSpouseAssets) && (
        <div className={`grid gap-3 ${hasSpouseAssets ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
          <PersonSummary name={myName} investments={myInvestments} propertyTotal={myProperties} postTax={myPostTax} swr4={myPostTax * 0.04} color="blue" />
          {hasSpouseAssets && <PersonSummary name={spouseName} investments={spouseInvestments} propertyTotal={spouseProperties} postTax={spPostTax} swr4={spPostTax * 0.04} color="pink" />}
        </div>
      )}

      {/* Key metrics grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <MetricCard icon={DollarSign} label="Combined Net Worth"    value={fmtFull(totalNetWorth)}         sub={`After-tax liquid: ${fmtFull(combinedPostTax)}`} color="blue" />
        <MetricCard icon={Target}     label="Combined 4% SWR Now"   value={fmtFull(currentSwr) + '/yr'}    sub={`Need: ${fmtFull(totalAnnualExpenses)}/yr`}       color="green" />
        <MetricCard icon={Calendar}   label="Peak Combined Net Worth" value={peakData ? fmtFull(peakData.netWorth) : '—'} sub={peakData?.year ? `In ${peakData.year}` : ''} color="purple" />
        <MetricCard icon={Wallet}     label={`${myName} Investments`}     value={fmtFull(myInvestments)}  sub={`After-tax: ${fmtFull(myPostTax)}`}    color="blue" />
        {hasSpouseAssets && <MetricCard icon={PiggyBank} label={`${spouseName} Investments`} value={fmtFull(spouseInvestments)} sub={`After-tax: ${fmtFull(spPostTax)}`} color="pink" />}
        {(myProperties + spouseProperties) > 0 && (
          <MetricCard icon={Home} label="Total Real Estate" value={fmtFull(myProperties + spouseProperties)} sub="Not counted in 4% SWR (illiquid)" color="emerald" />
        )}
      </div>

      {/* Chart */}
      <WealthChart />

      {/* Tax Bucket Analysis */}
      <div className="card">
        <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3 text-sm">Tax Bucket Analysis — {myName}{hasSpouseAssets ? ` + ${spouseName}` : ''}</h3>
        <div className="space-y-3">
          {[
            { label: 'Brokerage (Taxable)',  value: myTaxable + spTaxable,   pct: totalNetWorth > 0 ? (myTaxable + spTaxable) / totalNetWorth : 0,   color: 'bg-amber-400',  tax: '15% Cap Gains', taxAmt: (myTaxable + spTaxable) * 0.15 },
            { label: '401k/IRA (Deferred)',  value: myDeferred + spDeferred, pct: totalNetWorth > 0 ? (myDeferred + spDeferred) / totalNetWorth : 0, color: 'bg-blue-500',   tax: '20% Income Tax', taxAmt: (myDeferred + spDeferred) * 0.20 },
            { label: 'Roth (Tax-Free)',       value: myRoth + spRoth,         pct: totalNetWorth > 0 ? (myRoth + spRoth) / totalNetWorth : 0,         color: 'bg-green-500',  tax: '0% Tax',         taxAmt: 0 },
            ...(myProperties + spouseProperties > 0 ? [{ label: 'Real Estate', value: myProperties + spouseProperties, pct: totalNetWorth > 0 ? (myProperties + spouseProperties) / totalNetWorth : 0, color: 'bg-emerald-400', tax: 'Illiquid asset', taxAmt: 0 }] : []),
          ].map(b => (
            <div key={b.label}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-600 dark:text-gray-400">{b.label}</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  {fmtFull(b.value)} <span className="text-gray-400">({(b.pct * 100).toFixed(0)}%)</span>
                </span>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div className={`h-full ${b.color} rounded-full transition-all duration-500`} style={{ width: `${b.pct * 100}%` }} />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                <span>{b.tax}</span>
                {b.taxAmt > 0 && <span className="text-red-400">-{fmtFull(b.taxAmt)} if fully withdrawn</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
