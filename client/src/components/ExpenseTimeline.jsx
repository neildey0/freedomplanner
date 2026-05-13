import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Check, X, Receipt, RefreshCw, ShoppingBag } from 'lucide-react';
import { usePlan } from '../context/PlanContext';
import { fmtFull } from '../utils/mathEngine';

const EMPTY_FORM = {
  name: '',
  amount: '',
  startYear: new Date().getFullYear() + 1,
  type: 'one-time',
  endYear: '',
};

const PRESETS = [
  { name: 'Retirement Living', amount: 60000, type: 'recurring' },
  { name: 'New Car', amount: 35000, type: 'one-time' },
  { name: 'Home Purchase', amount: 80000, type: 'one-time' },
  { name: 'Healthcare (retired)', amount: 12000, type: 'recurring' },
  { name: 'Travel / Fun', amount: 10000, type: 'recurring' },
  { name: 'College Tuition', amount: 40000, type: 'one-time' },
];

function ExpenseForm({ initial = EMPTY_FORM, onSave, onCancel, currentYear }) {
  const [form, setForm] = useState(initial);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="col-span-2">
          <label className="label">Expense Name</label>
          <input className="input" placeholder="e.g. Retirement Living" value={form.name} onChange={e => set('name', e.target.value)} />
        </div>
        <div>
          <label className="label">Annual Amount ($)</label>
          <input className="input" type="number" min={0} placeholder="0" value={form.amount} onChange={e => set('amount', e.target.value)} />
        </div>
        <div>
          <label className="label">Type</label>
          <select className="input" value={form.type} onChange={e => set('type', e.target.value)}>
            <option value="one-time">One-Time</option>
            <option value="recurring">Recurring</option>
          </select>
        </div>
        <div>
          <label className="label">{form.type === 'recurring' ? 'Start Year' : 'Year'}</label>
          <input className="input" type="number" min={currentYear} value={form.startYear} onChange={e => set('startYear', e.target.value)} />
        </div>
        {form.type === 'recurring' && (
          <div>
            <label className="label">End Year (optional)</label>
            <input className="input" type="number" min={form.startYear} placeholder="Forever" value={form.endYear} onChange={e => set('endYear', e.target.value)} />
          </div>
        )}
      </div>
      <p className="text-xs text-gray-400 mb-3">
        Amount shown in today's dollars — will be inflation-adjusted in the simulation.
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => { if (form.name && form.amount) onSave(form); }}
          className="btn-primary text-sm"
          disabled={!form.name || !form.amount}
        >
          <Check size={14} /> Save
        </button>
        <button onClick={onCancel} className="btn-secondary text-sm">
          <X size={14} /> Cancel
        </button>
      </div>
    </div>
  );
}

export default function ExpenseTimeline() {
  const { state, addExpense, updateExpense, deleteExpense } = usePlan();
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const currentYear = state.settings.currentYear;

  const handleAdd = (form) => {
    addExpense({ ...form, id: `e_${Date.now()}`, amount: Number(form.amount), startYear: Number(form.startYear), endYear: form.endYear ? Number(form.endYear) : '' });
    setShowAdd(false);
  };

  const handleUpdate = (form) => {
    updateExpense({ ...form, amount: Number(form.amount), startYear: Number(form.startYear), endYear: form.endYear ? Number(form.endYear) : '' });
    setEditId(null);
  };

  const handlePreset = (preset) => {
    addExpense({ ...preset, id: `e_${Date.now()}`, startYear: currentYear + 1, endYear: '' });
  };

  const totalRecurring = state.expenses.filter(e => e.type === 'recurring').reduce((s, e) => s + Number(e.amount || 0), 0);
  const sortedExpenses = [...state.expenses].sort((a, b) => Number(a.startYear) - Number(b.startYear));

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Expense Timeline</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {fmtFull(totalRecurring)}/yr recurring + {state.expenses.filter(e => e.type === 'one-time').length} one-time expenses
          </p>
        </div>
        <button onClick={() => { setShowAdd(true); setEditId(null); }} className="btn-primary text-sm">
          <Plus size={15} /> Add Expense
        </button>
      </div>

      {/* Preset Shortcuts */}
      <div>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Quick Add Presets:</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button
              key={p.name}
              onClick={() => handlePreset(p)}
              className="text-xs bg-gray-100 dark:bg-gray-800 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-700 dark:hover:text-green-400 text-gray-600 dark:text-gray-400 px-3 py-1.5 rounded-lg transition-colors border border-transparent hover:border-green-200 dark:hover:border-green-800"
            >
              + {p.name}
            </button>
          ))}
        </div>
      </div>

      {showAdd && (
        <ExpenseForm
          onSave={handleAdd}
          onCancel={() => setShowAdd(false)}
          currentYear={currentYear}
        />
      )}

      <div className="space-y-3">
        {sortedExpenses.map(expense => {
          if (editId === expense.id) {
            return (
              <ExpenseForm
                key={expense.id}
                initial={{ ...expense, amount: String(expense.amount), endYear: expense.endYear ? String(expense.endYear) : '' }}
                onSave={handleUpdate}
                onCancel={() => setEditId(null)}
                currentYear={currentYear}
              />
            );
          }

          const isRecurring = expense.type === 'recurring';
          const Icon = isRecurring ? RefreshCw : ShoppingBag;

          return (
            <div key={expense.id} className="card flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`p-2 rounded-lg ${isRecurring ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-amber-50 dark:bg-amber-900/20'}`}>
                  <Icon size={15} className={isRecurring ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'} />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{expense.name}</p>
                  <p className="text-xs text-gray-400">
                    {isRecurring
                      ? `Recurring from ${expense.startYear}${expense.endYear ? ` – ${expense.endYear}` : ' (ongoing)'}`
                      : `One-time in ${expense.startYear}`
                    }
                  </p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-bold text-gray-900 dark:text-white">{fmtFull(Number(expense.amount))}</p>
                <p className="text-xs text-gray-400">{isRecurring ? 'per year' : 'one-time'}</p>
                <p className="text-xs text-orange-500">+inflation adjusted</p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => { setEditId(expense.id); setShowAdd(false); }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => deleteExpense(expense.id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}

        {state.expenses.length === 0 && !showAdd && (
          <div className="card text-center py-10 text-gray-400">
            <Receipt size={32} className="mx-auto mb-2 opacity-50" />
            <p>No expenses planned. Add your future expenses to simulate withdrawals.</p>
          </div>
        )}
      </div>

      <div className="card bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800">
        <p className="text-xs text-amber-700 dark:text-amber-400 font-medium mb-1">How expenses work in the simulation:</p>
        <ul className="text-xs text-amber-600 dark:text-amber-500 space-y-0.5 list-disc list-inside">
          <li>All amounts entered in today's dollars</li>
          <li>Inflation-adjusted each year using your global inflation setting ({state.settings.inflation}%)</li>
          <li>Freedom Date = first year where 4% SWR &gt; total annual expenses</li>
        </ul>
      </div>
    </div>
  );
}
