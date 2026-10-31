// ============================================================
// LabLoop Enterprise — AppContext & Global State Provider
// ============================================================

"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import {
  User,
  Resource,
  Booking,
  WaitlistEntry,
  Incident,
  Notification,
  AuditLog,
  Certificate,
  Badge,
  UserBadge,
} from './types';
import {
  getDB,
  saveDB,
  CURRENT_USER_KEY,
  onDBChange,
  resetDemoData,
  appendAuditLog,
  updateBooking as dbUpdateBooking,
  createBooking as dbCreateBooking,
  createResource as dbCreateResource,
  updateResource as dbUpdateResource,
  deleteResource as dbDeleteResource,
  createIncident as dbCreateIncident,
  updateIncident as dbUpdateIncident,
  addNotification as dbAddNotification,
  markNotificationRead as dbMarkNotificationRead,
  addConditionReport as dbAddConditionReport,
  verifyUserBadge as dbVerifyUserBadge,
  recomputeWaitlistPositions,
} from './db';
import { can } from './permissions';

interface AppContextProps {
  currentUser: User | null;
  users: User[];
  resources: Resource[];
  bookings: Booking[];
  waitlist: WaitlistEntry[];
  incidents: Incident[];
  notifications: Notification[];
  auditLogs: AuditLog[];
  certificates: Certificate[];
  badges: Badge[];
  userBadges: UserBadge[];
  isMounted: boolean;
  login: (userId: string) => void;
  logout: () => void;
  resetData: () => void;
  refreshDB: () => void;
  setCurrentUser: (user: User) => void;
  logAudit: (
    action: string,
    entity: string,
    entity_id: string,
    reason?: string,
    payload?: Record<string, unknown>
  ) => Promise<AuditLog>;
  // Action wrappers with permissions & audit
  requestBooking: (booking: Booking) => Promise<Booking>;
  approveBooking: (bookingId: string, reason: string) => Promise<Booking>;
  rejectBooking: (bookingId: string, reason: string) => Promise<Booking>;
  waitlistBooking: (bookingId: string, reason: string) => Promise<Booking>;
  cancelBooking: (bookingId: string, reason: string) => Promise<Booking>;
  checkIn: (
    bookingId: string,
    checklist: { label: string; ok: boolean }[],
    notes?: string,
    photoUrl?: string,
    supervisorPin?: string
  ) => Promise<Booking>;
  returnResource: (
    bookingId: string,
    checklist: { label: string; ok: boolean }[],
    notes?: string,
    photoUrl?: string
  ) => Promise<Booking>;
  reportIncident: (incident: Omit<Incident, 'id' | 'created_at' | 'updated_at'>) => Promise<Incident>;
  resolveIncident: (incidentId: string, resolution: string, penaltyConfirmed?: boolean) => Promise<Incident>;
  updateResourceStatus: (resourceId: string, status: 'available' | 'maintenance' | 'retired', reason?: string) => Promise<Resource>;
  createResource: (resource: Resource) => Promise<Resource>;
  updateResource: (id: string, updates: Partial<Resource>) => Promise<Resource>;
  deleteResource: (id: string) => Promise<void>;
  verifyBadge: (userBadgeId: string) => Promise<UserBadge>;
  requestExtension: (bookingId: string, extraHours: number) => Promise<Booking>;
  markNotificationRead: (id: string) => void;
  // Backward compatibility
  reservations: any[];
  setReservations: React.Dispatch<React.SetStateAction<any[]>>;
  addAuditLog: (log: any) => void;
  dailyQuota: number;
  userBookingsToday: number;
  isQuotaReached: boolean;
}

const AppContext = createContext<AppContextProps | null>(null);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [isMounted, setIsMounted] = useState(false);
  const [currentUser, setCurrentUserState] = useState<User | null>(null);
  const [db, setDb] = useState(() => getDB());
  const [reservationsCompat, setReservationsCompat] = useState<any[]>([]);

  // Reload state from DB
  const refreshDB = useCallback(() => {
    const current = getDB();
    setDb({ ...current });
  }, []);

  // Initialize on mount
  useEffect(() => {
    setIsMounted(true);
    const initial = getDB();
    setDb(initial);

    // Load active user
    const savedUserId = localStorage.getItem(CURRENT_USER_KEY);
    if (savedUserId) {
      const found = initial.users.find((u) => u.id === savedUserId);
      if (found) {
        setCurrentUserState(found);
      } else {
        setCurrentUserState(initial.users[0]);
      }
    } else {
      // Default to student Alex
      const defaultUser = initial.users[0];
      setCurrentUserState(defaultUser);
      localStorage.setItem(CURRENT_USER_KEY, defaultUser.id);
    }

    // Subscribe to cross-tab updates
    const unsubscribe = onDBChange((newDb) => {
      setDb({ ...newDb });
      if (savedUserId) {
        const refreshedUser = newDb.users.find((u) => u.id === savedUserId);
        if (refreshedUser) setCurrentUserState(refreshedUser);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = (userId: string) => {
    const user = db.users.find((u) => u.id === userId);
    if (user) {
      setCurrentUserState(user);
      localStorage.setItem(CURRENT_USER_KEY, user.id);
      localStorage.setItem('labloop_user', JSON.stringify(user));
    }
  };

  const logout = () => {
    setCurrentUserState(null);
    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.removeItem('labloop_user');
  };

  const resetData = () => {
    const fresh = resetDemoData();
    setDb({ ...fresh });
    if (currentUser) {
      const refreshed = fresh.users.find((u) => u.id === currentUser.id) || fresh.users[0];
      setCurrentUserState(refreshed);
    }
  };

  const logAudit = async (
    action: string,
    entity: string,
    entity_id: string,
    reason?: string,
    payload?: Record<string, unknown>
  ): Promise<AuditLog> => {
    const entry = await appendAuditLog({
      action,
      entity,
      entity_id,
      performed_by: currentUser?.id || null,
      reason,
      payload,
    });
    refreshDB();
    return entry;
  };

  const requestBooking = async (booking: Booking): Promise<Booking> => {
    const created = dbCreateBooking(booking);
    await logAudit(
      'BOOKING_REQUESTED',
      'booking',
      created.id,
      `User ${currentUser?.full_name || currentUser?.id} requested ${booking.purpose}`,
      { priority_score: booking.priority_score, purpose_type: booking.purpose_type }
    );
    // Notify owner
    const resource = db.resources.find((r) => r.id === booking.resource_id);
    if (resource) {
      dbAddNotification(
        resource.owner_id,
        'New Booking Request',
        `${currentUser?.full_name || 'A user'} requested ${resource.name} (${booking.purpose.slice(0, 40)}...)`,
        '/owner'
      );
    }
    refreshDB();
    return created;
  };

  const approveBooking = async (bookingId: string, reason: string): Promise<Booking> => {
    const b = db.bookings.find((item) => item.id === bookingId);
    if (!b) throw new Error('Booking not found');
    const resource = db.resources.find((r) => r.id === b.resource_id);
    if (!can(currentUser, 'approve_booking', resource)) {
      throw new Error('Permission denied: You cannot approve bookings for this resource.');
    }

    // Atomic conflict verification
    const overlapping = db.bookings.filter(
      (existing) =>
        existing.id !== bookingId &&
        existing.resource_id === b.resource_id &&
        ['approved', 'checked_in'].includes(existing.status) &&
        new Date(existing.start_time) < new Date(b.end_time) &&
        new Date(existing.end_time) > new Date(b.start_time)
    );

    if (overlapping.length > 0) {
      throw new Error(`Conflict detected: Slot already approved for booking ${overlapping[0].id}`);
    }

    const updated = dbUpdateBooking(bookingId, {
      status: 'approved',
      decision_by: currentUser?.id,
      decision_reason: reason,
      decision_at: new Date().toISOString(),
      due_at: b.end_time,
    });

    await logAudit(
      'BOOKING_APPROVED',
      'booking',
      bookingId,
      `Approved by ${currentUser?.full_name}: ${reason}`,
      { reason, approver: currentUser?.id }
    );

    dbAddNotification(
      b.user_id,
      'Booking Request Approved!',
      `Your reservation for ${resource?.name || 'resource'} has been approved by ${currentUser?.full_name}.`,
      '/my-bookings'
    );

    refreshDB();
    return updated;
  };

  const rejectBooking = async (bookingId: string, reason: string): Promise<Booking> => {
    const b = db.bookings.find((item) => item.id === bookingId);
    if (!b) throw new Error('Booking not found');
    const resource = db.resources.find((r) => r.id === b.resource_id);
    if (!can(currentUser, 'approve_booking', resource)) {
      throw new Error('Permission denied');
    }

    const updated = dbUpdateBooking(bookingId, {
      status: 'rejected',
      decision_by: currentUser?.id,
      decision_reason: reason,
      decision_at: new Date().toISOString(),
    });

    await logAudit(
      'BOOKING_REJECTED',
      'booking',
      bookingId,
      `Rejected by ${currentUser?.full_name}: ${reason}`,
      { reason }
    );

    dbAddNotification(
      b.user_id,
      'Booking Request Rejected',
      `Your reservation request for ${resource?.name || 'resource'} was rejected: ${reason}`,
      '/my-bookings'
    );

    refreshDB();
    return updated;
  };

  const waitlistBooking = async (bookingId: string, reason: string): Promise<Booking> => {
    const b = db.bookings.find((item) => item.id === bookingId);
    if (!b) throw new Error('Booking not found');

    const updated = dbUpdateBooking(bookingId, {
      status: 'waitlisted',
      decision_reason: reason,
    });

    await logAudit(
      'BOOKING_WAITLISTED',
      'booking',
      bookingId,
      `Waitlisted: ${reason}`,
      { reason }
    );

    refreshDB();
    return updated;
  };

  const cancelBooking = async (bookingId: string, reason: string): Promise<Booking> => {
    const b = db.bookings.find((item) => item.id === bookingId);
    if (!b) throw new Error('Booking not found');

    const updated = dbUpdateBooking(bookingId, {
      status: 'cancelled',
      decision_reason: reason,
    });

    await logAudit(
      'BOOKING_CANCELLED',
      'booking',
      bookingId,
      `Booking cancelled: ${reason}`,
      { reason, cancelled_by: currentUser?.id }
    );

    // Waitlist promotion trigger
    const resourceWaitlist = db.waitlist.filter((w) => w.resource_id === b.resource_id);
    if (resourceWaitlist.length > 0) {
      resourceWaitlist.sort((a, b) => a.position - b.position);
      const topWaitlisted = resourceWaitlist[0];
      const waitlistedBooking = db.bookings.find(
        (bk) => bk.resource_id === b.resource_id && bk.user_id === topWaitlisted.user_id && bk.status === 'waitlisted'
      );
      if (waitlistedBooking) {
        dbUpdateBooking(waitlistedBooking.id, {
          status: 'pending',
          explanation_code: 'WAITLIST_PROMOTED',
          message: 'Slot opened up! Your waitlisted request has been promoted to owner review queue.',
        });
        await logAudit(
          'WAITLIST_PROMOTED',
          'booking',
          waitlistedBooking.id,
          `Waitlisted request promoted to pending_review after cancellation of booking ${bookingId}`,
          { promoted_user: topWaitlisted.user_id }
        );
        dbAddNotification(
          topWaitlisted.user_id,
          'Waitlist Promotion!',
          'A slot opened up! Your reservation is now pending owner confirmation.',
          '/my-bookings'
        );
        recomputeWaitlistPositions(b.resource_id);
      }
    }

    refreshDB();
    return updated;
  };

  const checkIn = async (
    bookingId: string,
    checklist: { label: string; ok: boolean }[],
    notes?: string,
    photoUrl?: string,
    supervisorPin?: string
  ): Promise<Booking> => {
    const b = db.bookings.find((item) => item.id === bookingId);
    if (!b) throw new Error('Booking not found');
    const resource = db.resources.find((r) => r.id === b.resource_id);

    if (resource?.requires_supervisor && !supervisorPin) {
      throw new Error('Supervisor PIN verification required for this high-containment asset.');
    }

    const now = new Date().toISOString();
    const updated = dbUpdateBooking(bookingId, {
      status: 'checked_in',
      checked_in_at: now,
      due_at: b.end_time,
    });

    dbAddConditionReport({
      id: `cr-in-${Date.now()}`,
      booking_id: bookingId,
      type: 'check_in',
      checklist_items: checklist,
      notes,
      photos: photoUrl ? [photoUrl] : [],
      submitted_by: currentUser?.id || 'unknown',
      recorded_at: now,
    });

    await logAudit(
      'CHECK_IN_RECORDED',
      'booking',
      bookingId,
      `User ${currentUser?.full_name} checked in with ${checklist.filter((i) => i.ok).length}/${checklist.length} checklist items verified.`,
      { supervisor_present: Boolean(supervisorPin), checklist, photo: Boolean(photoUrl) }
    );

    refreshDB();
    return updated;
  };

  const returnResource = async (
    bookingId: string,
    checklist: { label: string; ok: boolean }[],
    notes?: string,
    photoUrl?: string
  ): Promise<Booking> => {
    const b = db.bookings.find((item) => item.id === bookingId);
    if (!b) throw new Error('Booking not found');

    const now = new Date().toISOString();
    const updated = dbUpdateBooking(bookingId, {
      status: 'returned',
      returned_at: now,
    });

    dbAddConditionReport({
      id: `cr-out-${Date.now()}`,
      booking_id: bookingId,
      type: 'return',
      checklist_items: checklist,
      notes,
      photos: photoUrl ? [photoUrl] : [],
      submitted_by: currentUser?.id || 'unknown',
      recorded_at: now,
    });

    await logAudit(
      'RETURN_RECORDED',
      'booking',
      bookingId,
      `User ${currentUser?.full_name} completed return inspection.`,
      { checklist, notes }
    );

    refreshDB();
    return updated;
  };

  const reportIncident = async (
    incident: Omit<Incident, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Incident> => {
    const now = new Date().toISOString();
    const created = dbCreateIncident({
      ...incident,
      id: `inc-${Date.now()}`,
      created_at: now,
      updated_at: now,
    });

    await logAudit(
      'INCIDENT_REPORTED',
      'incident',
      created.id,
      `Incident (${incident.type}, ${incident.severity}) filed by ${currentUser?.full_name}`,
      { type: incident.type, severity: incident.severity }
    );

    // Notify lab manager
    const managers = db.users.filter((u) => u.role === 'manager' || u.role === 'admin');
    managers.forEach((m) => {
      dbAddNotification(
        m.id,
        'Incident Action Required',
        `New incident reported: ${incident.description.slice(0, 50)}...`,
        '/owner/incidents'
      );
    });

    refreshDB();
    return created;
  };

  const resolveIncident = async (
    incidentId: string,
    resolution: string,
    penaltyConfirmed: boolean = false
  ): Promise<Incident> => {
    const updated = dbUpdateIncident(incidentId, {
      status: 'resolved',
      resolution,
      penalty_confirmed: penaltyConfirmed,
    });

    await logAudit(
      'INCIDENT_RESOLVED',
      'incident',
      incidentId,
      `Incident resolved: ${resolution}. Penalty confirmed: ${penaltyConfirmed}`,
      { resolution, penaltyConfirmed, resolved_by: currentUser?.id }
    );

    refreshDB();
    return updated;
  };

  const updateResourceStatus = async (
    resourceId: string,
    status: 'available' | 'maintenance' | 'retired',
    reason?: string
  ): Promise<Resource> => {
    const updated = dbUpdateResource(resourceId, {
      status,
      is_active: status === 'available',
    });

    await logAudit(
      'FLEET_STATUS_CHANGED',
      'resource',
      resourceId,
      `Resource status changed to ${status}. Reason: ${reason || 'N/A'}`,
      { status, reason, updated_by: currentUser?.id }
    );

    refreshDB();
    return updated;
  };

  const createResource = async (resource: Resource): Promise<Resource> => {
    const created = dbCreateResource(resource);
    await logAudit(
      'RESOURCE_LISTED',
      'resource',
      resource.id,
      `Dr. ${currentUser?.full_name || 'Owner'} published new resource ${resource.name}`,
      { category: resource.category, hourly_rate: resource.hourly_rate }
    );
    refreshDB();
    return created;
  };

  const updateResource = async (id: string, updates: Partial<Resource>): Promise<Resource> => {
    const updated = dbUpdateResource(id, updates);
    await logAudit(
      'RESOURCE_UPDATED',
      'resource',
      id,
      `Resource ${updated.name} updated by ${currentUser?.full_name}`,
      { updates }
    );
    refreshDB();
    return updated;
  };

  const deleteResource = async (id: string): Promise<void> => {
    const res = db.resources.find(r => r.id === id);
    dbDeleteResource(id);
    await logAudit(
      'RESOURCE_DELETED',
      'resource',
      id,
      `Resource ${res?.name || id} removed from catalog by ${currentUser?.full_name}`,
      { resource_name: res?.name }
    );
    refreshDB();
  };

  const verifyBadge = async (userBadgeId: string): Promise<UserBadge> => {
    const verified = dbVerifyUserBadge(userBadgeId, currentUser?.id || 'admin');
    await logAudit(
      'BADGE_VERIFIED',
      'user_badge',
      userBadgeId,
      `Badge verified by ${currentUser?.full_name}`,
      { verified_by: currentUser?.id }
    );
    refreshDB();
    return verified;
  };

  const requestExtension = async (bookingId: string, extraHours: number): Promise<Booking> => {
    const b = db.bookings.find((item) => item.id === bookingId);
    if (!b) throw new Error('Booking not found');

    const currentDue = new Date(b.due_at || b.end_time);
    const newDue = new Date(currentDue.getTime() + extraHours * 3600000).toISOString();

    const updated = dbUpdateBooking(bookingId, {
      extension_requested: true,
      extension_until: newDue,
    });

    await logAudit(
      'EXTENSION_REQUESTED',
      'booking',
      bookingId,
      `User requested ${extraHours}h extension until ${newDue}`,
      { extraHours, newDue }
    );

    refreshDB();
    return updated;
  };

  const markNotificationRead = (id: string) => {
    dbMarkNotificationRead(id);
    refreshDB();
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        users: db.users,
        resources: db.resources,
        bookings: db.bookings,
        waitlist: db.waitlist,
        incidents: db.incidents,
        notifications: db.notifications,
        auditLogs: db.audit_logs,
        certificates: db.certificates,
        badges: db.badges,
        userBadges: db.user_badges,
        isMounted,
        login,
        logout,
        resetData,
        refreshDB,
        setCurrentUser: setCurrentUserState,
        logAudit,
        requestBooking,
        approveBooking,
        rejectBooking,
        waitlistBooking,
        cancelBooking,
        checkIn,
        returnResource,
        reportIncident,
        resolveIncident,
        updateResourceStatus,
        createResource,
        updateResource,
        deleteResource,
        verifyBadge,
        requestExtension,
        markNotificationRead,
        // Backward compatibility:
        reservations: db.bookings.map((b) => ({
          ...b,
          resourceId: b.resource_id,
          userId: b.user_id,
          startTime: b.start_time,
          endTime: b.end_time,
        })),
        setReservations: setReservationsCompat,
        addAuditLog: (log: any) => {
          logAudit(log.action || 'ACTION', 'legacy', log.target || 'target', log.details);
        },
        dailyQuota: 2,
        userBookingsToday: db.bookings.filter(
          (b) =>
            b.user_id === currentUser?.id &&
            new Date(b.start_time).toDateString() === new Date().toDateString()
        ).length,
        isQuotaReached: false,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within an AppProvider');
  return ctx;
};

// Hook alias for backward compatibility
export const useStore = useAppContext;
export const StoreProvider = AppProvider;
export const useCurrentUser = () => {
  const { currentUser } = useAppContext();
  return currentUser;
};
export { AppContext };
