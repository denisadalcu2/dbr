// Exemplu pentru Monitorizare: o postare fictivă care a pornit un val de reacții negative
export const SAMPLE_POST = 'Luni fără chef? Și noi. Primul espresso e gratis pentru cine vine îmbrăcat în pijama 😴☕';

export const SAMPLE_COMMENTS = `Haha, vin mâine în pijamaua cu dinozauri 🦖
Cea mai tare idee de luni dimineața!
Serios? Ați anunțat ofertele astea și apoi la casă nu știa nimeni nimic. Rușine.
Am stat 40 de minute la coadă și mi-au zis că „s-a terminat promoția”. Bătaie de joc.
Nu mai calc pe la voi, angajații m-au tratat de sus când am întrebat de espresso.
Asta e publicitate înșelătoare, o raportez la ANPC.
Cine mai merge la ei după ce au râs de o clientă în pijama? Am văzut clipul pe TikTok.
Boicot Mugo până își cer scuze public!!!
Eu am primit espresso-ul, totul ok 👍
Clipul cu barista care râde de doamna aia e dezgustător
Îmi place cafeaua voastră, dar faza de azi a fost penibilă
Ce program aveți în weekend?
Să vă fie rușine, ați umilit un om pentru like-uri
De ce nu răspundeți la mesaje? Ștergeți comentariile?
Mi-a plăcut ideea, păcat de execuție`;

export const DEMO_MONITOR = {
  demo: true,
  sentiment: -48,
  positive: 20,
  neutral: 13,
  negative: 67,
  level: 'criza',
  themes: [
    { tema: 'Clientă umilită în clipul viral de pe TikTok', procent: 33, tip: 'negativ', exemple: ['Clipul cu barista care râde de doamna aia e dezgustător', 'Să vă fie rușine, ați umilit un om pentru like-uri'] },
    { tema: 'Promoția nu a fost respectată în cafenele', procent: 20, tip: 'negativ', exemple: ['Am stat 40 de minute la coadă și mi-au zis că „s-a terminat promoția”. Bătaie de joc.'] },
    { tema: 'Apeluri la boicot și reclamații ANPC', procent: 14, tip: 'negativ', exemple: ['Boicot Mugo până își cer scuze public!!!'] },
    { tema: 'Fani care au apreciat ideea', procent: 20, tip: 'pozitiv', exemple: ['Haha, vin mâine în pijamaua cu dinozauri 🦖'] },
    { tema: 'Întrebări practice', procent: 13, tip: 'neutru', exemple: ['Ce program aveți în weekend?'] },
  ],
  summary: 'Un clip viral în care o barista râde de o clientă în pijama a transformat promoția în acuzații de umilire, publicitate înșelătoare și apeluri la boicot.',
  action: 'Opriți promovarea plătită a postării, publicați în următoarele 2 ore o scuză asumată și contactați privat clienta din clip. Nu ștergeți comentariile critice: alimentează acuzația de cenzură.',
  suggested_reply: 'Ne pare sincer rău. Ce s-a întâmplat azi în cafenea nu ne reprezintă: am vorbit deja cu colega noastră și o căutăm pe doamna din clip ca să ne cerem scuze personal. Promoția rămâne valabilă toată săptămâna, în toate cafenelele. Vă citim pe toți și răspundem fiecăruia.',
  comments_analyzed: 15,
  slack_alert_sent: true,
  source: 'instagram',
  post_permalink: '',
  post_caption: SAMPLE_POST,
};

export const DEMO_MONITOR_STEPS = [
  'Citesc comentariile postării @mugo.coffee…',
  'Clasific fiecare comentariu: pozitiv, neutru, negativ…',
  'Grupez reacțiile pe teme…',
  'Evaluez riscul de criză…',
  'Trimit alerta pe Slack și pregătesc un răspuns…',
];
