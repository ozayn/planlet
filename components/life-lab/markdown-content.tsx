"use client";

import { Children, isValidElement, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

import { MermaidBlock } from "@/components/life-lab/mermaid-block";
import {
  normalizeStructuredVocabularyFields,
  prepareLifeLabMarkdownForReading,
  segmentStructuredVocabularyMarkdown,
  STRUCTURED_VOCABULARY_FIELD_LABELS,
} from "@/lib/life-lab/markdown-display";
import { suppressExactLifeLabMarkdownDuplicates } from "@/lib/life-lab/note-quality";
import { readingBriefHeadingAnchor } from "@/lib/life-lab/reading-briefs";
import {
  resolveTextDirection,
  textDirectionLang,
} from "@/lib/text-direction";

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

function withTextDirection(
  children: ReactNode,
): { dir: ReturnType<typeof resolveTextDirection>; lang?: "fa" } {
  const direction = resolveTextDirection(getPlainText(children));

  return {
    dir: direction,
    lang: textDirectionLang(direction),
  };
}

function structuredVocabularyField(
  children: ReactNode,
): { label: string; value: ReactNode } | null {
  const nodes = Children.toArray(children);
  const first = nodes[0];

  if (!isValidElement(first) || first.type !== "strong") {
    return null;
  }

  const props = first.props as { children?: ReactNode };
  const label = getPlainText(props.children).trim().replace(/:$/, "");

  if (
    !STRUCTURED_VOCABULARY_FIELD_LABELS.some(
      (candidate) => candidate.toLowerCase() === label.toLowerCase(),
    )
  ) {
    return null;
  }

  const valueNodes = nodes.slice(1);

  while (
    valueNodes.length > 0 &&
    ((typeof valueNodes[0] === "string" && !valueNodes[0].trim()) ||
      (isValidElement(valueNodes[0]) && valueNodes[0].type === "br"))
  ) {
    valueNodes.shift();
  }

  return { label, value: valueNodes };
}

function VocabularyField({ children }: { children: ReactNode }) {
  const field = structuredVocabularyField(children);

  if (!field) {
    return null;
  }

  return (
    <dl className="ui-vocabulary-field">
      <dt>{field.label}</dt>
      <dd {...withTextDirection(field.value)}>{field.value}</dd>
    </dl>
  );
}

function createMarkdownComponents(
  readingBriefAnchors: boolean,
  structuredVocabulary: boolean,
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
    p({ children }) {
      if (structuredVocabulary && structuredVocabularyField(children)) {
        return <VocabularyField>{children}</VocabularyField>;
      }

      const direction = withTextDirection(children);

      return <p {...direction}>{children}</p>;
    },
    blockquote({ children }) {
      const direction = withTextDirection(children);

      return <blockquote {...direction}>{children}</blockquote>;
    },
    ul({ children }) {
      const direction = withTextDirection(children);

      return <ul {...direction}>{children}</ul>;
    },
    ol({ children }) {
      const direction = withTextDirection(children);

      return <ol {...direction}>{children}</ol>;
    },
    li({ children }) {
      if (structuredVocabulary && structuredVocabularyField(children)) {
        const direction = withTextDirection(children);

        return (
          <li {...direction}>
            <VocabularyField>{children}</VocabularyField>
          </li>
        );
      }

      const direction = withTextDirection(children);

      return <li {...direction}>{children}</li>;
    },
    h1({ children }) {
      const direction = withTextDirection(children);

      return <h1 {...direction}>{children}</h1>;
    },
    h2({ children }) {
      const headingText = getPlainText(children);
      const anchorId = readingBriefAnchors
        ? readingBriefHeadingAnchor(headingText)
        : undefined;
      const direction = withTextDirection(children);

      return (
        <h2
          id={anchorId}
          className={anchorId ? "scroll-mt-20" : undefined}
          {...direction}
        >
          {children}
        </h2>
      );
    },
    h3({ children }) {
      const direction = withTextDirection(children);

      return <h3 {...direction}>{children}</h3>;
    },
  };
}

export function MarkdownContent({
  content,
  compact = false,
  readingBriefAnchors = false,
  readingBriefMode = false,
}: MarkdownContentProps) {
  const preparedContent = suppressExactLifeLabMarkdownDuplicates(
    prepareLifeLabMarkdownForReading(content),
  );
  const segments = segmentStructuredVocabularyMarkdown(preparedContent);

  return (
    <div
      className={`ui-markdown ${compact ? "ui-markdown-compact" : ""} ${
        readingBriefMode ? "ui-markdown-reading-brief" : ""
      }`}
    >
      {segments.map((segment, index) => (
        <ReactMarkdown
          key={`${segment.structuredVocabulary ? "vocabulary" : "markdown"}-${index}`}
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeSanitize]}
          components={createMarkdownComponents(
            readingBriefAnchors,
            segment.structuredVocabulary,
          )}
        >
          {segment.structuredVocabulary
            ? normalizeStructuredVocabularyFields(segment.content)
            : segment.content}
        </ReactMarkdown>
      ))}
    </div>
  );
}
