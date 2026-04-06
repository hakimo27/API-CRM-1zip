interface RichContentProps {
  html: string;
  className?: string;
}

function isHtml(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text);
}

export function RichContent({ html, className = '' }: RichContentProps) {
  const base = 'prose prose-gray max-w-none prose-headings:font-semibold prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-img:rounded-xl prose-li:my-0.5';
  if (!html) return null;
  if (isHtml(html)) {
    return (
      <div
        className={`${base} ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }
  return (
    <div className={`${base} ${className}`}>
      {html.split('\n\n').map((block, i) => (
        <p key={i} className={block.startsWith('•') ? 'ml-4' : ''}>
          {block}
        </p>
      ))}
    </div>
  );
}
