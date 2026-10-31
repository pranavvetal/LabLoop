// ============================================================
// LabLoop Enterprise — User Profile & Certificate Verification
// ============================================================

"use client";

import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { useAppContext } from '@/lib/context';
import { createCertificate } from '@/lib/db';
import { Certificate } from '@/lib/types';

export default function ProfilePage() {
  const {
    currentUser,
    userBadges,
    certificates,
    badges,
    refreshDB,
    logAudit,
    isMounted,
  } = useAppContext();

  const [certName, setCertName] = useState('');
  const [selectedBadgeId, setSelectedBadgeId] = useState('');
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Filter user's specific items
  const myBadges = userBadges.filter((ub) => ub.user_id === currentUser?.id);
  const myCertificates = certificates.filter((c) => c.user_id === currentUser?.id);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setUploadError('File size exceeds 2MB limit. Please upload a smaller PDF or image.');
      return;
    }

    setFileName(file.name);
    setCertName(file.name.replace(/\.[^/.]+$/, ''));
    setUploadError(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      setFileBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !fileBase64) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const newCert: Certificate = {
        id: `cert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        user_id: currentUser.id,
        name: `${certName || 'Safety Certificate'} (${fileName})`,
        file_url: fileBase64,
        status: 'pending',
        created_at: new Date().toISOString(),
      };

      createCertificate(newCert);

      await logAudit(
        'CERTIFICATE_SUBMITTED',
        'certificate',
        newCert.id,
        `User ${currentUser.full_name} submitted "${newCert.name}" for manager verification.`,
        { certificate_id: newCert.id, file_name: fileName }
      );

      refreshDB();
      setUploadSuccess(true);
      setFileBase64(null);
      setFileName('');
      setCertName('');
      setTimeout(() => setUploadSuccess(false), 4000);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to submit certificate.');
    } finally {
      setIsUploading(false);
    }
  };

  if (!isMounted || !currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-1">
        {/* Profile Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <img
                src={
                  currentUser.avatar_url ||
                  currentUser.avatar ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
                }
                alt={currentUser.full_name}
                className="w-16 h-16 rounded-2xl object-cover ring-4 ring-indigo-500/10"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                    {currentUser.full_name}
                  </h1>
                  <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border border-indigo-200">
                    {currentUser.role}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">{currentUser.email}</p>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">Account ID: {currentUser.id}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-200 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Trust Tier
                </span>
                <span className="text-lg font-black text-emerald-600">
                  Tier {currentUser.trust_tier}
                </span>
              </div>
              <div className="bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-200 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Fair-Share Score
                </span>
                <span className="text-lg font-black text-indigo-700">
                  {currentUser.fair_share_score} pts
                </span>
              </div>
              <div className="bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-200 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Credits Balance
                </span>
                <span className="text-lg font-black text-amber-600">
                  {currentUser.credits}
                </span>
              </div>
            </div>
          </div>

          {/* Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 text-xs">
            <div className="bg-indigo-50/50 p-3.5 rounded-2xl border border-indigo-100">
              <span className="text-slate-500 block">Weekly Usage</span>
              <span className="text-sm font-bold text-indigo-950 mt-1 block">
                {currentUser.weekly_booked_hours} / 30 hrs
              </span>
            </div>
            <div className="bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-100">
              <span className="text-slate-500 block">On-Time Returns</span>
              <span className="text-sm font-bold text-emerald-950 mt-1 block">
                {currentUser.on_time_returns} sessions
              </span>
            </div>
            <div className="bg-cyan-50/50 p-3.5 rounded-2xl border border-cyan-100">
              <span className="text-slate-500 block">Clean Condition Logs</span>
              <span className="text-sm font-bold text-cyan-950 mt-1 block">
                {currentUser.clean_condition_reports} verified
              </span>
            </div>
            <div className="bg-rose-50/50 p-3.5 rounded-2xl border border-rose-100">
              <span className="text-slate-500 block">Open Incidents</span>
              <span className="text-sm font-bold text-rose-950 mt-1 block">
                {currentUser.open_incidents} active
              </span>
            </div>
          </div>
        </div>

        {/* Badges & Qualifications Section */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Active Verified Badges */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
            <h2 className="text-sm font-black text-slate-900 pb-3 border-b border-slate-100 flex items-center justify-between">
              <span>Verified Campus Badges</span>
              <span className="text-xs font-semibold text-slate-400">
                {myBadges.length} Active
              </span>
            </h2>

            <div className="mt-4 space-y-3">
              {myBadges.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">
                  No verified badges yet. Submit certification documents below.
                </p>
              ) : (
                myBadges.map((ub) => {
                  const bInfo = badges.find((b) => b.id === ub.badge_id);
                  return (
                    <div
                      key={ub.id}
                      className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-start justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900">
                            {bInfo?.name || ub.badge_id}
                          </span>
                          <span className="text-emerald-600 font-bold">✓</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          {bInfo?.description}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1.5">
                          Issued by {bInfo?.issued_by} • Valid until {new Date(ub.expires_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Certificate Submissions & Status */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
            <h2 className="text-sm font-black text-slate-900 pb-3 border-b border-slate-100 flex items-center justify-between">
              <span>Submitted Verification Documents</span>
              <span className="text-xs font-semibold text-slate-400">
                {myCertificates.length} Total
              </span>
            </h2>

            <div className="mt-4 space-y-3">
              {myCertificates.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">
                  No pending or past certificate submissions.
                </p>
              ) : (
                myCertificates.map((cert) => (
                  <div
                    key={cert.id}
                    className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-900 block">{cert.name}</span>
                      <span className="text-[10px] text-slate-400">
                        Submitted {new Date(cert.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        cert.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : cert.status === 'rejected'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {cert.status === 'pending' ? 'Pending Review' : cert.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Upload Certificate Section */}
        <div className="mt-8 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
          <div className="max-w-2xl">
            <h2 className="text-base font-black text-slate-900">
              Upload Safety Certification or Prerequisite Badge Proof
            </h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Upload PDF certificates or completion receipts (e.g. Laser Safety L2, Biosafety L1, Makerspace General). Documents will route to Lab Manager Marcus Lee for institutional endorsement.
            </p>
            <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full font-semibold">
              <span>ℹ</span> AI OCR assists with pre-filling metadata; final approval is always confirmed by a human manager.
            </div>

            {uploadSuccess && (
              <div className="mt-4 p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 text-xs font-semibold flex items-center gap-2">
                <span>✓</span> Certificate uploaded! It has been added to the manager verification queue.
              </div>
            )}

            {uploadError && (
              <div className="mt-4 p-3.5 bg-rose-50 border border-rose-300 rounded-2xl text-rose-900 text-xs font-semibold flex items-center gap-2">
                <span>⚠</span> {uploadError}
              </div>
            )}

            <form onSubmit={handleSubmitCertificate} className="mt-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Select Document File (PDF, PNG, JPG under 2MB)
                </label>
                <input
                  type="file"
                  required
                  accept=".pdf,image/*"
                  onChange={handleFileUpload}
                  className="block w-full text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer border border-slate-200 rounded-2xl p-2 bg-slate-50"
                />
              </div>

              {fileName && (
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Certification Title / Course Name
                  </label>
                  <input
                    type="text"
                    required
                    value={certName}
                    onChange={(e) => setCertName(e.target.value)}
                    placeholder="e.g. Advanced Laser Safety Protocol L2"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isUploading || !fileBase64}
                className={`py-3 px-6 rounded-xl font-bold text-xs uppercase tracking-wider transition ${
                  fileBase64 && !isUploading
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {isUploading ? 'Uploading & Digitizing...' : 'Submit to Manager Queue for Verification'}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
