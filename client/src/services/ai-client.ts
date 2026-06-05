/**
 * Client-side AI service that calls GitHub Models API directly.
 * This eliminates the need for a backend server.
 * 
 * SECURITY NOTE: The API token is entered by the user at runtime,
 * never stored in the source code or committed to git.
 */

const GITHUB_MODELS_URL = "https://models.inference.ai.azure.com/chat/completions";
const MODEL = "gpt-4.1";

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
}

/**
 * Generate IaC code by calling GitHub Models API directly from the browser.
 */
export async function generateIaC(
  description: string,
  outputType: "terraform" | "ansible" | "both",
  provider: "aws" | "azure" | "gcp",
  token: string
): Promise<GenerationResult> {
  const files: GeneratedFiles = {};

  if (outputType === "terraform" || outputType === "both") {
    files.terraform = await callAI(getTerraformSystemPrompt(), getTerraformUserPrompt(description, provider), token);
    files.terraform = stripCodeFences(files.terraform);
  }

  if (outputType === "ansible" || outputType === "both") {
    files.ansible = await callAI(getAnsibleSystemPrompt(), getAnsibleUserPrompt(description, provider), token);
    files.ansible = stripCodeFences(files.ansible);
  }

  // Generate architecture
  const codeContext = files.terraform
    ? files.terraform.substring(0, 4000)
    : files.ansible
    ? files.ansible.substring(0, 4000)
    : "";
  files.architecture = await callAI(
    getArchitectureSystemPrompt(),
    getArchitectureUserPrompt(description, provider, codeContext),
    token
  );

  files.readme = generateReadme(description, outputType, provider);

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
  };
}

async function callAI(systemPrompt: string, userPrompt: string, token: string): Promise<string> {
  const response = await fetch(GITHUB_MODELS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({
      model: MODEL,
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
    throw new Error(err.error?.message || `API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

function stripCodeFences(code: string): string {
  let cleaned = code.trim();
  cleaned = cleaned.replace(/^```[\w]*\n?/, "");
  cleaned = cleaned.replace(/\n?```\s*$/, "");
  return cleaned.trim();
}

// --- Terraform Prompts ---

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

// --- Ansible Prompts ---

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

// --- Architecture Prompts ---

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

// --- Architecture Rules ---

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

// --- Validators ---

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

// --- README Generator ---

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
