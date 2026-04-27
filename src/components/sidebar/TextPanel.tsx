'use client';

import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useEditorStore } from '@/lib/store';
import { TextLayer } from '@/types';
import { Button } from '@/components/ui/Button';
import { Type, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/Toast';

const FONTS = [
  'Arial',
  'Helvetica',
  'Georgia',
  'Times New Roman',
  'Courier New',
  'Verdana',
  'Impact',
  'Comic Sans MS',
];

export function TextPanel() {
  const activeZoneId = useEditorStore((s) => s.activeZoneId);
  const zoneDesigns = useEditorStore((s) => s.zoneDesigns);
  const addTextLayer = useEditorStore((s) => s.addTextLayer);
  const updateTextLayer = useEditorStore((s) => s.updateTextLayer);
  const removeTextLayer = useEditorStore((s) => s.removeTextLayer);
  const selectedDevice = useEditorStore((s) => s.selectedDevice);

  const [newText, setNewText] = useState('');
  const [font, setFont] = useState('Arial');
  const [fontSize, setFontSize] = useState(48);
  const [color, setColor] = useState('#ffffff');
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);

  useEffect(() => {
    setEditingLayerId(null);
    setNewText('');
  }, [activeZoneId]);

  const currentDesign = activeZoneId ? zoneDesigns[activeZoneId] : null;
  const textLayers = currentDesign?.textLayers || [];

  const selectForEditing = (layer: TextLayer) => {
    setEditingLayerId(layer.id);
    setNewText(layer.content);
    setFont(layer.fontFamily);
    setFontSize(layer.fontSize);
    setColor(layer.color);
  };

  const cancelEditing = () => {
    setEditingLayerId(null);
    setNewText('');
    setFont('Arial');
    setFontSize(48);
    setColor('#ffffff');
  };

  const handleSubmit = () => {
    if (!activeZoneId || !newText.trim() || !selectedDevice) return;

    if (editingLayerId !== null) {
      updateTextLayer(activeZoneId, editingLayerId, {
        content: newText,
        fontFamily: font,
        fontSize,
        color,
      });
      cancelEditing();
    } else {
      // Calculate center of device for initial placement
      const centerX = (selectedDevice.dimensions?.width || 1000) / 2;
      const centerY = (selectedDevice.dimensions?.height || 1000) / 2;

      const layer: TextLayer = {
        id: uuidv4(),
        content: newText,
        fontFamily: font,
        fontSize,
        color,
        transform: { 
          x: centerX - (newText.length * fontSize * 0.3), // Rough horizontal center adjustment
          y: centerY - (fontSize / 2),
          scaleX: 1, 
          scaleY: 1, 
          rotation: 0 
        },
      };
      addTextLayer(activeZoneId, layer);
      setNewText('');
      toast('Text added to mockup', 'success');
      
      // Auto-select for editing to show it's active
      setEditingLayerId(layer.id);
    }
  };

  if (!activeZoneId) {
    return <p className="text-xs text-text-muted">Select a zone to add text</p>;
  }

  return (
    <div className="space-y-2">
      {editingLayerId && (
        <p className="text-[10px] text-accent font-medium">Editing layer</p>
      )}

      <input
        type="text"
        placeholder="Enter text..."
        value={newText}
        onChange={(e) => setNewText(e.target.value)}
        className="w-full px-3 py-1.5 text-sm rounded-lg bg-surface border border-border focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent placeholder:text-text-muted transition-all duration-200"
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
      />

      <div className="grid grid-cols-2 gap-2">
        <select
          value={font}
          onChange={(e) => setFont(e.target.value)}
          className="px-2 py-1 text-xs rounded-lg bg-surface border border-border focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all duration-200"
        >
          {FONTS.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
        <div className="flex gap-1 items-center">
          <input
            type="number"
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            min={8}
            max={200}
            className="w-16 px-2 py-1 text-xs font-mono tabular-nums border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all duration-200"
          />
          <span className="text-xs text-text-muted">px</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="w-8 h-8 rounded-lg cursor-pointer border border-border shadow-sm"
        />
        <span className="text-xs text-text-muted">{color}</span>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleSubmit} size="sm" className="flex-1 flex items-center justify-center gap-1" disabled={!newText.trim()}>
          <Type size={12} />
          {editingLayerId ? 'Update' : 'Add Text'}
        </Button>
        {editingLayerId && (
          <button
            onClick={cancelEditing}
            className="px-3 py-1 text-xs rounded-lg bg-surface-hover text-text-secondary border border-border hover:bg-border-subtle transition-all duration-200"
          >
            Cancel
          </button>
        )}
      </div>

      {textLayers.length > 0 && (
        <div className="space-y-1">
          {textLayers.map((layer) => (
            <div
              key={layer.id}
              onClick={() => selectForEditing(layer)}
              title="Click to edit this text layer"
              className={`flex items-center justify-between p-2 rounded-lg text-xs group cursor-pointer transition-all duration-200 ${
                editingLayerId === layer.id
                  ? 'bg-accent-light border border-accent/30'
                  : 'bg-surface-hover hover:bg-border-subtle'
              }`}
            >
              <span className="truncate flex-1" style={{ fontFamily: layer.fontFamily, color: layer.color }}>
                {layer.content}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); removeTextLayer(activeZoneId, layer.id); }}
                title="Remove text layer"
                className="ml-2 text-text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-50 transition-all"
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
