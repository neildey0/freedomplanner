import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { runSimulation } from '../utils/mathEngine';
import { saveToStorage, loadFromStorage } from '../utils/storage';

const PlanContext = createContext();

function makeDefaultCrashes(currentYear = new Date().getFullYear(), count = 10) {
  return Array.from({ length: count }, (_, i) => ({
    id: `dc${i + 1}`,
    year: currentYear + 5 * (i + 1),
    percent: 30,
  }));
}

const NEW_SETTINGS = {
  // Feature 3: Tax brackets
  filingStatus:               'mfj',
  stateTaxRate:               0,
  // Feature 4: Healthcare gap
  healthcareEnabled:          false,
  preMedicareCostPerPerson:   12000,
  postMedicareCostPerPerson:  5000,
  myMedicareAge:              65,
  spouseMedicareAge:          65,
  // Feature 6: Glide path
  glidePathEnabled:           false,
  stockPctNow:                90,
  stockPctAtRetirement:       60,
  bondCagr:                   4,
  glideEndAge:                65,
};

const DEFAULT_STATE = {
  accounts:   [],
  expenses:   [],
  rsus:       [],
  properties: [],
  scenarios:  [],
  settings: {
    inflation:              3,
    globalCagrOverride:     null,
    crashes:                makeDefaultCrashes(),
    unexpectedExpenses:     [],
    crashYear:              null,
    crashPercent:           30,
    projectionYears:        30,
    currentYear:            new Date().getFullYear(),
    myAnnualSavings:        0,
    spouseAnnualSavings:    0,
    savingsSplit:           60,
    spouseSavingsSplit:     60,
    targetRetirementIncome: 0,
    retirementYear:         null,
    myName:     '',
    spouseName: '',
    ...NEW_SETTINGS,
  },
  darkMode:   false,
  simulation: [],
};

const BLANK_STATE = {
  accounts:   [],
  expenses:   [],
  rsus:       [],
  properties: [],
  scenarios:  [],
  settings: {
    inflation:              3,
    globalCagrOverride:     null,
    crashes:                makeDefaultCrashes(),
    myAge:                  30,
    spouseAge:              30,
    withdrawalRate:         4,
    unexpectedExpenses:     [],
    projectionYears:        60,
    currentYear:            new Date().getFullYear(),
    myAnnualSavings:        0,
    spouseAnnualSavings:    0,
    savingsSplit:           60,
    spouseSavingsSplit:     60,
    targetRetirementIncome: 0,
    myName:     'Me',
    spouseName: 'Spouse',
    ...NEW_SETTINGS,
  },
  darkMode:   false,
  simulation: [],
};

const IS_PROD = import.meta.env.PROD;
const INITIAL_BASE_STATE = IS_PROD ? BLANK_STATE : DEFAULT_STATE;

function recompute(state) {
  return { ...state, simulation: runSimulation(state) };
}

function reducer(state, action) {
  let next;
  switch (action.type) {
    case 'LOAD':
      next = recompute({ ...INITIAL_BASE_STATE, ...action.payload, simulation: [] });
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
      next = recompute({ ...INITIAL_BASE_STATE, ...action.payload, darkMode: state.darkMode, simulation: [] });
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
    if (saved) return recompute({ ...INITIAL_BASE_STATE, ...saved, simulation: [] });
    return recompute(INITIAL_BASE_STATE);
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
