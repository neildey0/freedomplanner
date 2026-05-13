import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Check, X, Gem } from 'lucide-react';
import { usePlan } from '../context/PlanContext';
import { fmtFull } from '../utils/mathEngine';

const EMPTY_FORM = {
  company: '', grantDate: new Date().toISOString().slice(0, 10),
  vestDate: '', shares: '', pricePerShare: '', owner: 'me',
};

function RSUForm({ initial = EMPTY_FORM, onSave, onCancel, myName, spouseName }) {
  const [form, setForm] = useState(initial);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const totalValue = Number(form.shares || 0) * Number(form.pricePerShare || 0);

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="col-span-2">
          <label className="label">Company / Grant Name</label>
          <input className="input" placeholder="e.g. Acme Corp RSU Grant" value={form.company} onChange={e => set('company', e.target.value)} />
        </div>
        <div>
          <label className="label">Grant Date</label>
          <input className="input" type="date" value={form.grantDate} onChange={e => set('grantDate', e.target.value)} />
        </div>
        <div>
          <label className="label">Vest Date</label>
          <input className="input" type="date" value={form.vestDate} onChange={e => set('vestDate', e.target.value)} />
        </div>
        <div>
          <label className="label">Shares Vesting</label>
          <input className="input" type="number" min={0} placeholder="0" value={form.shares} onChange={e => set('shares', e.target.value)} />
        </div>
        <div>
          <label className="label">Est. Price Per Share ($)</label>
          <input className="input" type="number" min={0} step={0.01} placeholder="0.00" value={form.pricePerShare} onChange={e => set('pricePerShare', e.target.value)} />
        </div>
        <div>
          <label className="label">Owner</label>
          <select className="input" value={form.owner} onChange={e => set('owner', e.target.value)}>
            <option value="me">{myName}</option>
            <option value="spouse">{spouseName}</option>
          </select>
        </div>
      </div>
      {totalValue > 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg px-3 py-2 mb-3 text-sm flex justify-between">
          <span className="text-gray-500 dark:text-gray-400">Estimated vest value:</span>
          <span className="font-bold text-green-700 dark:text-green-400">{fmtFull(totalValue)}</span>
        </div>
      )}
      <p className="text-xs text-gray-400 mb-3">
        RSU income is added to the owner's Brokerage (Taxable) account in the vest year.
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => { if (form.company && form.vestDate && form.shares && form.pricePerShare) onSave(form); }}
          className="btn-primary text-sm"
          disabled={!form.company || !form.vestDate || !form.shares || !form.pricePerShare}
        >
          <Check size={14} /> Save
        </button>
        <button onClick={onCancel} className="btn-secondary text-sm"><X size={14} /> Cancel</button>
      </div>
    </div>
  );
}

export default function RSUManager() {
  const { state, addRSU, updateRSU, deleteRSU } = usePlan();
  const [showAdd, setShowAdd] = useState(false);
  const [editId,  setEditId]  = useState(null);

  const myName     = state.settings.myName     || 'Me';
  const spouseName = state.settings.spouseName || 'Spouse';

  const handleAdd    = (form) => { addRSU({ ...form, id: `r_${Date.now()}`, shares: Number(form.shares), pricePerShare: Number(form.pricePerShare) }); setShowAdd(false); };
  const handleUpdate = (form) => { updateRSU({ ...form, shares: Number(form.shares), pricePerShare: Number(form.pricePerShare) }); setEditId(null); };

  const totalRsuValue = state.rsus.reduce((s, r) => s + Number(r.shares || 0) * Number(r.pricePerShare || 0), 0);
  const sorted = [...state.rsus].sort((a, b) => new Date(a.vestDate) - new Date(b.vestDate));

  const ownerLabel = (owner) => owner === 'spouse' ? spouseName : myName;

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">RSU / Option Vesting</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {state.rsus.length} grant{state.rsus.length !== 1 ? 's' : ''} · {fmtFull(totalRsuValue)} total estimated value
          </p>
        </div>
        <button onClick={() => { setShowAdd(true); setEditId(null); }} className="btn-primary text-sm">
          <Plus size={15} /> Add Grant
        </button>
      </div>

      {showAdd && <RSUForm onSave={handleAdd} onCancel={() => setShowAdd(false)} myName={myName} spouseName={spouseName} />}

      <div className="space-y-3">
        {sorted.map(rsu => {
          const vestYear   = rsu.vestDate ? new Date(rsu.vestDate).getFullYear() : '—';
          const totalValue = Number(rsu.shares || 0) * Number(rsu.pricePerShare || 0);
          const isPast     = rsu.vestDate && new Date(rsu.vestDate) < new Date();

          if (editId === rsu.id) {
            return (
              <RSUForm key={rsu.id}
                initial={{ ...rsu, shares: String(rsu.shares), pricePerShare: String(rsu.pricePerShare) }}
                onSave={handleUpdate} onCancel={() => setEditId(null)}
                myName={myName} spouseName={spouseName}
              />
            );
          }

          return (
            <div key={rsu.id} className={`card flex items-center justify-between gap-4 ${isPast ? 'opacity-60' : ''}`}>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                  <Gem size={15} className="text-purple-600 dark:text-purple-400" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{rsu.company}</p>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                      {ownerLabel(rsu.owner || 'me')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">{Number(rsu.shares).toLocaleString()} shares @ ${Number(rsu.pricePerShare).toFixed(2)}/share</p>
                  <p className="text-xs text-gray-400">Vests: {rsu.vestDate || '—'} {isPast ? '(vested)' : `(${vestYear})`}</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-bold text-gray-900 dark:text-white">{fmtFull(totalValue)}</p>
                <p className="text-xs text-purple-600 dark:text-purple-400">→ {ownerLabel(rsu.owner || 'me')}'s brokerage</p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => { setEditId(rsu.id); setShowAdd(false); }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors">
                  <Pencil size={14} />
                </button>
                <button onClick={() => deleteRSU(rsu.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}

        {state.rsus.length === 0 && !showAdd && (
          <div className="card text-center py-10 text-gray-400">
            <Gem size={32} className="mx-auto mb-2 opacity-50" />
            <p className="mb-1">No RSU grants or option vests yet.</p>
            <p className="text-xs">Add vesting schedules to include them as cash injections in your simulation.</p>
          </div>
        )}
      </div>
    </div>
  );
}
