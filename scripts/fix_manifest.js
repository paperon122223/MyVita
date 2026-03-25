#!/usr/bin/env node
/**
 * Hook: after_prepare
 * Elimina permisos duplicados en AndroidManifest.xml
 * Colocar en: scripts/fix_manifest.js
 */

const fs   = require('fs');
const path = require('path');

const manifestPath = path.join(
  __dirname, '..', 'platforms', 'android',
  'app', 'src', 'main', 'AndroidManifest.xml'
);

if (!fs.existsSync(manifestPath)) {
  console.log('fix_manifest.js: AndroidManifest.xml no encontrado, saltando.');
  process.exit(0);
}

let content = fs.readFileSync(manifestPath, 'utf8');

// Encuentra todos los uses-permission y elimina duplicados manteniendo el primero
const seen = new Set();
content = content.replace(
  /<uses-permission[^/]*(android:name="([^"]+)")[^/]*\/>/g,
  (match, _, permName) => {
    if (seen.has(permName)) {
      console.log('fix_manifest.js: Eliminando permiso duplicado:', permName);
      return '';
    }
    seen.add(permName);
    return match;
  }
);

// Limpia líneas vacías extras
content = content.replace(/\n\s*\n\s*\n/g, '\n\n');

fs.writeFileSync(manifestPath, content, 'utf8');
console.log('fix_manifest.js: AndroidManifest.xml procesado correctamente.');
