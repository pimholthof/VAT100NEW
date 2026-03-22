const fs = require('fs');
const path = require('path');

const dirs = ['app', 'components', 'features'];

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

  if (content.includes('import { motion') || content.includes('import { motion,')) {
    content = content.replace(/import\s+{\s*motion([^}]*)}\s+from\s+["']framer-motion["']/, 'import { m as motion $1} from "framer-motion"');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content);
    console.log(`Updated framer-motion imports in ${file}`);
  }
}
