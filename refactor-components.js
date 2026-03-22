const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const moves = [
  { from: 'components/dashboard', to: 'features/dashboard/components', oldImport: '@/components/dashboard', newImport: '@/features/dashboard/components' },
  { from: 'components/invoice', to: 'features/invoices/components', oldImport: '@/components/invoice', newImport: '@/features/invoices/components' },
  { from: 'components/receipt', to: 'features/receipts/components', oldImport: '@/components/receipt', newImport: '@/features/receipts/components' },
  { from: 'components/client', to: 'features/clients/components', oldImport: '@/components/client', newImport: '@/features/clients/components' },
];

for (const move of moves) {
  try {
    execSync(`git mv ${move.from} ${move.to}`);
    console.log(`Moved ${move.from} to ${move.to}`);
  } catch(e) { console.error(`Error moving ${move.from}:`, e.message); }
}

const dirs = ['app', 'components', 'lib', 'features', 'tests'];

function getAllFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, fileList);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

let allFiles = [];
for (const d of dirs) {
  allFiles = allFiles.concat(getAllFiles(d));
}

for (const file of allFiles) {
  let content = fs.readFileSync(file, 'utf-8');
  let changed = false;
  for (const move of moves) {
    if (content.includes(move.oldImport)) {
      content = content.split(move.oldImport).join(move.newImport);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(file, content);
    console.log(`Updated imports in ${file}`);
  }
}
