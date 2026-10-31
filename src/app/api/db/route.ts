// ============================================================
// LabLoop Enterprise — Shared DB API
// ============================================================
// GET  /api/db  -> returns the full authoritative LabloopDB
// POST /api/db  -> applies a partial patch and returns the new DB
//
// This is the single source of truth that every browser instance reads
// and writes, which is what makes equipment additions, edits, and
// deletions synchronize across devices.
// ============================================================

import { NextResponse } from 'next/server';
import { getServerDB, patchServerDB } from '@/lib/server-store';
import { LabloopDB } from '@/lib/db';

export async function GET() {
  try {
    const db = await getServerDB();
    return NextResponse.json({ db, source: 'server' });
  } catch (err) {
    console.error('GET /api/db failed:', err);
    return NextResponse.json(
      { error: 'Failed to load database', detail: (err as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { db?: Partial<LabloopDB> };
    if (!body || typeof body !== 'object' || body.db === undefined) {
      return NextResponse.json(
        { error: 'Missing "db" patch object in request body' },
        { status: 400 }
      );
    }
    const updated = await patchServerDB(body.db);
    return NextResponse.json({ db: updated, source: 'server' });
  } catch (err) {
    console.error('POST /api/db failed:', err);
    return NextResponse.json(
      { error: 'Failed to persist database', detail: (err as Error).message },
      { status: 500 }
    );
  }
}