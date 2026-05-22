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

// ── 2024 Federal Tax Brackets ─────────────────────────────────────────────────
const TAX_MFJ = [
  { min: 0,       max: 23200,    rate: 0.10 },
  { min: 23200,   max: 94300,    rate: 0.12 },
  { min: 94300,   max: 201050,   rate: 0.22 },
  { min: 201050,  max: 383900,   rate: 0.24 },
  { min: 383900,  max: 487450,   rate: 0.32 },
  { min: 487450,  max: 731200,   rate: 0.35 },
  { min: 731200,  max: Infinity, rate: 0.37 },
];
const TAX_SINGLE = [
  { min: 0,       max: 11600,    rate: 0.10 },
  { min: 11600,   max: 47150,    rate: 0.12 },
  { min: 47150,   max: 100525,   rate: 0.22 },
  { min: 100525,  max: 191950,   rate: 0.24 },
  { min: 191950,  max: 243725,   rate: 0.32 },
  { min: 243725,  max: 609350,   rate: 0.35 },
  { min: 609350,  max: Infinity, rate: 0.37 },
];
const STD_DEDUCTION = { mfj: 29200, single: 14600 };
const LTCG_MFJ    = [{ max: 94050,  rate: 0 }, { max: 583750, rate: 0.15 }, { max: Infinity, rate: 0.20 }];
const LTCG_SINGLE = [{ max: 47025,  rate: 0 }, { max: 518900, rate: 0.15 }, { max: Infinity, rate: 0.20 }];

function ordinaryTax(income, status) {
  const deduction = STD_DEDUCTION[status] || STD_DEDUCTION.mfj;
  const taxable   = Math.max(0, income - deduction);
  const brackets  = status === 'single' ? TAX_SINGLE : TAX_MFJ;
  let tax = 0;
  for (const b of brackets) {
    if (taxable <= b.min) break;
    tax += (Math.min(taxable, b.max) - b.min) * b.rate;
  }
  return tax;
}

function ltcgTax(gains, ordinaryGross, status) {
  const deduction      = STD_DEDUCTION[status] || STD_DEDUCTION.mfj;
  const taxableOrdinary = Math.max(0, ordinaryGross - deduction);
  const brackets       = status === 'single' ? LTCG_SINGLE : LTCG_MFJ;
  let tax = 0, remaining = gains, base = taxableOrdinary;
  for (const b of brackets) {
    if (remaining <= 0) break;
    const room  = Math.max(0, b.max - base);
    const chunk = Math.min(remaining, room);
    tax += chunk * b.rate;
    remaining -= chunk;
    base      += chunk;
  }
  return tax;
}

// Computes federal + state tax on a gross portfolio withdrawal split across buckets.
// Roth = 0 tax, taxable = LTCG, deferred = ordinary income.
export function calcAnnualTax(gross, rothAmt, taxableAmt, deferredAmt, filingStatus = 'mfj', stateTaxPct = 0) {
  const total = rothAmt + taxableAmt + deferredAmt;
  if (total <= 0 || gross <= 0) return 0;
  const deferredPortion = gross * (deferredAmt / total);
  const taxablePortion  = gross * (taxableAmt  / total);
  const fedOrdinary = ordinaryTax(deferredPortion, filingStatus);
  const fedLTCG     = ltcgTax(taxablePortion, deferredPortion, filingStatus);
  const stateTax    = (deferredPortion + taxablePortion) * (Number(stateTaxPct || 0) / 100);
  return fedOrdinary + fedLTCG + stateTax;
}

// ── Savings/Income/Expense helpers ────────────────────────────────────────────
function addSavingsToOwner(accounts, balances, owner, totalSavings, deferredPct) {
  if (!(totalSavings > 0)) return;
  const dPct = Number(deferredPct || 60) / 100;
  const deferredAccts = accounts.filter(a => a.type === 'deferred'  && (a.owner || 'me') === owner);
  const taxableAccts  = accounts.filter(a => a.type === 'brokerage' && (a.owner || 'me') === owner);
  const anyAccts = [...deferredAccts, ...taxableAccts];
  if (anyAccts.length === 0) return;

  const deferredAmt = totalSavings * dPct;
  const taxableAmt  = totalSavings * (1 - dPct);

  if (deferredAccts.length > 0) {
    const per = deferredAmt / deferredAccts.length;
    deferredAccts.forEach(a => { balances[a.id] = (balances[a.id] || 0) + per; });
  } else if (taxableAccts.length > 0) {
    const per = deferredAmt / taxableAccts.length;
    taxableAccts.forEach(a => { balances[a.id] = (balances[a.id] || 0) + per; });
  }
  if (taxableAccts.length > 0) {
    const per = taxableAmt / taxableAccts.length;
    taxableAccts.forEach(a => { balances[a.id] = (balances[a.id] || 0) + per; });
  } else if (deferredAccts.length > 0) {
    const per = taxableAmt / deferredAccts.length;
    deferredAccts.forEach(a => { balances[a.id] = (balances[a.id] || 0) + per; });
  }
}

function addIncomeToOwner(accounts, balances, owner, income) {
  if (!(income > 0)) return;
  const taxable = accounts.filter(a => a.type === 'brokerage' && (a.owner || 'me') === owner);
  if (taxable.length === 0) return;
  const per = income / taxable.length;
  taxable.forEach(a => { balances[a.id] = (balances[a.id] || 0) + per; });
}

function deductExpense(accounts, balances, amount) {
  if (!(amount > 0)) return;
  let remaining = amount;
  for (const type of ['brokerage', 'deferred', 'roth']) {
    for (const a of accounts.filter(a2 => a2.type === type)) {
      if (remaining <= 0) break;
      const avail = Math.max(0, balances[a.id] || 0);
      const drawn = Math.min(remaining, avail);
      balances[a.id] = avail - drawn;
      remaining -= drawn;
    }
    if (remaining <= 0) break;
  }
}

// ── Main simulation ───────────────────────────────────────────────────────────
export function runSimulation(state) {
  const { accounts = [], expenses = [], rsus = [], properties = [], settings = {} } = state;
  const {
    inflation               = 3,
    globalCagrOverride,
    crashes                 = [],
    projectionYears         = 60,
    currentYear             = new Date().getFullYear(),
    myAnnualSavings         = 0,
    spouseAnnualSavings     = 0,
    savingsSplit            = 60,
    spouseSavingsSplit      = 60,
    targetRetirementIncome  = 0,
    myName                  = 'Neil',
    spouseName              = 'Radhika',
    myAge                   = 30,
    spouseAge               = 30,
    withdrawalRate          = 4,
    unexpectedExpenses      = [],
    // Feature 3: Real tax brackets
    filingStatus            = 'mfj',
    stateTaxRate            = 0,
    // Feature 4: Healthcare gap
    healthcareEnabled       = false,
    preMedicareCostPerPerson  = 12000,
    postMedicareCostPerPerson = 5000,
    myMedicareAge           = 65,
    spouseMedicareAge       = 65,
    // Feature 6: Glide path
    glidePathEnabled        = false,
    stockPctNow             = 90,
    stockPctAtRetirement    = 60,
    bondCagr: bondCagrPct   = 4,
    glideEndAge             = 65,
  } = settings;

  const wRate      = Number(withdrawalRate || 4) / 100;
  const isCouple   = filingStatus !== 'single';
  const yearsTo120 = 120 - Math.min(Number(myAge), Number(spouseAge));
  const simYears   = Math.max(Number(projectionYears || 60), yearsTo120);

  const balances = {};
  accounts.forEach(a => { balances[a.id] = Math.max(0, Number(a.balance || 0)); });
  const propValues = {};
  properties.forEach(p => { propValues[p.id] = Math.max(0, Number(p.currentValue || 0)); });

  const baseRecurringTotal = expenses
    .filter(e => e.type === 'recurring')
    .reduce((s, e) => s + Number(e.amount || 0), 0);

  const rawResults = [];

  for (let i = 0; i < simYears; i++) {
    const year            = currentYear + i;
    const inflationFactor = Math.pow(1 + inflation / 100, i);
    const currMyAge       = Number(myAge) + i;
    const currSpouseAge   = Number(spouseAge) + i;

    // 1. RSU vests
    const yearRsus = rsus.filter(r => {
      try { return new Date(r.vestDate).getFullYear() === year; } catch { return false; }
    });
    let meRsuIncome = 0, spouseRsuIncome = 0;
    yearRsus.forEach(r => {
      const val = Number(r.shares || 0) * Number(r.pricePerShare || 0);
      if ((r.owner || 'me') === 'spouse') spouseRsuIncome += val;
      else meRsuIncome += val;
    });
    addIncomeToOwner(accounts, balances, 'me',     meRsuIncome);
    addIncomeToOwner(accounts, balances, 'spouse', spouseRsuIncome);

    // 2. Savings
    addSavingsToOwner(accounts, balances, 'me',     myAnnualSavings,     savingsSplit);
    addSavingsToOwner(accounts, balances, 'spouse', spouseAnnualSavings, spouseSavingsSplit);

    // 3. Rental net income
    let meRentalNet = 0, spouseRentalNet = 0;
    properties.forEach(p => {
      const net   = (Number(p.annualRent || 0) - Number(p.annualExpenses || 0)) * inflationFactor;
      const owner = p.owner || 'me';
      if (owner === 'joint')        { meRentalNet += net / 2; spouseRentalNet += net / 2; }
      else if (owner === 'spouse')  spouseRentalNet += net;
      else                          meRentalNet += net;
    });
    addIncomeToOwner(accounts, balances, 'me',     meRentalNet);
    addIncomeToOwner(accounts, balances, 'spouse', spouseRentalNet);

    // 4. Expenses (recurring + one-time + unexpected)
    let yearExpenses = 0, yearRecurring = 0, yearOneTime = 0, yearUnexpected = 0;
    expenses.forEach(exp => {
      const baseAmount = Number(exp.amount || 0);
      const startYr    = Number(exp.startYear || currentYear);
      const endYr      = exp.endYear ? Number(exp.endYear) : currentYear + simYears;
      const inflated   = baseAmount * inflationFactor;
      if (exp.type === 'one-time' && year === startYr) {
        yearOneTime  += inflated; yearExpenses += inflated;
      } else if (exp.type === 'recurring' && year >= startYr && year <= endYr) {
        yearRecurring += inflated; yearExpenses += inflated;
      }
    });
    unexpectedExpenses.forEach(ux => {
      if (Number(ux.year) === year) {
        const amt = Number(ux.amount || 0);
        yearUnexpected += amt; yearExpenses += amt;
      }
    });

    // Healthcare gap cost (Feature 4) — added to recurring for display + freedom target
    let healthcareCostYear = 0;
    if (healthcareEnabled) {
      const preCost  = Number(preMedicareCostPerPerson  || 12000);
      const postCost = Number(postMedicareCostPerPerson || 5000);
      healthcareCostYear += (currMyAge < Number(myMedicareAge || 65)) ? preCost : postCost;
      if (isCouple) {
        healthcareCostYear += (currSpouseAge < Number(spouseMedicareAge || 65)) ? preCost : postCost;
      }
      healthcareCostYear *= inflationFactor;
      yearRecurring += healthcareCostYear;
      yearExpenses  += healthcareCostYear;
    }

    if (yearOneTime > 0 || yearUnexpected > 0) {
      deductExpense(accounts, balances, yearOneTime + yearUnexpected);
    }

    // 5. Market crashes
    let crashApplied = false, crashPercentApplied = 0;
    const yearCrashes = (crashes || []).filter(c => Number(c.year) === year);
    if (yearCrashes.length > 0) {
      yearCrashes.forEach(c => {
        const f = 1 - Number(c.percent || 30) / 100;
        Object.keys(balances).forEach(id  => { balances[id]   = Math.max(0, (balances[id]   || 0) * f); });
        Object.keys(propValues).forEach(id => { propValues[id] = Math.max(0, (propValues[id] || 0) * f); });
        crashPercentApplied = c.percent;
      });
      crashApplied = true;
    }

    // 6. Aggregate per owner + real tax bracket calc (Feature 3)
    const ob = {
      me:     { taxable: 0, deferred: 0, roth: 0 },
      spouse: { taxable: 0, deferred: 0, roth: 0 },
      joint:  { taxable: 0, deferred: 0, roth: 0 },
    };
    accounts.forEach(a => {
      const owner   = a.owner || 'me';
      const typeKey = a.type === 'brokerage' ? 'taxable' : a.type === 'deferred' ? 'deferred' : 'roth';
      ob[owner][typeKey] += (balances[a.id] || 0);
    });

    const meData = {
      taxable:  ob.me.taxable  + ob.joint.taxable  / 2,
      deferred: ob.me.deferred + ob.joint.deferred / 2,
      roth:     ob.me.roth     + ob.joint.roth     / 2,
    };
    const spData = {
      taxable:  ob.spouse.taxable  + ob.joint.taxable  / 2,
      deferred: ob.spouse.deferred + ob.joint.deferred / 2,
      roth:     ob.spouse.roth     + ob.joint.roth     / 2,
    };

    let mePropTotal = 0, spPropTotal = 0;
    properties.forEach(p => {
      const val   = propValues[p.id] || 0;
      const owner = p.owner || 'me';
      if (owner === 'me')         mePropTotal += val;
      else if (owner === 'spouse') spPropTotal += val;
      else { mePropTotal += val / 2; spPropTotal += val / 2; }
    });

    const meInv = meData.taxable + meData.deferred + meData.roth;
    const spInv = spData.taxable + spData.deferred + spData.roth;
    const meNW  = meInv + mePropTotal;
    const spNW  = spInv + spPropTotal;
    const combNW     = meNW + spNW;
    const combLiquid = meInv + spInv;

    // Real tax brackets: compute after-tax capacity from gross 4% SWR withdrawal
    const totalRoth     = meData.roth     + spData.roth;
    const totalTaxable  = meData.taxable  + spData.taxable;
    const totalDeferred = meData.deferred + spData.deferred;
    const grossWithdrawal  = combLiquid * wRate;
    const annualTax        = calcAnnualTax(grossWithdrawal, totalRoth, totalTaxable, totalDeferred, filingStatus, stateTaxRate);
    const postTaxWithdrawal = Math.max(0, grossWithdrawal - annualTax);
    const effectiveTaxRate  = grossWithdrawal > 0 ? annualTax / grossWithdrawal : 0;

    const prev = rawResults.length > 0 ? rawResults[rawResults.length - 1] : null;
    const meChangePct = prev && prev.meNetWorth > 0 ? ((meNW - prev.meNetWorth) / prev.meNetWorth) * 100 : 0;
    const spChangePct = prev && prev.spouseNetWorth > 0 ? ((spNW - prev.spouseNetWorth) / prev.spouseNetWorth) * 100 : 0;
    const nwChangePct = prev && prev.netWorth > 0 ? ((combNW - prev.netWorth) / prev.netWorth) * 100 : 0;

    // Freedom target includes healthcare (Feature 4)
    const baseExpenseTarget = baseRecurringTotal > 0 ? baseRecurringTotal : Number(targetRetirementIncome || 0);
    const freedomTarget = (baseExpenseTarget > 0 || (healthcareEnabled && healthcareCostYear > 0))
      ? baseExpenseTarget * inflationFactor + healthcareCostYear
      : 0;

    rawResults.push({
      year, myAge: currMyAge, spouseAge: currSpouseAge,
      meNetWorth: meNW, meChangePct, meInvestments: meInv, mePropertyValue: mePropTotal,
      spouseNetWorth: spNW, spChangePct, spouseInvestments: spInv, spousePropertyValue: spPropTotal,
      netWorth: combNW, liquidAssets: combLiquid,
      postTaxWithdrawal, postTaxSwr4: postTaxWithdrawal,
      annualTax, effectiveTaxRate,
      freedomTarget,
      totalExpenses: yearExpenses, recurringExpenses: yearRecurring,
      oneTimeExpenses: yearOneTime, unexpectedExpenses: yearUnexpected,
      healthcareCostYear,
      nwChangePct, crashApplied, crashPercent: crashPercentApplied,
      taxableBalance: totalTaxable, deferredBalance: totalDeferred, rothBalance: totalRoth,
      realNetWorth: combNW / inflationFactor,
      accountBalances: { ...balances },
      propertyValues:  { ...propValues },
    });

    // 7. Apply CAGR (with glide path, Feature 6)
    const bondRate     = Number(bondCagrPct || 4) / 100;
    const currAgeGlide = Number(myAge) + i;
    let stockPct = 1;
    if (glidePathEnabled) {
      const glideStart = Number(myAge);
      const glideEnd   = Number(glideEndAge || 65);
      if (currAgeGlide >= glideEnd || glideEnd <= glideStart) {
        stockPct = Number(stockPctAtRetirement || 60) / 100;
      } else {
        const t = Math.max(0, Math.min(1, (currAgeGlide - glideStart) / (glideEnd - glideStart)));
        stockPct = (Number(stockPctNow || 90) / 100) + t * ((Number(stockPctAtRetirement || 60) / 100) - (Number(stockPctNow || 90) / 100));
      }
    }

    accounts.forEach(a => {
      const rawCagr = (globalCagrOverride !== null && globalCagrOverride !== undefined && globalCagrOverride !== '')
        ? Number(globalCagrOverride) / 100
        : Number(a.cagr || 7) / 100;
      const effectiveCagr = glidePathEnabled
        ? stockPct * rawCagr + (1 - stockPct) * bondRate
        : rawCagr;
      balances[a.id] = Math.max(0, (balances[a.id] || 0) * (1 + effectiveCagr));
    });
    properties.forEach(p => {
      const rate = Number(p.appreciationRate || 3) / 100;
      propValues[p.id] = Math.max(0, (propValues[p.id] || 0) * (1 + rate));
    });
  }

  // Backward-pass sustainability check
  const isSustainable = new Array(simYears).fill(false);
  for (let i = simYears - 1; i >= 0; i--) {
    const meet = rawResults[i].freedomTarget > 0 && rawResults[i].postTaxWithdrawal >= rawResults[i].freedomTarget;
    isSustainable[i] = i === simYears - 1 ? meet : meet && isSustainable[i + 1];
  }

  return rawResults
    .map((r, i) => ({ ...r, isFreedom: isSustainable[i] && (i === 0 || !isSustainable[i - 1]) }))
    .slice(0, Number(projectionYears || 60));
}

export function findFreedomDate(simulation) {
  const found = simulation.find(d => d.isFreedom);
  return found ? found.year : null;
}

export function getCurrentNetWorth(accounts) {
  return accounts.reduce((s, a) => s + Number(a.balance || 0), 0);
}
