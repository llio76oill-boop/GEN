const { execSync } = require('child_process');
process.chdir('C:\\Users\\al3r18y\\smart-grid');
console.log('CWD:', process.cwd());
try {
  execSync('npx netlify-cli deploy --build --prod --auth "nfp_Z6NY1owv9JdSPVAVFgjmWNmPk2iZCnKFfb44"', {
    stdio: 'inherit',
    cwd: 'C:\\Users\\al3r18y\\smart-grid',
    env: { ...process.env, HOME: 'C:\\Users\\al3r18y\\smart-grid' },
  });
} catch (e) {
  console.error('Deploy failed:', e.message);
  process.exit(1);
}
