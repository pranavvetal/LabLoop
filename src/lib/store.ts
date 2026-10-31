// Transitional adapter for backward compatibility during Phase 0
export * from './types';
export * from './seed';

import { seedUsers, seedResources, seedBookings, seedAuditLogs } from './seed';
import { Booking } from './types';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  target: string;
  details: string;
}

export interface Reservation {
  id: string;
  resourceId: string;
  resourceName: string;
  userId: string;
  userName: string;
  startTime: string;
  endTime: string;
  purpose?: string;
  status: 'pending' | 'confirmed' | 'rejected' | 'in-use' | 'returned' | 'waitlisted';
}

export const mockUsers = seedUsers;

export const mockResources = seedResources;

export const mockReservations: Reservation[] = seedBookings.map(b => ({
  id: b.id,
  resourceId: b.resource_id,
  resourceName: b.resource_id,
  userId: b.user_id,
  userName: b.user_id,
  startTime: b.start_time,
  endTime: b.end_time,
  status: (b.status === 'checked_in' ? 'in-use' : b.status === 'approved' ? 'confirmed' : b.status) as any,
}));

export const mockAuditLogs: AuditLogEntry[] = seedAuditLogs.map(l => ({
  id: l.id,
  timestamp: l.timestamp,
  actor: l.performed_by || 'system',
  action: l.action,
  target: l.entity_id,
  details: l.reason || '',
}));

export const initialStore = {
  currentUser: mockUsers[0],
  users: mockUsers,
  resources: mockResources,
  reservations: mockReservations,
  auditLogs: mockAuditLogs,
};

export const getBookingCountForUser = (userId: string, reservations: any[]): number => {
  const today = new Date().toDateString();
  return reservations.filter(
    (r) => (r.userId === userId || r.user_id === userId) &&
      new Date(r.startTime || r.start_time).toDateString() === today &&
      ['confirmed', 'approved', 'pending', 'in-use', 'checked_in'].includes(r.status)
  ).length;
};
