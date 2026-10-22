export interface DiagnosticContext {
  framework?: string;
  phpVersion?: string;
  errorClass: string;
  errorMessage: string;
  stackFrames: Array<{ file: string; line: number; call: string }>;
  sqlQuery?: string;
}

export function buildDiagnosticPrompt(context: DiagnosticContext): string {
  let prompt = `You are an expert PHP and Laravel debugging assistant.
Analyze the following runtime error and provide:
1. Root cause analysis
2. High-confidence fix explanation
3. Proposed code patch (unified diff format)

=== ENVIRONMENT ===
Framework: ${context.framework || 'Plain PHP'}
PHP Version: ${context.phpVersion || '8.3'}

=== EXCEPTION ===
Class: ${context.errorClass}
Message: ${context.errorMessage}

=== STACK TRACE ===
`;

  for (const frame of context.stackFrames.slice(0, 10)) {
    prompt += `  at ${frame.file}:${frame.line} -> ${frame.call}\n`;
  }

  if (context.sqlQuery) {
    prompt += `\n=== RELATED SQL QUERY ===\n${context.sqlQuery}\n`;
  }

  prompt += `\nProvide an evidence-backed patch. Do not guess or assume untested dependencies.\n`;
  return prompt;
}
