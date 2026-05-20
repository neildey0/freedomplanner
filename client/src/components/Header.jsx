import React, { useRef, useState } from 'react';
import { Download, Upload, Moon, Sun, FileText, ShieldAlert } from 'lucide-react';
import { usePlan } from '../context/PlanContext';
import { exportToJSON, importFromJSON } from '../utils/storage';
import { exportToPDF } from '../utils/generateReport';

export default function Header() {
  const { state, toggleDark, importData } = usePlan();
  const fileRef = useRef();

  const handleExport = () => exportToJSON(state);

  const [exporting, setExporting] = useState(false);
  const handleExportPDF = async () => {
    setExporting(true);
    try { await exportToPDF(state); }
    finally { setExporting(false); }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await importFromJSON(file);
      importData(data);
      e.target.value = '';
    } catch (err) {
      alert('Failed to import: ' + err.message);
    }
  };

  return (
    <>
      <header className="bg-gray-950 border-b border-amber-500/30 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <span className="text-2xl">💰</span>
          <div>
            <h1 className="text-lg font-black text-amber-400 leading-tight tracking-tight">
              F**K YOU MONEY
            </h1>
            <p className="text-xs text-gray-500 hidden sm:block italic">
              "A wise man's life is based around 'fuck you.'" — The Gambler
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          <button onClick={() => fileRef.current?.click()} className="btn-secondary text-sm" title="Load your saved plan (JSON)">
            <Upload size={15} />
            <span className="hidden sm:inline">Load Plan</span>
          </button>
          <button onClick={handleExport} className="btn-primary text-sm" title="Save your plan as JSON file">
            <Download size={15} />
            <span className="hidden sm:inline">Save Plan</span>
          </button>
          <button onClick={handleExportPDF} disabled={exporting} className="btn-secondary text-sm" title="Export a PDF report">
            <FileText size={15} />
            <span className="hidden sm:inline">{exporting ? 'Generating…' : 'Export PDF'}</span>
          </button>
          <button onClick={toggleDark} className="btn-secondary px-2.5 py-2" title="Toggle theme">
            {state.darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      {/* Privacy notice — always visible, high contrast in both modes */}
      <div className="bg-red-900 border-b border-red-700 px-4 py-2.5 flex items-start gap-3">
        <ShieldAlert size={16} className="text-red-300 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-white leading-snug">
          <span className="font-bold text-red-200">⚠ This tool does NOT save your data automatically.</span>
          {' '}Everything lives only in your browser tab — if you close or refresh, your work is gone.{' '}
          <strong>To keep your work:</strong>{' '}
          click <button onClick={handleExport} className="underline font-bold text-yellow-300 hover:text-yellow-200">💾 Save Plan</button> (downloads a JSON file to your computer),
          then use <button onClick={() => fileRef.current?.click()} className="underline font-bold text-yellow-300 hover:text-yellow-200">📂 Load Plan</button> next time to restore it.
          Your financial data never leaves your browser — no server, no account, total privacy.
        </p>
      </div>
    </>
  );
}
