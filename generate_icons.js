// 运行此脚本生成图标: node generate_icons.js
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // 背景
  ctx.fillStyle = '#10a37f';
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, size * 0.2);
  ctx.fill();

  // 引号图标
  ctx.fillStyle = '#ffffff';
  const q = size * 0.18;
  const gap = size * 0.12;
  const top = size * 0.28;
  const bottom = size * 0.72;
  const left = size * 0.18;

  // 左引号
  ctx.beginPath();
  ctx.arc(left + q / 2, top + q / 2, q / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(left, top + q);
  ctx.lineTo(left + q * 0.6, bottom);
  ctx.lineTo(left + q, bottom);
  ctx.lineTo(left + q, top + q);
  ctx.closePath();
  ctx.fill();

  // 右引号
  const right = left + q + gap;
  ctx.beginPath();
  ctx.arc(right + q / 2, top + q / 2, q / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(right, top + q);
  ctx.lineTo(right + q * 0.6, bottom);
  ctx.lineTo(right + q, bottom);
  ctx.lineTo(right + q, top + q);
  ctx.closePath();
  ctx.fill();

  return canvas.toBuffer('image/png');
}

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir);

[16, 48, 128].forEach(size => {
  fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), generateIcon(size));
  console.log(`Generated icon${size}.png`);
});
