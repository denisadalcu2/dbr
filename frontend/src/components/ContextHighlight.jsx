import { useEffect, useMemo, useRef } from 'react';

/* Primește din /api/analyze:
   context_keywords: ["Elon Musk", ...]
   context_news: { "Elon Musk": [{ titlu, url }] }
   Cuvânt cu articole => „de risc” (roz). Fără articole => „de urmărit” (lime). */

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const articlesOf = (news, key) => (news && news[key]) || [];
const isSafeUrl = (u) => /^https?:\/\//i.test(u || '');
const domainOf = (u) => {
  try {
    return new URL(u).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

export function HighlightedText({ text, keywords = [], news = {}, activeKey = null, onSelect }) {
  const { parts, lookup } = useMemo(() => {
    const list = [...new Set(keywords.filter(Boolean))].sort((a, b) => b.length - a.length);
    if (!list.length) return { parts: [text], lookup: new Map() };
    const re = new RegExp(`(?<![\\p{L}\\p{N}])(${list.map(esc).join('|')})(?![\\p{L}\\p{N}])`, 'giu');
    return { parts: text.split(re), lookup: new Map(list.map((k) => [k.toLowerCase(), k])) };
  }, [text, keywords]);

  return (
    <>
      {parts.map((p, i) => {
        if (i % 2 === 0) return p;
        const key = lookup.get(p.toLowerCase()) || p;
        const arts = articlesOf(news, key);
        const risky = arts.length > 0;
        const summary = risky ? arts[0].titlu : 'Nicio controversă găsită în presă';
        return (
          <button
            key={i}
            type="button"
            className={`hl ${risky ? 'hl-risk' : 'hl-note'}${activeKey === key ? ' active' : ''}`}
            aria-haspopup="dialog"
            aria-label={`${p}: ${summary}. Deschide contextul.`}
            onClick={() => onSelect?.(key)}
          >
            {p}
            <span className="hl-tip" aria-hidden="true">
              <strong>{key}</strong>
              <span>{summary}</span>
              <em>Apasă pentru context</em>
            </span>
          </button>
        );
      })}
    </>
  );
}

export function ContextPanel({ keyword, keywords = [], news = {}, onSelect, onClose }) {
  const closeRef = useRef(null);
  const arts = articlesOf(news, keyword);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="ctx-scrim" onClick={onClose} aria-hidden="true" />
      <aside className="ctx-panel" role="dialog" aria-label={`Context pentru ${keyword}`}>
        <header className="ctx-head">
          <h2 className="ctx-title">{keyword}</h2>
          <button ref={closeRef} type="button" className="icon-btn" onClick={onClose} aria-label="Închide panoul">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"
                 strokeLinecap="round" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        {keywords.length > 1 && (
          <div className="ctx-switch" role="group" aria-label="Alte cuvinte-cheie">
            {keywords.map((k) => (
              <button
                key={k}
                type="button"
                className={`ctx-chip ${articlesOf(news, k).length ? 'risk' : 'note'}${k === keyword ? ' on' : ''}`}
                aria-pressed={k === keyword}
                onClick={() => onSelect(k)}
              >
                {k}
              </button>
            ))}
          </div>
        )}

        <p className={`ctx-status ${arts.length ? 'risk' : 'note'}`}>
          {arts.length
            ? `${arts.length} ${arts.length === 1 ? 'articol găsit' : 'articole găsite'} care merită verificate`
            : 'Nicio controversă găsită'}
        </p>

        {arts.length > 0 ? (
          <ul className="ctx-list">
            {arts.map((a, i) => (
              <li key={i}>
                {isSafeUrl(a.url) ? (
                  <a className="ctx-article" href={a.url} target="_blank" rel="noopener noreferrer">
                    <span className="ctx-article-title">{a.titlu}</span>
                    <span className="ctx-article-src">{domainOf(a.url)} ↗</span>
                  </a>
                ) : (
                  <div className="ctx-article">
                    <span className="ctx-article-title">{a.titlu}</span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">
            Nu am găsit articole relevante pentru „{keyword}”. Asta nu garantează că subiectul nu este sensibil.
          </p>
        )}

        <p className="ctx-foot">Știrile vin din NewsAPI. Verifică-le înainte de a le folosi în comunicare.</p>
      </aside>
    </>
  );
}
