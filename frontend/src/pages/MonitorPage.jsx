import { useEffect, useRef, useState } from 'react';
import { monitorComments, monitorInstagram } from '../api';
import { AgentDoodle, FlowerMark } from '../components/Doodles';
import { ErrorBox } from './AnalyzePage';
import { DEMO_MONITOR, DEMO_MONITOR_STEPS, SAMPLE_COMMENTS, SAMPLE_POST } from '../demoMonitor';

const AUTO_MINUTES = 5;

const LEVELS = {
  calm: { label: 'Totul e calm', text: 'Reacțiile sunt normale. Nu e nevoie de intervenție.', mood: 'happy', cls: 'calm' },
  atentie: { label: 'Atenție', text: 'Criticile încep să se adune. Merită un răspuns rapid.', mood: 'meh', cls: 'warn' },
  criza: { label: 'Criză în desfășurare', text: 'Val de reacții negative. Echipa trebuie să intervină acum.', mood: 'worried', cls: 'crisis' },
};

function SentimentGauge({ value }) {
  const pct = (value + 100) / 2;
  return (
    <div className="gauge" role="img" aria-label={`Sentiment ${value} pe o scară de la -100 la 100`}>
      <div className="gauge-track">
        <span className="gauge-marker" style={{ left: `${pct}%` }}>
          <span className="gauge-val">{value > 0 ? `+${value}` : value}</span>
        </span>
      </div>
      <div className="gauge-labels"><span>ostil −100</span><span>0</span><span>entuziast +100</span></div>
    </div>
  );
}

function MonitorResultView({ data, checkedAt }) {
  const [copied, setCopied] = useState(false);
  const lvl = LEVELS[data.level] || LEVELS.atentie;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(data.suggested_reply);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard indisponibil */ }
  };
  const dist = [
    { k: 'Pozitive', v: data.positive, cls: 'pos' },
    { k: 'Neutre', v: data.neutral, cls: 'neu' },
    { k: 'Negative', v: data.negative, cls: 'neg' },
  ];
  return (
    <div className="result">
      <section className={`card level ${lvl.cls}`}>
        <AgentDoodle agent="BrandSafety" size={110} mood={lvl.mood} />
        <div className="level-body">
          <span className="eyebrow">
            {data.comments_analyzed} comentarii analizate{checkedAt ? ` · ${checkedAt.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}` : ''}
            {data.demo && <span className="tag demo">demo</span>}
          </span>
          <h2 className="level-word">{lvl.label}</h2>
          <p className="verdict-line">{lvl.text}</p>
          <p className="level-summary">{data.summary}</p>
          <div className="chips">
            {data.slack_alert_sent && <span className="tag slack">Alertă trimisă pe Slack</span>}
            {data.post_permalink && <a className="tag" href={data.post_permalink} target="_blank" rel="noopener noreferrer">Deschide postarea ↗</a>}
          </div>
        </div>
      </section>

      <div className="split">
        <section className="card">
          <h3 className="card-title">Sentiment general</h3>
          <SentimentGauge value={data.sentiment} />
          <div className="dist" aria-hidden="true">
            {dist.map((d) => d.v > 0 && <span key={d.k} className={d.cls} style={{ flex: d.v }}>{d.v >= 8 ? `${d.v}%` : ''}</span>)}
          </div>
          <ul className="dist-legend">
            {dist.map((d) => <li key={d.k}><i className={d.cls} />{d.k} <b>{d.v}%</b></li>)}
          </ul>
        </section>
        <section className="card action-card">
          <h3 className="card-title">Ce faceți acum</h3>
          <p>{data.action}</p>
          <span className="eyebrow">Răspuns public sugerat</span>
          <blockquote className="safe-text small-quote">{data.suggested_reply}</blockquote>
          <button type="button" className="btn-ghost" onClick={copy}>{copied ? 'Copiat ✓' : 'Copiază răspunsul'}</button>
        </section>
      </div>

      {data.themes.length > 0 && (
        <section>
          <h3 className="section-title"><FlowerMark color="#ffb2f7" /> Despre ce vorbesc oamenii</h3>
          <ul className="themes">
            {[...data.themes].sort((a, b) => b.procent - a.procent).map((t) => (
              <li key={t.tema} className={`card theme ${t.tip}`}>
                <div className="theme-head">
                  <strong>{t.tema}</strong>
                  <span className={`theme-type ${t.tip}`}>{t.tip}</span>
                  <span className="theme-pct">{t.procent}%</span>
                </div>
                <div className="bar"><span style={{ width: `${t.procent}%` }} /></div>
                {t.exemple.map((e) => <p key={e} className="theme-quote">„{e}”</p>)}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export default function MonitorPage({ health }) {
  const [tab, setTab] = useState('text');
  const [postText, setPostText] = useState('');
  const [comments, setComments] = useState('');
  const [permalink, setPermalink] = useState('');
  const [auto, setAuto] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [checkedAt, setCheckedAt] = useState(null);
  const [demoStep, setDemoStep] = useState(-1);
  const linkRef = useRef(permalink);
  linkRef.current = permalink;

  const lines = comments.split('\n').filter((l) => l.trim()).length;
  const igMissing = health && health.instagram === false;

  const run = async (fn) => {
    setError('');
    setLoading(true);
    try {
      setData(await fn());
      setCheckedAt(new Date());
    } catch (e) {
      setError(e.message);
      setAuto(false);
    } finally {
      setLoading(false);
    }
  };

  // Verificare automată cât timp pagina e deschisă
  useEffect(() => {
    if (!auto) return undefined;
    const id = setInterval(() => run(() => monitorInstagram(linkRef.current.trim())), AUTO_MINUTES * 60 * 1000);
    return () => clearInterval(id);
  }, [auto]);

  useEffect(() => {
    if (demoStep < 0) return undefined;
    if (demoStep >= DEMO_MONITOR_STEPS.length) {
      setData(DEMO_MONITOR);
      setCheckedAt(new Date());
      setDemoStep(-1);
      return undefined;
    }
    const t = setTimeout(() => setDemoStep((s) => s + 1), 850);
    return () => clearTimeout(t);
  }, [demoStep]);

  const demoRunning = demoStep >= 0;
  const runDemo = () => { setError(''); setData(null); setDemoStep(0); };

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <span className="eyebrow">Monitorizare după publicare</span>
          <h1 className="h1">Prinde criza <span className="hl-word pink">înainte</span> să ajungă la știri</h1>
          <p className="lead">După publicare, citim comentariile, măsurăm sentimentul și te anunțăm pe Slack când reacțiile o iau razna, cu un răspuns gata de postat.</p>
        </div>
        <button type="button" className="btn-demo head-demo" disabled={loading || demoRunning} onClick={runDemo}>▶ Demo monitorizare</button>
      </header>

      <div className="card">
        <div className="tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'text'} className={tab === 'text' ? 'on' : ''} onClick={() => setTab('text')}>Lipește comentariile</button>
          <button type="button" role="tab" aria-selected={tab === 'ig'} className={tab === 'ig' ? 'on' : ''} onClick={() => setTab('ig')}>Din Instagram</button>
        </div>

        {tab === 'text' ? (
          <div className="form-stack">
            <div className="field">
              <label htmlFor="post" className="field-label">Postarea <em>(opțional)</em></label>
              <input id="post" className="input" value={postText} onChange={(e) => setPostText(e.target.value)} placeholder="Textul postării, pentru context" maxLength={1000} />
            </div>
            <div className="field">
              <label htmlFor="comments" className="field-label">Comentariile, câte unul pe rând</label>
              <textarea id="comments" className="input textarea tall" value={comments} onChange={(e) => setComments(e.target.value)}
                        placeholder={'Super idee!\nAm stat o oră la coadă degeaba…\n…'} />
              <div className="field-foot">
                <button type="button" className="link-btn" onClick={() => { setPostText(SAMPLE_POST); setComments(SAMPLE_COMMENTS); }}>Încarcă un exemplu</button>
                <span className="counter">{lines} {lines === 1 ? 'comentariu' : 'comentarii'}</span>
              </div>
            </div>
            <button type="button" className="btn-primary self-end" disabled={lines < 3 || loading || demoRunning}
                    onClick={() => run(() => monitorComments({ comments, postText }))}>
              {loading ? 'Analizez reacțiile…' : 'Analizează reacțiile'}
            </button>
          </div>
        ) : (
          <div className="form-stack">
            <div className="field">
              <label htmlFor="permalink" className="field-label">Linkul postării <em>(gol = cea mai recentă)</em></label>
              <input id="permalink" className="input" value={permalink} onChange={(e) => setPermalink(e.target.value)} placeholder="https://www.instagram.com/p/…" />
            </div>
            {igMissing && (
              <p className="note-box">Backend-ul nu are <code>INSTAGRAM_ACCESS_TOKEN</code> în <code>.env</code>. Până îl adaugi, folosește tab-ul „Lipește comentariile” sau demo-ul.</p>
            )}
            <div className="row-gap no-top between">
              <label className="toggle">
                <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} disabled={igMissing} />
                <span className="toggle-track"><span /></span>
                Verifică automat la {AUTO_MINUTES} minute
              </label>
              <button type="button" className="btn-primary" disabled={loading || demoRunning}
                      onClick={() => run(() => monitorInstagram(permalink.trim()))}>
                {loading ? 'Citesc comentariile…' : 'Verifică acum'}
              </button>
            </div>
            {auto && <p className="hint live-hint"><span className="status-dot on" /> Monitorizare activă. Las pagina deschisă și te anunț pe Slack la criză.</p>}
          </div>
        )}
        {error && <ErrorBox message={error} title="Monitorizarea nu a mers" />}
      </div>

      {(loading || demoRunning) && (
        <div className="card deliberating small-load" aria-live="polite">
          <div className="table-row">
            {['BrandSafety', 'GenZ', 'Millennials'].map((k, i) => (
              <div key={k} className="bob" style={{ animationDelay: `${i * 0.15}s` }}><AgentDoodle agent={k} size={64} mood="thinking" /></div>
            ))}
          </div>
          {demoRunning ? (
            <ol className="demo-steps">
              {DEMO_MONITOR_STEPS.map((step, i) => (
                <li key={step} className={i < demoStep ? 'done' : i === demoStep ? 'now' : ''}>
                  <span className="demo-dot">{i < demoStep ? '✓' : i + 1}</span>{step}
                </li>
              ))}
            </ol>
          ) : <p className="muted">Citesc comentariile și caut semnale de criză…</p>}
        </div>
      )}

      {!loading && !demoRunning && data && <MonitorResultView data={data} checkedAt={checkedAt} />}
    </div>
  );
}
