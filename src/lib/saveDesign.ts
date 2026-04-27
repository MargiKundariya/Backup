import { getBrowserClient, isSupabaseConfigured } from './supabase';
import { uploadZoneImage } from './storageUpload';
import { useEditorStore } from './store';
import { captureException } from './analytics';

/**
 * Manually trigger a save of the current design to the backend.
 * This is used for immediate saves (e.g. when minimizing the menu).
 */
export async function saveWork() {
  const state = useEditorStore.getState();
  const { selectedDevice, zoneDesigns, exportOptions, currentDesignId, currentProjectId } = state;

  if (!selectedDevice || !isSupabaseConfigured()) return;

  state.setSaveState('saving');

  try {
    const sb = getBrowserClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) {
      state.setSaveState('idle');
      return;
    }

    let designId = currentDesignId;
    let projectId = currentProjectId;

    // 1. Ensure project exists
    if (!projectId) {
      const { data: proj, error: projErr } = await sb
        .from('projects')
        .insert({ user_id: user.id, name: 'My Project' })
        .select('id')
        .single();
      if (projErr) throw projErr;
      projectId = proj.id;
      state.setCurrentProjectId(projectId);
    }

    // 2. Ensure design exists
    if (!designId) {
      const { data: design, error: designErr } = await sb
        .from('designs')
        .insert({
          user_id: user.id,
          project_id: projectId,
          name: selectedDevice.name,
          device_id: selectedDevice.id,
          zone_designs: {},
          export_options: exportOptions,
        })
        .select('id')
        .single();
      if (designErr) throw designErr;
      designId = design.id;
      state.setCurrentDesignId(designId);
    }

    // 3. Upload images
    const storageKeys: Record<string, string> = {};
    await Promise.allSettled(
      Object.entries(zoneDesigns).map(async ([zoneId, design]) => {
        if (!design.designImage) return;
        
        // Note: For simplicity in this manual save, we re-upload or rely on standard paths.
        // The auto-save hook handles the smart deduplication via savedImagesRef.
        const storageKey = await uploadZoneImage(
          user.id,
          designId!,
          zoneId,
          design.designImage,
        );
        storageKeys[zoneId] = storageKey;
      })
    );

    // 4. Build metadata
    const zoneDesignsMeta: Record<string, unknown> = {};
    for (const [id, design] of Object.entries(zoneDesigns)) {
      zoneDesignsMeta[id] = {
        transform: design.transform,
        textLayers: design.textLayers,
        storageKey: storageKeys[id] ?? null,
      };
    }

    // 5. Update row
    const { error } = await sb
      .from('designs')
      .update({
        zone_designs: zoneDesignsMeta,
        export_options: exportOptions,
        device_id: selectedDevice.id,
        name: selectedDevice.name,
      })
      .eq('id', designId);
    
    if (error) throw error;

    state.setSaveState('saved');
    setTimeout(() => state.setSaveState('idle'), 2000);
  } catch (err) {
    console.error('[ManualSave]', err);
    captureException(err);
    state.setSaveState('error');
  }
}
