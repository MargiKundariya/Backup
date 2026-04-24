import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireAdmin, serverError, badRequest } from '@/lib/auth';
import { getAllDBDevices, getDBDevice, createDBDevice, approveDBDevice, updateDBDevice, deleteDBDevice, updateDBDeviceZones } from '@/lib/db';
import { v5 as uuidv5 } from 'uuid';

const NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

export async function GET(req: NextRequest) {
  try {
    const payload = await requireAuth(req);
    const devices = await getAllDBDevices(payload.sub, payload.role === 'super_admin');
    return NextResponse.json({ devices });
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = await requireAuth(req);
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'create':
        // If super_admin, it's globally approved by default. 
        // If regular user, it's private (not approved).
        const isApproved = payload.role === 'super_admin';
        
        const device = await createDBDevice({
          ...body.device,
          owner_user_id: payload.sub,
          template_path: body.device.templatePath || ''
        }, isApproved);
        
        return NextResponse.json({ device });

      case 'approve':
        await requireAdmin(req);
        const approved = await approveDBDevice(body.id, body.isApproved !== undefined ? body.isApproved : true);
        return NextResponse.json({ device: approved });

      case 'update': {
        const oldDeviceForUpdate = await getDBDevice(body.device.id);
        const ownerIdForUpdate = payload.role === 'super_admin' ? undefined : payload.sub;

        if (payload.role === 'super_admin' && oldDeviceForUpdate?.owner_user_id) {
          const backupId = uuidv5(oldDeviceForUpdate.id, NAMESPACE);
          const existingBackup = await getDBDevice(backupId);
          if (!existingBackup) {
            await createDBDevice({ 
              ...oldDeviceForUpdate, 
              id: backupId, 
              name: `${oldDeviceForUpdate.name} (Original)`,
              is_approved: false 
            });
          }
        }

        const updated = await updateDBDevice(body.device.id, body.device, ownerIdForUpdate);
        
        if (!updated) {
          return NextResponse.json({ error: 'Device not found or access denied' }, { status: 404 });
        }
        return NextResponse.json({ device: updated });
      }

      case 'delete':
        const ownerIdForDelete = payload.role === 'super_admin' ? undefined : payload.sub;
        await deleteDBDevice(body.id, ownerIdForDelete);
        return NextResponse.json({ success: true });

      case 'update_zones': {
        await requireAdmin(req);
        const oldDeviceForZones = await getDBDevice(body.id);
        
        if (payload.role === 'super_admin' && oldDeviceForZones?.owner_user_id) {
          const backupId = uuidv5(oldDeviceForZones.id, NAMESPACE);
          const existingBackup = await getDBDevice(backupId);
          if (!existingBackup) {
            await createDBDevice({ 
              ...oldDeviceForZones, 
              id: backupId, 
              name: `${oldDeviceForZones.name} (Original)`,
              is_approved: false 
            });
          }
        }

        const zoned = await updateDBDeviceZones(body.id, body.zones);
        return NextResponse.json({ device: zoned });
      }

      default:
        return badRequest('Invalid action');
    }
  } catch (err) {
    console.error('[devices api POST error]', err);
    return serverError(err);
  }
}
