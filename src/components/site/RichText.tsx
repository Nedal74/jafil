/**
 * Safe rendering of admin-authored plain text (no HTML is ever injected):
 * blank-line separated blocks; "## " / "### " headings; blocks of "- " lines become lists.
 */
export function RichText({ text, className }: { text: string; className?: string }) {
  const blocks = text.replace(/\r\n/g, "\n").split(/\n{2,}/).filter((b) => b.trim());
  return (
    <div className={`prose-body ${className ?? ""}`}>
      {blocks.map((block, i) => {
        if (block.startsWith("### ")) return <h3 key={i}>{block.slice(4)}</h3>;
        if (block.startsWith("## ")) return <h2 key={i}>{block.slice(3)}</h2>;
        const lines = block.split("\n");
        if (lines.every((l) => l.startsWith("- "))) return <ul key={i}>{lines.map((l, j) => <li key={j}>{l.slice(2)}</li>)}</ul>;
        return <p key={i} className="whitespace-pre-line">{block}</p>;
      })}
    </div>
  );
}
