const STORAGE_KEY = 'freedom_planner_state';

export function saveToStorage(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      accounts: state.accounts,
      expenses: state.expenses,
      rsus:     state.rsus,
      properties: state.properties || [],
      settings: state.settings,
      darkMode: state.darkMode,
    }));
  } catch (e) {
    console.warn('Failed to save to localStorage:', e);
  }
}

export function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn('Failed to load from localStorage:', e);
    return null;
  }
}

export function exportToJSON(state) {
  const data = {
    version: '2.0',
    exportedAt: new Date().toISOString(),
    accounts:   state.accounts,
    expenses:   state.expenses,
    rsus:       state.rsus,
    properties: state.properties || [],
    settings:   state.settings,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `freedom_plan_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importFromJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try { resolve(JSON.parse(e.target.result)); }
      catch { reject(new Error('Invalid JSON file')); }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
