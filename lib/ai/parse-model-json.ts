export function parseModelJsonResponse(
  content: string,
  errorMessage = "Returned invalid JSON.",
): unknown {
  let trimmed = content.trim().replace(/^\uFEFF/, "");

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch) {
    trimmed = fencedMatch[1].trim();
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");

    if (start !== -1 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        // Fall through to the shared error below.
      }
    }

    throw new Error(errorMessage);
  }
}
