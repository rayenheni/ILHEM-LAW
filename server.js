const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 3000;
const DB_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DB_DIR, 'ilhem.db');
const LEGACY_JSON = path.join(DB_DIR, 'submissions.json');

// Configuration Administrateur & Sécurité
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'Ilhem@2026!';

// Types MIME pour les fichiers statiques
const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.xml': 'application/xml; charset=UTF-8',
  '.txt': 'text/plain; charset=UTF-8'
};

// Initialisation de la base de données SQLite
let db = null;

const initDb = () => {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  if (!db) {
    db = new DatabaseSync(DB_FILE);
    db.exec(`
      CREATE TABLE IF NOT EXISTS submissions (
        id            TEXT PRIMARY KEY,
        date          TEXT NOT NULL,
        dateFormatted  TEXT NOT NULL,
        name          TEXT NOT NULL,
        email         TEXT NOT NULL,
        phone         TEXT NOT NULL DEFAULT '—',
        caseType      TEXT NOT NULL DEFAULT 'Non spécifié',
        message       TEXT NOT NULL,
        status        TEXT NOT NULL DEFAULT 'Nouveau'
      )
    `);
    db.exec('CREATE INDEX IF NOT EXISTS idx_submissions_date ON submissions(date)');
  }
  migrateFromJson();
};

// Migration des données de l'ancien fichier JSON vers SQLite (une seule fois)
const migrateFromJson = () => {
  if (!fs.existsSync(LEGACY_JSON)) return;
  try {
    const legacy = JSON.parse(fs.readFileSync(LEGACY_JSON, 'utf8') || '[]');
    if (Array.isArray(legacy) && legacy.length) {
      const stmt = db.prepare(
        `INSERT OR IGNORE INTO submissions (id, date, dateFormatted, name, email, phone, caseType, message, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      db.exec('BEGIN');
      try {
        for (const r of legacy) {
          stmt.run(
            r.id, r.date, r.dateFormatted,
            String(r.name || ''), String(r.email || ''),
            String(r.phone || '—'), String(r.caseType || 'Non spécifié'),
            String(r.message || ''), String(r.status || 'Nouveau')
          );
        }
        db.exec('COMMIT');
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
      console.log(`[DB] Migration : ${legacy.length} demande(s) importée(s) depuis submissions.json`);
    }
    fs.renameSync(LEGACY_JSON, LEGACY_JSON + '.bak');
    console.log('[DB] submissions.json conservé en submissions.json.bak');
  } catch (e) {
    console.warn('[DB] Migration ignorée :', e.message);
  }
};

// CRUD SQLite — demandes de contact
const allSubmissions = () => {
  initDb();
  return db.prepare('SELECT * FROM submissions ORDER BY rowid DESC').all();
};

const findSubmission = (id) => {
  initDb();
  return db.prepare('SELECT * FROM submissions WHERE id = ?').get(id);
};

const insertSubmission = (sub) => {
  initDb();
  const stmt = db.prepare(
    `INSERT INTO submissions (id, date, dateFormatted, name, email, phone, caseType, message, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  stmt.run(sub.id, sub.date, sub.dateFormatted, sub.name, sub.email, sub.phone, sub.caseType, sub.message, sub.status);
};

const updateSubmissionStatus = (id, status) => {
  initDb();
  db.prepare('UPDATE submissions SET status = ? WHERE id = ?').run(status, id);
};

const deleteSubmission = (id) => {
  initDb();
  const info = db.prepare('DELETE FROM submissions WHERE id = ?').run(id);
  return info.changes > 0;
};

const clearSubmissions = () => {
  initDb();
  db.prepare('DELETE FROM submissions').run();
};

// Stockage persistant des jetons de session actifs (survit aux redémarrages)
const SESSION_FILE = path.join(DB_DIR, 'sessions.json');

const loadSessions = () => {
  initDb();
  try {
    const raw = fs.readFileSync(SESSION_FILE, 'utf8');
    const parsed = JSON.parse(raw || '{}');
    return new Set(Array.isArray(parsed.tokens) ? parsed.tokens : []);
  } catch (e) {
    return new Set();
  }
};

const saveSessions = (tokens) => {
  try {
    fs.writeFileSync(SESSION_FILE, JSON.stringify({ tokens: Array.from(tokens) }, null, 2), 'utf8');
  } catch (e) {}
};

const activeTokens = loadSessions();

// Helper JSON Response
const sendJson = (res, statusCode, body) => {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=UTF-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-admin-token'
  });
  res.end(JSON.stringify(body));
};

// Vérification de l'authentification Admin
const isAuthorized = (req) => {
  const authHeader = req.headers['authorization'] || '';
  const customHeader = req.headers['x-admin-token'] || '';
  let token = customHeader;
  
  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }

  return token && activeTokens.has(token);
};

// Serveur HTTP Principal avec Routing Clean URLs
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  let reqPath = parsedUrl.pathname;
  const method = req.method.toUpperCase();

  // CORS Preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-admin-token'
    });
    return res.end();
  }

  /* ═══════════════════════════════════════════════════════════════
     AUTHENTIFICATION ADMIN (/api/admin/login & /api/admin/verify)
     ═══════════════════════════════════════════════════════════════ */
  if (reqPath === '/api/admin/login' && method === 'POST') {
    let bodyStr = '';
    req.on('data', chunk => { bodyStr += chunk.toString(); });
    req.on('end', () => {
      try {
        const { username, password } = JSON.parse(bodyStr || '{}');
        if (username === ADMIN_USER && password === ADMIN_PASS) {
          const token = 'tok_' + crypto.randomBytes(24).toString('hex');
          activeTokens.add(token);
          saveSessions(activeTokens);
          console.log(`[AUTH] Connexion réussie pour l'administrateur (${username})`);
          return sendJson(res, 200, { success: true, token, username });
        } else {
          console.warn(`[AUTH] Échec de connexion tentatives avec : ${username}`);
          return sendJson(res, 401, { success: false, error: 'Identifiants administrateur incorrects.' });
        }
      } catch (e) {
        return sendJson(res, 400, { success: false, error: 'Données invalides.' });
      }
    });
    return;
  }

  if (reqPath === '/api/admin/verify' && method === 'GET') {
    if (isAuthorized(req)) {
      return sendJson(res, 200, { success: true, authorized: true });
    } else {
      return sendJson(res, 401, { success: false, authorized: false });
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     API REST BASE DE DONNÉES SÉCURISÉE (/api/contact)
     ═══════════════════════════════════════════════════════════════ */
  if (reqPath.startsWith('/api/contact')) {
    
    // POST /api/contact -> PUBLIC (Soumission de formulaire par les clients)
    if (method === 'POST' && reqPath === '/api/contact') {
      let bodyStr = '';
      req.on('data', chunk => { bodyStr += chunk.toString(); });
      req.on('end', () => {
        try {
          const body = JSON.parse(bodyStr || '{}');
          const { name, email, phone, caseType, message } = body;

          if (!name || !email || !message) {
            return sendJson(res, 400, { success: false, error: 'Veuillez remplir les champs obligatoires (Nom, Email, Message).' });
          }

          const now = new Date();
          const newSub = {
            id: 'sub_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            date: now.toISOString(),
            dateFormatted: new Intl.DateTimeFormat('fr-FR', {
              dateStyle: 'medium',
              timeStyle: 'short',
              timeZone: 'Africa/Tunis'
            }).format(now),
            name: String(name).trim(),
            email: String(email).trim(),
            phone: String(phone || '—').trim(),
            caseType: String(caseType || 'Non spécifié').trim(),
            message: String(message).trim(),
            status: 'Nouveau'
          };

          insertSubmission(newSub);

          console.log(`[DATABASE] Nouvelle demande client enregistrée : ${newSub.name} (${newSub.email})`);
          return sendJson(res, 201, { success: true, message: 'Demande enregistrée dans la base de données.', data: findSubmission(newSub.id) });
        } catch (e) {
          return sendJson(res, 400, { success: false, error: 'Format JSON invalide.' });
        }
      });
      return;
    }

    // VÉRIFICATION DE SÉCURITÉ ADMIN POUR TOUTES LES AUTRES ACTIONS DE LA BASE DE DONNÉES
    if (!isAuthorized(req)) {
      return sendJson(res, 401, { success: false, error: 'Accès non autorisé. Veuillez vous connecter.' });
    }

    // GET /api/contact -> SÉCURISÉ (Récupération des demandes par l'admin)
    if (method === 'GET' && reqPath === '/api/contact') {
      const subs = allSubmissions();
      return sendJson(res, 200, { success: true, count: subs.length, data: subs });
    }

    // PATCH /api/contact/:id -> SÉCURISÉ (Mise à jour du statut)
    if (method === 'PATCH' && reqPath.startsWith('/api/contact/')) {
      const id = reqPath.replace('/api/contact/', '');
      let bodyStr = '';
      req.on('data', chunk => { bodyStr += chunk.toString(); });
      req.on('end', () => {
        const body = JSON.parse(bodyStr || '{}');
        const sub = findSubmission(id);
        if (!sub) return sendJson(res, 404, { success: false, error: 'Introuvable' });

        const newStatus = body.status || (sub.status === 'Nouveau' ? 'Traité' : 'Nouveau');
        updateSubmissionStatus(id, newStatus);
        return sendJson(res, 200, { success: true, data: findSubmission(id) });
      });
      return;
    }

    // DELETE /api/contact -> SÉCURISÉ (Vider la base)
    if (method === 'DELETE' && reqPath === '/api/contact') {
      clearSubmissions();
      return sendJson(res, 200, { success: true, message: 'Base de données réinitialisée.' });
    }

    // DELETE /api/contact/:id -> SÉCURISÉ (Supprimer une demande)
    if (method === 'DELETE' && reqPath.startsWith('/api/contact/')) {
      const id = reqPath.replace('/api/contact/', '');
      if (!deleteSubmission(id)) {
        return sendJson(res, 404, { success: false, error: 'Introuvable' });
      }
      return sendJson(res, 200, { success: true, message: 'Demande supprimée.' });
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     CLEAN URLS & SERVICE STATIQUE (Ex: /ar -> ar.html, /admin -> admin.html)
     ═══════════════════════════════════════════════════════════════ */
  
  // Mapping Clean URLs
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  else if (reqPath === '/ar') reqPath = '/ar.html';
  else if (reqPath === '/admin') reqPath = '/admin.html';

  let filePath = path.join(__dirname, reqPath);
  
  // Fallback si pas d'extension (Ex: /admin -> admin.html)
  if (!path.extname(filePath) && fs.existsSync(filePath + '.html')) {
    filePath += '.html';
  }

  // Protection contre Directory Traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    return res.end('Accès interdit');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=UTF-8' });
      return res.end('<h1>404 — Page non trouvée</h1><p><a href="/">Retour à l\'accueil</a></p>');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  initDb();
  console.log(`
  ═══════════════════════════════════════════════════════════════
  🚀 Cabinet Maître Ilhem ABSI ANANE — Backend & Clean URLs
  🗄️  Base de données : SQLite (${DB_FILE})
  🌐 Site Français (Clean) : http://localhost:${PORT}/
  🌐 Site Arabe (Clean)    : http://localhost:${PORT}/ar
  🔒 Espace Admin (Clean)  : http://localhost:${PORT}/admin
  🔐 Identifiants Admin   : Login: ${ADMIN_USER} | Pass: ${ADMIN_PASS}
  ═══════════════════════════════════════════════════════════════
  `);
  const subs = allSubmissions();
  console.log(`[DB] Prêt : ${subs.length} demande(s) en base.`);
});

// Persist sessions on shutdown/restart
const persistSessions = () => saveSessions(activeTokens);
process.on('SIGINT', persistSessions);
process.on('SIGTERM', persistSessions);
process.on('exit', persistSessions);
