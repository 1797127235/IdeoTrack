const { Client } = require('ssh2');

const query = `
SELECT id, name, college_id FROM classes WHERE name = '测试班级';

SELECT cc.counselor_id, cc.class_id, u.school_id
FROM counselor_classes cc
JOIN users u ON u.id = cc.counselor_id
WHERE u.school_id = 'teacher001';

SELECT s.school_id, s.class_id, c.name
FROM users s
JOIN classes c ON c.id = s.class_id
WHERE s.school_id IN ('2024001','2024002');
`;

const remoteCommand = `docker exec -i $(docker ps -q -f name=postgres) psql -U postgres -d ideo_track -c "${query.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`;

const client = new Client();
client.on('ready', () => {
  client.exec(remoteCommand, (err, stream) => {
    if (err) { console.error(err.message); client.end(); return; }
    let out = '', errOut = '';
    stream.on('close', () => {
      console.log(out);
      if (errOut) console.error(errOut);
      client.end();
    }).on('data', d => out += d).stderr.on('data', d => errOut += d);
  });
}).on('error', e => { console.error(e.message); process.exit(1); });
client.connect({ host: '186.244.238.31', port: 22, username: 'root', password: 'uLH70IjGk5tl', hostVerifier: () => true });
