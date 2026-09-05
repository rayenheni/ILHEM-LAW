const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const DB_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DB_DIR, 'submissions.json');

// Configuration Administrateur & Sécurité
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'Ilhem@2026!';

// Stockage mémoire des jetons de session actifs
const activeTokens = new Set();

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

// Initialisation de la base de données
const initDb = () => {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2), 'utf8');
  }
};

const readDb = () => {
  initDb();
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8') || '[]');
  } catch (e) {
    return [];
  }
};

const writeDb = (data) => {
  initDb();
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (e) {
    return false;
  }
};

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

          const subs = readDb();
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

          subs.unshift(newSub);
          writeDb(subs);

          console.log(`[DATABASE] Nouvelle demande client enregistrée : ${newSub.name} (${newSub.email})`);
          return sendJson(res, 201, { success: true, message: 'Demande enregistrée dans la base de données.', data: newSub });
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
      const subs = readDb();
      return sendJson(res, 200, { success: true, count: subs.length, data: subs });
    }

    // PATCH /api/contact/:id -> SÉCURISÉ (Mise à jour du statut)
    if (method === 'PATCH' && reqPath.startsWith('/api/contact/')) {
      const id = reqPath.replace('/api/contact/', '');
      let bodyStr = '';
      req.on('data', chunk => { bodyStr += chunk.toString(); });
      req.on('end', () => {
        const body = JSON.parse(bodyStr || '{}');
        const subs = readDb();
        const sub = subs.find(s => s.id === id);
        if (!sub) return sendJson(res, 404, { success: false, error: 'Introuvable' });

        sub.status = body.status || (sub.status === 'Nouveau' ? 'Traité' : 'Nouveau');
        writeDb(subs);
        return sendJson(res, 200, { success: true, data: sub });
      });
      return;
    }

    // DELETE /api/contact -> SÉCURISÉ (Vider la base)
    if (method === 'DELETE' && reqPath === '/api/contact') {
      writeDb([]);
      return sendJson(res, 200, { success: true, message: 'Base de données réinitialisée.' });
    }

    // DELETE /api/contact/:id -> SÉCURISÉ (Supprimer une demande)
    if (method === 'DELETE' && reqPath.startsWith('/api/contact/')) {
      const id = reqPath.replace('/api/contact/', '');
      let subs = readDb();
      const initialCount = subs.length;
      subs = subs.filter(s => s.id !== id);

      if (subs.length === initialCount) {
        return sendJson(res, 404, { success: false, error: 'Introuvable' });
      }

      writeDb(subs);
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
  🌐 Site Français (Clean) : http://localhost:${PORT}/
  🌐 Site Arabe (Clean)    : http://localhost:${PORT}/ar
  🔒 Espace Admin (Clean)  : http://localhost:${PORT}/admin
  🔐 Identifiants Admin   : Login: ${ADMIN_USER} | Pass: ${ADMIN_PASS}
  ═══════════════════════════════════════════════════════════════
  `);
});
