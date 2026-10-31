// ============================================================
// LabLoop Enterprise — Responsive Role-Aware Navigation
// ============================================================

"use client";

import React, { useState } from 'react';
import Link from 'next/navigation';
import { useRouter, usePathname } from 'next/navigation';
import { useAppContext } from '@/lib/context';
import { DEMO_ACCOUNTS } from '@/lib/seed';
import { User } from '@/lib/types';

interface NavbarProps {
  currentUser?: User | null;
  onSwitchUser?: (user: User) => void;
  currentPath?: string;
  onNavigate?: (path: string) => void;
}

export const Navbar: React.FC<NavbarProps> = () => {
  const router = useRouter();
  const pathname = usePathname();
  const {
    currentUser,
    login,
    logout,
    notifications,
    markNotificationRead,
    resetData,
  } = useAppContext();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);

  const unreadNotifs = notifications.filter(
    (n) => n.user_id === currentUser?.id && !n.is_read
  );

  const role = currentUser?.role || 'student';

  const navLinks = [
    { name: 'Discovery', path: '/', roles: ['student', 'faculty', 'researcher', 'owner', 'manager', 'admin'] },
    { name: 'My Bookings', path: '/my-bookings', roles: ['student', 'faculty', 'researcher', 'owner', 'manager', 'admin'] },
    { name: 'Owner Portal', path: '/owner', roles: ['owner', 'manager', 'admin'] },
    { name: 'Check-in & Out', path: '/checkin', roles: ['student', 'faculty', 'researcher', 'owner', 'manager', 'admin'] },
    { name: 'Incidents', path: '/owner/incidents', roles: ['owner', 'manager', 'admin'] },
    { name: 'Verifications', path: '/manager/verifications', roles: ['manager', 'admin'] },
    { name: 'Insights', path: '/admin/insights', roles: ['manager', 'admin'] },
    { name: 'Trust & Safety', path: '/trust', roles: ['student', 'faculty', 'researcher', 'owner', 'manager', 'admin'] },
    { name: 'Audit Trail', path: '/audit', roles: ['student', 'faculty', 'researcher', 'owner', 'manager', 'admin'] },
  ].filter((link) => link.roles.includes(role));

  const roleColors: Record<string, string> = {
    student: 'bg-blue-100 text-blue-800 border-blue-200',
    researcher: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    owner: 'bg-purple-100 text-purple-800 border-purple-200',
    manager: 'bg-amber-100 text-amber-800 border-amber-200',
    admin: 'bg-rose-100 text-rose-800 border-rose-200',
  };

  const handleNavigate = (path: string) => {
    router.push(path);
    setMobileMenuOpen(false);
  };

  const handleSwitchUser = (userId: string) => {
    login(userId);
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo & Desktop Nav Links */}
          <div className="flex items-center">
            <div
              className="flex-shrink-0 flex items-center cursor-pointer gap-2.5 mr-6"
              onClick={() => handleNavigate('/')}
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-purple-600 flex items-center justify-center text-white font-extrabold text-lg shadow-md shadow-indigo-500/25">
                L
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-black bg-gradient-to-r from-slate-900 to-indigo-900 bg-clip-text text-transparent leading-none">
                  LabLoop
                </span>
                <span className="text-[10px] font-semibold text-slate-500 tracking-wider uppercase mt-0.5">
                  Enterprise
                </span>
              </div>
            </div>

            <div className="hidden lg:flex lg:space-x-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.path;
                return (
                  <button
                    key={link.path}
                    onClick={() => handleNavigate(link.path)}
                    className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200/60 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    {link.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center space-x-3">
            {/* Quick Persona Switcher for Judges */}
            <div className="hidden sm:flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Persona:
              </span>
              <select
                value={currentUser?.id || ''}
                onChange={(e) => handleSwitchUser(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer pr-1"
              >
                {DEMO_ACCOUNTS.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.label})
                  </option>
                ))}
              </select>
            </div>

            {/* Notification Bell Dropdown */}
            <div className="relative">
              <button
                onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                className="relative p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition focus:outline-none"
                aria-label="View notifications"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadNotifs.length > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                    {unreadNotifs.length}
                  </span>
                )}
              </button>

              {/* Notification Popover */}
              {notifDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-3 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 px-1">
                    <span className="text-xs font-bold text-slate-900">Notifications</span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {unreadNotifs.length} unread
                    </span>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 my-1">
                    {notifications.filter((n) => n.user_id === currentUser?.id).length === 0 ? (
                      <p className="text-xs text-slate-400 py-6 text-center">No notifications yet.</p>
                    ) : (
                      notifications
                        .filter((n) => n.user_id === currentUser?.id)
                        .slice(0, 5)
                        .map((notif) => (
                          <div
                            key={notif.id}
                            className={`p-2.5 text-xs rounded-lg transition ${
                              notif.is_read ? 'text-slate-500' : 'bg-indigo-50/60 text-slate-900 font-medium'
                            }`}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <span className="font-bold text-indigo-900">{notif.title}</span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                              {notif.message}
                            </p>
                            {!notif.is_read && (
                              <button
                                onClick={() => markNotificationRead(notif.id)}
                                className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 mt-1.5"
                              >
                                Mark read
                              </button>
                            )}
                          </div>
                        ))
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setNotifDropdownOpen(false);
                      handleNavigate('/my-bookings');
                    }}
                    className="w-full text-center py-1.5 text-xs text-indigo-600 font-semibold hover:bg-slate-50 rounded-lg transition"
                  >
                    View All in My Bookings →
                  </button>
                </div>
              )}
            </div>

            {/* User Profile Pill & Logout */}
            {currentUser ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <img
                  src={
                    currentUser.avatar_url ||
                    currentUser.avatar ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
                  }
                  alt={currentUser.full_name}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-indigo-500/20"
                />
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-bold text-slate-900 leading-tight">
                    {currentUser.full_name || currentUser.name}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border ${
                        roleColors[currentUser.role] || 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {currentUser.role}
                    </span>
                    <span className="text-[9px] font-semibold text-slate-500">
                      Tier {currentUser.trust_tier}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                  aria-label="Logout"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            ) : (
              <button
                onClick={() => router.push('/login')}
                className="bg-indigo-600 text-white text-xs font-bold px-3.5 py-2 rounded-xl hover:bg-indigo-700 transition"
              >
                Sign In
              </button>
            )}

            {/* Mobile Hamburger Button */}
            <div className="flex items-center lg:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 focus:outline-none"
                aria-label="Open navigation menu"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-3 shadow-lg">
          <div className="space-y-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.path;
              return (
                <button
                  key={link.path}
                  onClick={() => handleNavigate(link.path)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-sm font-semibold transition ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {link.name}
                </button>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-200">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Switch Persona (Evaluation Tool)
            </label>
            <select
              value={currentUser?.id || ''}
              onChange={(e) => {
                handleSwitchUser(e.target.value);
                setMobileMenuOpen(false);
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {DEMO_ACCOUNTS.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} — {acc.label} (Tier {acc.id === 'usr-jamie' ? 0 : acc.id === 'usr-alex' ? 1 : acc.id === 'usr-priya' ? 2 : 3})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
