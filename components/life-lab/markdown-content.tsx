"use client";

import { isValidElement, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

import { MermaidBlock } from "@/components/life-lab/mermaid-block";
import { prepareLifeLabMarkdownForReading } from "@/lib/life-lab/markdown-display";
import { readingBriefHeadingAnchor } from "@/lib/life-lab/reading-briefs";

type MarkdownContentProps = {
  content: string;
  compact?: boolean;
  readingBriefAnchors?: boolean;
  readingBriefMode?: boolean;
};

function getCodeText(children: ReactNode): string {
  if (Array.isArray(children)) {
    return children.join("").replace(/\n$/, "");
  }

  return String(children).replace(/\n$/, "");
}

function getPlainText(children: ReactNode): string {
  if (typeof children === "string" || typeof children === "number") {
    return String(children);
  }

  if (Array.isArray(children)) {
    return children.map(getPlainText).join("");
  }

  if (isValidElement(children)) {
    const props = children.props as { children?: ReactNode };
    return getPlainText(props.children);
  }

  return "";
}

function getMermaidCode(child: ReactNode): string | null {
  if (!isValidElement(child)) {
    return null;
  }

  const props = child.props as { className?: string; children?: ReactNode };

  if (
    typeof props.className !== "string" ||
    !props.className.includes("language-mermaid")
  ) {
    return null;
  }

  return getCodeText(props.children);
}

function createMarkdownComponents(
  readingBriefAnchors: boolean,
): Components {
  return {
    pre({ children }) {
      const mermaidCode = getMermaidCode(children);

      if (mermaidCode) {
        return <MermaidBlock code={mermaidCode} />;
      }

      return <pre>{children}</pre>;
    },
    code({ className, children, ...props }) {
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
    h2({ children }) {
      const headingText = getPlainText(children);
      const anchorId = readingBriefAnchors
        ? readingBriefHeadingAnchor(headingText)
        : undefined;

      return (
        <h2
          id={anchorId}
          className={anchorId ? "scroll-mt-20" : undefined}
        >
          {children}
        </h2>
      );
    },
  };
}

export function MarkdownContent({
  content,
  compact = false,
  readingBriefAnchors = false,
  readingBriefMode = false,
}: MarkdownContentProps) {
  const preparedContent = prepareLifeLabMarkdownForReading(content);

  return (
    <div
      className={`ui-markdown ${compact ? "ui-markdown-compact" : ""} ${
        readingBriefMode ? "ui-markdown-reading-brief" : ""
      }`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={createMarkdownComponents(readingBriefAnchors)}
      >
        {preparedContent}
      </ReactMarkdown>
    </div>
  );
}
