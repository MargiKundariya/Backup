export interface Transform {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  flipH?: boolean;
  flipV?: boolean;
  opacity?: number; // 0-1, default 1
}

export interface SkinZone {
  id: string;
  name: string;
  bounds: { x: number; y: number; width: number; height: number };
}

export interface DeviceTemplate {
  id: string;
  name: string;
  brand: string;
  model: string;
  category: 'phone' | 'laptop' | 'tablet' | 'watch';
  templatePath: string;
  dimensions: { width: number; height: number };
  zones: SkinZone[];
  isCustom: boolean;
  is_approved?: boolean;
  owner_user_id?: string | null;
}

export interface TextLayer {
  id: string;
  content: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  transform: Transform;
}

export interface ZoneDesign {
  designImage: string | null; // data URL
  transform: Transform;
  textLayers: TextLayer[];
}

export interface DesignState {
  selectedDevice: DeviceTemplate | null;
  activeZoneId: string | null;
  zoneDesigns: Record<string, ZoneDesign>;
  backgroundScene: string | null;
}

export interface ProcessedTemplate {
  deviceId: string;
  zoneMasks: Record<string, ImageData>;
  zoneOverlays: Record<string, ImageData>;
  originalImage: HTMLImageElement;
}

export interface BackgroundScene {
  id: string;
  name: string;
  type: 'solid' | 'gradient' | 'image';
  value: string; // color, gradient CSS, or image path
  thumbnail?: string;
}

export type ResolutionPreset = 'auto' | 'etsy' | 'amazon' | 'shopify' | 'custom';
export type ComplianceBackground = 'scene' | 'white' | 'black' | 'transparent';

export interface ExportOptions {
  format: 'png' | 'jpeg';
  quality: number; // 0-1
  scale: number; // 1x or 2x (used only when resolutionPreset === 'auto')
  includeBackground: boolean;
  filenamePattern: string;
  /** Fixed output canvas size — 'auto' keeps device dimensions × scale */
  resolutionPreset: ResolutionPreset;
  /** Square pixel size used when resolutionPreset === 'custom' */
  customOutputSize: number;
  /** Override background colour for store compliance */
  complianceBackground: ComplianceBackground;
  /** Add user logo as watermark */
  addWatermark?: boolean;
  /** Custom text for repeating watermark */
  watermarkText?: string;
  /** Explicit control over what elements are shown in the watermark */
  watermarkMode?: 'text' | 'logo' | 'both';
}

export interface BulkExportItem {
  deviceId: string;
  designImage: string;
  designName: string;
}

/** Per-design position capture used in Export staging mode */
export interface PerDesignTransform {
  transform: Transform;
  zoneBounds: { x: number; y: number; width: number; height: number };
}
