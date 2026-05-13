import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { runSimulation } from '../utils/mathEngine';
import { saveToStorage, loadFromStorage } from '../utils/storage';

const PlanContext = createContext();

const DEFAULT_STATE = {
  accounts: [
    { id: 'a1', name: 'Brokerage Account', balance: 50000, cagr: 8, type: 'brokerage', asOfDate: '2026-01-01' },
    { id: 'a2', name: '401(k)', balance: 150000, cagr: 7, type: 'deferred', asOfDate: '2026-01-01' },
    { id: 'a3', name: 'Roth IRA', balance: 30000, cagr: 8, type: 'roth', asOfDate: '2026-01-01' },
  ],
  expenses: [
    { id: 'e1', name: 'Retirement Living', amount: 60000, startYear: 2045, type: 'recurring', endYear: '' },
    { id: 'e2', name: 'New Car', amount: 35000, startYear: 2028, type: 'one-time' },
  ],
  rsus: [],
  settings: {
    inflation: 3,
    globalCagrOverride: null,
    crashYear: null,
    crashPercent: 30,
    projectionYears: 40,
    currentYear: new Date().getFullYear(),
    annualSavings: 30000,
    savingsSplit: 60,
    targetRetirementIncome: 0,
  },
  darkMode: false,
  simulation: [],
};

function recompute(state) {
  const simulation = runSimulation(state);
  return { ...state, simulation };
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
      next = recompute({
        ...state,
        accounts: state.accounts.map(a => a.id === action.payload.id ? action.payload : a),
      });
      break;
    case 'DELETE_ACCOUNT':
      next = recompute({ ...state, accounts: state.accounts.filter(a => a.id !== action.payload) });
      break;
    case 'ADD_EXPENSE':
      next = recompute({ ...state, expenses: [...state.expenses, action.payload] });
      break;
    case 'UPDATE_EXPENSE':
      next = recompute({
        ...state,
        expenses: state.expenses.map(e => e.id === action.payload.id ? action.payload : e),
      });
      break;
    case 'DELETE_EXPENSE':
      next = recompute({ ...state, expenses: state.expenses.filter(e => e.id !== action.payload) });
      break;
    case 'ADD_RSU':
      next = recompute({ ...state, rsus: [...state.rsus, action.payload] });
      break;
    case 'UPDATE_RSU':
      next = recompute({
        ...state,
        rsus: state.rsus.map(r => r.id === action.payload.id ? action.payload : r),
      });
      break;
    case 'DELETE_RSU':
      next = recompute({ ...state, rsus: state.rsus.filter(r => r.id !== action.payload) });
      break;
    case 'UPDATE_SETTINGS':
      next = recompute({ ...state, settings: { ...state.settings, ...action.payload } });
      break;
    case 'TOGGLE_DARK':
      next = { ...state, darkMode: !state.darkMode };
      break;
    case 'IMPORT':
      next = recompute({
        ...DEFAULT_STATE,
        ...action.payload,
        darkMode: state.darkMode,
        simulation: [],
      });
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
    if (saved) {
      return recompute({ ...DEFAULT_STATE, ...saved, simulation: [] });
    }
    return recompute(DEFAULT_STATE);
  });

  useEffect(() => {
    const root = document.documentElement;
    if (state.darkMode) root.classList.add('dark');
    else root.classList.remove('dark');
  }, [state.darkMode]);

  const addAccount = useCallback(a => dispatch({ type: 'ADD_ACCOUNT', payload: a }), []);
  const updateAccount = useCallback(a => dispatch({ type: 'UPDATE_ACCOUNT', payload: a }), []);
  const deleteAccount = useCallback(id => dispatch({ type: 'DELETE_ACCOUNT', payload: id }), []);

  const addExpense = useCallback(e => dispatch({ type: 'ADD_EXPENSE', payload: e }), []);
  const updateExpense = useCallback(e => dispatch({ type: 'UPDATE_EXPENSE', payload: e }), []);
  const deleteExpense = useCallback(id => dispatch({ type: 'DELETE_EXPENSE', payload: id }), []);

  const addRSU = useCallback(r => dispatch({ type: 'ADD_RSU', payload: r }), []);
  const updateRSU = useCallback(r => dispatch({ type: 'UPDATE_RSU', payload: r }), []);
  const deleteRSU = useCallback(id => dispatch({ type: 'DELETE_RSU', payload: id }), []);

  const updateSettings = useCallback(s => dispatch({ type: 'UPDATE_SETTINGS', payload: s }), []);
  const toggleDark = useCallback(() => dispatch({ type: 'TOGGLE_DARK' }), []);
  const importData = useCallback(d => dispatch({ type: 'IMPORT', payload: d }), []);

  return (
    <PlanContext.Provider value={{
      state,
      addAccount, updateAccount, deleteAccount,
      addExpense, updateExpense, deleteExpense,
      addRSU, updateRSU, deleteRSU,
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
