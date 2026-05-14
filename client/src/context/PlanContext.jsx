import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { runSimulation } from '../utils/mathEngine';
import { saveToStorage, loadFromStorage } from '../utils/storage';

const PlanContext = createContext();

const DEFAULT_STATE = {
  accounts: [
    // Neil
    { id: 'neil_rsu',    name: 'Neil Nvidia RSUs (Vested)',      balance: 1172845, cagr: 8,   type: 'brokerage', asOfDate: '2026-05-13', owner: 'me' },
    { id: 'neil_401k',   name: 'Neil Nvidia 401k',               balance: 443715,  cagr: 7,   type: 'deferred',  asOfDate: '2026-05-13', owner: 'me' },
    { id: 'neil_vang',   name: 'Neil Vanguard',                  balance: 424585,  cagr: 8,   type: 'brokerage', asOfDate: '2026-05-13', owner: 'me' },
    { id: 'neil_hsa',    name: 'Neil Intel HSA',                 balance: 66119,   cagr: 6,   type: 'deferred',  asOfDate: '2026-05-13', owner: 'me' },
    { id: 'neil_etrd',   name: 'Neil Intel Stocks (E*TRADE)',    balance: 1225,    cagr: 8,   type: 'brokerage', asOfDate: '2026-05-13', owner: 'me' },
    { id: 'neil_ch1138', name: 'Chase 1138',                     balance: 0,       cagr: 0.5, type: 'brokerage', asOfDate: '2026-05-13', owner: 'me' },
    // Radhika
    { id: 'rad_rsu',     name: 'Radhika Nvidia RSUs (Schwab)',   balance: 3464622, cagr: 8,   type: 'brokerage', asOfDate: '2026-05-13', owner: 'spouse' },
    { id: 'rad_401k',    name: 'Radhika All 401ks',              balance: 489512,  cagr: 7,   type: 'deferred',  asOfDate: '2026-05-13', owner: 'spouse' },
    { id: 'rad_ch_inv',  name: 'Chase Investment 0615',          balance: 423131,  cagr: 8,   type: 'brokerage', asOfDate: '2026-05-13', owner: 'spouse' },
    { id: 'rad_hsa',     name: 'Radhika HSA',                    balance: 45536,   cagr: 6,   type: 'deferred',  asOfDate: '2026-05-13', owner: 'spouse' },
    { id: 'rad_roth',    name: 'Roth IRA 8846',                  balance: 25524,   cagr: 8,   type: 'roth',      asOfDate: '2026-05-13', owner: 'spouse' },
    { id: 'rad_wf_chk',  name: 'Wells Fargo Checking 2188',      balance: 15024,   cagr: 0.5, type: 'brokerage', asOfDate: '2026-05-13', owner: 'spouse' },
    { id: 'rad_wf_sav',  name: 'Wells Fargo Savings 6823',       balance: 14082,   cagr: 1,   type: 'brokerage', asOfDate: '2026-05-13', owner: 'spouse' },
    { id: 'rad_ch_sav',  name: 'Chase Savings 5053',             balance: 13716,   cagr: 1,   type: 'brokerage', asOfDate: '2026-05-13', owner: 'spouse' },
    { id: 'rad_check',   name: 'Radhika Checking 0295',          balance: 11606,   cagr: 0.5, type: 'brokerage', asOfDate: '2026-05-13', owner: 'spouse' },
    // Joint
    { id: 'jt_vang',     name: 'Joint Vanguard 8508',            balance: 132242,  cagr: 8,   type: 'brokerage', asOfDate: '2026-05-13', owner: 'joint' },
    { id: 'jt_amex',     name: 'AMEX HYSA 2098',                 balance: 122778,  cagr: 4.5, type: 'brokerage', asOfDate: '2026-05-13', owner: 'joint' },
    { id: 'jt_7625',     name: '7625 Account',                   balance: 66805,   cagr: 1,   type: 'brokerage', asOfDate: '2026-05-13', owner: 'joint' },
  ],
  expenses: [
    { id: 'e1', name: 'Retirement Living', amount: 150000, startYear: 2030, type: 'recurring', endYear: '' },
  ],
  rsus:       [],
  properties: [
    { id: 'prop1', name: '10 Frontera Cir, Spring TX',              currentValue: 562000, appreciationRate: 3, annualRent: 0, annualExpenses: 0, owner: 'joint' },
    { id: 'prop2', name: '16530 Pine Arrow Dr, Conroe TX',          currentValue: 268000, appreciationRate: 3, annualRent: 0, annualExpenses: 0, owner: 'joint' },
    { id: 'prop3', name: '16121 Sweetwater Fields Ln, Tomball TX',  currentValue: 235000, appreciationRate: 3, annualRent: 0, annualExpenses: 0, owner: 'joint' },
    { id: 'prop4', name: '29631 Evergreen Hills Dr, Spring TX',     currentValue: 218000, appreciationRate: 3, annualRent: 0, annualExpenses: 0, owner: 'joint' },
    { id: 'prop5', name: '16146 Limestone Lake Dr, Tomball TX',     currentValue: 216000, appreciationRate: 3, annualRent: 0, annualExpenses: 0, owner: 'joint' },
    { id: 'prop6', name: '3910 Mossy Place Ln, Spring TX',          currentValue: 212000, appreciationRate: 3, annualRent: 0, annualExpenses: 0, owner: 'joint' },
    { id: 'prop7', name: '4031 Mossy Spring Ln, Spring TX',         currentValue: 205000, appreciationRate: 3, annualRent: 0, annualExpenses: 0, owner: 'joint' },
  ],
  settings: {
    inflation:              3,
    globalCagrOverride:     null,
    crashYear:              null,
    crashPercent:           30,
    projectionYears:        40,
    currentYear:            new Date().getFullYear(),
    myAnnualSavings:        150000,
    spouseAnnualSavings:    150000,
    savingsSplit:           60,
    spouseSavingsSplit:     60,
    targetRetirementIncome: 0,
    retirementYear:         null,
    myName:     'Neil',
    spouseName: 'Radhika',
  },
  darkMode:   false,
  simulation: [],
};

function recompute(state) {
  return { ...state, simulation: runSimulation(state) };
}

function reducer(state, action) {
  let next;
  switch (action.type) {
    case 'LOAD':
      next = recompute({ ...DEFAULT_STATE, ...action.payload, simulation: [] });
      break;
    case 'ADD_ACCOUNT':
      next = recompute({ ...state, accounts: [...state.accounts, action.payload] });
      break;
    case 'UPDATE_ACCOUNT':
      next = recompute({ ...state, accounts: state.accounts.map(a => a.id === action.payload.id ? action.payload : a) });
      break;
    case 'DELETE_ACCOUNT':
      next = recompute({ ...state, accounts: state.accounts.filter(a => a.id !== action.payload) });
      break;
    case 'ADD_EXPENSE':
      next = recompute({ ...state, expenses: [...state.expenses, action.payload] });
      break;
    case 'UPDATE_EXPENSE':
      next = recompute({ ...state, expenses: state.expenses.map(e => e.id === action.payload.id ? action.payload : e) });
      break;
    case 'DELETE_EXPENSE':
      next = recompute({ ...state, expenses: state.expenses.filter(e => e.id !== action.payload) });
      break;
    case 'ADD_RSU':
      next = recompute({ ...state, rsus: [...state.rsus, action.payload] });
      break;
    case 'UPDATE_RSU':
      next = recompute({ ...state, rsus: state.rsus.map(r => r.id === action.payload.id ? action.payload : r) });
      break;
    case 'DELETE_RSU':
      next = recompute({ ...state, rsus: state.rsus.filter(r => r.id !== action.payload) });
      break;
    case 'ADD_PROPERTY':
      next = recompute({ ...state, properties: [...(state.properties || []), action.payload] });
      break;
    case 'UPDATE_PROPERTY':
      next = recompute({ ...state, properties: (state.properties || []).map(p => p.id === action.payload.id ? action.payload : p) });
      break;
    case 'DELETE_PROPERTY':
      next = recompute({ ...state, properties: (state.properties || []).filter(p => p.id !== action.payload) });
      break;
    case 'UPDATE_SETTINGS':
      next = recompute({ ...state, settings: { ...state.settings, ...action.payload } });
      break;
    case 'TOGGLE_DARK':
      next = { ...state, darkMode: !state.darkMode };
      break;
    case 'IMPORT':
      next = recompute({ ...DEFAULT_STATE, ...action.payload, darkMode: state.darkMode, simulation: [] });
      break;
    default:
      return state;
  }
  saveToStorage(next);
  return next;
}

export function PlanProvider({ children }) {
  const saved = loadFromStorage();
  const [state, dispatch] = useReducer(reducer, null, () => {
    if (saved) return recompute({ ...DEFAULT_STATE, ...saved, simulation: [] });
    return recompute(DEFAULT_STATE);
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', state.darkMode);
  }, [state.darkMode]);

  const addAccount    = useCallback(a => dispatch({ type: 'ADD_ACCOUNT',    payload: a }), []);
  const updateAccount = useCallback(a => dispatch({ type: 'UPDATE_ACCOUNT', payload: a }), []);
  const deleteAccount = useCallback(id => dispatch({ type: 'DELETE_ACCOUNT', payload: id }), []);

  const addExpense    = useCallback(e => dispatch({ type: 'ADD_EXPENSE',    payload: e }), []);
  const updateExpense = useCallback(e => dispatch({ type: 'UPDATE_EXPENSE', payload: e }), []);
  const deleteExpense = useCallback(id => dispatch({ type: 'DELETE_EXPENSE', payload: id }), []);

  const addRSU    = useCallback(r => dispatch({ type: 'ADD_RSU',    payload: r }), []);
  const updateRSU = useCallback(r => dispatch({ type: 'UPDATE_RSU', payload: r }), []);
  const deleteRSU = useCallback(id => dispatch({ type: 'DELETE_RSU', payload: id }), []);

  const addProperty    = useCallback(p => dispatch({ type: 'ADD_PROPERTY',    payload: p }), []);
  const updateProperty = useCallback(p => dispatch({ type: 'UPDATE_PROPERTY', payload: p }), []);
  const deleteProperty = useCallback(id => dispatch({ type: 'DELETE_PROPERTY', payload: id }), []);

  const updateSettings = useCallback(s => dispatch({ type: 'UPDATE_SETTINGS', payload: s }), []);
  const toggleDark     = useCallback(() => dispatch({ type: 'TOGGLE_DARK' }), []);
  const importData     = useCallback(d => dispatch({ type: 'IMPORT', payload: d }), []);

  return (
    <PlanContext.Provider value={{
      state,
      addAccount, updateAccount, deleteAccount,
      addExpense, updateExpense, deleteExpense,
      addRSU, updateRSU, deleteRSU,
      addProperty, updateProperty, deleteProperty,
      updateSettings, toggleDark, importData,
    }}>
      {children}
    </PlanContext.Provider>
  );
}

export function usePlan() {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error('usePlan must be used within PlanProvider');
  return ctx;
}
