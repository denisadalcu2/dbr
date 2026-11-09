// Cheile corespund exact cu AGENT_PROMPTS din agents.py (câmpul "persona" din răspuns)
export const AGENTS = [
  {
    key: 'Gender',
    nick: 'Gina',
    color: '#ffb2f7',
    role: 'Auditor de egalitate de gen',
    watches: 'Stereotipuri, obiectificare, misoginie, ton condescendent',
  },
  {
    key: 'GenZ',
    nick: 'Zee',
    color: '#e3fc87',
    role: 'Expert TikTok și cultură internet',
    watches: 'Slang folosit greșit, referințe forțate, „cringe”',
  },
  {
    key: 'Millennials',
    nick: 'Milo',
    color: '#88a2ff',
    role: 'Manager millennial',
    watches: 'Utilitate, transparență, etică comercială, corporate BS',
  },
  {
    key: 'Boomers',
    nick: 'Bob',
    color: '#c0e0ff',
    role: 'Consumator conservator 50+',
    watches: 'Citește totul ad-literam, fără ironie; valori tradiționale',
  },
  {
    key: 'DEI',
    nick: 'Dee',
    color: '#ab9dff',
    role: 'Activist social',
    watches: 'Microagresiuni, excluderea minorităților, dog-whistles',
  },
  {
    key: 'BrandSafety',
    nick: 'Siren',
    color: '#ffd54a',
    role: 'Crisis management',
    watches: 'Asocieri cu tragedii, atentate, tabuuri, scandaluri',
    veto: true,
  },
  {
    key: 'Legal',
    nick: 'Lex',
    color: '#253a82',
    role: 'Auditor legal',
    watches: 'Afirmații false, incitare la ură, garanții financiare mincinoase',
    veto: true,
  },
];

export const AGENT_BY_KEY = Object.fromEntries(AGENTS.map((a) => [a.key, a]));

export const moodFor = (risk) => (risk < 35 ? 'happy' : risk < 65 ? 'meh' : 'worried');

export const riskTone = (risk) => (risk < 35 ? 'low' : risk < 65 ? 'mid' : 'high');

export const CUSTOM_COLORS = ['#ff9a5a', '#7fd8be', '#f7a8c4', '#b8e986', '#9ad0ff', '#d4b5ff'];

/** Datele de afișare pentru orice persona: agent fix sau personaj definit de agenție */
export function metaFor(persona, customAgents = []) {
  if (AGENT_BY_KEY[persona]) return { ...AGENT_BY_KEY[persona], custom: false };
  const c = customAgents.find((a) => a.name === persona);
  return {
    key: persona,
    nick: persona,
    color: c?.color || '#7fd8be',
    role: c?.description || 'Personaj definit de agenție',
    watches: c?.description || '',
    custom: true,
  };
}
