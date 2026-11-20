import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, type Connect, type Plugin } from 'vite';

/**
 * Playtest run collector. While `npm run dev` (or `preview`) is serving the game, every finished
 * run is POSTed here and written to `runs/` in the project — including runs played on a phone
 * over Wi-Fi. `npm run replay` reads them. Nothing leaves the machine.
 *   POST /__run          save a recording, returns { file }
 *   GET  /__run          list saved files (newest first)
 *   GET  /__run?file=x   fetch one (used by ?replay=x)
 */
function runCollector(): Plugin {
  const dir = path.resolve(__dirname, 'runs');
  const handler: Connect.NextHandleFunction = (req, res) => {
    const send = (code: number, body: unknown) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); };
    try {
      if (req.method === 'POST') {
        let raw = '';
        req.on('data', c => { raw += c; if (raw.length > 5e6) req.destroy(); });
        req.on('end', () => {
          try {
            const rec = JSON.parse(raw);
            if (rec?.v !== 1 || !Array.isArray(rec.steps)) return send(400, { error: 'not a recording' });
            const safe = (s: unknown) => String(s).replace(/[^a-z0-9]/gi, '').slice(0, 12);
            const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
            const file = `${stamp}_${safe(rec.skaterId)}_${safe(rec.result?.distance)}m_${safe(rec.result?.score)}pts.json`;
            fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(path.join(dir, file), raw);
            send(200, { file });
          } catch { send(400, { error: 'bad json' }); }
        });
        return;
      }
      const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort().reverse() : [];
      const want = new URL(req.url ?? '/', 'http://x').searchParams.get('file');
      if (!want) return send(200, { files });
      const file = want === 'latest' ? files[0] : files.find(f => f === want || f === want + '.json');   // only names we listed: no path tricks
      if (!file) return send(404, { error: 'no such run' });
      res.setHeader('Content-Type', 'application/json'); res.end(fs.readFileSync(path.join(dir, file)));
    } catch (e) { send(500, { error: String(e) }); }
  };
  return {
    name: 'sk8-run-collector',
    configureServer(s) { s.middlewares.use('/__run', handler); },
    configurePreviewServer(s) { s.middlewares.use('/__run', handler); },
  };
}

// top-level await in main.ts (font loading) needs a modern target
const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf8')) as { version: string };
process.env.VITE_APP_VERSION = pkg.version;

export default defineConfig({ plugins: [runCollector()], build: { target: 'es2022', chunkSizeWarningLimit: 2000 } });
