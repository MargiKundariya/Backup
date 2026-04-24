import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, serverError, notFound } from '@/lib/auth';
import { getDesignById, updateDesign, deleteDesign } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const payload = await requireAuth(req);
    const design = await getDesignById(id, payload.sub);
    if (!design) return notFound('Design not found');
    return NextResponse.json({ design });
  } catch (err) {
    return serverError(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const payload = await requireAuth(req);
    const body = await req.json();
    const design = await updateDesign(id, payload.sub, body);
    return NextResponse.json({ design });
  } catch (err) {
    return serverError(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const payload = await requireAuth(req);
    await deleteDesign(id, payload.sub);
    return NextResponse.json({ success: true });
  } catch (err) {
    return serverError(err);
  }
}
