import React, { useRef, useState } from 'react';
import { Download, Upload, Moon, Sun, X, FileText } from 'lucide-react';
import { usePlan } from '../context/PlanContext';
import { exportToJSON, importFromJSON } from '../utils/storage';
import { exportToPDF } from '../utils/generateReport';

export default function Header() {
  const { state, toggleDark, importData } = usePlan();
  const fileRef = useRef();
  const [disclaimerDismissed, setDisclaimerDismissed] = useState(false);

  const handleExport = () => exportToJSON(state);

  const [exporting, setExporting] = useState(false);
  const handleExportPDF = async () => {
    setExporting(true);
    try {
      await exportToPDF(state);
    } finally {
      setExporting(false);
    }
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
          <button
            onClick={() => fileRef.current?.click()}
            className="btn-secondary text-sm"
            title="Load your saved plan (JSON)"
          >
            <Upload size={15} />
            <span className="hidden sm:inline">Load Plan</span>
          </button>
          <button
            onClick={handleExport}
            className="btn-primary text-sm"
            title="Save your plan as JSON file"
          >
            <Download size={15} />
            <span className="hidden sm:inline">Save Plan</span>
          </button>
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="btn-secondary text-sm"
            title="Export a PDF report"
          >
            <FileText size={15} />
            <span className="hidden sm:inline">{exporting ? 'Generating…' : 'Export PDF'}</span>
          </button>
          <button onClick={toggleDark} className="btn-secondary px-2.5 py-2" title="Toggle theme">
            {state.darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      {!disclaimerDismissed && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between gap-4">
          <p className="text-xs text-amber-300/80">
            <span className="font-bold text-amber-400">🔒 Your data never leaves your browser.</span>
            {' '}Nothing is saved on any server.
            To keep your work: <button onClick={handleExport} className="underline font-semibold hover:text-amber-300">Save Plan</button> (downloads a JSON file),
            then <button onClick={() => fileRef.current?.click()} className="underline font-semibold hover:text-amber-300">Load Plan</button> next time to pick up where you left off.
          </p>
          <button onClick={() => setDisclaimerDismissed(true)} className="text-gray-500 hover:text-gray-300 flex-shrink-0">
            <X size={14} />
          </button>
        </div>
      )}
    </>
  );
}
