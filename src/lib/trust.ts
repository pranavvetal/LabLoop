// ============================================================
// LabLoop Enterprise — Trust Tier Computation & Level-Up Actions
// ============================================================

import { User, TrustTier } from './types';

export interface TrustTierMilestone {
  tier: TrustTier;
  title: string;
  description: string;
  minBadges: number;
  minReturns: number;
  minCleanReports: number;
  allowedEquipment: string;
}

export const TRUST_TIER_DEFINITIONS: TrustTierMilestone[] = [
  {
    tier: 0,
    title: 'Tier 0 — New Member',
    description: 'Basic access to student bench tools, introductory 3D printers, and general workshop spaces.',
    minBadges: 0,
    minReturns: 0,
    minCleanReports: 0,
    allowedEquipment: '3D Printers, Soldering Irons, Hand Tools',
  },
  {
    tier: 1,
    title: 'Tier 1 — Verified Maker',
    description: 'Autonomous access to high-power fabrication tools after completing certified training.',
    minBadges: 1,
    minReturns: 1,
    minCleanReports: 1,
    allowedEquipment: 'Industrial Laser Cutters, CNC Routers, Power Saws',
  },
  {
    tier: 2,
    title: 'Tier 2 — Trusted Researcher',
    description: 'Independent clearance for bio-containment equipment, chemical analyzers, and high-value optics.',
    minBadges: 2,
    minReturns: 5,
    minCleanReports: 5,
    allowedEquipment: 'Bio-Incubators, Spectrometers, Mixed-Signal Analyzers',
  },
  {
    tier: 3,
    title: 'Tier 3 — Expert / Lab Director',
    description: 'Full supervisory authority, equipment listing rights, peer badge verification, and penalty overrides.',
    minBadges: 3,
    minReturns: 15,
    minCleanReports: 15,
    allowedEquipment: 'Cleanroom Equipment, High-Speed Spectral Imagers, Electron Microscopes',
  },
];

/**
 * Deterministically compute a user's trust tier based on verified credentials and track record.
 */
export function computeTrustTier(user: User, verifiedBadgesCount: number): TrustTier {
  if (['owner', 'manager', 'admin'].includes(user.role)) {
    return 3;
  }

  // Sanctions immediately cap trust tier
  if (!user.good_standing || user.open_incidents > 0 || user.no_show_count >= 2) {
    return 0;
  }

  if (
    verifiedBadgesCount >= 3 &&
    user.on_time_returns >= 15 &&
    user.clean_condition_reports >= 15
  ) {
    return 3;
  }

  if (
    verifiedBadgesCount >= 2 &&
    user.on_time_returns >= 5 &&
    user.clean_condition_reports >= 5 &&
    user.no_show_count === 0
  ) {
    return 2;
  }

  if (verifiedBadgesCount >= 1 && user.on_time_returns >= 1) {
    return 1;
  }

  return 0;
}

/**
 * Returns exact checklist items the user must complete to unlock the next Trust Tier.
 */
export function getTierActionsToLevelUp(
  user: User,
  verifiedBadgesCount: number
): { task: string; completed: boolean }[] {
  const current = user.trust_tier;
  if (current >= 3) {
    return [
      { task: 'Maximum Trust Tier 3 achieved (Expert Standing)', completed: true },
      { task: 'Maintain zero open safety incident inquiries', completed: user.open_incidents === 0 },
    ];
  }

  const nextTier = (current + 1) as TrustTier;
  const def = TRUST_TIER_DEFINITIONS[nextTier];

  return [
    {
      task: `Hold at least ${def.minBadges} verified safety badges (Current: ${verifiedBadgesCount})`,
      completed: verifiedBadgesCount >= def.minBadges,
    },
    {
      task: `Complete ${def.minReturns} on-time equipment returns (Current: ${user.on_time_returns})`,
      completed: user.on_time_returns >= def.minReturns,
    },
    {
      task: `Submit ${def.minCleanReports} clean condition reports (Current: ${user.clean_condition_reports})`,
      completed: user.clean_condition_reports >= def.minCleanReports,
    },
    {
      task: 'Zero open disciplinary incident inquiries',
      completed: user.open_incidents === 0,
    },
    {
      task: 'Zero unexcused no-shows',
      completed: user.no_show_count === 0,
    },
  ];
}
