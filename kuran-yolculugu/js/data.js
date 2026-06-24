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
    ad: "İhlâs Sûresi", sureNo: 112, bilgi: "Allah'ın bir ve tek olduğunu anlatır.",
    ayetler: [
      { glyph: "قُلْ هُوَ اللّٰهُ اَحَدٌ", okunus: "Kul hüvallâhü ehad", meal: "De ki: O Allah birdir." },
      { glyph: "اَللّٰهُ الصَّمَدُ", okunus: "Allâhü's-samed", meal: "Allah hiçbir şeye muhtaç değildir." },
      { glyph: "لَمْ يَلِدْ وَلَمْ يُولَدْ", okunus: "Lem yelid ve lem yûled", meal: "O doğurmamış ve doğmamıştır." },
      { glyph: "وَلَمْ يَكُنْ لَهُ كُفُوًا اَحَدٌ", okunus: "Ve lem yekün lehû küfüven ehad", meal: "Hiçbir şey O'na denk değildir." },
    ],
  },
  kevser: {
    ad: "Kevser Sûresi", sureNo: 108, bilgi: "Kur'an'ın en kısa suresidir.",
    ayetler: [
      { glyph: "اِنَّٓا اَعْطَيْنَاكَ الْكَوْثَرَ", okunus: "İnnâ a'taynâ ke'l-kevser", meal: "Biz sana Kevser'i verdik." },
      { glyph: "فَصَلِّ لِرَبِّكَ وَانْحَرْ", okunus: "Fe salli li rabbike venhar", meal: "Öyleyse Rabbin için namaz kıl ve kurban kes." },
      { glyph: "اِنَّ شَانِئَكَ هُوَ الْاَبْتَرُ", okunus: "İnne şânieke hüve'l-ebter", meal: "Asıl soyu kesik olan sana kin tutandır." },
    ],
  },
  nas: {
    ad: "Nâs Sûresi", sureNo: 114, bilgi: "Kötülüklerden Allah'a sığınmayı öğretir.",
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
const SURE_FATIHA = {
  ad: "Fâtiha Sûresi", sureNo: 1, bilgi: "Kur'an'ın açılış suresi, her namazda okunur.",
  ayetler: [
    { glyph: "بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيمِ", okunus: "Bismillâhi'r-rahmâni'r-rahîm", meal: "Rahmân ve Rahîm Allah'ın adıyla." },
    { glyph: "اَلْحَمْدُ لِلّٰهِ رَبِّ الْعَالَمِينَ", okunus: "Elhamdü lillâhi rabbi'l-âlemîn", meal: "Hamd, âlemlerin Rabbi Allah'a mahsustur." },
    { glyph: "اَلرَّحْمٰنِ الرَّحِيمِ", okunus: "Er-rahmâni'r-rahîm", meal: "O, Rahmân ve Rahîm'dir." },
    { glyph: "مَالِكِ يَوْمِ الدِّينِ", okunus: "Mâliki yevmi'd-dîn", meal: "Din (hesap) gününün sahibidir." },
    { glyph: "اِيَّاكَ نَعْبُدُ وَاِيَّاكَ نَسْتَعِينُ", okunus: "İyyâke na'büdü ve iyyâke nesteîn", meal: "Yalnız sana kulluk eder, yalnız senden yardım dileriz." },
    { glyph: "اِهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ", okunus: "İhdine's-sırâta'l-müstakîm", meal: "Bizi doğru yola ilet." },
    { glyph: "صِرَاطَ الَّذِينَ اَنْعَمْتَ عَلَيْهِمْ", okunus: "Sırâtallezîne en'amte aleyhim...", meal: "Nimet verdiklerinin yoluna..." },
  ],
};
const SURE_FELAK = {
  ad: "Felak Sûresi", sureNo: 113, bilgi: "Kötülüklerden sabahın Rabbine sığınmayı öğretir.",
  ayetler: [
    { glyph: "قُلْ اَعُوذُ بِرَبِّ الْفَلَقِ", okunus: "Kul eûzü bi rabbi'l-felak", meal: "De ki: Sabahın Rabbine sığınırım." },
    { glyph: "مِنْ شَرِّ مَا خَلَقَ", okunus: "Min şerri mâ halak", meal: "Yarattıklarının şerrinden." },
    { glyph: "وَمِنْ شَرِّ غَاسِقٍ اِذَا وَقَبَ", okunus: "Ve min şerri ğâsikin izâ vekab", meal: "Karanlık çöktüğünde gecenin şerrinden." },
    { glyph: "وَمِنْ شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ", okunus: "Ve min şerri'n-neffâsâti fi'l-ukad", meal: "Düğümlere üfleyenlerin şerrinden." },
    { glyph: "وَمِنْ شَرِّ حَاسِدٍ اِذَا حَسَدَ", okunus: "Ve min şerri hâsidin izâ hased", meal: "Haset ettiğinde hasetçinin şerrinden." },
  ],
};
const SURE_ASR = {
  ad: "Asr Sûresi", sureNo: 103, bilgi: "Zamana yemin ederek insanın kurtuluş yolunu anlatır.",
  ayetler: [
    { glyph: "وَالْعَصْرِ", okunus: "Vel-asr", meal: "Asra (zamana) yemin olsun." },
    { glyph: "اِنَّ الْاِنْسَانَ لَفِي خُسْرٍ", okunus: "İnne'l-insâne lefî husr", meal: "İnsan gerçekten ziyandadır." },
    { glyph: "اِلَّا الَّذِينَ اٰمَنُوا وَعَمِلُوا الصَّالِحَاتِ", okunus: "İlle'llezîne âmenû ve amilu's-sâlihât...", meal: "Ancak iman edip iyi işler yapanlar hariç..." },
  ],
};
const SURE_BOLGE = {
  id: "bolgeSure", name: "Sure Sarayı 📖", color: "#818cf8",
  duraklar: [
    { id: "v0", title: "Fâtiha Sûresi", emoji: "🕌", type: "sure", sure: SURE_FATIHA },
    { id: "v1", title: "İhlâs Sûresi", emoji: "📜", type: "sure", sure: SURELER.ihlas },
    { id: "v4", title: "Felak Sûresi", emoji: "🌅", type: "sure", sure: SURE_FELAK },
    { id: "v3", title: "Nâs Sûresi", emoji: "📖", type: "sure", sure: SURELER.nas },
    { id: "v5", title: "Asr Sûresi", emoji: "⏳", type: "sure", sure: SURE_ASR },
    { id: "v2", title: "Kevser Sûresi", emoji: "📃", type: "sure", sure: SURELER.kevser },
  ],
};

/* ---------- Med (uzatma) ---------- */
const MEDLER = [
  { glyph: "بَا", name: "Bââ", hint: "Be sesini UZAT (elif med)" },
  { glyph: "بُو", name: "Bûû", hint: "Bu sesini UZAT (vav med)" },
  { glyph: "بِي", name: "Bîî", hint: "Bi sesini UZAT (ye med)" },
  { glyph: "تَا", name: "Tââ", hint: "Te sesini uzat" },
  { glyph: "نُو", name: "Nûû", hint: "Nu sesini uzat" },
  { glyph: "سِي", name: "Sîî", hint: "Si sesini uzat" },
];
const MED_BOLGE = {
  id: "bolgeMed", name: "Med Vadisi 〰️", color: "#2dd4bf",
  duraklar: [
    { id: "md1", title: "Uzatmalar", emoji: "〰️", type: "lesson", cards: MEDLER,
      quiz: [
        { q: "Med ne demek?", a: "Sesi uzatmak", options: ["Sesi uzatmak", "Sesi kesmek", "Susmak"] },
        { q: "'بَا' nasıl okunur?", a: "Bââ (uzun)", options: ["Be (kısa)", "Bââ (uzun)", "Bi"] },
        { q: "Elif med hangi sesi uzatır?", a: "e/a", options: ["e/a", "i", "u"] },
      ] },
    { id: "md2", title: "Med Dinle", emoji: "👂", type: "listen", items: MEDLER, pool: MEDLER },
    { id: "md3", title: "Med Eşleştir", emoji: "🧩", type: "match", pairs: MEDLER },
    { id: "md4", title: "Med Balon", emoji: "🎈", type: "balloon", letters: MEDLER, pool: MEDLER },
    { id: "md5", title: "Med Sınav", emoji: "🏅", type: "quiz", quiz: makeLetterQuiz(MEDLER, MEDLER, 5, "Bu nasıl okunur?") },
  ],
};

/* ---------- Tenvin ---------- */
const TENVINLER = [
  { glyph: "بًا", name: "Ben", hint: "İki üstün: 'en' sesi" },
  { glyph: "بٍ", name: "Bin", hint: "İki esre: 'in' sesi" },
  { glyph: "بٌ", name: "Bun", hint: "İki ötre: 'un' sesi" },
  { glyph: "تًا", name: "Ten", hint: "'en' ile biter" },
  { glyph: "سٌ", name: "Sun", hint: "'un' ile biter" },
];
const TENVIN_BOLGE = {
  id: "bolgeTenvin", name: "Tenvin Tepesi ⛰️", color: "#c084fc",
  duraklar: [
    { id: "tn1", title: "Tenvin Nedir?", emoji: "⛰️", type: "lesson", cards: TENVINLER,
      quiz: [
        { q: "İki üstün (tenvin) hangi ses?", a: "en", options: ["en", "in", "un"] },
        { q: "İki esre hangi ses?", a: "in", options: ["en", "in", "un"] },
        { q: "İki ötre hangi ses?", a: "un", options: ["en", "in", "un"] },
      ] },
    { id: "tn2", title: "Tenvin Dinle", emoji: "👂", type: "listen", items: TENVINLER, pool: TENVINLER },
    { id: "tn3", title: "Tenvin Eşleştir", emoji: "🧩", type: "match", pairs: TENVINLER },
    { id: "tn4", title: "Tenvin Sınav", emoji: "🏅", type: "quiz", quiz: makeLetterQuiz(TENVINLER, TENVINLER, 5, "Bu nasıl okunur?") },
  ],
};

/* ---------- Kelimeler (kelime düzeyinde boşluk doldurma) ---------- */
const KELIMELER = [
  { tam: "اَب",    harfler: ["ا", "ب"],            okunus: "Eb",    anlam: "Baba" },
  { tam: "بَاب",   harfler: ["ب", "ا", "ب"],        okunus: "Bâb",   anlam: "Kapı" },
  { tam: "نُور",   harfler: ["ن", "و", "ر"],        okunus: "Nûr",   anlam: "Işık" },
  { tam: "قَلَم",  harfler: ["ق", "ل", "م"],        okunus: "Kalem", anlam: "Kalem" },
  { tam: "دِين",   harfler: ["د", "ي", "ن"],        okunus: "Dîn",   anlam: "Din" },
  { tam: "كِتَاب", harfler: ["ك", "ت", "ا", "ب"],   okunus: "Kitâb", anlam: "Kitap" },
];
const KELIME_BOLGE = {
  id: "bolgeKelime", name: "Kelime Şehri 🏙️", color: "#fb7185",
  duraklar: [
    { id: "kl1", title: "Kelime Tanı", emoji: "📖", type: "lesson",
      cards: KELIMELER.map((k) => ({ glyph: k.tam, name: k.okunus, hint: k.anlam })) },
    { id: "kl2", title: "Boşluğu Doldur", emoji: "📝", type: "kelime", kelimeler: KELIMELER.slice(0, 4), pool: HARFLER },
    { id: "kl3", title: "Zor Kelimeler", emoji: "🧩", type: "kelime", kelimeler: KELIMELER.slice(2, 6), pool: HARFLER },
    { id: "kl4", title: "Kelime Eşleştir", emoji: "🔗", type: "match",
      pairs: KELIMELER.map((k) => ({ glyph: k.tam, name: k.okunus })) },
  ],
};

/* ---------- Lâm-ı Tarif (Güneş / Ay harfleri) ---------- */
const LAMTARIF_BOLGE = {
  id: "bolgeLam", name: "El-Takısı Bahçesi 🌗", color: "#fb923c",
  duraklar: [
    { id: "lm1", title: "Ay & Güneş Harfleri", emoji: "🌗", type: "lesson",
      cards: [
        { glyph: "اَلْقَمَر", name: "El-Kamer", hint: "AY harfi: lâm OKUNUR (el-kamer)" },
        { glyph: "اَلشَّمْس", name: "Eş-Şems", hint: "GÜNEŞ harfi: lâm OKUNMAZ, şedde (eş-şems)" },
        { glyph: "اَلْبَاب", name: "El-Bâb", hint: "Ay harfi (b): el- okunur" },
        { glyph: "اَلنُّور", name: "En-Nûr", hint: "Güneş harfi (n): lâm düşer, en-nûr" },
      ],
      quiz: [
        { q: "AY (kamerî) harfinde lâm ne olur?", a: "Okunur", options: ["Okunur", "Okunmaz", "Uzar"] },
        { q: "GÜNEŞ (şemsî) harfinde lâm ne olur?", a: "Okunmaz (şedde)", options: ["Okunur", "Okunmaz (şedde)", "Durur"] },
        { q: "'اَلشَّمْس' nasıl okunur?", a: "Eş-Şems", options: ["El-Şems", "Eş-Şems", "El-Sems"] },
        { q: "'اَلْقَمَر' nasıl okunur?", a: "El-Kamer", options: ["Ek-Kamer", "El-Kamer", "Ek-Amer"] },
      ] },
    { id: "lm2", title: "Hangisi Okunur?", emoji: "⚖️", type: "truefalse",
      letters: [
        { glyph: "اَلْقَمَر", name: "El-Kamer" }, { glyph: "اَلْبَيْت", name: "El-Beyt" },
        { glyph: "اَلشَّمْس", name: "Eş-Şems" }, { glyph: "اَلرَّحْمٰن", name: "Er-Rahmân" },
      ], pool: [
        { glyph: "اَلْقَمَر", name: "El-Kamer" }, { glyph: "اَلْبَيْت", name: "El-Beyt" },
        { glyph: "اَلشَّمْس", name: "Eş-Şems" }, { glyph: "اَلرَّحْمٰن", name: "Er-Rahmân" },
      ] },
  ],
};

/* ---------- Kalkale ---------- */
const KALKALE_HARF = [
  { glyph: "قْ", name: "Kaf", hint: "Sâkin olunca sıçrar/yankılanır" },
  { glyph: "طْ", name: "Tı", hint: "Sâkin olunca sıçrar" },
  { glyph: "بْ", name: "Be", hint: "Sâkin olunca sıçrar" },
  { glyph: "جْ", name: "Cim", hint: "Sâkin olunca sıçrar" },
  { glyph: "دْ", name: "Dal", hint: "Sâkin olunca sıçrar" },
];
const KALKALE_BOLGE = {
  id: "bolgeKalkale", name: "Kalkale Köyü 🔔", color: "#38bdf8",
  duraklar: [
    { id: "kk1", title: "Sıçrayan Harfler", emoji: "🔔", type: "lesson", cards: KALKALE_HARF,
      quiz: [
        { q: "Kalkale harfleri kaç tanedir?", a: "5", options: ["3", "5", "7"] },
        { q: "Kalkale ne demek?", a: "Sıçratarak okuma", options: ["Sessiz okuma", "Sıçratarak okuma", "Uzatma"] },
        { q: "Hangisi kalkale harfidir?", a: "ق", options: ["م", "ق", "س"] },
      ] },
    { id: "kk2", title: "Kalkale Balonu", emoji: "🎈", type: "balloon", letters: KALKALE_HARF, pool: HARFLER },
    { id: "kk3", title: "Kalkale Bul", emoji: "🐹", type: "mole", letters: KALKALE_HARF, pool: HARFLER },
  ],
};

/* ---------- Med Çeşitleri ---------- */
const MEDCESIT_BOLGE = {
  id: "bolgeMedC", name: "Med Dağı ⛰️", color: "#2dd4bf",
  duraklar: [
    { id: "mc1", title: "Med Çeşitleri", emoji: "⛰️", type: "lesson",
      cards: [
        { glyph: "قَالَ", name: "Tabiî Med", hint: "Normal 1 elif uzatma (kâle)" },
        { glyph: "جَٓاءَ", name: "Muttasıl Med", hint: "Med + aynı kelimede hemze: UZUN" },
        { glyph: "يَٓا اَيُّهَا", name: "Munfasıl Med", hint: "Med + sonraki kelimede hemze: uzun" },
        { glyph: "اَلضَّٓالّ۪ين", name: "Lâzım Med", hint: "Med + şedde/sükûn: EN UZUN" },
      ],
      quiz: [
        { q: "Tabiî med kaç elif uzatılır?", a: "1 elif", options: ["1 elif", "4 elif", "Uzatılmaz"] },
        { q: "En uzun okunan med hangisidir?", a: "Lâzım med", options: ["Tabiî med", "Lâzım med", "Hiçbiri"] },
        { q: "Med harfleri hangileridir?", a: "Elif-Vav-Ye", options: ["Be-Te-Se", "Elif-Vav-Ye", "Kaf-Lam-Mim"] },
      ] },
    { id: "mc2", title: "Med Eşleştir", emoji: "🧩", type: "match",
      pairs: [
        { glyph: "قَالَ", name: "Tabiî" }, { glyph: "جَٓاءَ", name: "Muttasıl" },
        { glyph: "اَلضَّٓالّ۪ين", name: "Lâzım" },
      ] },
  ],
};

/* ---------- Sâkin Nûn ve Tenvin (İzhâr/İdgâm/İklâb/İhfâ) ---------- */
const NUNSAKIN_BOLGE = {
  id: "bolgeNun", name: "Tecvid Tepesi 🏔️", color: "#a78bfa",
  duraklar: [
    { id: "nn1", title: "4 Kural", emoji: "🏔️", type: "lesson",
      cards: [
        { glyph: "مَنْ اٰمَنَ", name: "İzhâr", hint: "Boğaz harfi (ء ه ع ح غ خ): AÇIK oku" },
        { glyph: "مِنْ رَبِّهِمْ", name: "İdgâm", hint: "ي ر م ل و ن: sonrakine KAYNAŞTIR" },
        { glyph: "مِنْۢ بَعْدِ", name: "İklâb", hint: "ب'den önce: nûn 'm'ye DÖNÜŞÜR" },
        { glyph: "اَنْتُمْ", name: "İhfâ", hint: "Kalan harfler: GİZLİ/genizden oku" },
      ],
      quiz: [
        { q: "Sâkin nûn + boğaz harfi = ?", a: "İzhâr", options: ["İzhâr", "İklâb", "İhfâ"] },
        { q: "Sâkin nûn + 'b' = ?", a: "İklâb", options: ["İdgâm", "İklâb", "İzhâr"] },
        { q: "İdgâm harfleri (yermelûn) kaç tane?", a: "6", options: ["4", "6", "15"] },
        { q: "İklâb'da nûn hangi sese döner?", a: "m", options: ["m", "n", "l"] },
      ] },
    { id: "nn2", title: "Kuralı Eşleştir", emoji: "🧩", type: "match",
      pairs: [
        { glyph: "مَنْ اٰمَنَ", name: "İzhâr" }, { glyph: "مِنْ رَبِّهِمْ", name: "İdgâm" },
        { glyph: "مِنْۢ بَعْدِ", name: "İklâb" }, { glyph: "اَنْتُمْ", name: "İhfâ" },
      ] },
    { id: "nn3", title: "Kural Sınavı", emoji: "🏅", type: "quiz",
      quiz: [
        { q: "'اَنْتُمْ' hangi kural?", a: "İhfâ", options: ["İzhâr", "İhfâ", "İklâb"] },
        { q: "'مَنْ اٰمَنَ' hangi kural?", a: "İzhâr", options: ["İzhâr", "İdgâm", "İhfâ"] },
        { q: "'مِنْۢ بَعْدِ' hangi kural?", a: "İklâb", options: ["İklâb", "İdgâm", "İzhâr"] },
        { q: "'مِنْ رَبِّهِمْ' hangi kural?", a: "İdgâm", options: ["İhfâ", "İdgâm", "İklâb"] },
      ] },
  ],
};

/* ---------- Sâkin Mîm ---------- */
const MIMSAKIN_BOLGE = {
  id: "bolgeMim", name: "Mîm Kuralları 🅜", color: "#f472b6",
  duraklar: [
    { id: "mm1", title: "Sâkin Mîm", emoji: "🅜", type: "lesson",
      cards: [
        { glyph: "هُمْ بِهٖ", name: "İhfâ-i Şefevî", hint: "مْ + ب: dudakla gizle" },
        { glyph: "لَهُمْ مَا", name: "İdgâm-ı Misleyn", hint: "مْ + م: kaynaştır" },
        { glyph: "اَمْ لَمْ", name: "İzhâr-i Şefevî", hint: "مْ + diğer harf: açık oku" },
      ],
      quiz: [
        { q: "Sâkin mîm + 'b' = ?", a: "İhfâ-i şefevî", options: ["İhfâ-i şefevî", "İdgâm", "İzhâr"] },
        { q: "Sâkin mîm + 'm' = ?", a: "İdgâm-ı misleyn", options: ["İklâb", "İdgâm-ı misleyn", "İhfâ"] },
        { q: "Sâkin mîm + başka harf = ?", a: "İzhâr-i şefevî", options: ["İzhâr-i şefevî", "İklâb", "İdgâm"] },
      ] },
  ],
};

/* ---------- Vakıf (Durak) İşaretleri ---------- */
const VAKIF_BOLGE = {
  id: "bolgeVakif", name: "Durak İşaretleri ⏸️", color: "#94a3b8",
  duraklar: [
    { id: "vk1", title: "Secâvend", emoji: "⏸️", type: "lesson",
      cards: [
        { glyph: "مـ", name: "Lâzım", hint: "Mutlaka DUR" },
        { glyph: "ج", name: "Câiz", hint: "Durabilir de geçebilir de" },
        { glyph: "لا", name: "Lâ", hint: "DURMA, geç" },
        { glyph: "قلى", name: "Durmak evlâ", hint: "Durmak daha iyi" },
        { glyph: "صلى", name: "Geçmek evlâ", hint: "Geçmek daha iyi" },
        { glyph: "∴ ... ∴", name: "Muânaka", hint: "Birinde dur (ikisinde değil)" },
      ],
      quiz: [
        { q: "'مـ' işareti ne der?", a: "Mutlaka dur", options: ["Mutlaka dur", "Durma", "Hızlan"] },
        { q: "'لا' işareti ne der?", a: "Durma, geç", options: ["Dur", "Durma, geç", "Uzat"] },
        { q: "'ج' işareti ne anlama gelir?", a: "Durmak câiz", options: ["Yasak", "Durmak câiz", "Mutlaka dur"] },
      ] },
  ],
};

/* ---------- Okuma İncelikleri (Lafzatullah + özel harfler) ---------- */
const INCELIK_BOLGE = {
  id: "bolgeIncelik", name: "Okuma İncelikleri 💠", color: "#818cf8",
  duraklar: [
    { id: "in1", title: "Lafzatullah", emoji: "💠", type: "lesson",
      cards: [
        { glyph: "نَصْرُ اللّٰه", name: "Kalın", hint: "Önünde üstün/ötre → KALIN (Allah)" },
        { glyph: "بِسْمِ اللّٰه", name: "İnce", hint: "Önünde esre → İNCE (Allah)" },
      ],
      quiz: [
        { q: "Esreden sonra Allah lafzı nasıl?", a: "İnce", options: ["Kalın", "İnce", "Sessiz"] },
        { q: "Üstün/ötreden sonra Allah lafzı nasıl?", a: "Kalın", options: ["Kalın", "İnce", "Uzun"] },
      ] },
    { id: "in2", title: "Özel Harfler", emoji: "✴️", type: "lesson",
      cards: [
        { glyph: "ة", name: "Ta-i merbûta", hint: "Geçerken 't', dururken 'h'" },
        { glyph: "ى", name: "Elif-i maksûre", hint: "'a' diye uzatılır" },
        { glyph: "ء", name: "Hemze", hint: "Boğazda kesme sesi" },
      ],
      quiz: [
        { q: "'ة' dururken nasıl okunur?", a: "h", options: ["t", "h", "s"] },
        { q: "'ى' hangi sesi uzatır?", a: "a", options: ["a", "i", "u"] },
        { q: "'ء' (hemze) nedir?", a: "Kesme sesi", options: ["Uzatma", "Kesme sesi", "Şedde"] },
      ] },
  ],
};

/* ---------- Okuma Atölyesi (şeddeli/medli kelime okuma) ---------- */
const OKUMA_KELIMELER = [
  { glyph: "اَلرَّحْمٰن", name: "Er-Rahmân", hint: "Şedde + med" },
  { glyph: "اَلرَّحِيم", name: "Er-Rahîm", hint: "Şedde + med" },
  { glyph: "اِيَّاكَ", name: "İyyâke", hint: "Med + şedde" },
  { glyph: "الْعَالَمِين", name: "El-Âlemîn", hint: "Med" },
  { glyph: "مَالِكِ", name: "Mâliki", hint: "Med" },
  { glyph: "الدِّين", name: "Ed-Dîn", hint: "Şedde + med" },
  { glyph: "الصِّرَاط", name: "Es-Sırât", hint: "Şemsî + med" },
  { glyph: "الْمُسْتَقِيم", name: "El-Müstakîm", hint: "Med" },
];
const OKUMA_BOLGE = {
  id: "bolgeOkuma", name: "Okuma Atölyesi 📚", color: "#34d399",
  duraklar: [
    { id: "ok1", title: "Kelime Oku", emoji: "📚", type: "lesson", cards: OKUMA_KELIMELER.slice(0, 4) },
    { id: "ok2", title: "Daha Çok Kelime", emoji: "📖", type: "lesson", cards: OKUMA_KELIMELER.slice(4, 8) },
    { id: "ok3", title: "Kelime Dinle", emoji: "👂", type: "listen", items: OKUMA_KELIMELER, pool: OKUMA_KELIMELER },
    { id: "ok4", title: "Kelime Eşleştir", emoji: "🧩", type: "match", pairs: OKUMA_KELIMELER },
    { id: "ok5", title: "Okuma Sınavı", emoji: "🏅", type: "quiz", quiz: makeLetterQuiz(OKUMA_KELIMELER, OKUMA_KELIMELER, 6, "Bu nasıl okunur?") },
  ],
};

/* ---------- Şimşek Yarışı (süre/puan yarışı) ---------- */
const SIMSEK_BOLGE = {
  id: "bolgeSimsek", name: "Şimşek Yarışı ⚡", color: "#f59e0b",
  duraklar: [
    { id: "sm1", title: "Harf Şimşeği", emoji: "⚡", type: "timed", havuz: HARFLER, sure: 45 },
    { id: "sm2", title: "Hece Şimşeği", emoji: "🌩️", type: "timed", havuz: HECE_HEPSI, sure: 45 },
    { id: "sm3", title: "Rakam Şimşeği", emoji: "🔢", type: "timed", havuz: RAKAMLAR, sure: 40 },
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
  out.push(SEKIL_BOLGE, ...HECE_BOLGELERI);
  out.push(MED_BOLGE, TENVIN_BOLGE, YILDIZ_BOLGE);
  out.push(LAMTARIF_BOLGE, KALKALE_BOLGE, MEDCESIT_BOLGE, NUNSAKIN_BOLGE, MIMSAKIN_BOLGE, VAKIF_BOLGE, INCELIK_BOLGE);
  out.push(OKUMA_BOLGE, KELIME_BOLGE, RAKAM_BOLGE, DUA_BOLGE, SIMSEK_BOLGE, SURE_BOLGE);
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
