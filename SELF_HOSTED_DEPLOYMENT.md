# Self-Hosted Stagehand Server Deployment

This guide walks you through deploying your own Stagehand API server so your automation framework runs **entirely on-premises** with no external cloud dependencies.

## Why Self-Host?

- ✅ **Zero Data Egress** – No DOM/app data leaves your network
- ✅ **Compliance** – Meet strict internal security & data residency policies  
- ✅ **Cost Control** – No per-session or per-request cloud charges
- ✅ **Full Control** – Customize the server, APIs, and logging as needed

## Option 1: Docker Deployment (Recommended)

### Prerequisites

- Docker & Docker Compose installed
- Node.js 18+ (for building, if not using pre-built images)
- At least 4 GB RAM available for the container

### Step 1: Clone the Stagehand Repository

```bash
git clone https://github.com/browserbase/stagehand.git
cd stagehand/packages/server
```

### Step 2: Build the Server

The server is bundled as a Node.js application in `packages/server/dist/server.js`.

```bash
# Install dependencies at repo root
cd ../..
pnpm install

# Build the server
pnpm run build --filter '@browserbasehq/stagehand-server'

# Or build everything
pnpm run build
```

### Step 3: Create a Docker Compose File

Create a `docker-compose.yml` in the server directory:

```yaml
version: '3.8'

services:
  stagehand-server:
    image: node:18-alpine
    working_dir: /app
    volumes:
      - ./dist:/app/dist
      - ./node_modules:/app/node_modules
    ports:
      - "3107:3107"  # Default Stagehand API port
    environment:
      - NODE_ENV=production
      - PORT=3107
      - BB_ENV=local  # Run in local/on-prem mode
      # Optional: customize these
      - CHROME_PATH=/usr/bin/chromium
    command: node dist/server.js
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3107/healthz"]
      interval: 10s
      timeout: 5s
      retries: 3
    restart: unless-stopped

  # Optional: Chromium service if running separately
  chromium:
    image: chromium:latest
    # Configure as needed
```

### Step 4: Start the Server

```bash
docker-compose up -d
```

Verify it's running:

```bash
curl http://localhost:3107/healthz
# Should return: "OK"
```

---

## Option 2: Bare Metal (Development/Testing)

For development or small deployments, you can run the server directly on your machine.

### Prerequisites

- Node.js 18+
- Chrome or Chromium installed locally
- At least 4 GB RAM

### Step 1: Clone & Build

```bash
git clone https://github.com/browserbase/stagehand.git
cd stagehand/packages/server
pnpm install
pnpm run build
```

### Step 2: Set Environment Variables

```bash
# Windows (PowerShell)
$env:NODE_ENV = "production"
$env:PORT = "3107"
$env:BB_ENV = "local"
$env:CHROME_PATH = "C:\Program Files\Google\Chrome\Application\chrome.exe"

# Linux/macOS
export NODE_ENV=production
export PORT=3107
export BB_ENV=local
export CHROME_PATH=/usr/bin/chromium
```

### Step 3: Start the Server

```bash
node dist/server.js
```

You should see:

```
Server listening at http://127.0.0.1:3107
Routes registered: ├── v1/sessions/start ...
```

---

## Option 3: Kubernetes Deployment

For enterprise deployments, a Helm chart or K8s manifest can be used. Minimal example:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: stagehand-server
spec:
  replicas: 1
  selector:
    matchLabels:
      app: stagehand-server
  template:
    metadata:
      labels:
        app: stagehand-server
    spec:
      containers:
      - name: stagehand-server
        image: node:18-alpine
        command: ["node", "dist/server.js"]
        ports:
        - containerPort: 3107
        env:
        - name: NODE_ENV
          value: "production"
        - name: BB_ENV
          value: "local"
        - name: PORT
          value: "3107"
        livenessProbe:
          httpGet:
            path: /healthz
            port: 3107
          initialDelaySeconds: 10
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: stagehand-server
spec:
  selector:
    app: stagehand-server
  ports:
    - protocol: TCP
      port: 3107
      targetPort: 3107
  type: ClusterIP
```

---

## Configuring Your Python Framework to Use Self-Hosted Server

### 1. Update `.env`

```env
# Use self-hosted server instead of Browserbase cloud
STAGEHAND_ENV=REMOTE
USE_SELF_HOSTED_SERVER=true
STAGEHAND_BASE_URL=http://stagehand-server.your-domain.local:3107

# You no longer need Browserbase keys!
# (leave them unset or empty)
# BROWSERBASE_API_KEY=
# BROWSERBASE_PROJECT_ID=

# LLM configuration (still required)
OPENAI_API_KEY=sk-your-key
OPENAI_MODEL=gpt-4o

# App configuration
TARGET_APP_URL=https://your-internal-app.com
TARGET_ENVIRONMENT=internal
```

### 2. Validate Configuration

```bash
python -m tests.example_test
```

You should see:

```
INFO     stagehand_automation - ✅ Configuration validated
INFO     stagehand_automation - Initializing Stagehand client
INFO     stagehand_automation - Stagehand client initialized successfully
```

### 3. Run Tests

```bash
pytest -v
```

---

## Monitoring & Scaling

### Health Checks

The server exposes health and readiness endpoints:

```bash
# Health check (always up)
curl http://localhost:3107/healthz

# Readiness check (ready to accept sessions)
curl http://localhost:3107/readyz

# Metrics (Prometheus format)
curl http://localhost:3107/metrics
```

### Logs

- **Development**: Pretty-printed logs to stdout
- **Production**: JSON logs for easy parsing

```bash
# Tail logs (if running in background)
docker-compose logs -f stagehand-server

# Or with systemd
journalctl -u stagehand-server -f
```

### Scaling

For multiple concurrent sessions:

1. **Increase container memory/CPU** (Docker resource limits)
2. **Run multiple instances behind a load balancer** (e.g., nginx, HAProxy)
3. **Use Kubernetes HPA** to auto-scale based on request queue depth

---

## Troubleshooting

### Server won't start

- Ensure Chrome/Chromium is installed and accessible at `CHROME_PATH`
- Check port 3107 is not in use: `lsof -i :3107` (macOS/Linux) or `netstat -ano` (Windows)
- Verify Node.js version: `node --version` (should be ≥18)

### Sessions fail with "Connection refused"

- Confirm the server is running: `curl http://localhost:3107/healthz`
- Check firewall rules if server is on a different machine
- Verify `STAGEHAND_BASE_URL` in `.env` matches your server address

### High memory usage

- Reduce concurrent session count or add session TTL limits
- Run garbage collection: configure `--max_old_space_size` in Node

```bash
node --max_old_space_size=4096 dist/server.js
```

### Chrome/Chromium crashes

- Increase available system memory
- Check `CHROME_PATH` points to a valid binary
- Review server logs for segmentation faults or OOM messages

---

## Performance Tuning

### Recommended Settings (Production)

```bash
export NODE_ENV=production
export NODE_OPTIONS="--max-old-space-size=4096 --enable-source-maps"
export BB_ENV=local
export PORT=3107

# Run with process manager (pm2, systemd, Docker)
pm2 start dist/server.js --name stagehand-server --instances max
```

### Capacity Estimate

- **Per concurrent session**: ~200–500 MB RAM
- **Overhead**: ~300 MB for the Node process
- **Example**: 4 GB machine can handle ~6–8 concurrent sessions

---

## Next Steps

Once your server is running:

1. **Test connectivity** from your framework:
   ```bash
   python -c "import requests; print(requests.get('http://localhost:3107/healthz').text)"
   ```

2. **Run the example test**:
   ```bash
   python -m tests.example_test
   ```

3. **Deploy behind a reverse proxy** (nginx) if exposed externally:
   ```nginx
   server {
       listen 443 ssl http2;
       server_name stagehand.your-domain.local;

       location / {
           proxy_pass http://localhost:3107;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
       }
   }
   ```

4. **Set up monitoring** (Prometheus + Grafana) by scraping `/metrics`

---

## Additional Resources

- [Stagehand GitHub](https://github.com/browserbase/stagehand)
- [Stagehand Docs](https://docs.stagehand.dev)
- [Stagehand Server README](https://github.com/browserbase/stagehand/blob/main/packages/server/README.md)

For questions or issues, join the [Stagehand Discord](https://stagehand.dev/discord).
