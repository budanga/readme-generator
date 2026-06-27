const fs = require('fs');
const path = require('path');

const libsDir = path.join(__dirname, 'renderer', 'libs');

// Ensure libs directory exists
if (!fs.existsSync(libsDir)) {
  fs.mkdirSync(libsDir, { recursive: true });
}

// Map files to copy
const filesToCopy = [
  {
    src: path.join(__dirname, 'node_modules', 'marked', 'marked.min.js'),
    dest: path.join(libsDir, 'marked.min.js')
  },
  {
    src: path.join(__dirname, 'node_modules', 'mermaid', 'dist', 'mermaid.min.js'),
    dest: path.join(libsDir, 'mermaid.min.js')
  }
];

console.log('Copying library assets to local libs/ directory...');

filesToCopy.forEach(file => {
  try {
    if (fs.existsSync(file.src)) {
      fs.copyFileSync(file.src, file.dest);
      console.log(`Copied: ${path.basename(file.src)} -> renderer/libs/`);
    } else {
      console.error(`Source file not found: ${file.src}`);
    }
  } catch (err) {
    console.error(`Failed to copy ${path.basename(file.src)}:`, err);
  }
});

console.log('Library assets preparation complete.');
