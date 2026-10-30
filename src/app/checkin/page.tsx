'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { Reservation } from '@/lib/store';

export default function CheckInPage() {
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [activeReservation, setActiveReservation] = useState<Reservation | null>(null);
    const [photoUploaded, setPhotoUploaded] = useState(false);
    const [notes, setNotes] = useState('');
    const [step, setStep] = useState<'scan' | 'checklist' | 'success'>('scan');

    useEffect(() => {
        const saved = localStorage.getItem('labloop_reservations');
        if (saved) {
            const parsed = JSON.parse(saved) as Reservation[];
            setReservations(parsed);
            // Automatically grab the first confirmed booking to simulate the flow
            const confirmed = parsed.find(r => r.status === 'confirmed');
            if (confirmed) {
                setActiveReservation(confirmed);
            }
        }
    }, []);

    const handleSimulateScan = () => {
        if (!activeReservation) return;
        setStep('checklist');
    };

    const handleCompleteCheckIn = () => {
        if (!activeReservation) return;

        // Simulate audit entry update
        const auditLog = JSON.parse(localStorage.getItem('labloop_audit') || '[]');
        auditLog.unshift({
            id: `audit-${Date.now()}`,
            timestamp: new Date().toISOString(),
            actor: 'Verified User',
            action: 'CHECK-IN',
            target: activeReservation.resourceName,
            details: `Checked in. Asset condition recorded as: ${notes || 'Good'}. Photo proof submitted.`
        });
        localStorage.setItem('labloop_audit', JSON.stringify(auditLog));

        // Update reservation status to in-use
        const updated = reservations.map(r => {
            if (r.id === activeReservation.id) {
                return { ...r, status: 'in-use' };
            }
            return r;
        });
        localStorage.setItem('labloop_reservations', JSON.stringify(updated));
        setStep('success');
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100">
            <Navbar />
            <main className="max-w-4xl mx-auto px-4 py-12">
                <h1 className="text-3xl font-bold text-white mb-2">QR Asset Access Activation</h1>
                <p className="text-gray-400 mb-8">Scan equipment to safely check in and check out assets.</p>

                <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 max-w-md mx-auto text-center">
                    {step === 'scan' && (
                        <div className="space-y-6">
                            <div className="mx-auto w-48 h-48 border-4 border-dashed border-gray-600 rounded-lg flex items-center justify-center bg-gray-900">
                                <span className="text-gray-400 text-sm">[ Simulated Camera View ]</span>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white">Ready to Scan Machine QR Code</h3>
                                <p className="text-sm text-gray-400 mt-1">Point your camera at the visual badge mounted on the hardware asset.</p>
                            </div>
                            <button
                                onClick={handleSimulateScan}
                                disabled={!activeReservation}
                                className={`w-full py-3 rounded-lg font-semibold transition ${activeReservation ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                    }`}
                            >
                                {activeReservation ? 'Simulate Scan Event' : 'No Approved Bookings to Scan'}
                            </button>
                        </div>
                    )}

                    {step === 'checklist' && (
                        <div className="space-y-6 text-left">
                            <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">Institutional Safety Check & Condition Baseline</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">1. Photo proof of safe equipment state</label>
                                    <button
                                        onClick={() => setPhotoUploaded(true)}
                                        className={`w-full py-2 px-4 rounded border text-sm transition ${photoUploaded ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20' : 'border-gray-600 text-gray-300 hover:bg-gray-700'
                                            }`}
                                    >
                                        {photoUploaded ? '✓ Photo Captured & Uploaded' : 'Capture Asset Photo'}
                                    </button>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">2. Condition notes</label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Describe any existing damage or status abnormalities..."
                                        className="w-full bg-gray-900 rounded-lg border border-gray-700 p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        rows={3}
                                    />
                                </div>
                            </div>
                            <button
                                onClick={handleCompleteCheckIn}
                                disabled={!photoUploaded}
                                className={`w-full py-3 rounded-lg font-semibold transition ${photoUploaded ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                    }`}
                            >
                                Complete Hardware Activation
                            </button>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="space-y-6">
                            <div className="w-16 h-16 bg-emerald-900/50 text-emerald-400 border border-emerald-800 rounded-full flex items-center justify-center mx-auto text-3xl font-bold">
                                ✓
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">Activation Approved</h3>
                                <p className="text-sm text-gray-400 mt-2">
                                    Session initiated. All updates and condition audits have been written to the ledger.
                                </p>
                            </div>
                            <a
                                href="/"
                                className="block w-full py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition text-center"
                            >
                                Return to Dashboard
                            </a>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}