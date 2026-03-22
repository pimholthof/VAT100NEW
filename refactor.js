const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const moves = [
  { from: 'lib/actions/invoices.ts', to: 'features/invoices/actions.ts', oldImport: '@/lib/actions/invoices', newImport: '@/features/invoices/actions' },
  { from: 'lib/actions/clients.ts', to: 'features/clients/actions.ts', oldImport: '@/lib/actions/clients', newImport: '@/features/clients/actions' },
  { from: 'lib/actions/dashboard.ts', to: 'features/dashboard/actions.ts', oldImport: '@/lib/actions/dashboard', newImport: '@/features/dashboard/actions' },
  { from: 'lib/actions/receipts.ts', to: 'features/receipts/actions.ts', oldImport: '@/lib/actions/receipts', newImport: '@/features/receipts/actions' },
  { from: 'lib/actions/tax.ts', to: 'features/tax/actions.ts', oldImport: '@/lib/actions/tax', newImport: '@/features/tax/actions' },
  { from: 'lib/actions/action-feed.ts', to: 'features/dashboard/action-feed.ts', oldImport: '@/lib/actions/action-feed', newImport: '@/features/dashboard/action-feed' },
  { from: 'lib/actions/banking.ts', to: 'features/banking/actions.ts', oldImport: '@/lib/actions/banking', newImport: '@/features/banking/actions' },
  { from: 'lib/actions/profile.ts', to: 'features/profile/actions.ts', oldImport: '@/lib/actions/profile', newImport: '@/features/profile/actions' },
];

execSync('mkdir -p features/invoices features/clients features/dashboard features/receipts features/tax features/banking features/profile');

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
