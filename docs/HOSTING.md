# Hosting Guide - Deploy InfraSketch AI to Production

This guide covers multiple hosting options, from simple to production-grade.

---

## Option 1: Deploy to Railway (Easiest)

**Cost:** ~$5-20/month | **Difficulty:** Easy | **Time:** 10 minutes

### Steps

1. **Push code to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/your-org/infrasketch-ai.git
   git push -u origin main
   ```

2. **Create Railway account**
   - Go to [railway.app](https://railway.app)
   - Sign in with GitHub

3. **Deploy Backend**
   - Click "New Project" → "Deploy from GitHub Repo"
   - Select your repository
   - Set root directory to `server`
   - Add environment variables:
     - `OPENAI_API_KEY` = your key
     - `NODE_ENV` = production
     - `CLIENT_URL` = (will set after frontend deploys)
   - Railway auto-detects Node.js and deploys

4. **Deploy Frontend**
   - Add another service in the same project
   - Set root directory to `client`
   - Add environment variable:
     - `VITE_API_URL` = your backend Railway URL
   - Deploy

5. **Update CORS**
   - Set `CLIENT_URL` on the backend to your frontend URL

---

## Option 2: Deploy to Vercel (Frontend) + Render (Backend)

**Cost:** Free tier available | **Difficulty:** Easy | **Time:** 15 minutes

### Frontend on Vercel

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Deploy:
   ```bash
   cd client
   vercel --prod
   ```

3. Set environment variable in Vercel dashboard:
   - `VITE_API_URL` = your backend URL

### Backend on Render

1. Go to [render.com](https://render.com) → New Web Service
2. Connect your GitHub repo
3. Configure:
   - **Root Directory:** `server`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Environment:** Node
4. Add environment variables:
   - `OPENAI_API_KEY`
   - `CLIENT_URL` = your Vercel frontend URL
   - `NODE_ENV` = production

---

## Option 3: Deploy to AWS (Production Grade)

**Cost:** ~$30-100/month | **Difficulty:** Medium | **Time:** 30-60 minutes

### Architecture on AWS

```
Route 53 → CloudFront → S3 (Frontend)
                      → ALB → ECS Fargate (Backend)
                                    → RDS/SQLite on EFS
```

### Step 1: Build Docker Image for Backend

Create `server/Dockerfile`:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
COPY data/ ./data/
EXPOSE 3001
CMD ["node", "dist/index.js"]
```

Build and push:
```bash
cd server
npm run build
docker build -t infrasketch-api .
docker tag infrasketch-api:latest <account-id>.dkr.ecr.<region>.amazonaws.com/infrasketch-api:latest

aws ecr get-login-password --region <region> | docker login --username AWS --password-stdin <account-id>.dkr.ecr.<region>.amazonaws.com
docker push <account-id>.dkr.ecr.<region>.amazonaws.com/infrasketch-api:latest
```

### Step 2: Deploy Backend to ECS Fargate

```bash
# Create ECS cluster
aws ecs create-cluster --cluster-name infrasketch-cluster

# Create task definition (see server/ecs-task-def.json)
aws ecs register-task-definition --cli-input-json file://ecs-task-def.json

# Create service
aws ecs create-service \
  --cluster infrasketch-cluster \
  --service-name infrasketch-api \
  --task-definition infrasketch-api \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
```

### Step 3: Deploy Frontend to S3 + CloudFront

```bash
# Build frontend
cd client
VITE_API_URL=https://api.yourdomain.com npm run build

# Create S3 bucket
aws s3 mb s3://infrasketch-frontend

# Upload
aws s3 sync dist/ s3://infrasketch-frontend --delete

# Create CloudFront distribution pointing to S3
aws cloudfront create-distribution --distribution-config file://cloudfront-config.json
```

### Step 4: Set Up Domain (Route 53)

1. Register or transfer domain in Route 53
2. Create hosted zone
3. Add A record aliased to CloudFront distribution
4. Add A record for `api.` subdomain pointing to ALB

---

## Option 4: Deploy to Azure (App Service)

**Cost:** ~$15-50/month | **Difficulty:** Medium | **Time:** 20 minutes

### Steps

1. **Install Azure CLI** and login:
   ```bash
   az login
   ```

2. **Create Resource Group:**
   ```bash
   az group create --name infrasketch-rg --location eastus
   ```

3. **Deploy Backend:**
   ```bash
   cd server
   az webapp up --name infrasketch-api --resource-group infrasketch-rg --runtime "NODE:20-lts"
   az webapp config appsettings set --name infrasketch-api --resource-group infrasketch-rg --settings OPENAI_API_KEY=your-key NODE_ENV=production
   ```

4. **Deploy Frontend:**
   ```bash
   cd client
   npm run build
   az storage account create --name infrasketchui --resource-group infrasketch-rg --sku Standard_LRS
   az storage blob service-properties update --account-name infrasketchui --static-website --index-document index.html
   az storage blob upload-batch --account-name infrasketchui --source dist -d '$web'
   ```

---

## Option 5: Self-Host with Docker Compose

**Cost:** VPS ~$5-20/month | **Difficulty:** Medium | **Time:** 20 minutes

### docker-compose.yml

```yaml
version: '3.8'
services:
  backend:
    build: ./server
    ports:
      - "3001:3001"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - NODE_ENV=production
      - CLIENT_URL=https://yourdomain.com
    volumes:
      - db-data:/app/data

  frontend:
    build: ./client
    ports:
      - "80:80"
    depends_on:
      - backend

  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./certs:/etc/nginx/certs
    depends_on:
      - frontend
      - backend

volumes:
  db-data:
```

### Deploy to a VPS (DigitalOcean, Hetzner, etc.)

```bash
# SSH into your VPS
ssh root@your-server-ip

# Install Docker
curl -fsSL https://get.docker.com | sh

# Clone and deploy
git clone https://github.com/your-org/infrasketch-ai.git
cd infrasketch-ai
echo "OPENAI_API_KEY=your-key" > .env
docker compose up -d
```

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key for code generation |
| `GITHUB_COPILOT_TOKEN` | No | Alternative to OpenAI key |
| `NODE_ENV` | Yes | Set to `production` for deployment |
| `PORT` | No | Backend port (default: 3001) |
| `CLIENT_URL` | Yes | Frontend URL for CORS |
| `DB_PATH` | No | SQLite database file path |
| `VITE_API_URL` | Yes (FE) | Backend API URL for frontend |

## SSL/TLS Certificates

For custom domains, use Let's Encrypt:

```bash
# Install certbot
sudo apt install certbot

# Generate certificate
sudo certbot certonly --standalone -d yourdomain.com -d api.yourdomain.com

# Auto-renewal
sudo certbot renew --dry-run
```

## Monitoring and Logging

### Health Check Endpoint

The backend exposes `GET /api/health` for monitoring:
```json
{ "status": "ok", "timestamp": "2024-01-01T00:00:00.000Z" }
```

### Recommended Monitoring

- **Uptime:** UptimeRobot, Pingdom, or AWS CloudWatch
- **Logs:** Datadog, LogRocket, or built-in platform logging
- **Errors:** Sentry for error tracking
- **APM:** New Relic or Datadog APM

## Cost Estimation

| Hosting Option | Monthly Cost | Best For |
|---------------|-------------|----------|
| Railway | $5-20 | Quick prototypes, small teams |
| Vercel + Render | $0-25 | Free tier usage, startups |
| AWS ECS | $30-100 | Production, enterprise |
| Azure App Service | $15-50 | Microsoft shops |
| Docker on VPS | $5-20 | Full control, budget-conscious |

> Note: All options will also incur OpenAI API costs (~$0.01-0.10 per generation depending on model and token usage).
