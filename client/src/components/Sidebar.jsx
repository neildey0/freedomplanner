import React, { useState } from 'react';
import { SlidersHorizontal, TrendingUp, Zap, AlertTriangle, PiggyBank, Target, X } from 'lucide-react';
import { usePlan } from '../context/PlanContext';
import { findFreedomDate } from '../utils/mathEngine';

export function useSidebarToggle() {
  const [open, setOpen] = useState(false);
  return { open, toggle: () => setOpen(o => !o), close: () => setOpen(false) };
}

export default function Sidebar({ mobileOpen = false, onClose }) {
  const { state, updateSettings } = usePlan();
  const { settings, simulation } = state;
  const freedomYear = findFreedomDate(simulation);
  const yearsToFreedom = freedomYear ? freedomYear - settings.currentYear : null;

  const set = (key, val) => updateSettings({ [key]: val });

  const sidebarContent = (
    <div className="p-4 overflow-y-auto h-full">
      <div className="flex items-center gap-2 mb-5 text-sm font-semibold text-gray-700 dark:text-gray-300">
        <SlidersHorizontal size={16} />
        Simulation Controls
      </div>

      {/* Freedom Date Display */}
      {freedomYear && (
        <div className="mb-5 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-center">
          <div className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">Freedom Date</div>
          <div className="text-2xl font-bold text-green-700 dark:text-green-300">{freedomYear}</div>
          <div className="text-xs text-green-600 dark:text-green-400">
            {yearsToFreedom <= 0 ? 'You are FREE!' : `${yearsToFreedom} years away`}
          </div>
        </div>
      )}
      {!freedomYear && (
        <div className="mb-5 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl text-center">
          <div className="text-xs text-orange-600 dark:text-orange-400 font-medium mb-1">Freedom Date</div>
          <div className="text-lg font-bold text-orange-700 dark:text-orange-300">Not in range</div>
          <div className="text-xs text-orange-600 dark:text-orange-400">Adjust inputs to find your date</div>
        </div>
      )}

      {/* Annual Savings */}
      <div className="mb-5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
          <PiggyBank size={13} />
          Annual Savings
        </div>
        <div className="relative mb-2">
          <span className="absolute left-3 top-2 text-gray-500 text-sm">$</span>
          <input
            type="number"
            className="input pl-7"
            value={settings.annualSavings}
            min={0}
            step={1000}
            onChange={e => set('annualSavings', Number(e.target.value))}
          />
        </div>
        <div>
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>Deferred: {settings.savingsSplit ?? 60}%</span>
            <span>Taxable: {100 - (settings.savingsSplit ?? 60)}%</span>
          </div>
          <input
            type="range"
            min={0} max={100} step={5}
            value={settings.savingsSplit ?? 60}
            onChange={e => set('savingsSplit', Number(e.target.value))}
            className="w-full accent-blue-500"
          />
          <p className="text-xs text-gray-400 mt-1">Drag to adjust 401k/IRA vs brokerage split</p>
        </div>
      </div>

      {/* Target Retirement Income */}
      <div className="mb-5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
          <Target size={13} />
          Target Retirement Income
        </div>
        <div className="relative">
          <span className="absolute left-3 top-2 text-gray-500 text-sm">$</span>
          <input
            type="number"
            className="input pl-7"
            value={settings.targetRetirementIncome || ''}
            min={0}
            step={1000}
            placeholder="0"
            onChange={e => set('targetRetirementIncome', Number(e.target.value))}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">Used for freedom date if no recurring expenses set</p>
      </div>

      {/* Inflation */}
      <div className="mb-5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
          <TrendingUp size={13} />
          Inflation Rate
        </div>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0} max={10} step={0.5}
            value={settings.inflation}
            onChange={e => set('inflation', Number(e.target.value))}
            className="flex-1 accent-green-500"
          />
          <span className="text-sm font-bold text-gray-700 dark:text-gray-300 w-10 text-right">
            {settings.inflation}%
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-1">All expenses projected in real dollars</p>
      </div>

      {/* CAGR Override */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            <Zap size={13} />
            CAGR Override
          </div>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.globalCagrOverride !== null && settings.globalCagrOverride !== undefined}
              onChange={e => set('globalCagrOverride', e.target.checked ? 7 : null)}
              className="rounded"
            />
            <span className="text-xs text-gray-500">Enable</span>
          </label>
        </div>
        {settings.globalCagrOverride !== null && settings.globalCagrOverride !== undefined ? (
          <>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0} max={20} step={0.5}
                value={settings.globalCagrOverride}
                onChange={e => set('globalCagrOverride', Number(e.target.value))}
                className="flex-1 accent-green-500"
              />
              <span className="text-sm font-bold text-gray-700 dark:text-gray-300 w-10 text-right">
                {Number(settings.globalCagrOverride).toFixed(1)}%
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Overrides per-account CAGR settings</p>
          </>
        ) : (
          <p className="text-xs text-gray-400">Using per-account CAGR values</p>
        )}
      </div>

      {/* Sequence of Returns Risk */}
      <div className="mb-5 border-t border-gray-100 dark:border-gray-800 pt-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wide">
            <AlertTriangle size={13} />
            Market Crash (SORR)
          </div>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.crashYear !== null && settings.crashYear !== undefined}
              onChange={e => set('crashYear', e.target.checked ? settings.currentYear + 5 : null)}
              className="rounded"
            />
            <span className="text-xs text-gray-500">Enable</span>
          </label>
        </div>

        {settings.crashYear !== null && settings.crashYear !== undefined && (
          <>
            <div className="mb-3">
              <label className="label">Crash Year</label>
              <input
                type="number"
                className="input"
                value={settings.crashYear}
                min={settings.currentYear}
                max={settings.currentYear + settings.projectionYears}
                onChange={e => set('crashYear', Number(e.target.value))}
              />
            </div>
            <div>
              <label className="label">Crash Magnitude: -{settings.crashPercent}%</label>
              <input
                type="range"
                min={10} max={60} step={5}
                value={settings.crashPercent}
                onChange={e => set('crashPercent', Number(e.target.value))}
                className="w-full accent-orange-500"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>-10% (Mild)</span>
                <span>-60% (Severe)</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Projection Years */}
      <div className="mb-5 border-t border-gray-100 dark:border-gray-800 pt-4">
        <label className="label text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
          Projection Horizon
        </label>
        <div className="flex items-center gap-3 mt-2">
          <input
            type="range"
            min={10} max={60} step={5}
            value={settings.projectionYears}
            onChange={e => set('projectionYears', Number(e.target.value))}
            className="flex-1 accent-green-500"
          />
          <span className="text-sm font-bold text-gray-700 dark:text-gray-300 w-14 text-right">
            {settings.projectionYears} yrs
          </span>
        </div>
      </div>

      <div className="text-xs text-gray-400 dark:text-gray-600 pt-2 border-t border-gray-100 dark:border-gray-800">
        All data stored locally. No server. No cloud.
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="w-72 flex-shrink-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 overflow-y-auto hidden md:block">
        {sidebarContent}
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
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
