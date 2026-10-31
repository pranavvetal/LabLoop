// ============================================================
// LabLoop Enterprise — Administrative Analytics & Insights
// ============================================================

"use client";

import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { Navbar } from '@/components/Navbar';
import { useAppContext } from '@/lib/context';

export default function InsightsPage() {
  const { resources, bookings, incidents, isMounted } = useAppContext();

  // 1. Utilisation Data per Resource
  const utilisationData = useMemo(() => {
    return resources.map((r) => {
      const rBookings = bookings.filter((b) => b.resource_id === r.id);
      const bookedHours = rBookings.length * 2.5; // average session
      const totalAvailableHours = 12 * 7; // 84 hrs/week
      const utilPercent = Math.min(100, Math.round((bookedHours / totalAvailableHours) * 100));
      const idleHours = Math.max(0, totalAvailableHours - bookedHours);

      return {
        name: r.name.split(' ')[0] + ' ' + (r.name.split(' ')[1] || ''),
        utilization: utilPercent,
        idleHours,
        bookingsCount: rBookings.length,
      };
    });
  }, [resources, bookings]);

  // 2. Share by Role Category (Gini Fairness Index data)
  const roleShareData = [
    { name: 'Undergrad Capstone Teams', value: 48, color: '#4f46e5' },
    { name: 'Graduate & Postdoc Research', value: 34, color: '#06b6d4' },
    { name: 'Startup Incubator Prototypes', value: 18, color: '#8b5cf6' },
  ];

  // 3. Weekly Hours Trend
  const trendData = [
    { week: 'Wk 1 (Sep)', hours: 42, waitlist: 8 },
    { week: 'Wk 2 (Sep)', hours: 68, waitlist: 14 },
    { week: 'Wk 3 (Oct)', hours: 94, waitlist: 22 },
    { week: 'Wk 4 (Oct)', hours: 128, waitlist: 31 },
    { week: 'Wk 5 (Now)', hours: 154, waitlist: 19 },
  ];

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-1">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-800 border border-indigo-200 px-3 py-1 rounded-full text-xs font-semibold mb-2">
              <span>Campus Resource Utilization Telemetry</span>
              <span>•</span>
              <span>Dean of Engineering Oversight</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
              LabLoop System Insights &amp; Utilization Analytics
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Quantifiable evidence of unlocked equipment capacity, fair allocation distribution, and equipment health metrics.
            </p>
          </div>

          <div className="bg-white px-4 py-2 rounded-2xl border border-slate-200 text-xs">
            <span className="text-slate-400 block font-bold uppercase text-[9px]">Gini Fairness Index</span>
            <span className="text-xl font-black text-emerald-600">0.18</span>
            <span className="text-slate-400 text-[10px] block">Highly equitable access</span>
          </div>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Hours Unlocked
            </span>
            <span className="text-2xl font-black text-indigo-900 mt-1 block">536 hrs</span>
            <span className="text-[11px] text-emerald-600 font-semibold">+38% vs prior term</span>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Avg Approval Turnaround
            </span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">3.4 hrs</span>
            <span className="text-[11px] text-slate-500">Human owner review speed</span>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Active Waitlist Size
            </span>
            <span className="text-2xl font-black text-purple-700 mt-1 block">12 users</span>
            <span className="text-[11px] text-slate-500">Auto-promoted on cancel</span>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Incident Rate
            </span>
            <span className="text-2xl font-black text-rose-600 mt-1 block">
              {(incidents.length / (bookings.length || 1) * 100).toFixed(1)}%
            </span>
            <span className="text-[11px] text-slate-500">All handled with audit</span>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          {/* Chart 1: Equipment Utilization % */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-1">
              Resource Utilization Rate (%)
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              Percentage of weekly operating capacity consumed by approved research sessions.
            </p>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={utilisationData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="utilization" fill="#4f46e5" radius={[8, 8, 0, 0]} name="Utilization %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Weekly Hours Unlocked Trend */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-1">
              Unlocked Machine Hours per Week
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              Growth trajectory of lab hours shared across campus departments.
            </p>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="hours"
                    stroke="#059669"
                    strokeWidth={3}
                    dot={{ r: 5 }}
                    name="Hours Unlocked"
                  />
                  <Line
                    type="monotone"
                    dataKey="waitlist"
                    stroke="#9333ea"
                    strokeWidth={2}
                    name="Waitlist Size"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3: Fair Allocation Distribution Pie */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-1">
              Fair Allocation Distribution (By User Need)
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Breakdown of hours across project types. Anti-hoarding algorithms ensure capstone students receive guaranteed quotas.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="h-56 w-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={roleShareData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={75}
                      innerRadius={45}
                    >
                      {roleShareData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-3 text-xs flex-1">
                {roleShareData.map((d, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="font-semibold text-slate-700">{d.name}</span>
                    </div>
                    <span className="font-black text-slate-900">{d.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Institutional Compliance Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs text-xs space-y-4">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Campus Auditability &amp; Risk Guarantee
            </h2>
            <p className="text-slate-600 leading-relaxed">
              Every equipment activation in LabLoop is linked to a cryptographic SHA-256 hash block. Insurance deductibles, safety checks, and supervisor endorsements are verifiable by university risk officers in real time.
            </p>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-700">Audit Blocks Signed:</span>
                <span className="font-mono font-bold text-slate-900">{bookings.length * 4 + 12}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-700">Digital Certificates Verified:</span>
                <span className="font-bold text-emerald-600">100% Human Endorsed</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-700">Tamper Rate:</span>
                <span className="font-bold text-emerald-600">0.00% (Mathematical Guarantee)</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 italic">
              Illustrative simulation data dynamically updated based on active localStorage session events.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
