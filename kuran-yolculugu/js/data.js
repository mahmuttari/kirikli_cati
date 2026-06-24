/*
 * Kur'an Yolculuğu - Müfredat Verisi
 * Çocuklar için Elif-Ba öğretimi.
 * Her "durak" (station) bir öğrenme etkinliği içerir.
 *
 * Durak tipleri (type):
 *   'lesson' -> öğrenme kartları + çoktan seçmeli mini test
 *   'match'  -> eşleştirme oyunu (harf <-> isim)
 *   'listen' -> dinle ve doğru harfi bul
 *   'memory' -> hafıza kartları (aynı çifti bul)
 *   'trace'  -> harf izi (parmakla/fareyle harfin üzerinden geç)
 *   'sure'   -> kısa sure okuma (kelime kelime)
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

// Harflerin başta/ortada/sonda aldığı şekiller
const HARF_SEKILLERI = [
  { name: "Be",  glyph: "ب", bas: "بـ", orta: "ـبـ", son: "ـب" },
  { name: "Sin", glyph: "س", bas: "سـ", orta: "ـسـ", son: "ـس" },
  { name: "Mim", glyph: "م", bas: "مـ", orta: "ـمـ", son: "ـم" },
  { name: "Ayn", glyph: "ع", bas: "عـ", orta: "ـعـ", son: "ـع" },
  { name: "He",  glyph: "ه", bas: "هـ", orta: "ـهـ", son: "ـه" },
  { name: "Kef", glyph: "ك", bas: "كـ", orta: "ـكـ", son: "ـك" },
];

// Arapça rakamlar
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

// Kısa sureler (kelime kelime okunuş)
const SURELER = {
  ihlas: {
    ad: "İhlâs Sûresi",
    bilgi: "Allah'ın bir ve tek olduğunu anlatır.",
    ayetler: [
      { glyph: "قُلْ هُوَ اللّٰهُ اَحَدٌ", okunus: "Kul hüvallâhü ehad", meal: "De ki: O Allah birdir." },
      { glyph: "اَللّٰهُ الصَّمَدُ", okunus: "Allâhü's-samed", meal: "Allah hiçbir şeye muhtaç değildir." },
      { glyph: "لَمْ يَلِدْ وَلَمْ يُولَدْ", okunus: "Lem yelid ve lem yûled", meal: "O doğurmamış ve doğmamıştır." },
      { glyph: "وَلَمْ يَكُنْ لَهُ كُفُوًا اَحَدٌ", okunus: "Ve lem yekün lehû küfüven ehad", meal: "Hiçbir şey O'na denk değildir." },
    ],
  },
  kevser: {
    ad: "Kevser Sûresi",
    bilgi: "Kur'an'ın en kısa suresidir.",
    ayetler: [
      { glyph: "اِنَّٓا اَعْطَيْنَاكَ الْكَوْثَرَ", okunus: "İnnâ a'taynâ ke'l-kevser", meal: "Biz sana Kevser'i verdik." },
      { glyph: "فَصَلِّ لِرَبِّكَ وَانْحَرْ", okunus: "Fe salli li rabbike venhar", meal: "Öyleyse Rabbin için namaz kıl ve kurban kes." },
      { glyph: "اِنَّ شَانِئَكَ هُوَ الْاَبْتَرُ", okunus: "İnne şânieke hüve'l-ebter", meal: "Asıl soyu kesik olan sana kin tutandır." },
    ],
  },
  nas: {
    ad: "Nâs Sûresi",
    bilgi: "Kötülüklerden Allah'a sığınmayı öğretir.",
    ayetler: [
      { glyph: "قُلْ اَعُوذُ بِرَبِّ النَّاسِ", okunus: "Kul eûzü bi rabbi'n-nâs", meal: "De ki: İnsanların Rabbine sığınırım." },
      { glyph: "مَلِكِ النَّاسِ", okunus: "Meliki'n-nâs", meal: "İnsanların hükümdarına." },
      { glyph: "اِلٰهِ النَّاسِ", okunus: "İlâhi'n-nâs", meal: "İnsanların ilâhına." },
    ],
  },
};

// Dualar
const DUALAR = [
  { glyph: "بِسْمِ اللّٰهِ", okunus: "Bismillah", anlam: "Allah'ın adıyla (başlarım)", emoji: "🌟" },
  { glyph: "اَلْحَمْدُ لِلّٰهِ", okunus: "Elhamdülillah", anlam: "Hamd (övgü) Allah'a aittir", emoji: "🤲" },
  { glyph: "اَللّٰهُ اَكْبَرُ", okunus: "Allâhü Ekber", anlam: "Allah en büyüktür", emoji: "✨" },
  { glyph: "سُبْحَانَ اللّٰهِ", okunus: "Sübhânallah", anlam: "Allah'ı tüm eksikliklerden tenzih ederim", emoji: "💫" },
];

// Esmaü'l-Hüsna (Allah'ın güzel isimlerinden bazıları)
const ESMA = [
  { glyph: "اَلرَّحْمٰنُ", okunus: "Er-Rahmân", anlam: "Çok merhamet eden", emoji: "💗" },
  { glyph: "اَلرَّحِيمُ", okunus: "Er-Rahîm", anlam: "Çok bağışlayan", emoji: "💝" },
  { glyph: "اَلْمَلِكُ", okunus: "El-Melik", anlam: "Her şeyin sahibi", emoji: "👑" },
  { glyph: "اَلْخَالِقُ", okunus: "El-Hâlik", anlam: "Yaratan", emoji: "🌍" },
  { glyph: "اَلرَّزَّاقُ", okunus: "Er-Razzâk", anlam: "Rızık veren", emoji: "🍎" },
];

/*
 * Bölgeler (harita üzerindeki ana bölümler) ve duraklar.
 */
const BOLGELER = [
  {
    id: "bolge1",
    name: "Harf Adası 🏝️",
    color: "#4ade80",
    duraklar: [
      { id: "d1", title: "İlk Harfler", emoji: "🌱", type: "lesson",
        cards: HARFLER.slice(0, 4), quiz: makeLetterQuiz(HARFLER.slice(0, 4), HARFLER) },
      { id: "d2", title: "Kanca Harfler", emoji: "🪝", type: "lesson",
        cards: HARFLER.slice(4, 9), quiz: makeLetterQuiz(HARFLER.slice(4, 9), HARFLER) },
      { id: "d2b", title: "Eşleştirme Oyunu", emoji: "🧩", type: "match",
        pairs: HARFLER.slice(0, 9) },
      { id: "d3", title: "Kuyruklu Harfler", emoji: "🐉", type: "lesson",
        cards: HARFLER.slice(9, 13), quiz: makeLetterQuiz(HARFLER.slice(9, 13), HARFLER) },
    ],
  },
  {
    id: "bolge2",
    name: "Çöl Vadisi 🏜️",
    color: "#fbbf24",
    duraklar: [
      { id: "d4", title: "Kalın Harfler", emoji: "🐪", type: "lesson",
        cards: HARFLER.slice(13, 19), quiz: makeLetterQuiz(HARFLER.slice(13, 19), HARFLER) },
      { id: "d5", title: "Son Harfler", emoji: "⭐", type: "lesson",
        cards: HARFLER.slice(19, 28), quiz: makeLetterQuiz(HARFLER.slice(19, 28), HARFLER) },
      { id: "d5b", title: "Dinle ve Bul", emoji: "👂", type: "listen",
        items: HARFLER.slice(13, 28) },
      { id: "d6", title: "Tüm Harfler Sınavı", emoji: "🏆", type: "lesson",
        cards: HARFLER, quiz: makeLetterQuiz(HARFLER, HARFLER, 8) },
    ],
  },
  {
    id: "bolgeSekil",
    name: "Şekil Atölyesi 🔤",
    color: "#fb923c",
    duraklar: [
      { id: "ds1", title: "Harf Şekilleri", emoji: "✏️", type: "lesson",
        cards: HARF_SEKILLERI.slice(0, 3).map(sekilKart), quiz: makeSekilQuiz(HARF_SEKILLERI.slice(0, 3)) },
      { id: "ds2", title: "Daha Çok Şekil", emoji: "🖌️", type: "lesson",
        cards: HARF_SEKILLERI.slice(3, 6).map(sekilKart), quiz: makeSekilQuiz(HARF_SEKILLERI.slice(3, 6)) },
      { id: "ds3", title: "Harf İzi (Çizme)", emoji: "🖊️", type: "trace",
        cards: HARFLER.slice(0, 6) },
    ],
  },
  {
    id: "bolge3",
    name: "Sihirli Orman 🌳",
    color: "#34d399",
    duraklar: [
      { id: "d7", title: "Üstün - Esre - Ötre", emoji: "✨", type: "lesson",
        cards: HAREKELER, quiz: [
          { q: "Harfin ÜSTÜNDE çizgi varsa hangi ses çıkar?", a: "e", options: ["e", "i", "u"] },
          { q: "Harfin ALTINDA çizgi varsa hangi ses çıkar?",  a: "i", options: ["e", "i", "u"] },
          { q: "Harfin üstünde küçük 'vav' varsa hangi ses çıkar?", a: "u", options: ["e", "i", "u"] },
          { q: "'بَ' nasıl okunur?", a: "Be", options: ["Bi", "Be", "Bu"] },
          { q: "'بِ' nasıl okunur?", a: "Bi", options: ["Bi", "Be", "Bu"] },
          { q: "'بُ' nasıl okunur?", a: "Bu", options: ["Bi", "Be", "Bu"] },
        ] },
      { id: "d8", title: "Heceler Köprüsü", emoji: "🌉", type: "lesson",
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
        ] },
      { id: "d8b", title: "Hafıza Oyunu", emoji: "🃏", type: "memory",
        pairs: HARFLER.slice(0, 6) },
    ],
  },
  {
    id: "bolgeRakam",
    name: "Rakamlar Diyarı 🔢",
    color: "#22d3ee",
    duraklar: [
      { id: "dr1", title: "Arapça Rakamlar 0-4", emoji: "🔢", type: "lesson",
        cards: RAKAMLAR.slice(0, 5), quiz: makeLetterQuiz(RAKAMLAR.slice(0, 5), RAKAMLAR) },
      { id: "dr2", title: "Arapça Rakamlar 5-9", emoji: "🧮", type: "lesson",
        cards: RAKAMLAR.slice(5, 10), quiz: makeLetterQuiz(RAKAMLAR.slice(5, 10), RAKAMLAR) },
      { id: "dr3", title: "Rakam Eşleştirme", emoji: "🎯", type: "match",
        pairs: RAKAMLAR },
    ],
  },
  {
    id: "bolge4",
    name: "Yıldız Şehri 🌟",
    color: "#a78bfa",
    duraklar: [
      { id: "d9", title: "Cezm (Durak İşareti)", emoji: "🛑", type: "lesson",
        cards: [
          { glyph: "بْ", name: "Cezm", hint: "Harfin üstünde küçük yuvarlak: ses durur (b)" },
          { glyph: "أَبْ", name: "Eb", hint: "E + b" },
          { glyph: "مِنْ", name: "Min", hint: "Mi + n" },
        ],
        quiz: [
          { q: "Cezm işareti ne yapar?", a: "Sesi durdurur", options: ["Sesi uzatır", "Sesi durdurur", "Sesi tekrarlar"] },
          { q: "'مِنْ' nasıl okunur?", a: "Min", options: ["Mine", "Min", "Mina"] },
          { q: "Cezmin şekli nedir?", a: "Küçük yuvarlak/baş", options: ["Çizgi", "Küçük yuvarlak/baş", "Nokta"] },
        ] },
      { id: "d10", title: "Şedde (İkileme)", emoji: "🔁", type: "lesson",
        cards: [
          { glyph: "بّ", name: "Şedde", hint: "Harf iki kere okunur (bb)" },
          { glyph: "رَبّ", name: "Rabb", hint: "Ra + bb" },
          { glyph: "جَنّ", name: "Cenn", hint: "Ce + nn" },
        ],
        quiz: [
          { q: "Şedde ne yapar?", a: "Harfi iki kere okutur", options: ["Harfi siler", "Harfi iki kere okutur", "Harfi uzatır"] },
          { q: "'رَبّ' nasıl okunur?", a: "Rabb", options: ["Rab", "Rabb", "Reb"] },
          { q: "Şedde harfin neresindedir?", a: "Üstünde", options: ["Altında", "Üstünde", "Yanında"] },
        ] },
      { id: "d11", title: "İlk Kelimeler", emoji: "📖", type: "lesson",
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
        ] },
    ],
  },
  {
    id: "bolgeDua",
    name: "Dua Bahçesi 🤲",
    color: "#f472b6",
    duraklar: [
      { id: "dd1", title: "Güzel Sözler", emoji: "🌸", type: "lesson",
        cards: DUALAR.map((d) => ({ glyph: d.glyph, name: d.okunus, hint: d.anlam })),
        quiz: [
          { q: "'Bismillah' ne demek?", a: "Allah'ın adıyla", options: ["Allah'ın adıyla", "Teşekkürler", "Günaydın"] },
          { q: "'Elhamdülillah' ne zaman söylenir?", a: "Şükrederken", options: ["Şükrederken", "Uyurken", "Koşarken"] },
          { q: "'Allâhü Ekber' ne demek?", a: "Allah en büyüktür", options: ["Allah en büyüktür", "Allah güzeldir", "Allah birdir"] },
        ] },
      { id: "dd2", title: "Esmaü'l-Hüsna", emoji: "💎", type: "lesson",
        cards: ESMA.map((e) => ({ glyph: e.glyph, name: e.okunus, hint: e.anlam })),
        quiz: [
          { q: "'Er-Rahmân' ne demek?", a: "Çok merhamet eden", options: ["Çok merhamet eden", "Yaratan", "Rızık veren"] },
          { q: "'El-Hâlik' ne demek?", a: "Yaratan", options: ["Yaratan", "Affeden", "Gören"] },
          { q: "'Er-Razzâk' ne demek?", a: "Rızık veren", options: ["Rızık veren", "Koruyan", "Bilen"] },
        ] },
    ],
  },
  {
    id: "bolgeSure",
    name: "Sure Sarayı 📖",
    color: "#818cf8",
    duraklar: [
      { id: "su1", title: "İhlâs Sûresi", emoji: "📜", type: "sure", sure: SURELER.ihlas },
      { id: "su2", title: "Kevser Sûresi", emoji: "📃", type: "sure", sure: SURELER.kevser },
      { id: "su3", title: "Nâs Sûresi", emoji: "📖", type: "sure", sure: SURELER.nas },
    ],
  },
];

// Harf şekli kartı üretir (lesson kartı formatında)
function sekilKart(s) {
  return {
    glyph: `${s.bas}  ${s.orta}  ${s.son}`,
    name: s.name,
    hint: `Başta: ${s.bas} • Ortada: ${s.orta} • Sonda: ${s.son}`,
  };
}

// Harf şekilleri için mini test
function makeSekilQuiz(grup) {
  return grup.map((s) => ({
    q: `Bu hangi harfin başta hâlidir?  ${s.bas}`,
    a: s.name,
    options: shuffleArr([s.name, ...shuffleArr(HARF_SEKILLERI.filter((x) => x.name !== s.name)).slice(0, 2).map((x) => x.name)]),
    glyph: s.bas,
  }));
}

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
