# Setup Guide

## Prerequisites

- **Node.js** 18+ (recommended: 20 LTS)
- **npm** 9+
- **Git**
- **OpenAI API Key** (or GitHub Copilot access token)

## Step 1: Clone the Repository

```bash
git clone https://github.com/your-org/infrasketch-ai.git
cd infrasketch-ai
```

## Step 2: Install Backend Dependencies

```bash
cd server
npm install
```

## Step 3: Install Frontend Dependencies

```bash
cd ../client
npm install
```

## Step 4: Configure Environment Variables

```bash
cd ../server
cp .env.example .env
```

Edit `server/.env` with your configuration:

```env
# Required: OpenAI API Key for code generation
OPENAI_API_KEY=sk-your-openai-api-key-here

# Optional: Use GitHub Copilot instead of OpenAI
# GITHUB_COPILOT_TOKEN=ghu_your-copilot-token

# Server Configuration
PORT=3001
NODE_ENV=development

# Frontend URL (for CORS)
CLIENT_URL=http://localhost:5173

# Database path
DB_PATH=./data/infrasketch.db
```

### Getting an OpenAI API Key

1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new secret key
5. Copy the key to your `.env` file

### Using GitHub Copilot (Alternative)

If you have GitHub Copilot Business/Enterprise with API access:

1. Generate a personal access token at [github.com/settings/tokens](https://github.com/settings/tokens)
2. Ensure your token has `copilot` scope
3. Set `GITHUB_COPILOT_TOKEN` in your `.env` file
4. Comment out `OPENAI_API_KEY`

## Step 5: Start Development Servers

Terminal 1 - Backend:
```bash
cd server
npm run dev
```

Terminal 2 - Frontend:
```bash
cd client
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## Step 6: Verify Installation

1. Open http://localhost:5173 in your browser
2. Type a simple description like: "Create an AWS EC2 instance with a security group"
3. Click "Generate" and verify code appears in the preview panel

## Troubleshooting

### "OPENAI_API_KEY is not set"
Ensure your `.env` file exists in the `server/` directory and contains a valid key.

### "CORS error in browser console"
Check that `CLIENT_URL` in your `.env` matches the frontend URL exactly.

### "Port already in use"
Change the `PORT` value in `.env` or kill the process using that port:
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <pid> /F

# macOS/Linux
lsof -i :3001
kill -9 <pid>
```

### "Module not found" errors
Delete `node_modules` and reinstall:
```bash
rm -rf node_modules package-lock.json
npm install
```
