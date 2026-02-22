import * as fs from 'fs';
import * as path from 'path';

const promptCache: Map<string, string> = new Map();

/**
 * Load a prompt template by path or name
 * Examples: 'shared/default', 'login/user_flow', etc.
 */
export function loadPrompt(templateName: string): string {
  if (promptCache.has(templateName)) {
    return promptCache.get(templateName)!;
  }

  // Try .txt first, then .yaml
  const promptDir = path.join(process.cwd(), 'rag', 'prompts');
  let templatePath = path.join(promptDir, `${templateName}.txt`);

  if (!fs.existsSync(templatePath)) {
    templatePath = path.join(promptDir, `${templateName}.yaml`);
  }

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Prompt template not found: ${templateName}`);
  }

  const content = fs.readFileSync(templatePath, 'utf8');
  promptCache.set(templateName, content);
  return content;
}

/**
 * Interpolate placeholders in a template
 * Replaces {{key}} with values[key]
 */
export function interpolatePrompt(
  template: string,
  values: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(values)) {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(placeholder, value || '');
  }
  return result;
}

/**
 * Load and interpolate a prompt in one call
 */
export function loadAndInterpolate(
  templateName: string,
  values: Record<string, string>
): string {
  const template = loadPrompt(templateName);
  return interpolatePrompt(template, values);
}

/**
 * Clear the prompt cache (useful for testing)
 */
export function clearCache(): void {
  promptCache.clear();
}
