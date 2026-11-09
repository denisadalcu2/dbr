// Afișează raportul Judecătorului (text cu markdown simplu) fără innerHTML
const TOKENS = /(\*\*[^*]+\*\*|CAMPANIE RESPINSĂ|CAMPANIE APROBATĂ LEGAL|FĂRĂ ASOCIERI CRITICE)/g;

function inline(str) {
  return str.split(TOKENS).map((part, i) => {
    if (!part) return null;
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part === 'CAMPANIE RESPINSĂ') return <mark key={i} className="tag bad">{part}</mark>;
    if (part === 'CAMPANIE APROBATĂ LEGAL' || part === 'FĂRĂ ASOCIERI CRITICE') {
      return <mark key={i} className="tag good">{part}</mark>;
    }
    return part.replace(/\*/g, '');
  });
}

export default function ReportText({ text }) {
  const blocks = [];
  let list = null;

  (text || '').split('\n').forEach((raw) => {
    const line = raw.trim();
    const bullet = line.match(/^[-*•]\s+(.*)$/);
    if (bullet) {
      if (!list) {
        list = [];
        blocks.push({ type: 'ul', items: list });
      }
      list.push(bullet[1]);
      return;
    }
    list = null;
    if (!line || /^-{3,}$/.test(line)) return;
    const heading = line.match(/^#{1,6}\s+(.*)$/);
    if (heading) blocks.push({ type: 'h', text: heading[1] });
    else if (/^(\*\*)?\d+\.\s/.test(line)) blocks.push({ type: 'h', text: line });
    else blocks.push({ type: 'p', text: line });
  });

  return (
    <div className="report">
      {blocks.map((b, i) => {
        if (b.type === 'ul') {
          return (
            <ul key={i}>
              {b.items.map((it, j) => <li key={j}>{inline(it)}</li>)}
            </ul>
          );
        }
        if (b.type === 'h') return <h4 key={i}>{inline(b.text)}</h4>;
        return <p key={i}>{inline(b.text)}</p>;
      })}
    </div>
  );
}
