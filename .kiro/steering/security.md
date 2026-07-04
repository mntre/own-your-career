# Security Best Practices — Own Your Career

## Overview

This document provides security best practices for the Own Your Career PMGM 2026 system. The system handles sensitive employee performance data (PII) and requires defense against common attacks: SQL injection, XSS, CSRF, unauthorized access, data exposure, and DDoS attacks.

**Golden Rules:**
1. **Never trust user input** — Always validate and sanitize
2. **Use frameworks' built-in security** — Don't reinvent the wheel
3. **Principle of least privilege** — Users get minimum access needed
4. **Encrypt in transit and at rest** — All sensitive data protected
5. **Log everything** — Track access and changes for audit trails
6. **Fail securely** — Errors don't leak information

---

## 1. Authentication & Authorization

### Google OAuth 2.0 (Frontend)

**DO:**
- ✅ Verify Google ID token signature server-side (never trust client-side only)
- ✅ Store `email` + `role` in JWT after server verification
- ✅ Use HTTPS only (no HTTP)
- ✅ Set token expiry to 30 minutes or less
- ✅ Implement refresh token rotation

**DON'T:**
- ❌ Store Google credentials in localStorage (use sessionStorage, which clears on tab close)
- ❌ Trust the client's role claim — re-verify server-side against allowlist database
- ❌ Send Google tokens in API requests (use your own JWT instead)

### JWT (Server-Side)

**Implementation:**
```javascript
// DO: Verify JWT signature and expiry
const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (err) {
    return null; // Invalid or expired
  }
};

// DO: Use HS256 or RS256 algorithm (never 'none')
const token = jwt.sign(
  { email: user.email, role: user.role },
  process.env.JWT_SECRET,
  { algorithm: 'HS256', expiresIn: '30m' }
);

// DON'T: Accept tokens without verification
const decoded = jwt.decode(token); // ❌ WRONG - no verification
```

**Token Storage:**
- Frontend: `sessionStorage` (cleared on tab close, not vulnerable to XSS as much as localStorage)
- Backend: Secure cookie with `HttpOnly`, `Secure`, `SameSite=Strict` flags

```javascript
// DO: Set secure cookie
res.cookie('oyc_token', token, {
  httpOnly: true,      // Not accessible to JavaScript (prevents XSS theft)
  secure: true,        // HTTPS only
  sameSite: 'Strict',  // Prevents CSRF
  maxAge: 30 * 60 * 1000 // 30 minutes
});

// DON'T: Allow access from JavaScript
res.cookie('oyc_token', token); // ❌ WRONG - no httpOnly
```

### Role-Based Access Control (RBAC)

**Implementation:**
```javascript
// DO: Verify role before allowing action
const checkRole = (requiredRoles) => (req, res, next) => {
  const token = req.cookies.oyc_token;
  const decoded = verifyToken(token);
  
  if (!decoded || !requiredRoles.includes(decoded.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  req.user = decoded;
  next();
};

// Usage in routes
router.post('/api/admin/lock-date', checkRole(['ADMIN']), (req, res) => {
  // Only admins can call this
});

// DON'T: Check role in frontend only
if (user.role === 'ADMIN') { // ❌ WRONG - user can modify this in DevTools
  showAdminPanel();
}
```

**Allowlist Validation:**
- Always verify user email + role against database allowlist
- Never trust client-provided role

```javascript
// DO: Check against database
const allowlist = await db.query('SELECT * FROM allowlist WHERE email = ?', [email]);
if (!allowlist.length || allowlist[0].role !== expectedRole) {
  return res.status(401).json({ error: 'Unauthorized' });
}

// DON'T: Accept any role from client
const role = req.body.role; // ❌ WRONG - attacker can change this
```

---

## 2. Input Validation & Sanitization

### Frontend Validation

**Always validate before sending to server:**
```javascript
// DO: Validate email format
const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

// DO: Check field presence and types
const validateForm = (data) => {
  if (!data.email || typeof data.email !== 'string') return false;
  if (!data.role || !['EMPLOYEE', 'MANAGER', 'DATA_SPOC', 'ADMIN'].includes(data.role)) return false;
  return true;
};

// DO: Trim and sanitize strings
const sanitize = (str) => str.trim().toLowerCase();

// DON'T: Trust user input directly
const email = req.body.email; // ❌ WRONG - could be anything
```

### Backend Validation (CRITICAL)

**Always re-validate on server — never trust frontend validation:**
```javascript
// DO: Re-validate all inputs server-side
router.post('/api/submit-assessment', checkRole(['MANAGER']), (req, res) => {
  const { employeeId, scores } = req.body;
  
  // Validate format
  if (!employeeId || typeof employeeId !== 'string' || employeeId.length > 50) {
    return res.status(400).json({ error: 'Invalid employeeId' });
  }
  
  // Validate scores are numbers
  if (!Array.isArray(scores) || !scores.every(s => typeof s === 'number')) {
    return res.status(400).json({ error: 'Invalid scores format' });
  }
  
  // Validate scores are in range
  if (!scores.every(s => s >= 0 && s <= 100)) {
    return res.status(400).json({ error: 'Scores must be 0-100' });
  }
  
  // Proceed with validated data
});

// DON'T: Trust frontend validation
const data = req.body; // ❌ WRONG - could contain anything
```

### SQL Injection Prevention

**ALWAYS use parameterized queries:**
```javascript
// DO: Use parameterized queries with placeholders
const user = await db.query(
  'SELECT * FROM users WHERE email = ? AND role = ?',
  [email, role]
);

// DO: Use ORM (Sequelize, TypeORM, Mongoose)
const user = await User.findOne({ email, role });

// DON'T: String concatenation
const query = `SELECT * FROM users WHERE email = '${email}'`; // ❌ SQL injection!
const user = await db.query(query);

// DON'T: Template literals without escaping
const query = `SELECT * FROM users WHERE email = ${email}`; // ❌ Still vulnerable!
```

### XSS Prevention

**Escape user input before rendering:**
```javascript
// DO: Use framework escaping (React, Vue escape by default)
const userName = data.name; // "John & Co"
return <div>{userName}</div>; // React escapes: "John &amp; Co"

// DO: Escape in vanilla JS
const escape = (str) => {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};
const displayName = escape(data.name);
element.innerHTML = `<p>${displayName}</p>`;

// DO: Use .textContent for plain text
element.textContent = data.name; // Safe - no HTML parsing

// DON'T: Render user input as HTML
element.innerHTML = `<p>${data.name}</p>`; // ❌ XSS! If name = "<script>alert('hacked')</script>"
```

### CSRF Prevention

**Use CSRF tokens:**
```javascript
// DO: Generate CSRF token
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: false });

router.get('/form', csrfProtection, (req, res) => {
  res.send(`<form method="post" action="/submit">
    <input type="hidden" name="_csrf" value="${req.csrfToken()}">
    <input type="text" name="data">
    <button type="submit">Submit</button>
  </form>`);
});

// DO: Verify CSRF token on POST
router.post('/submit', csrfProtection, (req, res) => {
  // CSRF token already verified by middleware
  res.send('OK');
});

// DON'T: Accept POST requests without CSRF protection
router.post('/submit', (req, res) => { // ❌ Vulnerable to CSRF
  res.send('OK');
});
```

---

## 3. Secure Communication (HTTPS)

### Enforce HTTPS

**DO:**
```javascript
// DO: Redirect HTTP to HTTPS
app.use((req, res, next) => {
  if (!req.secure && process.env.NODE_ENV === 'production') {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
});

// DO: Set HSTS header
app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// DO: Use HTTPS certificates (Let's Encrypt free option)
const fs = require('fs');
const https = require('https');
const app = require('./app');

const options = {
  key: fs.readFileSync('/etc/letsencrypt/live/yourdomain.com/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/yourdomain.com/fullchain.pem')
};

https.createServer(options, app).listen(443);
```

---

## 4. Secrets Management

### Environment Variables

**DO:**
```javascript
// DO: Store secrets in .env (never commit to Git)
// .env
DB_PASSWORD=super_secret_password
JWT_SECRET=your_jwt_secret_key
GOOGLE_CLIENT_ID=your_google_client_id

// DO: Load with dotenv
require('dotenv').config();
const dbPassword = process.env.DB_PASSWORD;

// DO: Add .env to .gitignore
# .gitignore
.env
.env.local
```

**DON'T:**
```javascript
// ❌ Hardcoded secrets
const dbPassword = 'super_secret_password';

// ❌ Commit .env to Git
// (This exposes secrets to anyone with repo access)
```

### Google Apps Script Secrets

**Use PropertiesService (never hardcode):**
```javascript
// DO: Store in Properties
PropertiesService.getUserProperties().setProperty('DB_PASSWORD', 'secret');

// DO: Retrieve securely
const password = PropertiesService.getUserProperties().getProperty('DB_PASSWORD');

// DO: Use Secrets API (Apps Script)
const secret = Secret.getSecret('MY_SECRET_KEY');

// DON'T: Hardcode in .gs file
const password = 'super_secret_password'; // ❌ Visible in source
```

---

## 5. Database Security

### Connection Security

**DO:**
```javascript
// DO: Use connection pooling
const pool = mysql.createPool({
  connectionLimit: 10,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: 'Amazon RDS' // Force SSL
});

// DO: Use principle of least privilege for DB user
// CREATE USER 'app_user'@'localhost' IDENTIFIED BY 'password';
// GRANT SELECT, INSERT, UPDATE ON pmgm.* TO 'app_user'@'localhost';
// (Don't grant DROP, ALTER, CREATE privileges to app user)

// DON'T: Use root account for app connections
mysql.createConnection({
  user: 'root', // ❌ WRONG - way too much privilege
  password: 'root_password'
});
```

### Data Encryption

**DO:**
```javascript
// DO: Encrypt sensitive fields (email, PII)
const bcrypt = require('bcrypt');
const hashedEmail = await bcrypt.hash(email, 10);

// DO: Use database-level encryption
// MySQL: ALTER TABLE users MODIFY COLUMN email VARBINARY(255);
// Then encrypt before storing

// DO: Encrypt at rest (AWS RDS encryption, MongoDB encryption)
// Enable in database configuration

// DON'T: Store passwords in plain text
db.query('INSERT INTO users (email, password) VALUES (?, ?)', [email, plainPassword]); // ❌ WRONG
```

---

## 6. API Security

### Rate Limiting (DDoS Prevention)

**Implement rate limiting to prevent DDoS:**
```javascript
// DO: Use rate-limit middleware
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP',
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false
});

// Apply globally
app.use(limiter);

// Or to specific routes (stricter for auth)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Only 5 login attempts per 15 min
  skipSuccessfulRequests: true // Don't count successful logins
});

app.post('/api/login', authLimiter, handleLogin);

// DO: Log rate limit violations
const limiter = rateLimit({
  skip: (req) => req.ip === 'trusted-ip',
  handler: (req, res) => {
    console.warn(`Rate limit hit: IP=${req.ip}, Path=${req.path}`);
    res.status(429).json({ error: 'Too many requests' });
  }
});
```

### CORS (Cross-Origin Security)

**Configure CORS carefully:**
```javascript
// DO: Whitelist specific origins
const cors = require('cors');
app.use(cors({
  origin: ['https://yourdomain.com', 'https://app.yourdomain.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// DON'T: Allow all origins
app.use(cors()); // ❌ WRONG - allows any website to access your API

// DON'T: Use wildcard origin with credentials
app.use(cors({ origin: '*', credentials: true })); // ❌ Not allowed by browsers
```

### Security Headers

**Set HTTP security headers:**
```javascript
// DO: Use helmet middleware
const helmet = require('helmet');
app.use(helmet());

// Or manually:
app.use((req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Prevent XSS attacks
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Content Security Policy
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  
  // Disable caching for sensitive pages
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  
  next();
});
```

---

## 7. Logging & Monitoring

### Audit Logging

**Log all sensitive actions:**
```javascript
// DO: Log authentication events
const logAuth = (email, role, success, ip) => {
  console.log(JSON.stringify({
    event: 'auth_attempt',
    timestamp: new Date(),
    email,
    role,
    success,
    ip,
    userAgent: req.headers['user-agent']
  }));
  
  // Also store in database for audit trail
  db.query('INSERT INTO audit_log (event, email, success, ip) VALUES (?, ?, ?, ?)',
    ['auth', email, success, ip]
  );
};

// DO: Log data access
const logDataAccess = (userId, dataType, action) => {
  db.query('INSERT INTO audit_log (user_id, data_type, action, timestamp) VALUES (?, ?, ?, NOW())',
    [userId, dataType, action]
  );
};

// DO: Log admin actions
const logAdminAction = (adminId, action, details) => {
  db.query('INSERT INTO admin_audit (admin_id, action, details, timestamp) VALUES (?, ?, ?, NOW())',
    [adminId, action, JSON.stringify(details)]
  );
};

// DON'T: Log sensitive data
console.log(password); // ❌ WRONG - never log passwords
console.log(token); // ❌ WRONG - never log tokens
```

### Monitoring & Alerting

**Set up monitoring for security events:**
```javascript
// DO: Alert on suspicious activity
const suspiciousActivity = (event) => {
  if (event.failedLogins > 5) {
    sendAlert(`Multiple failed logins: ${event.ip}`);
  }
  
  if (event.rateLimitHits > 50) {
    sendAlert(`Rate limit violated: ${event.ip}`);
  }
  
  if (event.adminAction === 'DELETE_USER') {
    sendAlert(`Admin deleted user: ${event.adminId} deleted ${event.userId}`);
  }
};
```

---

## 8. Deployment Security

### Environment Separation

**DO:**
```
.env.development   # Local dev (loose rules, verbose logging)
.env.staging       # Staging (moderate security, mirrors production)
.env.production    # Production (strict security, minimal logging)
```

### Dependency Management

**DO:**
```bash
# Check for vulnerabilities
npm audit

# Fix known vulnerabilities
npm audit fix

# Use exact versions (don't use ^, ~, or *)
# package.json
{
  "dependencies": {
    "express": "4.18.2",
    "cors": "2.8.5"
  }
}

# Lock file
npm ci # Use lockfile instead of install
```

**DON'T:**
```json
{
  "dependencies": {
    "express": "^4.18.0",  // ❌ Could install 4.99.0 (security issues)
    "cors": "*"            // ❌ Could install any version
  }
}
```

---

## 9. DDoS Prevention Strategy

### Layers of Defense

| Layer | Method | Implementation |
|-------|--------|-----------------|
| **Network Level** | WAF (Web Application Firewall) | AWS Shield, Cloudflare |
| **Rate Limiting** | Request throttling | Express rate-limit middleware |
| **Connection Pooling** | Limit simultaneous connections | MySQL/DB connection pools |
| **Caching** | Cache frequent requests | Redis, CDN |
| **Load Balancing** | Distribute traffic | nginx, AWS ELB |
| **Monitoring** | Alert on anomalies | CloudWatch, Datadog |

### Implementation (Node.js)

```javascript
// DO: Comprehensive DDoS defense
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// 1. Rate limiting by IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests'
});

// 2. Stricter limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true
});

// 3. Connection pooling (prevents connection exhaustion)
const pool = mysql.createPool({
  connectionLimit: 50,
  waitForConnections: true,
  queueLimit: 0
});

// 4. Helmet security headers
app.use(helmet());

// 5. Timeout for slow requests
app.use((req, res, next) => {
  req.setTimeout(30000); // 30 second timeout
  next();
});

// 6. Compress responses (reduces bandwidth)
const compression = require('compression');
app.use(compression());

// 7. Use CDN for static assets (offload traffic)
// Configure in frontend to use CDN URLs

app.use(globalLimiter);
app.post('/api/login', authLimiter, handleLogin);
```

---

## 10. Security Checklist (Pre-Launch)

Before deploying to production:

- [ ] HTTPS enabled on all endpoints
- [ ] JWT tokens have expiry (< 30 min)
- [ ] Rate limiting implemented on all public routes
- [ ] CORS whitelist configured (no wildcard)
- [ ] Database credentials stored in environment variables
- [ ] All inputs validated and sanitized server-side
- [ ] Parameterized SQL queries (no string concatenation)
- [ ] Security headers set (HSTS, X-Frame-Options, CSP, etc.)
- [ ] Helmet middleware enabled
- [ ] Audit logging enabled for sensitive actions
- [ ] Error messages don't leak system information
- [ ] Dependencies scanned for vulnerabilities (npm audit)
- [ ] Database backups enabled
- [ ] Monitoring and alerting configured
- [ ] WAF (Web Application Firewall) enabled
- [ ] Admin access limited to specific IPs
- [ ] Session cookies marked HttpOnly + Secure + SameSite
- [ ] CSRF tokens implemented on all state-changing requests
- [ ] XSS protection enabled (CSP, input escaping)
- [ ] SQL injection tests passed
- [ ] Load testing to simulate DDoS completed
- [ ] Incident response plan documented
- [ ] Security policy communicated to team

---

## Reference Links

- [OWASP Top 10](https://owasp.org/Top10/) — Common vulnerabilities
- [Node.js Security Checklist](https://nodejs.org/en/docs/guides/security/) — Official Node.js guide
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Google OAuth Security](https://developers.google.com/identity/protocols/oauth2)
- [JWT.io](https://jwt.io/) — JWT generation and validation
- [npm audit](https://docs.npmjs.com/cli/v9/commands/npm-audit) — Vulnerability scanning

---

**Last Updated:** July 5, 2026

