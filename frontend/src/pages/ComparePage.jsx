import { useState } from 'react';
import { analyzeCampaign, dnaToPrompt } from '../api';
import { AGENTS, metaFor, moodFor, riskTone } from '../agents';
import { AgentDoodle, FlowerMark } from '../components/Doodles';
import { AudienceField, DateField, ExtrasRow } from '../components/Fields';
import { ErrorBox, ScoreRing, newId } from './AnalyzePage';

const LABELS = ['A', 'B', 'C'];
const COLORS = ['#e3fc87', '#ffb2f7', '#c0e0ff'];
const MAX_TEXT = 5000;

// Câștigă riscul cel mai mic; la egalitate, varianta aprobată
const rank = (runs) =>
  runs
    .filter((r) => r.result)
    .sort((a, b) => a.result.overall_risk_score - b.result.overall_risk_score
      || (a.result.verdict === 'APPROVED' ? -1 : 1) - (b.result.verdict === 'APPROVED' ? -1 : 1));

function RunStatus({ run, i }) {
  return (
    <li className={`run-row ${run.status}`}>
      <span className="variant-badge" style={{ background: COLORS[i] }}>{LABELS[i]}</span>
      <span className="run-text">{run.text}</span>
      {run.status === 'wait' && <span className="muted small">în așteptare</span>}
      {run.status === 'running' && (
        <span className="run-live">
          {['GenZ', 'Boomers', 'Legal'].map((k) => <AgentDoodle key={k} agent={k} size={30} mood="thinking" />)}
          <span className="small">analizează…</span>
        </span>
      )}
      {run.status === 'done' && <span className={`risk-badge ${riskTone(run.result.overall_risk_score)}`}>{run.result.overall_risk_score}</span>}
      {run.status === 'error' && <span className="tag bad" title={run.error}>eroare</span>}
    </li>
  );
}

export default function ComparePage({ activeDna, goToDna, goToAgents, customAgents, onSave, onOpen }) {
  const [audience, setAudience] = useState('');
  const [publishDate, setPublishDate] = useState('');
  const [useDna, setUseDna] = useState(true);
  const [variants, setVariants] = useState(['', '']);
  const [runs, setRuns] = useState(null);
  const [busy, setBusy] = useState(false);

  const filled = variants.map((v) => v.trim()).filter(Boolean);
  const canRun = audience.trim() && filled.length >= 2 && !busy;

  const setVariant = (i, v) => setVariants((vs) => vs.map((x, j) => (j === i ? v : x)));

  const run = async () => {
    const withDna = !!(activeDna && useDna);
    const brandDna = withDna ? dnaToPrompt(activeDna) : '';
    const groupId = newId();
    const list = variants
      .map((text, i) => ({ label: LABELS[i], text: text.trim(), status: 'wait' }))
      .filter((r) => r.text);
    setRuns(list);
    setBusy(true);

    // Una după alta, ca să nu depășim cota de cereri a modelului
    for (let i = 0; i < list.length; i += 1) {
      setRuns((rs) => rs.map((r, j) => (j === i ? { ...r, status: 'running' } : r)));
      try {
        const input = {
          text: list[i].text,
          targetAudience: audience.trim(),
          brandDna,
          publishDate,
          customAgents,
        };
        const result = await analyzeCampaign(input);
        const entry = {
          id: newId(),
          createdAt: new Date().toISOString(),
          imagePreview: '',
          input: {
            text: input.text,
            targetAudience: input.targetAudience,
            imageName: '',
            usedDna: withDna,
            brandDna,
            publishDate,
            customAgents: customAgents.map(({ id, name, description, color }) => ({ id, name, description, color })),
            variantLabel: list[i].label,
            groupId,
          },
          result,
        };
        onSave(entry);
        setRuns((rs) => rs.map((r, j) => (j === i ? { ...r, status: 'done', result, entry } : r)));
      } catch (e) {
        setRuns((rs) => rs.map((r, j) => (j === i ? { ...r, status: 'error', error: e.message } : r)));
      }
    }
    setBusy(false);
  };

  const ranked = runs ? rank(runs) : [];
  const winner = !busy && ranked[0];
  const done = runs && !busy;
  const personas = done
    ? [...AGENTS.map((a) => a.key), ...customAgents.map((a) => a.name)].filter((p) => ranked.some((r) => r.result.agent_feedbacks.some((f) => f.persona === p)))
    : [];

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <span className="eyebrow">Comparare A/B</span>
          <h1 className="h1">Care variantă <span className="hl-word sky">câștigă</span> focus grupul?</h1>
          <p className="lead">Scrie 2 sau 3 variante ale aceleiași reclame. Le testăm pe rând cu aceiași agenți și îți spunem care e cea mai sigură și de ce.</p>
        </div>
        <div className="head-doodles" aria-hidden="true">
          <AgentDoodle agent="Millennials" size={70} />
          <AgentDoodle agent="DEI" size={80} />
        </div>
      </header>

      <div className="card form-card">
        <div className="form-split">
          <AudienceField value={audience} onChange={setAudience} num={1} />
          <DateField value={publishDate} onChange={setPublishDate} num={2} />
        </div>

        <div className="field">
          <span className="field-label"><span className="num" style={{ background: '#ffb2f7' }}>3</span> Variantele</span>
          <div className="variants">
            {variants.map((v, i) => (
              <div key={i} className="variant-box" style={{ '--c': COLORS[i] }}>
                <div className="variant-head">
                  <span className="variant-badge" style={{ background: COLORS[i] }}>{LABELS[i]}</span>
                  {variants.length > 2 && (
                    <button type="button" className="link-btn danger" onClick={() => setVariants((vs) => vs.filter((_, j) => j !== i))}>Elimină</button>
                  )}
                </div>
                <textarea className="input textarea" value={v} maxLength={MAX_TEXT} rows={5}
                          onChange={(e) => setVariant(i, e.target.value)}
                          placeholder={`Varianta ${LABELS[i]} a reclamei…`} aria-label={`Varianta ${LABELS[i]}`} />
              </div>
            ))}
            {variants.length < 3 && (
              <button type="button" className="variant-add" onClick={() => setVariants((vs) => [...vs, ''])}>
                <FlowerMark color="#88a2ff" size={26} />
                Adaugă varianta C
              </button>
            )}
          </div>
        </div>

        <div className="form-foot">
          <ExtrasRow activeDna={activeDna} useDna={useDna} setUseDna={setUseDna} goToDna={goToDna}
                     customAgents={customAgents} goToAgents={goToAgents} />
          <button type="button" className="btn-primary" disabled={!canRun} onClick={run}>
            {busy ? 'Comparăm…' : `Compară ${filled.length || ''} variante`}
          </button>
        </div>
        <p className="hint">Fiecare variantă e o analiză completă, deci durează cam cât o analiză obișnuită, înmulțit cu numărul de variante.</p>
      </div>

      {runs && (
        <ul className="card run-list" aria-live="polite">
          {runs.map((r, i) => <RunStatus key={r.label} run={r} i={LABELS.indexOf(r.label)} />)}
        </ul>
      )}
      {done && runs.some((r) => r.status === 'error') && (
        <ErrorBox title="Unele variante nu au putut fi analizate" message={runs.filter((r) => r.error).map((r) => `${r.label}: ${r.error}`).join(' ')} />
      )}

      {winner && ranked.length >= 2 && (
        <>
          <section className={`card winner ${winner.result.verdict === 'APPROVED' ? 'ok' : 'no'}`}>
            <div className="winner-art">
              <svg className="crown" width="70" height="44" viewBox="0 0 70 44" aria-hidden="true">
                <path d="M6 40 L4 10 L20 22 L35 4 L50 22 L66 10 L64 40 Z" fill="#ffd54a" stroke="#1d2a5c" strokeWidth="3.5" strokeLinejoin="round" />
                <circle cx="35" cy="26" r="4" fill="#ff5a7a" stroke="#1d2a5c" strokeWidth="2.5" />
              </svg>
              <span className="variant-badge big" style={{ background: COLORS[LABELS.indexOf(winner.label)] }}>{winner.label}</span>
            </div>
            <div className="winner-body">
              <span className="eyebrow">Câștigătoare</span>
              <h2 className="h2">Varianta {winner.label}{winner.result.verdict === 'APPROVED' ? ' e cea mai sigură' : ' e cea mai puțin riscantă'}</h2>
              <p className="winner-text">„{winner.text}”</p>
              <p className="muted small">
                {winner.result.verdict === 'APPROVED'
                  ? `Risc ${winner.result.overall_risk_score}, cu ${ranked[1].result.overall_risk_score - winner.result.overall_risk_score} puncte sub varianta ${ranked[1].label}.`
                  : 'Atenție: nicio variantă nu a fost aprobată. Deschide analiza și folosește varianta sigură propusă de Judecător.'}
              </p>
              <button type="button" className="btn-primary" onClick={() => onOpen(winner.entry)}>Deschide analiza completă</button>
            </div>
            <ScoreRing value={winner.result.overall_risk_score} />
          </section>

          <div className="compare-cards">
            {ranked.map((r, place) => {
              const worst = [...r.result.agent_feedbacks].sort((a, b) => b.risk_level - a.risk_level).slice(0, 2);
              const idx = LABELS.indexOf(r.label);
              return (
                <article key={r.label} className="card cmp-card" style={{ '--c': COLORS[idx] }}>
                  <div className="cmp-head">
                    <span className="variant-badge" style={{ background: COLORS[idx] }}>{r.label}</span>
                    <span className="cmp-place">#{place + 1}</span>
                    <span className={`tag ${r.result.verdict === 'APPROVED' ? 'good' : 'bad'}`}>{r.result.verdict === 'APPROVED' ? 'Aprobat' : 'Respins'}</span>
                    <span className={`risk-badge ${riskTone(r.result.overall_risk_score)}`}>{r.result.overall_risk_score}</span>
                  </div>
                  <p className="cmp-text">{r.text}</p>
                  <span className="eyebrow">Cele mai mari obiecții</span>
                  <ul className="cmp-worries">
                    {worst.map((f) => {
                      const m = metaFor(f.persona, customAgents);
                      return (
                        <li key={f.persona}>
                          <AgentDoodle agent={f.persona} color={m.custom ? m.color : undefined} size={34} mood={moodFor(f.risk_level)} />
                          <span><b>{m.nick} · {f.risk_level}</b> {f.feedback}</span>
                        </li>
                      );
                    })}
                  </ul>
                  <button type="button" className="link-btn" onClick={() => onOpen(r.entry)}>Analiza completă →</button>
                </article>
              );
            })}
          </div>

          <section className="card">
            <h3 className="card-title">Scor pe agent</h3>
            <p className="muted small">Cu cât mai deschis, cu atât mai sigur. Cel mai mic scor din fiecare rând e marcat.</p>
            <div className="heat-wrap">
              <table className="heat">
                <thead>
                  <tr>
                    <th scope="col">Agent</th>
                    {ranked.map((r) => <th key={r.label} scope="col"><span className="variant-badge" style={{ background: COLORS[LABELS.indexOf(r.label)] }}>{r.label}</span></th>)}
                  </tr>
                </thead>
                <tbody>
                  {personas.map((p) => {
                    const m = metaFor(p, customAgents);
                    const vals = ranked.map((r) => r.result.agent_feedbacks.find((f) => f.persona === p)?.risk_level);
                    const best = Math.min(...vals.filter((v) => v != null));
                    return (
                      <tr key={p}>
                        <th scope="row">
                          <span className="heat-agent">
                            <AgentDoodle agent={p} color={m.custom ? m.color : undefined} size={28} />
                            {m.nick}
                          </span>
                        </th>
                        {vals.map((v, i) => (
                          <td key={ranked[i].label} className={`heat-cell ${v == null ? '' : riskTone(v)}${v === best ? ' best' : ''}`}>
                            {v ?? '–'}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                  <tr className="heat-total">
                    <th scope="row">Media</th>
                    {ranked.map((r) => <td key={r.label} className={`heat-cell ${riskTone(r.result.overall_risk_score)}`}>{r.result.overall_risk_score}</td>)}
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
