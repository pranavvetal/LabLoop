'use client';

import React, { useState } from 'react';
import { initialStore, User, Reservation } from '../../lib/store';
import { Navbar } from '../../components/Navbar';

export default function OwnerDashboard() {
  const [store, setStore] = useState(initialStore);
  const [currentPath, setCurrentPath] = useState('/owner');
  const [notifications, setNotifications] = useState<string[]>([]);

  const handleSwitchUser = (user: User) => {
    setStore((prev) => ({ ...prev, currentUser: user }));
  };

  const handleNavigate = (path: string) => setCurrentPath(path);

  // Filter requests only for resources owned by this user (or all if admin)
  const myRequests = store.reservations.filter((r) => r.status === 'pending');

  const handleApprove = (id: string) => {
    setStore((prev) => ({
      ...prev,
      reservations: prev.reservations.map((r) =>
        r.id === id ? { ...r, status: 'confirmed' } : r
      ),
    }));
    setNotifications((prev) => [...prev, `Request ${id} approved!`]);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar currentUser={store.currentUser} onSwitchUser={handleSwitchUser} currentPath={currentPath} onNavigate={handleNavigate} />
      <main className="max-w-5xl mx-auto p-8">
        <h1 className="text-2xl font-bold mb-6">Owner Dashboard</h1>

        {notifications.map((n, i) => (
          <div key={i} className="bg-green-100 p-2 mb-2 rounded">{n}</div>
        ))}

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="font-bold text-lg mb-4">Pending Requests</h2>
          {myRequests.map((req) => (
            <div key={req.id} className="border-b py-4 flex justify-between items-center">
              <div>
                <p className="font-semibold">{req.purpose}</p>
                <p className="text-sm text-gray-500">Resource ID: {req.resourceId}</p>
              </div>
              <button
                onClick={() => handleApprove(req.id)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg"
              >
                Approve
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
