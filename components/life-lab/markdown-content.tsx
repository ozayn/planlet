"use client";

import { isValidElement, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

import { MermaidBlock } from "@/components/life-lab/mermaid-block";

type MarkdownContentProps = {
  content: string;
};

function getCodeText(children: ReactNode): string {
  if (Array.isArray(children)) {
    return children.join("").replace(/\n$/, "");
  }

  return String(children).replace(/\n$/, "");
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

const markdownComponents: Components = {
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
};

export function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <div className="ui-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
