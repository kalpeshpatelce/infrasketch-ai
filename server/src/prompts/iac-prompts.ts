export function getTerraformPrompt(
  description: string,
  provider: string
): string {
  const providerBlock = getProviderBlock(provider);
  const architectureRules = getArchitectureRules(provider);

  return `Generate production-ready Terraform code for the following infrastructure requirement.

Cloud Provider: ${provider.toUpperCase()}
Description: ${description}

${architectureRules}

## Code Structure Requirements:
1. Include the provider block for ${provider.toUpperCase()}
2. Use variables for ALL configurable values (region, instance types, names, CIDR blocks, ports, etc.)
3. Include proper resource naming with a "project" and "environment" variable
4. Add output blocks for important resource attributes (IDs, IPs, ARNs, endpoints, DNS names)
5. Include comments explaining each resource and WHY it's configured that way
6. Use locals block for computed values and repeated expressions
7. Use data sources where appropriate (e.g., aws_availability_zones, aws_ami)

## Provider block reference:
${providerBlock}

## CRITICAL: Generate a SINGLE complete Terraform configuration file. Do NOT split into multiple files. Include ALL resources, variables, locals, and outputs in one file.`;
}

export function getAnsiblePrompt(
  description: string,
  provider: string
): string {
  return `Generate a production-ready Ansible playbook for the following requirement:

Cloud Provider: ${provider.toUpperCase()}
Description: ${description}

## Requirements:
1. Use proper YAML formatting with consistent 2-space indentation
2. Include a descriptive play name
3. Define variables with sensible defaults in vars section
4. Use appropriate Ansible modules (NEVER use shell/command when a dedicated module exists)
5. Include handlers for service management (restart, reload)
6. Add tags to ALL tasks for selective execution
7. Include error handling with block/rescue where appropriate
8. Add comments explaining complex tasks
9. Use become: yes only where privilege escalation is actually needed
10. Include pre_tasks for validation (check connectivity, disk space, etc.)
11. Use notify + handlers pattern (don't restart services inline)
12. Template config files rather than using lineinfile for complex configs

## Security Requirements:
- Never hardcode passwords or secrets (use ansible-vault references or variables)
- Set restrictive file permissions (0600 for secrets, 0644 for configs)
- Disable root SSH login where applicable
- Use dedicated service accounts, not root

Generate a complete Ansible playbook as valid YAML.`;
}

function getArchitectureRules(provider: string): string {
  if (provider === "aws") {
    return `## MANDATORY AWS Architecture Rules (MUST follow all of these):

### Networking & Subnet Architecture:
- Create a VPC with AT LEAST 3 subnet tiers: public, private/application, and private/database
- PUBLIC subnets: ONLY for internet-facing resources (ALB, NAT Gateway, Bastion hosts)
- PRIVATE APP subnets: For application workloads (ECS tasks, EC2 app servers, Lambda)
- PRIVATE DB subnets: ONLY for data stores (RDS, ElastiCache, DocumentDB)
- NEVER place ALB in database subnets
- NEVER place application workloads (ECS, EC2 apps) in database subnets
- Use at least 2 AZs for high availability
- Include NAT Gateway in public subnets so private subnet resources can reach the internet (for pulling container images, updates, etc.)

### Security Groups - STRICT Layer Separation:
- ALB Security Group: Allow inbound 80/443 from 0.0.0.0/0 ONLY. No other inbound rules.
- Application Security Group: Allow inbound ONLY from the ALB security group on the app port (e.g., 8080, 80). NEVER allow 0.0.0.0/0 directly to app tier.
- Database Security Group: Allow inbound ONLY from the Application security group on the DB port (3306, 5432, etc.). NEVER allow internet or ALB access to DB.
- Each security group should reference another security group as source (not CIDR 0.0.0.0/0) for internal traffic.

### ECS/Fargate Specific Rules:
- Place ECS tasks in PRIVATE APP subnets (NOT public, NOT database subnets)
- ECS tasks MUST have a route to the internet (via NAT Gateway) to pull container images from ECR/DockerHub
- Use assign_public_ip = false for Fargate tasks in private subnets (NAT handles outbound)
- If using public subnets for ECS (not recommended), set assign_public_ip = true
- NEVER create duplicate ECS services for the same task - one service per task definition
- Use awsvpc network mode for Fargate

### Load Balancer Rules:
- ALB MUST be in PUBLIC subnets (internet-facing) or PRIVATE APP subnets (internal)
- ALB MUST NEVER be in database subnets
- ALB target group health check must match the application's health endpoint
- Use target_type = "ip" for Fargate tasks

### RDS/Database Rules:
- RDS MUST be in a DB subnet group using PRIVATE DB subnets only
- Set publicly_accessible = false ALWAYS
- Enable multi_az for production
- Enable storage_encrypted = true
- Set skip_final_snapshot = false for production (true only for dev/test)
- Use a separate DB subnet group resource

### General AWS Rules:
- Enable VPC flow logs for debugging
- Tag ALL resources with Project, Environment, and ManagedBy tags
- Use aws_availability_zones data source instead of hardcoding AZs
- Enable deletion protection on production databases and load balancers`;
  }

  if (provider === "azure") {
    return `## MANDATORY Azure Architecture Rules:

### Networking:
- Create a VNet with separate subnets: public/gateway, application, database
- Use Network Security Groups (NSGs) on each subnet
- Application Gateway or Azure LB in the gateway subnet
- App services/containers in the application subnet
- Databases in the database subnet with service endpoints or private endpoints
- NEVER expose database subnets to the internet

### Security:
- Use Azure Private Endpoints for PaaS database access
- NSGs must follow least privilege (only allow required traffic between tiers)
- Application tier only accepts traffic from the load balancer
- Database tier only accepts traffic from the application tier
- Enable DDoS protection on the VNet
- Use Managed Identities instead of connection strings where possible`;
  }

  if (provider === "gcp") {
    return `## MANDATORY GCP Architecture Rules:

### Networking:
- Create a custom VPC (not default)
- Use separate subnets for each tier: public, application, database
- Use Cloud NAT for private subnet internet access
- Use Internal Load Balancer for service-to-service communication
- External Load Balancer only for internet-facing services

### Security:
- Firewall rules with target tags (not broad CIDR ranges)
- Application tier only accepts traffic from load balancer
- Database tier only accepts traffic from application tier tagged instances
- Use Private Google Access for GCP service connectivity
- Use Cloud SQL Private IP (no public IP on databases)
- Enable VPC Flow Logs`;
  }

  return "";
}

function getProviderBlock(provider: string): string {
  switch (provider) {
    case "aws":
      return `provider "aws" {
  region = var.aws_region
}`;
    case "azure":
      return `provider "azurerm" {
  features {}
}`;
    case "gcp":
      return `provider "google" {
  project = var.project_id
  region  = var.region
}`;
    default:
      return "";
  }
}
