/**
 * Pre-built Skill Templates
 * 
 * Four packs of ready-to-use skills for new users.
 * Each template includes: name, description, prompt, context hints, and destructive flag.
 */

export interface SkillTemplate {
  name: string
  description: string
  prompt: string
  contextApp?: string
  contextFolder?: string
  isDestructive: boolean
  packName: 'Developer' | 'Writer' | 'Finance' | 'Support'
  icon?: string
}

export const SKILL_TEMPLATES: SkillTemplate[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // DEVELOPER PACK
  // ═══════════════════════════════════════════════════════════════════════════

  {
    packName: 'Developer',
    name: 'Code Review',
    description: 'Analyze code for bugs, performance, and best practices',
    prompt: `Review the following code for:
1. Bugs or logic errors
2. Performance issues
3. Security vulnerabilities
4. Style and readability
5. Best practices

Code:
\`\`\`
{{selected_text}}
\`\`\`

Provide concise, actionable feedback.`,
    isDestructive: false,
  },

  {
    packName: 'Developer',
    name: 'Explain Error',
    description: 'Understand what went wrong and how to fix it',
    prompt: `I got this error:

{{selected_text}}

Please explain:
1. What caused it
2. Why it happens
3. How to fix it
4. How to prevent it next time

Keep it concise.`,
    isDestructive: false,
  },

  {
    packName: 'Developer',
    name: 'Refactor',
    description: 'Improve code structure, readability, and efficiency',
    prompt: `Refactor this code to be more readable, efficient, and maintainable:

\`\`\`
{{selected_text}}
\`\`\`

Keep the same logic and behavior. Explain the improvements.`,
    isDestructive: false,
  },

  {
    packName: 'Developer',
    name: 'Generate Tests',
    description: 'Create unit tests for the selected code',
    prompt: `Write unit tests for this code:

\`\`\`
{{selected_text}}
\`\`\`

Use a standard testing framework. Cover normal cases, edge cases, and error handling.`,
    isDestructive: false,
  },

  {
    packName: 'Developer',
    name: 'Document Function',
    description: 'Write JSDoc or docstring for a function',
    prompt: `Write clear documentation for this function:

\`\`\`
{{selected_text}}
\`\`\`

Include: summary, parameters, return value, and usage example.`,
    isDestructive: false,
  },

  {
    packName: 'Developer',
    name: 'SQL Optimize',
    description: 'Improve SQL query performance',
    prompt: `Optimize this SQL query for speed and efficiency:

\`\`\`
{{selected_text}}
\`\`\`

Explain what changed and why.`,
    isDestructive: false,
    contextApp: 'Microsoft SQL Server Management Studio',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // WRITER PACK
  // ═══════════════════════════════════════════════════════════════════════════

  {
    packName: 'Writer',
    name: 'Summarize',
    description: 'Condense text into key bullet points',
    prompt: `Summarize this text into 3-5 concise bullet points:

{{selected_text}}

Focus on the main ideas.`,
    isDestructive: false,
  },

  {
    packName: 'Writer',
    name: 'Rewrite Formally',
    description: 'Make text professional and polished',
    prompt: `Rewrite this text in a formal, professional tone:

{{selected_text}}

Keep the same meaning but make it suitable for business communication.`,
    isDestructive: false,
  },

  {
    packName: 'Writer',
    name: 'Fix Grammar',
    description: 'Correct grammar, punctuation, and spelling',
    prompt: `Fix all grammar, spelling, and punctuation errors in this text:

{{selected_text}}

Return only the corrected text, no explanation.`,
    isDestructive: false,
  },

  {
    packName: 'Writer',
    name: 'Expand',
    description: 'Make text longer and more detailed',
    prompt: `Expand this text with more detail, examples, and explanation:

{{selected_text}}

Double the length while maintaining clarity.`,
    isDestructive: false,
  },

  {
    packName: 'Writer',
    name: 'Create Outline',
    description: 'Generate an outline from text or topic',
    prompt: `Create a detailed outline for this topic or text:

{{selected_text}}

Use nested bullet points and include key subtopics.`,
    isDestructive: false,
  },

  {
    packName: 'Writer',
    name: 'Draft Email',
    description: 'Write a professional email based on notes',
    prompt: `Draft a professional email from these notes:

{{selected_text}}

Include: greeting, clear purpose, key points, call to action, and closing.`,
    isDestructive: false,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FINANCE PACK
  // ═══════════════════════════════════════════════════════════════════════════

  {
    packName: 'Finance',
    name: 'Extract Invoice Data',
    description: 'Pull key information from an invoice',
    prompt: `Extract this information from the invoice:

{{selected_text}}

Return as:
- Vendor name
- Invoice number
- Date
- Total amount
- Due date
- Description of items/services`,
    isDestructive: false,
  },

  {
    packName: 'Finance',
    name: 'Categorize Expense',
    description: 'Classify an expense for accounting',
    prompt: `Categorize this expense and suggest the general ledger account:

{{selected_text}}

Provide: category, account code (if standard), and brief justification.`,
    isDestructive: false,
  },

  {
    packName: 'Finance',
    name: 'Calculate Totals',
    description: 'Sum amounts and verify calculations',
    prompt: `Calculate the total from this list and verify any included subtotals:

{{selected_text}}

Show: line items, subtotal, any taxes/fees, and final total.`,
    isDestructive: false,
  },

  {
    packName: 'Finance',
    name: 'Format for Spreadsheet',
    description: 'Convert unstructured data into table format',
    prompt: `Convert this data into a tab-separated table format for Excel:

{{selected_text}}

Include headers and ensure consistent formatting.`,
    isDestructive: false,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SUPPORT PACK
  // ═══════════════════════════════════════════════════════════════════════════

  {
    packName: 'Support',
    name: 'Draft Response',
    description: 'Write a helpful customer support reply',
    prompt: `Draft a support response to this customer issue:

{{selected_text}}

Be friendly, professional, and provide clear next steps.`,
    isDestructive: false,
  },

  {
    packName: 'Support',
    name: 'Summarize Ticket',
    description: 'Extract key details from a support request',
    prompt: `Summarize this support ticket:

{{selected_text}}

Include: customer, issue, impact, and any error messages.`,
    isDestructive: false,
  },

  {
    packName: 'Support',
    name: 'Suggest Solutions',
    description: 'Generate troubleshooting steps for a problem',
    prompt: `Suggest troubleshooting steps for this issue:

{{selected_text}}

Provide 3-5 steps from simplest to most complex.`,
    isDestructive: false,
  },

  {
    packName: 'Support',
    name: 'Create FAQ',
    description: 'Turn common issues into FAQ entries',
    prompt: `Create FAQ entries from these common support questions:

{{selected_text}}

Format as:
Q: [question]
A: [concise answer]`,
    isDestructive: false,
  },
]

export const TEMPLATE_PACKS = [
  {
    name: 'Developer',
    icon: '💻',
    description: 'Code review, debugging, optimization, and documentation',
    count: 6,
  },
  {
    name: 'Writer',
    icon: '✍️',
    description: 'Summarize, rewrite, edit, and expand text',
    count: 6,
  },
  {
    name: 'Finance',
    icon: '💰',
    description: 'Invoice processing, expense categorization, calculations',
    count: 4,
  },
  {
    name: 'Support',
    icon: '🤝',
    description: 'Draft responses, summarize tickets, suggest solutions',
    count: 4,
  },
]
