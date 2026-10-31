'use client';

import React, { useState } from 'react';
import { initialStore, User, getBookingCountForUser } from '../../../lib/store';
import { Navbar } from '../../../components/Navbar';

export default function ResourceDetailBookingPage() {
  const [store, setStore] = useState(initialStore);
  const [currentPath, setCurrentPath] = useState('/resources/res-1');

  const [resource, setResource] = useState(() => {
    // In a real app we'd use useParams, but for mock routing, just pick first or match ID
    const resourceId = 'res-1'; // fallback
    return store.resources.find(r => r.id === resourceId) || store.resources[0];
  });

  const [hasSafetyTraining, setHasSafetyTraining] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const [bookingDate, setBookingDate] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('12:00');
  const [purpose, setPurpose] = useState('');
  const [successToast, setSuccessToast] = useState(false);

  const handleSwitchUser = (user: User) => {
    setStore((prev: any) => ({ ...prev, currentUser: { ...prev.currentUser, ...user } }));
  };

  const handleNavigate = (path: string) => {
    setCurrentPath(path);
  };

  const handleSimulateOCRUpload = () => {
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      setHasSafetyTraining(true);
      setUploadSuccess(true);
    }, 1200);
  };

  const handleSubmitBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasSafetyTraining) return;

    const newReservation = {
      id: `resv-${Date.now()}`,
      resourceId: resource.id,
      userId: store.currentUser.id,
      startTime: `${bookingDate}T${startTime}:00.000Z`,
      endTime: `${bookingDate}T${endTime}:00.000Z`,
      status: 'confirmed' as const, // stored with pending/confirmed flow
      purpose: purpose || 'Prototyping session',
    };

    setStore((prev: any) => ({
      ...prev,
      reservations: [newReservation, ...prev.reservations],
    }));

    setSuccessToast(true);
    setTimeout(() => {
      setSuccessToast(false);
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Navbar
        currentUser={store.currentUser}
        onSwitchUser={handleSwitchUser}
        currentPath={currentPath}
        onNavigate={handleNavigate}
      />

      {successToast && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-600 text-white px-6 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="font-medium text-sm">Booking request successfully submitted! Redirecting...</span>
        </div>
      )}

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Link */}
        <button
          onClick={() => handleNavigate('/')}
          className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800 mb-6"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Equipment Catalog
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Resource Details & Qualification Card */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="h-56 relative bg-gray-100">
                <img
                  src={resource.image || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600'}
                  alt={resource.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 right-3">
                  <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full text-xs font-semibold">
                    {resource.status}
                  </span>
                </div>
              </div>
              <div className="p-6">
                <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">{resource.type}</span>
                <h1 className="text-xl font-bold text-gray-900 mt-1 mb-2">{resource.name}</h1>
                <p className="text-xs text-gray-500 mb-4 flex items-center gap-1">
                  📍 {resource.location}
                </p>
                <p className="text-sm text-gray-600 mb-6">{resource.description}</p>

                {/* Specs */}
                <div className="border-t border-gray-100 pt-4 space-y-2 text-xs">
                  <h4 className="font-bold text-gray-900 uppercase tracking-wider">Specifications</h4>
                  {Object.entries(resource.specs || {}).map(([key, val]) => (
                    <div key={key} className="flex justify-between py-1 border-b border-gray-50">
                      <span className="text-gray-500">{key}:</span>
                      <span className="font-medium text-gray-800">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Safety Training Verification Box */}
            <div className={`rounded-2xl p-6 border shadow-sm ${hasSafetyTraining ? 'bg-emerald-50/50 border-emerald-200' : 'bg-amber-50/50 border-amber-200'}`}>
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${hasSafetyTraining ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {hasSafetyTraining ? '✓' : '!'}
                </div>
                <div>
                  <h3 className={`font-bold text-sm ${hasSafetyTraining ? 'text-emerald-900' : 'text-amber-900'}`}>
                    Required Qualification: Safety Training
                  </h3>
                  <p className={`text-xs mt-1 ${hasSafetyTraining ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {hasSafetyTraining
                      ? 'Safety certificate successfully verified via OCR.'
                      : 'Upload your safety training completion certificate (PDF) to unlock booking privileges.'}
                  </p>

                  {!hasSafetyTraining && (
                    <div className="mt-4">
                      <button
                        type="button"
                        disabled={isUploading}
                        onClick={handleSimulateOCRUpload}
                        className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2"
                      >
                        {isUploading ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Verifying Certificate via OCR...</span>
                          </>
                        ) : (
                          <span>Upload Safety Certificate (Simulate OCR)</span>
                        )}
                      </button>
                    </div>
                  )}

                  {uploadSuccess && (
                    <p className="text-[11px] text-emerald-600 font-semibold mt-2">
                      🎉 Certificate validated! Safety training clearance granted.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Booking Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Request Reservation</h2>

              {!hasSafetyTraining && (
                <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Safety training certification required before submitting a booking request. Please complete verification on the left.</span>
                </div>
              )}

              <form onSubmit={handleSubmitBooking} className="space-y-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                    Booking Date
                  </label>
                  <input
                    type="date"
                    required
                    disabled={!hasSafetyTraining}
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                      Start Time
                    </label>
                    <input
                      type="time"
                      required
                      disabled={!hasSafetyTraining}
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                      End Time
                    </label>
                    <input
                      type="time"
                      required
                      disabled={!hasSafetyTraining}
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                    Project Purpose & Material Notes
                  </label>
                  <textarea
                    rows={4}
                    required
                    disabled={!hasSafetyTraining}
                    placeholder="Describe your project, exact materials (e.g., 3mm cast acrylic), and safety precautions..."
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                  />
                </div>

                <div className="bg-indigo-50/60 p-4 rounded-xl border border-indigo-100 flex items-center justify-between text-sm">
                  <span className="text-gray-600 font-medium">Rate ({resource.hourlyRate ? `$${resource.hourlyRate}/hr` : 'Free'})</span>
                  <span className="font-bold text-indigo-900 text-base">
                    ${resource.hourlyRate ? (resource.hourlyRate * 2).toFixed(2) : '0.00'}
                  </span>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="submit"
                    disabled={!hasSafetyTraining}
                    className={`px-8 py-3 rounded-xl text-sm font-semibold shadow-md transition-all ${
                      hasSafetyTraining
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-500/20'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Submit Booking Request (Pending Approval)
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
