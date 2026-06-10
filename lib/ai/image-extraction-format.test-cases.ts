import {
  detectMultipleDateSections,
  formatItemHintsAsText,
  statusMarkerForHint,
} from "@/lib/ai/image-extraction-format";

export function verifyImageExtractionFormatExamples(): void {
  const formatted = formatItemHintsAsText([
    {
      text: "۱ ساعت روی Claude Code",
      status: "DONE",
      type: "TASK",
      dateRawText: "جون ۸",
    },
    {
      text: "نیم ساعت بوت",
      status: "OPEN",
      type: "TASK",
      dateRawText: "جون ۸",
    },
    {
      text: "۲ ساعت روی Expo Print",
      status: "DONE",
      type: "TASK",
      dateRawText: "جون ۹",
    },
  ]);

  const expected = `جون ۸
✅ ۱ ساعت روی Claude Code
☐ نیم ساعت بوت

جون ۹
✅ ۲ ساعت روی Expo Print`;

  if (formatted !== expected) {
    throw new Error(
      `formatItemHintsAsText: expected ${JSON.stringify(expected)}, got ${JSON.stringify(formatted)}`,
    );
  }

  if (statusMarkerForHint("PARTIAL") !== "◐") {
    throw new Error("statusMarkerForHint PARTIAL should return ◐");
  }

  const multipleDates = detectMultipleDateSections({
    removedHeaderLines: ["جون ۸"],
    itemHints: [
      {
        text: "task",
        status: "OPEN",
        type: "TASK",
        dateRawText: "جون ۹",
      },
    ],
  });

  if (!multipleDates) {
    throw new Error("detectMultipleDateSections should detect multiple sections");
  }
}
