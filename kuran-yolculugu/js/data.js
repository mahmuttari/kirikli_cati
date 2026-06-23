/*
 * Kur'an Yolculuğu - Müfredat Verisi
 * Çocuklar için Elif-Ba öğretimi.
 * Her "durak" (station) bir dersi ve bir mini testi içerir.
 */

// Arap harfleri: glyph (harf), name (Türkçe okunuşu), hint (ipucu/benzetme)
const HARFLER = [
  { glyph: "ا", name: "Elif", hint: "Dümdüz ayakta duran çubuk gibi" },
  { glyph: "ب", name: "Be",   hint: "Altında bir nokta olan kayık" },
  { glyph: "ت", name: "Te",   hint: "Üstünde iki nokta olan kayık" },
  { glyph: "ث", name: "Se",   hint: "Üstünde üç nokta olan kayık" },
  { glyph: "ج", name: "Cim",  hint: "İçinde bir nokta olan kanca" },
  { glyph: "ح", name: "Ha",   hint: "Noktasız kanca" },
  { glyph: "خ", name: "Hı",   hint: "Üstünde bir nokta olan kanca" },
  { glyph: "د", name: "Dal",  hint: "Eğik küçük çengel" },
  { glyph: "ذ", name: "Zel",  hint: "Üstünde bir nokta olan çengel" },
  { glyph: "ر", name: "Ra",   hint: "Aşağı kıvrılan kuyruk" },
  { glyph: "ز", name: "Ze",   hint: "Üstünde nokta olan kuyruk" },
  { glyph: "س", name: "Sin",  hint: "Üç dişli tarak" },
  { glyph: "ش", name: "Şın",  hint: "Üstünde üç nokta olan tarak" },
  { glyph: "ص", name: "Sad",  hint: "Yumru karınlı harf" },
  { glyph: "ض", name: "Dad",  hint: "Üstünde nokta olan yumru" },
  { glyph: "ط", name: "Tı",   hint: "Bayrak direkli kutu" },
  { glyph: "ظ", name: "Zı",   hint: "Üstünde nokta olan bayrak" },
  { glyph: "ع", name: "Ayn",  hint: "Açık ağız gibi" },
  { glyph: "غ", name: "Gayn", hint: "Üstünde nokta olan ağız" },
  { glyph: "ف", name: "Fe",   hint: "Üstünde bir nokta olan halka" },
  { glyph: "ق", name: "Kaf",  hint: "Üstünde iki nokta olan halka" },
  { glyph: "ك", name: "Kef",  hint: "Anahtar gibi" },
  { glyph: "ل", name: "Lam",  hint: "Uzun kanca" },
  { glyph: "م", name: "Mim",  hint: "Küçük yuvarlak başlı" },
  { glyph: "ن", name: "Nun",  hint: "Üstünde nokta olan çanak" },
  { glyph: "ه", name: "He",   hint: "Yuvarlak düğüm" },
  { glyph: "و", name: "Vav",  hint: "Yuvarlak başlı kuyruk" },
  { glyph: "ي", name: "Ye",   hint: "Altında iki nokta olan kuyruk" },
];

// Harekeler (sesli işaretler)
const HAREKELER = [
  { glyph: "بَ", name: "Üstün (e/a)", hint: "Harfin üstünde küçük çizgi: 'e' sesi" },
  { glyph: "بِ", name: "Esre (i)",    hint: "Harfin altında küçük çizgi: 'i' sesi" },
  { glyph: "بُ", name: "Ötre (u)",    hint: "Harfin üstünde küçük vav: 'u' sesi" },
];

/*
 * Bölgeler (harita üzerindeki ana bölümler) ve duraklar.
 * Her durak: id, title, emoji, type, cards (öğrenme kartları), quiz (sorular)
 * type: 'lesson' (kart + test)
 */
const BOLGELER = [
  {
    id: "bolge1",
    name: "Harf Adası 🏝️",
    color: "#4ade80",
    duraklar: [
      {
        id: "d1",
        title: "İlk Harfler",
        emoji: "🌱",
        cards: HARFLER.slice(0, 4),       // Elif, Be, Te, Se
        quiz: makeLetterQuiz(HARFLER.slice(0, 4), HARFLER),
      },
      {
        id: "d2",
        title: "Kanca Harfler",
        emoji: "🪝",
        cards: HARFLER.slice(4, 9),       // Cim..Zel
        quiz: makeLetterQuiz(HARFLER.slice(4, 9), HARFLER),
      },
      {
        id: "d3",
        title: "Kuyruklu Harfler",
        emoji: "🐉",
        cards: HARFLER.slice(9, 13),      // Ra..Şın
        quiz: makeLetterQuiz(HARFLER.slice(9, 13), HARFLER),
      },
    ],
  },
  {
    id: "bolge2",
    name: "Çöl Vadisi 🏜️",
    color: "#fbbf24",
    duraklar: [
      {
        id: "d4",
        title: "Kalın Harfler",
        emoji: "🐪",
        cards: HARFLER.slice(13, 19),     // Sad..Gayn
        quiz: makeLetterQuiz(HARFLER.slice(13, 19), HARFLER),
      },
      {
        id: "d5",
        title: "Son Harfler",
        emoji: "⭐",
        cards: HARFLER.slice(19, 28),     // Fe..Ye
        quiz: makeLetterQuiz(HARFLER.slice(19, 28), HARFLER),
      },
      {
        id: "d6",
        title: "Tüm Harfler Sınavı",
        emoji: "🏆",
        cards: HARFLER,
        quiz: makeLetterQuiz(HARFLER, HARFLER, 6),
      },
    ],
  },
  {
    id: "bolge3",
    name: "Sihirli Orman 🌳",
    color: "#34d399",
    duraklar: [
      {
        id: "d7",
        title: "Üstün - Esre - Ötre",
        emoji: "✨",
        cards: HAREKELER,
        quiz: [
          { q: "Harfin ÜSTÜNDE çizgi varsa hangi ses çıkar?", a: "e", options: ["e", "i", "u"] },
          { q: "Harfin ALTINDA çizgi varsa hangi ses çıkar?",  a: "i", options: ["e", "i", "u"] },
          { q: "Harfin üstünde küçük 'vav' varsa hangi ses çıkar?", a: "u", options: ["e", "i", "u"] },
          { q: "'بَ' nasıl okunur?", a: "Be", options: ["Bi", "Be", "Bu"] },
          { q: "'بِ' nasıl okunur?", a: "Bi", options: ["Bi", "Be", "Bu"] },
          { q: "'بُ' nasıl okunur?", a: "Bu", options: ["Bi", "Be", "Bu"] },
        ],
      },
      {
        id: "d8",
        title: "Heceler Köprüsü",
        emoji: "🌉",
        cards: [
          { glyph: "بَ", name: "Be", hint: "B + e" },
          { glyph: "تِ", name: "Ti", hint: "T + i" },
          { glyph: "نُ", name: "Nu", hint: "N + u" },
          { glyph: "مَ", name: "Me", hint: "M + e" },
          { glyph: "لِ", name: "Li", hint: "L + i" },
        ],
        quiz: [
          { q: "'بَ' hecesi nasıl okunur?", a: "Be", options: ["Be", "Bi", "Bu"] },
          { q: "'تِ' hecesi nasıl okunur?", a: "Ti", options: ["Te", "Ti", "Tu"] },
          { q: "'نُ' hecesi nasıl okunur?", a: "Nu", options: ["Ne", "Ni", "Nu"] },
          { q: "'مَ' hecesi nasıl okunur?", a: "Me", options: ["Me", "Mi", "Mu"] },
          { q: "'لِ' hecesi nasıl okunur?", a: "Li", options: ["Le", "Li", "Lu"] },
        ],
      },
    ],
  },
  {
    id: "bolge4",
    name: "Yıldız Şehri 🌟",
    color: "#a78bfa",
    duraklar: [
      {
        id: "d9",
        title: "Cezm (Durak İşareti)",
        emoji: "🛑",
        cards: [
          { glyph: "بْ", name: "Cezm", hint: "Harfin üstünde küçük yuvarlak: ses durur (b)" },
          { glyph: "أَبْ", name: "Eb", hint: "E + b" },
          { glyph: "مِنْ", name: "Min", hint: "Mi + n" },
        ],
        quiz: [
          { q: "Cezm işareti ne yapar?", a: "Sesi durdurur", options: ["Sesi uzatır", "Sesi durdurur", "Sesi tekrarlar"] },
          { q: "'مِنْ' nasıl okunur?", a: "Min", options: ["Mine", "Min", "Mina"] },
          { q: "Cezmin şekli nedir?", a: "Küçük yuvarlak/baş", options: ["Çizgi", "Küçük yuvarlak/baş", "Nokta"] },
        ],
      },
      {
        id: "d10",
        title: "Şedde (İkileme)",
        emoji: "🔁",
        cards: [
          { glyph: "بّ", name: "Şedde", hint: "Harf iki kere okunur (bb)" },
          { glyph: "رَبّ", name: "Rabb", hint: "Ra + bb" },
          { glyph: "جَنّ", name: "Cenn", hint: "Ce + nn" },
        ],
        quiz: [
          { q: "Şedde ne yapar?", a: "Harfi iki kere okutur", options: ["Harfi siler", "Harfi iki kere okutur", "Harfi uzatır"] },
          { q: "'رَبّ' nasıl okunur?", a: "Rabb", options: ["Rab", "Rabb", "Reb"] },
          { q: "Şedde harfin neresindedir?", a: "Üstünde", options: ["Altında", "Üstünde", "Yanında"] },
        ],
      },
      {
        id: "d11",
        title: "İlk Kelimeler",
        emoji: "📖",
        cards: [
          { glyph: "اَللّٰه", name: "Allah", hint: "Yüce Allah'ın ismi" },
          { glyph: "نُور", name: "Nur", hint: "Işık / aydınlık" },
          { glyph: "نَبِيّ", name: "Nebi", hint: "Peygamber" },
          { glyph: "كِتَاب", name: "Kitab", hint: "Kitap" },
        ],
        quiz: [
          { q: "'كِتَاب' ne demek?", a: "Kitap", options: ["Kalem", "Kitap", "Kapı"] },
          { q: "'نُور' ne demek?", a: "Işık", options: ["Su", "Işık", "Taş"] },
          { q: "'نَبِيّ' ne demek?", a: "Peygamber", options: ["Melek", "Peygamber", "Kral"] },
        ],
      },
    ],
  },
];

// Bir harf grubundan çoktan seçmeli test üretir.
function makeLetterQuiz(group, pool, limit) {
  const items = limit ? shuffleArr(group).slice(0, limit) : group;
  return items.map((item) => {
    const wrongs = shuffleArr(pool.filter((h) => h.name !== item.name))
      .slice(0, 2)
      .map((h) => h.name);
    return {
      q: `Bu harfin adı nedir?  ${item.glyph}`,
      a: item.name,
      options: shuffleArr([item.name, ...wrongs]),
      glyph: item.glyph,
    };
  });
}

function shuffleArr(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Tüm durakları sıralı tek listeye çevirir (harita için).
function tumDuraklar() {
  const list = [];
  BOLGELER.forEach((b) => b.duraklar.forEach((d) => list.push({ ...d, bolge: b })));
  return list;
}
