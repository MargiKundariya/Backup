import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import environment
const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  if (line && !line.startsWith('#')) {
    const [k, ...v] = line.split('=');
    if (k) env[k.trim()] = v.join('=').trim();
  }
});

const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Helper definitions matching src/data/devices.ts
const phoneZone = (id) => ([{
  id: `${id}-back`,
  name: 'Back Panel',
  bounds: { x: 0, y: 0, width: 972, height: 2000 },
}]);

const tabletZone = (id) => ([{
  id: `${id}-back`,
  name: 'Back Panel',
  bounds: { x: 0, y: 0, width: 972, height: 1340 },
}]);

const laptopZones = (id) => ([
  { id: `${id}-lid`,      name: 'Lid / Back',  bounds: { x: 50,  y: 50,   width: 1900, height: 700 } },
  { id: `${id}-palmrest`, name: 'Palm Rest',   bounds: { x: 150, y: 800,  width: 1700, height: 400 } },
  { id: `${id}-trackpad`, name: 'Trackpad',    bounds: { x: 700, y: 1200, width: 600,  height: 250 } },
]);

const watchZone = (id) => ([{
  id: `${id}-strap`,
  name: 'Strap / Band',
  bounds: { x: 200, y: 0, width: 572, height: 2000 },
}]);

const PHONE_FALLBACK = '/templates/phones/iphone-15.png';
const PHONE_WIDE_FALLBACK = '/templates/phones/iphone-15-pro-max.png';
const LAPTOP_APPLE_FALLBACK = '/templates/laptops/macbook-air-m1.png';
const LAPTOP_WIN_FALLBACK = '/templates/laptops/hp-victus.png';
const TABLET_FALLBACK = '/templates/phones/iphone-15-pro-max.png';
const WATCH_FALLBACK = '/templates/phones/iphone-11.png';

// Reconstruct the builtInDevices array (simplified for migration)
const data = [
  // iPhones
  { id: 'iphone-16-pro-max', name: 'iPhone 16 Pro Max', brand: 'Apple', category: 'phone', templatePath: PHONE_WIDE_FALLBACK, dimensions: { width: 972, height: 2000 }, zones: phoneZone('iphone-16-pro-max'), isCustom: false },
  { id: 'iphone-16-pro', name: 'iPhone 16 Pro', brand: 'Apple', category: 'phone', templatePath: PHONE_FALLBACK, dimensions: { width: 972, height: 2000 }, zones: phoneZone('iphone-16-pro'), isCustom: false },
  { id: 'iphone-16-plus', name: 'iPhone 16 Plus', brand: 'Apple', category: 'phone', templatePath: PHONE_WIDE_FALLBACK, dimensions: { width: 972, height: 2000 }, zones: phoneZone('iphone-16-plus'), isCustom: false },
  { id: 'iphone-16', name: 'iPhone 16', brand: 'Apple', category: 'phone', templatePath: PHONE_FALLBACK, dimensions: { width: 972, height: 2000 }, zones: phoneZone('iphone-16'), isCustom: false },
  { id: 'iphone-15-pro-max', name: 'iPhone 15 Pro Max', brand: 'Apple', category: 'phone', templatePath: '/templates/phones/iphone-15-pro-max.png', dimensions: { width: 972, height: 2000 }, zones: phoneZone('iphone-15-pro-max'), isCustom: false },
  { id: 'iphone-15-pro', name: 'iPhone 15 Pro', brand: 'Apple', category: 'phone', templatePath: PHONE_FALLBACK, dimensions: { width: 972, height: 2000 }, zones: phoneZone('iphone-15-pro'), isCustom: false },
  { id: 'iphone-15-plus', name: 'iPhone 15 Plus', brand: 'Apple', category: 'phone', templatePath: PHONE_WIDE_FALLBACK, dimensions: { width: 972, height: 2000 }, zones: phoneZone('iphone-15-plus'), isCustom: false },
  { id: 'iphone-15', name: 'iPhone 15', brand: 'Apple', category: 'phone', templatePath: '/templates/phones/iphone-15.png', dimensions: { width: 972, height: 2000 }, zones: phoneZone('iphone-15'), isCustom: false },
  { id: 'iphone-air', name: 'iPhone Air', brand: 'Apple', category: 'phone', templatePath: '/templates/phones/iphone-air.png', dimensions: { width: 972, height: 2000 }, zones: phoneZone('iphone-air'), isCustom: false },
  { id: 'iphone-11', name: 'iPhone 11', brand: 'Apple', category: 'phone', templatePath: '/templates/phones/iphone-11.png', dimensions: { width: 972, height: 2000 }, zones: phoneZone('iphone-11'), isCustom: false },
  // Samsung
  { id: 'samsung-s24', name: 'Galaxy S24', brand: 'Samsung', category: 'phone', templatePath: '/templates/phones/samsungs24.png', dimensions: { width: 972, height: 2000 }, zones: phoneZone('samsung-s24'), isCustom: false },
  { id: 'samsung-s24-fe', name: 'Galaxy S24 FE', brand: 'Samsung', category: 'phone', templatePath: PHONE_FALLBACK, dimensions: { width: 972, height: 2000 }, zones: phoneZone('samsung-s24-fe'), isCustom: false },
  { id: 'samsung-s20', name: 'Galaxy S20', brand: 'Samsung', category: 'phone', templatePath: '/templates/phones/samsung-s20.png', dimensions: { width: 972, height: 2000 }, zones: phoneZone('samsung-s20'), isCustom: false },
  // Pixel
  { id: 'pixel-9-pro-xl', name: 'Pixel 9 Pro XL', brand: 'Google', category: 'phone', templatePath: PHONE_WIDE_FALLBACK, dimensions: { width: 972, height: 2000 }, zones: phoneZone('pixel-9-pro-xl'), isCustom: false },
  { id: 'pixel-9-pro', name: 'Pixel 9 Pro', brand: 'Google', category: 'phone', templatePath: PHONE_FALLBACK, dimensions: { width: 972, height: 2000 }, zones: phoneZone('pixel-9-pro'), isCustom: false },
  { id: 'pixel-9', name: 'Pixel 9', brand: 'Google', category: 'phone', templatePath: PHONE_FALLBACK, dimensions: { width: 972, height: 2000 }, zones: phoneZone('pixel-9'), isCustom: false },
  // Laptops
  { id: 'macbook-pro-16-m3', name: 'MacBook Pro 16\" M3', brand: 'Apple', category: 'laptop', templatePath: LAPTOP_APPLE_FALLBACK, dimensions: { width: 2000, height: 1500 }, zones: laptopZones('macbook-pro-16-m3'), isCustom: false },
  { id: 'macbook-air-m1', name: 'MacBook Air M1 2020', brand: 'Apple', category: 'laptop', templatePath: '/templates/laptops/macbook-air-m1.png', dimensions: { width: 2000, height: 1500 }, zones: laptopZones('macbook-air-m1'), isCustom: false },
  { id: 'hp-victus', name: 'HP Victus', brand: 'HP', category: 'laptop', templatePath: '/templates/laptops/hp-victus.png', dimensions: { width: 2000, height: 1500 }, zones: laptopZones('hp-victus'), isCustom: false },
  // Watch
  { id: 'apple-watch-ultra-2', name: 'Apple Watch Ultra 2', brand: 'Apple', category: 'watch', templatePath: WATCH_FALLBACK, dimensions: { width: 972, height: 2000 }, zones: watchZone('apple-watch-ultra-2'), isCustom: false },
  { id: 'apple-watch-series-10', name: 'Apple Watch Series 10', brand: 'Apple', category: 'watch', templatePath: WATCH_FALLBACK, dimensions: { width: 972, height: 2000 }, zones: watchZone('apple-watch-series-10'), isCustom: false },
  { id: 'pixel-watch-3', name: 'Pixel Watch 3', brand: 'Google', category: 'watch', templatePath: WATCH_FALLBACK, dimensions: { width: 972, height: 2000 }, zones: watchZone('pixel-watch-3'), isCustom: false },
  // Adding more from the list
  { id: 'iphone-16', name: 'iPhone 16', brand: 'Apple', category: 'phone', templatePath: PHONE_FALLBACK, dimensions: { width: 972, height: 2000 }, zones: phoneZone('iphone-16'), isCustom: false },
  { id: 'samsung-z-fold-6', name: 'Galaxy Z Fold 6', brand: 'Samsung', category: 'phone', templatePath: PHONE_FALLBACK, dimensions: { width: 972, height: 2000 }, zones: [{ id: 'samsung-z-fold-6-back',  name: 'Back Cover',  bounds: { x: 0, y: 0, width: 972, height: 2000 } }], isCustom: false },
  { id: 'ipad-pro-13-m4', name: 'iPad Pro 13\" M4', brand: 'Apple', category: 'tablet', templatePath: TABLET_FALLBACK, dimensions: { width: 972, height: 1340 }, zones: tabletZone('ipad-pro-13-m4'), isCustom: false },
  { id: 'surface-pro-11', name: 'Surface Pro 11', brand: 'Microsoft', category: 'tablet', templatePath: TABLET_FALLBACK, dimensions: { width: 972, height: 1340 }, zones: tabletZone('surface-pro-11'), isCustom: false },
  { id: 'macbook-pro-14-m3', name: 'MacBook Pro 14\" M3', brand: 'Apple', category: 'laptop', templatePath: LAPTOP_APPLE_FALLBACK, dimensions: { width: 2000, height: 1500 }, zones: laptopZones('macbook-pro-14-m3'), isCustom: false },
  { id: 'dell-xps-15', name: 'Dell XPS 15', brand: 'Dell', category: 'laptop', templatePath: LAPTOP_WIN_FALLBACK, dimensions: { width: 2000, height: 1500 }, zones: laptopZones('dell-xps-15'), isCustom: false },
];

async function run() {
  console.log(`Starting migration of ${data.length} devices...`);

  for (const device of data) {
    try {
      await pool.query(
        `INSERT INTO public.devices (id, name, brand, category, template_path, dimensions, zones, is_custom)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           brand = EXCLUDED.brand,
           category = EXCLUDED.category,
           template_path = EXCLUDED.template_path,
           dimensions = EXCLUDED.dimensions,
           zones = EXCLUDED.zones,
           is_custom = EXCLUDED.is_custom`,
        [
          device.id,
          device.name,
          device.brand,
          device.category,
          device.templatePath,
          device.dimensions,
          JSON.stringify(device.zones),
          device.isCustom || false
        ]
      );
      console.log(`✅ Migrated: ${device.id}`);
    } catch (err) {
      console.error(`❌ Failed: ${device.id}`, err.message);
    }
  }

  console.log('Migration complete.');
  await pool.end();
}

run();
