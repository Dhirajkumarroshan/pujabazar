const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const OTPS_FILE = path.join(DATA_DIR, 'otps.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '[]');
}

function readUsers() {
  ensureDataDir();
  try {
    const raw = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (e) {
    return [];
  }
}

function writeUsers(users) {
  ensureDataDir();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function readOtps() {
  ensureDataDir();
  try {
    const raw = fs.readFileSync(OTPS_FILE, 'utf8');
    return JSON.parse(raw || '{}');
  } catch (e) {
    return {};
  }
}

function writeOtps(obj) {
  ensureDataDir();
  fs.writeFileSync(OTPS_FILE, JSON.stringify(obj, null, 2));
}

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateToken() {
  return crypto.randomBytes(24).toString('hex');
}

function sendWhatsAppMessage(toPhone, message, cb) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM; // e.g. 'whatsapp:+1415...'
  if (!accountSid || !authToken || !from) {
    // No provider configured — treat as dev: log and return success
    console.log(`WhatsApp dev send to ${toPhone}: ${message}`);
    return cb(null, { dev: true, message });
  }

  const https = require('https');
  const querystring = require('querystring');
  const postData = querystring.stringify({
    To: `whatsapp:${toPhone}`,
    From: from,
    Body: message,
  });

  const options = {
    hostname: 'api.twilio.com',
    path: `/2010-04-01/Accounts/${accountSid}/Messages.json`,
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(accountSid + ':' + authToken).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData),
    },
  };

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => cb(null, { statusCode: res.statusCode, body: data }));
  });
  req.on('error', cb);
  req.write(postData);
  req.end();
}

function hashPassword(password, salt = null) {
  salt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { salt, hash };
}

function parseJSONBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      try {
        const obj = JSON.parse(body || '{}');
        resolve(obj);
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  // Basic CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  if (req.method === 'POST' && req.url === '/api/signup') {
    try {
      const body = await parseJSONBody(req);
      const { name, email, password } = body || {};

      if (!email || !password) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'email and password required' }));
      }

      const users = readUsers();
      if (users.find(u => u.email === email)) {
        res.writeHead(409, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'User already exists' }));
      }

      const { salt, hash } = hashPassword(password);
      const user = {
        id: crypto.randomBytes(8).toString('hex'),
        name: name || '',
        email,
        salt,
        hash,
        createdAt: new Date().toISOString(),
      };

      users.push(user);
      writeUsers(users);

      res.writeHead(201, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: true, id: user.id }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Invalid request' }));
    }
  }

  if (req.method === 'POST' && req.url === '/api/login') {
    try {
      const body = await parseJSONBody(req);
      const { email, password } = body || {};

      if (!email || !password) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'email and password required' }));
      }

      const users = readUsers();
      const user = users.find(u => u.email === email);
      if (!user) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Invalid credentials' }));
      }

      const { hash } = hashPassword(password, user.salt);
      if (hash !== user.hash) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Invalid credentials' }));
      }

      const token = generateToken();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: true, id: user.id, token }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Invalid request' }));
    }
  }

  // WhatsApp OTP login: request OTP
  if (req.method === 'POST' && req.url === '/api/login/whatsapp/request') {
    try {
      const body = await parseJSONBody(req);
      const { phone } = body || {};
      if (!phone) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'phone required' }));
      }

      const otps = readOtps();
      const code = generateOtp();
      const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
      otps[phone] = { code, expiresAt };
      writeOtps(otps);

      const msg = `Your login code is ${code}`;
      sendWhatsAppMessage(phone, msg, (err, info) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'failed to send otp' }));
        }

        // In development (no provider) we include the code for easier testing
        const resp = { ok: true };
        if (info && info.dev) resp.otp = code;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(resp));
      });
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Invalid request' }));
    }
  }

  // WhatsApp OTP login: verify OTP
  if (req.method === 'POST' && req.url === '/api/login/whatsapp/verify') {
    try {
      const body = await parseJSONBody(req);
      const { phone, code } = body || {};
      if (!phone || !code) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'phone and code required' }));
      }

      const otps = readOtps();
      const entry = otps[phone];
      if (!entry || entry.code !== code || Date.now() > entry.expiresAt) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Invalid or expired code' }));
      }

      // Code valid — find or create user by phone
      const users = readUsers();
      let user = users.find(u => u.email === phone || u.phone === phone);
      if (!user) {
        user = {
          id: crypto.randomBytes(8).toString('hex'),
          name: '',
          email: phone,
          phone,
          salt: '',
          hash: '',
          createdAt: new Date().toISOString(),
        };
        users.push(user);
        writeUsers(users);
      }

      // consume OTP
      delete otps[phone];
      writeOtps(otps);

      const token = generateToken();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: true, id: user.id, token }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Invalid request' }));
    }
  }

  // Fallback
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
server.listen(PORT, HOST, () => {
  console.log(`Signup API server running on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
});
