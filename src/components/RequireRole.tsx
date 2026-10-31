// ============================================================
// LabLoop Enterprise — RequireRole Component
// ============================================================

"use client";

import React from 'react';
import { User, Resource, Booking, AuditLog } from '@/lib/types';
import { can, Action } from '@/lib/permissions';

export interface RequireRoleProps {
  user: User | null | undefined;
  action: Action;
  subject?: Resource | Booking | AuditLog | Record<string, unknown> | null;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const RequireRole: React.FC<RequireRoleProps> = ({
  user,
  action,
  subject,
  children,
  fallback = null,
}) => {
  if (can(user, action, subject)) {
    return <>{children}</>;
  }
  return <>{fallback}</>;
};

export default RequireRole;
