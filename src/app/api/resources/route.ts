// ============================================================
// LabLoop Enterprise — Resources API
// ============================================================
// GET  /api/resources  -> list all resources (latest server data)
// POST /api/resources -> create a new resource
// ============================================================

import { NextResponse } from 'next/server';
import { getServerDB, patchServerDB } from '@/lib/server-store';
import { Resource } from '@/lib/types';

export async function GET() {
  try {
    const db = await getServerDB();
    return NextResponse.json({ resources: db.resources, source: 'server' });
  } catch (err) {
    console.error('GET /api/resources failed:', err);
    return NextResponse.json(
      { error: 'Failed to load resources', detail: (err as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { resource?: Resource };
    if (!body?.resource) {
      return NextResponse.json(
        { error: 'Missing "resource" object in request body' },
        { status: 400 }
      );
    }
    const resource: Resource = body.resource;
    if (!resource.id) {
      return NextResponse.json({ error: 'Resource must have an id' }, { status: 400 });
    }

    const db = await getServerDB();
    const exists = db.resources.some((r) => r.id === resource.id);
    if (exists) {
      return NextResponse.json(
        { error: `Resource ${resource.id} already exists; use PATCH to update` },
        { status: 409 }
      );
    }

    const updated = await patchServerDB({
      resources: [resource, ...db.resources],
    });
    return NextResponse.json({ resource, db: updated, source: 'server' });
  } catch (err) {
    console.error('POST /api/resources failed:', err);
    return NextResponse.json(
      { error: 'Failed to create resource', detail: (err as Error).message },
      { status: 500 }
    );
  }
}