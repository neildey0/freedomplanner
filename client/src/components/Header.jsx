import React, { useRef } from 'react';
import { Sun, Moon, Download, Upload, Shield } from 'lucide-react';
import { usePlan } from '../context/PlanContext';
import { exportToJSON, importFromJSON } from '../utils/storage';

export default function Header() {
  const { state, toggleDark, importData } = usePlan();
  const fileRef = useRef();

  const handleExport = () => exportToJSON(state);

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
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <span className="text-2xl">🗽</span>
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
            Freedom Planner
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
            Local-First Financial Engine
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2.5 py-1.5 rounded-lg">
          <Shield size={12} />
          <span>100% Private</span>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImport}
        />
        <button
          onClick={() => fileRef.current?.click()}
          className="btn-secondary text-sm"
          title="Import plan from JSON"
        >
          <Upload size={15} />
          <span className="hidden sm:inline">Import</span>
        </button>
        <button
          onClick={handleExport}
          className="btn-primary text-sm"
          title="Export plan as JSON"
        >
          <Download size={15} />
          <span className="hidden sm:inline">Export</span>
        </button>
        <button
          onClick={toggleDark}
          className="btn-secondary px-2.5 py-2"
          title="Toggle dark mode"
        >
          {state.darkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </header>
  );
}
