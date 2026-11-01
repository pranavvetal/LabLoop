// ============================================================
// LabLoop Enterprise — Discovery & Equipment Catalog
// ============================================================

"use client";

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { useAppContext } from '@/lib/context';
import { Resource, ResourceCategory } from '@/lib/types';
import { checkEligibility } from '@/lib/eligibility';

export default function DiscoveryPage() {
  const router = useRouter();
  const { resources, currentUser, isMounted } = useAppContext();

  // Filters & Sorting state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState('');
  const [eligibleOnly, setEligibleOnly] = useState(false);
  const [maxPrice, setMaxPrice] = useState<number>(100000);
  const [sortBy, setSortBy] = useState<'relevance' | 'price_asc' | 'price_desc' | 'soonest'>('relevance');

  // Filtered & Sorted Resources
  const filteredResources = useMemo(() => {
    return resources
      .filter((res) => {
        // Search matches name, description, location
        const searchMatches =
          !searchTerm ||
          res.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          res.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          res.location.toLowerCase().includes(searchTerm.toLowerCase());

        // Category filter
        const categoryMatches =
          selectedCategory === 'all' || res.category === selectedCategory;

        // Location filter
        const locationMatches =
          !locationFilter ||
          res.location.toLowerCase().includes(locationFilter.toLowerCase());

        // Price filter
        const priceMatches = res.hourly_rate <= maxPrice;

        // Eligibility filter
        const eligibility = checkEligibility(currentUser, res);
        const eligibilityMatches = !eligibleOnly || eligibility.isEligible;

        return searchMatches && categoryMatches && locationMatches && priceMatches && eligibilityMatches;
      })
      .sort((a, b) => {
        if (sortBy === 'price_asc') return a.hourly_rate - b.hourly_rate;
        if (sortBy === 'price_desc') return b.hourly_rate - a.hourly_rate;
        if (sortBy === 'soonest') {
          // Put available equipment first
          if (a.status === 'available' && b.status !== 'available') return -1;
          if (a.status !== 'available' && b.status === 'available') return 1;
        }
        return 0; // default relevance
      });
  }, [resources, searchTerm, selectedCategory, locationFilter, eligibleOnly, maxPrice, sortBy, currentUser]);

  const categories = [
    { id: 'all', label: 'All Equipment' },
    { id: 'equipment', label: 'Fabricators & Tools' },
    { id: 'lab_space', label: 'Lab Space & Benches' },
    { id: 'instrument', label: 'Analytical Instruments' },
    { id: 'device', label: 'Electronics & Testing' },
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

      {/* Hero Banner */}
      <header className="bg-gradient-to-b from-indigo-900 via-indigo-950 to-slate-900 text-white py-12 px-4 sm:px-6 lg:px-8 border-b border-indigo-950/60 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 px-3 py-1 rounded-full text-xs font-semibold mb-3">
                <span>Campus Equipment & Lab Network</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Real-Time Availability</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                Discover Verified Research Assets
              </h1>
              <p className="mt-2 text-sm sm:text-base text-indigo-200 max-w-2xl leading-relaxed">
                Check instant badge eligibility, transparent waitlists, and reserve calibrated hardware with zero gatekeeping.
              </p>
            </div>

            {/* User Quick Standing Widget */}
            {currentUser && (
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 text-xs space-y-2 min-w-[240px]">
                <div className="flex justify-between items-center">
                  <span className="text-indigo-200">Logged in as</span>
                  <span className="font-bold text-white">{currentUser.full_name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-indigo-200">Trust Tier</span>
                  <span className="font-bold text-emerald-400">Tier {currentUser.trust_tier}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-indigo-200">Fair-Share Score</span>
                  <span className="font-bold text-indigo-300">{currentUser.fair_share_score} pts</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-indigo-200">Credits Balance</span>
                  <span className="font-bold text-amber-300">{currentUser.credits} credits</span>
                </div>
              </div>
            )}
          </div>

          {/* Search Bar */}
          <div className="mt-8 relative max-w-3xl">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search by equipment name, keywords (e.g. laser, incubator, 3D printer), or building..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 bg-white text-slate-900 rounded-2xl text-sm font-medium placeholder-slate-400 shadow-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
        </div>
      </header>

      {/* Main Content & Filters */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Secondary Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs mt-3 mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-center text-xs">
          {/* Eligible-Only Filter */}
          <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
            <input
              type="checkbox"
              checked={eligibleOnly}
              onChange={(e) => setEligibleOnly(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
            />
            <span>Show Only Eligible for Me</span>
          </label>

          {/* Location Input */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-500">Location:</span>
            <input
              type="text"
              placeholder="e.g. Engineering, Bio"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 flex-1 focus:outline-none"
            />
          </div>

          {/* Price Range Slider */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-500 whitespace-nowrap">Max Rate:</span>
            <input
              type="range"
              min={0}
              max={10000}
              step={100}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
            <span className="font-bold text-indigo-900 w-12 text-right">₹{maxPrice}/hr</span>
          </div>

          {/* Sort By Select */}
          <div className="flex items-center justify-end gap-2">
            <span className="font-semibold text-slate-500">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-800 font-medium focus:outline-none cursor-pointer"
            >
              <option value="relevance">Recommended</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="soonest">Soonest Available</option>
            </select>
          </div>
        </div>

        {/* Results Counter */}
        <div className="flex justify-between items-center mb-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Displaying {filteredResources.length} of {resources.length} campus assets
          </p>
        </div>

        {/* Equipment Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResources.map((res) => {
            const eligibility = checkEligibility(currentUser, res);

            return (
              <div
                key={res.id}
                onClick={() => router.push(`/resources/${res.id}`)}
                className="group bg-white rounded-3xl border border-slate-200/90 overflow-hidden hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-300 transition-all duration-200 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  {/* Photo & Badges */}
                  <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
                    <img
                      src={
                        res.image_url ||
                        res.image ||
                        res.baselinePhotoUrl ||
                        'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800'
                      }
                      alt={res.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                      <span className="bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/20 uppercase tracking-wider">
                        {res.category.replace('_', ' ')}
                      </span>
                      {res.status !== 'available' && (
                        <span className="bg-rose-900/80 backdrop-blur-md text-rose-200 text-[10px] font-bold px-2.5 py-1 rounded-full border border-rose-500/30 uppercase">
                          {res.status}
                        </span>
                      )}
                    </div>

                    {/* Pre-flight Eligibility Indicator */}
                    <div className="absolute top-3 right-3">
                      {eligibility.isEligible ? (
                        <span className="bg-emerald-600/90 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-400 flex items-center gap-1 shadow-md">
                          <span>✓</span> Eligible
                        </span>
                      ) : eligibility.hasPending ? (
                        <span className="bg-amber-600/90 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full border border-amber-400 flex items-center gap-1 shadow-md">
                          <span>⏳</span> Verification Pending
                        </span>
                      ) : (
                        <span className="bg-slate-900/80 backdrop-blur-md text-slate-300 text-[10px] font-bold px-2.5 py-1 rounded-full border border-slate-700 flex items-center gap-1 shadow-md">
                          <span>⚠</span> Prerequisites Needed
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body Details */}
                  <div className="p-5">
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition leading-snug">
                      {res.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {res.location}
                    </p>

                    <p className="text-xs text-slate-600 mt-3 line-clamp-2 leading-relaxed">
                      {res.description}
                    </p>

                    {/* Requirements Tags */}
                    <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-1.5 text-[10px]">
                      {res.min_trust_tier > 0 && (
                        <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-semibold border border-indigo-100">
                          Tier {res.min_trust_tier}+
                        </span>
                      )}
                      {res.requires_supervisor && (
                        <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md font-semibold border border-amber-200">
                          Supervisor Required
                        </span>
                      )}
                      {res.max_booking_hours && (
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">
                          Max {res.max_booking_hours}h / booking
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Pricing & CTA */}
                <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-base font-black text-slate-900">
                      ₹{res.hourly_rate}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium"> / hour</span>
                    {res.deposit_amount > 0 && (
                      <span className="text-[10px] text-slate-400 block">
                        +₹{res.deposit_amount} credit hold
                      </span>
                    )}
                  </div>

                  <span className="text-xs font-bold text-indigo-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                    Inspect & Book →
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {filteredResources.length === 0 && (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center my-8">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3 text-xl font-bold">
              ?
            </div>
            <h3 className="text-base font-bold text-slate-800">No matching equipment found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Try relaxing your filters or clearing search terms to explore available campus instruments.
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
                setLocationFilter('');
                setEligibleOnly(false);
                setMaxPrice(100);
              }}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition"
            >
              Reset Filters
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
