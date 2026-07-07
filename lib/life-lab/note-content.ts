/** Remove the leading Markdown H1 when the page header already shows the title. */
export function stripLeadingMarkdownH1(content: string): string {
  const match = content.match(/^#\s+.+\n+/);

  if (!match) {
    return content;
  }

  return content.slice(match[0].length).trimStart();
}
