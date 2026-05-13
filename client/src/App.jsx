import React, { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { PlanProvider } from './context/PlanContext';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import AccountManager from './components/AccountManager';
import RealEstateManager from './components/RealEstateManager';
import ExpenseTimeline from './components/ExpenseTimeline';
import RSUManager from './components/RSUManager';

const TABS = [
  { id: 'dashboard',   label: 'Dashboard' },
  { id: 'accounts',    label: 'Accounts' },
  { id: 'realestate',  label: 'Real Estate' },
  { id: 'expenses',    label: 'Expenses' },
  { id: 'rsus',        label: 'RSU / Options' },
];

export default function App() {
  const [activeTab,   setActiveTab]   = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <PlanProvider>
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <div className="flex flex-wrap gap-1 bg-gray-100 dark:bg-gray-900 p-1 rounded-xl">
                {TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`tab-btn ${activeTab === tab.id ? 'tab-active' : 'tab-inactive'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <button
                className="md:hidden btn-secondary px-2.5 py-2 ml-auto"
                onClick={() => setSidebarOpen(true)}
                title="Open simulation controls"
              >
                <SlidersHorizontal size={16} />
              </button>
            </div>

            {activeTab === 'dashboard'  && <Dashboard />}
            {activeTab === 'accounts'   && <AccountManager />}
            {activeTab === 'realestate' && <RealEstateManager />}
            {activeTab === 'expenses'   && <ExpenseTimeline />}
            {activeTab === 'rsus'       && <RSUManager />}
          </main>
        </div>
      </div>
    </PlanProvider>
  );
}
