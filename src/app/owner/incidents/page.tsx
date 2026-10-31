// ============================================================
// LabLoop Enterprise — Incident Management, Delays & Penalties
// ============================================================

"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { useAppContext } from '@/lib/context';
import { runOverdueCheck } from '@/lib/overdue';
import { Incident, IncidentType, IncidentSeverity, IncidentStatus } from '@/lib/types';
import { can } from '@/lib/permissions';

export default function IncidentsPage() {
  const router = useRouter();
  const {
    currentUser,
    incidents,
    bookings,
    users,
    reportIncident,
    resolveIncident,
    refreshDB,
    logAudit,
    isMounted,
  } = useAppContext();

  const [activeTab, setActiveTab] = useState<'open' | 'under_review' | 'resolved'>('open');
  const [notice, setNotice] = useState<string | null>(null);

  // New Incident Modal
  const [showReportModal, setShowReportModal] = useState(false);
  const [newBookingId, setNewBookingId] = useState('');
  const [newType, setNewType] = useState<IncidentType>('damage');
  const [newSeverity, setNewSeverity] = useState<IncidentSeverity>('medium');
  const [newDescription, setNewDescription] = useState('');
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // Resolution Modal
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [resolutionType, setResolutionType] = useState<'warning' | 'deduction' | 'suspension' | 'no_action'>('warning');
  const [penaltyText, setPenaltyText] = useState('Official written safety warning added to user file.');
  const [isResolving, setIsResolving] = useState(false);

  const filteredIncidents = incidents.filter((inc) => inc.status === activeTab);

  const handleRunOverdueScan = async () => {
    const res = await runOverdueCheck();
    refreshDB();
    setNotice(
      `Overdue scan completed: ${res.checkedCount} sessions inspected, ${res.newlyOverdue.length} flagged overdue, ${res.notificationsSent} alerts dispatched.`
    );
    setTimeout(() => setNotice(null), 5000);
  };

  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsSubmittingReport(true);

    try {
      await reportIncident({
        booking_id: newBookingId || 'bk-general',
        reporter_id: currentUser.id,
        type: newType,
        severity: newSeverity,
        status: 'open',
        description: newDescription,
        photos: newPhotoUrl ? [newPhotoUrl] : [],
        penalty_confirmed: false,
        appeal_filed: false,
      });

      setShowReportModal(false);
      setNewDescription('');
      setNewPhotoUrl('');
      setNotice('New incident reported and dispatched to facility supervisor queue.');
      setTimeout(() => setNotice(null), 4000);
    } catch (err: any) {
      alert(`Error creating incident: ${err.message}`);
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleConfirmResolution = async () => {
    if (!selectedIncident) return;
    setIsResolving(true);

    try {
      const summary = `Resolved via ${resolutionType}: ${penaltyText}`;
      // Manager/Admin confirms penalty proposal
      const confirmed = can(currentUser, 'confirm_penalty');

      await resolveIncident(selectedIncident.id, summary, confirmed);
      setSelectedIncident(null);
      setNotice(`Incident ${selectedIncident.id} resolved. Decision logged with human confirmation.`);
      setTimeout(() => setNotice(null), 4000);
    } catch (err: any) {
      alert(`Resolution error: ${err.message}`);
    } finally {
      setIsResolving(false);
    }
  };

  const handleFileAppeal = async (incident: Incident) => {
    try {
      await logAudit(
        'APPEAL_FILED',
        'incident',
        incident.id,
        `User ${currentUser?.full_name} filed formal appeal against penalty proposal. Reassigned to System Admin.`,
        { incident_id: incident.id, appellant: currentUser?.id }
      );
      setNotice(`Appeal filed for incident ${incident.id}. Escalated to System Admin for secondary review.`);
      refreshDB();
      setTimeout(() => setNotice(null), 4000);
    } catch (err: any) {
      alert(`Appeal error: ${err.message}`);
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

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-1">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-800 border border-rose-200 px-3 py-1 rounded-full text-xs font-semibold mb-2">
              <span>Accountability & Transparency</span>
              <span>•</span>
              <span>Human Oversight Enforced</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
              Incidents, Delays & Penalty Review
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Investigate hardware damage, late returns, and misuse. Every penalty is a proposal until confirmed by a person; users retain appeal rights.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunOverdueScan}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
            >
              <span>⏱</span>
              <span>Run Overdue Check Now</span>
            </button>
            <button
              onClick={() => setShowReportModal(true)}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
            >
              + File Incident Report
            </button>
          </div>
        </div>

        {notice && (
          <div className="my-6 p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 text-xs font-bold shadow-sm flex items-center gap-2">
            <span>✓</span> {notice}
          </div>
        )}

        {/* Status Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 mt-8 pb-2 scrollbar-none">
          {[
            { id: 'open', label: 'Open Incidents', count: incidents.filter((i) => i.status === 'open').length },
            { id: 'under_review', label: 'Under Review / Appealed', count: incidents.filter((i) => i.status === 'under_review').length },
            { id: 'resolved', label: 'Resolved History', count: incidents.filter((i) => i.status === 'resolved').length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-500/20'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === tab.id ? 'bg-rose-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Incidents List */}
        <div className="mt-6 space-y-4">
          {filteredIncidents.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-xs text-slate-400">
              No incidents in the &ldquo;{activeTab.replace('_', ' ')}&rdquo; queue.
            </div>
          ) : (
            filteredIncidents.map((inc) => {
              const reporter = users.find((u) => u.id === inc.reporter_id);
              const booking = bookings.find((b) => b.id === inc.booking_id);

              return (
                <div
                  key={inc.id}
                  className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col lg:flex-row lg:items-start justify-between gap-6"
                >
                  <div className="flex-1 space-y-3 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border border-rose-300">
                        {inc.type.replace('_', ' ')}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          inc.severity === 'critical' || inc.severity === 'high'
                            ? 'bg-red-900 text-white'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {inc.severity} severity
                      </span>
                      <span className="font-mono text-slate-400 text-[10px]">ID: {inc.id}</span>
                      {inc.booking_id && (
                        <span className="font-mono text-indigo-700 text-[10px]">Booking: {inc.booking_id}</span>
                      )}
                    </div>

                    <h2 className="text-base font-bold text-slate-900">
                      {inc.description}
                    </h2>

                    <div className="text-slate-500 flex flex-wrap gap-4 text-[11px]">
                      <span>
                        <strong>Reporter:</strong> {reporter?.full_name || inc.reporter_id} ({reporter?.role})
                      </span>
                      <span>
                        <strong>Logged:</strong> {new Date(inc.created_at).toLocaleString()}
                      </span>
                    </div>

                    {/* AI Neutral Summary if available */}
                    {inc.ai_summary && (
                      <div className="bg-indigo-50/70 p-3 rounded-2xl border border-indigo-100 text-indigo-950 text-[11px] leading-relaxed">
                        <span className="font-bold block text-indigo-900 mb-0.5">
                          ✦ Neutral Incident Summary (AI-assisted):
                        </span>
                        {inc.ai_summary}
                      </div>
                    )}

                    {/* Penalty Proposal */}
                    {inc.penalty_proposal && (
                      <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200 text-amber-950 text-[11px]">
                        <span className="font-bold block text-amber-900">
                          {inc.penalty_confirmed ? 'Confirmed Penalty:' : 'Pending Penalty Proposal (Human Review Required):'}
                        </span>
                        {inc.penalty_proposal}
                      </div>
                    )}

                    {/* Resolution Note if resolved */}
                    {inc.resolution && (
                      <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-200 text-emerald-950 text-[11px]">
                        <span className="font-bold block text-emerald-900">Resolution Verdict:</span>
                        {inc.resolution}
                      </div>
                    )}
                  </div>

                  {/* Actions Column */}
                  <div className="flex flex-col sm:flex-row lg:flex-col gap-2 min-w-[180px]">
                    {inc.status !== 'resolved' && (
                      <button
                        onClick={() => setSelectedIncident(inc)}
                        className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs text-center"
                      >
                        Resolve &amp; Confirm Proposal →
                      </button>
                    )}

                    {inc.status !== 'resolved' && !inc.appeal_filed && (
                      <button
                        onClick={() => handleFileAppeal(inc)}
                        className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition border border-slate-200 text-center"
                      >
                        File Disciplinary Appeal
                      </button>
                    )}

                    {inc.appeal_filed && (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl text-center">
                        Appeal Pending Admin Review
                      </span>
                    )}

                    {inc.booking_id && (
                      <button
                        onClick={() => router.push(`/bookings/${inc.booking_id}`)}
                        className="py-2 px-4 text-indigo-600 hover:bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-bold transition text-center"
                      >
                        View Booking Timeline
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Report New Incident Modal */}
        {showReportModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900">
                  File Incident Report
                </h3>
                <button onClick={() => setShowReportModal(false)} className="text-slate-400 font-bold">
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateIncident} className="space-y-4">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Related Reservation ID
                  </label>
                  <select
                    value={newBookingId}
                    onChange={(e) => setNewBookingId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium cursor-pointer"
                  >
                    <option value="">General Facility / Non-Booking</option>
                    {bookings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.id} — {b.purpose.slice(0, 30)}...
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Incident Type
                    </label>
                    <select
                      value={newType}
                      onChange={(e) => setNewType(e.target.value as IncidentType)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium cursor-pointer"
                    >
                      <option value="damage">Physical Hardware Damage</option>
                      <option value="delay">Overdue Holding / Delay</option>
                      <option value="safety">Safety Protocol Breach</option>
                      <option value="no_show">No-Show / Unclaimed Slot</option>
                      <option value="misuse">Improper Material / Misuse</option>
                      <option value="scheduling_conflict">Scheduling Conflict</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Severity
                    </label>
                    <select
                      value={newSeverity}
                      onChange={(e) => setNewSeverity(e.target.value as IncidentSeverity)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium cursor-pointer"
                    >
                      <option value="low">Low (Cosmetic / Minor Delay)</option>
                      <option value="medium">Medium (Requires Calibration)</option>
                      <option value="high">High (Part Replacement Needed)</option>
                      <option value="critical">Critical (Safety Hazard / Halt)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Factual Description &amp; Statement *
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Describe observed state, exact damages, or timeline of delay..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReport}
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition shadow-xs"
                  >
                    {isSubmittingReport ? 'Filing...' : 'Submit Incident Report'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Resolution Modal */}
        {selectedIncident && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900">
                  Resolve Incident &amp; Confirm Proposal
                </h3>
                <button onClick={() => setSelectedIncident(null)} className="text-slate-400 font-bold">
                  ✕
                </button>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Resolution Action
                </label>
                <select
                  value={resolutionType}
                  onChange={(e) => setResolutionType(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold cursor-pointer"
                >
                  <option value="warning">Formal Safety Warning (No financial penalty)</option>
                  <option value="deduction">Deposit Deduction ($25 Deductible)</option>
                  <option value="suspension">1-Week Privilege Suspension</option>
                  <option value="no_action">Dismiss / No Action (Equipment Calibrated)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Written Justification / Verdict *
                </label>
                <textarea
                  rows={2}
                  value={penaltyText}
                  onChange={(e) => setPenaltyText(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedIncident(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isResolving}
                  onClick={handleConfirmResolution}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition shadow-xs"
                >
                  {isResolving ? 'Executing...' : 'Confirm Human Verdict'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
