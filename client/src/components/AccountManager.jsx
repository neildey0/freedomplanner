import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Check, X, Wallet, TrendingUp, Shield } from 'lucide-react';
import { usePlan } from '../context/PlanContext';
import { fmtFull } from '../utils/mathEngine';

const TYPE_META = {
  brokerage: { label: 'Brokerage (Taxable)', icon: TrendingUp, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', tax: '15% cap gains on withdrawal' },
  deferred: { label: 'Deferred (401k/IRA)', icon: Wallet, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20', tax: '20% income tax on withdrawal' },
  roth: { label: 'Roth (Tax-Free)', icon: Shield, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20', tax: 'No tax on withdrawal' },
};

const EMPTY_FORM = { name: '', balance: '', cagr: 7, type: 'brokerage', asOfDate: new Date().toISOString().slice(0, 10) };

function AccountForm({ initial = EMPTY_FORM, onSave, onCancel }) {
  const [form, setForm] = useState(initial);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="col-span-2">
          <label className="label">Account Name</label>
          <input className="input" placeholder="e.g. Fidelity 401k" value={form.name} onChange={e => set('name', e.target.value)} />
        </div>
        <div>
          <label className="label">Balance ($)</label>
          <input className="input" type="number" min={0} placeholder="0" value={form.balance} onChange={e => set('balance', e.target.value)} />
        </div>
        <div>
          <label className="label">Expected CAGR (%)</label>
          <input className="input" type="number" min={0} max={30} step={0.5} value={form.cagr} onChange={e => set('cagr', e.target.value)} />
        </div>
        <div>
          <label className="label">Account Type</label>
          <select className="input" value={form.type} onChange={e => set('type', e.target.value)}>
            {Object.entries(TYPE_META).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Balance As Of Date</label>
          <input className="input" type="date" value={form.asOfDate} onChange={e => set('asOfDate', e.target.value)} />
        </div>
      </div>
      {form.type && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 italic">
          {TYPE_META[form.type]?.tax}
        </p>
      )}
      <div className="flex gap-2">
        <button
          onClick={() => { if (form.name && form.balance) onSave(form); }}
          className="btn-primary text-sm"
          disabled={!form.name || !form.balance}
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

export default function AccountManager() {
  const { state, addAccount, updateAccount, deleteAccount } = usePlan();
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);

  const handleAdd = (form) => {
    addAccount({ ...form, id: `a_${Date.now()}`, balance: Number(form.balance), cagr: Number(form.cagr) });
    setShowAdd(false);
  };

  const handleUpdate = (form) => {
    updateAccount({ ...form, balance: Number(form.balance), cagr: Number(form.cagr) });
    setEditId(null);
  };

  const totalNetWorth = state.accounts.reduce((s, a) => s + Number(a.balance || 0), 0);

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Accounts</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Total: {fmtFull(totalNetWorth)} across {state.accounts.length} account{state.accounts.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => { setShowAdd(true); setEditId(null); }} className="btn-primary text-sm">
          <Plus size={15} /> Add Account
        </button>
      </div>

      {showAdd && (
        <AccountForm
          onSave={handleAdd}
          onCancel={() => setShowAdd(false)}
        />
      )}

      <div className="space-y-3">
        {state.accounts.map(account => {
          const meta = TYPE_META[account.type] || TYPE_META.brokerage;
          const Icon = meta.icon;
          const pct = totalNetWorth > 0 ? (Number(account.balance) / totalNetWorth * 100).toFixed(0) : 0;

          if (editId === account.id) {
            return (
              <AccountForm
                key={account.id}
                initial={{ ...account, balance: String(account.balance), cagr: String(account.cagr) }}
                onSave={handleUpdate}
                onCancel={() => setEditId(null)}
              />
            );
          }

          return (
            <div key={account.id} className="card flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`p-2 rounded-lg ${meta.bg}`}>
                  <Icon size={16} className={meta.color} />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{account.name}</p>
                  <p className={`text-xs ${meta.color}`}>{meta.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{meta.tax}</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-bold text-gray-900 dark:text-white">{fmtFull(Number(account.balance))}</p>
                <p className="text-xs text-gray-400">{pct}% of portfolio</p>
                <p className="text-xs text-green-600 dark:text-green-400">{account.cagr}% CAGR</p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => { setEditId(account.id); setShowAdd(false); }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => deleteAccount(account.id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}

        {state.accounts.length === 0 && !showAdd && (
          <div className="card text-center py-10 text-gray-400">
            <Wallet size={32} className="mx-auto mb-2 opacity-50" />
            <p>No accounts yet. Add your first account to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}
