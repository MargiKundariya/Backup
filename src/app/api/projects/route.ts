import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { requireAuth, serverError } from '@/lib/auth';
import { getProjects, createProject } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const payload = await requireAuth(req);
    const projects = await getProjects(payload.sub);
    return NextResponse.json({ projects });
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = await requireAuth(req);
    const { name } = await req.json();
    const project = await createProject(payload.sub, name);
    return NextResponse.json({ project });
  } catch (err) {
    return serverError(err);
  }
}
