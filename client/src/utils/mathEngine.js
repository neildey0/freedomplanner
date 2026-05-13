export function fmt(n) {
  if (n === undefined || n === null || isNaN(n)) return '0';
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toFixed(0);
}

export function fmtFull(n) {
  if (!n && n !== 0) return '$0';
  return '$' + Math.round(n).toLocaleString('en-US');
}

function computeWeightedCagr(accounts) {
  const total = accounts.reduce((s, a) => s + Number(a.balance || 0), 0);
  if (total === 0) return 0.07;
  return accounts.reduce((s, a) => s + (Number(a.cagr || 7) / 100) * (Number(a.balance || 0) / total), 0);
}

export function runSimulation(state) {
  const { accounts = [], expenses = [], rsus = [], settings = {} } = state;
  const {
    inflation = 3,
    globalCagrOverride,
    crashYear,
    crashPercent = 30,
    projectionYears = 40,
    currentYear = new Date().getFullYear(),
    annualSavings = 0,
    savingsSplit = 60,
    targetRetirementIncome = 0,
  } = settings;

  // Initialize bucket balances from accounts
  let taxable = accounts.filter(a => a.type === 'brokerage').reduce((s, a) => s + Number(a.balance || 0), 0);
  let deferred = accounts.filter(a => a.type === 'deferred').reduce((s, a) => s + Number(a.balance || 0), 0);
  let roth = accounts.filter(a => a.type === 'roth').reduce((s, a) => s + Number(a.balance || 0), 0);

  // Per-bucket CAGR
  const getBucketCagr = (type) => {
    const bucket = accounts.filter(a => a.type === type);
    if (globalCagrOverride !== null && globalCagrOverride !== '' && globalCagrOverride !== undefined) {
      return Number(globalCagrOverride) / 100;
    }
    if (bucket.length === 0) return 0.07;
    const totalBal = bucket.reduce((s, a) => s + Number(a.balance || 0), 0);
    if (totalBal === 0) return 0.07;
    return bucket.reduce((s, a) => s + (Number(a.cagr || 7) / 100) * (Number(a.balance || 0) / totalBal), 0);
  };

  const overallCagr = (globalCagrOverride !== null && globalCagrOverride !== '' && globalCagrOverride !== undefined)
    ? Number(globalCagrOverride) / 100
    : computeWeightedCagr(accounts);

  const taxableCagr = getBucketCagr('brokerage');
  const deferredCagr = getBucketCagr('deferred');
  const rothCagr = getBucketCagr('roth');

  const results = [];
  let freedomDateFound = false;

  for (let i = 0; i < projectionYears; i++) {
    const year = currentYear + i;
    const inflationFactor = Math.pow(1 + inflation / 100, i);

    // RSU vests this year → cash into taxable bucket
    const yearRsus = rsus.filter(r => {
      try { return new Date(r.vestDate).getFullYear() === year; } catch { return false; }
    });
    const rsuIncome = yearRsus.reduce((s, r) => s + Number(r.shares || 0) * Number(r.pricePerShare || 0), 0);
    taxable += rsuIncome;

    // Annual savings — split configurable, default 60% deferred / 40% taxable
    const savings = Number(annualSavings || 0);
    const deferredPct = Number(savingsSplit || 60) / 100;
    deferred += savings * deferredPct;
    taxable += savings * (1 - deferredPct);

    // Calculate expenses this year (inflation-adjusted from their base year)
    let yearExpenses = 0;
    let yearRecurring = 0;
    let yearOneTime = 0;
    expenses.forEach(exp => {
      const baseAmount = Number(exp.amount || 0);
      const startYr = Number(exp.startYear || currentYear);
      const endYr = exp.endYear ? Number(exp.endYear) : currentYear + projectionYears;
      const yearsFromNow = year - currentYear;
      const inflated = baseAmount * Math.pow(1 + inflation / 100, yearsFromNow);

      if (exp.type === 'one-time' && year === startYr) {
        yearOneTime += inflated;
        yearExpenses += inflated;
      } else if (exp.type === 'recurring' && year >= startYr && year <= endYr) {
        yearRecurring += inflated;
        yearExpenses += inflated;
      }
    });

    // Deduct one-time expenses from portfolio (draw taxable → deferred → roth)
    if (yearOneTime > 0) {
      let remaining = yearOneTime;
      const fromTaxable = Math.min(remaining, taxable);
      taxable -= fromTaxable;
      remaining -= fromTaxable;
      if (remaining > 0) {
        const fromDeferred = Math.min(remaining, deferred);
        deferred -= fromDeferred;
        remaining -= fromDeferred;
      }
      if (remaining > 0) {
        roth = Math.max(0, roth - remaining);
      }
    }

    // SORR: apply crash in specified year
    let crashApplied = false;
    if (crashYear && year === Number(crashYear)) {
      const crashFactor = 1 - Number(crashPercent) / 100;
      taxable = Math.max(0, taxable * crashFactor);
      deferred = Math.max(0, deferred * crashFactor);
      roth = Math.max(0, roth * crashFactor);
      crashApplied = true;
    }

    // Snapshot balances at start of this year
    const snapTaxable = Math.max(0, taxable);
    const snapDeferred = Math.max(0, deferred);
    const snapRoth = Math.max(0, roth);
    const netWorth = snapTaxable + snapDeferred + snapRoth;

    // Post-tax net worth (what you'd actually have after withdrawing everything)
    const postTaxNetWorth = snapRoth + snapTaxable * (1 - 0.15) + snapDeferred * (1 - 0.20);

    // SWR: 4% rule on post-tax net worth
    const swr4 = netWorth * 0.04;
    const postTaxSwr4 = postTaxNetWorth * 0.04;

    // Real (inflation-adjusted) net worth in today's dollars
    const realNetWorth = netWorth / inflationFactor;

    // Freedom: post-tax SWR covers inflation-adjusted RECURRING expenses (or target income fallback)
    const freedomTarget = yearRecurring > 0
      ? yearRecurring
      : (Number(targetRetirementIncome || 0) > 0
        ? Number(targetRetirementIncome) * Math.pow(1 + inflation / 100, i)
        : 0);
    const isFreedom = freedomTarget > 0 && postTaxSwr4 >= freedomTarget && !freedomDateFound;
    if (isFreedom) freedomDateFound = true;

    const formula = [
      `Year ${year} Breakdown:`,
      `  Taxable (Brokerage): ${fmtFull(snapTaxable)} × (1 - 15% cap gains) = ${fmtFull(snapTaxable * 0.85)} after-tax`,
      `  Deferred (401k/IRA): ${fmtFull(snapDeferred)} × (1 - 20% income tax) = ${fmtFull(snapDeferred * 0.80)} after-tax`,
      `  Roth (Tax-Free): ${fmtFull(snapRoth)}`,
      `  Total Net Worth: ${fmtFull(netWorth)}`,
      `  Post-Tax Net Worth: ${fmtFull(postTaxNetWorth)}`,
      `  4% SWR (gross): ${fmtFull(swr4)}/yr`,
      `  4% SWR (post-tax): ${fmtFull(postTaxSwr4)}/yr`,
      yearRecurring > 0 ? `  Recurring Expenses (inflated): ${fmtFull(yearRecurring)}/yr` : '',
      yearOneTime > 0 ? `  One-Time Expense (inflated): ${fmtFull(yearOneTime)} [deducted from portfolio]` : '',
      `  Savings Added: ${fmtFull(savings)} (${savingsSplit}% deferred / ${100 - savingsSplit}% taxable)`,
      `  CAGR Applied: ${(overallCagr * 100).toFixed(1)}%`,
      `  Inflation Factor: ${inflationFactor.toFixed(3)}x`,
      crashApplied ? `  ⚠ CRASH APPLIED: -${crashPercent}%` : '',
      rsuIncome > 0 ? `  RSU Income: ${fmtFull(rsuIncome)}` : '',
    ].filter(Boolean).join('\n');

    results.push({
      year,
      yearIndex: i,
      taxableBalance: snapTaxable,
      deferredBalance: snapDeferred,
      rothBalance: snapRoth,
      netWorth,
      postTaxNetWorth,
      realNetWorth,
      totalExpenses: yearExpenses,
      recurringExpenses: yearRecurring,
      oneTimeExpenses: yearOneTime,
      freedomTarget,
      swr4Percent: swr4,
      postTaxSwr4,
      isFreedom,
      rsuIncome,
      crashApplied,
      inflationFactor,
      formula,
    });

    // Apply CAGR growth for next year
    taxable = snapTaxable * (1 + taxableCagr);
    deferred = snapDeferred * (1 + deferredCagr);
    roth = snapRoth * (1 + rothCagr);
  }

  return results;
}

export function findFreedomDate(simulation) {
  const found = simulation.find(d => d.isFreedom);
  return found ? found.year : null;
}

export function getCurrentNetWorth(accounts) {
  return accounts.reduce((s, a) => s + Number(a.balance || 0), 0);
}
