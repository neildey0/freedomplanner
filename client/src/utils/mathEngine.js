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
    // No deferred: overflow into taxable
    if (taxableAccts.length > 0) {
      const per = deferredAmt / taxableAccts.length;
      taxableAccts.forEach(a => { balances[a.id] = (balances[a.id] || 0) + per; });
    }
  }
  if (taxableAccts.length > 0) {
    const per = taxableAmt / taxableAccts.length;
    taxableAccts.forEach(a => { balances[a.id] = (balances[a.id] || 0) + per; });
  } else {
    // No taxable: overflow into deferred
    if (deferredAccts.length > 0) {
      const per = taxableAmt / deferredAccts.length;
      deferredAccts.forEach(a => { balances[a.id] = (balances[a.id] || 0) + per; });
    }
  }
}

// Add income to an owner's taxable (brokerage) accounts equally.
function addIncomeToOwner(accounts, balances, owner, income) {
  if (!(income > 0)) return;
  const taxable = accounts.filter(a => a.type === 'brokerage' && (a.owner || 'me') === owner);
  if (taxable.length === 0) return;
  const per = income / taxable.length;
  taxable.forEach(a => { balances[a.id] = (balances[a.id] || 0) + per; });
}

// Deduct a one-time expense from the combined portfolio: taxable → deferred → roth.
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
    crashYear,
    crashPercent     = 30,
    projectionYears  = 40,
    currentYear      = new Date().getFullYear(),
    annualSavings    = 0,       // legacy field — used as myAnnualSavings if the new field absent
    myAnnualSavings,
    spouseAnnualSavings = 0,
    savingsSplit        = 60,   // % going to deferred for Me
    spouseSavingsSplit  = 60,
    targetRetirementIncome = 0,
    myName     = 'Me',
    spouseName = 'Spouse',
  } = settings;

  const mySavings = (myAnnualSavings !== undefined && myAnnualSavings !== null)
    ? Number(myAnnualSavings) : Number(annualSavings);
  const spSavings = Number(spouseAnnualSavings || 0);

  // ── Per-account balance tracking ──────────────────────────────────────────
  const balances = {};
  accounts.forEach(a => { balances[a.id] = Math.max(0, Number(a.balance || 0)); });

  const propValues = {};
  properties.forEach(p => { propValues[p.id] = Math.max(0, Number(p.currentValue || 0)); });

  // Base recurring total used for freedom-date check (all future recurring, today's $)
  const baseRecurringTotal = expenses
    .filter(e => e.type === 'recurring')
    .reduce((s, e) => s + Number(e.amount || 0), 0);

  const results = [];
  let freedomDateFound = false;

  for (let i = 0; i < projectionYears; i++) {
    const year          = currentYear + i;
    const inflationFactor = Math.pow(1 + inflation / 100, i);
    // Post-freedom: employment income stops, recurring expenses drawn from corpus
    const isPostFreedom = freedomDateFound;

    // ── 1. RSU vests (skipped post-freedom) ───────────────────────────────
    const yearRsus = rsus.filter(r => {
      try { return new Date(r.vestDate).getFullYear() === year; } catch { return false; }
    });
    let meRsuIncome = 0, spouseRsuIncome = 0;
    if (!isPostFreedom) {
      yearRsus.forEach(r => {
        const val = Number(r.shares || 0) * Number(r.pricePerShare || 0);
        if ((r.owner || 'me') === 'spouse') spouseRsuIncome += val;
        else meRsuIncome += val;
      });
      addIncomeToOwner(accounts, balances, 'me', meRsuIncome);
      addIncomeToOwner(accounts, balances, 'spouse', spouseRsuIncome);
    }

    // ── 2. Annual savings (skipped post-freedom) ──────────────────────────
    if (!isPostFreedom) {
      addSavingsToOwner(accounts, balances, 'me',     mySavings, savingsSplit);
      addSavingsToOwner(accounts, balances, 'spouse', spSavings, spouseSavingsSplit);
    }

    // ── 3. Net rental income — passive, continues post-freedom ────────────
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

    // ── 4. Expenses ────────────────────────────────────────────────────────
    let yearExpenses = 0, yearRecurring = 0, yearOneTime = 0;
    expenses.forEach(exp => {
      const baseAmount = Number(exp.amount || 0);
      const startYr    = Number(exp.startYear || currentYear);
      const endYr      = exp.endYear ? Number(exp.endYear) : currentYear + projectionYears;
      const inflated   = baseAmount * inflationFactor;
      if (exp.type === 'one-time' && year === startYr) {
        yearOneTime  += inflated; yearExpenses += inflated;
      } else if (exp.type === 'recurring' && year >= startYr && year <= endYr) {
        yearRecurring += inflated; yearExpenses += inflated;
      }
    });
    if (yearOneTime > 0) deductExpense(accounts, balances, yearOneTime);
    // Post-freedom: draw living expenses directly from corpus
    if (isPostFreedom && yearRecurring > 0) deductExpense(accounts, balances, yearRecurring);

    // ── 5. Market crash (SORR) ─────────────────────────────────────────────
    let crashApplied = false;
    if (crashYear && year === Number(crashYear)) {
      const f = 1 - Number(crashPercent) / 100;
      Object.keys(balances).forEach(id  => { balances[id]   = Math.max(0, (balances[id]   || 0) * f); });
      Object.keys(propValues).forEach(id => { propValues[id] = Math.max(0, (propValues[id] || 0) * f); });
      crashApplied = true;
    }

    // ── 6. Snapshot ────────────────────────────────────────────────────────
    const snapBal  = {};
    accounts.forEach(a   => { snapBal[a.id]  = Math.max(0, balances[a.id]   || 0); });
    const snapProp = {};
    properties.forEach(p => { snapProp[p.id] = Math.max(0, propValues[p.id] || 0); });

    // Aggregate by owner × type
    const ob = {
      me:     { taxable: 0, deferred: 0, roth: 0 },
      spouse: { taxable: 0, deferred: 0, roth: 0 },
      joint:  { taxable: 0, deferred: 0, roth: 0 },
    };
    accounts.forEach(a => {
      const owner   = a.owner || 'me';
      const typeKey = a.type === 'brokerage' ? 'taxable' : a.type === 'deferred' ? 'deferred' : 'roth';
      ob[owner][typeKey] += snapBal[a.id];
    });

    // Joint accounts split 50/50
    const me = {
      taxable:  ob.me.taxable  + ob.joint.taxable  / 2,
      deferred: ob.me.deferred + ob.joint.deferred / 2,
      roth:     ob.me.roth     + ob.joint.roth     / 2,
    };
    const sp = {
      taxable:  ob.spouse.taxable  + ob.joint.taxable  / 2,
      deferred: ob.spouse.deferred + ob.joint.deferred / 2,
      roth:     ob.spouse.roth     + ob.joint.roth     / 2,
    };

    // Property totals per person
    let mePropTotal = 0, spPropTotal = 0;
    properties.forEach(p => {
      const val   = snapProp[p.id];
      const owner = p.owner || 'me';
      if (owner === 'me')     mePropTotal += val;
      else if (owner === 'spouse') spPropTotal += val;
      else { mePropTotal += val / 2; spPropTotal += val / 2; }
    });

    const meInv    = me.taxable + me.deferred + me.roth;
    const spInv    = sp.taxable + sp.deferred + sp.roth;
    const meNW     = meInv + mePropTotal;
    const spNW     = spInv + spPropTotal;
    const combNW   = meNW + spNW;

    // Post-tax value: liquid investments only (real estate not included in SWR)
    const mePostTax   = me.roth + me.taxable * 0.85 + me.deferred * 0.80;
    const spPostTax   = sp.roth + sp.taxable * 0.85 + sp.deferred * 0.80;
    const combPostTax = mePostTax + spPostTax;

    const postTaxSwr4 = combPostTax * 0.04;
    const combSwr4    = combNW * 0.04;
    const realNW      = combNW / inflationFactor;

    // Freedom date: when post-tax 4% SWR covers total retirement lifestyle
    const fallback      = Number(targetRetirementIncome || 0);
    const freedomBase   = baseRecurringTotal > 0 ? baseRecurringTotal : fallback;
    const freedomTarget = freedomBase > 0 ? freedomBase * inflationFactor : 0;
    const isFreedom     = freedomTarget > 0 && postTaxSwr4 >= freedomTarget && !freedomDateFound;
    if (isFreedom) freedomDateFound = true;

    // ── Build per-person account detail for breakdown panel ──────────────
    const buildPersonAccounts = (personOwner) =>
      accounts
        .filter(a => {
          const o = a.owner || 'me';
          return o === personOwner || o === 'joint';
        })
        .map(a => {
          const o    = a.owner || 'me';
          const frac = o === 'joint' ? 0.5 : 1;
          const bal  = snapBal[a.id] * frac;
          const afterTax =
            a.type === 'brokerage' ? bal * 0.85 :
            a.type === 'deferred'  ? bal * 0.80 : bal;
          return {
            id: a.id, name: a.name + (o === 'joint' ? ' (Joint — your 50%)' : ''),
            type: a.type, balance: bal, afterTax,
            taxRate: a.type === 'brokerage' ? 15 : a.type === 'deferred' ? 20 : 0,
            cagr: a.cagr,
          };
        });

    const buildPersonProps = (personOwner) =>
      properties
        .filter(p => {
          const o = p.owner || 'me';
          return o === personOwner || o === 'joint';
        })
        .map(p => {
          const o    = p.owner || 'me';
          const frac = o === 'joint' ? 0.5 : 1;
          const val  = snapProp[p.id] * frac;
          return {
            id: p.id, name: p.name + (o === 'joint' ? ' (Joint — your 50%)' : ''),
            value: val, appreciationRate: p.appreciationRate,
            annualRent:     Number(p.annualRent     || 0) * inflationFactor * frac,
            annualExpenses: Number(p.annualExpenses || 0) * inflationFactor * frac,
            netRentalAnnual:(Number(p.annualRent || 0) - Number(p.annualExpenses || 0)) * inflationFactor * frac,
          };
        });

    const formulaData = {
      year, inflationFactor, inflation, crashApplied, crashPercent, isFreedom,
      me: {
        name: myName,
        accounts:    buildPersonAccounts('me'),
        properties:  buildPersonProps('me'),
        taxable: me.taxable, deferred: me.deferred, roth: me.roth,
        propertyTotal: mePropTotal, investments: meInv,
        netWorth: meNW, postTax: mePostTax, swr4: mePostTax * 0.04,
        rsuIncome: meRsuIncome, savings: mySavings, savingsSplit,
        rentalNet: meRentalNet,
      },
      spouse: {
        name: spouseName,
        accounts:    buildPersonAccounts('spouse'),
        properties:  buildPersonProps('spouse'),
        taxable: sp.taxable, deferred: sp.deferred, roth: sp.roth,
        propertyTotal: spPropTotal, investments: spInv,
        netWorth: spNW, postTax: spPostTax, swr4: spPostTax * 0.04,
        rsuIncome: spouseRsuIncome, savings: spSavings, savingsSplit: spouseSavingsSplit,
        rentalNet: spouseRentalNet,
      },
      combined: {
        netWorth: combNW, postTax: combPostTax,
        swr4: postTaxSwr4, freedomTarget,
        yearExpenses, yearRecurring, yearOneTime,
      },
    };

    results.push({
      year, yearIndex: i,
      // Me
      meTaxable: me.taxable, meDeferred: me.deferred, meRoth: me.roth,
      mePropertyValue: mePropTotal, meNetWorth: meNW, mePostTax, meInvestments: meInv,
      // Spouse
      spouseTaxable: sp.taxable, spouseDeferred: sp.deferred, spouseRoth: sp.roth,
      spousePropertyValue: spPropTotal, spouseNetWorth: spNW, spousePostTax: spPostTax, spouseInvestments: spInv,
      // Combined
      netWorth: combNW, postTaxNetWorth: combPostTax,
      realNetWorth: realNW, swr4Percent: combSwr4, postTaxSwr4,
      freedomTarget, totalExpenses: yearExpenses,
      recurringExpenses: yearRecurring, oneTimeExpenses: yearOneTime,
      isFreedom, inflationFactor, crashApplied,
      formulaData,
      // Legacy keys (chart backward-compat)
      taxableBalance: me.taxable + sp.taxable,
      deferredBalance: me.deferred + sp.deferred,
      rothBalance: me.roth + sp.roth,
    });

    // ── 7. Apply CAGR / appreciation for next iteration ───────────────────
    accounts.forEach(a => {
      const cagr = (globalCagrOverride !== null && globalCagrOverride !== undefined && globalCagrOverride !== '')
        ? Number(globalCagrOverride) / 100
        : Number(a.cagr || 7) / 100;
      balances[a.id] = Math.max(0, balances[a.id] || 0) * (1 + cagr);
    });
    properties.forEach(p => {
      const rate = Number(p.appreciationRate || 3) / 100;
      propValues[p.id] = Math.max(0, propValues[p.id] || 0) * (1 + rate);
    });
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
