import React, { useState } from 'react';
import { SlidersHorizontal, TrendingUp, Zap, AlertTriangle, PiggyBank, Target, Users, X, Briefcase, DollarSign } from 'lucide-react';
import { usePlan } from '../context/PlanContext';
import { findFreedomDate } from '../utils/mathEngine';

export default function Sidebar({ mobileOpen = false, onClose }) {
  const { state, updateSettings } = usePlan();
  const { settings, simulation } = state;
  const freedomYear      = findFreedomDate(simulation);
  const yearsToFreedom   = freedomYear ? freedomYear - settings.currentYear : null;
  const myName           = settings.myName     || 'Me';
  const spouseName       = settings.spouseName || 'Spouse';

  const set = (key, val) => updateSettings({ [key]: val });

  const content = (
    <div className="p-4 overflow-y-auto h-full space-y-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
        <SlidersHorizontal size={16} /> Simulation Controls
      </div>

      {/* F.U. Date */}
      {freedomYear ? (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center">
          <div className="text-xs text-amber-400 font-medium mb-1">💰 F.U. Date</div>
          <div className="text-2xl font-bold text-amber-300">{freedomYear}</div>
          <div className="text-xs text-amber-400">
            {yearsToFreedom <= 0 ? 'You already have F**K YOU Money!' : `${yearsToFreedom} year${yearsToFreedom === 1 ? '' : 's'} away`}
          </div>
        </div>
      ) : (
        <div className="p-3 bg-gray-800 border border-gray-700 rounded-xl text-center">
          <div className="text-xs text-gray-400 font-medium mb-1">F.U. Date</div>
          <div className="text-lg font-bold text-gray-300">Not in range</div>
          <div className="text-xs text-gray-500">Add recurring expenses or a target income</div>
        </div>
      )}

      {/* Names */}
      <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
          <Users size={13} /> Names
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">Your name</label>
            <input className="input text-sm" value={settings.myName || ''} placeholder="Me"
              onChange={e => set('myName', e.target.value)} />
          </div>
          <div>
            <label className="label">Spouse name</label>
            <input className="input text-sm" value={settings.spouseName || ''} placeholder="Spouse"
              onChange={e => set('spouseName', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Annual Savings — per person */}
      <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400 mb-3 uppercase tracking-wide">
          <PiggyBank size={13} /> Annual Savings
        </div>

        {/* Me */}
        <div className="mb-3">
          <label className="label">{myName}'s Savings / year</label>
          <div className="relative mb-1">
            <span className="absolute left-3 top-2 text-gray-500 text-sm">$</span>
            <input type="number" className="input pl-7" min={0} step={1000}
              value={settings.myAnnualSavings ?? settings.annualSavings ?? 0}
              onChange={e => set('myAnnualSavings', Number(e.target.value))} />
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500 mb-0.5">
            <span>401k/Deferred: {settings.savingsSplit ?? 60}%</span>
            <span>Brokerage: {100 - (settings.savingsSplit ?? 60)}%</span>
          </div>
          <input type="range" min={0} max={100} step={5}
            value={settings.savingsSplit ?? 60}
            onChange={e => set('savingsSplit', Number(e.target.value))}
            className="w-full accent-blue-500" />
        </div>

        {/* Spouse */}
        <div>
          <label className="label">{spouseName}'s Savings / year</label>
          <div className="relative mb-1">
            <span className="absolute left-3 top-2 text-gray-500 text-sm">$</span>
            <input type="number" className="input pl-7" min={0} step={1000}
              value={settings.spouseAnnualSavings ?? 0}
              onChange={e => set('spouseAnnualSavings', Number(e.target.value))} />
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500 mb-0.5">
            <span>401k/Deferred: {settings.spouseSavingsSplit ?? 60}%</span>
            <span>Brokerage: {100 - (settings.spouseSavingsSplit ?? 60)}%</span>
          </div>
          <input type="range" min={0} max={100} step={5}
            value={settings.spouseSavingsSplit ?? 60}
            onChange={e => set('spouseSavingsSplit', Number(e.target.value))}
            className="w-full accent-pink-500" />
        </div>
      </div>

      {/* Planned Retirement Year */}
      <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wide">
            <Briefcase size={13} /> Planned Retirement Year
          </div>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox"
              checked={settings.retirementYear !== null && settings.retirementYear !== undefined}
              onChange={e => set('retirementYear', e.target.checked ? settings.currentYear + 5 : null)}
              className="rounded" />
            <span className="text-xs text-gray-500">Set</span>
          </label>
        </div>
        {settings.retirementYear !== null && settings.retirementYear !== undefined ? (
          <>
            <input type="number" className="input"
              value={settings.retirementYear}
              min={settings.currentYear}
              max={settings.currentYear + settings.projectionYears}
              onChange={e => set('retirementYear', Number(e.target.value))} />
            <p className="text-xs text-gray-400 mt-1">
              Income + savings continue through end of {settings.retirementYear}. After that, expenses drawn from corpus.
              {freedomYear && Number(settings.retirementYear) > freedomYear && (
                <span className="text-purple-500"> ({Number(settings.retirementYear) - freedomYear}yr past freedom date)</span>
              )}
            </p>
          </>
        ) : (
          <p className="text-xs text-gray-400">Income stops automatically at freedom date ({freedomYear || '—'})</p>
        )}
      </div>

      {/* Target Retirement Income */}
      <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
          <Target size={13} /> Target Retirement Income
        </div>
        <div className="relative">
          <span className="absolute left-3 top-2 text-gray-500 text-sm">$</span>
          <input type="number" className="input pl-7" min={0} step={1000} placeholder="0"
            value={settings.targetRetirementIncome || ''}
            onChange={e => set('targetRetirementIncome', Number(e.target.value))} />
        </div>
        <p className="text-xs text-gray-400 mt-1">Used for freedom date if no recurring expenses are set</p>
      </div>

      {/* Inflation */}
      <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
          <TrendingUp size={13} /> Inflation Rate
        </div>
        <div className="flex items-center gap-3">
          <input type="range" min={0} max={10} step={0.5}
            value={settings.inflation}
            onChange={e => set('inflation', Number(e.target.value))}
            className="flex-1 accent-green-500" />
          <span className="text-sm font-bold w-10 text-right">{settings.inflation}%</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">All future expenses projected in real dollars</p>
      </div>

      {/* CAGR Override */}
      <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            <Zap size={13} /> Global CAGR Override
          </div>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox"
              checked={settings.globalCagrOverride !== null && settings.globalCagrOverride !== undefined}
              onChange={e => set('globalCagrOverride', e.target.checked ? 7 : null)}
              className="rounded" />
            <span className="text-xs text-gray-500">Enable</span>
          </label>
        </div>
        {settings.globalCagrOverride !== null && settings.globalCagrOverride !== undefined ? (
          <>
            <div className="flex items-center gap-3">
              <input type="range" min={0} max={20} step={0.5}
                value={settings.globalCagrOverride}
                onChange={e => set('globalCagrOverride', Number(e.target.value))}
                className="flex-1 accent-green-500" />
              <span className="text-sm font-bold w-10 text-right">{Number(settings.globalCagrOverride).toFixed(1)}%</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Overrides all per-account CAGR values</p>
          </>
        ) : (
          <p className="text-xs text-gray-400">Using per-account CAGR values</p>
        )}
      </div>

      {/* Market Crashes (SORR) */}
      <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wide">
            <AlertTriangle size={13} /> Market Crashes (SORR)
          </div>
          <button
            onClick={() => {
              const crashes = [...(settings.crashes || [])];
              crashes.push({ id: `c${Date.now()}`, year: settings.currentYear + 5 + crashes.length * 5, percent: 30 });
              set('crashes', crashes);
            }}
            className="text-xs px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/50 font-medium"
          >
            + Add
          </button>
        </div>
        {(settings.crashes || []).length === 0 && (
          <p className="text-xs text-gray-400">No crashes simulated. Add one to test SORR.</p>
        )}
        <div className="space-y-3">
          {(settings.crashes || []).map((crash, idx) => (
            <div key={crash.id} className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-orange-700 dark:text-orange-400">Crash {idx + 1}</span>
                <button
                  onClick={() => set('crashes', (settings.crashes || []).filter(c => c.id !== crash.id))}
                  className="text-xs text-red-500 hover:text-red-700 dark:text-red-400"
                >✕</button>
              </div>
              <label className="label">Year</label>
              <input type="number" className="input mb-2"
                value={crash.year}
                min={settings.currentYear}
                max={settings.currentYear + (settings.projectionYears || 60)}
                onChange={e => set('crashes', (settings.crashes || []).map(c =>
                  c.id === crash.id ? { ...c, year: Number(e.target.value) } : c
                ))} />
              <label className="label">Drop: -{crash.percent}%</label>
              <input type="range" min={5} max={70} step={5}
                value={crash.percent}
                onChange={e => set('crashes', (settings.crashes || []).map(c =>
                  c.id === crash.id ? { ...c, percent: Number(e.target.value) } : c
                ))}
                className="w-full accent-orange-500" />
              <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                <span>-5% (Minor)</span><span>-70% (Severe)</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Major Purchases */}
      <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wide">
            <DollarSign size={13} /> Major Purchases
          </div>
          <button
            onClick={() => {
              const purchases = [...(settings.unexpectedExpenses || [])];
              purchases.push({ id: `p${Date.now()}`, name: 'Purchase', year: settings.currentYear + 3, amount: 50000 });
              set('unexpectedExpenses', purchases);
            }}
            className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 font-medium"
          >
            + Add
          </button>
        </div>
        {(settings.unexpectedExpenses || []).length === 0 && (
          <p className="text-xs text-gray-400">No major purchases. Add one to deduct from liquid assets.</p>
        )}
        <div className="space-y-3">
          {(settings.unexpectedExpenses || []).map((p, idx) => (
            <div key={p.id} className="bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-purple-700 dark:text-purple-400">Purchase {idx + 1}</span>
                <button
                  onClick={() => set('unexpectedExpenses', (settings.unexpectedExpenses || []).filter(x => x.id !== p.id))}
                  className="text-xs text-red-500 hover:text-red-700 dark:text-red-400"
                >✕</button>
              </div>
              <label className="label">Name</label>
              <input type="text" className="input mb-2" value={p.name || ''}
                onChange={e => set('unexpectedExpenses', (settings.unexpectedExpenses || []).map(x =>
                  x.id === p.id ? { ...x, name: e.target.value } : x
                ))} />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Year</label>
                  <input type="number" className="input"
                    value={p.year}
                    min={settings.currentYear}
                    max={settings.currentYear + (settings.projectionYears || 60)}
                    onChange={e => set('unexpectedExpenses', (settings.unexpectedExpenses || []).map(x =>
                      x.id === p.id ? { ...x, year: Number(e.target.value) } : x
                    ))} />
                </div>
                <div>
                  <label className="label">Amount ($)</label>
                  <input type="number" className="input" min={0} step={10000}
                    value={p.amount}
                    onChange={e => set('unexpectedExpenses', (settings.unexpectedExpenses || []).map(x =>
                      x.id === p.id ? { ...x, amount: Number(e.target.value) } : x
                    ))} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Projection Horizon */}
      <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
        <label className="label text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
          Projection Horizon
        </label>
        <div className="flex items-center gap-3 mt-2">
          <input type="range" min={10} max={60} step={5}
            value={settings.projectionYears}
            onChange={e => set('projectionYears', Number(e.target.value))}
            className="flex-1 accent-green-500" />
          <span className="text-sm font-bold w-14 text-right">{settings.projectionYears} yrs</span>
        </div>
      </div>

      <div className="text-xs text-gray-400 dark:text-gray-600 pt-2 border-t border-gray-100 dark:border-gray-800">
        All data stored locally. No server. No cloud.
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="w-72 flex-shrink-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 overflow-y-auto hidden md:block">
        {content}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="absolute inset-0 bg-black/40" onClick={onClose} />
          <aside className="relative w-80 max-w-full bg-white dark:bg-gray-900 h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-gray-200 dark:border-gray-800">
              <span className="font-semibold text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <SlidersHorizontal size={15} /> Simulation Controls
              </span>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                <X size={16} />
              </button>
            </div>
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
