import {
  paragraphMatchesTechnicalPhrase,
  stripPlanletHiddenBlocks,
  stripTechnicalMetadataFromMarkdown,
} from "@/lib/life-lab/hidden-markdown-sections";

const HTML_COMMENT_PATTERN = /<!--[\s\S]*?-->/g;
const HTML_TAG_PATTERN = /<[^>]+>/g;

const BASIC_HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

function decodeBasicHtmlEntities(text: string): string {
  return text.replace(
    /&(?:amp|lt|gt|quot|apos|nbsp|#39);/gi,
    (entity) => BASIC_HTML_ENTITIES[entity.toLowerCase()] ?? entity,
  );
}

function stripIncompleteHtmlTail(text: string): string {
  const incompleteComment = text.search(/<!--[\s\S]*$/);

  if (incompleteComment !== -1) {
    return text.slice(0, incompleteComment).trimEnd();
  }

  const incompleteTag = text.search(/<[^>]*$/);

  if (incompleteTag !== -1) {
    return text.slice(0, incompleteTag).trimEnd();
  }

  return text;
}

function markdownToPlainText(content: string): string {
  return content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/[#>*_~|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isTechnicalExcerptParagraph(paragraph: string): boolean {
  if (paragraphMatchesTechnicalPhrase(paragraph, { allowPhraseOnly: true })) {
    return true;
  }

  return (
    /\bstatus:\s*/i.test(paragraph) ||
    /\b\d+\s+processed\b/i.test(paragraph) ||
    /\b\d+\s+pending\b/i.test(paragraph)
  );
}

export function cleanLifeLabExcerpt(content: string, maxLength = 220): string {
  let cleaned = content.trim();

  if (!cleaned) {
    return "";
  }

  cleaned = stripPlanletHiddenBlocks(cleaned).visible;
  cleaned = cleaned.replace(HTML_COMMENT_PATTERN, " ");
  cleaned = stripIncompleteHtmlTail(cleaned);
  cleaned = cleaned.replace(HTML_TAG_PATTERN, " ");
  cleaned = decodeBasicHtmlEntities(cleaned);
  cleaned = stripTechnicalMetadataFromMarkdown(cleaned);

  const paragraphs = cleaned
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((paragraph) => !isTechnicalExcerptParagraph(paragraph));

  cleaned = paragraphs.join("\n\n").trim();
  const plain = markdownToPlainText(cleaned);

  if (!plain) {
    return "";
  }

  if (plain.length <= maxLength) {
    return plain;
  }

  const truncated = plain.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");

  if (lastSpace > maxLength * 0.6) {
    return `${truncated.slice(0, lastSpace).trimEnd()}…`;
  }

  return `${truncated.trimEnd()}…`;
}
