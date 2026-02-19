import fs from 'fs';

(async () => {
  const base = 'http://192.168.31.15:3000';
  const paths = ['/', '/healthz', '/readyz', '/documentation', '/v1'];
  for (const p of paths) {
    try {
      const res = await fetch(base + p);
      const text = await res.text();
      const out = `PATH: ${p}\nSTATUS: ${res.status}\n\n${text}`;
      fs.writeFileSync(`check_${p.replace(/\W/g, '_')}.txt`, out, 'utf8');
      console.log(p, res.status);
    } catch (e) {
      fs.writeFileSync(`check_${p.replace(/\W/g, '_')}.txt`, `ERROR: ${String(e)}`);
      console.log(p, 'ERROR');
    }
  }
})();
