import { useMemo } from 'react';

/* Textul reclamei cu două straturi:
   - frazele semnalate de agenți (fundal în culoarea agentului, dungi dacă se suprapun)
   - cuvintele-cheie găsite de Context Scanner (subliniere punctată, deschid panoul cu știri) */

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export default function AnnotatedText({ text, flags = [], keywords = [], news = {}, focus = null, onKeyword, onFocus }) {
  const segments = useMemo(() => {
    const ranges = [];
    const lower = text.toLowerCase();
    flags.forEach((f) => {
      if (!f.phrase) return;
      const at = lower.indexOf(f.phrase.toLowerCase());
      if (at >= 0) ranges.push({ start: at, end: at + f.phrase.length, flag: f });
    });
    const kws = [...new Set(keywords.filter(Boolean))];
    if (kws.length) {
      const re = new RegExp(`(?<![\\p{L}\\p{N}])(${kws.map(esc).join('|')})(?![\\p{L}\\p{N}])`, 'giu');
      let m;
      while ((m = re.exec(text))) {
        const key = kws.find((k) => k.toLowerCase() === m[0].toLowerCase()) || m[0];
        ranges.push({ start: m.index, end: m.index + m[0].length, keyword: key });
      }
    }
    const cuts = [...new Set([0, text.length, ...ranges.flatMap((r) => [r.start, r.end])])].sort((a, b) => a - b);
    const out = [];
    for (let i = 0; i < cuts.length - 1; i += 1) {
      const a = cuts[i];
      const b = cuts[i + 1];
      const inside = ranges.filter((r) => r.start <= a && r.end >= b);
      out.push({
        text: text.slice(a, b),
        flags: inside.filter((r) => r.flag).map((r) => r.flag),
        keyword: inside.find((r) => r.keyword)?.keyword || null,
      });
    }
    return out;
  }, [text, flags, keywords]);

  return (
    <>
      {segments.map((seg, i) => {
        if (!seg.flags.length && !seg.keyword) return <span key={i}>{seg.text}</span>;
        const colors = seg.flags.map((f) => f.color);
        const bg = colors.length > 1
          ? `repeating-linear-gradient(135deg, ${colors.map((c, j) => `color-mix(in srgb, ${c} 55%, white) ${j * 8}px ${(j + 1) * 8}px`).join(', ')})`
          : colors.length ? `color-mix(in srgb, ${colors[0]} 55%, white)` : undefined;
        const focused = focus && seg.flags.some((f) => f.persona === focus);
        const dimmed = focus && seg.flags.length && !focused;
        const arts = seg.keyword ? (news?.[seg.keyword] || []) : [];
        const Tag = seg.keyword ? 'button' : 'span';
        return (
          <Tag
            key={i}
            type={seg.keyword ? 'button' : undefined}
            className={`ann${seg.flags.length ? ' flagged' : ''}${seg.keyword ? ` kw ${arts.length ? 'kw-risk' : 'kw-note'}` : ''}${focused ? ' focused' : ''}${dimmed ? ' dimmed' : ''}`}
            style={{ background: bg }}
            onClick={seg.keyword ? () => onKeyword?.(seg.keyword) : undefined}
            onMouseEnter={seg.flags.length ? () => onFocus?.(seg.flags[0].persona) : undefined}
            onMouseLeave={seg.flags.length ? () => onFocus?.(null) : undefined}
          >
            {seg.text}
            <span className="ann-tip" aria-hidden="true">
              {seg.flags.map((f) => (
                <span key={f.persona} className="ann-tip-row">
                  <i style={{ background: f.color }} />
                  <span><strong>{f.nick} · {f.risk}</strong> {f.feedback}</span>
                </span>
              ))}
              {seg.keyword && (
                <span className="ann-tip-row">
                  <i className="kw-dot" />
                  <span><strong>{seg.keyword}</strong> {arts.length ? arts[0].titlu : 'Nicio controversă în presă'} · <em>apasă pentru știri</em></span>
                </span>
              )}
            </span>
          </Tag>
        );
      })}
    </>
  );
}
