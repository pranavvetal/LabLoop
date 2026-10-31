// ============================================================
// LabLoop Enterprise — Edit Equipment Form
// ============================================================

"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { useAppContext } from '@/lib/context';
import { Resource, ResourceCategory, TrustTier } from '@/lib/types';

export default function EditResourcePage() {
  const router = useRouter();
  const params = useParams();
  const resourceId = params?.id as string;
  const { currentUser, badges, resources, updateResource, isMounted } = useAppContext();

  // Form Fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ResourceCategory>('equipment');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [hourlyRate, setHourlyRate] = useState('15');
  const [depositAmount, setDepositAmount] = useState('50');
  const [maxPerDay, setMaxPerDay] = useState('2');
  const [maxBookingHours, setMaxBookingHours] = useState('4');
  const [operatingStart, setOperatingStart] = useState('08:00');
  const [operatingEnd, setOperatingEnd] = useState('20:00');
  const [requiredBadgeId, setRequiredBadgeId] = useState<string>('');
  const [requiresSupervisor, setRequiresSupervisor] = useState(false);
  const [minTrustTier, setMinTrustTier] = useState<TrustTier>(1);
  const [rules, setRules] = useState('');
  const [specs, setSpecs] = useState<{ key: string; value: string }[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const res = resources.find((r) => r.id === resourceId);
    if (res) {
      setName(res.name);
      setCategory(res.category);
      setDescription(res.description);
      setLocation(res.location);
      setImageUrl(res.image_url || res.image || '');
      setHourlyRate(String(res.hourly_rate));
      setDepositAmount(String(res.deposit_amount));
      setMaxPerDay(String(res.max_per_day || 2));
      setMaxBookingHours(String(res.max_booking_hours || 4));
      setOperatingStart(res.operating_hours?.start || '08:00');
      setOperatingEnd(res.operating_hours?.end || '20:00');
      setRequiredBadgeId(res.required_badge_id || '');
      setRequiresSupervisor(res.requires_supervisor || false);
      setMinTrustTier(res.min_trust_tier || 0);
      setRules(res.rules || '');

      if (res.specs) {
        setSpecs(Object.entries(res.specs).map(([key, value]) => ({ key, value: String(value) })));
      }
    }
  }, [resourceId, resources]);

  const handleAddSpec = () => {
    setSpecs([...specs, { key: '', value: '' }]);
  };

  const handleSpecChange = (index: number, field: 'key' | 'value', val: string) => {
    const updated = [...specs];
    updated[index][field] = val;
    setSpecs(updated);
  };

  const handleRemoveSpec = (index: number) => {
    setSpecs(specs.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (!name || !description || !location) {
      setError('Name, description, and location are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const specsRecord: Record<string, string> = {};
      specs.forEach((s) => {
        if (s.key.trim() && s.value.trim()) {
          specsRecord[s.key.trim()] = s.value.trim();
        }
      });

      await updateResource(resourceId, {
        name,
        category,
        description,
        location,
        image_url: imageUrl || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800',
        specs: specsRecord,
        hourly_rate: Number(hourlyRate) || 0,
        deposit_amount: Number(depositAmount) || 0,
        max_per_day: Number(maxPerDay) || 2,
        max_booking_hours: Number(maxBookingHours) || 4,
        operating_hours: { start: operatingStart, end: operatingEnd },
        required_badge_id: requiredBadgeId || null,
        requires_supervisor: requiresSupervisor,
        min_trust_tier: minTrustTier,
        rules,
      });

      router.push('/owner');
    } catch (err: any) {
      setError(err.message || 'Failed to update resource.');
    } finally {
      setIsSubmitting(false);
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

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-1">
        <div className="flex items-center justify-between pb-6 border-b border-slate-200">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
              Edit Equipment Listing
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Update asset parameters, trust gates, hourly rates, and usage checklists.
            </p>
          </div>
          <button
            onClick={() => router.push('/owner')}
            className="text-xs font-bold text-slate-600 hover:text-slate-900"
          >
            Cancel
          </button>
        </div>

        {error && (
          <div className="my-6 p-4 bg-rose-50 border border-rose-300 rounded-2xl text-rose-900 text-xs font-bold">
            ⚠ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-8 text-xs">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-black text-slate-900 pb-3 border-b border-slate-100">
              1. General Asset Identity
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Equipment Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ResourceCategory)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-medium focus:outline-none cursor-pointer"
                >
                  <option value="equipment">Fabricator / Tool</option>
                  <option value="lab_space">Lab Space / Dedicated Bench</option>
                  <option value="instrument">Analytical Instrument</option>
                  <option value="device">Electronic Testing Device</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Campus Location & Room *
                </label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Photo URL
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Detailed Description & Allowed Uses *
              </label>
              <textarea
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-black text-slate-900 pb-3 border-b border-slate-100">
              2. Fair Allocation & Cost Limits
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Hourly Rate (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-medium focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Deposit Hold (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-medium focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Max Booking (hrs)
                </label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={maxBookingHours}
                  onChange={(e) => setMaxBookingHours(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-medium focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Max Bookings/Day
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={maxPerDay}
                  onChange={(e) => setMaxPerDay(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-medium focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Operating Start Time
                </label>
                <input
                  type="time"
                  value={operatingStart}
                  onChange={(e) => setOperatingStart(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-medium focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Operating End Time
                </label>
                <input
                  type="time"
                  value={operatingEnd}
                  onChange={(e) => setOperatingEnd(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-medium focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-black text-slate-900 pb-3 border-b border-slate-100">
              3. Safety & Mandatory Prerequisites
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Required Prerequisite Badge
                </label>
                <select
                  value={requiredBadgeId}
                  onChange={(e) => setRequiredBadgeId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-medium focus:outline-none cursor-pointer"
                >
                  <option value="">None (Open to All Users)</option>
                  {badges.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Minimum Trust Tier
                </label>
                <select
                  value={minTrustTier}
                  onChange={(e) => setMinTrustTier(Number(e.target.value) as TrustTier)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-medium focus:outline-none cursor-pointer"
                >
                  <option value={0}>Tier 0: Any User (New Student)</option>
                  <option value={1}>Tier 1: Verified (1+ Certificate)</option>
                  <option value={2}>Tier 2: Trusted (Good Track Record)</option>
                  <option value={3}>Tier 3: Expert (Supervised / Faculty)</option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-2 font-bold text-slate-800">
              <input
                type="checkbox"
                checked={requiresSupervisor}
                onChange={(e) => setRequiresSupervisor(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300"
              />
              <span>Requires On-Site Lab Supervisor PIN for Check-in</span>
            </label>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Facility Safety Checklist & Rules *
              </label>
              <textarea
                rows={4}
                required
                value={rules}
                onChange={(e) => setRules(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono text-xs focus:outline-none"
              />
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h2 className="text-sm font-black text-slate-900">
                4. Key Specifications (Key / Value)
              </h2>
              <button
                type="button"
                onClick={handleAddSpec}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
              >
                + Add Spec
              </button>
            </div>

            <div className="space-y-3">
              {specs.map((s, idx) => (
                <div key={idx} className="flex gap-3 items-center">
                  <input
                    type="text"
                    placeholder="Attribute"
                    value={s.key}
                    onChange={(e) => handleSpecChange(idx, 'key', e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 font-medium focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Value"
                    value={s.value}
                    onChange={(e) => handleSpecChange(idx, 'value', e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 font-medium focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveSpec(idx)}
                    className="text-slate-400 hover:text-rose-600 p-1 font-bold"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => router.push('/owner')}
              className="px-6 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition shadow-md shadow-indigo-500/20"
            >
              {isSubmitting ? 'Updating...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
