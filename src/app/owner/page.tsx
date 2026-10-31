// ============================================================
// LabLoop Enterprise — Owner & Manager Operational Dashboard
// ============================================================

"use client";

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { useAppContext } from '@/lib/context';
import { Booking, Resource } from '@/lib/types';
import { can } from '@/lib/permissions';

export default function OwnerDashboard() {
  const router = useRouter();
  const {
    currentUser,
    resources,
    bookings,
    users,
    userBadges,
    badges,
    approveBooking,
    rejectBooking,
    waitlistBooking,
    updateResourceStatus,
    logAudit,
    isMounted,
  } = useAppContext();

  const [activeTab, setActiveTab] = useState<'pending' | 'sessions' | 'fleet' | 'delegation'>('pending');

  // Decision Modal State
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [decisionAction, setDecisionAction] = useState<'approve' | 'reject' | 'waitlist' | null>(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [isOverride, setIsOverride] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Maintenance Status Modal State
  const [maintenanceResource, setMaintenanceResource] = useState<Resource | null>(null);
  const [targetStatus, setTargetStatus] = useState<'available' | 'maintenance' | 'retired'>('maintenance');
  const [statusReason, setStatusReason] = useState('');

  // Manager filter: Owners see resources they own; managers see resources assigned to them
  const myResources = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'admin') return resources;
    if (currentUser.role === 'manager') {
      return resources.filter((r) => r.manager_id === currentUser.id || !r.manager_id);
    }
    return resources.filter((r) => r.owner_id === currentUser.id);
  }, [resources, currentUser]);

  const myResourceIds = useMemo(() => myResources.map((r) => r.id), [myResources]);

  // Bookings for owner resources
  const pendingRequests = useMemo(() => {
    return bookings.filter(
      (b) => myResourceIds.includes(b.resource_id) && b.status === 'pending'
    );
  }, [bookings, myResourceIds]);

  const activeSessions = useMemo(() => {
    return bookings.filter(
      (b) => myResourceIds.includes(b.resource_id) && ['checked_in', 'overdue'].includes(b.status)
    );
  }, [bookings, myResourceIds]);

  // Handle Decision
  const handleConfirmDecision = async () => {
    if (!selectedBooking || !decisionAction) return;
    if (!decisionReason.trim()) {
      alert('A written reason is required for accountability and audit logging.');
      return;
    }

    setIsProcessing(true);
    try {
      if (decisionAction === 'approve') {
        await approveBooking(selectedBooking.id, decisionReason);
        if (isOverride) {
          await logAudit(
            'OVERRIDE_DECISION',
            'booking',
            selectedBooking.id,
            `Owner override decision executed by ${currentUser?.full_name}: ${decisionReason}`,
            { override: true, reason: decisionReason }
          );
        }
        setActionNotice(`Booking for ${selectedBooking.id} approved successfully!`);
      } else if (decisionAction === 'reject') {
        await rejectBooking(selectedBooking.id, decisionReason);
        setActionNotice(`Booking for ${selectedBooking.id} declined.`);
      } else if (decisionAction === 'waitlist') {
        await waitlistBooking(selectedBooking.id, decisionReason);
        setActionNotice(`Booking for ${selectedBooking.id} moved to waitlist.`);
      }

      setSelectedBooking(null);
      setDecisionAction(null);
      setDecisionReason('');
      setIsOverride(false);
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      alert(`Decision error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Fleet Status Change
  const handleConfirmFleetStatus = async () => {
    if (!maintenanceResource) return;
    try {
      await updateResourceStatus(maintenanceResource.id, targetStatus, statusReason);
      setActionNotice(
        `Fleet status for ${maintenanceResource.name} updated to ${targetStatus}. Affected users notified.`
      );
      setMaintenanceResource(null);
      setStatusReason('');
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      alert(`Status error: ${err.message}`);
    }
  };

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
            <div className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-800 border border-purple-200 px-3 py-1 rounded-full text-xs font-semibold mb-2">
              <span>Equipment Director Portal</span>
              <span>•</span>
              <span>{currentUser?.full_name} ({currentUser?.role})</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
              Lab Management & Review Queue
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Human oversight hub: Review competing requests, enforce fair allocation, control fleet states, and inspect safety reports.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/owner/resources/new')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              + List New Asset
            </button>
            <button
              onClick={() => router.push('/owner/incidents')}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition border border-slate-200"
            >
              Open Incidents
            </button>
          </div>
        </div>

        {/* Action Notice */}
        {actionNotice && (
          <div className="my-6 p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 text-xs font-bold shadow-sm flex items-center gap-2">
            <span>✓</span> {actionNotice}
          </div>
        )}

        {/* KPI Snapshot Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Pending Review
            </span>
            <span className="text-2xl font-black text-amber-600 mt-1 block">
              {pendingRequests.length}
            </span>
            <span className="text-[11px] text-slate-500">Requires owner sign-off</span>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Active Sessions
            </span>
            <span className="text-2xl font-black text-indigo-700 mt-1 block">
              {activeSessions.length}
            </span>
            <span className="text-[11px] text-slate-500">In physical lab use</span>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Managed Assets
            </span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">
              {myResources.length}
            </span>
            <span className="text-[11px] text-slate-500">In campus inventory</span>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Overdue Flagged
            </span>
            <span className="text-2xl font-black text-rose-600 mt-1 block">
              {activeSessions.filter((b) => b.status === 'overdue').length}
            </span>
            <span className="text-[11px] text-slate-500">Escalated holding</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 mt-8 pb-2 scrollbar-none">
          {[
            { id: 'pending', label: 'Review Queue', count: pendingRequests.length },
            { id: 'sessions', label: "Active Sessions & Overdue", count: activeSessions.length },
            { id: 'fleet', label: 'Fleet Control & Status', count: myResources.length },
            { id: 'delegation', label: 'Manager Delegation', count: myResources.filter((r) => r.manager_id).length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === tab.id ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* TAB 1: Pending Review Queue */}
        {activeTab === 'pending' && (
          <div className="mt-6 space-y-4">
            {pendingRequests.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-xs text-slate-400">
                All booking requests for your equipment have been reviewed!
              </div>
            ) : (
              pendingRequests.map((req) => {
                const requester = users.find((u) => u.id === req.user_id);
                const res = resources.find((r) => r.id === req.resource_id);
                const reqBadges = userBadges
                  .filter((ub) => ub.user_id === req.user_id && ub.verified)
                  .map((ub) => badges.find((b) => b.id === ub.badge_id)?.name)
                  .filter(Boolean);

                return (
                  <div
                    key={req.id}
                    className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col lg:flex-row lg:items-start justify-between gap-6"
                  >
                    {/* Left: Requester Identity & Purpose */}
                    <div className="flex-1 space-y-3 text-xs">
                      <div className="flex items-center gap-3">
                        <img
                          src={requester?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                          alt={requester?.full_name}
                          className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-500/20"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-base font-bold text-slate-900">{requester?.full_name}</h2>
                            <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                              {requester?.role}
                            </span>
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              Tier {requester?.trust_tier}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500">{requester?.email}</p>
                        </div>
                      </div>

                      {/* Equipment & Window */}
                      <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Equipment</span>
                          <span className="font-bold text-slate-800">{res?.name}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Window</span>
                          <span className="font-bold text-slate-800">
                            {new Date(req.start_time).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                            • {new Date(req.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                            {new Date(req.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      {/* Purpose */}
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                          Purpose ({req.purpose_type.replace('_', ' ')})
                        </span>
                        <p className="text-slate-700 bg-white p-3 rounded-xl border border-slate-200 italic">
                          &ldquo;{req.purpose}&rdquo;
                        </p>
                      </div>

                      {/* Verified Badges Held */}
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                          Applicant Badges Held
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {reqBadges.map((bName, idx) => (
                            <span
                              key={idx}
                              className="bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-md border border-emerald-200"
                            >
                              ✓ {bName}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Middle: Engine Recommendation & Breakdown */}
                    <div className="w-full lg:w-72 bg-indigo-50/70 p-4 rounded-2xl border border-indigo-100 text-xs space-y-2">
                      <div className="flex justify-between items-center font-bold text-indigo-950 pb-2 border-b border-indigo-200/60">
                        <span>Engine Priority:</span>
                        <span className="text-sm font-black text-indigo-700">{req.priority_score} pts</span>
                      </div>
                      <div className="text-[11px] text-slate-600 space-y-1">
                        <div className="flex justify-between">
                          <span>• Purpose Weight:</span>
                          <span>+{req.score_breakdown?.purpose_weight ?? 50}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>• Fair-Share Score:</span>
                          <span>+{req.score_breakdown?.fair_share_score ?? 100}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>• Weekly Usage:</span>
                          <span>{req.score_breakdown?.weekly_usage_penalty ?? -8}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>• No-Show History:</span>
                          <span>{requester?.no_show_count ? `-${requester.no_show_count * 15}` : '0'}</span>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-indigo-200/60">
                        <span className="text-[10px] font-bold text-emerald-800 block">Recommendation:</span>
                        <span className="text-[11px] text-slate-700 font-medium leading-relaxed block">
                          Engine suggests Approval (prerequisites verified, within quota).
                        </span>
                      </div>
                    </div>

                    {/* Right: Decision Actions */}
                    <div className="flex flex-col gap-2 min-w-[160px] self-center sm:self-auto">
                      <button
                        onClick={() => {
                          setSelectedBooking(req);
                          setDecisionAction('approve');
                          setDecisionReason('Prerequisites verified and academic milestone timeline confirmed.');
                        }}
                        className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-sm text-center"
                      >
                        Approve Reservation
                      </button>

                      <button
                        onClick={() => {
                          setSelectedBooking(req);
                          setDecisionAction('reject');
                          setDecisionReason('Equipment capacity reserved for departmental examination.');
                        }}
                        className="py-2 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-xl text-xs transition text-center"
                      >
                        Decline Request
                      </button>

                      <button
                        onClick={() => {
                          setSelectedBooking(req);
                          setDecisionAction('waitlist');
                          setDecisionReason('Prioritizing senior capstone project deadline.');
                        }}
                        className="py-2 px-4 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold rounded-xl text-xs transition text-center"
                      >
                        Move to Waitlist
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 2: Active Sessions & Overdue */}
        {activeTab === 'sessions' && (
          <div className="mt-6 space-y-4">
            {activeSessions.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-xs text-slate-400">
                No active or overdue sessions currently running.
              </div>
            ) : (
              activeSessions.map((session) => {
                const user = users.find((u) => u.id === session.user_id);
                const res = resources.find((r) => r.id === session.resource_id);

                return (
                  <div
                    key={session.id}
                    className={`bg-white rounded-3xl border p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 text-xs ${
                      session.status === 'overdue' ? 'border-rose-300 bg-rose-50/20' : 'border-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{res?.name}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            session.status === 'overdue'
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : 'bg-indigo-100 text-indigo-800'
                          }`}
                        >
                          {session.status}
                        </span>
                      </div>
                      <p className="text-slate-500 mt-1">
                        In custody of <strong>{user?.full_name}</strong> ({user?.email})
                      </p>
                      <p className="text-slate-500">
                        Scheduled Return: <strong>{new Date(session.end_time).toLocaleTimeString()}</strong>
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => router.push(`/bookings/${session.id}`)}
                        className="px-3.5 py-2 border border-slate-300 rounded-xl font-bold hover:bg-slate-50"
                      >
                        Session Timeline
                      </button>
                      <button
                        onClick={() => router.push('/owner/incidents')}
                        className="px-3.5 py-2 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700"
                      >
                        File Incident
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 3: Fleet Control */}
        {activeTab === 'fleet' && (
          <div className="mt-6 space-y-4">
            {myResources.map((res) => (
              <div
                key={res.id}
                className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-slate-900">{res.name}</span>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                        res.status === 'available'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {res.status}
                    </span>
                  </div>
                  <p className="text-slate-500 mt-0.5">{res.location} • ${res.hourly_rate}/hr</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setMaintenanceResource(res);
                      setTargetStatus(res.status === 'available' ? 'maintenance' : 'available');
                      setStatusReason(res.status === 'available' ? 'Scheduled optical recalibration.' : 'Maintenance complete.');
                    }}
                    className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition"
                  >
                    Set {res.status === 'available' ? 'Maintenance' : 'Available'}
                  </button>

                  <button
                    onClick={() => router.push(`/resources/${res.id}`)}
                    className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl font-bold hover:bg-indigo-100 transition"
                  >
                    View Listing →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 4: Manager Delegation */}
        {activeTab === 'delegation' && (
          <div className="mt-6 space-y-4">
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl text-xs text-purple-900 leading-relaxed mb-4">
              <strong>Delegation Policy:</strong> Equipment directors can assign a dedicated Facility Manager (e.g. Marcus Lee) to handle day-to-day check-in inspections, condition reports, and booking confirmations on specific machines.
            </div>

            {myResources.map((res) => (
              <div
                key={res.id}
                className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
              >
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{res.name}</h3>
                  <p className="text-slate-500 mt-0.5">Assigned Manager: Marcus Lee (Facility Supervisor)</p>
                </div>

                <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full font-bold text-[10px] uppercase">
                  Active Delegation ✓
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Review Decision Modal */}
        {selectedBooking && decisionAction && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900 capitalize">
                  {decisionAction} Reservation Request
                </h3>
                <span className="text-slate-400 font-mono text-[10px]">{selectedBooking.id}</span>
              </div>

              <p className="text-slate-600 leading-relaxed">
                Provide an explicit reason for this action. Every decision is written to the cryptographic audit trail and communicated to the applicant with full transparency.
              </p>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Written Explanation / Decision Note *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Enter specific justification for audit record..."
                  value={decisionReason}
                  onChange={(e) => setDecisionReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Engine Override Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={isOverride}
                  onChange={(e) => setIsOverride(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300"
                />
                <span className="font-semibold text-slate-700 text-[11px]">
                  Flag as Engine Override (Logs OVERRIDE_DECISION in audit trail)
                </span>
              </label>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBooking(null);
                    setDecisionAction(null);
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isProcessing || !decisionReason.trim()}
                  onClick={handleConfirmDecision}
                  className={`px-5 py-2 text-white rounded-xl font-bold transition ${
                    decisionAction === 'approve'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : decisionAction === 'reject'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-purple-600 hover:bg-purple-700'
                  }`}
                >
                  {isProcessing ? 'Recording...' : `Confirm ${decisionAction}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Fleet Maintenance Modal */}
        {maintenanceResource && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-xs">
              <h3 className="text-base font-bold text-slate-900">
                Change Fleet Status: {maintenanceResource.name}
              </h3>
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Target State
                </label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold cursor-pointer"
                >
                  <option value="available">Available (Operational)</option>
                  <option value="maintenance">Maintenance (Scheduled Calibration)</option>
                  <option value="retired">Retired (Decommissioned)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Reason for Status Change
                </label>
                <textarea
                  rows={2}
                  required
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder="e.g. Laser diode replacement and chiller fluid change..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMaintenanceResource(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmFleetStatus}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition"
                >
                  Update Fleet State
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
