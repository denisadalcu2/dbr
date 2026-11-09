// Date demonstrative pentru prezentarea Brand DNA (cont fictiv, fără apel la Instagram).
// Forma e identică cu răspunsul /api/brand-dna/instagram, deci restul interfeței îl tratează ca pe unul real.
export const DEMO_DNA = {
  demo: true,
  username: 'mugo.coffee',
  metric_used: 'reach',
  posts_analyzed: 30,
  posts_with_reach: 27,
  has_engagement_data: true,
  tone: 'Cald, autoironic, de cartier',
  brand_dna:
    'Mugo vorbește ca baristul care îți știe comanda: scurt, cald și cu o glumă despre luni dimineața. Arătăm oamenii din spatele tejghelei, nu produsul pe fundal alb. Folosim întrebări care invită la comentarii („tu ce bei după o zi lungă?”) și motive concrete în loc de superlative. Fără majuscule, fără „doar azi!!!”, fără presiune: oferta apare ca un mic secret împărtășit cu comunitatea.',
  winning_elements: [
    { element: 'Umor autoironic despre rutina de dimineață', dovada: '„Luni fără chef? Și noi.” – 18.400 reach, 312 comentarii pozitive' },
    { element: 'Poveștile baristelor, în carusel', dovada: '„Ce beau baristele după tură” – 24.900 reach, 1.130 salvări' },
    { element: 'Întrebări directe către comunitate', dovada: '„Cafea sau ceai când plouă?” – 401 comentarii, de 3× media contului' },
    { element: 'Rețete pas cu pas, salvabile', dovada: '„Cold brew acasă în 3 pași” – 2.240 salvări, cele mai multe din cont' },
  ],
  elements_to_avoid: [
    'Majuscule și semne de exclamare în serie („OFERTĂ!!!”)',
    'Presiune de tip „doar azi” – comentarii iritate, reach sub 2.000',
    'Poze de produs pe fundal alb, fără oameni',
  ],
  visual_elements: [
    'Lumină naturală caldă, tonuri de maro și crem',
    'Mâini și fețe de oameni în cadru',
    'Text scurt scris de mână peste imagine',
  ],
  top_posts: [
    { permalink: '', caption: 'Ce beau baristele noastre după o tură de 9 ore? Am întrebat. Răspunsurile, în carusel 👉', media_type: 'CAROUSEL_ALBUM', timestamp: '2026-10-12T08:30:00Z', reach: 24900, likes: 2140, comments: 286, saved: 1130, shares: 410 },
    { permalink: '', caption: 'Luni fără chef? Și noi. Primul espresso e din partea casei pentru cine ne spune cel mai bun motiv de a ieși din pat azi.', media_type: 'IMAGE', timestamp: '2026-09-29T06:45:00Z', reach: 18400, likes: 1690, comments: 312, saved: 140, shares: 220 },
    { permalink: '', caption: 'Cold brew acasă în 3 pași (și o greșeală pe care o facem toți). Salvează pentru weekend ☕', media_type: 'VIDEO', timestamp: '2026-08-17T10:00:00Z', reach: 16100, likes: 1320, comments: 98, saved: 2240, shares: 380 },
    { permalink: '', caption: 'Cafea sau ceai când plouă? Spune-ne în comentarii, iar noi aducem mâine cele mai votate.', media_type: 'IMAGE', timestamp: '2026-10-21T14:10:00Z', reach: 14700, likes: 980, comments: 401, saved: 60, shares: 75 },
  ],
  weak_posts: [
    { permalink: '', caption: 'OFERTĂ!!! -50% LA TOATE BĂUTURILE DOAR AZI!!! NU RATA!!!', media_type: 'IMAGE', timestamp: '2026-09-05T09:00:00Z', reach: 1900, likes: 64, comments: 21, saved: 2, shares: 3 },
    { permalink: '', caption: 'Noul nostru latte cu caramel sărat. Disponibil acum.', media_type: 'IMAGE', timestamp: '2026-08-02T11:20:00Z', reach: 2600, likes: 88, comments: 4, saved: 6, shares: 1 },
    { permalink: '', caption: 'Program special de sărbători. Vă așteptăm!', media_type: 'IMAGE', timestamp: '2026-10-01T16:00:00Z', reach: 3100, likes: 102, comments: 3, saved: 1, shares: 2 },
  ],
};

export const DEMO_STEPS = [
  'Mă conectez la contul @mugo.coffee…',
  'Citesc ultimele 30 de postări și statisticile lor…',
  'Clasez postările după reach…',
  'Compar vizualurile celor mai bune cu ale celor mai slabe…',
  'Scriu ADN-ul brandului…',
];
