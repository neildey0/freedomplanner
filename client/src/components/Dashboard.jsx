import React from 'react';
import { TrendingUp, DollarSign, Calendar, Target, Wallet, PiggyBank } from 'lucide-react';
import { usePlan } from '../context/PlanContext';
import { findFreedomDate, getCurrentNetWorth, fmtFull } from '../utils/mathEngine';
import WealthChart from './WealthChart';

function MetricCard({ icon: Icon, label, value, sub, color = 'blue', highlight = false }) {
  const colors = {
    green: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20',
    blue: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20',
    purple: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20',
    orange: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20',
    red: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20',
  };
  return (
    <div className={`card flex items-start gap-3 ${highlight ? 'ring-2 ring-green-500 dark:ring-green-400' : ''}`}>
      <div className={`p-2.5 rounded-lg ${colors[color]}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-xl font-bold text-gray-900 dark:text-white leading-tight mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { state } = usePlan();
  const { accounts, simulation, settings } = state;

  const netWorth = getCurrentNetWorth(accounts);
  const taxable = accounts.filter(a => a.type === 'brokerage').reduce((s, a) => s + Number(a.balance || 0), 0);
  const deferred = accounts.filter(a => a.type === 'deferred').reduce((s, a) => s + Number(a.balance || 0), 0);
  const roth = accounts.filter(a => a.type === 'roth').reduce((s, a) => s + Number(a.balance || 0), 0);
  const postTaxNetWorth = roth + taxable * 0.85 + deferred * 0.80;

  const freedomYear = findFreedomDate(simulation);
  const yearsToFreedom = freedomYear ? freedomYear - settings.currentYear : null;
  const currentSwr = netWorth * 0.04;
  const freedomData = simulation.find(d => d.isFreedom);
  const peakData = simulation.reduce((max, d) => d.netWorth > max.netWorth ? d : max, simulation[0] || {});

  const totalAnnualExpenses = state.expenses
    .filter(e => e.type === 'recurring')
    .reduce((s, e) => s + Number(e.amount || 0), 0) || Number(state.settings.targetRetirementIncome || 0);

  return (
    <div className="space-y-6">
      {/* Freedom Date Hero */}
      {freedomYear ? (
        <div className="bg-gradient-to-r from-green-600 to-emerald-500 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium mb-1">Your Freedom Date</p>
              <h2 className="text-5xl font-black">{freedomYear}</h2>
              <p className="text-green-100 mt-2">
                {yearsToFreedom <= 0
                  ? 'You have already achieved financial freedom!'
                  : `${yearsToFreedom} year${yearsToFreedom === 1 ? '' : 's'} to financial freedom`
                }
              </p>
              {freedomData && (
                <p className="text-green-200 text-sm mt-1">
                  Net worth target: {fmtFull(freedomData.netWorth)} — SWR: {fmtFull(freedomData.postTaxSwr4)}/yr
                </p>
              )}
            </div>
            <div className="text-7xl opacity-30">🗽</div>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium mb-1">Freedom Date</p>
              <h2 className="text-3xl font-black">Beyond Horizon</h2>
              <p className="text-orange-100 mt-2">Increase savings or CAGR to find your freedom date</p>
            </div>
            <div className="text-7xl opacity-30">📈</div>
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <MetricCard
          icon={DollarSign}
          label="Current Net Worth"
          value={fmtFull(netWorth)}
          sub={`Post-tax: ${fmtFull(postTaxNetWorth)}`}
          color="blue"
        />
        <MetricCard
          icon={Target}
          label="Current 4% SWR"
          value={fmtFull(currentSwr) + '/yr'}
          sub={`Need: ${fmtFull(totalAnnualExpenses)}/yr`}
          color="green"
        />
        <MetricCard
          icon={TrendingUp}
          label="Brokerage (Taxable)"
          value={fmtFull(taxable)}
          sub="15% cap gains on withdrawal"
          color="orange"
        />
        <MetricCard
          icon={Wallet}
          label="Deferred (401k/IRA)"
          value={fmtFull(deferred)}
          sub="20% income tax on withdrawal"
          color="blue"
        />
        <MetricCard
          icon={PiggyBank}
          label="Roth (Tax-Free)"
          value={fmtFull(roth)}
          sub="0% tax on withdrawal"
          color="green"
        />
        <MetricCard
          icon={Calendar}
          label="Peak Net Worth"
          value={peakData?.netWorth ? fmtFull(peakData.netWorth) : '—'}
          sub={peakData?.year ? `In ${peakData.year}` : ''}
          color="purple"
        />
      </div>

      {/* Chart */}
      <WealthChart />

      {/* Tax Bucket Summary */}
      <div className="card">
        <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3 text-sm">Tax Bucket Analysis</h3>
        <div className="space-y-3">
          {[
            { label: 'Brokerage (Taxable)', value: taxable, pct: netWorth ? taxable / netWorth : 0, color: 'bg-amber-400', tax: '15% Cap Gains', taxAmount: taxable * 0.15 },
            { label: '401k/IRA (Deferred)', value: deferred, pct: netWorth ? deferred / netWorth : 0, color: 'bg-blue-500', tax: '20% Income Tax', taxAmount: deferred * 0.20 },
            { label: 'Roth (Tax-Free)', value: roth, pct: netWorth ? roth / netWorth : 0, color: 'bg-green-500', tax: '0% Tax', taxAmount: 0 },
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
                {b.taxAmount > 0 && <span className="text-red-400">-{fmtFull(b.taxAmount)} if fully withdrawn</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
