'use client';

// Cleaned up imports: we only need React hooks, useRouter, Navbar, typings, and the store context.
import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Resource, Reservation, User, getBookingCountForUser } from '@/lib/store';
import { useStore } from '@/lib/context';

export default function DiscoveryDashboard() {
  const router = useRouter();

    const { currentUser, setCurrentUser, resources, reservations, setReservations, dailyQuota, userBookingsToday, isQuotaReached, addAuditLog } = useStore();




  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [eligibleOnly, setEligibleOnly] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Removed duplicate reservations state and related effects – using store's reservations and derived values
// const [reservations, setReservations] = useState<Reservation[]>([]);
// 
// // Initialize data from localStorage (handled in StoreProvider)
// useEffect(() => {
//   const savedUser = localStorage.getItem('labloop_user');
//   if (savedUser) {
//     setCurrentUser(JSON.parse(savedUser));
//   }
// 
//   const savedReservations = localStorage.getItem('labloop_reservations');
//   if (savedReservations) {
//     setReservations(JSON.parse(savedReservations));
//   } else {
//     setReservations(initialStore.reservations);
//     localStorage.setItem('labloop_reservations', JSON.stringify(initialStore.reservations));
//   }
// }, []);

// // Persist reservations (handled in StoreProvider)
// useEffect(() => {
//   localStorage.setItem('labloop_reservations', JSON.stringify(reservations));
// }, [reservations]);

// // Derived state – already provided by StoreProvider
// // const dailyQuota = 2;
// // const userBookingsToday = useMemo(() =>
// //   getBookingCountForUser(currentUser.id, reservations),
// //   [currentUser.id, reservations]
// // );
// // const isQuotaReached = userBookingsToday >= dailyQuota;
  



  // Derived State


  const filteredResources = useMemo(() => {
    return resources.filter(res => {
      const matchesSearch = res.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            res.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            res.location.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = categoryFilter === 'All' || res.category === categoryFilter;

      const matchesEligibility = !eligibleOnly ||
                                (res.requiredQualification === 'None' || Boolean(currentUser?.hasSafetyTraining));

      return matchesSearch && matchesCategory && matchesEligibility;
    });
  }, [resources, searchTerm, categoryFilter, eligibleOnly, currentUser?.hasSafetyTraining]);

  // Handlers
  const handleSwitchUser = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('labloop_user', JSON.stringify(user));
  };

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  const openBookingModal = (resource: Resource) => {
    setSelectedResource(resource);
    setIsBookingModalOpen(true);
  };

  const handleVerify = () => {
    setIsVerifying(true);
    // Simulate OCR processing
    setTimeout(() => {
      if (currentUser) {
        const updatedUser: User = { ...currentUser, hasSafetyTraining: true };
        setCurrentUser(updatedUser);
        localStorage.setItem('labloop_user', JSON.stringify(updatedUser));
      }

      setIsVerifying(false);
      setIsVerificationModalOpen(false);

      // Log audit
      const auditLogs = JSON.parse(localStorage.getItem('labloop_audit') || '[]');
      auditLogs.unshift({
        id: `audit-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actor: currentUser?.name || currentUser?.full_name || 'User',
        action: 'VERIFICATION_SUCCESS',
        target: 'Safety Training Certificate',
        details: `OCR extracted valid certification. hasSafetyTraining set to true.`
      });
      localStorage.setItem('labloop_audit', JSON.stringify(auditLogs));
    }, 2000);
  };

  const handleBooking = (status: 'pending' | 'waitlisted') => {
    if (!selectedResource) return;

    const newReservation: Reservation = {
      id: `rev-${Date.now()}`,
      resourceId: selectedResource.id,
      resourceName: selectedResource.name,
      userId: currentUser?.id || 'guest',
      userName: currentUser?.name || (currentUser as any)?.full_name || 'User',
      startTime: new Date(Date.now() + 24 * 3600000).toISOString(),
      endTime: new Date(Date.now() + 26 * 3600000).toISOString(),
      status: status
    };

    const updatedReservations = [newReservation, ...reservations];
    setReservations(updatedReservations);

    // Log audit
    const auditLogs = JSON.parse(localStorage.getItem('labloop_audit') || '[]');
    auditLogs.unshift({
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: currentUser?.name || currentUser?.full_name || 'User',
      action: status === 'waitlisted' ? 'JOIN_WAITLIST' : 'BOOKING_REQUEST',
      target: selectedResource.name,
      details: status === 'waitlisted'
        ? `Joined waiting list due to daily quota reached.`
        : `Requested a 2-hour slot for tomorrow.`
    });
    localStorage.setItem('labloop_audit', JSON.stringify(auditLogs));

    setIsBookingModalOpen(false);
    setSelectedResource(null);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar
        currentUser={currentUser}
        onSwitchUser={handleSwitchUser}
        currentPath="/"
        onNavigate={handleNavigate}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header & Quota Info */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Resource Discovery</h1>
            <p className="text-slate-500">Find and reserve lab equipment and makerspace tools.</p>
          </div>

          {(currentUser?.role === 'student' || (currentUser?.role as string) === 'Student') && (
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Daily Quota</p>
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-bold ${isQuotaReached ? 'text-amber-600' : 'text-slate-900'}`}>
                    {userBookingsToday} / {dailyQuota}
                  </span>
                  <span className="text-xs text-slate-400">bookings used today</span>
                </div>
              </div>
              {isQuotaReached && (
                <div className="ml-2 px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold rounded uppercase">
                  Limit Reached
                </div>
              )}
            </div>
          )}
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search by name, category, or location..."
                className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-3 items-center">
              <select
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="All">All Categories</option>
                <option value="Fabricators">Fabricators</option>
                <option value="Electronics">Electronics</option>
                <option value="Imaging">Imaging</option>
                <option value="Biochemistry">Biochemistry</option>
              </select>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <div className="relative inline-flex items-center">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={eligibleOnly}
                    onChange={() => setEligibleOnly(!eligibleOnly)}
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </div>
                <span className="text-sm font-medium text-slate-600">Eligible Only</span>
              </label>
            </div>
          </div>
        </div>

        {/* Resource Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResources.length > 0 ? (filteredResources.map((res) => {
            const isQualified = res.requiredQualification === 'None' || Boolean(currentUser?.hasSafetyTraining);

            return (
              <div key={res.id} className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-200 transition-all duration-300 flex flex-col">
                <div className="relative h-48 bg-slate-100 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10" />
                  <img
                    src={res.baselinePhotoUrl || `https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&q=80&auto=format&fit=crop`}
                    alt={res.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 right-4 z-20">
                    <StatusBadge status={res.status} />
                  </div>
                  <div className="absolute bottom-4 left-4 z-20">
                    <span className="px-2 py-1 bg-white/20 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider rounded border border-white/30">
                      {res.category}
                    </span>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{res.name}</h3>
                    <div className="text-right">
                      <span className="text-lg font-bold text-indigo-600">${res.hourlyRate}</span>
                      <span className="text-[10px] font-semibold text-slate-400 block uppercase">/ hour</span>
                    </div>
                  </div>

                  <p className="text-sm text-slate-500 line-clamp-2 mb-4 leading-relaxed">
                    {res.description}
                  </p>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {res.location}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                        isQualified
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : 'bg-rose-50 text-rose-700 border-rose-100'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${isQualified ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        {isQualified ? 'Qualified' : 'Requires Certification'}
                      </div>

                      {res.requiredQualification !== 'None' && (
                        <div className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold uppercase tracking-wide">
                          {res.requiredQualification}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-auto">
                    {isQualified ? (
                      <button
                        onClick={() => openBookingModal(res)}
                        disabled={res.status === 'maintenance'}
                        className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition-all shadow-lg ${
                          res.status === 'maintenance'
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                            : isQuotaReached
                              ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20'
                        }`}
                      >
                        {res.status === 'maintenance'
                          ? 'Under Maintenance'
                          : isQuotaReached
                            ? 'Join Waiting List'
                            : 'Request Slot'}
                      </button>
                    ) : (
                      <button
                        onClick={() => setIsVerificationModalOpen(true)}
                        className="w-full py-3 px-4 bg-white border-2 border-slate-200 text-slate-600 hover:border-indigo-500 hover:text-indigo-600 rounded-xl font-bold text-sm transition-all"
                      >
                        Check Qualification
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })) : (
            <div className="col-span-full py-12 text-center">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 9.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900">No resources found</h3>
              <p className="text-slate-500">Try adjusting your filters or search terms.</p>
              <button
                onClick={() => {setSearchTerm(''); setCategoryFilter('All'); setEligibleOnly(false);}}
                className="mt-4 text-indigo-600 font-semibold hover:text-indigo-700"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Simple Booking Modal Simulation */}
      {isBookingModalOpen && selectedResource && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">
                {isQuotaReached ? 'Join Waiting List' : 'Booking Request'}
              </h2>
              <button onClick={() => setIsBookingModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="flex gap-4 mb-6">
                <img
                  src={selectedResource.baselinePhotoUrl || `https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&q=80&auto=format&fit=crop`}
                  className="w-20 h-20 rounded-xl object-cover"
                  alt=""
                />
                <div>
                  <h3 className="font-bold text-slate-900">{selectedResource.name}</h3>
                  <p className="text-xs text-slate-500 mb-1">{selectedResource.location}</p>
                  <p className="text-xs font-bold text-indigo-600">${selectedResource.hourlyRate}/hr</p>
                </div>
              </div>

              {isQuotaReached ? (
                <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl mb-6">
                  <p className="text-sm text-amber-800 leading-relaxed">
                    <strong>Quota Reached:</strong> You have already used your daily allowance of {dailyQuota} bookings. You can join the waiting list for this resource.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Select Time (Tomorrow)</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button className="py-2 px-3 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg text-sm font-bold">14:00 - 16:00</button>
                      <button className="py-2 px-3 bg-slate-50 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-100">16:00 - 18:00</button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Purpose of Use</label>
                    <textarea
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      rows={2}
                      placeholder="e.g. Prototype for MECH101 final project"
                    />
                  </div>
                </div>
              )}

              <button
                onClick={() => handleBooking(isQuotaReached ? 'waitlisted' : 'pending')}
                className={`w-full py-4 rounded-2xl font-bold transition-all shadow-lg ${
                  isQuotaReached
                    ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20'
                }`}
              >
                {isQuotaReached ? 'Confirm Waiting List' : 'Submit Request'}
              </button>
              <p className="text-[10px] text-center text-slate-400 mt-4 px-4">
                By submitting, you agree to the LabLoop Fair Access policy and resource-specific safety rules.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Verification Modal */}
      {isVerificationModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center">
            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Safety Certification</h2>
            <p className="text-sm text-slate-500 mb-6">Upload your certificate to automatically verify your eligibility for this resource.</p>
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 mb-6 hover:border-indigo-500 transition-colors cursor-pointer">
              <p className="text-sm font-semibold text-slate-400">Drag & drop or Click to upload</p>
            </div>
            <button
              onClick={handleVerify}
              disabled={isVerifying}
              className="w-full py-3 px-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition"
            >
              {isVerifying ? 'Verifying...' : 'Process Certificate'}
            </button>
            <button
              onClick={() => setIsVerificationModalOpen(false)}
              className="mt-3 text-slate-400 text-sm font-semibold hover:text-slate-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: Resource['status'] }) {
  const styles: Record<string, string> = {
    available: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    maintenance: 'bg-rose-100 text-rose-700 border-rose-200',
    retired: 'bg-slate-100 text-slate-700 border-slate-200',
    'in-use': 'bg-indigo-100 text-indigo-700 border-indigo-200',
  };

  const labels: Record<string, string> = {
    available: 'Available',
    maintenance: 'In Maintenance',
    retired: 'Retired',
    'in-use': 'In Use',
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-sm backdrop-blur-sm ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
