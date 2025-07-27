#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const cliPath = path.join(__dirname, '../dist/cli.js');
const content = fs.readFileSync(cliPath, 'utf8');

if (!content.startsWith('#!/usr/bin/env node')) {
  fs.writeFileSync(cliPath, '#!/usr/bin/env node\n' + content);
  console.log('✅ Added shebang to cli.js');
  
  // Make executable on Unix-like systems
  try {
    fs.chmodSync(cliPath, '755');
    console.log('✅ Made cli.js executable');
  } catch (err) {
    // Windows doesn't need chmod, ignore error
    console.log('ℹ️  Skipped chmod (Windows)');
  }
} else {
  console.log('ℹ️  Shebang already present');
}