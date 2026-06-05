export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Basic Terraform HCL validation.
 * Checks for common structural issues without requiring the terraform binary.
 */
export function validateTerraform(code: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!code || code.trim().length === 0) {
    return { valid: false, errors: ["Empty Terraform code"], warnings: [] };
  }

  // Check for balanced braces
  const openBraces = (code.match(/{/g) || []).length;
  const closeBraces = (code.match(/}/g) || []).length;
  if (openBraces !== closeBraces) {
    errors.push(
      `Unbalanced braces: ${openBraces} opening, ${closeBraces} closing`
    );
  }

  // Check for balanced quotes
  const quotes = (code.match(/"/g) || []).length;
  if (quotes % 2 !== 0) {
    errors.push("Unbalanced double quotes");
  }

  // Check for provider block
  if (!code.includes("provider ")) {
    warnings.push("No provider block found - you may need to add one");
  }

  // Check for resource or data blocks
  if (!code.includes("resource ") && !code.includes("data ")) {
    warnings.push("No resource or data blocks found");
  }

  // Check for variable declarations if variables are used
  const varUsages = code.match(/var\.\w+/g) || [];
  const varDeclarations = code.match(/variable\s+"(\w+)"/g) || [];
  const declaredVars = varDeclarations.map((d) =>
    d.replace(/variable\s+"/, "").replace(/"/, "")
  );

  for (const usage of varUsages) {
    const varName = usage.replace("var.", "");
    if (!declaredVars.includes(varName)) {
      warnings.push(`Variable "${varName}" is used but not declared`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Basic Ansible YAML validation.
 * Checks for common playbook structural issues.
 */
export function validateAnsible(code: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!code || code.trim().length === 0) {
    return { valid: false, errors: ["Empty Ansible code"], warnings: [] };
  }

  // Check if it starts with --- (YAML document marker)
  if (!code.trimStart().startsWith("---")) {
    warnings.push("Missing YAML document marker (---) at the start");
  }

  // Check for play-level keys
  if (!code.includes("hosts:")) {
    errors.push("No 'hosts' key found - every play needs a hosts definition");
  }

  if (!code.includes("tasks:") && !code.includes("roles:")) {
    errors.push("No 'tasks' or 'roles' section found");
  }

  // Check for common indentation issues (tabs)
  if (code.includes("\t")) {
    errors.push("Tab characters found - Ansible YAML requires spaces for indentation");
  }

  // Check for name in tasks
  const taskLines = code.split("\n").filter((l) => l.trim().startsWith("- name:"));
  const taskModules = code
    .split("\n")
    .filter(
      (l) =>
        l.trim().startsWith("- ") &&
        !l.trim().startsWith("- name:") &&
        !l.trim().startsWith("- hosts:") &&
        !l.trim().startsWith("- become:")
    );

  if (taskModules.length > taskLines.length) {
    warnings.push("Some tasks may be missing descriptive names");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
