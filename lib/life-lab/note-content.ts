/**
 * Remove the leading Markdown H1 when the page header already shows the title.
 * Tolerates BOM/leading whitespace, optional closing hashes, and EOF without a
 * trailing newline.
 */
export function stripLeadingMarkdownH1(content: string): string {
  const normalized = content.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  const match = normalized.match(/^\s*#\s+.+\s*#*\s*(?:\n+|$)/);

  if (!match) {
    return content;
  }

  const remainder = normalized.slice(match[0].length).trimStart();
  return remainder;
}
