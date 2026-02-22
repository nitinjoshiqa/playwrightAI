/**
 * Simple Prompt Renderer
 * Implements IPromptRenderer with {{ }} interpolation
 */

import { IPromptRenderer } from '../../core/interfaces';

export class SimpleRenderer implements IPromptRenderer {
  name = 'Simple';

  render(template: string, values: Record<string, string>): string {
    let result = template;

    for (const [key, value] of Object.entries(values)) {
      const placeholder = `{{${key}}}`;
      const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      result = result.replace(regex, value || '(empty)');
    }

    return result;
  }

  validate(template: string): { valid: boolean; error?: string } {
    // Check for unmatched braces
    const openCount = (template.match(/{{/g) || []).length;
    const closeCount = (template.match(/}}/g) || []).length;

    if (openCount !== closeCount) {
      return {
        valid: false,
        error: `Unmatched braces: ${openCount} {{ vs ${closeCount} }}`,
      };
    }

    return { valid: true };
  }
}

