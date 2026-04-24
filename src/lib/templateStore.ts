import { create } from 'zustand';
import { DeviceTemplate, SkinZone } from '@/types';

interface TemplateStoreState {
  customDevices: DeviceTemplate[];
  loading: boolean;
  loadCustomDevices: () => Promise<void>;
  addCustomDevice: (device: DeviceTemplate, imageDataUrl: string) => Promise<void>;
  updateCustomDevice: (device: DeviceTemplate) => Promise<void>;
  removeCustomDevice: (id: string) => Promise<void>;
  approveDevice: (id: string) => Promise<void>;
  updateZones: (deviceId: string, zones: SkinZone[]) => Promise<void>;
}

export const useTemplateStore = create<TemplateStoreState>((set, get) => ({
  customDevices: [],
  loading: false,

  loadCustomDevices: async () => {
    set({ loading: true });
    try {
      const res = await fetch('/api/devices');
      const data = await res.json();
      if (data.devices) {
        const mapped = data.devices.map((d: any) => ({
          ...d,
          templatePath: d.template_path,
        }));
        set({ customDevices: mapped });
      }
    } catch (err) {
      console.error('Failed to load devices from DB', err);
    } finally {
      set({ loading: false });
    }
  },

  addCustomDevice: async (device, imageDataUrl) => {
    try {
      const res = await fetch('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'create', 
          device: { ...device, templatePath: imageDataUrl } 
        }),
      });
      
      if (res.ok) {
        const { device: newDevice } = await res.json();
        const mapped = { ...newDevice, templatePath: newDevice.template_path };
        set((state) => ({
          customDevices: [mapped, ...state.customDevices],
        }));
      } else {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server returned ${res.status}`);
      }
    } catch (err) {
      console.error('Failed to save device to DB', err);
      throw err;
    }
  },

  approveDevice: async (id: string, isApproved: boolean = true) => {
    try {
      const res = await fetch('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', id, isApproved }),
      });
      if (res.ok) {
        set((state) => ({
          customDevices: state.customDevices.map((d) => 
            d.id === id ? { ...d, is_approved: isApproved } : d
          )
        }));
      }
    } catch (err) {
      console.error('Failed to update device status', err);
    }
  },

  updateCustomDevice: async (device) => {
    try {
      const res = await fetch('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', device }),
      });
      if (res.ok) {
        await get().loadCustomDevices();
      }
    } catch (err) {
      console.error('Failed to update device in DB', err);
    }
  },

  removeCustomDevice: async (id) => {
    try {
      const res = await fetch('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id }),
      });
      if (res.ok) {
        await get().loadCustomDevices();
      }
    } catch (err) {
      console.error('Failed to delete device from DB', err);
    }
  },

  updateZones: async (deviceId, zones) => {
    try {
      const res = await fetch('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_zones',
          id: deviceId,
          zones
        }),
      });
      if (res.ok) {
        await get().loadCustomDevices();
      }
    } catch (err) {
      console.error('Failed to update zones in DB', err);
    }
  },
}));
