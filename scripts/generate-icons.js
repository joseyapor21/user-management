const fs = require('fs');
const { createCanvas } = require('canvas');

// Icon sizes needed for iOS and Android
const sizes = [
  { size: 180, name: 'apple-touch-icon.png' },  // iOS
  { size: 192, name: 'icon-192.png' },          // Android/PWA
  { size: 512, name: 'icon-512.png' },          // Android/PWA
  { size: 72, name: 'badge-72.png' },           // Notification badge
];

sizes.forEach(({ size, name }) => {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Blue background with rounded corners
  const radius = size * 0.125; // 12.5% corner radius
  ctx.fillStyle = '#2563eb';
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.quadraticCurveTo(size, 0, size, radius);
  ctx.lineTo(size, size - radius);
  ctx.quadraticCurveTo(size, size, size - radius, size);
  ctx.lineTo(radius, size);
  ctx.quadraticCurveTo(0, size, 0, size - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.fill();

  // White "C" text
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${size * 0.625}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('C', size / 2, size / 2 + size * 0.05);

  // Save to file
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(`public/${name}`, buffer);
  console.log(`Created ${name}`);
});

console.log('All icons generated!');
