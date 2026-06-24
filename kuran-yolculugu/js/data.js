/*
 * Kur'an Yolculuğu - Müfredat Verisi
 * TAM Elif-Ba müfredatı: 7 aşama, her aşamada birden çok oyun modeli.
 *
 * Durak tipleri (type):
 *   'lesson'    -> öğrenme kartları (+ varsa mini test)
 *   'quiz'      -> sadece çoktan seçmeli sınav
 *   'match'     -> eşleştirme (harf <-> isim)
 *   'listen'    -> dinle ve doğru harfi bul
 *   'memory'    -> hafıza kartları
 *   'trace'     -> harf izi (çizme)
 *   'balloon'   -> balon patlatma (hedef harfi patlat)
 *   'mole'      -> köstebek (çıkan hedef harfe vur)
 *   'truefalse' -> doğru mu? (hızlı doğru/yanlış)
 *   'sure'      -> kısa sure okuma (kelime kelime)
 */

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

const HAREKELER = [
  { glyph: "بَ", name: "Üstün (e/a)", hint: "Harfin üstünde küçük çizgi: 'e' sesi" },
  { glyph: "بِ", name: "Esre (i)",    hint: "Harfin altında küçük çizgi: 'i' sesi" },
  { glyph: "بُ", name: "Ötre (u)",    hint: "Harfin üstünde küçük vav: 'u' sesi" },
];

const HARF_SEKILLERI = [
  { name: "Be",  glyph: "ب", bas: "بـ", orta: "ـبـ", son: "ـب" },
  { name: "Sin", glyph: "س", bas: "سـ", orta: "ـسـ", son: "ـس" },
  { name: "Mim", glyph: "م", bas: "مـ", orta: "ـمـ", son: "ـم" },
  { name: "Ayn", glyph: "ع", bas: "عـ", orta: "ـعـ", son: "ـع" },
  { name: "He",  glyph: "ه", bas: "هـ", orta: "ـهـ", son: "ـه" },
  { name: "Kef", glyph: "ك", bas: "كـ", orta: "ـكـ", son: "ـك" },
];

const RAKAMLAR = [
  { glyph: "٠", name: "Sıfır", hint: "0" },
  { glyph: "١", name: "Bir",   hint: "1" },
  { glyph: "٢", name: "İki",   hint: "2" },
  { glyph: "٣", name: "Üç",    hint: "3" },
  { glyph: "٤", name: "Dört",  hint: "4" },
  { glyph: "٥", name: "Beş",   hint: "5" },
  { glyph: "٦", name: "Altı",  hint: "6" },
  { glyph: "٧", name: "Yedi",  hint: "7" },
  { glyph: "٨", name: "Sekiz", hint: "8" },
  { glyph: "٩", name: "Dokuz", hint: "9" },
];

const SURELER = {
  ihlas: {
    ad: "İhlâs Sûresi", bilgi: "Allah'ın bir ve tek olduğunu anlatır.",
    ayetler: [
      { glyph: "قُلْ هُوَ اللّٰهُ اَحَدٌ", okunus: "Kul hüvallâhü ehad", meal: "De ki: O Allah birdir." },
      { glyph: "اَللّٰهُ الصَّمَدُ", okunus: "Allâhü's-samed", meal: "Allah hiçbir şeye muhtaç değildir." },
      { glyph: "لَمْ يَلِدْ وَلَمْ يُولَدْ", okunus: "Lem yelid ve lem yûled", meal: "O doğurmamış ve doğmamıştır." },
      { glyph: "وَلَمْ يَكُنْ لَهُ كُفُوًا اَحَدٌ", okunus: "Ve lem yekün lehû küfüven ehad", meal: "Hiçbir şey O'na denk değildir." },
    ],
  },
  kevser: {
    ad: "Kevser Sûresi", bilgi: "Kur'an'ın en kısa suresidir.",
    ayetler: [
      { glyph: "اِنَّٓا اَعْطَيْنَاكَ الْكَوْثَرَ", okunus: "İnnâ a'taynâ ke'l-kevser", meal: "Biz sana Kevser'i verdik." },
      { glyph: "فَصَلِّ لِرَبِّكَ وَانْحَرْ", okunus: "Fe salli li rabbike venhar", meal: "Öyleyse Rabbin için namaz kıl ve kurban kes." },
      { glyph: "اِنَّ شَانِئَكَ هُوَ الْاَبْتَرُ", okunus: "İnne şânieke hüve'l-ebter", meal: "Asıl soyu kesik olan sana kin tutandır." },
    ],
  },
  nas: {
    ad: "Nâs Sûresi", bilgi: "Kötülüklerden Allah'a sığınmayı öğretir.",
    ayetler: [
      { glyph: "قُلْ اَعُوذُ بِرَبِّ النَّاسِ", okunus: "Kul eûzü bi rabbi'n-nâs", meal: "De ki: İnsanların Rabbine sığınırım." },
      { glyph: "مَلِكِ النَّاسِ", okunus: "Meliki'n-nâs", meal: "İnsanların hükümdarına." },
      { glyph: "اِلٰهِ النَّاسِ", okunus: "İlâhi'n-nâs", meal: "İnsanların ilâhına." },
    ],
  },
};

const DUALAR = [
  { glyph: "بِسْمِ اللّٰهِ", okunus: "Bismillah", anlam: "Allah'ın adıyla (başlarım)" },
  { glyph: "اَلْحَمْدُ لِلّٰهِ", okunus: "Elhamdülillah", anlam: "Hamd (övgü) Allah'a aittir" },
  { glyph: "اَللّٰهُ اَكْبَرُ", okunus: "Allâhü Ekber", anlam: "Allah en büyüktür" },
  { glyph: "سُبْحَانَ اللّٰهِ", okunus: "Sübhânallah", anlam: "Allah'ı tüm eksikliklerden tenzih ederim" },
];

const ESMA = [
  { glyph: "اَلرَّحْمٰنُ", okunus: "Er-Rahmân", anlam: "Çok merhamet eden" },
  { glyph: "اَلرَّحِيمُ", okunus: "Er-Rahîm", anlam: "Çok bağışlayan" },
  { glyph: "اَلْمَلِكُ", okunus: "El-Melik", anlam: "Her şeyin sahibi" },
  { glyph: "اَلْخَالِقُ", okunus: "El-Hâlik", anlam: "Yaratan" },
  { glyph: "اَلرَّزَّاقُ", okunus: "Er-Razzâk", anlam: "Rızık veren" },
];

/* ---------- Elif-Ba aşamaları (otomatik üretim) ---------- */

// 28 harfi 7 aşamaya böl
const ELIFBA_GRUPLARI = [
  HARFLER.slice(0, 4),    // ا ب ت ث
  HARFLER.slice(4, 7),    // ج ح خ
  HARFLER.slice(7, 11),   // د ذ ر ز
  HARFLER.slice(11, 15),  // س ش ص ض
  HARFLER.slice(15, 19),  // ط ظ ع غ
  HARFLER.slice(19, 23),  // ف ق ك ل
  HARFLER.slice(23, 28),  // م ن ه و ي
];

const ASAMA_RENK = ["#4ade80", "#22d3ee", "#fbbf24", "#fb923c", "#f472b6", "#a78bfa", "#34d399"];

// Aşamalarda dönüşümlü kullanılacak arcade oyunları
const ARCADE = {
  balloon:   { title: "Balon Patlat", emoji: "🎈" },
  mole:      { title: "Köstebek",     emoji: "🐹" },
  truefalse: { title: "Doğru mu?",    emoji: "⚡" },
  memory:    { title: "Hafıza",       emoji: "🃏" },
};
const ARCADE_SIRA = ["balloon", "mole", "truefalse", "memory"];

function arcadeDurak(sid, model, grup) {
  const m = ARCADE[model];
  return {
    id: `${sid}_${model}`, title: m.title, emoji: m.emoji, type: model,
    letters: grup, pairs: grup, pool: HARFLER,
  };
}

// Her aşama için oyun duraklarını üretir (en az 5 farklı oyun modeli)
function elifBaBolgeleri() {
  return ELIFBA_GRUPLARI.map((grup, i) => {
    const sid = `a${i + 1}`;
    // bu aşamanın 3 arcade oyunu (dönüşümlü -> aşamalar arası çeşitlilik)
    const arc = [
      ARCADE_SIRA[i % 4],
      ARCADE_SIRA[(i + 1) % 4],
      ARCADE_SIRA[(i + 2) % 4],
    ];
    const harfStr = grup.map((h) => h.glyph).join(" ");
    const duraklar = [
      { id: `${sid}_ogren`, title: "Öğren",       emoji: "📖", type: "lesson", cards: grup },
      { id: `${sid}_esles`, title: "Eşleştir",    emoji: "🧩", type: "match",  pairs: grup },
      arcadeDurak(sid, arc[0], grup),
      { id: `${sid}_dinle`, title: "Dinle & Bul", emoji: "👂", type: "listen", items: grup, pool: HARFLER },
      arcadeDurak(sid, arc[1], grup),
      arcadeDurak(sid, arc[2], grup),
      { id: `${sid}_sinav`, title: "Sınav",       emoji: "🏅", type: "quiz",   quiz: makeLetterQuiz(grup, HARFLER) },
    ];
    return {
      id: `bolge_${sid}`,
      name: `${i + 1}. Aşama   ${harfStr}`,
      color: ASAMA_RENK[i],
      duraklar,
    };
  });
}

/* ---------- Pekiştirme (checkpoint) bölgeleri ---------- */
// Aşamalar arasına serpiştirilen, o ana kadar öğrenilen TÜM harfleri karıştıran tekrar durağı.
function pekistirmeBolge(no, harfler, renk, buyuk) {
  const sid = `pk${no}`;
  const d = [
    { id: `${sid}_bilmece`,  title: "Bilmece",     emoji: "🧠", type: "riddle",   letters: harfler, pool: HARFLER },
    { id: `${sid}_balon`,    title: "Balon",       emoji: "🎈", type: "balloon",  letters: harfler, pool: HARFLER },
    { id: `${sid}_kostebek`, title: "Köstebek",    emoji: "🐹", type: "mole",     letters: harfler, pool: HARFLER },
    { id: `${sid}_dinle`,    title: "Dinle & Bul", emoji: "👂", type: "listen",   items: harfler,   pool: HARFLER },
    { id: `${sid}_sinav`,    title: "Sınav",       emoji: "🏅", type: "quiz",     quiz: makeLetterQuiz(harfler, HARFLER, buyuk ? 10 : 8) },
  ];
  if (buyuk) d.splice(4, 0, { id: `${sid}_hafiza`, title: "Hafıza", emoji: "🃏", type: "memory", pairs: harfler.slice(0, 6) });
  return {
    id: `bolge_${sid}`,
    name: `🎯 Pekiştirme ${no}${buyuk ? " · Büyük Tekrar" : ""}  (${harfler.length} harf)`,
    color: renk, duraklar: d,
  };
}

/* ---------- Heceler (Elif-Ba gibi çok oyunlu) ---------- */
// Net Kuran okuma için: ünsüz + hareke = hece (Be, Bi, Bu ...)
const HECE_BASE = [
  { glyph: "ب", c: "b" }, { glyph: "ت", c: "t" }, { glyph: "ج", c: "c" },
  { glyph: "د", c: "d" }, { glyph: "ر", c: "r" }, { glyph: "س", c: "s" },
  { glyph: "ل", c: "l" }, { glyph: "م", c: "m" }, { glyph: "ن", c: "n" },
];
const USTUN_MARK = "َ", ESRE_MARK = "ِ", OTRE_MARK = "ُ";
function buyukHarf(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function heceUret(base, mark, ses) {
  return { glyph: base.glyph + mark, name: buyukHarf(base.c + ses), hint: `${base.c.toUpperCase()} + ${ses}` };
}
const HECE_USTUN = HECE_BASE.map((b) => heceUret(b, USTUN_MARK, "e"));
const HECE_ESRE  = HECE_BASE.map((b) => heceUret(b, ESRE_MARK,  "i"));
const HECE_OTRE  = HECE_BASE.map((b) => heceUret(b, OTRE_MARK,  "u"));
const HECE_HEPSI = [...HECE_USTUN, ...HECE_ESRE, ...HECE_OTRE];
const HECE_KARISIK = shuffleArr(HECE_HEPSI).slice(0, 9);

// Boşluk doldurma verisi: ünsüz sabit, doğru hareke seçilir
function heceFill(bases) {
  const V = [["e", USTUN_MARK], ["i", ESRE_MARK], ["u", OTRE_MARK]];
  return shuffleArr(bases).slice(0, 6).map((b, i) => {
    const [ses] = V[i % 3];
    return {
      govde: b.glyph, dogruSes: ses, hedefHece: buyukHarf(b.c + ses),
      secenekler: V.map(([s, m]) => ({ hece: b.glyph + m, ses: s, oku: buyukHarf(b.c + s) })),
    };
  });
}

function heceBolge(no, ad, renk, seti) {
  const sid = `hc${no}`;
  return {
    id: `bolge_${sid}`, name: ad, color: renk, duraklar: [
      { id: `${sid}_ogren`,  title: "Öğren",        emoji: "📖", type: "lesson", cards: seti },
      { id: `${sid}_dinle`,  title: "Dinle & Bul",  emoji: "👂", type: "listen", items: seti, pool: HECE_HEPSI },
      { id: `${sid}_esles`,  title: "Eşleştir",     emoji: "🧩", type: "match",  pairs: seti },
      { id: `${sid}_balon`,  title: "Balon",        emoji: "🎈", type: "balloon", letters: seti, pool: HECE_HEPSI },
      { id: `${sid}_bosluk`, title: "Boşluk Doldur", emoji: "📝", type: "fill",  fill: heceFill(HECE_BASE) },
      { id: `${sid}_sinav`,  title: "Sınav",        emoji: "🏅", type: "quiz",   quiz: makeLetterQuiz(seti, HECE_HEPSI, 6, "Bu hece nasıl okunur?") },
    ],
  };
}

const HECE_INTRO = {
  id: "bolge_hcint", name: "Harekeler 🍃", color: "#a3e635",
  duraklar: [
    { id: "hcint_ogren", title: "Üstün-Esre-Ötre", emoji: "✨", type: "lesson",
      cards: HAREKELER, quiz: [
        { q: "Harfin ÜSTÜNDE çizgi -> hangi ses?", a: "e", options: ["e", "i", "u"] },
        { q: "Harfin ALTINDA çizgi -> hangi ses?", a: "i", options: ["e", "i", "u"] },
        { q: "Üstünde küçük 'vav' -> hangi ses?", a: "u", options: ["e", "i", "u"] },
        { q: "'بَ' nasıl okunur?", a: "Be", options: ["Bi", "Be", "Bu"] },
        { q: "'بُ' nasıl okunur?", a: "Bu", options: ["Bi", "Be", "Bu"] },
      ] },
    { id: "hcint_esles", title: "Eşleştir", emoji: "🧩", type: "match", pairs: HAREKELER },
    { id: "hcint_bosluk", title: "Boşluk Doldur", emoji: "📝", type: "fill", fill: heceFill(HECE_BASE) },
  ],
};

const HECE_BOLGELERI = [
  HECE_INTRO,
  heceBolge(1, "Üstün Hecesi (e) 🟢", "#86efac", HECE_USTUN),
  heceBolge(2, "Esre Hecesi (i) 🔵",  "#7dd3fc", HECE_ESRE),
  heceBolge(3, "Ötre Hecesi (u) 🟣",  "#c4b5fd", HECE_OTRE),
  heceBolge(4, "Karışık Heceler 🌈",   "#fda4af", HECE_KARISIK),
];

/* ---------- Diğer ileri konular ---------- */
const SEKIL_BOLGE = {
  id: "bolgeSekil", name: "Şekil Atölyesi 🔤", color: "#fb7185",
  duraklar: [
    { id: "s1", title: "Harf Şekilleri", emoji: "✏️", type: "lesson",
      cards: HARF_SEKILLERI.slice(0, 3).map(sekilKart), quiz: makeSekilQuiz(HARF_SEKILLERI.slice(0, 3)) },
    { id: "s2", title: "Daha Çok Şekil", emoji: "🖌️", type: "lesson",
      cards: HARF_SEKILLERI.slice(3, 6).map(sekilKart), quiz: makeSekilQuiz(HARF_SEKILLERI.slice(3, 6)) },
    { id: "s3", title: "Harf İzi (Çizme)", emoji: "🖊️", type: "trace", cards: HARFLER.slice(0, 6) },
  ],
};
const RAKAM_BOLGE = {
  id: "bolgeRakam", name: "Rakamlar Diyarı 🔢", color: "#06b6d4",
  duraklar: [
    { id: "r1", title: "Rakamlar 0-4", emoji: "🔢", type: "lesson",
      cards: RAKAMLAR.slice(0, 5), quiz: makeLetterQuiz(RAKAMLAR.slice(0, 5), RAKAMLAR) },
    { id: "r2", title: "Rakamlar 5-9", emoji: "🧮", type: "lesson",
      cards: RAKAMLAR.slice(5, 10), quiz: makeLetterQuiz(RAKAMLAR.slice(5, 10), RAKAMLAR) },
    { id: "r3", title: "Rakam Köstebek", emoji: "🐹", type: "mole", letters: RAKAMLAR, pool: RAKAMLAR },
    { id: "r4", title: "Rakam Eşleştir", emoji: "🎯", type: "match", pairs: RAKAMLAR },
  ],
};
const YILDIZ_BOLGE = {
  id: "bolgeYildiz", name: "Yıldız Şehri 🌟", color: "#a78bfa",
  duraklar: [
    { id: "y1", title: "Cezm", emoji: "🛑", type: "lesson",
      cards: [
        { glyph: "بْ", name: "Cezm", hint: "Üstünde küçük yuvarlak: ses durur" },
        { glyph: "أَبْ", name: "Eb", hint: "E + b" }, { glyph: "مِنْ", name: "Min", hint: "Mi + n" },
      ],
      quiz: [
        { q: "Cezm ne yapar?", a: "Sesi durdurur", options: ["Sesi uzatır", "Sesi durdurur", "Tekrarlar"] },
        { q: "'مِنْ' nasıl okunur?", a: "Min", options: ["Mine", "Min", "Mina"] },
      ] },
    { id: "y2", title: "Şedde", emoji: "🔁", type: "lesson",
      cards: [
        { glyph: "بّ", name: "Şedde", hint: "Harf iki kere okunur (bb)" },
        { glyph: "رَبّ", name: "Rabb", hint: "Ra + bb" }, { glyph: "جَنّ", name: "Cenn", hint: "Ce + nn" },
      ],
      quiz: [
        { q: "Şedde ne yapar?", a: "İki kere okutur", options: ["Siler", "İki kere okutur", "Uzatır"] },
        { q: "'رَبّ' nasıl okunur?", a: "Rabb", options: ["Rab", "Rabb", "Reb"] },
      ] },
    { id: "y3", title: "İlk Kelimeler", emoji: "📖", type: "lesson",
      cards: [
        { glyph: "اَللّٰه", name: "Allah", hint: "Yüce Allah'ın ismi" },
        { glyph: "نُور", name: "Nur", hint: "Işık" },
        { glyph: "كِتَاب", name: "Kitab", hint: "Kitap" },
        { glyph: "نَبِيّ", name: "Nebi", hint: "Peygamber" },
      ],
      quiz: [
        { q: "'كِتَاب' ne demek?", a: "Kitap", options: ["Kalem", "Kitap", "Kapı"] },
        { q: "'نُور' ne demek?", a: "Işık", options: ["Su", "Işık", "Taş"] },
      ] },
  ],
};
const DUA_BOLGE = {
  id: "bolgeDua", name: "Dua Bahçesi 🤲", color: "#f472b6",
  duraklar: [
    { id: "u1", title: "Güzel Sözler", emoji: "🌸", type: "lesson",
      cards: DUALAR.map((d) => ({ glyph: d.glyph, name: d.okunus, hint: d.anlam })),
      quiz: [
        { q: "'Bismillah' ne demek?", a: "Allah'ın adıyla", options: ["Allah'ın adıyla", "Teşekkürler", "Günaydın"] },
        { q: "'Elhamdülillah' ne der?", a: "Şükür", options: ["Şükür", "Üzgünüm", "Koşalım"] },
      ] },
    { id: "u2", title: "Esmaü'l-Hüsna", emoji: "💎", type: "lesson",
      cards: ESMA.map((e) => ({ glyph: e.glyph, name: e.okunus, hint: e.anlam })),
      quiz: [
        { q: "'Er-Rahmân' ne demek?", a: "Çok merhamet eden", options: ["Çok merhamet eden", "Yaratan", "Rızık veren"] },
        { q: "'El-Hâlik' ne demek?", a: "Yaratan", options: ["Yaratan", "Affeden", "Gören"] },
      ] },
  ],
};
const SURE_BOLGE = {
  id: "bolgeSure", name: "Sure Sarayı 📖", color: "#818cf8",
  duraklar: [
    { id: "v1", title: "İhlâs Sûresi", emoji: "📜", type: "sure", sure: SURELER.ihlas },
    { id: "v2", title: "Kevser Sûresi", emoji: "📃", type: "sure", sure: SURELER.kevser },
    { id: "v3", title: "Nâs Sûresi", emoji: "📖", type: "sure", sure: SURELER.nas },
  ],
};

/* ---------- Tüm bölgeleri sırala (aşamalar + araya pekiştirme) ---------- */
function tumBolgeler() {
  const a = elifBaBolgeleri();
  const out = [];
  out.push(a[0], a[1], pekistirmeBolge(1, HARFLER.slice(0, 7), "#facc15"));
  out.push(a[2], a[3], pekistirmeBolge(2, HARFLER.slice(0, 15), "#fbbf24"));
  out.push(a[4], a[5], pekistirmeBolge(3, HARFLER.slice(0, 23), "#f59e0b"));
  out.push(a[6], pekistirmeBolge(4, HARFLER, "#f97316", true));
  out.push(SEKIL_BOLGE, ...HECE_BOLGELERI, RAKAM_BOLGE, YILDIZ_BOLGE, DUA_BOLGE, SURE_BOLGE);
  return out;
}

const BOLGELER = tumBolgeler();

/* ---------- Yardımcılar ---------- */

function sekilKart(s) {
  return {
    glyph: `${s.bas}  ${s.orta}  ${s.son}`, name: s.name,
    hint: `Başta: ${s.bas} • Ortada: ${s.orta} • Sonda: ${s.son}`,
  };
}

function makeSekilQuiz(grup) {
  return grup.map((s) => ({
    q: `Bu hangi harftir?  ${s.bas}`, a: s.name, glyph: s.bas,
    options: shuffleArr([s.name, ...shuffleArr(HARF_SEKILLERI.filter((x) => x.name !== s.name)).slice(0, 2).map((x) => x.name)]),
  }));
}

function makeLetterQuiz(group, pool, limit, soruMetni) {
  const metin = soruMetni || "Bu harfin adı nedir?";
  const items = limit ? shuffleArr(group).slice(0, limit) : group;
  return items.map((item) => {
    const wrongs = shuffleArr(pool.filter((h) => h.name !== item.name)).slice(0, 2).map((h) => h.name);
    return { q: `${metin}  ${item.glyph}`, a: item.name, glyph: item.glyph,
      options: shuffleArr([item.name, ...wrongs]) };
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

function rastgele(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function tumDuraklar() {
  const list = [];
  BOLGELER.forEach((b) => b.duraklar.forEach((d) => list.push({ ...d, bolge: b })));
  return list;
}
