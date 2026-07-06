const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

// Build
console.log('Building...');
execSync('npx vite build', { stdio: 'inherit', cwd: __dirname });

// Create tarball of dist
console.log('Creating tarball...');
const tarPath = path.join(__dirname, '.deploy-tmp.tgz');
execSync(`tar -czf "${tarPath}" -C dist .`, { stdio: 'inherit', cwd: __dirname });

const fileBuffer = fs.readFileSync(tarPath);
const CRLF = '\r\n';
const boundary = '----' + Date.now();

const header = Buffer.from(
  '--' + boundary + CRLF +
  'Content-Disposition: form-data; name="framework"' + CRLF + CRLF +
  'vite' + CRLF +
  '--' + boundary + CRLF +
  'Content-Disposition: form-data; name="file"; filename="project.tgz"' + CRLF +
  'Content-Type: application/gzip' + CRLF + CRLF
);
const footer = Buffer.from(CRLF + '--' + boundary + '--' + CRLF);
const body = Buffer.concat([header, fileBuffer, footer]);

console.log(`Uploading ${(body.length / 1024).toFixed(0)} KB...`);

const req = https.request({
  hostname: 'claude-skills-deploy.vercel.com',
  port: 443,
  path: '/api/deploy',
  method: 'POST',
  headers: {
    'Content-Type': 'multipart/form-data; boundary=' + boundary,
    'Content-Length': body.length,
  },
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('\nDeployment successful!');
      console.log('Preview URL:', json.previewUrl);
      console.log('Claim URL:  ', json.claimUrl);
    } catch {
      console.log('Response:', data);
    }
    // Cleanup
    try { fs.unlinkSync(tarPath); } catch {}
  });
});
req.on('error', (e) => {
  console.error('Error:', e.message);
  try { fs.unlinkSync(tarPath); } catch {}
});
req.write(body);
req.end();
