import React from 'react';
import { X, TrendingUp, Home, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { fmtFull } from '../utils/mathEngine';

const TYPE_LABELS = {
  brokerage: 'Brokerage (Taxable)',
  deferred:  '401k / IRA (Deferred)',
  roth:      'Roth IRA (Tax-Free)',
};

const TYPE_TAX_NOTE = {
  brokerage: (bal) => `15% capital gains tax if withdrawn → ${fmtFull(bal * 0.85)} after tax`,
  deferred:  (bal) => `20% income tax if withdrawn → ${fmtFull(bal * 0.80)} after tax`,
  roth:      ()    => `No tax ever — completely tax-free!`,
};

function AccountRow({ acct }) {
  return (
    <div className="py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{acct.name}</span>
        <span className="text-sm font-bold text-gray-900 dark:text-white">{fmtFull(acct.balance)}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 dark:text-gray-400">{TYPE_LABELS[acct.type] || acct.type}</span>
        <span className={`text-xs ${acct.type === 'roth' ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
          {TYPE_TAX_NOTE[acct.type]?.(acct.balance)}
        </span>
      </div>
    </div>
  );
}

function PropertyRow({ prop }) {
  const hasRental = prop.annualRent > 0 || prop.annualExpenses > 0;
  return (
    <div className="py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{prop.name}</span>
        <span className="text-sm font-bold text-gray-900 dark:text-white">{fmtFull(prop.value)}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 dark:text-gray-400">{prop.appreciationRate}%/yr appreciation</span>
        {hasRental && (
          <span className={`text-xs ${prop.netRentalAnnual >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
            {prop.netRentalAnnual >= 0 ? '+' : ''}{fmtFull(prop.netRentalAnnual)}/yr net rental income
          </span>
        )}
      </div>
      {hasRental && (
        <p className="text-xs text-gray-400 mt-0.5">
          Rent {fmtFull(prop.annualRent)}/yr − Expenses {fmtFull(prop.annualExpenses)}/yr = {fmtFull(prop.netRentalAnnual)}/yr
        </p>
      )}
    </div>
  );
}

function PersonSection({ person, color }) {
  const colorMap = {
    blue:   { bg: 'bg-blue-50 dark:bg-blue-900/20',  border: 'border-blue-200 dark:border-blue-800',  title: 'text-blue-800 dark:text-blue-300',  accent: 'text-blue-600 dark:text-blue-400' },
    pink:   { bg: 'bg-pink-50 dark:bg-pink-900/20',  border: 'border-pink-200 dark:border-pink-800',  title: 'text-pink-800 dark:text-pink-300',  accent: 'text-pink-600 dark:text-pink-400' },
  };
  const c = colorMap[color] || colorMap.blue;

  const hasAccounts   = person.accounts.length > 0;
  const hasProperties = person.properties.length > 0;
  const hasAnything   = hasAccounts || hasProperties;

  if (!hasAnything) return null;

  return (
    <div className={`rounded-xl border ${c.bg} ${c.border} p-4`}>
      <h3 className={`font-bold text-base mb-3 ${c.title}`}>{person.name}'s Finances</h3>

      {hasAccounts && (
        <>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Investment Accounts</p>
          {person.accounts.map(a => <AccountRow key={a.id} acct={a} />)}
          <div className={`mt-2 mb-3 flex justify-between text-sm`}>
            <span className="text-gray-600 dark:text-gray-400">Investments sub-total:</span>
            <span className="font-semibold">{fmtFull(person.investments)}</span>
          </div>
          <div className={`flex justify-between text-sm ${c.accent}`}>
            <span>After all taxes (if liquidated today):</span>
            <span className="font-bold">{fmtFull(person.postTax)}</span>
          </div>
        </>
      )}

      {hasProperties && (
        <>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 mt-4">Real Estate</p>
          {person.properties.map(p => <PropertyRow key={p.id} prop={p} />)}
          <div className="mt-2 flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Real estate sub-total:</span>
            <span className="font-semibold">{fmtFull(person.propertyTotal)}</span>
          </div>
        </>
      )}

      <div className={`mt-3 pt-3 border-t ${c.border} flex justify-between items-center`}>
        <span className={`font-bold ${c.title}`}>{person.name}'s Total Net Worth:</span>
        <span className={`text-xl font-black ${c.title}`}>{fmtFull(person.netWorth)}</span>
      </div>

      {(person.savings > 0 || person.rsuIncome > 0 || person.rentalNet > 0) && (
        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 space-y-0.5">
          {person.savings > 0 && (
            <p className="text-xs text-gray-400">
              Annual savings added: {fmtFull(person.savings)} ({person.savingsSplit}% to 401k, {100 - person.savingsSplit}% to brokerage)
            </p>
          )}
          {person.rsuIncome > 0 && (
            <p className="text-xs text-purple-500">RSU income this year: {fmtFull(person.rsuIncome)}</p>
          )}
          {person.rentalNet > 0 && (
            <p className="text-xs text-green-600 dark:text-green-400">Net rental income added: {fmtFull(person.rentalNet)}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function YearlyBreakdown({ data, onClose }) {
  if (!data?.formulaData) return null;
  const fd = data.formulaData;
  const { me, spouse, combined, year, inflationFactor, inflation, crashApplied, crashPercent, isFreedom } = fd;
  const yearsFromNow = year - new Date().getFullYear();
  const hasSpouse = spouse.accounts.length > 0 || spouse.properties.length > 0;

  return (
    <div className="mt-4 border-2 border-green-200 dark:border-green-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-green-50 dark:bg-green-900/30 px-4 py-3 flex items-center justify-between border-b border-green-200 dark:border-green-800">
        <div>
          <h2 className="font-bold text-gray-900 dark:text-white text-base">
            📅 Year {year} — Full Financial Breakdown
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            All numbers show balances after this year's savings, income, and growth are applied.
          </p>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 text-gray-500 flex-shrink-0">
            <X size={16} />
          </button>
        )}
      </div>

      <div className="p-4 space-y-4 bg-white dark:bg-gray-900">
        {/* Crash warning */}
        {crashApplied && (
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-3 flex items-start gap-2">
            <AlertCircle size={16} className="text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-orange-700 dark:text-orange-400">
              <strong>Market crash simulated this year!</strong> All investment accounts and properties dropped by {crashPercent}% to test if your plan survives.
            </p>
          </div>
        )}

        {/* Person sections */}
        <PersonSection person={me} color="blue" />
        {hasSpouse && <PersonSection person={spouse} color="pink" />}

        {/* Combined section */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4">
          <h3 className="font-bold text-base text-gray-800 dark:text-gray-100 mb-3">
            {hasSpouse ? '🤝 Combined Picture' : '📊 Your Full Picture'}
          </h3>

          <div className="space-y-2 mb-4">
            {hasSpouse && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">{me.name}'s net worth:</span>
                  <span className="font-medium">{fmtFull(me.netWorth)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">{spouse.name}'s net worth:</span>
                  <span className="font-medium">{fmtFull(spouse.netWorth)}</span>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-2" />
              </>
            )}
            <div className="flex justify-between text-sm font-semibold">
              <span className="text-gray-700 dark:text-gray-300">Total Net Worth:</span>
              <span className="text-lg font-black text-gray-900 dark:text-white">{fmtFull(combined.netWorth)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">After-tax liquid value (investments only):</span>
              <span className="font-medium text-gray-700 dark:text-gray-300">{fmtFull(combined.postTax)}</span>
            </div>
          </div>

          {/* The 4% Rule explained */}
          <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700 mb-3">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">The 4% Safe Withdrawal Rule</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">After-tax liquid: {fmtFull(combined.postTax)} × 4%</span>
                <span className="font-bold text-green-700 dark:text-green-400">{fmtFull(combined.swr4)}/yr</span>
              </div>
              <p className="text-xs text-gray-400">
                This means you could safely withdraw {fmtFull(combined.swr4)} every year without running out of money (based on 95%+ historical success rate over 30 years).
              </p>
            </div>
          </div>

          {/* Freedom comparison */}
          {combined.freedomTarget > 0 && (
            <div className={`rounded-lg p-3 border ${isFreedom ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Freedom Check</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Withdrawal capacity (4% SWR):</span>
                  <span className="font-bold text-green-700 dark:text-green-400">{fmtFull(combined.swr4)}/yr</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Retirement expenses needed:</span>
                  <span className="font-bold text-red-600 dark:text-red-400">{fmtFull(combined.freedomTarget)}/yr</span>
                </div>
                {combined.yearRecurring > 0 && combined.yearRecurring !== combined.freedomTarget && (
                  <p className="text-xs text-gray-400">
                    (Active this year: {fmtFull(combined.yearRecurring)}/yr — freedom target uses your full planned retirement lifestyle)
                  </p>
                )}
                <div className={`mt-2 pt-2 border-t ${isFreedom ? 'border-green-300 dark:border-green-700' : 'border-gray-200 dark:border-gray-700'} flex items-center gap-2`}>
                  {isFreedom
                    ? <><CheckCircle size={16} className="text-green-600 dark:text-green-400 flex-shrink-0" />
                        <span className="font-bold text-green-700 dark:text-green-400">
                          ✅ You have reached Financial Freedom! Your 4% withdrawal covers all retirement expenses.
                        </span></>
                    : <><Info size={16} className="text-gray-400 flex-shrink-0" />
                        <span className="text-gray-500 dark:text-gray-400 text-sm">
                          Not yet — you need {fmtFull(combined.freedomTarget - combined.swr4)}/yr more in SWR capacity.
                        </span></>
                  }
                </div>
              </div>
            </div>
          )}

          {/* Inflation context */}
          {yearsFromNow > 0 && (
            <div className="mt-3 flex items-start gap-2 text-xs text-gray-400">
              <Info size={13} className="flex-shrink-0 mt-0.5" />
              <p>
                Inflation note: {inflation}% annual inflation for {yearsFromNow} year{yearsFromNow !== 1 ? 's' : ''} means prices are {((inflationFactor - 1) * 100).toFixed(1)}% higher than today.
                {combined.freedomTarget > 0 && ` Your retirement expenses grew from ${fmtFull(combined.freedomTarget / inflationFactor)} today to ${fmtFull(combined.freedomTarget)} in ${year}.`}
              </p>
            </div>
          )}

          {/* One-time expenses */}
          {combined.yearOneTime > 0 && (
            <div className="mt-3 flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400">
              <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
              <p>One-time expense of {fmtFull(combined.yearOneTime)} was paid this year and deducted from investment accounts.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
