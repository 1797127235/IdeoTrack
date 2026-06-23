const https = require('https');

const API = 'ideotrack.cc.cd';

function request(method, path, data, token) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: API,
      port: 443,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };
    const req = https.request(opts, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

(async () => {
  const login = await request('POST', '/api/auth/login', { schoolId: 'teacher001', password: '123456' });
  console.log('LOGIN:', login.status, JSON.stringify(login.body, null, 2));
  if (!login.body?.data?.token) return;
  const dash = await request('GET', '/api/counselor/dashboard', null, login.body.data.token);
  console.log('DASHBOARD:', dash.status, JSON.stringify(dash.body, null, 2));
})();
