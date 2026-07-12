"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  // Use a surgical whitespace fix only if content exists
  const sanitizedContent = content || "";

  return (
    <div 
      className={`prose-sm max-w-none text-slate-800 leading-relaxed font-sans ${className}`}
      style={{
        textRendering: 'optimizeLegibility',
        WebkitFontSmoothing: 'antialiased',
        fontFeatureSettings: '"tnum", "lnum"', // Professional tabular numbers
        letterSpacing: '-0.01em',
        wordWrap: 'break-word',
        overflowWrap: 'anywhere'
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]} // [SENIOR FIX]: Correctly handles single line breaks without doubling them
        components={{
          // Professional financial-grade styling for narrative elements
          p: ({ node, ...props }) => <p className="mb-3 last:mb-0" {...props} />,
          strong: ({ node, ...props }) => <strong className="font-bold text-slate-900" {...props} />,
          ul: ({ node, ...props }) => <ul className="list-disc pl-6 mb-3 space-y-1.5 marker:text-blue-500" {...props} />,
          ol: ({ node, ...props }) => <ol className="list-decimal pl-6 mb-3 space-y-1.5 marker:text-blue-500" {...props} />,
          li: ({ node, ...props }) => <li className="pl-1" {...props} />,
          h4: ({ node, ...props }) => <h4 className="text-sm font-bold text-blue-900 border-b border-blue-100 pb-1 mb-2 mt-4 first:mt-0" {...props} />,
          code: ({ node, ...props }) => <code className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono text-xs" {...props} />,
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-4 border-blue-200 shadow-sm pl-4 py-2 bg-blue-50/20 rounded-r-lg italic my-3" {...props} />
          ),
        }}
      >
        {sanitizedContent}
      </ReactMarkdown>
    </div>
  );
}
