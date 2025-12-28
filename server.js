const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const next = require('next');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);

// WebSocket Server para signaling
const wss = new WebSocket.Server({ server, path: '/ws' });

// Armazena as salas de call
const calls = new Map();

// Persistência simples em arquivo
const dataDir = path.join(__dirname, 'data');
const callsFile = path.join(dataDir, 'calls.json');
const usersFile = path.join(dataDir, 'users.json');
const sessionsFile = path.join(dataDir, 'sessions.json');
const eventsFile = path.join(dataDir, 'events.json');
const salesFile = path.join(dataDir, 'sales.json');

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(callsFile)) fs.writeFileSync(callsFile, JSON.stringify({ calls: [] }, null, 2));
  if (!fs.existsSync(usersFile)) fs.writeFileSync(usersFile, JSON.stringify({ users: [] }, null, 2));
  if (!fs.existsSync(sessionsFile)) fs.writeFileSync(sessionsFile, JSON.stringify({ sessions: [] }, null, 2));
  if (!fs.existsSync(eventsFile)) fs.writeFileSync(eventsFile, JSON.stringify({ events: [] }, null, 2));
  if (!fs.existsSync(salesFile)) fs.writeFileSync(salesFile, JSON.stringify({ sales: [] }, null, 2));
}

function readJson(filePath, fallback) {
  try {
    ensureDataDir();
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(filePath, value) {
  ensureDataDir();
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function appendEvent(evt) {
  const store = readJson(eventsFile, { events: [] });
  store.events = Array.isArray(store.events) ? store.events : [];
  store.events.push(evt);
  writeJson(eventsFile, store);
}

function listEvents(limit = 5000) {
  const store = readJson(eventsFile, { events: [] });
  const arr = Array.isArray(store.events) ? store.events : [];
  return arr.slice(Math.max(0, arr.length - limit));
}

function listSales() {
  const store = readJson(salesFile, { sales: [] });
  return Array.isArray(store.sales) ? store.sales : [];
}

function saveSales(sales) {
  writeJson(salesFile, { sales });
}

function parseCurrencyToNumber(input) {
  if (input === null || input === undefined) return null;
  if (typeof input === 'number') return Number.isFinite(input) ? input : null;
  if (typeof input !== 'string') return null;
  const raw = input.replace(/\s/g, '').replace(/^R\$/i, '');
  const hasComma = raw.includes(',');
  const hasDot = raw.includes('.');
  let normalized = raw;
  if (hasComma && hasDot) {
    const lastComma = raw.lastIndexOf(',');
    const lastDot = raw.lastIndexOf('.');
    if (lastComma > lastDot) normalized = raw.replace(/\./g, '').replace(',', '.');
    else normalized = raw.replace(/,/g, '');
  } else if (hasComma) normalized = raw.replace(/\./g, '').replace(',', '.');
  else if (hasDot) {
    const lastDot = raw.lastIndexOf('.');
    const decimals = raw.length - lastDot - 1;
    if (decimals === 2) normalized = raw.replace(/,/g, '');
    else normalized = raw.replace(/\./g, '');
  }
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function addSale({ callId, amount, note, userId }) {
  const sales = listSales();
  const item = { id: uuidv4(), callId, amount, note: note || null, at: new Date().toISOString(), userId: userId || null };
  sales.push(item);
  saveSales(sales);
  appendEvent({ id: uuidv4(), type: 'sale_marked', callId, at: item.at, amount: item.amount, userId: userId || null });
  return item;
}

function serializeCalls() {
  const out = [];
  for (const [callId, call] of calls.entries()) {
    out.push({
      callId,
      title: call.title || null,
      videoUrl: call.videoUrl,
      callerName: call.callerName || null,
      callerAvatarUrl: call.callerAvatarUrl || null,
      expiresAt: call.expiresAt ? new Date(call.expiresAt).toISOString() : null,
      expectedAmount: typeof call.expectedAmount === 'number' ? call.expectedAmount : null,
      ownerUserId: call.ownerUserId || null,
      createdAt: call.createdAt ? new Date(call.createdAt).toISOString() : new Date().toISOString()
    });
  }
  out.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return out;
}

function persistCalls() {
  try {
    ensureDataDir();
    fs.writeFileSync(callsFile, JSON.stringify({ calls: serializeCalls() }, null, 2));
  } catch (e) {
    console.error('Erro ao persistir calls:', e);
  }
}

function loadCallsFromDisk() {
  try {
    ensureDataDir();
    if (!fs.existsSync(callsFile)) return;
    const raw = fs.readFileSync(callsFile, 'utf-8');
    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed?.calls) ? parsed.calls : [];
    items.forEach((item) => {
      if (!item?.callId || !item?.videoUrl) return;
      calls.set(item.callId, {
        title: item.title || null,
        videoUrl: item.videoUrl,
        callerName: item.callerName || null,
        callerAvatarUrl: item.callerAvatarUrl || null,
        expiresAt: item.expiresAt ? new Date(item.expiresAt) : null,
        expectedAmount: typeof item.expectedAmount === 'number' ? item.expectedAmount : null,
        ownerUserId: item.ownerUserId || null,
        hostId: null,
        guests: new Set(),
        createdAt: item.createdAt ? new Date(item.createdAt) : new Date()
      });
    });
  } catch (e) {
    console.error('Erro ao carregar calls do disco:', e);
  }
}

function isExpired(call) {
  if (!call?.expiresAt) return false;
  const t = new Date(call.expiresAt).getTime();
  return Number.isNaN(t) ? false : Date.now() > t;
}

// Configuração Uploads
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
const avatarsDir = path.join(uploadsDir, 'avatars');
if (!fs.existsSync(avatarsDir)) fs.mkdirSync(avatarsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, `${uuidv4()}-${file.originalname}`)
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 1024 }, // 1GB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) cb(null, true);
    else cb(new Error('Apenas vídeos são permitidos'));
  }
});

const uploadAvatar = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, avatarsDir),
    filename: (req, file, cb) => cb(null, `${uuidv4()}-${file.originalname}`)
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Apenas imagens são permitidas'));
  }
});

// Middleware Global
app.use(cors());
app.use(express.json({ limit: '1000mb' }));
app.use(express.urlencoded({ limit: '1000mb', extended: true }));
app.use(cookieParser());

// Auth helpers
const SESSION_COOKIE = 'cs_session';
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function getSession(sessionId) {
  const store = readJson(sessionsFile, { sessions: [] });
  const s = (store.sessions || []).find((x) => x && x.sessionId === sessionId);
  if (!s) return null;
  if (Date.now() - new Date(s.createdAt).getTime() > SESSION_MAX_AGE_MS) return null;
  return s;
}

function requireAuth(req, res, nextFn) {
  const sid = req.cookies?.[SESSION_COOKIE];
  const s = sid ? getSession(sid) : null;
  if (!s) return res.status(401).json({ error: 'Não autenticado' });
  req.userId = s.userId;
  nextFn();
}

function setSession(res, userId) {
  const store = readJson(sessionsFile, { sessions: [] });
  const sessionId = crypto.randomBytes(24).toString('hex');
  store.sessions = Array.isArray(store.sessions) ? store.sessions : [];
  store.sessions.push({ sessionId, userId, createdAt: new Date().toISOString() });
  writeJson(sessionsFile, store);
  res.cookie(SESSION_COOKIE, sessionId, { httpOnly: true, sameSite: 'lax', secure: false, maxAge: SESSION_MAX_AGE_MS });
}

// --- API AUTH ---
app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'usuário e senha obrigatórios' });
  
  const store = readJson(usersFile, { users: [] });
  const exists = (store.users || []).some(u => u && (u.username || u.email || '').toLowerCase() === String(username).toLowerCase());
  
  if (exists) return res.status(409).json({ error: 'Usuário já existe' });
  
  const userId = uuidv4();
  store.users.push({ userId, username, passwordHash: bcrypt.hashSync(String(password), 10), createdAt: new Date().toISOString() });
  writeJson(usersFile, store);
  setSession(res, userId);
  res.json({ ok: true, userId, username });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'usuário e senha obrigatórios' });
  
  const store = readJson(usersFile, { users: [] });
  const user = (store.users || []).find(u => u && (u.username || u.email || '').toLowerCase() === String(username).toLowerCase());
  
  if (!user || !bcrypt.compareSync(String(password), user.passwordHash)) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }
  
  setSession(res, user.userId);
  res.json({ ok: true, userId: user.userId, username: user.username || user.email });
});

app.get('/api/auth/me', (req, res) => {
  const sid = req.cookies?.[SESSION_COOKIE];
  const s = sid ? getSession(sid) : null;
  if (!s) return res.status(401).json({ error: 'Não autenticado' });
  const store = readJson(usersFile, { users: [] });
  const user = (store.users || []).find(u => u && u.userId === s.userId);
  if (!user) return res.status(401).json({ error: 'Usuário não encontrado' });
  res.json({ ok: true, userId: user.userId, username: user.username || user.email });
});

// --- API UPLOADS ---
app.post('/api/upload-video', requireAuth, upload.single('video'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  res.json({ videoUrl: `/uploads/${req.file.filename}`, filename: req.file.filename });
});

app.post('/api/upload-avatar', requireAuth, uploadAvatar.single('avatar'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  res.json({ avatarUrl: `/uploads/avatars/${req.file.filename}`, filename: req.file.filename });
});

// --- API CALLS ---
app.post('/api/create-call', requireAuth, (req, res) => {
  const { videoUrl, callerName, callerAvatarUrl, title, expectedAmount } = req.body;
  if (!videoUrl) return res.status(400).json({ error: 'videoUrl é obrigatório' });
  
  const callId = uuidv4();
  const amt = parseCurrencyToNumber(expectedAmount);
  
  calls.set(callId, {
    title: title || null,
    videoUrl,
    callerName: callerName || null,
    callerAvatarUrl: callerAvatarUrl || null,
    expiresAt: null,
    expectedAmount: amt,
    ownerUserId: req.userId,
    hostId: null,
    guests: new Set(),
    createdAt: new Date()
  });
  
  persistCalls();
  appendEvent({ id: uuidv4(), type: 'call_created', callId, at: new Date().toISOString(), userId: req.userId });
  if (amt) addSale({ callId, amount: amt, note: 'Venda registrada na criação', userId: req.userId });
  
  res.json({ callId, ringUrl: `/ring/${callId}` });
});

app.get('/api/calls', requireAuth, (req, res) => {
  const list = serializeCalls().filter(c => c.ownerUserId === req.userId);
  res.json({ calls: list });
});

app.get('/api/call/:callId', (req, res) => {
  const call = calls.get(req.params.callId);
  if (!call) return res.status(404).json({ error: 'Call não encontrada' });
  if (isExpired(call)) return res.status(410).json({ error: 'Expirada' });
  res.json({
    callId: req.params.callId,
    title: call.title,
    videoUrl: call.videoUrl,
    callerName: call.callerName,
    callerAvatarUrl: call.callerAvatarUrl,
    guestsCount: call.guests.size
  });
});

app.patch('/api/call/:callId', requireAuth, (req, res) => {
  const call = calls.get(req.params.callId);
  if (!call) return res.status(404).json({ error: 'Não encontrada' });
  if (call.ownerUserId !== req.userId) return res.status(403).json({ error: 'Sem permissão' });
  if (req.body.expireNow) call.expiresAt = new Date(Date.now() - 1000);
  persistCalls();
  res.json({ ok: true });
});

app.delete('/api/call/:callId', requireAuth, (req, res) => {
  const call = calls.get(req.params.callId);
  if (!call) return res.status(404).json({ error: 'Não encontrada' });
  if (call.ownerUserId !== req.userId) return res.status(403).json({ error: 'Sem permissão' });
  calls.delete(req.params.callId);
  persistCalls();
  res.json({ ok: true });
});

// --- API HISTORY & SALES ---
app.get('/api/history', requireAuth, (req, res) => {
  const events = listEvents(8000).filter(e => {
    const c = calls.get(e.callId);
    return !c || c.ownerUserId === req.userId;
  });
  res.json({ events });
});

app.get('/api/sales', requireAuth, (req, res) => {
  const sales = listSales().filter(s => {
    const c = calls.get(s.callId);
    return !c || c.ownerUserId === req.userId;
  });
  res.json({ sales });
});

app.post('/api/sales', requireAuth, (req, res) => {
  const { callId, amount } = req.body;
  const amt = parseCurrencyToNumber(amount);
  if (!amt) return res.status(400).json({ error: 'Valor inválido' });
  addSale({ callId, amount: amt, userId: req.userId });
  res.json({ ok: true });
});

app.post('/api/track', (req, res) => {
  const { callId, type } = req.body;
  if (!calls.has(callId)) return res.status(400).json({ error: 'Inválido' });
  appendEvent({ id: uuidv4(), type, callId, at: new Date().toISOString() });
  res.json({ ok: true });
});

// --- ROTAS DE PÁGINAS EXPRESS ---
app.get('/video/:callId', (req, res) => {
  const p = path.join(__dirname, 'public', 'video.html');
  if (fs.existsSync(p)) res.sendFile(p);
  else res.status(404).send('Página de vídeo não encontrada no servidor');
});

app.get('/call/:callId', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'call.html'));
});

app.get('/host/:callId', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'host.html'));
});

app.use(express.static('public', { index: false }));
app.use('/uploads', express.static('public/uploads'));

// --- NEXT.JS INTEGRATION ---
const dev = process.env.NODE_ENV !== 'production';
const nextApp = next({ dev, dir: __dirname });
const nextHandler = nextApp.getRequestHandler();

app.all('*', (req, res) => nextHandler(req, res));

const PORT = process.env.PORT || 8080;
async function start() {
  loadCallsFromDisk();
  await nextApp.prepare();
  server.listen(PORT, () => console.log(`🚀 Rodando na porta ${PORT}`));
}
start().catch(e => {
  console.error(e);
  process.exit(1);
});
