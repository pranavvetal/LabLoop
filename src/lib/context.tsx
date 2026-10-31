"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

import { User, Resource, Reservation, AuditLogEntry, initialStore, getBookingCountForUser } from './store';

interface StoreContextProps {
  currentUser: User;
  setCurrentUser: (user: User) => void;
  resources: Resource[];
  reservations: Reservation[];
  setReservations: React.Dispatch<React.SetStateAction<Reservation[]>>;
  auditLogs: AuditLogEntry[];
  addAuditLog: (log: Omit<AuditLogEntry, "id" | "timestamp">) => void;
  dailyQuota: number;
  userBookingsToday: number;
  isQuotaReached: boolean;
}

const StoreContext = createContext<StoreContextProps | null>(null);

export const StoreProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User>(initialStore.users[0]);
  const [resources] = useState<Resource[]>(initialStore.resources);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  const dailyQuota = 2;

  // Load persisted data from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('labloop_user');
    if (savedUser) setCurrentUser(JSON.parse(savedUser));

    const savedReservations = localStorage.getItem('labloop_reservations');
    if (savedReservations) setReservations(JSON.parse(savedReservations));
    else setReservations(initialStore.reservations);

    const savedAudit = localStorage.getItem('labloop_audit');
    if (savedAudit) setAuditLogs(JSON.parse(savedAudit));
    else setAuditLogs(initialStore.auditLogs);
  }, []);

  // Persist changes
  useEffect(() => {
    localStorage.setItem('labloop_user', JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('labloop_reservations', JSON.stringify(reservations));
  }, [reservations]);

  useEffect(() => {
    localStorage.setItem('labloop_audit', JSON.stringify(auditLogs));
  }, [auditLogs]);

  const addAuditLog = (log: Omit<AuditLogEntry, 'id' | 'timestamp'>) => {
    const entry: AuditLogEntry = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      ...log,
    };
    setAuditLogs(prev => [entry, ...prev]);
  };

  const userBookingsToday = getBookingCountForUser(currentUser.id, reservations);
  const isQuotaReached = userBookingsToday >= dailyQuota;

  return (
    <StoreContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        resources,
        reservations,
        setReservations,
        auditLogs,
        addAuditLog,
        dailyQuota,
        userBookingsToday,
        isQuotaReached,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within a StoreProvider');
  return ctx;
};
