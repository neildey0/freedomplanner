import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Check, X, Home, TrendingUp } from 'lucide-react';
import { usePlan } from '../context/PlanContext';
import { fmtFull } from '../utils/mathEngine';

const EMPTY_FORM = {
  name: '',
  currentValue: '',
  appreciationRate: 3,
  annualRent: '',
  annualExpenses: '',
  asOfDate: new Date().toISOString().slice(0, 10),
  owner: 'me',
};

function PropertyForm({ initial = EMPTY_FORM, onSave, onCancel, myName, spouseName }) {
  const [form, setForm] = useState(initial);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const netRental = Number(form.annualRent || 0) - Number(form.annualExpenses || 0);

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="col-span-2">
          <label className="label">Property Name</label>
          <input className="input" placeholder="e.g. Primary Home, Rental on Oak St" value={form.name} onChange={e => set('name', e.target.value)} />
        </div>
        <div>
          <label className="label">Current Value ($)</label>
          <input className="input" type="number" min={0} placeholder="0" value={form.currentValue} onChange={e => set('currentValue', e.target.value)} />
        </div>
        <div>
          <label className="label">Annual Appreciation (%)</label>
          <input className="input" type="number" min={0} max={20} step={0.5} value={form.appreciationRate} onChange={e => set('appreciationRate', e.target.value)} />
        </div>
        <div>
          <label className="label">Annual Rent Income ($)</label>
          <input className="input" type="number" min={0} placeholder="0 if not rented" value={form.annualRent} onChange={e => set('annualRent', e.target.value)} />
        </div>
        <div>
          <label className="label">Annual Property Expenses ($)</label>
          <input className="input" type="number" min={0} placeholder="taxes, insurance, maintenance" value={form.annualExpenses} onChange={e => set('annualExpenses', e.target.value)} />
        </div>
        <div>
          <label className="label">Owner</label>
          <select className="input" value={form.owner} onChange={e => set('owner', e.target.value)}>
            <option value="me">{myName}</option>
            <option value="spouse">{spouseName}</option>
            <option value="joint">Joint (50/50)</option>
          </select>
        </div>
        <div>
          <label className="label">Value As Of Date</label>
          <input className="input" type="date" value={form.asOfDate} onChange={e => set('asOfDate', e.target.value)} />
        </div>
      </div>

      {(Number(form.annualRent) > 0 || Number(form.annualExpenses) > 0) && (
        <div className={`rounded-lg px-3 py-2 mb-3 text-sm flex items-center justify-between ${netRental >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
          <span className="text-gray-500 dark:text-gray-400">Net rental income:</span>
          <span className={`font-bold ${netRental >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {netRental >= 0 ? '+' : ''}{fmtFull(netRental)}/yr
          </span>
        </div>
      )}

      <p className="text-xs text-gray-400 mb-3">
        Net rental income (rent − expenses) is added to the owner's brokerage account each year, inflation-adjusted. Property value grows by the appreciation rate.
      </p>

      <div className="flex gap-2">
        <button
          onClick={() => { if (form.name && form.currentValue) onSave(form); }}
          className="btn-primary text-sm"
          disabled={!form.name || !form.currentValue}
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

export default function RealEstateManager() {
  const { state, addProperty, updateProperty, deleteProperty } = usePlan();
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);

  const myName     = state.settings.myName     || 'Me';
  const spouseName = state.settings.spouseName || 'Spouse';

  const handleAdd = (form) => {
    addProperty({
      ...form, id: `p_${Date.now()}`,
      currentValue:     Number(form.currentValue),
      appreciationRate: Number(form.appreciationRate),
      annualRent:       Number(form.annualRent || 0),
      annualExpenses:   Number(form.annualExpenses || 0),
    });
    setShowAdd(false);
  };

  const handleUpdate = (form) => {
    updateProperty({
      ...form,
      currentValue:     Number(form.currentValue),
      appreciationRate: Number(form.appreciationRate),
      annualRent:       Number(form.annualRent || 0),
      annualExpenses:   Number(form.annualExpenses || 0),
    });
    setEditId(null);
  };

  const totalValue = (state.properties || []).reduce((s, p) => s + Number(p.currentValue || 0), 0);
  const totalNetRental = (state.properties || []).reduce((s, p) => s + Number(p.annualRent || 0) - Number(p.annualExpenses || 0), 0);

  const ownerLabel = (owner) => owner === 'joint' ? 'Joint' : owner === 'spouse' ? spouseName : myName;

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Real Estate</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {(state.properties || []).length} propert{(state.properties || []).length !== 1 ? 'ies' : 'y'} · {fmtFull(totalValue)} total value
            {totalNetRental !== 0 && ` · ${totalNetRental >= 0 ? '+' : ''}${fmtFull(totalNetRental)}/yr net rental`}
          </p>
        </div>
        <button onClick={() => { setShowAdd(true); setEditId(null); }} className="btn-primary text-sm">
          <Plus size={15} /> Add Property
        </button>
      </div>

      {showAdd && (
        <PropertyForm
          onSave={handleAdd}
          onCancel={() => setShowAdd(false)}
          myName={myName}
          spouseName={spouseName}
        />
      )}

      <div className="space-y-3">
        {(state.properties || []).map(prop => {
          const netRental = Number(prop.annualRent || 0) - Number(prop.annualExpenses || 0);

          if (editId === prop.id) {
            return (
              <PropertyForm
                key={prop.id}
                initial={{ ...prop, currentValue: String(prop.currentValue), annualRent: String(prop.annualRent || ''), annualExpenses: String(prop.annualExpenses || '') }}
                onSave={handleUpdate}
                onCancel={() => setEditId(null)}
                myName={myName}
                spouseName={spouseName}
              />
            );
          }

          return (
            <div key={prop.id} className="card flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                  <Home size={16} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{prop.name}</p>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">{ownerLabel(prop.owner || 'me')}</span>
                  </div>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">{prop.appreciationRate}%/yr appreciation</p>
                  {(prop.annualRent > 0 || prop.annualExpenses > 0) && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Rent {fmtFull(prop.annualRent)}/yr − Expenses {fmtFull(prop.annualExpenses)}/yr
                      = <span className={netRental >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}>{netRental >= 0 ? '+' : ''}{fmtFull(netRental)}/yr net</span>
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-bold text-gray-900 dark:text-white">{fmtFull(Number(prop.currentValue))}</p>
                <p className="text-xs text-gray-400">current value</p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => { setEditId(prop.id); setShowAdd(false); }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors">
                  <Pencil size={14} />
                </button>
                <button onClick={() => deleteProperty(prop.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}

        {!(state.properties || []).length && !showAdd && (
          <div className="card text-center py-10 text-gray-400">
            <Home size={32} className="mx-auto mb-2 opacity-50" />
            <p className="mb-1">No properties added yet.</p>
            <p className="text-xs">Add homes, rental properties, or any real estate you own.</p>
          </div>
        )}
      </div>

      {(state.properties || []).length > 0 && (
        <div className="card bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800">
          <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mb-1">How real estate works in the simulation:</p>
          <ul className="text-xs text-emerald-600 dark:text-emerald-500 space-y-1 list-disc list-inside">
            <li>Property values grow each year by the appreciation rate you set</li>
            <li>Net rental income (rent − expenses) is added to the owner's brokerage account, growing with inflation</li>
            <li>Real estate equity is included in net worth but NOT counted toward the 4% SWR (it's not liquid)</li>
            <li>Joint properties are split 50/50 between both of you</li>
          </ul>
        </div>
      )}
    </div>
  );
}
