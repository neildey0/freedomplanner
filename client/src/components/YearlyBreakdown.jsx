import React from 'react';
import { X, CheckCircle, Info, AlertCircle } from 'lucide-react';
import { fmtFull } from '../utils/mathEngine';

export default function YearlyBreakdown({ data, myName = 'Me', spouseName = 'Spouse', onClose }) {
  if (!data) return null;

  const {
    year, myAge, spouseAge,
    meNetWorth, meInvestments, mePropertyValue,
    spouseNetWorth, spouseInvestments, spousePropertyValue,
    netWorth, liquidAssets, postTaxSwr4, freedomTarget,
    recurringExpenses, oneTimeExpenses, totalExpenses,
    taxableBalance, deferredBalance, rothBalance,
    realNetWorth, crashApplied, crashPercent, isFreedom,
  } = data;

  const illiquid = netWorth - liquidAssets;
  const hasSpouse = spouseNetWorth > 0;
  const yearsFromNow = year - new Date().getFullYear();

  return (
    <div className="mt-4 border-2 border-amber-200 dark:border-amber-800 rounded-2xl overflow-hidden">
      <div className="bg-amber-50 dark:bg-amber-900/30 px-4 py-3 flex items-center justify-between border-b border-amber-200 dark:border-amber-800">
        <div>
          <h2 className="font-bold text-gray-900 dark:text-white text-base">
            📅 {year} — Financial Snapshot
          </h2>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
            {myName} age {myAge}{hasSpouse ? ` · ${spouseName} age ${spouseAge}` : ''} · {yearsFromNow} years from now
          </p>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/50 text-gray-600 dark:text-gray-400 flex-shrink-0">
            <X size={16} />
          </button>
        )}
      </div>

      <div className="p-4 space-y-4 bg-white dark:bg-gray-900">
        {crashApplied && (
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-3 flex items-start gap-2">
            <AlertCircle size={16} className="text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-orange-700 dark:text-orange-400">
              <strong>Market crash simulated!</strong> All investments and properties dropped -{crashPercent}%.
            </p>
          </div>
        )}

        {/* Net worth breakdown */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4">
          <h3 className="font-bold text-sm text-gray-800 dark:text-gray-100 mb-3">Net Worth Breakdown</h3>
          <div className="space-y-2 text-sm">
            {hasSpouse && (
              <>
                <div className="flex justify-between">
                  <span className="text-blue-700 dark:text-blue-400">{myName}</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{fmtFull(meNetWorth)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-pink-700 dark:text-pink-400">{spouseName}</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{fmtFull(spouseNetWorth)}</span>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
              </>
            )}
            <div className="flex justify-between">
              <span className="text-green-700 dark:text-green-400">Liquid (investments)</span>
              <span className="font-semibold text-gray-900 dark:text-white">{fmtFull(liquidAssets)}</span>
            </div>
            {illiquid > 0 && (
              <div className="flex justify-between">
                <span className="text-emerald-700 dark:text-emerald-400">Illiquid (real estate)</span>
                <span className="font-semibold text-gray-900 dark:text-white">{fmtFull(illiquid)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold pt-1 border-t border-gray-200 dark:border-gray-700">
              <span className="text-gray-800 dark:text-gray-100">Total Net Worth</span>
              <span className="text-lg text-gray-900 dark:text-white">{fmtFull(netWorth)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">In today's dollars</span>
              <span className="text-gray-600 dark:text-gray-400">{fmtFull(realNetWorth)}</span>
            </div>
          </div>
        </div>

        {/* Tax buckets */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4">
          <h3 className="font-bold text-sm text-gray-800 dark:text-gray-100 mb-3">Investment Tax Buckets</h3>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-amber-700 dark:text-amber-400">Brokerage (taxable)</span>
              <span className="font-semibold text-gray-900 dark:text-white">{fmtFull(taxableBalance)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-700 dark:text-blue-400">401k/IRA (deferred)</span>
              <span className="font-semibold text-gray-900 dark:text-white">{fmtFull(deferredBalance)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-700 dark:text-green-400">Roth (tax-free)</span>
              <span className="font-semibold text-gray-900 dark:text-white">{fmtFull(rothBalance)}</span>
            </div>
          </div>
        </div>

        {/* Freedom check */}
        {freedomTarget > 0 && (
          <div className={`rounded-xl border p-4 ${isFreedom
            ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
            : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'}`}>
            <h3 className="font-bold text-sm text-gray-800 dark:text-gray-100 mb-3">Freedom Check</h3>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">SWR withdrawal capacity</span>
                <span className="font-bold text-green-700 dark:text-green-400">{fmtFull(postTaxSwr4)}/yr</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Retirement expenses needed</span>
                <span className="font-bold text-red-700 dark:text-red-400">{fmtFull(freedomTarget)}/yr</span>
              </div>
              {recurringExpenses > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">Recurring expenses this year</span>
                  <span className="text-gray-600 dark:text-gray-400">{fmtFull(recurringExpenses)}/yr</span>
                </div>
              )}
              {oneTimeExpenses > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">One-time expenses (liquid only)</span>
                  <span className="text-red-600 dark:text-red-400">-{fmtFull(oneTimeExpenses)}</span>
                </div>
              )}
              <div className={`mt-2 pt-2 border-t ${isFreedom ? 'border-green-300 dark:border-green-700' : 'border-gray-200 dark:border-gray-700'} flex items-center gap-2`}>
                {isFreedom
                  ? <><CheckCircle size={16} className="text-green-600 dark:text-green-400 flex-shrink-0" />
                      <span className="font-bold text-green-700 dark:text-green-400">
                        F.U. Date — your SWR covers all retirement expenses from here on.
                      </span></>
                  : <><Info size={16} className="text-gray-400 flex-shrink-0" />
                      <span className="text-gray-600 dark:text-gray-400 text-sm">
                        Need {fmtFull(freedomTarget - postTaxSwr4)}/yr more in SWR capacity.
                      </span></>
                }
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
