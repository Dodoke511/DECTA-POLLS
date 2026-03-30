'use client';

import React, { useState } from 'react';
import {
  LayoutDashboard,
  Building2,
  Settings,
  LogOut,
  Search,
} from 'lucide-react';

interface AuditLog {
  id: number;
  timestamp: string;
  tenant: string;
  action: string;
  status: 'success' | 'warning' | 'error';
}

export default function SystemMonitoring() {
  const [activeTab, setActiveTab] = useState<'monitoring' | 'configuration'>('monitoring');
  const [searchQuery, setSearchQuery] = useState('');

  const auditLogs: AuditLog[] = [
    {
      id: 1,
      timestamp: '2026-03-20 14:32:15',
      tenant: 'CEBU INSTITUTE TECHNOLOGY',
      action: 'Subscription Change',
      status: 'success',
    },
    {
      id: 2,
      timestamp: '2026-03-20 14:32:15',
      tenant: 'UNIVERSITY OF CEBU',
      action: 'Password Reset',
      status: 'success',
    },
    {
      id: 3,
      timestamp: '2026-03-20 14:32:15',
      tenant: 'CEBU DOCTORS UNIVERSITY',
      action: 'Subscription Change',
      status: 'warning',
    },
    {
      id: 4,
      timestamp: '2026-03-20 14:32:15',
      tenant: 'VELEZ COLLEGE',
      action: 'Subscription Change',
      status: 'warning',
    },
    {
      id: 5,
      timestamp: '2026-03-20 14:32:15',
      tenant: 'MONSTER CORP.',
      action: 'Subscription Change',
      status: 'error',
    },
    {
      id: 6,
      timestamp: '2026-03-20 14:32:15',
      tenant: 'INCORPORATED INC.',
      action: 'Subscription Change',
      status: 'error',
    },
  ];

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-500/20 border border-green-500/50 text-green-400';
      case 'warning':
        return 'bg-yellow-300/25 border border-yellow-300/25 text-yellow-300/40';
      case 'error':
        return 'bg-orange-600/20 border border-orange-600/50 text-orange-400';
      default:
        return '';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div className="w-full min-h-screen bg-slate-950 overflow-hidden">
      {/* Top Header */}
      <div className="w-full h-20 bg-gradient-to-r from-purple-950 via-purple-900 to-purple-500/90 flex items-center px-12 fixed top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-400 rounded-full flex items-center justify-center">
            <span className="text-purple-950 font-bold text-lg">D</span>
          </div>
          <span className="text-zinc-100 text-base font-medium font-montserrat">
            D.E.C.T.A Polls | Tenant Admin
          </span>
        </div>
      </div>

      <div className="flex pt-20">
        {/* Sidebar */}
        <div className="w-80 h-screen bg-zinc-300/20 rounded-tr-3xl rounded-br-3xl shadow-lg p-8 fixed left-0 top-20 opacity-60 backdrop-blur">
          {/* Welcome Section */}
          <div className="mb-24">
            <div className="text-4xl font-semibold font-montserrat">
              <span className="text-gray-100">WELCOME</span>
              <span className="text-white">!</span>
            </div>
            <p className="text-zinc-100 text-base mt-2 font-source-sans-pro">
              Super Admin
            </p>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-3 mb-48">
            <NavLink icon={LayoutDashboard} label="Dashboard" />
            <NavLink icon={Building2} label="Tenants" />
            <NavLink icon={Settings} label="Settings" />
          </nav>

          {/* Sign Out */}
          <div className="flex items-center gap-3 text-zinc-100 hover:text-white cursor-pointer transition">
            <LogOut size={28} />
            <span className="text-base font-medium font-montserrat">Sign Out</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="ml-96 flex-1 p-8">
          {/* Settings Header and Tabs */}
          <div className="mb-12">
            <h1 className="text-6xl font-semibold text-indigo-200 mb-8 font-montserrat" style={{
              textShadow: '2px 2px 20px rgba(208, 200, 255, 0.5)',
            }}>
              Settings
            </h1>

            {/* Tab Buttons */}
            <div className="flex gap-4 mb-8">
              <button
                onClick={() => setActiveTab('monitoring')}
                className={`px-6 py-3 rounded-3xl font-bold text-sm font-montserrat transition-all ${
                  activeTab === 'monitoring'
                    ? 'bg-indigo-600 text-zinc-100 border border-indigo-900'
                    : 'bg-white/10 text-zinc-100 border border-zinc-100'
                }`}
              >
                System Monitoring
              </button>
              <button
                onClick={() => setActiveTab('configuration')}
                className={`px-6 py-3 rounded-3xl font-bold text-sm font-montserrat transition-all ${
                  activeTab === 'configuration'
                    ? 'bg-indigo-600 text-zinc-100 border border-indigo-900'
                    : 'bg-white/10 text-zinc-100 border border-zinc-100'
                }`}
              >
                Global Configuration
              </button>
            </div>

            {/* Search Bar */}
            <div className="w-72 h-14 px-4 py-2 bg-transparent border border-zinc-100 rounded-xl flex items-center gap-3">
              <Search size={24} className="text-zinc-100" />
              <input
                type="text"
                placeholder="Search Audit"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-zinc-100 text-lg font-bold font-montserrat placeholder-zinc-400 outline-none"
              />
            </div>
          </div>

          {/* Audit Table */}
          {activeTab === 'monitoring' && (
            <div className="bg-zinc-300/10 rounded-2xl overflow-hidden">
              {/* Table Header */}
              <div className="bg-transparent px-8 py-6 border-b border-violet-300">
                <div className="grid grid-cols-4 gap-8">
                  <div className="text-zinc-100 text-sm font-bold font-montserrat">
                    TIMESTAMP
                  </div>
                  <div className="text-zinc-100 text-sm font-bold font-montserrat">
                    TENANT
                  </div>
                  <div className="text-zinc-100 text-sm font-bold font-montserrat">
                    ACTION
                  </div>
                  <div className="text-zinc-100 text-sm font-bold font-montserrat">
                    ACTION STATUS
                  </div>
                </div>
              </div>

              {/* Table Rows */}
              <div className="px-8 py-6 space-y-6">
                {auditLogs.map((log) => (
                  <div key={log.id} className="grid grid-cols-4 gap-8 items-center">
                    <div className="text-zinc-100 text-lg font-source-sans-pro">
                      {log.timestamp}
                    </div>
                    <div className="text-zinc-100 text-lg font-source-sans-pro">
                      {log.tenant}
                    </div>
                    <div className="text-zinc-100 text-sm font-medium font-montserrat">
                      {log.action}
                    </div>
                    <div>
                      <span
                        className={`inline-block px-4 py-1.5 rounded-full text-xs font-bold font-montserrat tracking-wide ${getStatusStyles(
                          log.status
                        )}`}
                      >
                        {getStatusLabel(log.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Global Configuration Tab Content */}
          {activeTab === 'configuration' && (
            <div className="bg-zinc-300/10 rounded-2xl p-8">
              <div className="text-zinc-100 text-lg font-montserrat">
                Global Configuration settings will be displayed here.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Navigation Link Component
 */
interface NavLinkProps {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
}

function NavLink({ icon: Icon, label }: NavLinkProps) {
  return (
    <div className="w-72 h-16 relative bg-white/10 rounded-3xl overflow-hidden flex items-center gap-6 px-6 hover:bg-white/20 cursor-pointer transition group">
      <Icon size={36} className="text-zinc-100 group-hover:text-indigo-200 transition" />
      <span className="text-zinc-100 text-lg font-bold font-montserrat group-hover:text-indigo-200 transition">
        {label}
      </span>
    </div>
  );
}
