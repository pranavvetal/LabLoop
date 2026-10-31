// ============================================================
// LabLoop Enterprise — Notification Center & Email Previews
// ============================================================

"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { useAppContext } from '@/lib/context';
import { Notification } from '@/lib/types';

export default function NotificationsPage() {
  const router = useRouter();
  const {
    currentUser,
    notifications,
    markNotificationRead,
    isMounted,
  } = useAppContext();

  const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null);

  const myNotifications = notifications.filter((n) => n.user_id === currentUser?.id);

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
              Notification & Dispatch Center
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Automated notifications for approvals, reminders, waitlist promotions, and overdue holdings.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-400">
            {myNotifications.filter((n) => !n.is_read).length} Unread
          </span>
        </div>

        <div className="mt-8 space-y-3">
          {myNotifications.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-xs text-slate-400">
              No notifications dispatched to your account yet.
            </div>
          ) : (
            myNotifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-5 rounded-2xl border transition-all ${
                  notif.is_read
                    ? 'bg-white border-slate-200 text-slate-600'
                    : 'bg-indigo-50/50 border-indigo-200 text-slate-900 shadow-xs'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">{notif.title}</span>
                    {!notif.is_read && (
                      <span className="bg-indigo-600 text-white text-[9px] font-bold px-2 py-0.2 rounded-full uppercase">
                        New
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {new Date(notif.created_at).toLocaleString()}
                  </span>
                </div>

                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  {notif.message}
                </p>

                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedNotif(notif)}
                      className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Simulated Email Preview
                    </button>
                    {notif.link && (
                      <button
                        onClick={() => router.push(notif.link!)}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
                      >
                        Navigate to Target →
                      </button>
                    )}
                  </div>

                  {!notif.is_read && (
                    <button
                      onClick={() => markNotificationRead(notif.id)}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      Mark as Read
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Email Preview Modal */}
        {selectedNotif && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 text-xs">
              {/* Fake Email Client Header */}
              <div className="bg-slate-100 p-4 border-b border-slate-200">
                <div className="flex items-center justify-between pb-2">
                  <span className="font-bold text-slate-800">Campus Notification Dispatcher</span>
                  <button
                    onClick={() => setSelectedNotif(null)}
                    className="text-slate-400 hover:text-slate-600 font-bold"
                  >
                    ✕
                  </button>
                </div>
                <div className="space-y-1 text-[11px] text-slate-500 font-mono">
                  <p><strong>From:</strong> LabLoop Automation &lt;no-reply@university.edu&gt;</p>
                  <p><strong>To:</strong> {currentUser?.email}</p>
                  <p><strong>Subject:</strong> [LabLoop] {selectedNotif.title}</p>
                </div>
              </div>

              {/* Email Body */}
              <div className="p-6 space-y-4">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-black text-sm flex items-center justify-center">
                  L
                </div>
                <h3 className="text-base font-bold text-slate-900">{selectedNotif.title}</h3>
                <p className="text-slate-700 leading-relaxed text-sm">
                  Hello {currentUser?.full_name},
                </p>
                <p className="text-slate-700 leading-relaxed text-sm bg-slate-50 p-4 rounded-xl border border-slate-100">
                  {selectedNotif.message}
                </p>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  This transaction is tracked on the institutional tamper-proof hash ledger. If you believe this notification was sent in error, submit an inquiry to your facility administrator.
                </p>

                <div className="pt-3 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => {
                      if (selectedNotif.link) router.push(selectedNotif.link);
                      setSelectedNotif(null);
                    }}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition"
                  >
                    Open in LabLoop →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
