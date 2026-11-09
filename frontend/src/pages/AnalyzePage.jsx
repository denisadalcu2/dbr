import { useEffect, useRef, useState } from 'react';
import { analyzeCampaign, dnaToPrompt, THRESHOLDS } from '../api';
import { AGENTS, metaFor, moodFor, riskTone } from '../agents';
import { AgentDoodle, FlowerMark } from '../components/Doodles';
import { ContextPanel } from '../components/ContextHighlight';
import AnnotatedText from '../components/AnnotatedText';
import ReportText from '../components/ReportText';
import { AudienceField, DateField, ExtrasRow, prettyDate } from '../components/Fields';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const MAX_IMAGE = 10 * 1024 * 1024;
const MAX_TEXT = 5000;

const PHASES = [
  'Context Scanner caută asocieri sensibile, știri și date delicate…',
  'Focus grupul citește reclama în paralel…',
  'Agenții își notează scorurile și frazele problematice…',
  'Judecătorul scrie raportul și varianta sigură…',
];

export const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

/* ───────── Formular ───────── */
function CampaignForm({ onSubmit, activeDna, goToDna, goToAgents, customAgents, error }) {
  const [audience, setAudience] = useState('');
  const [text, setText] = useState('');
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState('');
  const [publishDate, setPublishDate] = useState('');
  const [useDna, setUseDna] = useState(true);
  const [fileError, setFileError] = useState('');
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const pick = (file) => {
    if (!file) return;
    if (file.type && !IMAGE_TYPES.includes(file.type)) {
      setFileError('Format neacceptat. Folosește JPEG, PNG, WebP sau HEIC.');
      return;
    }
    if (file.size > MAX_IMAGE) {
      setFileError('Imaginea depășește limita de 10 MB.');
      return;
    }
    setFileError('');
    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const canSend = audience.trim() && (text.trim() || image);

  const submit = (e) => {
    e.preventDefault();
    if (!canSend) return;
    const withDna = !!(activeDna && useDna);
    onSubmit({
      targetAudience: audience.trim(),
      text: text.trim(),
      image,
      imagePreview: preview,
      publishDate,
      brandDna: withDna ? dnaToPrompt(activeDna) : '',
      usedDna: withDna,
      customAgents,
    });
  };

  return (
    <form className="card form-card" onSubmit={submit}>
      <AudienceField value={audience} onChange={setAudience} num={1} />

      <div className="field">
        <label htmlFor="txt" className="field-label">
          <span className="num" style={{ background: '#ffb2f7' }}>2</span> Textul reclamei
        </label>
        <textarea id="txt" className="input textarea" value={text} onChange={(e) => setText(e.target.value)}
                  placeholder="Lipește copy-ul postării, sloganul sau scriptul…" maxLength={MAX_TEXT} rows={5} />
        {text.length > 0 && <span className="counter">{text.length.toLocaleString('ro-RO')} / {MAX_TEXT.toLocaleString('ro-RO')}</span>}
      </div>

      <div className="form-split">
        <div className="field">
          <span className="field-label">
            <span className="num" style={{ background: '#c0e0ff' }}>3</span> Vizual <em>(opțional)</em>
          </span>
          {preview ? (
            <div className="img-preview">
              <img src={preview} alt="Previzualizare vizual" />
              <div>
                <strong>{image.name}</strong>
                <span className="muted">{(image.size / 1024 / 1024).toFixed(1)} MB</span>
                <button type="button" className="link-btn" onClick={() => { setImage(null); setPreview(''); }}>Elimină imaginea</button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className={`dropzone${dragging ? ' dragging' : ''}`}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files?.[0]); }}
            >
              <FlowerMark color="#88a2ff" size={26} />
              <span><strong>Trage o imagine aici</strong> sau apasă</span>
              <span className="muted">JPEG, PNG, WebP, HEIC · max. 10 MB</span>
            </button>
          )}
          <input ref={inputRef} type="file" hidden accept={IMAGE_TYPES.join(',')}
                 onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
          {fileError && <p className="error-text" role="alert">{fileError}</p>}
        </div>
        <DateField value={publishDate} onChange={setPublishDate} num={4} />
      </div>

      <div className="form-foot">
        <ExtrasRow activeDna={activeDna} useDna={useDna} setUseDna={setUseDna} goToDna={goToDna}
                   customAgents={customAgents} goToAgents={goToAgents} />
        <button type="submit" className="btn-primary" disabled={!canSend}>
          Trimite la focus grup
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </button>
      </div>
      {error && <ErrorBox message={error} />}
    </form>
  );
}

export function ErrorBox({ message, title = 'Analiza nu a mers' }) {
  return (
    <div className="alert" role="alert">
      <AgentDoodle agent="BrandSafety" size={44} mood="worried" />
      <div>
        <strong>{title}</strong>
        <p>{message}</p>
      </div>
    </div>
  );
}

/* ───────── Încărcare ───────── */
export function Deliberating({ started, customAgents = [], title = 'Focus grupul deliberează', compact = false }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const secs = Math.max(0, Math.floor((now - started) / 1000));
  const phase = PHASES[Math.min(PHASES.length - 1, Math.floor(secs / 7))];
  return (
    <section className={`card deliberating${compact ? ' small-load' : ''}`} aria-live="polite">
      <div className="table-row">
        {AGENTS.map((a, i) => (
          <div key={a.key} className="bob" style={{ animationDelay: `${i * 0.15}s` }}>
            <AgentDoodle agent={a.key} size={compact ? 56 : 78} mood="thinking" />
          </div>
        ))}
        {customAgents.map((a, i) => (
          <div key={a.id} className="bob" style={{ animationDelay: `${(i + 7) * 0.15}s` }}>
            <AgentDoodle agent={a.name} color={a.color} size={compact ? 56 : 78} mood="thinking" />
          </div>
        ))}
      </div>
      <h2 className="h2">{title}</h2>
      <p className="muted">{phase}</p>
      <span className="timer">{secs}s</span>
    </section>
  );
}

/* ───────── Rezultat ───────── */
export function ScoreRing({ value, size = 120, label = 'risc / 100' }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  return (
    <svg className={`ring ${riskTone(value)}`} width={size} height={size} viewBox="0 0 120 120" role="img" aria-label={`Scor de risc ${value} din 100`}>
      <circle cx="60" cy="60" r={r} className="ring-track" />
      <circle cx="60" cy="60" r={r} className="ring-val" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} transform="rotate(-90 60 60)" />
      <text x="60" y="58" textAnchor="middle" className="ring-num">{value}</text>
      <text x="60" y="78" textAnchor="middle" className="ring-sub">{label}</text>
    </svg>
  );
}

export function vetoReasons(result) {
  const risk = Object.fromEntries(result.agent_feedbacks.map((f) => [f.persona, f.risk_level]));
  const reasons = [];
  if ((risk.Legal ?? 0) > THRESHOLDS.legalVeto) reasons.push(`Veto Legal (${risk.Legal})`);
  if ((risk.BrandSafety ?? 0) > THRESHOLDS.brandSafetyVeto) reasons.push(`Veto Brand Safety (${risk.BrandSafety})`);
  if (result.overall_risk_score > THRESHOLDS.rejectAverage) reasons.push(`Media peste ${THRESHOLDS.rejectAverage}`);
  return reasons;
}

function Verdict({ result }) {
  const approved = result.verdict === 'APPROVED';
  const reasons = vetoReasons(result);
  return (
    <section className={`card verdict ${approved ? 'ok' : 'no'}`}>
      <div className="verdict-main">
        <span className="eyebrow">Verdictul focus grupului</span>
        <h2 className="verdict-word">{approved ? 'Aprobat' : 'Respins'}</h2>
        <p className="verdict-line">
          {approved
            ? 'Campania poate merge mai departe. Citește totuși observațiile agenților.'
            : 'Nu publica varianta asta. Mai jos ai motivele și o alternativă sigură.'}
        </p>
        <div className="chips">
          {reasons.map((r) => <span key={r} className="tag bad">{r}</span>)}
          {result.date_risks?.length > 0 && <span className="tag date">Dată sensibilă</span>}
          {result.slack_alert_sent && <span className="tag slack">Alertă trimisă pe Slack</span>}
          {approved && !reasons.length && <span className="tag good">Sub toate pragurile</span>}
        </div>
      </div>
      <ScoreRing value={result.overall_risk_score} />
    </section>
  );
}

function orderFeedbacks(feedbacks) {
  const fixed = AGENTS.map((a) => feedbacks.find((f) => f.persona === a.key)).filter(Boolean);
  return [...fixed, ...feedbacks.filter((f) => !AGENTS.some((a) => a.key === f.persona))];
}

function FocusGrid({ feedbacks, customAgents, focus, setFocus }) {
  return (
    <section>
      <h3 className="section-title"><FlowerMark color="#ab9dff" /> Ce spune focus grupul</h3>
      <div className="agent-grid">
        {orderFeedbacks(feedbacks).map((f, i) => {
          const a = metaFor(f.persona, customAgents);
          const tone = riskTone(f.risk_level);
          return (
            <article
              key={f.persona}
              className={`card agent-card ${tone}${f.persona === 'Legal' ? ' dark' : ''}${focus === f.persona ? ' focused' : ''}`}
              style={{ '--c': a.color, '--i': i }}
              onMouseEnter={() => f.phrase && setFocus(f.persona)}
              onMouseLeave={() => setFocus(null)}
            >
              <div className="agent-top">
                <AgentDoodle agent={f.persona} color={a.custom ? a.color : undefined} size={64} mood={moodFor(f.risk_level)} />
                <div className="agent-id">
                  <strong>{a.nick}</strong>
                  <span>{a.custom ? 'personaj propriu' : `${f.persona}${a.veto ? ' · veto' : ''}`}</span>
                </div>
                <span className={`risk-badge ${tone}`}>{f.risk_level}</span>
              </div>
              <div className="bar" aria-hidden="true"><span style={{ width: `${f.risk_level}%` }} /></div>
              <p>{f.feedback}</p>
              {f.phrase && <p className="agent-phrase">„{f.phrase}”</p>}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ContextSection({ entry, customAgents, focus, setFocus, onOpen }) {
  const { result, input } = entry;
  const keywords = result.context_keywords || [];
  const risks = result.context_risks || [];
  const flags = orderFeedbacks(result.agent_feedbacks)
    .filter((f) => f.phrase)
    .map((f) => {
      const m = metaFor(f.persona, customAgents);
      return { persona: f.persona, phrase: f.phrase, color: m.color, nick: m.nick, feedback: f.feedback, risk: f.risk_level };
    });

  return (
    <section>
      <h3 className="section-title"><FlowerMark color="#ffb2f7" /> Unde e problema în text</h3>
      <div className="context-grid">
        <div className="card">
          <span className="eyebrow">Reclama analizată · public: {input.targetAudience}</span>
          {input.text ? (
            <p className="ad-text">
              <AnnotatedText text={input.text} flags={flags} keywords={keywords} news={result.context_news}
                             focus={focus} onFocus={setFocus} onKeyword={onOpen} />
            </p>
          ) : (
            <p className="muted">Doar imagine, fără text.</p>
          )}
          {entry.imagePreview && (
            <img className="ad-img" src={entry.imagePreview} alt="Vizualul analizat" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          )}
          {flags.length > 0 && (
            <div className="legend-row">
              <span className="muted small">Semnalat de:</span>
              {flags.map((f) => (
                <button key={f.persona} type="button" className={`legend-chip${focus === f.persona ? ' on' : ''}`}
                        onMouseEnter={() => setFocus(f.persona)} onMouseLeave={() => setFocus(null)}
                        onFocus={() => setFocus(f.persona)} onBlur={() => setFocus(null)}>
                  <i style={{ background: f.color }} />{f.nick}
                </button>
              ))}
            </div>
          )}
          {keywords.length > 0 && (
            <div className="legend-row">
              <span className="muted small">Subiecte din presă:</span>
              {keywords.map((k) => (
                <button key={k} type="button" className={`ctx-chip ${(result.context_news?.[k] || []).length ? 'risk' : 'note'}`} onClick={() => onOpen(k)}>{k}</button>
              ))}
            </div>
          )}
          {!flags.length && input.text && <p className="muted small">Niciun agent nu a semnalat o frază anume.</p>}
        </div>

        <div className="side-stack">
          <div className="card risks-card">
            <span className="eyebrow">Asocieri sensibile</span>
            {risks.length ? (
              <ul className="risk-items">
                {risks.map((r, i) => (
                  <li key={i}>
                    <strong>{r.eveniment}</strong>
                    {r.declansator && <span className="trigger">declanșator: „{r.declansator}”</span>}
                    <p>{r.explicatie}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-mini">
                <AgentDoodle agent="BrandSafety" size={52} mood="happy" />
                <p>Nicio asociere cu tragedii sau scandaluri.</p>
              </div>
            )}
          </div>

          <div className="card date-card">
            <span className="eyebrow">Calendar</span>
            {result.publish_date ? (
              <>
                <p className="date-title">{prettyDate(result.publish_date)}</p>
                {result.date_risks?.length ? (
                  <ul className="risk-items">
                    {result.date_risks.map((r, i) => (
                      <li key={i}>
                        <strong>{r.eveniment}</strong>
                        {r.data && <span className="trigger date">{r.data}</span>}
                        <p>{r.explicatie}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted small">Nicio comemorare sau sărbătoare delicată în jurul acestei date.</p>
                )}
              </>
            ) : (
              <p className="muted small">Nu ai ales o dată de publicare, așa că n-am verificat calendarul.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function useCopy() {
  const [copied, setCopied] = useState(false);
  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard indisponibil */
    }
  };
  return [copied, copy];
}

function Delta({ before, after }) {
  const d = after - before;
  if (d === 0) return <span className="delta same">=</span>;
  return <span className={`delta ${d < 0 ? 'down' : 'up'}`}>{d < 0 ? '↓' : '↑'} {Math.abs(d)}</span>;
}

function SafeVariant({ entry, customAgents, onRetest, retesting, retestError, onOpenRetest }) {
  const [copied, copy] = useCopy();
  const { result, retest } = entry;
  if (!result.safe_text) return null;
  const before = result.agent_feedbacks;
  const after = retest?.result.agent_feedbacks || [];
  const improved = retest && retest.result.overall_risk_score < result.overall_risk_score;

  return (
    <section>
      <h3 className="section-title"><FlowerMark color="#e3fc87" /> Varianta sigură</h3>
      <div className="card safe-card">
        <blockquote className="safe-text">{result.safe_text}</blockquote>
        <div className="row-gap no-top">
          <button type="button" className="btn-ghost" onClick={() => copy(result.safe_text)}>{copied ? 'Copiat ✓' : 'Copiază textul'}</button>
          {!retest && (
            <button type="button" className="btn-primary" disabled={retesting} onClick={onRetest}>
              {retesting ? 'Focus grupul retestează…' : '↻ Retestează cu focus grupul'}
            </button>
          )}
          {!retest && !retesting && <span className="muted small">Verifică dacă varianta rescrisă chiar trece de agenți.</span>}
        </div>
        {retesting && <Deliberating started={retesting} customAgents={entry.input.customAgents || []} title="Retestăm varianta sigură" compact />}
        {retestError && <ErrorBox message={retestError} title="Retestarea nu a mers" />}

        {retest && (
          <div className="retest">
            <div className="retest-head">
              <div className="retest-side">
                <span className="eyebrow">Înainte</span>
                <ScoreRing value={result.overall_risk_score} size={96} label="original" />
                <span className={`tag ${result.verdict === 'APPROVED' ? 'good' : 'bad'}`}>{result.verdict === 'APPROVED' ? 'Aprobat' : 'Respins'}</span>
              </div>
              <div className="retest-arrow">
                <span className="retest-big">{improved ? `−${result.overall_risk_score - retest.result.overall_risk_score}` : 'Hmm'}</span>
                <small>{improved ? 'puncte de risc' : 'riscul nu a scăzut'}</small>
              </div>
              <div className="retest-side">
                <span className="eyebrow">După</span>
                <ScoreRing value={retest.result.overall_risk_score} size={96} label="rescris" />
                <span className={`tag ${retest.result.verdict === 'APPROVED' ? 'good' : 'bad'}`}>{retest.result.verdict === 'APPROVED' ? 'Aprobat' : 'Respins'}</span>
              </div>
            </div>
            <ul className="retest-agents">
              {orderFeedbacks(before).map((f) => {
                const a = after.find((x) => x.persona === f.persona);
                if (!a) return null;
                const m = metaFor(f.persona, customAgents);
                return (
                  <li key={f.persona} title={a.feedback}>
                    <AgentDoodle agent={f.persona} color={m.custom ? m.color : undefined} size={40} mood={moodFor(a.risk_level)} />
                    <span className="ra-name">{m.nick}</span>
                    <span className="ra-vals">{f.risk_level} → <b>{a.risk_level}</b></span>
                    <Delta before={f.risk_level} after={a.risk_level} />
                  </li>
                );
              })}
            </ul>
            <button type="button" className="link-btn" onClick={onOpenRetest}>Vezi analiza completă a variantei sigure →</button>
          </div>
        )}
      </div>
    </section>
  );
}

function JudgeReport({ text }) {
  const [copied, copy] = useCopy();
  const [open, setOpen] = useState(false);
  return (
    <section>
      <h3 className="section-title"><FlowerMark color="#88a2ff" /> Raportul Judecătorului</h3>
      <div className={`card judge${open ? ' open' : ''}`}>
        <div className="judge-head">
          <AgentDoodle agent="Mascot" size={52} mood="happy" />
          <div>
            <strong>Directorul de PR</strong>
            <span className="muted">Veto-uri, probleme comune și recomandări</span>
          </div>
          <button type="button" className="btn-ghost" onClick={() => copy(text)}>{copied ? 'Copiat ✓' : 'Copiază raportul'}</button>
        </div>
        <div className="judge-body">
          <ReportText text={text} />
        </div>
        <button type="button" className="judge-toggle" onClick={() => setOpen((o) => !o)}>
          {open ? 'Restrânge raportul ↑' : 'Citește tot raportul ↓'}
        </button>
      </div>
    </section>
  );
}

export function ResultView({ entry, onNew, customAgents = [], onSave, onUpdate, onOpen }) {
  const [ctxKey, setCtxKey] = useState(null);
  const [focus, setFocus] = useState(null);
  const [retesting, setRetesting] = useState(null);
  const [retestError, setRetestError] = useState('');
  const { result, input } = entry;
  // Personajele cu care s-a făcut analiza (pot fi între timp șterse din Focus grup)
  const agentsUsed = input.customAgents?.length ? input.customAgents : customAgents;

  const retest = async () => {
    setRetestError('');
    setRetesting(Date.now());
    try {
      const res = await analyzeCampaign({
        text: result.safe_text,
        targetAudience: input.targetAudience,
        brandDna: input.brandDna,
        publishDate: input.publishDate,
        customAgents: input.customAgents,
      });
      const child = {
        id: newId(),
        createdAt: new Date().toISOString(),
        imagePreview: '',
        input: { ...input, text: result.safe_text, imageName: '', isRetestOf: entry.id },
        result: res,
      };
      onSave?.(child);
      onUpdate?.({ ...entry, retest: { entryId: child.id, createdAt: child.createdAt, result: res } });
    } catch (e) {
      setRetestError(e.message);
    } finally {
      setRetesting(null);
    }
  };

  const openRetest = () => {
    onOpen?.({
      id: entry.retest.entryId,
      createdAt: entry.retest.createdAt,
      imagePreview: '',
      input: { ...input, text: result.safe_text, imageName: '', isRetestOf: entry.id },
      result: entry.retest.result,
    });
  };

  return (
    <div className="result">
      <div className="result-bar">
        <span className="muted small">
          Analizat {new Date(entry.createdAt).toLocaleString('ro-RO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          {input.usedDna && ' · cu ADN de brand'}
          {input.isRetestOf && ' · variantă sigură retestată'}
          {input.variantLabel && ` · varianta ${input.variantLabel} din testul A/B`}
        </span>
        <button type="button" className="btn-ghost" onClick={onNew}>+ Analiză nouă</button>
      </div>
      <Verdict result={result} />
      <FocusGrid feedbacks={result.agent_feedbacks} customAgents={agentsUsed} focus={focus} setFocus={setFocus} />
      <ContextSection entry={entry} customAgents={agentsUsed} focus={focus} setFocus={setFocus} onOpen={setCtxKey} />
      <SafeVariant entry={entry} customAgents={agentsUsed} onRetest={retest} retesting={retesting}
                   retestError={retestError} onOpenRetest={openRetest} />
      <JudgeReport text={result.safe_alternative} />
      {ctxKey && (
        <ContextPanel keyword={ctxKey} keywords={result.context_keywords} news={result.context_news}
                      onSelect={setCtxKey} onClose={() => setCtxKey(null)} />
      )}
    </div>
  );
}

/* ───────── Pagina ───────── */
export default function AnalyzePage({ current, onNew, onResult, onSave, onUpdate, onOpen, activeDna, goToDna, goToAgents, customAgents }) {
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState('');

  const run = async (input) => {
    setError('');
    setLoading(Date.now());
    try {
      const result = await analyzeCampaign(input);
      onResult({
        id: newId(),
        createdAt: new Date().toISOString(),
        imagePreview: input.imagePreview || '',
        input: {
          text: input.text,
          targetAudience: input.targetAudience,
          imageName: input.image?.name || '',
          usedDna: input.usedDna,
          brandDna: input.brandDna,
          publishDate: input.publishDate,
          customAgents: input.customAgents.map(({ id, name, description, color }) => ({ id, name, description, color })),
        },
        result,
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <span className="eyebrow">Analiză campanie</span>
          <h1 className="h1">Testează reclama <span className="hl-word">înainte</span> să o vadă internetul</h1>
          <p className="lead">Agenții o citesc în paralel, verifică știrile și calendarul, îți arată exact fraza care deranjează și rescriu reclama până trece.</p>
        </div>
        <div className="head-doodles" aria-hidden="true">
          <AgentDoodle agent="GenZ" size={70} />
          <AgentDoodle agent="Boomers" size={84} />
          <AgentDoodle agent="Gender" size={64} />
        </div>
      </header>

      {current && !loading ? (
        <ResultView key={current.id} entry={current} onNew={() => { setError(''); onNew(); }} customAgents={customAgents}
                    onSave={onSave} onUpdate={onUpdate} onOpen={onOpen} />
      ) : (
        <>
          {loading && <Deliberating started={loading} customAgents={customAgents} />}
          {/* Formularul rămâne montat ca să nu pierzi textul dacă analiza eșuează */}
          <div hidden={!!loading}>
            <CampaignForm onSubmit={run} activeDna={activeDna} goToDna={goToDna} goToAgents={goToAgents}
                          customAgents={customAgents} error={error} />
          </div>
        </>
      )}
    </div>
  );
}
