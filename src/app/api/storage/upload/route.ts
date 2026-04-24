import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { requireAuth, serverError, badRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const payload = await requireAuth(req);
    const data = await req.formData();
    const file = data.get('file') as File;
    const path = data.get('path') as string;

    if (!file || !path) {
      return badRequest('File and path are required');
    }

    const supabase = getServiceClient();
    
    // Upload to 'design-images' bucket as per storageUpload.ts and CLAUDE.md
    const { data: uploadData, error } = await supabase.storage
      .from('design-images')
      .upload(path, file, { upsert: true });

    if (error) {
      console.error('[storage upload error]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('design-images')
      .getPublicUrl(path);

    return NextResponse.json({ path: publicUrl });
  } catch (err) {
    return serverError(err);
  }
}
