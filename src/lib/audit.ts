// ============================================================
// LabLoop Enterprise — Cryptographic SHA-256 Hash Chained Audit Ledger
// ============================================================

import { AuditLog } from './types';

/**
 * Deterministically serialize an object by recursively sorting its keys.
 */
export function canonicalJson(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalJson).join(',') + ']';
  }
  const sortedKeys = Object.keys(obj as Record<string, unknown>).sort();
  const entries = sortedKeys.map(
    (k) => JSON.stringify(k) + ':' + canonicalJson((obj as Record<string, unknown>)[k])
  );
  return '{' + entries.join(',') + '}';
}

/**
 * Compute SHA-256 hex digest using browser/Node standard Web Crypto API.
 */
export async function sha256(str: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const enc = new TextEncoder();
    const data = enc.encode(str);
    const hashBuf = await crypto.subtle.digest('SHA-256', data);
    const hashArr = Array.from(new Uint8Array(hashBuf));
    return hashArr.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Node fallback if run in pure node tests
  const cryptoNode = await import('crypto');
  return cryptoNode.createHash('sha256').update(str).digest('hex');
}

/**
 * Calculate the cryptographic hash for an audit log entry.
 */
export async function computeEntryHash(
  prevHash: string,
  entryData: {
    id: string;
    action: string;
    entity: string;
    entity_id: string;
    performed_by: string | null;
    reason?: string;
    payload: Record<string, unknown>;
    timestamp: string;
  }
): Promise<string> {
  const content = canonicalJson({
    id: entryData.id,
    action: entryData.action,
    entity: entryData.entity,
    entity_id: entryData.entity_id,
    performed_by: entryData.performed_by,
    reason: entryData.reason || '',
    payload: entryData.payload,
    timestamp: entryData.timestamp,
  });
  return sha256(prevHash + ':' + content);
}

/**
 * Verify the cryptographic integrity of the entire audit log chain.
 * Returns valid=true if every block's prev_hash matches the prior block's hash
 * and the recomputed hash matches the stored hash.
 */
export async function verifyAuditChain(
  logs: AuditLog[]
): Promise<{ valid: boolean; broken_at?: string; index?: number; message: string }> {
  if (!logs || logs.length === 0) {
    return { valid: true, message: 'Audit log is empty. Integrity intact.' };
  }

  for (let i = 0; i < logs.length; i++) {
    const current = logs[i];

    // Verify linkage to prior block
    if (i > 0) {
      const prev = logs[i - 1];
      if (current.prev_hash !== prev.hash) {
        return {
          valid: false,
          broken_at: current.id,
          index: i,
          message: `Hash link broken at index ${i} (${current.id}). Expected prev_hash "${prev.hash.slice(0, 12)}..." but found "${current.prev_hash.slice(0, 12)}...".`,
        };
      }
    }

    // Verify hash of this block
    const expectedHash = await computeEntryHash(current.prev_hash, {
      id: current.id,
      action: current.action,
      entity: current.entity,
      entity_id: current.entity_id,
      performed_by: current.performed_by,
      reason: current.reason,
      payload: current.payload,
      timestamp: current.timestamp,
    });

    if (current.hash !== expectedHash) {
      return {
        valid: false,
        broken_at: current.id,
        index: i,
        message: `Tamper detected on log ${current.id} (${current.action}). Payload or metadata was modified after signing. Stored: "₹{current.hash.slice(0, 12)}...", Recomputed: "₹{expectedHash.slice(0, 12)}...".`,
      };
    }
  }

  return {
    valid: true,
    message: `Audit chain verified successfully. ${logs.length} events mathematically validated with SHA-256 merkle-linkage. Zero tampering detected.`,
  };
}
