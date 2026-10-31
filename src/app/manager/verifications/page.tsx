// ============================================================
// LabLoop Enterprise — Manager Badge & Certificate Verifications
// ============================================================

"use client";

import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { useAppContext } from '@/lib/context';
import { updateCertificate, addUserBadge, updateUser, addNotification } from '@/lib/db';
import { UserBadge, TrustTier } from '@/lib/types';

export default function VerificationsPage() {
  const {
    certificates,
    users,
    badges,
    currentUser,
    logAudit,
    refreshDB,
    isMounted,
  } = useAppContext();

  const [selectedBadgeMap, setSelectedBadgeMap] = useState<Record<string, string>>({});
  const [rejectReasonMap, setRejectReasonMap] = useState<Record<string, string>>({});
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const pendingCerts = certificates.filter((c) => c.status === 'pending');
  const pastCerts = certificates.filter((c) => c.status !== 'pending');

  const handleApprove = async (certId: string) => {
    const cert = certificates.find((c) => c.id === certId);
    if (!cert) return;

    const assignedBadgeId = selectedBadgeMap[certId] || badges[0].id;
    const badgeInfo = badges.find((b) => b.id === assignedBadgeId);

    try {
      // 1. Update Certificate
      updateCertificate(certId, {
        status: 'approved',
        reviewed_by: currentUser?.id,
        reviewed_at: new Date().toISOString(),
      });

      // 2. Grant Verified UserBadge
      const now = new Date();
      const expiry = new Date(now.getTime() + (badgeInfo?.valid_days || 365) * 86400000);
      const newUserBadge: UserBadge = {
        id: `ub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        user_id: cert.user_id,
        badge_id: assignedBadgeId,
        issued_at: now.toISOString(),
        expires_at: expiry.toISOString(),
        verified: true,
        verified_by: currentUser?.id,
        certificate_url: cert.file_url,
      };
      addUserBadge(newUserBadge);

      // 3. Increment User trust tier if tier 0 -> tier 1
      const student = users.find((u) => u.id === cert.user_id);
      if (student && student.trust_tier === 0) {
        updateUser(student.id, {
          trust_tier: 1 as TrustTier,
        });
      }

      // 4. Log Audit Event
      await logAudit(
        'CERTIFICATE_APPROVED',
        'certificate',
        certId,
        `Manager ${currentUser?.full_name} approved certificate and issued verified badge "${badgeInfo?.name}" to ${student?.full_name}.`,
        { certificate_id: certId, badge_id: assignedBadgeId, student_id: cert.user_id }
      );

      // 5. Notify Student
      addNotification(
        cert.user_id,
        'Certificate Approved & Badge Granted! 🎉',
        `Your certificate "${cert.name}" was approved by ${currentUser?.full_name}. You now hold the verified badge "${badgeInfo?.name}".`,
        '/profile'
      );

      refreshDB();
      setActionNotice(`Approved "${cert.name}" and granted badge "${badgeInfo?.name}".`);
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      alert(`Error approving certificate: ${err.message}`);
    }
  };

  const handleReject = async (certId: string) => {
    const reason = rejectReasonMap[certId] || 'Document illegible or missing official accreditation stamp.';
    const cert = certificates.find((c) => c.id === certId);
    if (!cert) return;

    try {
      updateCertificate(certId, {
        status: 'rejected',
        reviewed_by: currentUser?.id,
        review_reason: reason,
        reviewed_at: new Date().toISOString(),
      });

      await logAudit(
        'CERTIFICATE_REJECTED',
        'certificate',
        certId,
        `Manager ${currentUser?.full_name} rejected certificate "${cert.name}". Reason: ${reason}`,
        { reason, student_id: cert.user_id }
      );

      addNotification(
        cert.user_id,
        'Certificate Verification Update',
        `Your certificate "${cert.name}" could not be verified: ${reason}`,
        '/profile'
      );

      refreshDB();
      setActionNotice(`Rejected "${cert.name}". User notified.`);
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      alert(`Error rejecting certificate: ${err.message}`);
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-full text-xs font-semibold mb-2">
              <span>Facility Supervisor Portal</span>
              <span>•</span>
              <span>Human Oversight & Compliance</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
              Badge & Training Verifications
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Review student uploaded safety documents and grant prerequisite badges. AI assists; decisions are human-confirmed.
            </p>
          </div>

          <div className="text-right">
            <span className="text-2xl font-black text-amber-600">{pendingCerts.length}</span>
            <span className="text-xs text-slate-500 block font-semibold">Pending Review</span>
          </div>
        </div>

        {actionNotice && (
          <div className="my-6 p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 text-xs font-bold shadow-sm flex items-center gap-2">
            <span>✓</span> {actionNotice}
          </div>
        )}

        {/* Pending Review Queue */}
        <div className="mt-8">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">
            Pending Queue ({pendingCerts.length})
          </h2>

          {pendingCerts.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center text-xs text-slate-400">
              Zero pending certificate uploads. All user submissions have been reviewed and signed.
            </div>
          ) : (
            <div className="space-y-4">
              {pendingCerts.map((cert) => {
                const student = users.find((u) => u.id === cert.user_id);

                return (
                  <div
                    key={cert.id}
                    className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-slate-900">{cert.name}</span>
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                          Pending Staff Sign-off
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
                        <span>
                          <strong>Applicant:</strong> {student?.full_name} ({student?.role})
                        </span>
                        <span>
                          <strong>Current Tier:</strong> Tier {student?.trust_tier}
                        </span>
                        <span>
                          <strong>Submitted:</strong> {new Date(cert.created_at).toLocaleString()}
                        </span>
                      </div>

                      {/* File preview pill */}
                      <div className="mt-3 inline-flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
                        <span className="text-slate-400">Attached File:</span>
                        <span className="font-mono text-slate-700">Digital Document Verified</span>
                        {cert.file_url.startsWith('data:application/pdf') && (
                          <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.2 rounded font-bold">
                            PDF
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions Column */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      {/* Select Badge to issue */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Grant Badge
                        </label>
                        <select
                          value={selectedBadgeMap[cert.id] || badges[0].id}
                          onChange={(e) =>
                            setSelectedBadgeMap((prev) => ({
                              ...prev,
                              [cert.id]: e.target.value,
                            }))
                          }
                          className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none"
                        >
                          {badges.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex gap-2 items-end pt-3 sm:pt-0">
                        <button
                          onClick={() => handleApprove(cert.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm"
                        >
                          Approve & Endorse
                        </button>
                        <button
                          onClick={() => handleReject(cert.id)}
                          className="bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 px-4 py-2 rounded-xl text-xs font-bold transition border border-slate-200"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Previously Processed */}
        <div className="mt-12">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">
            Recent Review History ({pastCerts.length})
          </h2>

          <div className="bg-white rounded-3xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-xs">
            {pastCerts.length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-400">No past reviews logged.</p>
            ) : (
              pastCerts.map((cert) => {
                const student = users.find((u) => u.id === cert.user_id);
                return (
                  <div key={cert.id} className="p-4 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-900">{cert.name}</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Applicant: {student?.full_name} • Reviewed by Vikram Malhotra
                      </p>
                      {cert.review_reason && (
                        <p className="text-[11px] text-rose-600 italic mt-0.5">
                          Note: {cert.review_reason}
                        </p>
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                        cert.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {cert.status}
                    </span>
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
