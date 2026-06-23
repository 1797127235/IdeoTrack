const { Client } = require('ssh2');

const query = `
SELECT u.school_id, u.role, c.name as class_name, cc.counselor_id
FROM users u
LEFT JOIN counselor_classes cc ON cc.counselor_id = u.id
LEFT JOIN classes c ON c.id = cc.class_id
WHERE u.school_id = 'teacher001';
`;

const query2 = `
SELECT school_id, role, class_id FROM users WHERE school_id IN ('2024001','2024002');
`;

const remoteCommand = `docker exec -i $(docker ps -q -f name=postgres) psql -U postgres -d ideo_track -c "${query.replace(/"/g, '\\"').replace(/\n/g, ' ')}" && docker exec -i $(docker ps -q -f name=postgres) psql -U postgres -d ideo_track -c "${query2.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`;

const client = new Client();
client.on('ready', () => {
  console.log('SSH connected');
  client.exec(remoteCommand, (err, stream) => {
    if (err) { console.error('exec error:', err.message); client.end(); return; }
    let out = '', errOut = '';
    stream.on('close', () => {
      console.log('--- RESULT ---');
      console.log(out);
      if (errOut) console.error('STDERR:', errOut);
      client.end();
    }).on('data', d => out += d).stderr.on('data', d => errOut += d);
  });
}).on('error', e => { console.error('SSH error:', e.message); process.exit(1); });
client.connect({ host: '186.244.238.31', port: 22, username: 'root', password: 'uLH70IjGk5tl', hostVerifier: () => true });
