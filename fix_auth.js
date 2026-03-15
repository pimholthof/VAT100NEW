const fs = require('fs');
const glob = require('glob');

const files = glob.sync('{lib/actions/**/*.ts,app/**/*.tsx,lib/invoice/*.ts}');

for (const file of files) {
  if (file.includes('middleware.ts')) continue;
  
  let content = fs.readFileSync(file, 'utf8');
  
  // Pattern 1: Multi-line
  const p1 = `  const {
    data: { user },
  } = await supabase.auth.getUser();`;
  
  const r1 = `  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;`;
  
  // Pattern 2: Single-line
  const p2 = `  const { data: { user } } = await supabase.auth.getUser();`;
  const r2 = `  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;`;

  content = content.replace(new RegExp(p1.replace(/[.*+?^$\{\}()|\[\]\\]/g, '\\$&'), 'g'), r1);
  content = content.replace(new RegExp(p2.replace(/[.*+?^$\{\}()|\[\]\\]/g, '\\$&'), 'g'), r2);
  
  fs.writeFileSync(file, content, 'utf8');
}
console.log("Replaced getUser with getSession in all matching files");
