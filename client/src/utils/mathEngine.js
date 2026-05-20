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

// Add savings to an owner's deferred and taxable accounts proportionally.
function addSavingsToOwner(accounts, balances, owner, totalSavings, deferredPct) {
  if (!(totalSavings > 0)) return;
  const dPct = Number(deferredPct || 60) / 100;
  const deferredAccts = accounts.filter(a => a.type === 'deferred' && (a.owner || 'me') === owner);
  const taxableAccts  = accounts.filter(a => a.type === 'brokerage' && (a.owner || 'me') === owner);
  const anyAccts = [...deferredAccts, ...taxableAccts];
  if (anyAccts.length === 0) return;

  const deferredAmt = totalSavings * dPct;
  const taxableAmt  = totalSavings * (1 - dPct);

  if (deferredAccts.length > 0) {
    const per = deferredAmt / deferredAccts.length;
    deferredAccts.forEach(a => { balances[a.id] = (balances[a.id] || 0) + per; });
  } else {
    if (taxableAccts.length > 0) {
      const per = deferredAmt / taxableAccts.length;
      taxableAccts.forEach(a => { balances[a.id] = (balances[a.id] || 0) + per; });
    }
  }
  if (taxableAccts.length > 0) {
    const per = taxableAmt / taxableAccts.length;
    taxableAccts.forEach(a => { balances[a.id] = (balances[a.id] || 0) + per; });
  } else {
    if (deferredAccts.length > 0) {
      const per = taxableAmt / deferredAccts.length;
      deferredAccts.forEach(a => { balances[a.id] = (balances[a.id] || 0) + per; });
    }
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

export function runSimulation(state) {
  const { accounts = [], expenses = [], rsus = [], properties = [], settings = {} } = state;
  const {
    inflation        = 3,
    globalCagrOverride,
    crashes          = [],
    projectionYears  = 60,
    currentYear      = new Date().getFullYear(),
    myAnnualSavings  = 0,
    spouseAnnualSavings = 0,
    savingsSplit        = 60,
    spouseSavingsSplit  = 60,
    targetRetirementIncome = 0,
    myName     = 'Neil',
    spouseName = 'Radhika',
    myAge      = 30,
    spouseAge  = 30,
    withdrawalRate = 4,
    unexpectedExpenses = [],
  } = settings;

  const wRate = Number(withdrawalRate || 4) / 100;
  const yearsTo120 = 120 - Math.min(Number(myAge), Number(spouseAge));
  const simYears = Math.max(projectionYears, yearsTo120);

  const balances = {};
  accounts.forEach(a => { balances[a.id] = Math.max(0, Number(a.balance || 0)); });
  const propValues = {};
  properties.forEach(p => { propValues[p.id] = Math.max(0, Number(p.currentValue || 0)); });

  const baseRecurringTotal = expenses
    .filter(e => e.type === 'recurring')
    .reduce((s, e) => s + Number(e.amount || 0), 0);

  const rawResults = [];

  for (let i = 0; i < simYears; i++) {
    const year          = currentYear + i;
    const inflationFactor = Math.pow(1 + inflation / 100, i);
    const currMyAge     = Number(myAge) + i;
    const currSpouseAge  = Number(spouseAge) + i;

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
    addIncomeToOwner(accounts, balances, 'me', meRsuIncome);
    addIncomeToOwner(accounts, balances, 'spouse', spouseRsuIncome);

    // 2. Savings
    addSavingsToOwner(accounts, balances, 'me',     myAnnualSavings, savingsSplit);
    addSavingsToOwner(accounts, balances, 'spouse', spouseAnnualSavings, spouseSavingsSplit);

    // 3. Rental Net
    let meRentalNet = 0, spouseRentalNet = 0;
    properties.forEach(p => {
      const net   = (Number(p.annualRent || 0) - Number(p.annualExpenses || 0)) * inflationFactor;
      const owner = p.owner || 'me';
      if (owner === 'joint')  { meRentalNet += net / 2; spouseRentalNet += net / 2; }
      else if (owner === 'spouse') spouseRentalNet += net;
      else meRentalNet += net;
    });
    addIncomeToOwner(accounts, balances, 'me',     meRentalNet);
    addIncomeToOwner(accounts, balances, 'spouse', spouseRentalNet);

    // 4. Expenses
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
    if (yearOneTime > 0 || yearUnexpected > 0) deductExpense(accounts, balances, yearOneTime + yearUnexpected);

    // 5. Crashes
    let crashApplied = false;
    let crashPercentApplied = 0;
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

    // 6. Aggregate
    const ob = { me: { taxable: 0, deferred: 0, roth: 0 }, spouse: { taxable: 0, deferred: 0, roth: 0 }, joint: { taxable: 0, deferred: 0, roth: 0 } };
    accounts.forEach(a => {
      const owner = a.owner || 'me';
      const typeKey = a.type === 'brokerage' ? 'taxable' : a.type === 'deferred' ? 'deferred' : 'roth';
      ob[owner][typeKey] += (balances[a.id] || 0);
    });
    const meData = { taxable: ob.me.taxable + ob.joint.taxable/2, deferred: ob.me.deferred + ob.joint.deferred/2, roth: ob.me.roth + ob.joint.roth/2 };
    const spData = { taxable: ob.spouse.taxable + ob.joint.taxable/2, deferred: ob.spouse.deferred + ob.joint.deferred/2, roth: ob.spouse.roth + ob.joint.roth/2 };
    let mePropTotal = 0, spPropTotal = 0;
    properties.forEach(p => {
      const val = propValues[p.id] || 0;
      const owner = p.owner || 'me';
      if (owner === 'me') mePropTotal += val;
      else if (owner === 'spouse') spPropTotal += val;
      else { mePropTotal += val/2; spPropTotal += val/2; }
    });

    const meInv = meData.taxable + meData.deferred + meData.roth;
    const spInv = spData.taxable + spData.deferred + spData.roth;
    const meNW = meInv + mePropTotal;
    const spNW = spInv + spPropTotal;
    const combNW = meNW + spNW;
    const combLiquid = meInv + spInv;
    const mePostTax = meData.roth + meData.taxable * 0.85 + meData.deferred * 0.80;
    const spPostTax = spData.roth + spData.taxable * 0.85 + spData.deferred * 0.80;
    const combPostTax = mePostTax + spPostTax;
    const postTaxWithdrawal = combPostTax * wRate;

    const prev = rawResults.length > 0 ? rawResults[rawResults.length - 1] : null;
    const meChangePct = prev && prev.meNetWorth > 0 ? ((meNW - prev.meNetWorth) / prev.meNetWorth) * 100 : 0;
    const spChangePct = prev && prev.spouseNetWorth > 0 ? ((spNW - prev.spouseNetWorth) / prev.spouseNetWorth) * 100 : 0;
    const nwChangePct = prev && prev.netWorth > 0 ? ((combNW - prev.netWorth) / prev.netWorth) * 100 : 0;

    const freedomBase = baseRecurringTotal > 0 ? baseRecurringTotal : Number(targetRetirementIncome || 0);
    const freedomTarget = freedomBase > 0 ? freedomBase * inflationFactor : 0;

    rawResults.push({
      year, myAge: currMyAge, spouseAge: currSpouseAge,
      meNetWorth: meNW, meChangePct, spouseNetWorth: spNW, spChangePct,
      netWorth: combNW, liquidAssets: combLiquid, postTaxWithdrawal, freedomTarget,
      totalExpenses: yearExpenses, nwChangePct, crashApplied, crashPercent: crashPercentApplied,
      taxableBalance: meData.taxable + spData.taxable, deferredBalance: meData.deferred + spData.deferred, rothBalance: meData.roth + spData.roth,
      realNetWorth: combNW / inflationFactor,
    });

    // 7. Apply CAGR for next year
    accounts.forEach(a => {
      const cagr = (globalCagrOverride !== null && globalCagrOverride !== undefined && globalCagrOverride !== '') ? Number(globalCagrOverride) / 100 : Number(a.cagr || 7) / 100;
      balances[a.id] = Math.max(0, (balances[a.id] || 0) * (1 + cagr));
    });
    properties.forEach(p => {
      const rate = Number(p.appreciationRate || 3) / 100;
      propValues[p.id] = Math.max(0, (propValues[p.id] || 0) * (1 + rate));
    });
  }

  // Sustainability Check (Backward pass)
  const isSustainable = new Array(simYears).fill(false);
  for (let i = simYears - 1; i >= 0; i--) {
    const meet = rawResults[i].freedomTarget > 0 && rawResults[i].postTaxWithdrawal >= rawResults[i].freedomTarget;
    if (i === simYears - 1) {
      isSustainable[i] = meet;
    } else {
      isSustainable[i] = meet && isSustainable[i+1];
    }
  }

  return rawResults.map((r, i) => ({ ...r, isFreedom: isSustainable[i] && (i === 0 || !isSustainable[i-1]) })).slice(0, projectionYears);
}

export function findFreedomDate(simulation) {
  const found = simulation.find(d => d.isFreedom);
  return found ? found.year : null;
}

export function getCurrentNetWorth(accounts) {
  return accounts.reduce((s, a) => s + Number(a.balance || 0), 0);
}
