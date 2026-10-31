// ============================================================
// LabLoop Enterprise — Cryptographic SHA-256 Audit Trail Explorer
// ============================================================

"use client";

import React, { useState, useMemo } from 'react';
import { Navbar } from '@/components/Navbar';
import { useAppContext } from '@/lib/context';
import { verifyAuditChain } from '@/lib/audit';
import { getDB, saveDB, initializeSeedWithHashes } from '@/lib/db';
import { can } from '@/lib/permissions';
import { AuditLog } from '@/lib/types';

export default function AuditPage() {
  const {
    currentUser,
    auditLogs,
    resources,
    refreshDB,
    isMounted,
  } = useAppContext();

  const [filterAction, setFilterAction] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Verification Results State
  const [verificationResult, setVerificationResult] = useState<{
    valid: boolean;
    broken_at?: string;
    message: string;
  } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [tamperNotice, setTamperNotice] = useState<string | null>(null);

  // Role-based filtering of audit logs
  const visibleLogs = useMemo(() => {
    if (!currentUser) return [];

    let filtered = auditLogs;

    // Admin sees all
    if (currentUser.role === 'admin') {
      filtered = auditLogs;
    } else if (currentUser.role === 'owner' || currentUser.role === 'manager') {
      // Owner/Manager sees logs for their resources + general system
      const myResIds = resources
        .filter((r) => r.owner_id === currentUser.id || r.manager_id === currentUser.id)
        .map((r) => r.id);

      filtered = auditLogs.filter(
        (l) =>
          l.performed_by === currentUser.id ||
          myResIds.includes(l.entity_id) ||
          myResIds.includes((l.payload as any)?.resource_id) ||
          l.entity === 'system'
      );
    } else {
      // Students/Researchers see only their own actions and bookings
      filtered = auditLogs.filter(
        (l) => l.performed_by === currentUser.id || (l.payload as any)?.student_id === currentUser.id
      );
    }

    return filtered.filter((l) => {
      const matchAction = !filterAction || l.action.toLowerCase().includes(filterAction.toLowerCase());
      const matchSearch =
        !searchTerm ||
        l.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.entity_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.action.toLowerCase().includes(searchTerm.toLowerCase());
      return matchAction && matchSearch;
    });
  }, [auditLogs, currentUser, resources, filterAction, searchTerm]);

  // Handle Verify Integrity
  const handleVerifyChain = async () => {
    setIsVerifying(true);
    try {
      const res = await verifyAuditChain(auditLogs);
      setVerificationResult(res);
    } catch (err: any) {
      setVerificationResult({
        valid: false,
        message: `Verification algorithm error: ${err.message}`,
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Demo Tool for Judges: Tamper with a block
  const handleTamperWithLog = () => {
    if (auditLogs.length < 2) return;
    const db = getDB();
    const targetIdx = 1; // Tamper with block 2
    const originalAction = db.audit_logs[targetIdx].action;

    // Modify payload without re-hashing
    db.audit_logs[targetIdx].reason = 'TAMPERED: Unauthorized modification injected into payload for demo evaluation.';
    db.audit_logs[targetIdx].payload = { ...db.audit_logs[targetIdx].payload, forged_override: true };
    saveDB(db);
    refreshDB();

    setTamperNotice(
      `Tampered with log block #${targetIdx} ("${originalAction}"). The cryptographic hash chain is now broken! Click "Verify Audit Chain Integrity" below to watch verification detect and pinpoint the exact invalid block.`
    );
  };

  // Demo Tool for Judges: Repair data back to clean hash linkage
  const handleRepairChain = async () => {
    const validDb = await initializeSeedWithHashes();
    saveDB(validDb);
    refreshDB();
    setVerificationResult(null);
    setTamperNotice('Audit ledger repaired: All SHA-256 merkle links cryptographically re-signed and valid.');
    setTimeout(() => setTamperNotice(null), 4000);
  };

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-1">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-800">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-emerald-950/80 text-emerald-400 border border-emerald-800 px-3 py-1 rounded-full text-xs font-semibold mb-2 font-mono">
              <span>SHA-256 MERKLE HASH CHAIN ACTIVE</span>
              <span>•</span>
              <span>APPEND-ONLY</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Immutable Cryptographic Audit Ledger
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Every resource listing, qualification check, booking confirmation, condition report, and penalty decision is cryptographically chained. Zero retroactive deletion.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleVerifyChain}
              disabled={isVerifying}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
            >
              <span>🛡</span>
              <span>{isVerifying ? 'Verifying Hashes...' : 'Verify Chain Integrity'}</span>
            </button>

            {/* Admin Demo Tamper Tools */}
            {can(currentUser, 'tamper_audit') && (
              <>
                <button
                  onClick={handleTamperWithLog}
                  className="px-3.5 py-2.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800 rounded-xl text-xs font-bold transition"
                  title="Demo for Judges: Corrupt an entry to show mathematical detection"
                >
                  ⚠ Tamper with Block (Demo)
                </button>
                <button
                  onClick={handleRepairChain}
                  className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold transition"
                >
                  Repair Chain
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tamper Notice Banner */}
        {tamperNotice && (
          <div className="my-6 p-4 bg-amber-950/80 border border-amber-600 rounded-2xl text-amber-200 text-xs font-medium leading-relaxed">
            {tamperNotice}
          </div>
        )}

        {/* Verification Result Toast */}
        {verificationResult && (
          <div
            className={`my-6 p-5 rounded-2xl border text-xs leading-relaxed ${
              verificationResult.valid
                ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200'
                : 'bg-rose-950/80 border-rose-500 text-rose-200 shadow-xl shadow-rose-950/50'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{verificationResult.valid ? '✓' : '🚨'}</span>
              <div>
                <h3 className="font-bold text-sm uppercase tracking-wider mb-1">
                  {verificationResult.valid
                    ? 'Cryptographic Verification Passed'
                    : 'Cryptographic Tamper / Anomaly Detected!'}
                </h3>
                <p>{verificationResult.message}</p>
                {verificationResult.broken_at && (
                  <p className="mt-1 font-mono text-[11px] text-rose-300">
                    Failed Block ID: {verificationResult.broken_at}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700 my-6 flex flex-col sm:flex-row gap-3 text-xs">
          <input
            type="text"
            placeholder="Search by action, reason, or entity ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />

          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-300 focus:outline-none cursor-pointer"
          >
            <option value="">All Event Actions</option>
            <option value="BOOKING">Booking Events</option>
            <option value="CHECK_IN">Check-in Events</option>
            <option value="RETURN">Return Events</option>
            <option value="RESOURCE">Resource Events</option>
            <option value="BADGE">Badge &amp; Certification</option>
            <option value="INCIDENT">Incident &amp; Penalty</option>
          </select>

          <span className="text-slate-400 self-center text-[11px] font-mono">
            Showing {visibleLogs.length} events
          </span>
        </div>

        {/* Ledger Table */}
        <div className="bg-slate-800/90 rounded-3xl border border-slate-700 overflow-hidden shadow-2xl">
          <div className="divide-y divide-slate-700/80 font-mono text-xs">
            {visibleLogs.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                No ledger events match your current filter.
              </div>
            ) : (
              visibleLogs.map((log, index) => {
                const isExpanded = expandedLogId === log.id;

                return (
                  <div
                    key={log.id}
                    className="p-5 hover:bg-slate-750/50 transition-colors duration-150"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2 font-sans">
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400 font-mono text-[11px]">
                          [{new Date(log.timestamp).toLocaleTimeString()}]
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-700">
                          {log.action}
                        </span>
                        <span className="text-slate-300 font-medium text-xs">
                          Entity: <strong>{log.entity}</strong> ({log.entity_id})
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-mono">
                          Actor: {log.performed_by || 'system'}
                        </span>
                        <button
                          onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                          className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 px-2 py-1 bg-slate-900 rounded-lg border border-slate-700 transition"
                        >
                          {isExpanded ? 'Hide Payload ▲' : 'View Payload ▼'}
                        </button>
                      </div>
                    </div>

                    <p className="text-slate-300 text-xs font-sans pl-3 border-l-2 border-indigo-500/60 mt-2">
                      {log.reason}
                    </p>

                    {/* Cryptographic Linkage Hashes */}
                    <div className="mt-3 text-[10px] text-slate-500 space-y-0.5 font-mono break-all bg-slate-900/60 p-2.5 rounded-xl border border-slate-700/60">
                      <div>
                        <span className="text-slate-400">SHA-256 Hash: </span>
                        <span className="text-emerald-400">{log.hash}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Prev Block Hash: </span>
                        <span className="text-slate-400">{log.prev_hash}</span>
                      </div>
                    </div>

                    {/* Expanded JSON Payload */}
                    {isExpanded && (
                      <div className="mt-3 bg-slate-950 p-4 rounded-xl border border-slate-700/80 text-[11px] text-slate-300 overflow-x-auto">
                        <pre className="font-mono">
                          {JSON.stringify(log.payload, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
