import OpenAI from "openai";
import { getTerraformPrompt, getAnsiblePrompt } from "../prompts/iac-prompts";

// Lazy-initialized client (env vars aren't available at import time)
let openai: OpenAI | null = null;
let MODEL = "gpt-4.1";

function getClient(): OpenAI {
  if (openai) return openai;

  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    MODEL = "gpt-4.1";
  } else if (process.env.GITHUB_COPILOT_TOKEN) {
    openai = new OpenAI({
      apiKey: process.env.GITHUB_COPILOT_TOKEN,
      baseURL: "https://models.inference.ai.azure.com",
    });
    MODEL = "gpt-4.1";
  } else {
    throw new Error(
      "No AI API key configured. Set OPENAI_API_KEY or GITHUB_COPILOT_TOKEN in your .env file."
    );
  }

  return openai;
}

export interface GeneratedCode {
  terraform?: string;
  ansible?: string;
  readme?: string;
  architecture?: string;
}

export async function generateIaC(
  description: string,
  outputType: "terraform" | "ansible" | "both",
  provider: "aws" | "azure" | "gcp"
): Promise<GeneratedCode> {
  const result: GeneratedCode = {};

  if (outputType === "terraform" || outputType === "both") {
    result.terraform = await generateTerraform(description, provider);
  }

  if (outputType === "ansible" || outputType === "both") {
    result.ansible = await generateAnsible(description, provider);
  }

  // Always generate architecture diagram
  result.architecture = await generateArchitecture(description, provider, result.terraform, result.ansible);

  result.readme = generateReadme(description, outputType, provider);

  return result;
}

async function generateTerraform(
  description: string,
  provider: string
): Promise<string> {
  const prompt = getTerraformPrompt(description, provider);

  const response = await getClient().chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `You are a senior cloud architect and Terraform expert with 10+ years of production experience. You generate PRODUCTION-READY Terraform HCL code that follows cloud architecture best practices.

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
- Use proper Terraform formatting and indentation`,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.1,
    max_tokens: 8000,
  });

  return stripCodeFences(response.choices[0]?.message?.content || "");
}

async function generateAnsible(
  description: string,
  provider: string
): Promise<string> {
  const prompt = getAnsiblePrompt(description, provider);

  const response = await getClient().chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `You are a senior DevOps engineer and Ansible expert with 10+ years of production experience. You generate PRODUCTION-READY Ansible playbooks.

CRITICAL RULES:
1. Use dedicated Ansible modules - NEVER use shell/command when a module exists
2. Proper role structure with handlers, defaults, and templates
3. Use notify + handlers for service restarts (never restart inline)
4. Never hardcode secrets - use variables or vault references
5. Set proper file permissions (0600 for secrets, 0644 for configs)
6. Include health checks and validation tasks
7. Use block/rescue for error handling on critical tasks
8. Tag every task for selective execution

OUTPUT FORMAT:
- Output ONLY valid YAML
- NO markdown fences (no \`\`\`yaml or \`\`\`)
- NO explanatory text outside of YAML comments
- Include inline comments for complex tasks
- Use consistent 2-space indentation`,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.1,
    max_tokens: 8000,
  });

  return stripCodeFences(response.choices[0]?.message?.content || "");
}

/**
 * Generate architecture diagram and component list based on the generated IaC code.
 */
async function generateArchitecture(
  description: string,
  provider: string,
  terraformCode?: string,
  ansibleCode?: string
): Promise<string> {
  const codeContext = terraformCode
    ? `\n\nGenerated Terraform code for reference:\n${terraformCode.substring(0, 4000)}`
    : ansibleCode
    ? `\n\nGenerated Ansible code for reference:\n${ansibleCode.substring(0, 4000)}`
    : "";

  const response = await getClient().chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `You are a cloud architecture documentation expert. Generate a comprehensive architecture document with THREE sections.

SECTION 1: A Mermaid.js flowchart diagram.

CRITICAL MERMAID SYNTAX RULES (you MUST follow these):
- Use "graph TB" direction
- Node IDs MUST use underscores only, NO DOTS. Example: alb_main NOT aws_lb.main
- Node IDs MUST be simple alphanumeric with underscores: alb_main, ecs_service, rds_instance
- Use brackets for labels: alb_main["Application Load Balancer"]
- NEVER use dollar signs, curly braces, or template literals in node IDs or labels
- Use real values in labels like actual CIDR ranges (10.0.0.0/16), not variable references
- Subgraph IDs must also be simple: pub_subnets NOT Public Subnets
- Arrow labels use |text| syntax: A -->|"port 80"| B
- Style references must match the simple node IDs

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
      rds["RDS MySQL - myapp-prod-db"]
    end
  end
  user -->|"HTTP :80"| alb
  alb -->|"Forward :80"| ecs
  ecs -->|"MySQL :3306"| rds
  ecs -->|"Outbound"| nat

SECTION 2: A component table listing ALL resources with:
- Resource Name (Terraform identifier like aws_lb.main)
- Service Type (ALB, ECS, RDS, etc.)
- Naming Convention (the actual name pattern like project-env-alb)
- Subnet/Tier Placement (Public, Private-App, Private-DB)
- Purpose (one-line description)
- Security Group (which SG protects it)

SECTION 3: Data flow description as numbered steps.

FORMAT YOUR OUTPUT EXACTLY LIKE THIS (keep the section markers):

---MERMAID---
graph TB
  ...your diagram here using SIMPLE node IDs...
---END-MERMAID---

---COMPONENTS---
| Resource Name | Service | Naming Convention | Placement | Purpose | Security Group |
|---|---|---|---|---|---|
| aws_lb.main | ALB | project-env-alb | Public Subnets | Internet-facing load balancer | alb-sg |
...
---END-COMPONENTS---

---FLOW---
1. User request hits the ALB on port 80/443
2. ALB forwards traffic to ECS tasks on port 80
3. ECS tasks connect to RDS on port 3306
...
---END-FLOW---

Do NOT include markdown fences. Output ONLY the formatted sections above.`,
      },
      {
        role: "user",
        content: `Generate the architecture documentation for this infrastructure:

Cloud Provider: ${provider.toUpperCase()}
Description: ${description}
${codeContext}`,
      },
    ],
    temperature: 0.1,
    max_tokens: 4000,
  });

  return response.choices[0]?.message?.content || "";
}

/**
 * Strip markdown code fences that AI sometimes adds despite instructions.
 */
function stripCodeFences(code: string): string {
  let cleaned = code.trim();
  // Remove opening fence like ```hcl, ```yaml, ```terraform, etc.
  cleaned = cleaned.replace(/^```[\w]*\n?/, "");
  // Remove closing fence
  cleaned = cleaned.replace(/\n?```\s*$/, "");
  return cleaned.trim();
}

function generateReadme(
  description: string,
  outputType: string,
  provider: string
): string {
  const providerName =
    provider === "aws"
      ? "AWS"
      : provider === "azure"
      ? "Azure"
      : "Google Cloud";

  let usage = "";
  if (outputType === "terraform" || outputType === "both") {
    usage += `## Terraform Usage

\`\`\`bash
# Initialize Terraform
terraform init

# Preview changes
terraform plan

# Apply infrastructure
terraform apply

# Destroy when done
terraform destroy
\`\`\`

`;
  }

  if (outputType === "ansible" || outputType === "both") {
    usage += `## Ansible Usage

\`\`\`bash
# Run the playbook
ansible-playbook -i inventory/hosts.yml playbook.yml

# Run with specific tags
ansible-playbook -i inventory/hosts.yml playbook.yml --tags "setup"

# Dry run
ansible-playbook -i inventory/hosts.yml playbook.yml --check
\`\`\`

`;
  }

  return `# Generated Infrastructure Code

## Description

${description}

## Provider

${providerName}

## Generated By

InfraSketch AI - AI-Assisted DevOps Onboarding Tool

${usage}## Notes

- Review all generated code before applying to production
- Update variable values in terraform.tfvars or inventory as needed
- Ensure proper cloud credentials are configured
`;
}
