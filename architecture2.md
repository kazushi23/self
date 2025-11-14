# Production System Architecture Guide

## Table of Contents
1. [Basic Architecture Overview](#basic-architecture-overview)
2. [Server Setup & Deployment](#server-setup--deployment)
3. [High Availability & Scaling](#high-availability--scaling)
4. [Database Architecture](#database-architecture)
5. [Load Balancing](#load-balancing)
6. [Monitoring & Metrics](#monitoring--metrics)
7. [Common Interview Questions](#common-interview-questions)

---

**Q: How do you handle sessions across multiple backend servers?**

**A:**

**Problem:** Default session storage (in-memory) doesn't work with multiple servers:
```
User logs in → Server 1 (session in memory)
Next request → Server 2 (no session found!)
```

**Solution: Centralized Session Store with Redis**

```javascript
// All servers connect to same Redis instance
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const { createClient } = require('redis');

const redisClient = createClient({
  url: 'redis://redis-server:6379',
  password: 'your_password'
});

await redisClient.connect();

app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: 'your-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 86400000 } // 24 hours
}));
```

**Why Redis?**
- Fast (in-memory)
- Supports automatic expiration (TTL)
- High availability with replication
- Atomic operations
- Pub/sub capabilities

**Alternative: JWT (Stateless)**
```javascript
// No server-side session storage needed
const token = jwt.sign(
  { userId: user.id },
  process.env.JWT_SECRET,
  { expiresIn: '24h' }
);

// Client stores token, sends with each request
// Any server can verify the token
```

**Trade-offs:**
- **Sessions (Redis)**: Server controls logout, can revoke sessions
- **JWT**: Stateless, scales infinitely, but can't invalidate until expiry

---

**Q: Your frontend is on CDN but goes down. How do you handle this?**

**A:**

**Multi-layer Fallback Strategy:**

```nginx
# Layer 1: Try CDN
location / {
    proxy_pass https://d111111abcdef8.cloudfront.net;
    proxy_intercept_errors on;
    error_page 502 503 504 = @fallback_regional;
}

# Layer 2: Fallback to regional servers
location @fallback_regional {
    proxy_pass http://frontend_regional_servers;
    proxy_intercept_errors on;
    error_page 502 503 504 = @fallback_local;
}

# Layer 3: Fallback to local cache
location @fallback_local {
    root /var/cache/frontend_backup;
    try_files $uri $uri/ /index.html;
}
```

**CDN Failover Best Practices:**

1. **Multi-CDN Strategy:**
```javascript
// DNS-level failover
Primary:   cdn1.example.com → CloudFront
Secondary: cdn2.example.com → Cloudflare
Tertiary:  cdn3.example.com → Fastly
```

2. **Health Monitoring:**
```javascript
// Monitor CDN availability
setInterval(async () => {
  try {
    const response = await fetch('https://cdn.example.com/health.txt');
    if (response.ok) {
      metrics.recordCDNHealth('up');
    } else {
      switchToCDN2();
    }
  } catch (error) {
    switchToCDN2();
  }
}, 30000);
```

3. **Local Backup:**
```bash
# Sync latest build to origin servers
rsync -avz /var/www/frontend/build/ backup-server:/var/cache/frontend/
```

---

**Q: How do you ensure zero data loss with Redis for sessions?**

**A:**

**Problem:** Redis is in-memory, crashes lose data

**Solution: Redis Persistence + Replication**

**1. Enable AOF (Append-Only File):**
```conf
# redis.conf
appendonly yes
appendfsync everysec  # Fsync every second (good balance)

# Aggressive
appendfsync always    # Fsync on every write (slow but safest)

# Least safe
appendfsync no        # Let OS decide when to fsync
```

**2. RDB Snapshots:**
```conf
save 900 1      # After 900 sec if at least 1 key changed
save 300 10     # After 300 sec if at least 10 keys changed
save 60 10000   # After 60 sec if at least 10000 keys changed
```

**3. Master-Replica Replication:**
```
┌─────────────┐
│Redis Master │ ──(replicate)──▶ ┌──────────────┐
│  (Primary)  │                   │Redis Replica │
└─────────────┘                   └──────────────┘
     │
     │ (if master fails)
     ↓
┌──────────────┐
│Redis Sentinel│ ──(promotes)──▶ Replica becomes Master
└──────────────┘
```

**4. Redis Cluster (Sharded + Replicated):**
```
Master 1 ←→ Replica 1    (Handles keys hash slot 0-5500)
Master 2 ←→ Replica 2    (Handles keys hash slot 5501-11000)
Master 3 ←→ Replica 3    (Handles keys hash slot 11001-16383)
```

**Session Data Trade-off:**
- Most apps can tolerate losing a few sessions on crash
- Critical data (payments, etc.) should go to database
- Use Redis for speed, not as source of truth

---

**Q: Frontend server down but backend is fine - what happens?**

**A:**

**Scenario:**
```
CDN/Frontend Servers (DOWN ❌)
         ↓
   Backend API (UP ✓)
```

**Impact:**
- Users can't load initial HTML/JS/CSS
- Existing users with loaded app can still make API calls
- New users can't access the app

**Solutions:**

**1. Multi-Origin Failover:**
```javascript
// In your app's service worker
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .catch(() => {
        // If primary CDN fails, try secondary
        return fetch(event.request.url.replace('cdn1.', 'cdn2.'));
      })
  );
});
```

**2. Multiple Frontend Deployments:**
```
example.com     → Primary frontend (CDN)
app.example.com → Secondary frontend (Origin servers)
backup.example.com → Tertiary (Different region)
```

**3. DNS Failover:**
```
# Route53 Health Checks
Primary:   cdn.example.com (Weight 100, Health Check)
Secondary: backup.example.com (Weight 0, Failover)

# If primary fails, Route53 automatically routes to secondary
```

**4. Service Worker Cache:**
```javascript
// Cache frontend assets for offline use
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('app-v1').then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/static/js/main.js',
        '/static/css/main.css'
      ]);
    })
  );
});

// Serve from cache first, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});
```

**Recovery Time:**
- DNS failover: 30-60 seconds (DNS TTL)
- CDN failover: < 5 seconds (if configured)
- Service Worker cache: Instant (already cached)

---

**Q: How do you monitor Redis performance?**

**A:**

**Key Redis Metrics:**

```javascript
// Monitor with Redis INFO
const info = await redisClient.info();

// Parse important metrics
const metrics = {
  // Memory
  usedMemory: parseFloat(info.match(/used_memory:(\d+)/)[1]),
  maxMemory: parseFloat(info.match(/maxmemory:(\d+)/)[1]),
  
  // Operations
  opsPerSec: parseFloat(info.match(/instantaneous_ops_per_sec:(\d+)/)[1]),
  
  // Connections
  connectedClients: parseInt(info.match(/connected_clients:(\d+)/)[1]),
  
  // Hit Rate
  keyspaceHits: parseInt(info.match(/keyspace_hits:(\d+)/)[1]),
  keyspaceMisses: parseInt(info.match(/keyspace_misses:(\d+)/)[1]),
  hitRate: keyspaceHits / (keyspaceHits + keyspaceMisses),
  
  // Replication lag
  replOffset: parseInt(info.match(/master_repl_offset:(\d+)/)[1])
};
```

**Critical Metrics:**

1. **Hit Rate** (> 80% is good)
```bash
redis-cli INFO stats | grep keyspace
# keyspace_hits:1000000
# keyspace_misses:50000
# Hit rate = 1000000 / 1050000 = 95% ✓
```

2. **Memory Usage** (< 80% of maxmemory)
```bash
redis-cli INFO memory | grep used_memory_human
# used_memory_human:1.5G (of 2G maxmemory)
```

3. **Evicted Keys** (should be 0)
```bash
redis-cli INFO stats | grep evicted_keys
# evicted_keys:0  # Good!
# evicted_keys:1000  # Bad - increase memory
```

4. **Slow Commands** (> 10ms)
```bash
redis-cli SLOWLOG GET 10
```

**Prometheus Monitoring:**
```javascript
// Export Redis metrics
const client = require('prom-client');

const redisConnections = new client.Gauge({
  name: 'redis_connected_clients',
  help: 'Number of connected Redis clients'
});

const redisMemory = new client.Gauge({
  name: 'redis_memory_used_bytes',
  help: 'Redis memory usage in bytes'
});

// Update metrics periodically
setInterval(async () => {
  const info = await redisClient.info();
  redisConnections.set(parseInt(info.match(/connected_clients:(\d+)/)[1]));
  redisMemory.set(parseInt(info.match(/used_memory:(\d+)/)[1]));
}, 10000);
```

**Alerts:**
- Hit rate < 80%
- Memory usage > 85%
- Evicted keys > 0
- Slow commands > 10ms
- Replication lag > 1MB

---

## Basic Architecture Overview

### Simple Single Server Setup
```
┌─────────────────────────────────────────────┐
│           Ubuntu VM (Single Server)          │
├─────────────────────────────────────────────┤
│  NGINX (Port 80/443)                        │
│    ↓                                         │
│  Frontend (React/Vue) - Port 3000           │
│  Backend API (Node.js) - Port 8000          │
│  Database (PostgreSQL) - Port 5432          │
└─────────────────────────────────────────────┘
```

**Pros:** Simple, low cost, easy to manage  
**Cons:** Single point of failure, limited scalability

---

## Frontend Deployment & CDN

### Frontend Deployment Strategies

#### Option 1: Static Hosting with NGINX (Traditional)

```
┌──────────────────────────────────────────┐
│           Frontend Server (VM)            │
├──────────────────────────────────────────┤
│  NGINX serves static files               │
│  /var/www/frontend/build/                │
│    - index.html                          │
│    - static/js/main.js                   │
│    - static/css/main.css                 │
└──────────────────────────────────────────┘
```

**Deployment Process:**
```bash
# Build frontend
cd /var/www/frontend
npm install
npm run build

# Copy to NGINX directory
sudo rm -rf /var/www/html/*
sudo cp -r build/* /var/www/html/

# Or use symbolic link
sudo ln -sf /var/www/frontend/build /var/www/html

# Restart NGINX
sudo systemctl restart nginx
```

#### Option 2: CDN + Object Storage (Recommended for Production)

```
User Request
     ↓
CloudFlare CDN (Edge Locations)
     ↓ (Cache Miss)
AWS S3 / DigitalOcean Spaces
     ↓ (API Calls)
Backend Servers
```

**Benefits:**
- 10-100x faster load times
- Reduced origin server load
- Global content distribution
- DDoS protection
- Automatic SSL

**S3 + CloudFront Setup:**
```bash
# Build and deploy
npm run build

# Upload to S3
aws s3 sync build/ s3://my-app-frontend --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id E1234567890 \
  --paths "/*"
```

**NGINX Configuration for S3 Backend:**
```nginx
# Serve from S3 if frontend server fails
location / {
    try_files $uri $uri/ @s3;
}

location @s3 {
    proxy_pass https://my-app.s3.amazonaws.com;
}
```

#### Option 3: Multiple Frontend Servers with Load Balancing

```
                  ┌─────────────┐
                  │   CDN/LB    │
                  └──────┬──────┘
                         │
        ┌────────────────┼────────────────┐
        ↓                ↓                ↓
  ┌──────────┐     ┌──────────┐    ┌──────────┐
  │Frontend  │     │Frontend  │    │Frontend  │
  │Server 1  │     │Server 2  │    │Server 3  │
  │ (NGINX)  │     │ (NGINX)  │    │ (NGINX)  │
  └──────────┘     └──────────┘    └──────────┘
```

**Load Balancer Config:**
```nginx
# /etc/nginx/nginx.conf on Load Balancer
upstream frontend_servers {
    server 192.168.1.10:80 max_fails=3 fail_timeout=30s;
    server 192.168.1.11:80 max_fails=3 fail_timeout=30s;
    server 192.168.1.12:80 backup;
}

server {
    listen 80;
    server_name example.com;
    
    location / {
        proxy_pass http://frontend_servers;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Frontend Deployment Automation

**Using GitHub Actions:**
```yaml
# .github/workflows/deploy-frontend.yml
name: Deploy Frontend

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
        env:
          REACT_APP_API_URL: ${{ secrets.API_URL }}
      
      - name: Deploy to S3
        run: |
          aws s3 sync build/ s3://${{ secrets.S3_BUCKET }} --delete
          aws cloudfront create-invalidation --distribution-id ${{ secrets.CF_ID }} --paths "/*"
```

**Using PM2 Ecosystem (For Server-Side Rendering):**
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'frontend',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/frontend',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};

// Deploy
pm2 start ecosystem.config.js
pm2 save
```

### Frontend Failover Strategy

```nginx
# Primary frontend server
upstream primary_frontend {
    server cdn.example.com;
}

# Backup frontend servers
upstream backup_frontend {
    server frontend1.example.com;
    server frontend2.example.com;
}

server {
    location / {
        # Try CDN first
        proxy_pass http://primary_frontend;
        proxy_intercept_errors on;
        error_page 502 503 504 = @fallback;
    }
    
    location @fallback {
        # Fallback to origin servers
        proxy_pass http://backup_frontend;
    }
}
```

---

## Server Setup & Deployment

### 1. NGINX Configuration

**Purpose:** Reverse proxy, SSL termination, static file serving, load balancing

```nginx
# /etc/nginx/sites-available/myapp

server {
    listen 80;
    server_name example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    # Frontend - Serve static files
    location / {
        root /var/www/frontend/build;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### 2. Ubuntu VM Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install nginx postgresql redis-server -y

# Install Node.js (Backend)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Setup firewall
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw allow 6379  # Redis (only from internal network)
sudo ufw enable
```

### 2.1 Redis Setup for Session Management

**Why Redis for Sessions with Multiple Backend Nodes?**

When you have multiple backend servers behind a load balancer, user sessions need to be shared across all servers. Without Redis:
```
User → Backend 1 (login, session created)
User → Backend 2 (redirected by LB, session not found! ❌)
```

With Redis:
```
User → Backend 1 (login, saves session to Redis)
User → Backend 2 (reads session from Redis ✓)
```

**Redis Installation & Configuration:**

```bash
# Install Redis
sudo apt install redis-server -y

# Configure Redis
sudo nano /etc/redis/redis.conf
```

**Important Redis Config Changes:**
```conf
# /etc/redis/redis.conf

# Allow remote connections (for multiple backend servers)
bind 0.0.0.0  # Or specific IPs: 192.168.1.10 192.168.1.11

# Set password (IMPORTANT for security)
requirepass your_strong_password_here

# Persistence settings
save 900 1       # Save if at least 1 key changed in 900 seconds
save 300 10      # Save if at least 10 keys changed in 300 seconds
save 60 10000    # Save if at least 10000 keys changed in 60 seconds

# Memory management
maxmemory 2gb
maxmemory-policy allkeys-lru  # Evict least recently used keys

# Enable AOF for better durability
appendonly yes
appendfilename "appendonly.aof"
```

**Restart Redis:**
```bash
sudo systemctl restart redis-server
sudo systemctl enable redis-server

# Test Redis
redis-cli
> AUTH your_strong_password_here
> PING
PONG
> SET test "Hello Redis"
OK
> GET test
"Hello Redis"
```

**Secure Redis (Production):**
```bash
# Create firewall rules - only allow backend servers
sudo ufw allow from 192.168.1.10 to any port 6379
sudo ufw allow from 192.168.1.11 to any port 6379
sudo ufw allow from 192.168.1.12 to any port 6379

# Or use private network/VPC
# AWS: Security Groups
# DigitalOcean: Private Networking
```

### 3. Backend Deployment with Redis Sessions

```bash
# Clone repository
cd /var/www
git clone https://github.com/yourapp/backend.git

# Install dependencies
cd backend
npm install --production

# Setup PM2
pm2 start server.js --name "api-server"
pm2 save
pm2 startup

# Environment variables
echo "DATABASE_URL=postgresql://user:pass@localhost:5432/mydb" > .env
echo "REDIS_URL=redis://:your_password@redis-server-ip:6379" >> .env
echo "SESSION_SECRET=your_session_secret_here" >> .env
```

**Backend Code - Session Management with Redis:**

```javascript
// server.js
const express = require('express');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const { createClient } = require('redis');

const app = express();

// Redis Client Setup
const redisClient = createClient({
  url: process.env.REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        return new Error('Redis reconnection failed');
      }
      return retries * 100; // Exponential backoff
    }
  }
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.on('connect', () => console.log('Redis connected'));
redisClient.on('reconnecting', () => console.log('Redis reconnecting...'));

await redisClient.connect();

// Session Configuration
app.use(session({
  store: new RedisStore({ 
    client: redisClient,
    prefix: 'sess:',  // Key prefix in Redis
    ttl: 86400        // 24 hours in seconds
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
    sameSite: 'lax'
  }
}));

// Routes
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  // Authenticate user
  const user = await authenticateUser(email, password);
  
  if (user) {
    // Store user in session (saved to Redis)
    req.session.userId = user.id;
    req.session.email = user.email;
    
    res.json({ message: 'Login successful', user });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.get('/profile', isAuthenticated, async (req, res) => {
  // Session data retrieved from Redis
  const userId = req.session.userId;
  const user = await getUserById(userId);
  
  res.json({ user });
});

app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully' });
  });
});

// Middleware
function isAuthenticated(req, res, next) {
  if (req.session.userId) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized' });
}

// Health check includes Redis
app.get('/health', async (req, res) => {
  try {
    await redisClient.ping();
    await db.query('SELECT 1');
    res.json({ status: 'healthy', redis: 'connected', db: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});

app.listen(8000, () => console.log('Server running on port 8000'));
```

**Alternative: JWT with Redis (Stateless but with blacklist)**

```javascript
const jwt = require('jsonwebtoken');
const { promisify } = require('util');

// Login - Issue JWT
app.post('/login', async (req, res) => {
  const user = await authenticateUser(req.body.email, req.body.password);
  
  if (user) {
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Store token metadata in Redis (for blacklisting)
    await redisClient.setEx(`token:${user.id}`, 86400, token);
    
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Verify JWT middleware
async function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if token is blacklisted
    const isBlacklisted = await redisClient.get(`blacklist:${token}`);
    if (isBlacklisted) {
      return res.status(401).json({ error: 'Token revoked' });
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Logout - Blacklist token
app.post('/logout', verifyToken, async (req, res) => {
  const token = req.headers.authorization.split(' ')[1];
  
  // Add to blacklist with TTL matching token expiry
  await redisClient.setEx(`blacklist:${token}`, 86400, 'true');
  
  res.json({ message: 'Logged out successfully' });
});
```

**Session Storage in Redis - Data Structure:**
```
Redis Key-Value Store:
┌────────────────────────────────────────────┐
│ sess:abc123def456  →  {                    │
│                         userId: 42,        │
│                         email: "user@x.com"│
│                         loginTime: 1234567 │
│                       }                    │
│ TTL: 86400 seconds                         │
├────────────────────────────────────────────┤
│ sess:xyz789ghi012  →  { ... }              │
└────────────────────────────────────────────┘
```

**Redis Cluster for High Availability:**

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Backend 1  │────▶│ Redis Master │◀────│   Backend 2  │
└──────────────┘     └──────┬───────┘     └──────────────┘
                            │ (Replication)
                            ↓
                     ┌──────────────┐
                     │Redis Replica │
                     │ (Read-only)  │
                     └──────────────┘
```

**Redis Sentinel Configuration (Auto-failover):**
```conf
# sentinel.conf
sentinel monitor mymaster 192.168.1.20 6379 2
sentinel auth-pass mymaster your_redis_password
sentinel down-after-milliseconds mymaster 5000
sentinel parallel-syncs mymaster 1
sentinel failover-timeout mymaster 10000
```

```javascript
// Connect with Sentinel support
const redisClient = createClient({
  sentinels: [
    { host: '192.168.1.30', port: 26379 },
    { host: '192.168.1.31', port: 26379 },
    { host: '192.168.1.32', port: 26379 }
  ],
  name: 'mymaster',
  password: 'your_redis_password'
});
```

### Redis Performance Optimization

**1. Connection Pooling:**
```javascript
// Create single Redis client, reuse across requests
const redisClient = createClient({
  url: process.env.REDIS_URL,
  socket: {
    connectTimeout: 10000,
    keepAlive: 5000
  }
});

// Don't create new client per request!
```

**2. Pipeline Multiple Commands:**
```javascript
// Bad - Multiple round trips
await redisClient.set('key1', 'value1');
await redisClient.set('key2', 'value2');
await redisClient.set('key3', 'value3');

// Good - Single round trip
const pipeline = redisClient.multi();
pipeline.set('key1', 'value1');
pipeline.set('key2', 'value2');
pipeline.set('key3', 'value3');
await pipeline.exec();
```

**3. Use Appropriate Data Structures:**
```javascript
// Store user session as hash
await redisClient.hSet('user:123', {
  name: 'John',
  email: 'john@example.com',
  loginTime: Date.now()
});

// Get specific field
const email = await redisClient.hGet('user:123', 'email');

// Get all fields
const user = await redisClient.hGetAll('user:123');
```

**4. Set Expiration Times:**
```javascript
// Session with auto-expiry
await redisClient.setEx('session:abc123', 3600, JSON.stringify(sessionData));

// Rate limiting
const requests = await redisClient.incr(`ratelimit:${userId}:${minute}`);
await redisClient.expire(`ratelimit:${userId}:${minute}`, 60);
```

### Redis Monitoring

```bash
# Monitor Redis in real-time
redis-cli --stat

# Check memory usage
redis-cli INFO memory

# Monitor commands
redis-cli MONITOR

# Get slow queries
redis-cli SLOWLOG GET 10
```

**Redis Metrics to Track:**
- Connected clients
- Memory usage
- Hit rate (hits / (hits + misses))
- Evicted keys
- Command latency
- Replication lag (if using replicas)

### 4. Frontend Deployment

```bash
# Build frontend
cd /var/www/frontend
npm install
npm run build

# Copy build files
sudo cp -r build/* /var/www/frontend/dist/
```

### 5. Database Setup Decision

**Option A: Same Server (Small Apps)**
- DB on same VM as backend
- Pros: Simple, low latency, cost-effective
- Cons: Resource contention, harder to scale

**Option B: Separate Server (Recommended for Production)**
```
┌─────────────┐        ┌─────────────┐
│  App Server │───────▶│  DB Server  │
│  (Backend)  │        │(PostgreSQL) │
└─────────────┘        └─────────────┘
```
- Pros: Better resource isolation, easier scaling, better security
- Cons: Network latency, increased cost

**When to separate:**
- Traffic > 10,000 requests/day
- Database > 10GB
- Need horizontal scaling
- Running multiple applications

---

## High Availability & Scaling

### Architecture with Redundancy

```
                    ┌──────────────┐
                    │ Load Balancer│
                    │   (NGINX)    │
                    └──────┬───────┘
                           │
          ┌────────────────┼────────────────┐
          ↓                ↓                ↓
    ┌──────────┐     ┌──────────┐    ┌──────────┐
    │ Backend  │     │ Backend  │    │ Backend  │
    │ Server 1 │     │ Server 2 │    │ Server 3 │
    └────┬─────┘     └────┬─────┘    └────┬─────┘
         │                │               │
         └────────────────┼───────────────┘
                          ↓
                   ┌─────────────┐
                   │Redis Cluster│
                   │  (Sessions) │
                   └──────┬──────┘
                          │
         ┌────────────────┼───────────────┐
         ↓                ↓               ↓
   ┌──────────┐    ┌──────────┐    ┌──────────┐
   │  Redis   │    │  Redis   │    │  Redis   │
   │  Master  │───▶│ Replica 1│    │ Replica 2│
   └────┬─────┘    └──────────┘    └──────────┘
        │
        ↓
   ┌─────────────┐
   │   Database  │
   │  (Primary)  │
   └──────┬──────┘
          │
   ┌──────┴──────┐
   │  Replica DB │
   │  (Read-only)│
   └─────────────┘
```

**Complete Architecture with Frontend:**

```
                      ┌─────────────┐
                      │     CDN     │
                      │ CloudFlare  │
                      └──────┬──────┘
                             │
                             ↓
                      ┌─────────────┐
                      │  Frontend   │
                      │   Servers   │
                      │  (NGINX x3) │
                      └──────┬──────┘
                             │
                             ↓
                      ┌─────────────┐
                      │    ALB/     │
                      │   NGINX LB  │
                      └──────┬──────┘
                             │
          ┌──────────────────┼──────────────────┐
          ↓                  ↓                  ↓
    ┌──────────┐       ┌──────────┐      ┌──────────┐
    │ Backend 1│       │ Backend 2│      │ Backend 3│
    │ (Node.js)│       │ (Node.js)│      │ (Node.js)│
    └────┬─────┘       └────┬─────┘      └────┬─────┘
         │                  │                  │
         └──────────────────┼──────────────────┘
                            ↓
                     ┌─────────────┐
                     │    Redis    │
                     │   Cluster   │
                     │  (Sessions) │
                     └──────┬──────┘
                            ↓
                     ┌─────────────┐
                     │  PostgreSQL │
                     │   Cluster   │
                     └─────────────┘
```

### Horizontal Scaling Strategy

**1. Stateless Backend Servers**
- No session storage on server
- Use Redis for session management
- Enables adding/removing servers easily

**2. Auto-scaling Configuration**
```bash
# Example: AWS Auto Scaling Group
min_servers: 2
max_servers: 10
scale_up_threshold: CPU > 70% for 5 minutes
scale_down_threshold: CPU < 30% for 10 minutes
```

### Failover Strategy

**Frontend Failover:**
```nginx
# Multiple backend servers
upstream backend_servers {
    server 192.168.1.10:8000 max_fails=3 fail_timeout=30s;
    server 192.168.1.11:8000 max_fails=3 fail_timeout=30s;
    server 192.168.1.12:8000 backup;  # Backup server
}

server {
    location /api {
        proxy_pass http://backend_servers;
    }
}
```

**Database Failover:**
```
Primary DB ──(replication)──▶ Standby DB
    │                              │
    │ (health check fails)         │
    └──────────────────────────────▶ Promote to Primary
```

### Health Checks

```javascript
// Backend health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await db.query('SELECT 1');
    
    // Check Redis connection
    await redis.ping();
    
    res.status(200).json({ status: 'healthy' });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});
```

---

## Database Architecture

### 1. Replication (Read Scaling)

```
┌─────────────┐
│   Primary   │ (Write operations)
│  Database   │
└──────┬──────┘
       │ (Replication)
       ├────────────┬────────────┐
       ↓            ↓            ↓
┌──────────┐  ┌──────────┐  ┌──────────┐
│ Replica  │  │ Replica  │  │ Replica  │
│    1     │  │    2     │  │    3     │
└──────────┘  └──────────┘  └──────────┘
(Read-only)   (Read-only)   (Read-only)
```

**When to use:**
- Read-heavy applications (90% reads, 10% writes)
- Reporting and analytics queries
- Geographical distribution

**Implementation:**
```javascript
// Database connection pool
const primary = new Pool({ host: 'primary.db.com', ... });
const replicas = [
  new Pool({ host: 'replica1.db.com', ... }),
  new Pool({ host: 'replica2.db.com', ... })
];

function getReadConnection() {
  return replicas[Math.floor(Math.random() * replicas.length)];
}

// Usage
await primary.query('INSERT INTO users ...'); // Write to primary
await getReadConnection().query('SELECT * FROM users'); // Read from replica
```

### 2. Sharding (Write Scaling)

**Horizontal Partitioning:** Split data across multiple databases

```
User ID 1-1000    → Shard 1
User ID 1001-2000 → Shard 2
User ID 2001-3000 → Shard 3
```

**Sharding Strategies:**

**A. Range-based Sharding**
```javascript
function getShardForUser(userId) {
  if (userId <= 1000) return 'shard1';
  if (userId <= 2000) return 'shard2';
  return 'shard3';
}
```

**B. Hash-based Sharding**
```javascript
function getShardForUser(userId) {
  const shardId = userId % NUM_SHARDS;
  return `shard${shardId}`;
}
```

**C. Geographic Sharding**
```javascript
function getShardForUser(country) {
  const shardMap = {
    'US': 'us-shard',
    'EU': 'eu-shard',
    'ASIA': 'asia-shard'
  };
  return shardMap[country];
}
```

**Pros:**
- Horizontal scalability for writes
- Better performance (smaller datasets per shard)

**Cons:**
- Complex queries across shards
- Difficult to rebalance
- Application-level complexity

### 3. Database Indexing

```sql
-- Essential indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- Composite indexes
CREATE INDEX idx_orders_user_date ON orders(user_id, created_at);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM orders WHERE user_id = 123;
```

---

## Load Balancing

### Types of Load Balancing

**1. Layer 4 Load Balancing (Transport Layer)**
- Routes based on IP address and TCP/UDP port
- Fast, simple
- No application awareness

**2. Layer 7 Load Balancing (Application Layer)**
- Routes based on HTTP headers, cookies, URL path
- Intelligent routing
- SSL termination

### Load Balancing Algorithms

**1. Round Robin**
```nginx
upstream backend {
    server backend1.example.com;
    server backend2.example.com;
    server backend3.example.com;
}
```
- Distributes evenly
- Best for servers with similar capacity

**2. Least Connections**
```nginx
upstream backend {
    least_conn;
    server backend1.example.com;
    server backend2.example.com;
}
```
- Routes to server with fewest active connections
- Best for varying request processing times

**3. IP Hash (Sticky Sessions)**
```nginx
upstream backend {
    ip_hash;
    server backend1.example.com;
    server backend2.example.com;
}
```
- Same client always routes to same server
- Best for session-based applications

**4. Weighted Load Balancing**
```nginx
upstream backend {
    server backend1.example.com weight=3;  # 60% of traffic
    server backend2.example.com weight=2;  # 40% of traffic
}
```

### Cloud Load Balancers

**AWS Application Load Balancer (ALB)**
- Layer 7 load balancing
- Path-based routing
- Host-based routing
- Health checks

**AWS Network Load Balancer (NLB)**
- Layer 4 load balancing
- Ultra-low latency
- Static IP addresses

---

## Monitoring & Metrics

### Essential Metrics to Track

#### 1. Application Metrics

**Response Time**
```javascript
const responseTime = require('response-time');

app.use(responseTime((req, res, time) => {
  metrics.recordResponseTime(req.path, time);
}));
```
- **Target:** < 200ms for API calls
- **Alert:** > 1000ms

**Request Rate (Throughput)**
- Requests per second (RPS)
- **Monitor:** Sudden spikes or drops

**Error Rate**
```javascript
app.use((err, req, res, next) => {
  metrics.incrementErrorCount(err.statusCode);
  logger.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});
```
- **Target:** < 1% error rate
- **Alert:** > 5% error rate

#### 2. Server Metrics

**CPU Usage**
```bash
# Monitor with top/htop
top
```
- **Normal:** 40-60%
- **Alert:** > 80%

**Memory Usage**
```bash
free -h
```
- **Alert:** > 85% usage

**Disk I/O**
```bash
iostat -x 1
```
- **Alert:** High iowait (> 20%)

**Network I/O**
```bash
iftop
```
- Monitor bandwidth usage
- Identify network bottlenecks

#### 3. Database Metrics

**Query Performance**
```sql
-- PostgreSQL: Slow query log
ALTER SYSTEM SET log_min_duration_statement = 1000; -- Log queries > 1s
SELECT pg_reload_conf();

-- View slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**Connection Pool**
- Active connections
- Idle connections
- **Alert:** Near max_connections

**Database Size**
```sql
SELECT pg_size_pretty(pg_database_size('mydb'));
```

**Cache Hit Ratio**
```sql
SELECT 
  sum(heap_blks_read) as heap_read,
  sum(heap_blks_hit) as heap_hit,
  sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as ratio
FROM pg_statio_user_tables;
```
- **Target:** > 99% cache hit ratio

#### 4. Business Metrics

- Active users
- Sign-ups per day
- Revenue/transactions
- User retention rate

### Monitoring Tools

#### 1. **Prometheus + Grafana** (Recommended)

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'node-app'
    static_configs:
      - targets: ['localhost:8000']
  
  - job_name: 'nginx'
    static_configs:
      - targets: ['localhost:9113']
```

**Instrumentation:**
```javascript
const client = require('prom-client');
const register = new client.Registry();

// Metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

register.registerMetric(httpRequestDuration);

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

#### 2. **ELK Stack** (Logging)

- **Elasticsearch:** Store logs
- **Logstash:** Process logs
- **Kibana:** Visualize logs

```javascript
const winston = require('winston');
const { ElasticsearchTransport } = require('winston-elasticsearch');

const logger = winston.createLogger({
  transports: [
    new ElasticsearchTransport({
      clientOpts: { node: 'http://localhost:9200' }
    })
  ]
});

logger.info('User logged in', { userId: 123, ip: '192.168.1.1' });
```

#### 3. **Uptime Monitoring**

```javascript
// Simple uptime checker
const axios = require('axios');

setInterval(async () => {
  try {
    await axios.get('https://example.com/health');
    metrics.recordUptime(1);
  } catch (error) {
    metrics.recordUptime(0);
    alerts.sendAlert('Service is down!');
  }
}, 60000); // Check every minute
```

**External Services:**
- UptimeRobot
- Pingdom
- StatusCake

#### 4. **APM (Application Performance Monitoring)**

- **New Relic**
- **DataDog**
- **Sentry** (Error tracking)

```javascript
const Sentry = require('@sentry/node');

Sentry.init({ dsn: 'YOUR_DSN' });

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
```

### Alerting Strategy

**Alert Levels:**

1. **Critical** - Immediate action required
   - Service down
   - Database connection lost
   - Error rate > 10%

2. **Warning** - Needs attention soon
   - High CPU (> 80%)
   - Disk space low (> 85%)
   - Slow response times (> 1s)

3. **Info** - For awareness
   - Deployment completed
   - Scheduled maintenance

**Alert Channels:**
- PagerDuty (on-call rotation)
- Slack
- Email
- SMS (critical only)

---

## Common Interview Questions

### Architecture Questions

**Q: Why use NGINX instead of serving directly from Node.js?**

**A:** NGINX provides:
- Better static file serving (10x faster)
- SSL termination offloading
- Load balancing
- Rate limiting and DDoS protection
- Better handling of slow clients
- Reverse proxy capabilities

---

**Q: How do you handle database failover?**

**A:** 
1. Use database replication (Primary-Replica setup)
2. Implement health checks on primary
3. Automatic promotion of replica to primary when primary fails
4. DNS/Load balancer switches to new primary
5. Application reconnects automatically with retry logic

```javascript
const pool = new Pool({
  host: process.env.DB_HOST,
  connectionTimeoutMillis: 5000,
  max: 20,
  idleTimeoutMillis: 30000,
});

// Automatic reconnection
pool.on('error', (err) => {
  logger.error('Database connection error', err);
  // Attempt reconnection logic
});
```

---

**Q: How would you scale a system from 1,000 to 1 million users?**

**A:**

**Phase 1: 1K-10K users (Single Server)**
- Single VM with NGINX + App + DB
- Vertical scaling (increase server resources)

**Phase 2: 10K-100K users (Separation)**
- Separate database to dedicated server
- Add Redis for caching
- CDN for static assets
- Database read replicas

**Phase 3: 100K-1M users (Horizontal Scaling)**
- Multiple application servers with load balancer
- Database sharding
- Message queues (RabbitMQ/SQS) for async processing
- Microservices architecture for different domains
- Auto-scaling groups
- Multi-region deployment

---

**Q: How do you ensure zero-downtime deployments?**

**A:**

1. **Blue-Green Deployment**
   - Run two identical environments (Blue = current, Green = new)
   - Deploy to Green environment
   - Test Green environment
   - Switch traffic from Blue to Green
   - Keep Blue as rollback option

2. **Rolling Deployment**
   ```bash
   # Deploy to servers one by one
   for server in server1 server2 server3; do
     ssh $server "pm2 stop app && git pull && npm install && pm2 restart app"
     sleep 30  # Wait for health checks
   done
   ```

3. **Canary Deployment**
   - Deploy to 5% of servers first
   - Monitor metrics
   - Gradually increase to 100%

---

**Q: What causes slow database queries and how do you fix them?**

**A:**

**Causes:**
1. Missing indexes
2. Full table scans
3. N+1 query problem
4. Unoptimized queries
5. Lock contention

**Solutions:**
```sql
-- 1. Add indexes
CREATE INDEX idx_user_email ON users(email);

-- 2. Use EXPLAIN to analyze
EXPLAIN ANALYZE SELECT * FROM orders WHERE user_id = 123;

-- 3. Optimize queries
-- Bad: N+1 queries
SELECT * FROM orders;
-- For each order: SELECT * FROM users WHERE id = order.user_id;

-- Good: Use JOIN
SELECT orders.*, users.name 
FROM orders 
JOIN users ON orders.user_id = users.id;

-- 4. Add query caching with Redis
const cachedUser = await redis.get(`user:${userId}`);
if (cachedUser) return JSON.parse(cachedUser);

const user = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
await redis.setex(`user:${userId}`, 3600, JSON.stringify(user));
```

---

**Q: How do you handle high-traffic spikes?**

**A:**

1. **Caching Strategy**
   ```javascript
   // Redis cache
   const cacheKey = `product:${productId}`;
   let product = await redis.get(cacheKey);
   
   if (!product) {
     product = await db.getProduct(productId);
     await redis.setex(cacheKey, 3600, JSON.stringify(product));
   }
   ```

2. **Rate Limiting**
   ```javascript
   const rateLimit = require('express-rate-limit');
   
   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 100 // limit each IP to 100 requests per windowMs
   });
   
   app.use('/api/', limiter);
   ```

3. **Auto-scaling**
   - Horizontal pod autoscaling (Kubernetes)
   - AWS Auto Scaling Groups
   - Scale based on CPU, memory, or custom metrics

4. **CDN for static assets**
   - CloudFront, Cloudflare
   - Reduces origin server load

5. **Queue background jobs**
   ```javascript
   // Instead of processing immediately
   await queue.add('send-email', { userId, emailType });
   
   // Worker processes jobs asynchronously
   queue.process('send-email', async (job) => {
     await sendEmail(job.data);
   });
   ```

---

**Q: What's the difference between vertical and horizontal scaling?**

**A:**

**Vertical Scaling (Scale Up)**
- Add more CPU, RAM, disk to existing server
- Simpler to implement
- Limited by hardware constraints
- Single point of failure
- Example: t2.micro → t2.xlarge

**Horizontal Scaling (Scale Out)**
- Add more servers
- Nearly unlimited scaling
- Better fault tolerance
- Requires load balancing
- More complex (session management, data consistency)
- Example: 1 server → 10 servers

**When to use:**
- Vertical: Small apps, databases, quick fixes
- Horizontal: Large apps, stateless services, high availability needed

---

**Q: How do you monitor application health in production?**

**A:**

```javascript
// 1. Health check endpoint
app.get('/health', async (req, res) => {
  const health = {
    uptime: process.uptime(),
    timestamp: Date.now(),
    status: 'healthy',
    checks: {}
  };

  try {
    // Check database
    await db.query('SELECT 1');
    health.checks.database = 'up';
  } catch (e) {
    health.checks.database = 'down';
    health.status = 'unhealthy';
  }

  try {
    // Check Redis
    await redis.ping();
    health.checks.redis = 'up';
  } catch (e) {
    health.checks.redis = 'down';
    health.status = 'unhealthy';
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

// 2. Monitor key metrics
const metrics = {
  responseTime: histogram(),
  requestCount: counter(),
  errorCount: counter(),
  activeConnections: gauge()
};

// 3. Set up alerts
if (errorRate > 0.05) {
  alerting.send('High error rate detected');
}
```

**Key metrics to monitor:**
- Response time (p50, p95, p99)
- Error rate
- Request rate (throughput)
- CPU/Memory usage
- Database connection pool
- Queue depth

---

## Production Checklist

### Before Going Live

- [ ] SSL/TLS certificates configured
- [ ] Environment variables secured (not in code)
- [ ] Database backups automated
- [ ] Monitoring and alerting set up
- [ ] Load testing completed
- [ ] Security audit performed
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Logging centralized
- [ ] Health check endpoints working
- [ ] Disaster recovery plan documented
- [ ] On-call rotation established

### Security Best Practices

```nginx
# NGINX security headers
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
add_header Content-Security-Policy "default-src 'self'" always;
```

```javascript
// Backend security
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

app.use(helmet());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// Input validation
const { body, validationResult } = require('express-validator');

app.post('/users', [
  body('email').isEmail(),
  body('password').isLength({ min: 8 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  // Process request
});
```

---

## Conclusion

**Key Takeaways:**

1. **Start simple, scale when needed** - Don't over-engineer early
2. **Monitor everything** - You can't fix what you can't measure
3. **Automate deployments** - Reduce human error
4. **Plan for failure** - Everything fails eventually
5. **Document architecture** - Help future you and your team
6. **Security first** - Easier to build in than add later
7. **Test under load** - Before users find the problems

**Next Steps:**
1. Set up basic monitoring (Prometheus + Grafana)
2. Implement health checks
3. Configure automated backups
4. Create disaster recovery plan
5. Document runbooks for common issues