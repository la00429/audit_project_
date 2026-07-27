/**
 * Post-build script: copies static assets to dist/extension/
 * Run automatically via "npm run postbuild"
 */

const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'src', 'extension');
const dest = path.join(__dirname, '..', 'dist', 'extension');

// Files to copy
const staticFiles = ['manifest.json', 'popup.html', 'content.css'];

for (const file of staticFiles) {
  const srcPath = path.join(src, file);
  const destPath = path.join(dest, file);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied: ${file}`);
  }
}

// Copy icons
const iconsSrc = path.join(src, 'icons');
const iconsDest = path.join(dest, 'icons');
fs.mkdirSync(iconsDest, { recursive: true });

if (fs.existsSync(iconsSrc)) {
  const icons = fs.readdirSync(iconsSrc);
  for (const icon of icons) {
    fs.copyFileSync(path.join(iconsSrc, icon), path.join(iconsDest, icon));
    console.log(`Copied: icons/${icon}`);
  }
}

console.log('Assets copied to dist/extension/');
