import { parseModelJsonResponse } from "@/lib/ai/parse-model-json";

type ParseModelJsonExample = {
  name: string;
  input: string;
  expected: Record<string, unknown>;
};

export const PARSE_MODEL_JSON_EXAMPLES: ParseModelJsonExample[] = [
  {
    name: "raw JSON object",
    input: '{"text":"hello","language":"EN"}',
    expected: { text: "hello", language: "EN" },
  },
  {
    name: "fenced JSON block",
    input: '```json\n{"text":"hello","language":"FA"}\n```',
    expected: { text: "hello", language: "FA" },
  },
  {
    name: "prose before fenced JSON",
    input:
      'Here is the extracted content:\n\n```json\n{"text":"line one","dateHint":{"detected":false}}\n```',
    expected: { text: "line one", dateHint: { detected: false } },
  },
];

export function verifyParseModelJsonExamples(): void {
  for (const example of PARSE_MODEL_JSON_EXAMPLES) {
    const parsed = parseModelJsonResponse(example.input) as Record<
      string,
      unknown
    >;

    if (JSON.stringify(parsed) !== JSON.stringify(example.expected)) {
      throw new Error(
        `${example.name}: expected ${JSON.stringify(example.expected)}, got ${JSON.stringify(parsed)}`,
      );
    }
  }
}
