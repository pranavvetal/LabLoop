// ============================================================
// LabLoop Enterprise — Printable Hardware QR Placard
// ============================================================

"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppContext } from '@/lib/context';
import { generateResourceToken, generateQRCodeDataURL } from '@/lib/qr';

export default function ResourceQRPlacardPage() {
  const params = useParams();
  const router = useRouter();
  const resourceId = params?.id as string;

  const { resources, isMounted } = useAppContext();
  const resource = resources.find((r) => r.id === resourceId) || resources[0];

  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    if (resource) {
      const token = generateResourceToken(resource.id);
      generateQRCodeDataURL(token).then((dataUrl) => {
        setQrDataUrl(dataUrl);
      });
    }
  }, [resource]);

  if (!isMounted || !resource) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 print:p-0 print:bg-white font-sans">
      {/* Screen-Only Controls */}
      <div className="w-full max-w-md flex justify-between items-center mb-6 print:hidden">
        <button
          onClick={() => router.push(`/resources/${resource.id}`)}
          className="text-xs font-bold text-slate-600 hover:text-slate-900"
        >
          ← Back to Resource
        </button>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl text-xs hover:bg-indigo-700 shadow-sm transition"
        >
          🖨 Print Placard
        </button>
      </div>

      {/* Printable Asset Badge Card */}
      <div className="bg-white rounded-3xl border-2 border-slate-900 p-8 max-w-md w-full shadow-2xl print:shadow-none print:border-4 print:max-w-full text-center">
        {/* Header */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-slate-900 text-white font-black text-base flex items-center justify-center">
            L
          </div>
          <span className="text-xl font-black text-slate-900 tracking-tight">LabLoop Enterprise</span>
        </div>

        <div className="bg-slate-900 text-white py-1 px-4 rounded-full text-[10px] font-bold uppercase tracking-widest inline-block mb-4">
          Official Equipment Access Placard
        </div>

        <h1 className="text-2xl font-black text-slate-900 leading-tight">
          {resource.name}
        </h1>
        <p className="text-xs font-semibold text-slate-600 mt-1">
          {resource.location}
        </p>

        {/* QR Code Container */}
        <div className="my-6 p-4 border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50 inline-block">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={`Access QR Code for ${resource.name}`}
              className="w-56 h-56 mx-auto object-contain"
            />
          ) : (
            <div className="w-56 h-56 flex items-center justify-center text-xs text-slate-400">
              Generating Placard QR...
            </div>
          )}
          <span className="text-[11px] font-mono text-slate-500 font-bold block mt-2">
            ID: {resource.id}
          </span>
        </div>

        {/* Scan Instructions */}
        <div className="text-left text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
          <p className="font-bold text-slate-900">How to Activate this Hardware:</p>
          <ol className="list-decimal list-inside space-y-1 text-slate-600 text-[11px] leading-relaxed">
            <li>Ensure you have a confirmed reservation via LabLoop.</li>
            <li>Open <strong>LabLoop &gt; Check-in</strong> on your phone.</li>
            <li>Scan this visual placard code to begin pre-inspection.</li>
            <li>Upload pre-use safety condition photo to unlock power.</li>
          </ol>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400">
          <span>Campus Safety Compliance Verified</span>
          <span>SHA-256 Ledger Linked</span>
        </div>
      </div>
    </div>
  );
}
