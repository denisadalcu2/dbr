import { useEffect, useState } from 'react';
import { brandDnaFromInstagram, brandDnaFromText } from '../api';
import { AgentDoodle, FlowerMark } from '../components/Doodles';
import { DEMO_DNA, DEMO_STEPS } from '../demoDna';

const MAX = 20000;

const EXAMPLE = `Postare 1: "Luni fără chef? Cafeaua noastră cu ovăz te pune pe picioare ☕" – 1.240 aprecieri, 86 de comentarii pozitive („exact ce-mi trebuia”), 40 de distribuiri.
Postare 2: "OFERTĂ!!! -50% DOAR AZI!!! CUMPĂRĂ ACUM!!!" – 95 aprecieri, comentarii iritate („iar spam”).
Postare 3: "Am întrebat baristele noastre ce beau ele după tură. Răspunsurile, în carusel 👉" – 2.100 aprecieri, 230 de salvări.`;

const fmt = (n) => (n ?? 0).toLocaleString('ro-RO');

function PostList({ title, posts, metric, tone }) {
  if (!posts?.length) return null;
  return (
    <div className={`card post-list ${tone}`}>
      <span className="eyebrow">{title}</span>
      <ul>
        {posts.map((p) => (
          <li key={p.permalink || p.timestamp}>
            {(() => {
              const caption = p.caption ? p.caption.slice(0, 110) + (p.caption.length > 110 ? '…' : '') : '(fără descriere)';
              return p.permalink
                ? <a href={p.permalink} target="_blank" rel="noopener noreferrer">{caption}</a>
                : <span className="post-caption">{caption}</span>;
            })()}
            <span className="post-stats">
              {metric === 'reach' && p.reach != null && <b>{fmt(p.reach)} reach</b>}
              <span>♥ {fmt(p.likes)}</span>
              <span>💬 {fmt(p.comments)}</span>
              <span>🔖 {fmt(p.saved)}</span>
              <span>↗ {fmt(p.shares)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReachCompare({ dna }) {
  const pick = (posts) => (posts || []).map((p) => (dna.metric_used === 'reach' ? p.reach : p.likes + p.comments + p.saved + p.shares)).filter((v) => v != null);
  const top = pick(dna.top_posts);
  const weak = pick(dna.weak_posts);
  if (!top.length || !weak.length) return null;
  const avg = (xs) => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
  const a = avg(top);
  const b = avg(weak);
  const label = dna.metric_used === 'reach' ? 'reach mediu' : 'interacțiuni medii';
  return (
    <div className="card compare">
      <div className="compare-col">
        <span className="eyebrow">Postările TOP</span>
        <span className="compare-num">{a.toLocaleString('ro-RO')}</span>
        <span className="muted small">{label}</span>
      </div>
      <div className="compare-x">
        <span>{(a / Math.max(b, 1)).toFixed(1).replace('.', ',')}×</span>
        <small>mai mult</small>
      </div>
      <div className="compare-col">
        <span className="eyebrow">Postările slabe</span>
        <span className="compare-num weak">{b.toLocaleString('ro-RO')}</span>
        <span className="muted small">{label}</span>
      </div>
    </div>
  );
}

function DnaResult({ dna, isActive, onUse, goAnalyze }) {
  return (
    <div className="dna-result">
      <section className="card dna-hero">
        <div>
          <span className="eyebrow">ADN-ul brandului{dna.username ? ` · @${dna.username}` : ''}{dna.demo && <span className="tag demo">cont demo</span>}</span>
          {dna.tone && <h2 className="h2">{dna.tone}</h2>}
          <p className="dna-text">{dna.brand_dna}</p>
          <div className="row-gap">
            {isActive ? (
              <>
                <span className="tag good">Activ în analize ✓</span>
                <button type="button" className="btn-primary" onClick={goAnalyze}>Analizează o campanie</button>
              </>
            ) : (
              <button type="button" className="btn-primary" onClick={() => onUse(dna)}>Folosește ADN-ul în analize</button>
            )}
          </div>
        </div>
        <AgentDoodle agent="Gender" size={110} mood="happy" />
      </section>

      {dna.username && (
        <p className="muted small">
          {dna.posts_analyzed} postări analizate, clasate după {dna.metric_used === 'reach' ? 'reach' : 'interacțiuni (reach indisponibil)'}.
        </p>
      )}

      <ReachCompare dna={dna} />

      {!dna.has_engagement_data && (
        <p className="note-box">Nu am găsit cifre de interacțiune în text, așa că am dedus doar tonul. Adaugă aprecieri, comentarii sau distribuiri pentru elemente dovedite.</p>
      )}

      <div className="dna-grid">
        {dna.winning_elements?.length > 0 && (
          <div className="card">
            <span className="eyebrow"><FlowerMark color="#e3fc87" size={16} /> Ce funcționează</span>
            <ul className="proof-list">
              {dna.winning_elements.map((w, i) => (
                <li key={i}><strong>{w.element}</strong><span>{w.dovada}</span></li>
              ))}
            </ul>
          </div>
        )}
        {dna.elements_to_avoid?.length > 0 && (
          <div className="card">
            <span className="eyebrow"><FlowerMark color="#ffb2f7" size={16} /> De evitat</span>
            <ul className="plain-list">{dna.elements_to_avoid.map((x, i) => <li key={i}>{x}</li>)}</ul>
          </div>
        )}
        {dna.visual_elements?.length > 0 && (
          <div className="card">
            <span className="eyebrow"><FlowerMark color="#88a2ff" size={16} /> Elemente vizuale câștigătoare</span>
            <ul className="plain-list">{dna.visual_elements.map((x, i) => <li key={i}>{x}</li>)}</ul>
          </div>
        )}
      </div>

      <div className="dna-grid">
        <PostList title="Cele mai bune postări" posts={dna.top_posts} metric={dna.metric_used} tone="good" />
        <PostList title="Cele mai slabe postări" posts={dna.weak_posts} metric={dna.metric_used} tone="bad" />
      </div>
    </div>
  );
}

export default function BrandDnaPage({ activeDna, onUse, onClear, health, goAnalyze }) {
  const [tab, setTab] = useState('text');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dna, setDna] = useState(activeDna);
  const [demoStep, setDemoStep] = useState(-1);

  // Demo: aceleași etape ca analiza reală, cu date hard-codate
  useEffect(() => {
    if (demoStep < 0) return undefined;
    if (demoStep >= DEMO_STEPS.length) {
      setDna(DEMO_DNA);
      setDemoStep(-1);
      return undefined;
    }
    const t = setTimeout(() => setDemoStep((s) => s + 1), demoStep === 0 ? 700 : 900);
    return () => clearTimeout(t);
  }, [demoStep]);

  const runDemo = () => {
    setError('');
    setTab('ig');
    setDna(null);
    setDemoStep(0);
  };
  const demoRunning = demoStep >= 0;

  const run = async (fn) => {
    setError('');
    setLoading(true);
    try {
      setDna(await fn());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const igMissing = health && health.instagram === false;
  const isActive = !!(dna && activeDna && dna.brand_dna === activeDna.brand_dna);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <span className="eyebrow">Brand DNA</span>
          <h1 className="h1">Învață <span className="hl-word pink">vocea</span> brandului din ce a mers deja</h1>
          <p className="lead">Compar postările care au prins cu cele care n-au prins și extrag ce merită păstrat. Judecătorul rescrie apoi reclamele riscante pe vocea ta.</p>
        </div>
        <button type="button" className="btn-demo head-demo" disabled={loading || demoRunning} onClick={runDemo}>
          ▶ Demo Brand DNA
        </button>
        <div className="head-doodles" aria-hidden="true">
          <AgentDoodle agent="DEI" size={80} />
          <AgentDoodle agent="Millennials" size={70} />
        </div>
      </header>

      <div className="card">
        <div className="tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'text'} className={tab === 'text' ? 'on' : ''} onClick={() => setTab('text')}>Din postări anterioare</button>
          <button type="button" role="tab" aria-selected={tab === 'ig'} className={tab === 'ig' ? 'on' : ''} onClick={() => setTab('ig')}>Din contul de Instagram</button>
        </div>

        {tab === 'text' ? (
          <div className="field">
            <label htmlFor="past" className="field-label">Postările brandului, cu reacțiile lor</label>
            <textarea id="past" className="input textarea tall" value={text} maxLength={MAX}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="Lipește postări anterioare și, dacă le ai, aprecierile, comentariile și distribuirile fiecăreia…" />
            <div className="field-foot">
              <button type="button" className="link-btn" onClick={() => setText(EXAMPLE)}>Folosește un exemplu</button>
              <span className="counter">{text.length.toLocaleString('ro-RO')} / {MAX.toLocaleString('ro-RO')}</span>
            </div>
            <button type="button" className="btn-primary self-end" disabled={!text.trim() || loading} onClick={() => run(() => brandDnaFromText(text.trim()))}>
              {loading ? 'Extrag ADN-ul…' : 'Extrage ADN-ul'}
            </button>
          </div>
        ) : (
          <div className="ig-box">
            <AgentDoodle agent="GenZ" size={84} mood={igMissing ? 'meh' : 'happy'} />
            <div>
              <p>Citesc ultimele 30 de postări ale contului conectat, le clasez după reach și compar vizualurile celor mai bune cu ale celor mai slabe.</p>
              {igMissing && (
                <p className="note-box">Backend-ul nu are <code>INSTAGRAM_ACCESS_TOKEN</code> în fișierul <code>.env</code>. Adaugă-l și repornește serverul.</p>
              )}
              <div className="row-gap no-top">
                <button type="button" className="btn-primary" disabled={loading || demoRunning} onClick={() => run(brandDnaFromInstagram)}>
                  {loading ? 'Analizez contul…' : 'Analizează contul de Instagram'}
                </button>
                <button type="button" className="btn-demo" disabled={loading || demoRunning} onClick={runDemo}>
                  ▶ Rulează demo (@mugo.coffee)
                </button>
              </div>
            </div>
          </div>
        )}

        {error && <p className="error-text" role="alert">{error}</p>}
      </div>

      {loading && (
        <div className="card deliberating small-load">
          <div className="table-row">
            {['Gender', 'DEI', 'Millennials'].map((k, i) => (
              <div key={k} className="bob" style={{ animationDelay: `${i * 0.15}s` }}><AgentDoodle agent={k} size={64} mood="thinking" /></div>
            ))}
          </div>
          <p className="muted">Compar postările și caut tiparele care au prins…</p>
        </div>
      )}

      {demoRunning && (
        <div className="card deliberating small-load" aria-live="polite">
          <div className="table-row">
            {['GenZ', 'Gender', 'DEI', 'Millennials'].map((k, i) => (
              <div key={k} className="bob" style={{ animationDelay: `${i * 0.15}s` }}><AgentDoodle agent={k} size={64} mood="thinking" /></div>
            ))}
          </div>
          <ol className="demo-steps">
            {DEMO_STEPS.map((step, i) => (
              <li key={step} className={i < demoStep ? 'done' : i === demoStep ? 'now' : ''}>
                <span className="demo-dot">{i < demoStep ? '✓' : i + 1}</span>{step}
              </li>
            ))}
          </ol>
        </div>
      )}

      {!loading && !demoRunning && dna && <DnaResult dna={dna} isActive={isActive} onUse={onUse} goAnalyze={goAnalyze} />}

      {activeDna && (
        <button type="button" className="link-btn danger" onClick={() => { onClear(); }}>
          Dezactivează ADN-ul de brand din analize
        </button>
      )}
    </div>
  );
}
