import { useEffect, useState } from 'react';
import { AGENTS } from '../agents';
import { AgentDoodle, Star } from './Doodles';

const WORDS = [
  { full: "Don't", color: '#ffb2f7' },
  { full: 'Be', color: '#e3fc87' },
  { full: 'Risky', color: '#88a2ff' },
];

const STARS = [
  { top: '9%', left: '8%', color: '#ff5a7a', size: 34, d: 0 },
  { top: '16%', left: '84%', color: '#ab9dff', size: 26, d: 1.2 },
  { top: '72%', left: '6%', color: '#88a2ff', size: 30, d: 0.6 },
  { top: '80%', left: '90%', color: '#ff5a7a', size: 24, d: 1.8 },
  { top: '42%', left: '93%', color: '#e3fc87', size: 18, d: 0.3 },
  { top: '35%', left: '4%', color: '#ffd54a', size: 20, d: 2.1 },
  { top: '6%', left: '52%', color: '#c0e0ff', size: 16, d: 1.5 },
];

const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export default function Intro({ onDone }) {
  // welcome → expand → agents → leaving
  const [stage, setStage] = useState('welcome');

  useEffect(() => {
    const t1 = setTimeout(() => setStage((s) => (s === 'welcome' ? 'expand' : s)), reduced ? 600 : 2300);
    const t2 = setTimeout(() => setStage((s) => (s === 'expand' ? 'agents' : s)), reduced ? 900 : 3700);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const leave = () => {
    setStage('leaving');
    setTimeout(onDone, reduced ? 0 : 650);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Enter' || e.key === 'Escape') leave();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const expanded = stage !== 'welcome';
  const showAgents = stage === 'agents' || stage === 'leaving';

  return (
    <div className={`intro stage-${stage}`}>
      {STARS.map((s, i) => (
        <Star key={i} color={s.color} size={s.size} className="intro-star"
              style={{ top: s.top, left: s.left, animationDelay: `${s.d}s` }} />
      ))}
      <span className="intro-blob ib1" />
      <span className="intro-blob ib2" />

      <button type="button" className="intro-skip" onClick={leave}>Sari peste</button>

      <div className="intro-center">
        <p className="intro-welcome">Welcome to</p>

        <h1 className={`dbr${expanded ? ' open' : ''}`} aria-label={expanded ? "Don't Be Risky" : 'DBR'}>
          {WORDS.map((w, i) => (
            <span key={w.full} className="dbr-word" style={{ '--c': w.color, '--i': i }} aria-hidden="true">
              <span className="dbr-lead">{w.full[0]}</span>
              <span className="dbr-rest"><span>{w.full.slice(1)}</span></span>
            </span>
          ))}
        </h1>

        <p className={`intro-tag${showAgents ? ' on' : ''}`}>
          Focus grupul tău de 7 agenți AI verifică fiecare campanie înainte să ajungă online.
        </p>

        <div className={`intro-agents${showAgents ? ' on' : ''}`}>
          {AGENTS.map((a, i) => (
            <figure key={a.key} className="intro-agent" style={{ '--i': i }}>
              <AgentDoodle agent={a.key} size={122} mood="happy" />
              <figcaption>
                <strong>{a.nick}</strong>
                <span>{a.key}</span>
              </figcaption>
            </figure>
          ))}
        </div>

        <button type="button" className={`intro-cta${showAgents ? ' on' : ''}`} onClick={leave}>
          Hai să începem
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"
               strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
