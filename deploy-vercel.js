const fs = require('fs');
const path = require('path');
const https = require('https');

async function deploy() {
  const tarballPath = path.resolve(__dirname, '..', 'dist.tar.gz');
  const fileBuffer = fs.readFileSync(tarballPath);

  const boundary = '----' + Date.now();
  const CRLF = '\r\n';

  // Build multipart parts
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

  const options = {
    hostname: 'claude-skills-deploy.vercel.com',
    port: 443,
    path: '/api/deploy',
    method: 'POST',
    headers: {
      'Content-Type': 'multipart/form-data; boundary=' + boundary,
      'Content-Length': body.length,
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve({ raw: data }); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

deploy()
  .then((r) => console.log(JSON.stringify(r, null, 2)))
  .catch((e) => console.error('Error:', e.message));
