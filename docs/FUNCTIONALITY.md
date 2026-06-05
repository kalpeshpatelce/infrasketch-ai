# InfraSketch AI — Features, Facilities & Functionality

## Overview

InfraSketch AI is an AI-assisted DevOps onboarding tool that converts natural language descriptions of cloud infrastructure into production-ready Infrastructure as Code (IaC). It runs entirely in the browser — no backend server required — and supports 12 LLM providers.

**Live URL:** https://kalpeshpatelce.github.io/infrasketch-ai/

---

## Core Features

### 1. Natural Language to Infrastructure as Code

Describe your cloud infrastructure in plain English, and InfraSketch AI generates ready-to-use code:

- **Input:** "Deploy WordPress using ECS Fargate and RDS"
- **Output:** Complete Terraform HCL with VPC, subnets, security groups, ALB, ECS, RDS — all properly architected

### 2. Terraform Code Generation

- Production-ready `.tf` files
- Proper provider configuration
- Variables with descriptions and defaults
- Output blocks for resource attributes
- Inline comments explaining architectural decisions
- Locals block for computed values
- Data sources (e.g., `aws_availability_zones`)

### 3. Ansible Playbook Generation

- Valid YAML playbooks with proper structure
- Descriptive play and task names
- Handlers for service management
- Tags on all tasks for selective execution
- Error handling with block/rescue
- Variables with sensible defaults
- No shell/command when a module exists

### 4. Architecture Diagram Generation

Every generation includes a visual architecture diagram:

- **Mermaid.js diagram** rendered live in the browser
- **Component inventory table** listing all resources
- **Data flow description** showing how traffic moves through the system
- Exported as `ARCHITECTURE.md` in the ZIP download

### 5. Multi-Cloud Support

| Cloud Provider | Supported Services |
|---|---|
| **AWS** | VPC, EC2, ECS Fargate, RDS, ALB, S3, CloudFront, ElastiCache, Lambda, etc. |
| **Azure** | VNet, App Service, AKS, Azure SQL, Application Gateway, etc. |
| **GCP** | VPC, GKE, Cloud SQL, Cloud Run, Load Balancer, etc. |

---

## AI Provider Support (12 Providers)

InfraSketch AI connects directly to any of these LLM providers from the browser:

| # | Provider | Models | Free Tier |
|---|----------|--------|-----------|
| 1 | **GitHub Models** (Default) | GPT-4.1, GPT-4o, DeepSeek-R1, Llama 3.3, Phi-4 | ✅ Free with GitHub PAT |
| 2 | **OpenAI** | GPT-4.1, GPT-4o, o3-mini, o4-mini | ❌ Paid |
| 3 | **Anthropic** | Claude Sonnet 4, Claude Haiku 4, Claude 3.5 | ❌ Paid |
| 4 | **Groq** | Llama 3.3 70B, Mixtral 8x7B, Gemma2, DeepSeek | ✅ Free tier |
| 5 | **Together AI** | Llama 3.3, Qwen 72B, DeepSeek R1, Mixtral 8x22B, Llama 405B | ✅ $25 free credits |
| 6 | **OpenRouter** | 200+ models (GPT, Claude, Gemini, Llama, DeepSeek) | ✅ Free credits |
| 7 | **Mistral AI** | Mistral Large, Medium, Small, Codestral | ✅ Free tier |
| 8 | **DeepSeek** | DeepSeek Chat, DeepSeek Reasoner | ✅ Very affordable |
| 9 | **Fireworks AI** | Llama 3.3, Qwen 72B, DeepSeek R1 | ✅ $1 free credits |
| 10 | **Perplexity** | Sonar Pro, Sonar, Deep Research | ❌ Paid |
| 11 | **Cohere** | Command R+, Command R, Command Light | ✅ Free trial |
| 12 | **NVIDIA NIM** | Llama 3.3, Nemotron 70B | ✅ 1000 free calls |

**Users can select any provider and model from a dropdown.** GitHub Models is pre-selected by default since it's free for any GitHub user.

---

## Security Features

### Session-Only Key Storage

- API keys are stored in `sessionStorage` (automatically cleared when the browser tab closes)
- Keys are NEVER stored in `localStorage`, cookies, or any persistent storage
- Keys are NEVER transmitted to any server — all API calls go directly from browser to the LLM provider

### Security Warnings

The app displays a prominent security banner advising users to:
- Use temporary/session-only API keys
- Create keys with limited scope
- Revoke keys after use
- Never use production API keys on public websites

### No Backend = No Data Leaks

- Zero server infrastructure
- No database storing user prompts or generated code
- No analytics or tracking
- Everything stays in the user's browser

---

## Token Usage Tracking

### Real-Time Metrics

The app tracks and displays token consumption in real-time:

| Metric | Description |
|--------|-------------|
| **Input Tokens** | Tokens sent to the AI (prompts + system instructions) |
| **Output Tokens** | Tokens received from the AI (generated code) |
| **Total Tokens** | Combined input + output |
| **Per-Request** | Breakdown for the last generation |
| **Session Total** | Cumulative usage across all generations in the session |

### Token Usage Bar

A persistent bar at the bottom of the page shows:
- Session totals (input / output / total) with color coding
- Last request breakdown
- Reset button to clear the counter

### How Tokens Are Counted

- When the API returns `usage` data (OpenAI, Groq, etc.), exact counts are used
- When usage data is not available, tokens are estimated at ~4 characters per token
- This gives users cost awareness before they get their bill

---

## Architecture Intelligence

### Enforced Best Practices

The AI is instructed with mandatory architecture rules:

**AWS Network Architecture:**
- 3-tier subnet separation: Public → Private App → Private DB
- ALB ONLY in public subnets
- ECS tasks ONLY in private app subnets
- RDS ONLY in private DB subnets

**Security Group Chain:**
```
Internet → [ALB-SG: 80/443] → [APP-SG: from ALB only] → [DB-SG: from APP only]
```

**No Common Mistakes:**
- ❌ No ALB in DB subnets
- ❌ No ECS tasks in DB subnets
- ❌ No duplicate ECS services
- ❌ No 0.0.0.0/0 on app security groups
- ❌ No public access to databases
- ✅ NAT Gateway for private subnet internet access
- ✅ Proper IAM roles for ECS task execution
- ✅ Encryption at rest for databases

---

## UI/UX Features

### Code Editor (Monaco)

- Full Monaco Editor (same as VS Code) for viewing generated code
- Syntax highlighting for HCL, YAML, and Markdown
- Line numbers
- Word wrap
- Editable — users can modify generated code inline

### Tabbed Interface

| Tab | Content |
|-----|---------|
| **Architecture** | Mermaid diagram + component table + data flow |
| **main.tf** | Generated Terraform code |
| **playbook.yml** | Generated Ansible code |
| **README.md** | Usage instructions |

### Architecture View Sub-tabs

| Sub-tab | Content |
|---------|---------|
| **Diagram** | Visual Mermaid.js flowchart rendered in the browser |
| **Components** | Table of all resources with naming, placement, and security |
| **Data Flow** | Numbered steps showing how data/traffic flows |

### File Download

- Download all generated files individually
- Each file is properly named (main.tf, playbook.yml, ARCHITECTURE.md, README.md)
- Copy to clipboard button for quick use

### Responsive Design

- Works on desktop, tablet, and mobile
- Dark theme optimized for developers
- Side-by-side layout on desktop, stacked on mobile

---

## Code Quality Features

### Validation

Generated code is automatically validated:

**Terraform validation:**
- Balanced braces check
- Balanced quotes check
- Provider block presence
- Resource/data block presence
- Variable declaration vs usage check

**Ansible validation:**
- YAML document marker (---) check
- hosts: key presence
- tasks:/roles: section presence
- No tab characters (spaces only)

### Naming Conventions

All generated resources follow a consistent pattern:
```
{project}-{environment}-{resource-type}
```

Examples:
- `myapp-prod-vpc`
- `myapp-prod-public-us-east-1a`
- `myapp-prod-alb`
- `myapp-prod-ecs-cluster`
- `myapp-prod-wordpress-db`
- `myapp-prod-alb-sg`

---

## Deployment & Hosting

### GitHub Pages (Current)

- Hosted for free on GitHub Pages
- Automatic deployment via GitHub Actions on every push to `main`
- No infrastructure cost
- Global CDN via GitHub's infrastructure

### Build System

- **Framework:** React 18 + TypeScript
- **Bundler:** Vite 6
- **Styling:** TailwindCSS
- **CI/CD:** GitHub Actions
- **Node.js:** v22

---

## Supported Input Examples

| Description | Output Type |
|---|---|
| "Create an AWS VPC with public and private subnets" | Terraform |
| "Deploy WordPress using ECS Fargate and RDS" | Terraform |
| "Set up a Kubernetes cluster on GCP with autoscaling" | Terraform |
| "Create an S3 bucket with versioning and lifecycle rules" | Terraform |
| "Install Docker on Ubuntu servers and deploy nginx" | Ansible |
| "Configure a 3-tier web app: ALB + ECS + Aurora" | Terraform |
| "Set up Azure AKS cluster with private endpoint" | Terraform |
| "Install and configure PostgreSQL with replication" | Ansible |
| "Deploy a serverless API with Lambda and API Gateway" | Terraform |
| "Create a multi-region S3 setup with CloudFront" | Terraform |

---

## Technical Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| UI Framework | React 18 | Component-based interface |
| Language | TypeScript | Type safety |
| Build Tool | Vite 6 | Fast bundling & HMR |
| Styling | TailwindCSS 3 | Utility-first CSS |
| Code Editor | Monaco Editor | VS Code-like editing |
| Diagrams | Mermaid.js | Architecture visualization |
| Notifications | react-hot-toast | User feedback |
| Icons | Lucide React | Clean icon set |
| Hosting | GitHub Pages | Free static hosting |
| CI/CD | GitHub Actions | Automatic deployment |
| AI Integration | Direct API calls (fetch) | No backend dependency |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Enter` | Generate code |

---

## Privacy & Data

- ✅ No user data collected
- ✅ No analytics or tracking scripts
- ✅ No cookies
- ✅ No server-side logging
- ✅ API keys never leave the browser except to the selected provider
- ✅ Generated code is not stored anywhere
- ✅ Fully open source

---

## Limitations

| Limitation | Workaround |
|---|---|
| No persistent history | Copy/download your code after generation |
| Token estimation may vary | Use providers that return exact usage (OpenAI, Groq) |
| Mermaid diagrams may occasionally fail to render | Raw code shown as fallback with link to mermaid.live |
| Long generations may hit API rate limits | Wait and retry, or switch to a different provider |
| CORS restrictions on some providers | Use providers that allow browser access (all listed providers support it) |

---

## Future Roadmap

- [ ] Terraform plan preview (dry-run simulation)
- [ ] Import existing infrastructure (terraform state → diagram)
- [ ] Cost estimation for generated resources
- [ ] Git integration (push generated code to a repo)
- [ ] Template library for common architectures
- [ ] Team sharing via URL (encoded in URL params)
- [ ] Multi-file output (variables.tf, outputs.tf, etc.)
- [ ] Custom provider/model configuration
- [ ] Prompt history (local storage opt-in)
