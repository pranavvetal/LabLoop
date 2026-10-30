import React, { useState } from 'react';
import { mockUsers, User } from '../lib/store';

interface NavbarProps {
  currentUser: User;
  onSwitchUser: (user: User) => void;
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onSwitchUser,
  currentPath,
  onNavigate,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: 'Discovery', path: '/', roles: ['Student', 'Owner', 'Admin'] },
    { name: 'Owner Dashboard', path: '/owner', roles: ['Owner', 'Admin'] },
    { name: 'Check-in', path: '/checkin', roles: ['Student', 'Owner', 'Admin'] },
    { name: 'Audit Trail', path: '/audit', roles: ['Student', 'Owner', 'Admin'] },
  ].filter(link => link.roles.includes(currentUser.role));

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div
              className="flex-shrink-0 flex items-center cursor-pointer gap-2"
              onClick={() => onNavigate('/')}
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-indigo-500/20">
                L
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                LabLoop
              </span>
            </div>

            <div className="hidden sm:ml-8 sm:flex sm:space-x-4">
              {navLinks.map((link) => {
                const isActive = currentPath === link.path;
                return (
                  <button
                    key={link.path}
                    onClick={() => onNavigate(link.path)}
                    className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 font-semibold'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {link.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="hidden sm:flex sm:items-center sm:space-x-4">
            <div className="flex items-center gap-3 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200 shadow-sm">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Role:</span>
              <select
                value={currentUser.id}
                onChange={(e) => {
                  const selected = mockUsers.find((u) => u.id === e.target.value);
                  if (selected) onSwitchUser(selected);
                }}
                className="bg-transparent text-sm font-medium text-gray-800 focus:outline-none cursor-pointer"
              >
                {mockUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
              <img
                src={currentUser.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'}
                alt={currentUser.name}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-indigo-500/20"
              />
              <div className="hidden lg:block text-left">
                <p className="text-xs font-medium text-gray-900">{currentUser.name}</p>
                <p className="text-[10px] text-gray-500">{currentUser.role}</p>
              </div>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center sm:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none"
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

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-gray-200 bg-white px-4 pt-2 pb-4 space-y-3">
          <div className="space-y-1">
            {navLinks.map((link) => {
              const isActive = currentPath === link.path;
              return (
                <button
                  key={link.path}
                  onClick={() => {
                    onNavigate(link.path);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-md text-base font-medium ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {link.name}
                </button>
              );
            })}
          </div>

          <div className="pt-4 border-t border-gray-200">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Switch Role / User
            </label>
            <select
              value={currentUser.id}
              onChange={(e) => {
                const selected = mockUsers.find((u) => u.id === e.target.value);
                if (selected) onSwitchUser(selected);
              }}
              className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {mockUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.role})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </nav>
  );
};
