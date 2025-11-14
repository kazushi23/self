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
aspect oriented programming
zod
js event loop
for each vs every
type vs interface
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
sudo ufw enable
```

### 3. Backend Deployment

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
echo "REDIS_URL=redis://localhost:6379" >> .env
```

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
                   │   Database  │
                   │  (Primary)  │
                   └──────┬──────┘
                          │
                   ┌──────┴──────┐
                   │  Replica DB │
                   │  (Read-only)│
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