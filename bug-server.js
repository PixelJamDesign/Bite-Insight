/**
 * BiteInsight Bug Tracker — Local Dev Server
 *
 * Run:   node bug-server.js
 * Open:  http://localhost:4040
 *
 * Serves the bug tracker UI and provides a tiny API so the
 * HTML page can read/write bugs.json in real time.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const { execSync } = require('child_process');

const PORT = 4040;
const BUGS_FILE = path.join(__dirname, 'bugs.json');
const HTML_FILE = path.join(__dirname, 'bug-tracker.html');

// Find the claude CLI path at startup
let CLAUDE_BIN = 'claude';
try {
  CLAUDE_BIN = execSync('which claude 2>/dev/null || where claude 2>nul', { encoding: 'utf-8' }).trim().split('\n')[0];
  console.log(`  Found Claude CLI at: ${CLAUDE_BIN}`);
} catch {
  // Try common locations
  const candidates = [
    path.join(process.env.HOME || '', '.npm-global', 'bin', 'claude'),
    '/usr/local/bin/claude',
    '/opt/homebrew/bin/claude',
    path.join(process.env.HOME || '', '.local', 'bin', 'claude'),
    path.join(process.env.APPDATA || '', 'npm', 'claude.cmd'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) { CLAUDE_BIN = c; break; }
  }
  console.log(`  Claude CLI path: ${CLAUDE_BIN} (auto-detected)`);
}

function readBugs() {
  try {
    return fs.readFileSync(BUGS_FILE, 'utf-8');
  } catch {
    return '[]';
  }
}

function writeBugs(data) {
  fs.writeFileSync(BUGS_FILE, data, 'utf-8');
}

const server = http.createServer((req, res) => {
  // Log every request
  if (!req.url.includes('/api/bugs') || req.method !== 'GET') {
    console.log(`  [${req.method}] ${req.url}`);
  }

  // CORS headers (for local dev)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // GET /api/bugs — read bugs.json
  if (req.method === 'GET' && req.url === '/api/bugs') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(readBugs());
  }

  // PUT /api/bugs — write bugs.json
  if (req.method === 'PUT' && req.url === '/api/bugs') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        JSON.parse(body); // validate JSON
        writeBugs(body);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('{"ok":true}');
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end('{"error":"Invalid JSON"}');
      }
    });
    return;
  }

  // POST /api/execute — send prompt to Claude Code
  if (req.method === 'POST' && req.url === '/api/execute') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { prompt } = JSON.parse(body);
        if (!prompt) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end('{"error":"No prompt provided"}');
        }

        // Write prompt to a temp file to avoid shell arg limits
        const tmpFile = path.join(__dirname, '.bug-prompt.tmp');
        fs.writeFileSync(tmpFile, prompt, 'utf-8');

        // Log what we're sending so you can verify
        console.log(`\n  📋 Prompt preview:\n  ───────────────────`);
        console.log(`  ${prompt.substring(0, 300).replace(/\n/g, '\n  ')}...`);
        console.log(`  ───────────────────\n`);

        const { spawn } = require('child_process');

        // Spawn claude with -p flag, feed prompt via stdin
        console.log(`  Using CLI: ${CLAUDE_BIN}`);
        const child = spawn(CLAUDE_BIN, ['-p', '--verbose'], {
          cwd: __dirname,
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        child.on('error', (err) => {
          console.error(`  ❌ Failed to start claude: ${err.message}`);
          console.error('  Is Claude Code CLI installed? Try running "claude --version" in your terminal.');
        });

        // Write the prompt to stdin, then close it
        child.stdin.write(prompt);
        child.stdin.end();

        let stdout = '', stderr = '';
        child.stdout.on('data', d => { stdout += d.toString(); });
        child.stderr.on('data', d => { stderr += d.toString(); });
        child.on('close', (code) => {
          try { fs.unlinkSync(tmpFile); } catch {}
          if (code !== 0) {
            console.error(`  ❌ Claude Code exited with code ${code}`);
            if (stderr) console.error('  stderr:', stderr.substring(0, 500));
          } else {
            console.log('  ✅ Claude Code finished');
            if (stdout) console.log('  Output:', stdout.substring(0, 500));
          }
        });

        console.log(`  PID: ${child.pid}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, pid: child.pid }));
      } catch (err) {
        console.error('  ❌ Execute error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // GET / — serve bug-tracker.html
  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end(fs.readFileSync(HTML_FILE, 'utf-8'));
  }

  // 404
  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`\n  🐛 Bug Tracker running at http://localhost:${PORT}\n`);
});
