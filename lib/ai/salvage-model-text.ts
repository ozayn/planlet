export function salvageTextFromModelResponse(content: string): string | null {
  let trimmed = content.trim().replace(/^\uFEFF/, "");

  const fencedMatch = trimmed.match(/```(?:json|text)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch) {
    trimmed = fencedMatch[1].trim();
  }

  if (trimmed.startsWith("{")) {
    try {
      const json = JSON.parse(trimmed) as { text?: unknown };
      if (typeof json.text === "string" && json.text.trim()) {
        return json.text.trim();
      }
    } catch {
      const textMatch = trimmed.match(/"text"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      if (textMatch) {
        try {
          return JSON.parse(`"${textMatch[1]}"`).trim();
        } catch {
          return textMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').trim();
        }
      }
    }

    return null;
  }

  return trimmed.length > 0 ? trimmed : null;
}
