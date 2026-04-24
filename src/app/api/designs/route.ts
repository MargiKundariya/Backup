import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { requireAuth, serverError } from '@/lib/auth';
import { getDesigns, createDesign, getUserDesigns, getProjects, createProject } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const payload = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('project_id');
    
    if (projectId) {
      const designs = await getDesigns(projectId, payload.sub);
      return NextResponse.json({ designs });
    }

    // If no project_id, return all designs for user (needed for dashboard)
    const designs = await getUserDesigns(payload.sub);
    return NextResponse.json({ designs });
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = await requireAuth(req);
    const body = await req.json();
    
    let projectId = body.project_id;
    if (!projectId) {
       const projects = await getProjects(payload.sub);
       if (projects.length > 0) {
          projectId = projects[0].id;
       } else {
          const newProject = await createProject(payload.sub, 'Default Project');
          projectId = newProject.id;
       }
    }

    const design = await createDesign({ ...body, project_id: projectId, user_id: payload.sub });
    return NextResponse.json({ design });
  } catch (err) {
    return serverError(err);
  }
}
