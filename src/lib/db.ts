// ============================================================
// LabLoop Enterprise — Single-Source Data Layer & Storage
// ============================================================

import {
  Badge,
  UserBadge,
  Group,
  User,
  Resource,
  Booking,
  WaitlistEntry,
  ConditionReport,
  Incident,
  Notification,
  AuditLog,
  Certificate,
} from './types';
import { getSeedData } from './seed';
import { computeEntryHash } from './audit';

export const STORAGE_KEY = 'labloop_v1';
export const CURRENT_USER_KEY = 'labloop_current_user_id';

export interface LabloopDB {
  version: number;
  badges: Badge[];
  user_badges: UserBadge[];
  users: User[];
  groups: Group[];
  resources: Resource[];
  bookings: Booking[];
  waitlist: WaitlistEntry[];
  condition_reports: ConditionReport[];
  incidents: Incident[];
  notifications: Notification[];
  audit_logs: AuditLog[];
  certificates: Certificate[];
}

type DBChangeListener = (db: LabloopDB) => void;
const listeners: Set<DBChangeListener> = new Set();

export function onDBChange(fn: DBChangeListener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notifyListeners(db: LabloopDB) {
  listeners.forEach((fn) => {
    try {
      fn(db);
    } catch (e) {
      console.error('Error in DB listener:', e);
    }
  });
}

/**
 * Initialize seed data with pre-calculated valid cryptographic hashes.
 */
export async function initializeSeedWithHashes(): Promise<LabloopDB> {
  const seed = getSeedData();
  let prevHash = '0000000000000000000000000000000000000000000000000000000000000000';
  const hashedLogs: AuditLog[] = [];

  for (const log of seed.audit_logs) {
    const hash = await computeEntryHash(prevHash, {
      id: log.id,
      action: log.action,
      entity: log.entity,
      entity_id: log.entity_id,
      performed_by: log.performed_by,
      reason: log.reason,
      payload: log.payload,
      timestamp: log.timestamp,
    });
    hashedLogs.push({
      ...log,
      prev_hash: prevHash,
      hash,
    });
    prevHash = hash;
  }

  const db: LabloopDB = {
    ...seed,
    audit_logs: hashedLogs,
  };
  return db;
}

/**
 * Synchronous getDB reads from localStorage or initializes if missing.
 */
export function getDB(): LabloopDB {
  if (typeof window === 'undefined') {
    return getSeedData() as LabloopDB;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = getSeedData() as LabloopDB;
      saveDB(seed);
      // Trigger async hashing in background
      initializeSeedWithHashes().then((validDb) => {
        saveDB(validDb);
      });
      return seed;
    }
    const parsed = JSON.parse(raw) as LabloopDB;
    if (!parsed.version || parsed.version < 1) {
      return resetDemoData();
    }
    return parsed;
  } catch (err) {
    console.error('Failed reading DB from localStorage, resetting:', err);
    return resetDemoData();
  }
}

/**
 * Save DB state and broadcast to active tabs and components.
 */
export function saveDB(db: LabloopDB): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    notifyListeners(db);
  } catch (err) {
    console.error('Failed writing DB to localStorage:', err);
  }
}

/**
 * Reset demo data back to clean seed state.
 */
export function resetDemoData(): LabloopDB {
  const seed = getSeedData() as LabloopDB;
  saveDB(seed);
  initializeSeedWithHashes().then((validDb) => {
    saveDB(validDb);
  });
  return seed;
}

// ============================================================
// CRUD Functions
// ============================================================

// Users
export function getUsers(): User[] {
  return getDB().users;
}

export function getUserById(id: string): User | undefined {
  return getDB().users.find((u) => u.id === id);
}

export function updateUser(id: string, updates: Partial<User>): User {
  const db = getDB();
  const index = db.users.findIndex((u) => u.id === id);
  if (index === -1) throw new Error(`User ${id} not found`);
  const updated = { ...db.users[index], ...updates };
  db.users[index] = updated;
  saveDB(db);
  return updated;
}

// Resources
export function getResources(): Resource[] {
  return getDB().resources;
}

export function getResourceById(id: string): Resource | undefined {
  return getDB().resources.find((r) => r.id === id);
}

export function createResource(resource: Resource): Resource {
  const db = getDB();
  db.resources.unshift(resource);
  saveDB(db);
  return resource;
}

export function updateResource(id: string, updates: Partial<Resource>): Resource {
  const db = getDB();
  const index = db.resources.findIndex((r) => r.id === id);
  if (index === -1) throw new Error(`Resource ${id} not found`);
  const updated = { ...db.resources[index], ...updates };
  db.resources[index] = updated;
  saveDB(db);
  return updated;
}

export function deleteResource(id: string): void {
  const db = getDB();
  db.resources = db.resources.filter((r) => r.id !== id);
  saveDB(db);
}

// Bookings
export function getBookings(): Booking[] {
  return getDB().bookings;
}

export function getBookingById(id: string): Booking | undefined {
  return getDB().bookings.find((b) => b.id === id);
}

export function createBooking(booking: Booking): Booking {
  const db = getDB();
  db.bookings.unshift(booking);
  saveDB(db);
  return booking;
}

export function updateBooking(id: string, updates: Partial<Booking>): Booking {
  const db = getDB();
  const index = db.bookings.findIndex((b) => b.id === id);
  if (index === -1) throw new Error(`Booking ${id} not found`);
  const updated = { ...db.bookings[index], ...updates, updated_at: new Date().toISOString() };
  db.bookings[index] = updated;
  saveDB(db);
  return updated;
}

// Waitlist
export function getWaitlistByResource(resourceId: string): WaitlistEntry[] {
  return getDB()
    .waitlist.filter((w) => w.resource_id === resourceId)
    .sort((a, b) => a.position - b.position);
}

export function addWaitlistEntry(entry: WaitlistEntry): WaitlistEntry {
  const db = getDB();
  db.waitlist.push(entry);
  saveDB(db);
  return entry;
}

export function removeWaitlistEntry(id: string): void {
  const db = getDB();
  db.waitlist = db.waitlist.filter((w) => w.id !== id);
  saveDB(db);
}

export function recomputeWaitlistPositions(resourceId: string): WaitlistEntry[] {
  const db = getDB();
  const entries = db.waitlist.filter((w) => w.resource_id === resourceId);
  entries.sort((a, b) => b.priority_score - a.priority_score);
  entries.forEach((e, idx) => {
    e.position = idx + 1;
  });
  saveDB(db);
  return entries;
}

// Condition Reports
export function getConditionReports(): ConditionReport[] {
  return getDB().condition_reports;
}

export function getConditionReportsByBooking(bookingId: string): ConditionReport[] {
  return getDB().condition_reports.filter((cr) => cr.booking_id === bookingId);
}

export function addConditionReport(report: ConditionReport): ConditionReport {
  const db = getDB();
  db.condition_reports.unshift(report);
  saveDB(db);
  return report;
}

// Incidents
export function getIncidents(): Incident[] {
  return getDB().incidents;
}

export function getIncidentById(id: string): Incident | undefined {
  return getDB().incidents.find((i) => i.id === id);
}

export function createIncident(incident: Incident): Incident {
  const db = getDB();
  db.incidents.unshift(incident);
  saveDB(db);
  return incident;
}

export function updateIncident(id: string, updates: Partial<Incident>): Incident {
  const db = getDB();
  const index = db.incidents.findIndex((i) => i.id === id);
  if (index === -1) throw new Error(`Incident ${id} not found`);
  const updated = { ...db.incidents[index], ...updates, updated_at: new Date().toISOString() };
  db.incidents[index] = updated;
  saveDB(db);
  return updated;
}

// Notifications
export function getNotifications(userId?: string): Notification[] {
  const db = getDB();
  if (!userId) return db.notifications;
  return db.notifications
    .filter((n) => n.user_id === userId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function addNotification(
  userId: string,
  title: string,
  message: string,
  link?: string
): Notification {
  const db = getDB();
  const notif: Notification = {
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    user_id: userId,
    title,
    message,
    is_read: false,
    link,
    created_at: new Date().toISOString(),
  };
  db.notifications.unshift(notif);
  saveDB(db);
  return notif;
}

export function markNotificationRead(id: string): void {
  const db = getDB();
  const notif = db.notifications.find((n) => n.id === id);
  if (notif) {
    notif.is_read = true;
    saveDB(db);
  }
}

// Badges & UserBadges
export function getBadges(): Badge[] {
  return getDB().badges;
}

export function getUserBadges(userId: string): (UserBadge & { badge?: Badge })[] {
  const db = getDB();
  return db.user_badges
    .filter((ub) => ub.user_id === userId)
    .map((ub) => ({
      ...ub,
      badge: db.badges.find((b) => b.id === ub.badge_id),
    }));
}

export function addUserBadge(ub: UserBadge): UserBadge {
  const db = getDB();
  db.user_badges.unshift(ub);
  saveDB(db);
  return ub;
}

export function verifyUserBadge(id: string, verifiedBy: string): UserBadge {
  const db = getDB();
  const ub = db.user_badges.find((b) => b.id === id);
  if (!ub) throw new Error(`UserBadge ${id} not found`);
  ub.verified = true;
  ub.verified_by = verifiedBy;
  saveDB(db);
  return ub;
}

// Certificates
export function getCertificates(): Certificate[] {
  return getDB().certificates;
}

export function getCertificatesByUser(userId: string): Certificate[] {
  return getDB().certificates.filter((c) => c.user_id === userId);
}

export function createCertificate(cert: Certificate): Certificate {
  const db = getDB();
  db.certificates.unshift(cert);
  saveDB(db);
  return cert;
}

export function updateCertificate(id: string, updates: Partial<Certificate>): Certificate {
  const db = getDB();
  const index = db.certificates.findIndex((c) => c.id === id);
  if (index === -1) throw new Error(`Certificate ${id} not found`);
  const updated = { ...db.certificates[index], ...updates };
  db.certificates[index] = updated;
  saveDB(db);
  return updated;
}

// ============================================================
// Append-Only Cryptographic Audit Logging
// ============================================================

export function getAuditLogs(): AuditLog[] {
  return getDB().audit_logs;
}

export async function appendAuditLog(params: {
  action: string;
  entity: string;
  entity_id: string;
  performed_by: string | null;
  reason?: string;
  payload?: Record<string, unknown>;
}): Promise<AuditLog> {
  const db = getDB();
  const lastLog = db.audit_logs[db.audit_logs.length - 1];
  const prevHash =
    lastLog?.hash || '0000000000000000000000000000000000000000000000000000000000000000';

  const newLogData = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    action: params.action,
    entity: params.entity,
    entity_id: params.entity_id,
    performed_by: params.performed_by,
    reason: params.reason || '',
    payload: params.payload || {},
    timestamp: new Date().toISOString(),
  };

  const hash = await computeEntryHash(prevHash, newLogData);
  const newLog: AuditLog = {
    ...newLogData,
    prev_hash: prevHash,
    hash,
  };

  db.audit_logs.push(newLog);
  saveDB(db);
  return newLog;
}

// Setup cross-tab synchronization listener
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        const updated = JSON.parse(e.newValue) as LabloopDB;
        notifyListeners(updated);
      } catch (err) {
        console.error('Error syncing cross-tab storage:', err);
      }
    }
  });
}
