// ================================================================
// generate-assets.js — Genera ícono, adaptive icon y splash de MyVita
// Diseño: cápsula blanca sobre gradiente azul → verde (paleta firma)
// Uso: node scripts/generate-assets.js
// ================================================================

const sharp = require('sharp');
const path = require('path');

const OUT = path.join(__dirname, '..', 'assets');

// Glifo: cápsula diagonal con mitad translúcida + destello
const capsule = (fill = '#ffffff', halfOpacity = 0.45) => `
  <g transform="rotate(-45 512 512)">
    <clipPath id="cap">
      <rect x="377" y="262" width="270" height="500" rx="135"/>
    </clipPath>
    <rect x="377" y="262" width="270" height="500" rx="135" fill="${fill}"/>
    <rect x="377" y="512" width="270" height="250" fill="#000" opacity="${halfOpacity * 0.25}" clip-path="url(#cap)"/>
    <line x1="377" y1="512" x2="647" y2="512" stroke="#000" opacity="0.12" stroke-width="6"/>
  </g>
  <circle cx="700" cy="320" r="34" fill="#ffffff" opacity="0.9"/>
  <circle cx="760" cy="395" r="16" fill="#ffffff" opacity="0.65"/>
`;

const gradientDefs = `
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0288d1"/>
      <stop offset="100%" stop-color="#00c853"/>
    </linearGradient>
  </defs>
`;

// Ícono principal 1024×1024 (esquinas las redondea el SO)
const iconSvg = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  ${gradientDefs}
  <rect width="1024" height="1024" fill="url(#g)"/>
  ${capsule()}
</svg>`;

// Adaptive foreground: glifo centrado en zona segura (66%), fondo transparente
const foregroundSvg = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(512 512) scale(0.62) translate(-512 -512)">
    ${capsule()}
  </g>
</svg>`;

// Adaptive background: gradiente puro
const backgroundSvg = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  ${gradientDefs}
  <rect width="1024" height="1024" fill="url(#g)"/>
</svg>`;

// Monochrome: glifo blanco sólido
const monochromeSvg = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(512 512) scale(0.62) translate(-512 -512)">
    <g transform="rotate(-45 512 512)">
      <rect x="377" y="262" width="270" height="500" rx="135" fill="#ffffff"/>
    </g>
  </g>
</svg>`;

// Splash: tile redondeado con gradiente + cápsula (sobre fondo claro del SO)
const splashSvg = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  ${gradientDefs}
  <rect x="112" y="112" width="800" height="800" rx="190" fill="url(#g)"/>
  <g transform="translate(512 512) scale(0.62) translate(-512 -512)">
    ${capsule()}
  </g>
</svg>`;

// Ícono de notificación: glifo blanco puro sobre transparente
// (Android lo tiñe con el color de marca)
const notificationSvg = `
<svg width="96" height="96" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(512 512) scale(0.9) translate(-512 -512)">
    <g transform="rotate(-45 512 512)">
      <rect x="377" y="262" width="270" height="500" rx="135" fill="#ffffff"/>
      <line x1="377" y1="512" x2="647" y2="512" stroke="#000" opacity="0.35" stroke-width="40"/>
    </g>
  </g>
</svg>`;

async function run() {
  const jobs = [
    ['icon.png', iconSvg, 1024],
    ['android-icon-foreground.png', foregroundSvg, 1024],
    ['android-icon-background.png', backgroundSvg, 1024],
    ['android-icon-monochrome.png', monochromeSvg, 1024],
    ['splash-icon.png', splashSvg, 1024],
    ['favicon.png', iconSvg, 48],
    ['notification-icon.png', notificationSvg, 96],
  ];

  for (const [name, svg, size] of jobs) {
    await sharp(Buffer.from(svg)).resize(size, size).png().toFile(path.join(OUT, name));
    console.log(`✅ ${name} (${size}x${size})`);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
