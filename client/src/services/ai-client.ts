/**
 * Client-side AI service supporting multiple LLM providers.
 * Calls APIs directly from the browser — no backend needed.
 *
 * SECURITY: API keys are entered by the user at runtime and stored
 * only in sessionStorage (cleared when browser tab closes).
 * Never committed to source code.
 */

// ─── Provider Definitions ───────────────────────────────────────────────────

export interface LLMProvider {
  id: string;
  name: string;
  models: string[];
  defaultModel: string;
  baseUrl: string;
  authHeader: (token: string) => Record<string, string>;
  docUrl: string;
  tokenNote: string;
}

export const LLM_PROVIDERS: LLMProvider[] = [
  {
    id: "github",
    name: "GitHub Models",
    models: ["gpt-4.1", "gpt-4o", "gpt-4.1-mini", "gpt-4o-mini", "DeepSeek-R1"],
    defaultModel: "gpt-4.1",
    baseUrl: "https://models.inference.ai.azure.com/chat/completions",
    authHeader: (token) => ({ Authorization: `Bearer ${token}` }),
    docUrl: "https://github.com/settings/tokens",
    tokenNote: "Create a Fine-grained PAT with 'models:read' permission",
  },
  {
    id: "openai",
    name: "OpenAI",
    models: ["gpt-4.1", "gpt-4o", "gpt-4o-mini", "gpt-4.1-mini", "o3-mini"],
    defaultModel: "gpt-4.1",
    baseUrl: "https://api.openai.com/v1/chat/completions",
    authHeader: (token) => ({ Authorization: `Bearer ${token}` }),
    docUrl: "https://platform.openai.com/api-keys",
    tokenNote: "Create an API key at platform.openai.com",
  },
  {
    id: "groq",
    name: "Groq",
    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768", "gemma2-9b-it"],
    defaultModel: "llama-3.3-70b-versatile",
    baseUrl: "https://api.groq.com/openai/v1/chat/completions",
    authHeader: (token) => ({ Authorization: `Bearer ${token}` }),
    docUrl: "https://console.groq.com/keys",
    tokenNote: "Free tier available. Create key at console.groq.com",
  },
  {
    id: "together",
    name: "Together AI",
    models: ["meta-llama/Llama-3.3-70B-Instruct-Turbo", "Qwen/Qwen2.5-72B-Instruct-Turbo", "deepseek-ai/DeepSeek-R1-Distill-Llama-70B"],
    defaultModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    baseUrl: "https://api.together.xyz/v1/chat/completions",
    authHeader: (token) => ({ Authorization: `Bearer ${token}` }),
    docUrl: "https://api.together.xyz/settings/api-keys",
    tokenNote: "$25 free credits on signup. Create key at together.xyz",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    models: ["openai/gpt-4.1", "anthropic/claude-sonnet-4", "google/gemini-2.5-flash", "meta-llama/llama-3.3-70b-instruct"],
    defaultModel: "openai/gpt-4.1",
    baseUrl: "https://openrouter.ai/api/v1/chat/completions",
    authHeader: (token) => ({ Authorization: `Bearer ${token}` }),
    docUrl: "https://openrouter.ai/keys",
    tokenNote: "Aggregator for 200+ models. Free credits available.",
  },
  {
    id: "anthropic",
    name: "Anthropic (Claude)",
    models: ["claude-sonnet-4-20250514", "claude-haiku-4-20250414"],
    defaultModel: "claude-sonnet-4-20250514",
    baseUrl: "https://api.anthropic.com/v1/messages",
    authHeader: (token) => ({ "x-api-key": token, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }),
    docUrl: "https://console.anthropic.com/settings/keys",
    tokenNote: "Create API key at console.anthropic.com",
  },
];

// ─── Token Usage Tracking ───────────────────────────────────────────────────

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface SessionTokenUsage {
  perRequest: TokenUsage[];
  total: TokenUsage;
}

let sessionUsage: SessionTokenUsage = {
  perRequest: [],
  total: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
};

export function getSessionUsage(): SessionTokenUsage {
  return sessionUsage;
}

export function resetSessionUsage(): void {
  sessionUsage = {
    perRequest: [],
    total: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
  };
}

function trackUsage(usage: TokenUsage): void {
  sessionUsage.perRequest.push(usage);
  sessionUsage.total.inputTokens += usage.inputTokens;
  sessionUsage.total.outputTokens += usage.outputTokens;
  sessionUsage.total.totalTokens += usage.totalTokens;
}

// Rough token estimation when API doesn't return usage stats
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// ─── Main Types ─────────────────────────────────────────────────────────────

export interface GeneratedFiles {
  terraform?: string;
  ansible?: string;
  architecture?: string;
  readme?: string;
}

export interface ValidationItem {
  type: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface GenerationResult {
  id: string;
  files: GeneratedFiles;
  validation: ValidationItem[];
  message: string;
  tokenUsage: TokenUsage;
}

// ─── Main Generation Function ───────────────────────────────────────────────

export async function generateIaC(
  description: string,
  outputType: "terraform" | "ansible" | "both",
  provider: "aws" | "azure" | "gcp",
  token: string,
  llmProvider: LLMProvider,
  model: string
): Promise<GenerationResult> {
  const files: GeneratedFiles = {};
  let requestUsage: TokenUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };

  if (outputType === "terraform" || outputType === "both") {
    const result = await callAI(getTerraformSystemPrompt(), getTerraformUserPrompt(description, provider), token, llmProvider, model);
    files.terraform = stripCodeFences(result.content);
    requestUsage.inputTokens += result.usage.inputTokens;
    requestUsage.outputTokens += result.usage.outputTokens;
    requestUsage.totalTokens += result.usage.totalTokens;
  }

  if (outputType === "ansible" || outputType === "both") {
    const result = await callAI(getAnsibleSystemPrompt(), getAnsibleUserPrompt(description, provider), token, llmProvider, model);
    files.ansible = stripCodeFences(result.content);
    requestUsage.inputTokens += result.usage.inputTokens;
    requestUsage.outputTokens += result.usage.outputTokens;
    requestUsage.totalTokens += result.usage.totalTokens;
  }

  // Generate architecture
  const codeContext = files.terraform
    ? files.terraform.substring(0, 4000)
    : files.ansible
    ? files.ansible.substring(0, 4000)
    : "";
  const archResult = await callAI(
    getArchitectureSystemPrompt(),
    getArchitectureUserPrompt(description, provider, codeContext),
    token,
    llmProvider,
    model
  );
  files.architecture = archResult.content;
  requestUsage.inputTokens += archResult.usage.inputTokens;
  requestUsage.outputTokens += archResult.usage.outputTokens;
  requestUsage.totalTokens += archResult.usage.totalTokens;

  files.readme = generateReadme(description, outputType, provider);

  // Track this generation's total usage
  trackUsage(requestUsage);

  // Validate
  const validation: ValidationItem[] = [];
  if (files.terraform) {
    validation.push({ type: "terraform", ...validateTerraform(files.terraform) });
  }
  if (files.ansible) {
    validation.push({ type: "ansible", ...validateAnsible(files.ansible) });
  }

  return {
    id: crypto.randomUUID(),
    files,
    validation,
    message: "Code generated successfully",
    tokenUsage: requestUsage,
  };
}

// ─── API Call ───────────────────────────────────────────────────────────────

interface AIResponse {
  content: string;
  usage: TokenUsage;
}

async function callAI(
  systemPrompt: string,
  userPrompt: string,
  token: string,
  provider: LLMProvider,
  model: string
): Promise<AIResponse> {
  // Anthropic has a different API format
  if (provider.id === "anthropic") {
    return callAnthropic(systemPrompt, userPrompt, token, model);
  }

  // OpenAI-compatible API format (GitHub, OpenAI, Groq, Together, OpenRouter)
  const response = await fetch(provider.baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...provider.authHeader(token),
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 8000,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = err.error?.message || err.message || `API error: ${response.status} ${response.statusText}`;
    throw new Error(msg);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";

  // Extract token usage from response
  const usage: TokenUsage = {
    inputTokens: data.usage?.prompt_tokens || estimateTokens(systemPrompt + userPrompt),
    outputTokens: data.usage?.completion_tokens || estimateTokens(content),
    totalTokens: data.usage?.total_tokens || estimateTokens(systemPrompt + userPrompt + content),
  };

  return { content, usage };
}

async function callAnthropic(
  systemPrompt: string,
  userPrompt: string,
  token: string,
  model: string
): Promise<AIResponse> {
  const provider = LLM_PROVIDERS.find((p) => p.id === "anthropic")!;

  const response = await fetch(provider.baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...provider.authHeader(token),
    },
    body: JSON.stringify({
      model,
      max_tokens: 8000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = err.error?.message || `Anthropic API error: ${response.status}`;
    throw new Error(msg);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text || "";

  const usage: TokenUsage = {
    inputTokens: data.usage?.input_tokens || estimateTokens(systemPrompt + userPrompt),
    outputTokens: data.usage?.output_tokens || estimateTokens(content),
    totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0) || estimateTokens(systemPrompt + userPrompt + content),
  };

  return { content, usage };
}

// ─── Utilities ──────────────────────────────────────────────────────────────

function stripCodeFences(code: string): string {
  let cleaned = code.trim();
  cleaned = cleaned.replace(/^```[\w]*\n?/, "");
  cleaned = cleaned.replace(/\n?```\s*$/, "");
  return cleaned.trim();
}

// ─── Prompt Functions (unchanged) ───────────────────────────────────────────

function getTerraformSystemPrompt(): string {
  return `You are a senior cloud architect and Terraform expert with 10+ years of production experience. You generate PRODUCTION-READY Terraform HCL code that follows cloud architecture best practices.

CRITICAL RULES YOU MUST FOLLOW:
1. NETWORK SEGMENTATION: Always separate subnets into public, private-app, and private-db tiers. Never mix resources across wrong tiers.
2. SECURITY GROUPS: Use security group references (not 0.0.0.0/0) for internal traffic. Only ALB gets internet-facing inbound rules.
3. NO DUPLICATE RESOURCES: Never create two ECS services for the same task. One service per task definition.
4. CORRECT PLACEMENT: ALB in public subnets, apps in private-app subnets, databases in private-db subnets. No exceptions.
5. INTERNET ACCESS FOR PRIVATE SUBNETS: Include NAT Gateway so private subnet resources can pull container images and reach external APIs.
6. ECS FARGATE: Tasks go in private app subnets with assign_public_ip=false (NAT handles outbound). Target type must be "ip".

OUTPUT FORMAT:
- Output ONLY valid HCL code
- NO markdown fences (no \`\`\`hcl or \`\`\`)
- NO explanatory text outside of HCL comments
- Include inline comments explaining architectural decisions
- Use proper Terraform formatting and indentation`;
}

function getTerraformUserPrompt(description: string, provider: string): string {
  const archRules = getArchitectureRules(provider);
  return `Generate production-ready Terraform code for the following infrastructure requirement.

Cloud Provider: ${provider.toUpperCase()}
Description: ${description}

${archRules}

## Code Structure Requirements:
1. Include the provider block
2. Use variables for ALL configurable values
3. Include proper resource naming with "project" and "environment" variables
4. Add output blocks for important resource attributes
5. Include comments explaining each resource
6. Use locals block for computed values
7. Use data sources where appropriate

Generate a SINGLE complete Terraform configuration file.`;
}

function getAnsibleSystemPrompt(): string {
  return `You are a senior DevOps engineer and Ansible expert with 10+ years of production experience. You generate PRODUCTION-READY Ansible playbooks.

CRITICAL RULES:
1. Use dedicated Ansible modules - NEVER use shell/command when a dedicated module exists
2. Use notify + handlers for service restarts (never restart inline)
3. Never hardcode secrets - use variables or vault references
4. Set restrictive file permissions
5. Include health checks and validation tasks
6. Use block/rescue for error handling
7. Tag every task for selective execution

OUTPUT FORMAT:
- Output ONLY valid YAML
- NO markdown fences
- Include inline comments for complex tasks
- Use consistent 2-space indentation`;
}

function getAnsibleUserPrompt(description: string, provider: string): string {
  return `Generate a production-ready Ansible playbook for:

Cloud Provider: ${provider.toUpperCase()}
Description: ${description}

Requirements:
1. Proper YAML with descriptive play name
2. Variables with sensible defaults
3. Appropriate modules (no shell/command when module exists)
4. Handlers for service management
5. Tags on ALL tasks
6. Error handling with block/rescue
7. Comments explaining complex tasks

Generate a complete Ansible playbook as valid YAML.`;
}

function getArchitectureSystemPrompt(): string {
  return `You are a cloud architecture documentation expert. Generate a comprehensive architecture document with THREE sections.

CRITICAL MERMAID SYNTAX RULES:
- Use "graph TB" direction
- Node IDs MUST use underscores only, NO DOTS. Example: alb_main NOT aws_lb.main
- Node IDs MUST be simple alphanumeric with underscores
- Use brackets for labels: alb_main["Application Load Balancer"]
- NEVER use dollar signs, curly braces, or template literals in node IDs or labels
- Use real values in labels (10.0.0.0/16), not variable references
- Arrow labels use |text| syntax: A -->|"port 80"| B

VALID EXAMPLE:
graph TB
  user["User / Internet"]
  subgraph vpc["VPC 10.0.0.0/16"]
    subgraph pub["Public Subnets"]
      alb["ALB - myapp-prod-alb"]
      nat["NAT Gateway"]
    end
    subgraph priv_app["Private App Subnets"]
      ecs["ECS Fargate - WordPress"]
    end
    subgraph priv_db["Private DB Subnets"]
      rds["RDS MySQL"]
    end
  end
  user -->|"HTTP :80"| alb
  alb -->|"Forward :80"| ecs
  ecs -->|"MySQL :3306"| rds
  ecs -->|"Outbound"| nat

FORMAT OUTPUT EXACTLY LIKE THIS:

---MERMAID---
graph TB
  ...
---END-MERMAID---

---COMPONENTS---
| Resource Name | Service | Naming Convention | Placement | Purpose | Security Group |
|---|---|---|---|---|---|
| aws_lb.main | ALB | project-env-alb | Public Subnets | Load balancer | alb-sg |
...
---END-COMPONENTS---

---FLOW---
1. User request hits ALB on port 80/443
2. ALB forwards to ECS tasks
3. ECS connects to RDS on port 3306
---END-FLOW---

No markdown fences. Only the formatted sections.`;
}

function getArchitectureUserPrompt(description: string, provider: string, codeContext: string): string {
  return `Generate architecture documentation for:

Cloud Provider: ${provider.toUpperCase()}
Description: ${description}

${codeContext ? `Generated code for reference:\n${codeContext}` : ""}`;
}

function getArchitectureRules(provider: string): string {
  if (provider === "aws") {
    return `## MANDATORY AWS Architecture Rules:

### Networking:
- VPC with 3 subnet tiers: public, private-app, private-db
- PUBLIC subnets: ONLY for ALB, NAT Gateway
- PRIVATE APP subnets: For ECS tasks, app servers
- PRIVATE DB subnets: ONLY for RDS, ElastiCache
- NAT Gateway in public subnets for private outbound access
- At least 2 AZs

### Security Groups:
- ALB SG: Inbound 80/443 from 0.0.0.0/0 only
- App SG: Inbound ONLY from ALB SG on app port
- DB SG: Inbound ONLY from App SG on DB port

### ECS/Fargate:
- Tasks in PRIVATE APP subnets, assign_public_ip=false
- NAT Gateway handles image pulls
- One service per task definition
- target_type = "ip" for Fargate

### RDS:
- Private DB subnets only, publicly_accessible=false
- storage_encrypted=true, multi_az=true for prod`;
  }
  if (provider === "azure") {
    return `## MANDATORY Azure Architecture Rules:
- VNet with gateway, application, and database subnets
- NSGs on each subnet with least-privilege rules
- Private Endpoints for database access
- App tier only accepts traffic from load balancer`;
  }
  if (provider === "gcp") {
    return `## MANDATORY GCP Architecture Rules:
- Custom VPC with separate subnets per tier
- Cloud NAT for private subnet outbound
- Firewall rules with target tags
- Cloud SQL Private IP only`;
  }
  return "";
}

// ─── Validators ─────────────────────────────────────────────────────────────

function validateTerraform(code: string): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  const openBraces = (code.match(/{/g) || []).length;
  const closeBraces = (code.match(/}/g) || []).length;
  if (openBraces !== closeBraces) errors.push(`Unbalanced braces: ${openBraces} open, ${closeBraces} close`);

  const quotes = (code.match(/"/g) || []).length;
  if (quotes % 2 !== 0) errors.push("Unbalanced quotes");

  if (!code.includes("provider ")) warnings.push("No provider block found");
  if (!code.includes("resource ") && !code.includes("data ")) warnings.push("No resource blocks found");

  return { valid: errors.length === 0, errors, warnings };
}

function validateAnsible(code: string): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!code.trimStart().startsWith("---")) warnings.push("Missing YAML document marker (---)");
  if (!code.includes("hosts:")) errors.push("No 'hosts' key found");
  if (!code.includes("tasks:") && !code.includes("roles:")) errors.push("No 'tasks' or 'roles' section");
  if (code.includes("\t")) errors.push("Tab characters found - use spaces");

  return { valid: errors.length === 0, errors, warnings };
}

function generateReadme(description: string, outputType: string, provider: string): string {
  const providerName = provider === "aws" ? "AWS" : provider === "azure" ? "Azure" : "Google Cloud";
  let usage = "";
  if (outputType === "terraform" || outputType === "both") {
    usage += `## Terraform Usage\n\n\`\`\`bash\nterraform init\nterraform plan\nterraform apply\nterraform destroy\n\`\`\`\n\n`;
  }
  if (outputType === "ansible" || outputType === "both") {
    usage += `## Ansible Usage\n\n\`\`\`bash\nansible-playbook -i inventory/hosts.yml playbook.yml\nansible-playbook -i inventory/hosts.yml playbook.yml --check\n\`\`\`\n\n`;
  }
  return `# Generated Infrastructure Code\n\n## Description\n${description}\n\n## Provider\n${providerName}\n\n## Generated By\nInfraSketch AI\n\n${usage}## Notes\n- Review all code before applying to production\n- Update variable values as needed\n- Ensure cloud credentials are configured\n`;
}
