# Usage Guide

## Overview

InfraSketch AI converts natural language descriptions of cloud infrastructure into production-ready Terraform and Ansible code. This guide covers all features and best practices.

## Basic Usage

### 1. Describe Your Infrastructure

In the input panel, describe what you want in plain English:

**Example inputs:**

```
Create an AWS VPC with two public subnets and two private subnets across 
two availability zones. Add a NAT gateway for the private subnets and an 
internet gateway for the public subnets.
```

```
Set up a Kubernetes cluster on GCP with 3 nodes, autoscaling from 1 to 5 
nodes, using e2-medium machine type in us-central1 region.
```

```
Create an Ansible playbook that installs Docker on Ubuntu 22.04 servers, 
configures a private registry, and deploys a nginx container.
```

### 2. Select Output Type

Choose the generation target:

- **Terraform** - Generates `.tf` files with HCL syntax
- **Ansible** - Generates `.yml` playbook files
- **Both** - Generates a complete project with Terraform for provisioning and Ansible for configuration

### 3. Select Cloud Provider

Pick your target cloud:

- **AWS** (Amazon Web Services)
- **Azure** (Microsoft Azure)
- **GCP** (Google Cloud Platform)

### 4. Generate Code

Click the **Generate** button. The AI will:
1. Parse your description
2. Identify required resources
3. Generate properly structured IaC code
4. Validate the output syntax

### 5. Review and Edit

The generated code appears in the Monaco Editor panel with:
- Syntax highlighting for HCL/YAML
- File tabs for multi-file output
- Inline editing capability

### 6. Download

Click **Download ZIP** to get a complete project archive containing:
- All generated `.tf` or `.yml` files
- A `README.md` with usage instructions
- Variable files with configurable defaults
- Output definitions (Terraform)

## Advanced Usage

### Iterative Refinement

After initial generation, you can refine by adding more context:

```
Add a Redis ElastiCache cluster to the previous VPC setup, 
placed in the private subnets with a security group allowing 
access only from the application subnets.
```

### Specifying Constraints

Be specific about configurations:

```
Create an AWS RDS PostgreSQL 15 instance:
- Instance type: db.t3.medium
- Storage: 100GB GP3
- Multi-AZ: enabled
- Backup retention: 7 days
- Encryption at rest: enabled
- No public access
- In a private subnet group
```

### Multi-Service Architectures

Describe complete architectures:

```
Create a 3-tier web application on AWS:
- Frontend: S3 static site with CloudFront CDN
- Backend: ECS Fargate service with ALB, autoscaling 2-10 tasks
- Database: Aurora PostgreSQL Serverless v2
- All in a VPC with proper security groups between tiers
- Include WAF on the CloudFront distribution
```

## Tips for Best Results

1. **Be specific** - Include instance types, regions, sizes when you know them
2. **Mention security** - State encryption, access controls, and network isolation needs
3. **Name your resources** - Give names/prefixes for clearer code
4. **State relationships** - Describe how components connect to each other
5. **Include tags** - Mention tagging strategy if your org requires it

## Generation History

All generations are saved automatically. Access history from the sidebar to:
- View past generations
- Re-use a previous description
- Compare different approaches
- Download any past generation

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Enter` | Generate code |
| `Ctrl+S` | Save current edit |
| `Ctrl+D` | Download ZIP |
| `Ctrl+H` | Toggle history panel |

## Output Structure

### Terraform Output

```
generated/
├── main.tf          # Primary resource definitions
├── variables.tf     # Input variables with defaults
├── outputs.tf       # Output values
├── providers.tf     # Provider configuration
├── terraform.tfvars # Variable values (gitignored template)
└── README.md        # Usage instructions
```

### Ansible Output

```
generated/
├── playbook.yml     # Main playbook
├── inventory/
│   └── hosts.yml    # Inventory template
├── roles/
│   └── <role>/
│       ├── tasks/
│       │   └── main.yml
│       ├── handlers/
│       │   └── main.yml
│       ├── templates/
│       └── defaults/
│           └── main.yml
└── README.md        # Usage instructions
```
