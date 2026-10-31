// ============================================================
// LabLoop Enterprise — Single Resource API
// ============================================================
// PATCH /api/resources/[id]  -> update a resource
// DELETE /api/resources/[id] -> delete a resource
// ============================================================

import { NextResponse } from 'next/server';
import { getServerDB, patchServerDB } from '@/lib/server-store';
import { Resource } from '@/lib/types';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const body = (await req.json()) as { resource?: Partial<Resource> };
    if (!body?.resource) {
      return NextResponse.json(
        { error: 'Missing "resource" patch object in request body' },
        { status: 400 }
      );
    }

    const db = await getServerDB();
    const index = db.resources.findIndex((r) => r.id === id);
    if (index === -1) {
      return NextResponse.json({ error: `Resource ${id} not found` }, { status: 404 });
    }

    const updated: Resource = { ...db.resources[index], ...body.resource, id };
    const resources = db.resources.map((r) => (r.id === id ? updated : r));
    const newDb = await patchServerDB({ resources });
    return NextResponse.json({ resource: updated, db: newDb, source: 'server' });
  } catch (err) {
    console.error(`PATCH /api/resources/[id] failed:`, err);
    return NextResponse.json(
      { error: 'Failed to update resource', detail: (err as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const db = await getServerDB();
    const exists = db.resources.some((r) => r.id === id);
    if (!exists) {
      return NextResponse.json({ error: `Resource ${id} not found` }, { status: 404 });
    }

    const resources = db.resources.filter((r) => r.id !== id);
    const newDb = await patchServerDB({ resources });
    return NextResponse.json({ deleted: id, db: newDb, source: 'server' });
  } catch (err) {
    console.error(`DELETE /api/resources/[id] failed:`, err);
    return NextResponse.json(
      { error: 'Failed to delete resource', detail: (err as Error).message },
      { status: 500 }
    );
  }
}