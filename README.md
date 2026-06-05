# InfraSketch AI - AI-Assisted DevOps Onboarding Tool

An AI-powered tool that generates Terraform and Ansible scaffolding from natural language descriptions. Describe your cloud infrastructure in plain English, and InfraSketch produces ready-to-use Infrastructure as Code (IaC) using GitHub Copilot under the hood.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend (React + Vite)                       │
│  ┌───────────────┐  ┌────────────────┐  ┌───────────────────┐  │
│  │ NL Input      │  │ Code Preview   │  │ Export/Download    │  │
│  │ (Text Editor) │  │ (Monaco Editor)│  │ (ZIP Archive)     │  │
│  └───────────────┘  └────────────────┘  └───────────────────┘  │
└──────────────────────────────┬──────────────────────────────────┘
                               │ REST API (HTTP/JSON)
┌──────────────────────────────▼──────────────────────────────────┐
│                   Backend (Node.js + Express)                     │
│  ┌───────────────┐  ┌────────────────┐  ┌───────────────────┐  │
│  │ Prompt        │  │ AI Service     │  │ Template           │  │
│  │ Engineering   │  │ (Copilot/OAI)  │  │ Engine             │  │
│  └───────────────┘  └────────────────┘  └───────────────────┘  │
│  ┌───────────────┐  ┌────────────────┐                          │
│  │ Validator     │  │ History        │                          │
│  │ Service       │  │ (SQLite)       │                          │
│  └───────────────┘  └────────────────┘                          │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│            GitHub Copilot API / OpenAI GPT-4 API                 │
└─────────────────────────────────────────────────────────────────┘
```

### Architecture Components

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 18, Vite, TailwindCSS, Monaco Editor | User interface for NL input and code preview |
| Backend | Node.js 20, Express, TypeScript | API server, prompt engineering, validation |
| AI Engine | GitHub Copilot API / OpenAI GPT-4 | IaC code generation from natural language |
| Database | SQLite (via better-sqlite3) | Project history and generated code storage |
| Validation | HCL parser, YAML parser | Validates generated Terraform/Ansible code |
| Export | Archiver (ZIP) | Package generated files for download |

### Data Flow

1. User describes infrastructure in plain English
2. Frontend sends description to backend API
3. Backend constructs an optimized prompt with IaC context
4. Prompt is sent to GitHub Copilot / OpenAI API
5. AI generates Terraform/Ansible code
6. Backend validates and formats the output
7. Frontend displays code with syntax highlighting
8. User can edit, regenerate, or download the code

## Features

- Natural language to Terraform HCL conversion
- Natural language to Ansible YAML playbook conversion
- Multi-cloud support (AWS, Azure, GCP)
- Live code preview with Monaco Editor
- Syntax validation for generated code
- Download generated project as ZIP
- Generation history with re-use capability
- Template-based generation for common patterns

## Project Structure

```
infrasketch-ai/
├── client/                     # React frontend
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── pages/              # Route pages
│   │   ├── services/           # API client layer
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── package.json
├── server/                     # Express backend
│   ├── src/
│   │   ├── routes/             # API route handlers
│   │   ├── services/           # Business logic
│   │   ├── prompts/            # Prompt templates
│   │   ├── validators/         # IaC code validators
│   │   ├── db/                 # Database setup
│   │   └── index.ts            # Server entry point
│   ├── .env.example
│   └── package.json
├── docs/                       # Documentation
│   ├── SETUP.md
│   ├── USAGE.md
│   └── HOSTING.md
├── .gitignore
└── README.md
```

## Quick Start

```bash
# Install dependencies
cd server && npm install
cd ../client && npm install

# Configure environment
cp server/.env.example server/.env
# Add your OPENAI_API_KEY

# Start development
cd server && npm run dev     # Backend on http://localhost:3001
cd ../client && npm run dev  # Frontend on http://localhost:5173
```

## Documentation

- [Setup Guide](docs/SETUP.md) - Full installation and configuration
- [Usage Guide](docs/USAGE.md) - How to use InfraSketch AI
- [Hosting Guide](docs/HOSTING.md) - Deploy to production step by step

## License

MIT
