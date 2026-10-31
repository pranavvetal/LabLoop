"use client";
import React from 'react';
import { useStore } from '@/lib/context';
import Navbar from '@/components/Navbar';
import type { User } from '@/lib/store';

export default function OwnerDashboard() {
  const { currentUser, setCurrentUser, reservations, setReservations, addAuditLog } = useStore();
  const [notifications, setNotifications] = React.useState<string[]>([]);

  const handleSwitchUser = (user: User) => {
    setCurrentUser(user);
  };

  const handleNavigate = (path: string) => {
    // navigation is handled by Next router in the Navbar
  };

  const myRequests = reservations.filter((r) => r.status === 'pending');

  const handleApprove = (id: string) => {
    setReservations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'confirmed' } : r))
    );
    addAuditLog({
      actor: currentUser.name || (currentUser as any).full_name || 'Owner',
      action: 'APPROVE_RESERVATION',
      target: id,
      details: `Owner approved reservation ${id}`,
    });
    setNotifications((prev) => [...prev, `Request ${id} approved!`]);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar
        currentUser={currentUser}
        onSwitchUser={handleSwitchUser}
        currentPath="/owner"
        onNavigate={handleNavigate}
      />
      <main className="max-w-5xl mx-auto p-8">
        <h1 className="text-2xl font-bold mb-6">Owner Dashboard</h1>
        {notifications.map((n, i) => (
          <div key={i} className="bg-green-100 p-2 mb-2 rounded">
            {n}
          </div>
        ))}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="font-bold text-lg mb-4">Pending Requests</h2>
          {myRequests.map((req) => (
            <div key={req.id} className="border-b py-4 flex justify-between items-center">
              <div>
                <p className="font-semibold">{req.purpose ?? 'No purpose'}</p>
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
