/*
 * Kur'an Yolculuğu - Uygulama Mantığı
 * Harita + farklı öğrenme biçimleri (ders, eşleştirme, dinle-bul, hafıza, harf izi, sure).
 */

const STORAGE_KEY = "kuranYolculugu_v1";

// ---- İlerleme (localStorage) ----
function ilerlemeYukle() {
  let p;
  try {
    p = JSON.parse(localStorage.getItem(STORAGE_KEY)) || { tamamlanan: {}, yildiz: {} };
  } catch {
    p = { tamamlanan: {}, yildiz: {} };
  }
  if (!p.tamamlanan) p.tamamlanan = {};
  if (!p.yildiz) p.yildiz = {};
  if (typeof p.kredi !== "number") p.kredi = 0; // retro oyun kredisi
  return p;
}
function ilerlemeKaydet(p) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}
let ILERLEME = ilerlemeYukle();

// Yanlış yapılan öğeyi kaydet (adaptif "Zayıf Harfler/Heceler" tekrarı için)
function hataEkle(name) {
  if (!name) return;
  if (!ILERLEME.hatalar) ILERLEME.hatalar = {};
  ILERLEME.hatalar[name] = (ILERLEME.hatalar[name] || 0) + 1;
  ilerlemeKaydet(ILERLEME);
}

const DURAKLAR = tumDuraklar();

// Bir durağın kilidi açık mı? (ilk durak hep açık, sonrakiler önceki tamamlanınca açılır)
// Retro (eğlence) duraklar ilerlemeyi KİLİTLEMEZ: kilit kontrolünde atlanırlar.
function durakAcikMi(index) {
  if (index === 0) return true;
  let j = index - 1;
  while (j >= 0 && DURAKLAR[j].eglence) j--; // retro duraklarını atla
  return j < 0 ? true : !!ILERLEME.tamamlanan[DURAKLAR[j].id];
}

// Tüm çekirdek müfredat (retro hariç) tamamlandı mı?
function herSeyBitti() {
  return DURAKLAR.every((d) => d.eglence || ILERLEME.tamamlanan[d.id]);
}

// ---- Ses sistemi ----
// Konuşma: uygulamada (Capacitor) cihazın NATIVE TTS motoru; tarayıcıda Web Speech API.
let _sesler = [];
function _seslerYukle() {
  try { _sesler = "speechSynthesis" in window ? speechSynthesis.getVoices() : []; } catch { _sesler = []; }
}
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  _seslerYukle();
  window.speechSynthesis.onvoiceschanged = _seslerYukle;
}

function seslendir(metin, dil) {
  sesKes(); // her yeni seste TÜM motorları sustur (üst üste binmesin)
  const lang = dil || "tr-TR";
  // 1) Native uygulama (Capacitor) -> cihazın kendi TTS motoru (WebView'de en güvenilir yol)
  const cap = window.Capacitor;
  if (cap && cap.Plugins && cap.Plugins.TextToSpeech) {
    try {
      cap.Plugins.TextToSpeech.speak({
        text: metin, lang, rate: 0.95, pitch: 1.05, volume: 1.0, category: "playback",
      }).catch(() => {});
      return;
    } catch {}
  }
  // 2) Tarayıcı -> Web Speech API
  if ("speechSynthesis" in window) {
    try {
      const u = new SpeechSynthesisUtterance(metin);
      const pre = lang.slice(0, 2).toLowerCase();
      const v = _sesler.find((x) => x.lang && x.lang.toLowerCase().startsWith(pre));
      if (v) u.voice = v;
      u.lang = lang; u.rate = 0.9; u.pitch = 1.05;
      speechSynthesis.speak(u);
    } catch {}
  }
}

// Tüm ses motorlarını (native TTS + Web Speech + tilavet kaydı) durdur
function sesKes() {
  try {
    const cap = window.Capacitor;
    if (cap && cap.Plugins && cap.Plugins.TextToSpeech) cap.Plugins.TextToSpeech.stop().catch(() => {});
  } catch {}
  try { if ("speechSynthesis" in window) speechSynthesis.cancel(); } catch {}
  if (typeof tilavetDurdur === "function") tilavetDurdur();
}

// Bir öğrenme öğesini seslendirir. Arapça mod açıksa ve içerik Arapça ise
// harfin/hecenin/kelimenin KENDİSİNİ Arapça TTS ile okur (Ce/Sad/Ra gibi
// İngilizce-Latin hatalarını önler); aksi halde Türkçe okunuşu söyler.
function arapcaAcik() { return ILERLEME.arapca !== false; } // varsayılan: açık
function idArapca(id) {
  // SINAVLA ATLA havuzu için çekirdek "okuma" bölgeleri (harf/hece/kelime)
  return !/bolgeRakam|bolgeDua|bolgeSure|bolgeVakif|bolgeMim|bolgeNun|bolgeMedC|bolgeIncelik|bolgeSekil|bolge_hcint/.test(id || "");
}
function durakArapcaMi(d) {
  // SESLENDİRME: ileri okuma örnekleri de Arapça okunsun.
  // Arapça okunMAyacaklar: sayılar, vakıf sembolleri, şekil birleşmeleri, hareke tanıtım, sure (tilavetle okunur).
  const id = (d && d.bolge && d.bolge.id) || "";
  return !/bolgeRakam|bolgeVakif|bolgeSekil|bolge_hcint|bolgeSure/.test(id);
}
function konus(item) {
  const arap = AKTIF_DURAK && durakArapcaMi(AKTIF_DURAK) && arapcaAcik() && item && item.glyph;
  if (arap) seslendir(item.glyph, "ar");
  else seslendir((item && (item.oku || item.name)) || "");
}
function konusOrnek() { if (arapcaAcik()) seslendir("جَ", "ar"); else seslendir("Cim"); }

// Ses efektleri: TEK paylaşılan AudioContext (her seferinde yeni açmak WebView limitine takılır).
let _ctx = null;
function _audio() {
  try {
    if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (_ctx.state === "suspended") _ctx.resume();
  } catch { _ctx = null; }
  return _ctx;
}
// İlk dokunuş/tıklamada ses kilidini aç (tarayıcı & WebView otomatik oynatma kuralı).
function _sesKilidiAc() { _audio(); }
document.addEventListener("touchstart", _sesKilidiAc, { once: true });
document.addEventListener("click", _sesKilidiAc, { once: true });

function tonCal(freqs, sure = 0.12) {
  const ctx = _audio();
  if (!ctx) return;
  try {
    let t = ctx.currentTime;
    freqs.forEach((f) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + sure);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + sure);
      t += sure;
    });
  } catch {}
}
const sesDogru = () => tonCal([523, 659, 784]);
const sesYanlis = () => tonCal([220, 180], 0.18);
const sesBasari = () => tonCal([523, 659, 784, 1046], 0.15);

// ---- Ekran yönetimi ----
const app = document.getElementById("app");

// ---- Harekeleri farklı renkte göster (kırmızı) ----
// Arapça birleşik harekeler (üstün/esre/ötre/cezm/şedde/tenvin/med işaretleri vb.)
const HAREKE_RE = /[ؐ-ًؚ-ٰٟۖ-ۜ۟-۪ۤۧۨ-ۭ]/;
function harekeBoyaKok(kok) {
  if (!kok || !kok.nodeType) return;
  const walker = document.createTreeWalker(kok, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      if (!n.nodeValue || !HAREKE_RE.test(n.nodeValue)) return NodeFilter.FILTER_REJECT;
      const p = n.parentNode;
      if (!p || (p.classList && p.classList.contains("hareke-renk"))) return NodeFilter.FILTER_REJECT;
      const tag = p.nodeName;
      if (tag === "SCRIPT" || tag === "STYLE" || tag === "TEXTAREA") return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const hedefler = [];
  let t; while ((t = walker.nextNode())) hedefler.push(t);
  hedefler.forEach((tn) => {
    const frag = document.createDocumentFragment();
    let buf = "";
    const flush = () => { if (buf) { frag.appendChild(document.createTextNode(buf)); buf = ""; } };
    for (const ch of tn.nodeValue) {
      if (HAREKE_RE.test(ch)) { flush(); const sp = document.createElement("span"); sp.className = "hareke-renk"; sp.textContent = ch; frag.appendChild(sp); }
      else buf += ch;
    }
    flush();
    tn.parentNode.replaceChild(frag, tn);
  });
}
let _hrkObs = null;
function harekeBoyaBaslat() {
  if (!("MutationObserver" in window)) return;
  _hrkObs = new MutationObserver((muts) => {
    _hrkObs.disconnect();
    for (const m of muts) for (const n of m.addedNodes) {
      if (n.nodeType === 1) harekeBoyaKok(n);
      else if (n.nodeType === 3 && HAREKE_RE.test(n.nodeValue || "")) harekeBoyaKok(n.parentNode);
    }
    _hrkObs.observe(app, { childList: true, subtree: true });
  });
  _hrkObs.observe(app, { childList: true, subtree: true });
  harekeBoyaKok(app);
}

function render() {
  zamanlayicilariTemizle();
  document.onkeydown = null; // retro oyunların klavye dinleyicisini temizle
  if (typeof tilavetDurdur === "function") tilavetDurdur();
  ILERLEME = ilerlemeYukle();
  app.innerHTML = "";
  app.appendChild(haritaEkrani());
  // Haritaya dönünce başa değil, BULUNULAN durağa kaydır
  const hedef = app.querySelector(".durak.guncel");
  if (hedef && hedef.scrollIntoView) {
    requestAnimationFrame(() => { try { hedef.scrollIntoView({ block: "center" }); } catch { hedef.scrollIntoView(); } });
  } else {
    window.scrollTo(0, 0);
  }
}

function toplamYildiz() {
  return Object.values(ILERLEME.yildiz).reduce((a, b) => a + b, 0);
}

// ---- Zamanlayıcı yönetimi (arcade oyunlarındaki interval/timeout'ları temizler) ----
let _zamanlayicilar = [];
function _ara(fn, ms) { const id = setInterval(fn, ms); _zamanlayicilar.push(id); return id; }
function _gec(fn, ms) { const id = setTimeout(fn, ms); _zamanlayicilar.push(id); return id; }
function zamanlayicilariTemizle() {
  _zamanlayicilar.forEach((id) => { clearInterval(id); clearTimeout(id); });
  _zamanlayicilar = [];
}

const RENKLER = ["#f87171", "#fbbf24", "#34d399", "#60a5fa", "#a78bfa", "#f472b6", "#fb923c", "#22d3ee"];
function rastgeleRenk() { return RENKLER[Math.floor(Math.random() * RENKLER.length)]; }
const HARITA_FIGURLER = ["🕌", "🌙", "⭐", "🕋", "📿", "🏮", "🌟", "✨", "📖", "🕯️", "🌷", "☪️", "🪔", "🧭"];

// Havuzdan taze rastgele örnek (her açılışta farklı içerik)
function ornekle(havuz, adet) {
  return shuffleArr(havuz).slice(0, Math.min(adet || 5, havuz.length));
}
// Durakta 'havuz' varsa, her açılışta içeriği yeniden RASTGELE seç
function durakHazirla(d) {
  if (!d || !d.havuz || d.type === "timed") return d;
  const ornek = ornekle(d.havuz, d.adet);
  d.cards = ornek; d.letters = ornek; d.items = ornek; d.pairs = ornek; d.kelimeler = ornek;
  if (d.type === "quiz") d.quiz = makeLetterQuiz(ornek, d.havuz, ornek.length, d.soru || "Bu nedir?");
  return d;
}

// Durak tipine göre doğru ekranı açan dağıtıcı
let AKTIF_DURAK = null;
function durakAc(durak, index) {
  zamanlayicilariTemizle();
  if (durak.type !== "retro") document.onkeydown = null;
  durakHazirla(durak);
  AKTIF_DURAK = durak;
  tonCal([440]);
  switch (durak.type) {
    case "match":     return oyunMatch(durak, index);
    case "listen":    return oyunListen(durak, index);
    case "memory":    return oyunMemory(durak, index);
    case "trace":     return oyunTrace(durak, index);
    case "balloon":   return oyunBalon(durak, index);
    case "mole":      return oyunKostebek(durak, index);
    case "truefalse": return oyunDogruYanlis(durak, index);
    case "riddle":    return oyunBilmece(durak, index);
    case "fill":      return oyunBosluk(durak, index);
    case "kelime":    return oyunKelime(durak, index);
    case "avla":      return oyunAvla(durak, index);
    case "catch":     return oyunYakala(durak, index);
    case "dizi":      return oyunDizi(durak, index);
    case "weak":      return oyunZayif(durak, index);
    case "ayni":      return oyunAyni(durak, index);
    case "echo":      return oyunYanki(durak, index);
    case "collect":   return oyunTopla(durak, index);
    case "kayip":     return oyunKayip(durak, index);
    case "timed":     return oyunSimsek(durak, index);
    case "yaris":     return oyunYaris(durak, index);
    case "random":    return oyunRandom(durak, index);
    case "quiz":      return testeGir(durak, index);
    case "sure":      return sureEkrani(durak, index);
    case "retro":     return oyunRetro(durak, index);
    default:          return derseGir(durak, index);
  }
}

// 🎁 SÜRPRİZ: tek dokunuşta rastgele EĞLENCELİ bir oyun gelir (içerik de rastgele)
const SURPRIZ_OYUNLAR_VAR = {
  yaris: oyunYaris, catch: oyunYakala, balloon: oyunBalon, mole: oyunKostebek,
  avla: oyunAvla, truefalse: oyunDogruYanlis, memory: oyunMemory, listen: oyunListen,
  match: oyunMatch, riddle: oyunBilmece,
  ayni: oyunAyni, echo: oyunYanki, collect: oyunTopla, kayip: oyunKayip,
};
function oyunRandom(durak, index) {
  const liste = (durak.oyunlar && durak.oyunlar.length ? durak.oyunlar : Object.keys(SURPRIZ_OYUNLAR_VAR))
    .filter((t) => SURPRIZ_OYUNLAR_VAR[t]);
  const tip = liste[Math.floor(Math.random() * liste.length)] || "balloon";
  if (!durak.pool) durak.pool = durak.havuz || durak.letters || durak.pairs;
  return SURPRIZ_OYUNLAR_VAR[tip](durak, index);
}

// Durak tipine göre küçük etiket
function tipEtiketi(type) {
  return {
    lesson: "📖 Öğren", quiz: "🏅 Sınav", match: "🧩 Eşleştir", listen: "👂 Dinle-Bul",
    memory: "🧠 Hafıza", trace: "🖊️ Çizme", balloon: "🎈 Balon", mole: "🐹 Köstebek",
    truefalse: "⚡ Doğru mu?", riddle: "💭 Bilmece", fill: "📝 Boşluk", kelime: "🏙️ Kelime",
    avla: "🔎 Harf Avı", catch: "🪂 Yakala", dizi: "🚂 Tren", weak: "🔁 Tekrar",
    random: "🎁 Sürpriz", yaris: "🏁 Yarış", timed: "⚡ Yarış", sure: "📖 Sure",
    ayni: "🔀 Aynı mı?", echo: "🎧 Ses Yankısı", collect: "🧭 Harf Topla", kayip: "🫥 Kayıp Harf",
    retro: "🎮 Oyun Molası",
  }[type] || "📚 Ders";
}

// ---- HARİTA EKRANI ----
function haritaEkrani() {
  const wrap = document.createElement("div");
  wrap.className = "harita-wrap";

  const bar = document.createElement("div");
  bar.className = "topbar";
  bar.innerHTML = `
    <button class="profil-btn">👤 ${ILERLEME.isim ? ILERLEME.isim : "Profil"}</button>
    <div class="logo">🕌 Kur'an Yolculuğu</div>
    <div class="sayaclar">
      <div class="kredi-sayac" title="Oyun kredisi">🎮 <span>${ILERLEME.kredi || 0}</span></div>
      <div class="yildiz-sayac">⭐ <span>${toplamYildiz()}</span></div>
    </div>
  `;
  bar.querySelector(".profil-btn").addEventListener("click", profilEkrani);
  wrap.appendChild(bar);

  const intro = document.createElement("p");
  intro.className = "intro";
  intro.textContent = "Haritada ilerle, harfleri öğren, oyunlar oyna, yıldızları topla! 🎉";
  wrap.appendChild(intro);

  const yol = document.createElement("div");
  yol.className = "yol";

  // "Bulunulan durak": açık ama tamamlanmamış ilk durak (yoksa son açık durak)
  let guncelIndex = DURAKLAR.findIndex((d, i) => durakAcikMi(i) && !ILERLEME.tamamlanan[d.id]);
  if (guncelIndex < 0) { for (let i = DURAKLAR.length - 1; i >= 0; i--) { if (durakAcikMi(i)) { guncelIndex = i; break; } } }

  let sonBolgeId = null;
  DURAKLAR.forEach((durak, i) => {
    if (durak.bolge.id !== sonBolgeId) {
      const bb = document.createElement("div");
      bb.className = "bolge-baslik";
      bb.style.background = durak.bolge.color;
      bb.innerHTML = `<span>${durak.bolge.name}</span>`;
      if (i > 0 && !durakAcikMi(i)) {
        const atla = document.createElement("button");
        atla.className = "atla-btn";
        atla.textContent = "⏭️ Sınavla Atla";
        const bolge = durak.bolge, baslangic = i;
        atla.addEventListener("click", (e) => { e.stopPropagation(); atlamaSinavi(baslangic, bolge); });
        bb.appendChild(atla);
      }
      yol.appendChild(bb);
      sonBolgeId = durak.bolge.id;
    }

    const acik = durakAcikMi(i);
    const tamam = !!ILERLEME.tamamlanan[durak.id];
    const yildiz = ILERLEME.yildiz[durak.id] || 0;

    // sağa-sola kıvrılan (dolanan) yol
    const off = Math.round(74 * Math.sin(i * 0.8) + ((i % 3) - 1) * 22);

    const node = document.createElement("button");
    node.className = "durak " + (tamam ? "tamam" : acik ? "acik" : "kilitli");
    if (i === guncelIndex) node.classList.add("guncel");
    node.style.transform = `translateX(${off}px)`;
    node.disabled = !acik;
    node.innerHTML = `
      ${i === guncelIndex ? `<span class="guncel-rozet">📍 Buradasın</span>` : ""}
      <span class="durak-tip">${tipEtiketi(durak.type)}</span>
      <span class="durak-emoji">${acik ? durak.emoji : "🔒"}</span>
      <span class="durak-isim">${durak.title}</span>
      <span class="durak-yildiz">${"⭐".repeat(yildiz)}${"☆".repeat(3 - yildiz)}</span>
    `;
    node.addEventListener("click", () => { if (acik) durakAc(durak, i); });
    yol.appendChild(node);

    // araya İslami figürler serpiştir (kaotik, neşeli his)
    if (i % 3 === 1) {
      const fig = document.createElement("div");
      fig.className = "harita-figur";
      fig.textContent = HARITA_FIGURLER[Math.floor(i / 3) % HARITA_FIGURLER.length];
      fig.style.transform = `translateX(${-off * 1.3}px)`;
      yol.appendChild(fig);
    }
  });

  wrap.appendChild(yol);

  const reset = document.createElement("button");
  reset.className = "reset-btn";
  reset.textContent = "İlerlemeyi Sıfırla";
  reset.addEventListener("click", () => {
    if (confirm("Tüm ilerlemen silinsin mi?")) {
      localStorage.removeItem(STORAGE_KEY);
      render();
    }
  });
  wrap.appendChild(reset);

  return wrap;
}

// Ortak üst başlık (geri butonu + başlık)
function ustBaslik(durak, geriFn) {
  const ust = document.createElement("div");
  ust.className = "ders-ust";
  ust.innerHTML = `<button class="geri">← Harita</button><h2>${durak.emoji} ${durak.title}</h2>`;
  ust.querySelector(".geri").addEventListener("click", geriFn || render);
  return ust;
}

// Bir durağı tamamlandı olarak işaretle + sonuç ekranı göster
let SON_KREDI_KAZANDI = false;
function tamamla(durak, index, yildiz, dogru, toplam, mesaj) {
  zamanlayicilariTemizle();
  SON_KREDI_KAZANDI = false;
  if (yildiz >= 1) {
    ILERLEME.tamamlanan[durak.id] = true;
    ILERLEME.yildiz[durak.id] = Math.max(ILERLEME.yildiz[durak.id] || 0, yildiz);
    // Kredi: her alıştırmayı İLK oynayışta 1 kredi; sonraki her 5 oynayışta 1 kredi.
    if (!ILERLEME.oynanan) ILERLEME.oynanan = {};
    const sayi = (ILERLEME.oynanan[durak.id] || 0) + 1;
    ILERLEME.oynanan[durak.id] = sayi;
    if ((sayi - 1) % 5 === 0) { ILERLEME.kredi = (ILERLEME.kredi || 0) + 1; SON_KREDI_KAZANDI = true; } // 1, 6, 11, 16...
    ilerlemeKaydet(ILERLEME);
    sesBasari();
  } else {
    sesYanlis();
  }
  sonucGoster(durak, index, yildiz, dogru, toplam, mesaj);
}

function sonucGoster(durak, index, yildiz, dogru, toplam, mesaj) {
  const gecti = yildiz >= 1;
  const sonrakiVar = index < DURAKLAR.length - 1;
  app.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "test-wrap";
  wrap.innerHTML = `
    <div class="sonuc ${gecti ? "basarili" : "tekrar"}">
      <div class="sonuc-emoji">${gecti ? "🏆" : "💪"}</div>
      <h2>${gecti ? "Tebrikler!" : "Az Kaldı!"}</h2>
      <div class="sonuc-yildiz">${"⭐".repeat(yildiz)}${"☆".repeat(3 - yildiz)}</div>
      <p>${mesaj || (toplam ? `${dogru} / ${toplam} doğru` : "")}</p>
      ${gecti && SON_KREDI_KAZANDI ? `<p class="kredi-kazanc">🎮 +1 oyun kredisi kazandın!</p>` : ""}
      <div class="sonuc-butonlar">
        <button class="tekrar-btn">🔁 Tekrar Dene</button>
        ${gecti && sonrakiVar ? `<button class="sonraki-btn">Sonraki Durak ▶</button>` : ""}
        <button class="harita-btn">🗺️ Haritaya Dön</button>
      </div>
    </div>`;
  app.appendChild(wrap);
  if (gecti) konfetiPatlat();
  wrap.querySelector(".tekrar-btn").addEventListener("click", () => durakAc(durak, index));
  wrap.querySelector(".harita-btn").addEventListener("click", render);
  const sb = wrap.querySelector(".sonraki-btn");
  if (sb) sb.addEventListener("click", () => durakAc(DURAKLAR[index + 1], index + 1));
  window.scrollTo(0, 0);
}

// ---- DERS EKRANI (kartlar + test) ----
function derseGir(durak, index) {
  let kartNo = 0;
  const kartlar = shuffleArr(durak.cards); // her açılışta kartlar karışık sırada
  app.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "ders-wrap";
  wrap.appendChild(ustBaslik(durak));

  const kartAlan = document.createElement("div");
  kartAlan.className = "kart-alan";
  wrap.appendChild(kartAlan);

  const altBar = document.createElement("div");
  altBar.className = "kart-nav";
  altBar.innerHTML = `
    <button class="onceki">◀ Geri</button>
    <span class="kart-sayac"></span>
    <button class="sonraki">İleri ▶</button>`;
  wrap.appendChild(altBar);

  function kartCiz() {
    const k = kartlar[kartNo];
    // İleri Arapça okuma bölgelerinde, kural/Türkçe adı için ikinci buton göster
    const ikiDil = durakArapcaMi(durak) && arapcaAcik() && k.name && k.name !== k.glyph;
    kartAlan.innerHTML = `
      <div class="flashcard">
        <div class="harf-buyuk">${k.glyph}</div>
        <div class="harf-ad">${k.name}</div>
        <div class="harf-ipucu">${k.hint || ""}</div>
        <div class="dinle-grup">
          <button class="dinle">🔊 ${ikiDil ? "Arapça oku" : "Dinle"}</button>
          ${ikiDil ? `<button class="dinle-tr">🔤 ${k.name}</button>` : ""}
        </div>
      </div>`;
    kartAlan.querySelector(".dinle").addEventListener("click", () => konus(k));
    const trBtn = kartAlan.querySelector(".dinle-tr");
    if (trBtn) trBtn.addEventListener("click", () => seslendir(k.name));
    konus(k);
    altBar.querySelector(".kart-sayac").textContent = `${kartNo + 1} / ${kartlar.length}`;
    altBar.querySelector(".onceki").disabled = kartNo === 0;
    altBar.querySelector(".sonraki").textContent =
      kartNo === kartlar.length - 1
        ? (durak.quiz ? "Teste Geç ✏️" : "Bitir 🏁")
        : "İleri ▶";
  }

  altBar.querySelector(".onceki").addEventListener("click", () => { if (kartNo > 0) { kartNo--; kartCiz(); } });
  altBar.querySelector(".sonraki").addEventListener("click", () => {
    if (kartNo < kartlar.length - 1) { kartNo++; kartCiz(); }
    else if (durak.quiz) testeGir(durak, index);
    else tamamla(durak, index, 3, 0, 0, "Bütün kartları öğrendin! 🎉");
  });

  app.appendChild(wrap);
  kartCiz();
  window.scrollTo(0, 0);
}

// ---- TEST EKRANI ----
function testeGir(durak, index) {
  const sorular = shuffleArr(durak.quiz);
  let soruNo = 0, dogru = 0;
  app.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "test-wrap";
  app.appendChild(wrap);

  function soruCiz() {
    const s = sorular[soruNo];
    wrap.innerHTML = `
      <div class="test-ust">
        <button class="geri">← Çık</button>
        <div class="ilerleme-cubuk"><div style="width:${(soruNo / sorular.length) * 100}%"></div></div>
        <span>${soruNo + 1}/${sorular.length}</span>
      </div>
      <div class="soru">${s.glyph ? `<div class="soru-harf">${s.glyph}</div>` : ""}<p>${s.q.replace(s.glyph || "@@@", "")}</p></div>
      <div class="secenekler"></div>
      <div class="geri-bildirim"></div>`;
    wrap.querySelector(".geri").addEventListener("click", render);
    const sec = wrap.querySelector(".secenekler");
    shuffleArr(s.options).forEach((opt) => {
      const b = document.createElement("button");
      b.className = "secenek";
      b.textContent = opt;
      b.addEventListener("click", () => cevapVer(b, opt, s));
      sec.appendChild(b);
    });
  }

  function cevapVer(btn, opt, s) {
    wrap.querySelectorAll(".secenek").forEach((b) => (b.disabled = true));
    const gb = wrap.querySelector(".geri-bildirim");
    if (opt === s.a) {
      btn.classList.add("dogru"); dogru++; sesDogru();
      gb.innerHTML = `<span class="iyi">Aferin! 🎉</span>`;
    } else {
      btn.classList.add("yanlis"); sesYanlis(); hataEkle(s.a);
      wrap.querySelectorAll(".secenek").forEach((b) => { if (b.textContent === s.a) b.classList.add("dogru"); });
      gb.innerHTML = `<span class="kotu">Doğrusu: <b>${s.a}</b></span>`;
    }
    const ileri = document.createElement("button");
    ileri.className = "devam";
    ileri.textContent = soruNo === sorular.length - 1 ? "Bitir 🏁" : "Devam ▶";
    ileri.addEventListener("click", () => {
      soruNo++;
      if (soruNo < sorular.length) soruCiz();
      else {
        const oran = dogru / sorular.length;
        const yildiz = oran >= 0.99 ? 3 : oran >= 0.7 ? 2 : oran >= 0.5 ? 1 : 0;
        tamamla(durak, index, yildiz, dogru, sorular.length);
      }
    });
    gb.appendChild(ileri);
  }
  soruCiz();
  window.scrollTo(0, 0);
}

// ---- EŞLEŞTİRME OYUNU (harf <-> isim) ----
function oyunMatch(durak, index) {
  const secilenler = shuffleArr(durak.pairs).slice(0, 5);
  let seciliHarf = null, eslesen = 0;
  app.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "ders-wrap";
  wrap.appendChild(ustBaslik(durak));
  const aciklama = document.createElement("p");
  aciklama.className = "oyun-aciklama";
  aciklama.textContent = "Harfi, doğru ismiyle eşleştir! Önce harfe, sonra ismine dokun.";
  wrap.appendChild(aciklama);

  const tahta = document.createElement("div");
  tahta.className = "match-tahta";
  const solSutun = document.createElement("div"); solSutun.className = "match-sutun";
  const sagSutun = document.createElement("div"); sagSutun.className = "match-sutun";
  tahta.appendChild(solSutun); tahta.appendChild(sagSutun);
  wrap.appendChild(tahta);
  app.appendChild(wrap);

  shuffleArr(secilenler).forEach((p) => {
    const b = document.createElement("button");
    b.className = "match-hucre harf"; b.textContent = p.glyph; b.dataset.name = p.name;
    b.addEventListener("click", () => harfSec(b, p));
    solSutun.appendChild(b);
  });
  shuffleArr(secilenler).forEach((p) => {
    const b = document.createElement("button");
    b.className = "match-hucre isim"; b.textContent = p.name; b.dataset.name = p.name;
    b.addEventListener("click", () => isimSec(b, p));
    sagSutun.appendChild(b);
  });

  function harfSec(btn, p) {
    if (btn.classList.contains("eslesti")) return;
    solSutun.querySelectorAll(".match-hucre").forEach((x) => x.classList.remove("secili"));
    btn.classList.add("secili");
    seciliHarf = { btn, p };
    // alıştırma: cevabı seslendirme, çocuk kendi bilsin
  }
  function isimSec(btn, p) {
    if (!seciliHarf || btn.classList.contains("eslesti")) return;
    if (seciliHarf.p.name === p.name) {
      seciliHarf.btn.classList.add("eslesti"); btn.classList.add("eslesti");
      seciliHarf.btn.classList.remove("secili");
      sesDogru(); eslesen++;
      seciliHarf = null;
      if (eslesen === secilenler.length)
        setTimeout(() => tamamla(durak, index, 3, eslesen, secilenler.length, "Hepsini eşleştirdin! 🧩"), 500);
    } else {
      sesYanlis();
      btn.classList.add("yanlis-titre");
      setTimeout(() => btn.classList.remove("yanlis-titre"), 400);
    }
  }
  window.scrollTo(0, 0);
}

// ---- DİNLE VE BUL OYUNU ----
function oyunListen(durak, index) {
  const tur = shuffleArr(durak.items).slice(0, 6);
  let turNo = 0, dogru = 0;
  app.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "ders-wrap";
  wrap.appendChild(ustBaslik(durak));
  app.appendChild(wrap);
  const alan = document.createElement("div");
  wrap.appendChild(alan);

  function turCiz() {
    const hedef = tur[turNo];
    const yanlislar = shuffleArr(durak.items.filter((x) => x.name !== hedef.name)).slice(0, 3);
    const secenekler = shuffleArr([hedef, ...yanlislar]);
    alan.innerHTML = `
      <p class="oyun-aciklama">Sesi dinle ve doğru harfi bul!</p>
      <button class="buyuk-dinle">🔊 Tekrar Dinle</button>
      <div class="listen-grid"></div>
      <div class="geri-bildirim"></div>`;
    alan.querySelector(".buyuk-dinle").addEventListener("click", () => konus(hedef));
    konus(hedef);
    const grid = alan.querySelector(".listen-grid");
    secenekler.forEach((opt) => {
      const b = document.createElement("button");
      b.className = "listen-hucre"; b.textContent = opt.glyph;
      b.addEventListener("click", () => sec(b, opt, hedef));
      grid.appendChild(b);
    });
  }
  function sec(btn, opt, hedef) {
    alan.querySelectorAll(".listen-hucre").forEach((b) => (b.disabled = true));
    const gb = alan.querySelector(".geri-bildirim");
    if (opt.name === hedef.name) {
      btn.classList.add("dogru"); dogru++; sesDogru();
      gb.innerHTML = `<span class="iyi">Doğru: ${hedef.glyph} = ${hedef.name} 🎉</span>`;
    } else {
      btn.classList.add("yanlis"); sesYanlis(); hataEkle(hedef.name);
      alan.querySelectorAll(".listen-hucre").forEach((b) => { if (b.textContent === hedef.glyph) b.classList.add("dogru"); });
      gb.innerHTML = `<span class="kotu">Doğrusu: ${hedef.glyph} = <b>${hedef.name}</b></span>`;
    }
    const ileri = document.createElement("button");
    ileri.className = "devam";
    ileri.textContent = turNo === tur.length - 1 ? "Bitir 🏁" : "Devam ▶";
    ileri.addEventListener("click", () => {
      turNo++;
      if (turNo < tur.length) turCiz();
      else {
        const oran = dogru / tur.length;
        tamamla(durak, index, oran >= 0.99 ? 3 : oran >= 0.7 ? 2 : oran >= 0.5 ? 1 : 0, dogru, tur.length);
      }
    });
    gb.appendChild(ileri);
  }
  turCiz();
  window.scrollTo(0, 0);
}

// ---- HAFIZA OYUNU (eş kartları bul) ----
function oyunMemory(durak, index) {
  const secilen = shuffleArr(durak.pairs).slice(0, 6);
  // her çift için iki kart: biri harf, biri isim, aynı 'key'
  const kartlar = shuffleArr(
    secilen.flatMap((p) => [
      { key: p.name, yuz: p.glyph, tip: "harf" },
      { key: p.name, yuz: p.name, tip: "isim" },
    ])
  );
  let acik = [], eslesen = 0, kilit = false;
  app.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "ders-wrap";
  wrap.appendChild(ustBaslik(durak));
  const aciklama = document.createElement("p");
  aciklama.className = "oyun-aciklama";
  aciklama.textContent = "Kartları çevir, harfi ismiyle eşleştir! 🧠";
  wrap.appendChild(aciklama);
  const grid = document.createElement("div");
  grid.className = "memory-grid";
  wrap.appendChild(grid);
  app.appendChild(wrap);

  kartlar.forEach((k) => {
    const c = document.createElement("button");
    c.className = "memory-kart";
    c.innerHTML = `<span class="memory-on">?</span><span class="memory-arka">${k.yuz}</span>`;
    c.addEventListener("click", () => cevir(c, k));
    grid.appendChild(c);
  });

  function cevir(el, k) {
    if (kilit || el.classList.contains("acik") || el.classList.contains("eslesti")) return;
    el.classList.add("acik");
    if (k.tip === "isim") seslendir(k.yuz);
    acik.push({ el, k });
    if (acik.length === 2) {
      kilit = true;
      if (acik[0].k.key === acik[1].k.key) {
        sesDogru();
        acik.forEach((a) => a.el.classList.add("eslesti"));
        eslesen++;
        acik = []; kilit = false;
        if (eslesen === secilen.length)
          setTimeout(() => tamamla(durak, index, 3, eslesen, secilen.length, "Tüm çiftleri buldun! 🧠"), 500);
      } else {
        sesYanlis();
        setTimeout(() => {
          acik.forEach((a) => a.el.classList.remove("acik"));
          acik = []; kilit = false;
        }, 800);
      }
    }
  }
  window.scrollTo(0, 0);
}

// ---- HARF İZİ (parmakla/fareyle çizme + GERÇEK doğrulama) ----
function oyunTrace(durak, index) {
  const BOY = 300;
  let kartNo = 0;
  const kapsamalar = [];

  app.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "ders-wrap";
  wrap.appendChild(ustBaslik(durak));
  const aciklama = document.createElement("p");
  aciklama.className = "oyun-aciklama";
  aciklama.textContent = "Soluk harfin üzerinden geçerek çiz, sonra ✓ Kontrol Et! ✏️";
  wrap.appendChild(aciklama);
  const alan = document.createElement("div");
  wrap.appendChild(alan);
  app.appendChild(wrap);

  // Harfi kılavuz/maske olarak çizer
  function harfCiz(c, glyph, renk) {
    c.clearRect(0, 0, BOY, BOY);
    c.fillStyle = renk;
    c.textAlign = "center"; c.textBaseline = "middle";
    c.font = '200px "Amiri", serif';
    c.fillText(glyph, BOY / 2, BOY / 2 + 6);
  }

  function ciz() {
    const k = durak.cards[kartNo];
    alan.innerHTML = `
      <div class="trace-kutu">
        <canvas class="trace-guide" width="${BOY}" height="${BOY}"></canvas>
        <canvas class="trace-canvas" width="${BOY}" height="${BOY}"></canvas>
      </div>
      <div class="trace-ad">${k.name} <button class="dinle-mini">🔊</button></div>
      <div class="geri-bildirim trace-geri"></div>
      <div class="kart-nav">
        <button class="temizle">🧽 Temizle</button>
        <span class="kart-sayac">${kartNo + 1} / ${durak.cards.length}</span>
        <button class="kontrol">✓ Kontrol Et</button>
      </div>`;
    alan.querySelector(".dinle-mini").addEventListener("click", () => konus(k));
    konus(k);

    // kılavuz harf (soluk) + maske
    const guide = alan.querySelector(".trace-guide");
    const gctx = guide.getContext("2d");
    harfCiz(gctx, k.glyph, "#dbe4ee");
    const gd = gctx.getImageData(0, 0, BOY, BOY).data;
    const maske = new Uint8Array(BOY * BOY);
    let harfPiksel = 0;
    for (let p = 0; p < BOY * BOY; p++) { if (gd[p * 4 + 3] > 40) { maske[p] = 1; harfPiksel++; } }

    // çizim katmanı
    const canvas = alan.querySelector(".trace-canvas");
    const ctx = canvas.getContext("2d");
    ctx.lineWidth = 16; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#38bdf8";
    let ciziyor = false, cizildi = false;
    const nokta = (e) => {
      const r = canvas.getBoundingClientRect();
      const t = e.touches ? e.touches[0] : e;
      return { x: (t.clientX - r.left) * (BOY / r.width), y: (t.clientY - r.top) * (BOY / r.height) };
    };
    const basla = (e) => { e.preventDefault(); ciziyor = true; cizildi = true; const p = nokta(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
    const devam = (e) => { if (!ciziyor) return; e.preventDefault(); const p = nokta(e); ctx.lineTo(p.x, p.y); ctx.stroke(); };
    const dur = () => { ciziyor = false; };
    canvas.addEventListener("mousedown", basla); canvas.addEventListener("mousemove", devam);
    window.addEventListener("mouseup", dur);
    canvas.addEventListener("touchstart", basla, { passive: false });
    canvas.addEventListener("touchmove", devam, { passive: false });
    canvas.addEventListener("touchend", dur);

    const gb = alan.querySelector(".trace-geri");
    alan.querySelector(".temizle").addEventListener("click", () => { ctx.clearRect(0, 0, BOY, BOY); cizildi = false; gb.innerHTML = ""; });

    alan.querySelector(".kontrol").addEventListener("click", () => {
      // çizimi maske ile karşılaştır
      const ud = ctx.getImageData(0, 0, BOY, BOY).data;
      let cizim = 0, ortak = 0;
      for (let p = 0; p < BOY * BOY; p++) {
        const a = ud[p * 4 + 3] > 40;
        if (a) { cizim++; if (maske[p]) ortak++; }
      }
      const kapsama = harfPiksel ? ortak / harfPiksel : 0;  // harfin ne kadarı çizildi
      const isabet = cizim ? ortak / cizim : 0;             // çiziminin ne kadarı harf üstünde

      if (!cizildi || cizim < 700) {
        sesYanlis(); gb.innerHTML = `<span class="kotu">Biraz daha çiz ✏️</span>`; return;
      }
      if (isabet < 0.45 || kapsama < 0.3) {
        sesYanlis();
        gb.innerHTML = `<span class="kotu">Harfin üzerinden geçmeye çalış 🎯 (tekrar dene)</span>`;
        return;
      }
      // başarılı
      sesDogru();
      kapsamalar.push(kapsama);
      gb.innerHTML = `<span class="iyi">Harika çizdin! ✨</span>`;
      const ileri = document.createElement("button");
      ileri.className = "devam";
      ileri.textContent = kartNo === durak.cards.length - 1 ? "Bitir 🏁" : "Sonraki ▶";
      ileri.addEventListener("click", () => {
        if (kartNo < durak.cards.length - 1) { kartNo++; ciz(); }
        else {
          const ort = kapsamalar.reduce((a, b) => a + b, 0) / kapsamalar.length;
          tamamla(durak, index, ort >= 0.55 ? 3 : ort >= 0.4 ? 2 : 1, 0, 0, "Tüm harfleri çizdin! ✏️🎉");
        }
      });
      gb.appendChild(ileri);
    });
  }
  ciz();
  window.scrollTo(0, 0);
}

// ---- SURE OKUMA EKRANI (kelime kelime) ----
// Gerçek tilavet (cihaz interneti) — yoksa Türkçe okunuş (TTS) yedeği
let _tilavetSes = null;
let _tilavetTur = 0; // her çağrı bir "nesil"; eski geri çağrılar geçersiz olur
const TILAVET_KARI = "Husary_128kbps"; // Mahmud Halil el-Husary (everyayah.com)
function tilavetDurdur() {
  _tilavetTur++; // devam eden tüm dene()/error geri çağrılarını geçersiz kıl
  if (_tilavetSes) {
    try {
      _tilavetSes.onerror = null;            // ÖNCE dinleyiciyi kaldır (yoksa boşaltma 'error' tetikler)
      _tilavetSes.pause();
      _tilavetSes.removeAttribute("src");
      _tilavetSes.load();                    // temiz durdur (src="" yapıp error tetiklemeden)
    } catch {}
    _tilavetSes = null;
  }
}
function tilavetCal(sureNo, ayetNo, okunusYedek) {
  sesKes(); // önce her şeyi sustur (TTS + eski tilavet); sesKes -> tilavetDurdur -> _tilavetTur++
  if (!sureNo) { seslendir(okunusYedek); return; }
  const benimTur = _tilavetTur; // bu çağrının nesli
  const ss = String(sureNo).padStart(3, "0");
  const aa = String(ayetNo).padStart(3, "0");
  // 1) APK'ya gömülü yerel ses  2) internetten akış  3) TTS okunuş
  const kaynaklar = [
    `audio/sure/${ss}${aa}.mp3`,
    `https://everyayah.com/data/${TILAVET_KARI}/${ss}${aa}.mp3`,
  ];
  let i = 0;
  function dene() {
    if (benimTur !== _tilavetTur) return;     // başka âyet/ses devraldı -> bu nesli bırak
    if (i >= kaynaklar.length) { seslendir(okunusYedek); return; }
    const ses = new Audio(kaynaklar[i++]);
    _tilavetSes = ses;
    ses.onerror = () => { if (benimTur === _tilavetTur) dene(); }; // sadece güncel nesilde sonrakini dene
    const p = ses.play();
    if (p && p.catch) p.catch(() => {});      // otomatik oynatma engeli -> sessizce geç (buton çalışır)
  }
  dene();
}

// Her sure okumadan önce çekilen Besmele (Fâtiha hariç; onun 1. âyeti zaten Besmele'dir).
const BESMELE = {
  glyph: "بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحٖيمِ",
  okunus: "Bismillâhi'r-rahmâni'r-rahîm",
  meal: "Rahmân ve Rahîm olan Allah'ın adıyla.",
  sureNo: 1, ayetNo: 1, // sesi Fâtiha'nın besmelesinden (gömülü 001001) çalınır
  besmele: true,
};

function sureEkrani(durak, index) {
  const s = durak.sure;
  // Parça listesi: (Besmele) + âyetler. Fâtiha'da besmele eklenmez (1. âyeti zaten odur).
  const parcalar = [];
  if (s.sureNo !== 1) parcalar.push(BESMELE);
  s.ayetler.forEach((a, k) => parcalar.push({
    glyph: a.glyph, okunus: a.okunus, meal: a.meal, sureNo: s.sureNo, ayetNo: k + 1,
  }));
  const ayetSayisi = s.ayetler.length;
  let pos = 0;

  app.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "ders-wrap";
  wrap.appendChild(ustBaslik(durak));
  const bilgi = document.createElement("p");
  bilgi.className = "oyun-aciklama";
  bilgi.innerHTML = `${s.bilgi}<br><small class="tilavet-not">🎙️ Tilavet: M. H. el-Husary (internet gerekir; yoksa cihaz sesi)</small>`;
  wrap.appendChild(bilgi);
  const alan = document.createElement("div");
  wrap.appendChild(alan);
  app.appendChild(wrap);

  function ciz() {
    const p = parcalar[pos];
    const etiket = p.besmele ? "Besmele 🌸" : `${p.ayetNo}. âyet`;
    alan.innerHTML = `
      <div class="sure-kart ${p.besmele ? "besmele-kart" : ""}">
        <div class="sure-no">${etiket}</div>
        <div class="sure-arapca">${p.glyph}</div>
        <div class="sure-okunus">${p.okunus}</div>
        <div class="sure-meal">“${p.meal}”</div>
        <button class="dinle">🔊 Dinle</button>
      </div>
      <div class="kart-nav">
        <button class="onceki" ${pos === 0 ? "disabled" : ""}>◀ Geri</button>
        <span class="kart-sayac">${pos + 1} / ${parcalar.length}</span>
        <button class="sonraki">${pos === parcalar.length - 1 ? "Bitir 🏁" : "İleri ▶"}</button>
      </div>`;
    alan.querySelector(".dinle").addEventListener("click", () => tilavetCal(p.sureNo, p.ayetNo, p.okunus));
    tilavetCal(p.sureNo, p.ayetNo, p.okunus);
    alan.querySelector(".onceki").addEventListener("click", () => { if (pos > 0) { pos--; ciz(); } });
    alan.querySelector(".sonraki").addEventListener("click", () => {
      if (pos < parcalar.length - 1) { pos++; ciz(); }
      else tamamla(durak, index, 3, 0, 0, `${s.ad}'ni okudun! 📖🎉`);
    });
  }
  ciz();
  window.scrollTo(0, 0);
}

// ---- BALON PATLATMA (yavaş başlar, hızlanır; ıskalayınca doğru balon öğretici patlar) ----
function oyunBalon(durak, index) {
  const pool = durak.pool || durak.letters;
  const hedefSira = shuffleArr(durak.letters);
  const turSayisi = Math.max(5, durak.letters.length);
  let tur = 0, basari = 0;

  app.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "ders-wrap";
  wrap.appendChild(ustBaslik(durak));
  const hedefBar = document.createElement("div");
  hedefBar.className = "hedef-bar";
  wrap.appendChild(hedefBar);
  const gok = document.createElement("div");
  gok.className = "gokyuzu";
  wrap.appendChild(gok);
  app.appendChild(wrap);

  function dalga(hedef, sure) {
    gok.innerHTML = "";
    let bitti = false;
    const distract = shuffleArr(pool.filter((p) => p.name !== hedef.name)).slice(0, 4);
    const balonlar = shuffleArr([hedef, ...distract]);
    const n = balonlar.length;
    let hedefEl = null;
    balonlar.forEach((b, k) => {
      const el = document.createElement("button");
      el.className = "balon";
      el.style.left = (5 + k * (90 / n) + Math.random() * 5) + "%";
      el.style.background = rastgeleRenk();
      el.style.animationDuration = sure + "s";
      el.innerHTML = `<span class="balon-ic">${b.glyph}</span><span class="balon-ip"></span>`;
      if (b.name === hedef.name) hedefEl = el;
      el.addEventListener("click", () => {
        if (bitti) return;
        if (b.name === hedef.name) {
          bitti = true;
          el.classList.add("pat"); sesDogru(); basari++;
          _gec(sonrakiTur, 420);
        } else {
          sesYanlis(); el.classList.add("salla");
          _gec(() => el.classList.remove("salla"), 400);
        }
      });
      gok.appendChild(el);
    });
    // süre dolarsa: ÖĞRETİCİ ışkalama -> doğru balon vurgulanıp patlar, adı okunur
    _gec(() => {
      if (bitti) return;
      bitti = true;
      hataEkle(hedef.name);
      if (hedefEl) { hedefEl.classList.add("ogretici", "pat"); }
      konus(hedef);
      hedefBar.innerHTML = `<span class="balon-kacti">⛔ Kaçırdın! Doğrusu: <b>${hedef.glyph}</b> — ${hedef.name}</span>`;
      _gec(sonrakiTur, 1600);
    }, sure * 1000 + 300);
  }

  function sonrakiTur() {
    tur++;
    if (tur >= turSayisi) bitir();
    else baslat();
  }

  function baslat() {
    const hedef = hedefSira[tur % hedefSira.length];
    const sure = Math.max(3.2, 7 - tur * 0.55); // yavaş başla, her turda hızlan
    hedefBar.innerHTML = `🎯 Patlat: <b>${hedef.glyph}</b> ${hedef.name} <button class="mini-dinle">🔊</button> <span class="sayac">${tur + 1}/${turSayisi}</span>`;
    hedefBar.querySelector(".mini-dinle").addEventListener("click", () => konus(hedef));
    konus(hedef);
    dalga(hedef, sure);
  }

  function bitir() {
    const oran = basari / turSayisi;
    const yildiz = oran >= 0.85 ? 3 : oran >= 0.6 ? 2 : oran >= 0.3 ? 1 : 0;
    tamamla(durak, index, yildiz, basari, turSayisi);
  }

  baslat();
  window.scrollTo(0, 0);
}

// ---- KÖSTEBEK (çıkan hedef harfe vur) ----
function oyunKostebek(durak, index) {
  const pool = durak.pool || durak.letters;
  const harfler = durak.letters;
  const hedefSayisi = Math.max(5, harfler.length);
  let vurus = 0, yanlis = 0, hedef = rastgele(harfler);

  app.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "ders-wrap";
  wrap.appendChild(ustBaslik(durak));
  const hedefBar = document.createElement("div");
  hedefBar.className = "hedef-bar";
  wrap.appendChild(hedefBar);
  const bahce = document.createElement("div");
  bahce.className = "kostebek-bahce";
  wrap.appendChild(bahce);
  app.appendChild(wrap);

  const delikler = [];
  for (let i = 0; i < 6; i++) {
    const d = document.createElement("button");
    d.className = "delik";
    d.innerHTML = `<span class="toprak"></span><span class="kostebek"></span>`;
    d.addEventListener("click", () => vur(d));
    bahce.appendChild(d);
    delikler.push(d);
  }

  function yeniHedef() {
    hedef = rastgele(harfler);
    hedefBar.innerHTML = `🔨 Vur: <b>${hedef.name}</b> <button class="mini-dinle">🔊</button> <span class="sayac">${vurus}/${hedefSayisi}</span>`;
    hedefBar.querySelector(".mini-dinle").addEventListener("click", () => konus(hedef));
    konus(hedef);
  }

  function goster() {
    const bos = delikler.filter((d) => !d.dataset.dolu);
    if (!bos.length) return;
    const d = rastgele(bos);
    const harf = Math.random() < 0.55 ? hedef : rastgele(pool);
    d.dataset.dolu = "1"; d.dataset.name = harf.name;
    d.querySelector(".kostebek").textContent = harf.glyph;
    d.classList.add("cik");
    _gec(() => { d.classList.remove("cik"); delete d.dataset.dolu; delete d.dataset.name; }, 1150);
  }

  function vur(d) {
    if (!d.dataset.dolu) return;
    if (d.dataset.name === hedef.name) {
      sesDogru(); vurus++;
      d.classList.add("vuruldu");
      _gec(() => d.classList.remove("vuruldu"), 300);
      d.classList.remove("cik"); delete d.dataset.dolu; delete d.dataset.name;
      if (vurus >= hedefSayisi) { bitir(); return; }
      yeniHedef();
    } else {
      sesYanlis(); yanlis++;
      d.classList.add("ah"); _gec(() => d.classList.remove("ah"), 300);
    }
  }

  function bitir() {
    tamamla(durak, index, yanlis <= 1 ? 3 : yanlis <= 4 ? 2 : 1, vurus, hedefSayisi);
  }

  yeniHedef();
  _ara(goster, 800);
  window.scrollTo(0, 0);
}

// ---- DOĞRU MU? (hızlı doğru/yanlış) ----
function oyunDogruYanlis(durak, index) {
  const pool = durak.pool || durak.letters;
  const harfler = durak.letters;
  const turSayisi = Math.max(5, harfler.length + 1);
  const turlar = [];
  for (let i = 0; i < turSayisi; i++) {
    const h = rastgele(harfler);
    const dogruMu = Math.random() < 0.5;
    const iddia = dogruMu ? h.name : rastgele(pool.filter((p) => p.name !== h.name)).name;
    turlar.push({ glyph: h.glyph, iddia, dogruMu, gercek: h.name });
  }
  let turNo = 0, dogru = 0;

  app.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "test-wrap";
  app.appendChild(wrap);

  function ciz() {
    const t = turlar[turNo];
    wrap.innerHTML = `
      <div class="test-ust">
        <button class="geri">← Çık</button>
        <div class="ilerleme-cubuk"><div style="width:${(turNo / turSayisi) * 100}%"></div></div>
        <span>${turNo + 1}/${turSayisi}</span>
      </div>
      <p class="oyun-aciklama">Bu eşleşme doğru mu?</p>
      <div class="dy-kart"><span class="dy-harf">${t.glyph}</span><span class="dy-esit">=</span><span class="dy-ad">${t.iddia}</span></div>
      <div class="dy-butonlar">
        <button class="dy-btn dogru-btn">✓ Doğru</button>
        <button class="dy-btn yanlis-btn">✗ Yanlış</button>
      </div>
      <div class="geri-bildirim"></div>`;
    wrap.querySelector(".geri").addEventListener("click", render);
    konus({ glyph: t.glyph, name: t.gercek });
    wrap.querySelector(".dogru-btn").addEventListener("click", () => cevap(true, t));
    wrap.querySelector(".yanlis-btn").addEventListener("click", () => cevap(false, t));
  }

  function cevap(secim, t) {
    wrap.querySelectorAll(".dy-btn").forEach((b) => (b.disabled = true));
    const gb = wrap.querySelector(".geri-bildirim");
    const doruMu = secim === t.dogruMu;
    if (doruMu) { dogru++; sesDogru(); gb.innerHTML = `<span class="iyi">Aferin! 🎉</span>`; }
    else { sesYanlis(); hataEkle(t.gercek); gb.innerHTML = `<span class="kotu">Doğrusu: ${t.glyph} = <b>${t.gercek}</b></span>`; }
    const ileri = document.createElement("button");
    ileri.className = "devam";
    ileri.textContent = turNo === turSayisi - 1 ? "Bitir 🏁" : "Devam ▶";
    ileri.addEventListener("click", () => {
      turNo++;
      if (turNo < turSayisi) ciz();
      else { const o = dogru / turSayisi; tamamla(durak, index, o >= 0.99 ? 3 : o >= 0.7 ? 2 : o >= 0.5 ? 1 : 0, dogru, turSayisi); }
    });
    gb.appendChild(ileri);
  }

  ciz();
  window.scrollTo(0, 0);
}

// ---- BİLMECE (ipucundan harfi bul) ----
function oyunBilmece(durak, index) {
  const pool = durak.pool || durak.letters;
  const tur = shuffleArr(durak.letters.filter((h) => h.hint)).slice(0, Math.max(5, Math.min(6, durak.letters.length)));
  let turNo = 0, dogru = 0;

  app.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "ders-wrap";
  wrap.appendChild(ustBaslik(durak));
  app.appendChild(wrap);
  const alan = document.createElement("div");
  wrap.appendChild(alan);

  function ciz() {
    const h = tur[turNo];
    const yanlislar = shuffleArr(pool.filter((x) => x.name !== h.name)).slice(0, 3);
    const secenekler = shuffleArr([h, ...yanlislar]);
    alan.innerHTML = `
      <div class="test-ust">
        <div class="ilerleme-cubuk"><div style="width:${(turNo / tur.length) * 100}%"></div></div>
        <span>${turNo + 1}/${tur.length}</span>
      </div>
      <div class="bilmece-kutu">
        <div class="bilmece-balon">🧠</div>
        <p class="bilmece-soru">"${h.hint}"</p>
        <p class="bilmece-alt">Ben hangi harfim?</p>
      </div>
      <div class="listen-grid"></div>
      <div class="geri-bildirim"></div>`;
    const grid = alan.querySelector(".listen-grid");
    secenekler.forEach((opt) => {
      const b = document.createElement("button");
      b.className = "listen-hucre";
      b.textContent = opt.glyph;
      b.addEventListener("click", () => sec(b, opt, h));
      grid.appendChild(b);
    });
  }
  function sec(btn, opt, h) {
    alan.querySelectorAll(".listen-hucre").forEach((b) => (b.disabled = true));
    const gb = alan.querySelector(".geri-bildirim");
    if (opt.name === h.name) {
      btn.classList.add("dogru"); dogru++; sesDogru(); konus(h);
      gb.innerHTML = `<span class="iyi">Doğru: ${h.glyph} = ${h.name} 🎉</span>`;
    } else {
      btn.classList.add("yanlis"); sesYanlis(); hataEkle(h.name);
      alan.querySelectorAll(".listen-hucre").forEach((b) => { if (b.textContent === h.glyph) b.classList.add("dogru"); });
      gb.innerHTML = `<span class="kotu">Cevap: ${h.glyph} = <b>${h.name}</b></span>`;
    }
    const ileri = document.createElement("button");
    ileri.className = "devam";
    ileri.textContent = turNo === tur.length - 1 ? "Bitir 🏁" : "Devam ▶";
    ileri.addEventListener("click", () => {
      turNo++;
      if (turNo < tur.length) ciz();
      else { const o = dogru / tur.length; tamamla(durak, index, o >= 0.99 ? 3 : o >= 0.7 ? 2 : o >= 0.5 ? 1 : 0, dogru, tur.length); }
    });
    gb.appendChild(ileri);
  }
  ciz();
  window.scrollTo(0, 0);
}

// ---- BOŞLUK DOLDUR (doğru hareke ile heceyi tamamla) ----
function oyunBosluk(durak, index) {
  const tur = shuffleArr(durak.fill);
  let turNo = 0, dogru = 0;

  app.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "ders-wrap";
  wrap.appendChild(ustBaslik(durak));
  app.appendChild(wrap);
  const alan = document.createElement("div");
  wrap.appendChild(alan);

  function ciz() {
    const t = tur[turNo];
    alan.innerHTML = `
      <div class="test-ust">
        <div class="ilerleme-cubuk"><div style="width:${(turNo / tur.length) * 100}%"></div></div>
        <span>${turNo + 1}/${tur.length}</span>
      </div>
      <p class="oyun-aciklama">Boşluğu doldur: <b>“${t.hedefHece}”</b> diye okunsun</p>
      <div class="fill-satir">
        <span class="fill-govde">${t.govde}</span>
        <span class="fill-kutu">?</span>
      </div>
      <div class="fill-secenekler"></div>
      <div class="geri-bildirim"></div>`;
    const sec = alan.querySelector(".fill-secenekler");
    shuffleArr(t.secenekler).forEach((opt) => {
      const b = document.createElement("button");
      b.className = "fill-chip";
      b.innerHTML = `<span class="fill-chip-harf">${opt.hece}</span><span class="fill-chip-oku">${opt.oku}</span>`;
      b.addEventListener("click", () => cevap(b, opt, t));
      sec.appendChild(b);
    });
  }
  function cevap(btn, opt, t) {
    alan.querySelectorAll(".fill-chip").forEach((b) => (b.disabled = true));
    const kutu = alan.querySelector(".fill-kutu");
    const gb = alan.querySelector(".geri-bildirim");
    if (opt.ses === t.dogruSes) {
      btn.classList.add("dogru"); dogru++; sesDogru();
      kutu.textContent = opt.hece; kutu.classList.add("dolu");
      gb.innerHTML = `<span class="iyi">${opt.hece} = ${t.hedefHece} 🎉</span>`;
    } else {
      btn.classList.add("yanlis"); sesYanlis(); hataEkle(t.hedefHece);
      alan.querySelectorAll(".fill-chip").forEach((b) => { if (b.querySelector(".fill-chip-oku").textContent === t.hedefHece) b.classList.add("dogru"); });
      gb.innerHTML = `<span class="kotu">Doğrusu: <b>${t.hedefHece}</b></span>`;
    }
    const ileri = document.createElement("button");
    ileri.className = "devam";
    ileri.textContent = turNo === tur.length - 1 ? "Bitir 🏁" : "Devam ▶";
    ileri.addEventListener("click", () => {
      turNo++;
      if (turNo < tur.length) ciz();
      else { const o = dogru / tur.length; tamamla(durak, index, o >= 0.99 ? 3 : o >= 0.7 ? 2 : o >= 0.5 ? 1 : 0, dogru, tur.length); }
    });
    gb.appendChild(ileri);
  }
  ciz();
  window.scrollTo(0, 0);
}

// ---- KELİME BOŞLUK DOLDURMA (kelimedeki eksik harfi bul) ----
function oyunKelime(durak, index) {
  const tur = shuffleArr(durak.kelimeler);
  const pool = durak.pool || HARFLER;
  let turNo = 0, dogru = 0;

  app.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "ders-wrap";
  wrap.appendChild(ustBaslik(durak));
  app.appendChild(wrap);
  const alan = document.createElement("div");
  wrap.appendChild(alan);

  function ciz() {
    const k = tur[turNo];
    const idx = Math.floor(Math.random() * k.harfler.length);
    const dogruGlyph = k.harfler[idx];
    const yanlis = shuffleArr(pool.filter((h) => h.glyph !== dogruGlyph)).slice(0, 2).map((h) => h.glyph);
    const secenekler = shuffleArr([dogruGlyph, ...yanlis]);
    const parcalar = k.harfler.map((h, i) =>
      i === idx ? `<span class="kelime-kutu">?</span>` : `<span class="kelime-harf">${h}</span>`).join("");
    alan.innerHTML = `
      <div class="test-ust">
        <div class="ilerleme-cubuk"><div style="width:${(turNo / tur.length) * 100}%"></div></div>
        <span>${turNo + 1}/${tur.length}</span>
      </div>
      <p class="oyun-aciklama">Eksik harfi bul: <b>“${k.okunus}”</b> (${k.anlam})</p>
      <div class="kelime-satir">${parcalar}</div>
      <div class="listen-grid kelime-secenekler"></div>
      <div class="geri-bildirim"></div>`;
    const grid = alan.querySelector(".kelime-secenekler");
    secenekler.forEach((g) => {
      const b = document.createElement("button");
      b.className = "listen-hucre"; b.textContent = g;
      b.addEventListener("click", () => cevap(b, g, dogruGlyph, k));
      grid.appendChild(b);
    });
  }
  function cevap(btn, g, dogruGlyph, k) {
    alan.querySelectorAll(".listen-hucre").forEach((b) => (b.disabled = true));
    const kutu = alan.querySelector(".kelime-kutu");
    const gb = alan.querySelector(".geri-bildirim");
    if (g === dogruGlyph) {
      btn.classList.add("dogru"); dogru++; sesDogru();
      kutu.textContent = dogruGlyph; kutu.classList.add("dolu");
      gb.innerHTML = `<span class="iyi">${k.tam} = ${k.okunus} 🎉</span>`;
    } else {
      btn.classList.add("yanlis"); sesYanlis(); hataEkle(k.okunus);
      alan.querySelectorAll(".listen-hucre").forEach((b) => { if (b.textContent === dogruGlyph) b.classList.add("dogru"); });
      gb.innerHTML = `<span class="kotu">Doğru harf: <b>${dogruGlyph}</b> → ${k.tam}</span>`;
    }
    const ileri = document.createElement("button");
    ileri.className = "devam";
    ileri.textContent = turNo === tur.length - 1 ? "Bitir 🏁" : "Devam ▶";
    ileri.addEventListener("click", () => {
      turNo++;
      if (turNo < tur.length) ciz();
      else { const o = dogru / tur.length; tamamla(durak, index, o >= 0.99 ? 3 : o >= 0.7 ? 2 : o >= 0.5 ? 1 : 0, dogru, tur.length); }
    });
    gb.appendChild(ileri);
  }
  ciz();
  window.scrollTo(0, 0);
}

// ---- ŞİMŞEK YARIŞI (süreli puan turu) ----
function oyunSimsek(durak, index) {
  const havuz = durak.havuz;
  const sure = durak.sure || 45;
  let kalan = sure, puan = 0, bitti = false;

  app.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "test-wrap";
  app.appendChild(wrap);
  const ust = document.createElement("div");
  ust.className = "simsek-ust";
  wrap.appendChild(ust);
  const alan = document.createElement("div");
  wrap.appendChild(alan);

  function ustGuncelle() {
    ust.innerHTML = `
      <button class="geri">← Çık</button>
      <span class="simsek-sure">⏱️ ${kalan}s</span>
      <span class="simsek-puan">⚡ ${puan}</span>`;
    ust.querySelector(".geri").addEventListener("click", render);
  }
  ustGuncelle();
  _ara(() => { if (bitti) return; kalan--; ustGuncelle(); if (kalan <= 0) bitir(); }, 1000);

  function soru() {
    const hedef = rastgele(havuz);
    const yanlis = shuffleArr(havuz.filter((x) => x.name !== hedef.name)).slice(0, 2).map((x) => x.name);
    const secenekler = shuffleArr([hedef.name, ...yanlis]);
    alan.innerHTML = `
      <div class="soru"><div class="soru-harf">${hedef.glyph}</div><p>Bu nedir?</p></div>
      <div class="secenekler"></div>`;
    const sec = alan.querySelector(".secenekler");
    secenekler.forEach((opt) => {
      const b = document.createElement("button");
      b.className = "secenek";
      b.textContent = opt;
      b.addEventListener("click", () => {
        if (bitti) return;
        if (opt === hedef.name) { puan++; sesDogru(); }
        else { sesYanlis(); b.classList.add("yanlis"); }
        ustGuncelle(); soru();
      });
      sec.appendChild(b);
    });
  }
  function bitir() {
    if (bitti) return;
    bitti = true;
    zamanlayicilariTemizle();
    const yildiz = puan >= 12 ? 3 : puan >= 8 ? 2 : puan >= 4 ? 1 : 0;
    tamamla(durak, index, yildiz, puan, puan, `⚡ ${puan} puan topladın!`);
  }
  soru();
  window.scrollTo(0, 0);
}

// ---- ZAYIF HARFLER/HECELER (adaptif tekrar) ----
function oyunZayif(durak, index) {
  const havuz = durak.pool || (typeof HARFLER !== "undefined" ? HARFLER : []);
  const hatalar = ILERLEME.hatalar || {};
  let zayif = havuz.filter((h) => hatalar[h.name]).sort((a, b) => hatalar[b.name] - hatalar[a.name]);
  if (zayif.length < 4) {
    const ek = shuffleArr(havuz.filter((h) => !zayif.includes(h))).slice(0, 5 - zayif.length);
    zayif = zayif.concat(ek);
  }
  // Ne kadar çok farklı öğede hata varsa tekrar o kadar uzar
  const secim = zayif.slice(0, 10);
  durak.quiz = makeLetterQuiz(secim, havuz, secim.length, "Bu nedir?");
  testeGir(durak, index);
}

// ---- SINAVLA ATLA (yeterlilik sınavı: %95+ ile bölüme atla) ----
function bolgeTestOgeleri(bolge) {
  const set = new Map();
  bolge.duraklar.forEach((d) => {
    const arr = d.cards || d.letters || d.items || d.pairs || [];
    arr.forEach((it) => { if (it && it.glyph && it.name && !set.has(it.name)) set.set(it.name, { glyph: it.glyph, name: it.name }); });
  });
  return [...set.values()];
}

function atlamaSinavi(hedefIndex, bolge) {
  zamanlayicilariTemizle();
  AKTIF_DURAK = null;
  // Hedef seviyeden ÖNCEKİ çekirdek "okuma" bölgeleri, sırasıyla.
  // Bu sınavı geçmek = hedef seviyenin önündeki aşamalara hâkim olmak demek.
  const oncekiBolgeler = []; // her biri o bölgenin öğeleri
  for (let bi = 0; bi < BOLGELER.length; bi++) {
    const b = BOLGELER[bi];
    if (b.id === bolge.id) break;        // hedef bölgenin kendisi hariç (henüz öğrenilmedi)
    if (idArapca(b.id)) {
      const items = bolgeTestOgeleri(b);
      if (items.length) oncekiBolgeler.push(items);
    }
  }
  // Hiç önceki yoksa (hedef ilk Arapça bölge) hedef bölgenin kendisinden sor.
  if (oncekiBolgeler.length === 0) {
    const its = bolgeTestOgeleri(bolge);
    if (its.length) oncekiBolgeler.push(its);
  }

  // YAKIN havuz: hedefe en yakın son 2 aşama → soruların %80'i buradan.
  // UZAK havuz: daha önceki tüm aşamalar → kalan %20.
  const yakinSayi = Math.min(2, oncekiBolgeler.length);
  const benzersiz = (arr) => { const m = new Map(); arr.forEach((it) => { if (!m.has(it.name)) m.set(it.name, it); }); return [...m.values()]; };
  const yakinHavuz = benzersiz(oncekiBolgeler.slice(-yakinSayi).flat());
  const yakinAdlar = new Set(yakinHavuz.map((it) => it.name));
  const uzakHavuz = benzersiz(oncekiBolgeler.slice(0, -yakinSayi).flat()).filter((it) => !yakinAdlar.has(it.name));
  const havuz = benzersiz([...yakinHavuz, ...uzakHavuz]); // şıklar (çeldiriciler) için tüm öğeler
  if (havuz.length < 3) { alert("Bu bölüm için sınav oluşturulamadı."); return; }

  // Daha kapsayıcı ve zor: daha çok soru + 4 şık + daha sıkı toplam süre
  const soruSay = Math.min(30, Math.max(20, havuz.length));
  // %80 yakın (son aşamalar), %20 uzak — uzak yoksa hepsi yakından.
  let yakinSoru = uzakHavuz.length ? Math.round(soruSay * 0.8) : soruSay;
  let uzakSoru = soruSay - yakinSoru;
  // Bir havuzdan benzersiz çek; yetmezse tekrar (rastgele) ile tamamla.
  const cek = (kaynak, adet) => {
    if (!kaynak.length || adet <= 0) return [];
    const karma = shuffleArr(kaynak);
    if (karma.length >= adet) return karma.slice(0, adet);
    return Array.from({ length: adet }, (_, k) => karma[k % karma.length] || rastgele(kaynak));
  };
  const secilen = shuffleArr([...cek(yakinHavuz, yakinSoru), ...cek(uzakHavuz, uzakSoru)]);
  const sorular = secilen.map((it) => {
    const yanlis = shuffleArr(havuz.filter((h) => h.name !== it.name)).slice(0, 3).map((h) => h.name);
    return { glyph: it.glyph, a: it.name, options: shuffleArr([it.name, ...yanlis]) };
  });
  const toplamSure = Math.round(soruSay * 2.6); // saniye — daha sıkı süre baskısı
  let i = 0, dogru = 0, kalan = toplamSure, bittiBayrak = false;

  app.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "test-wrap";
  app.appendChild(wrap);

  function sureGuncelle() {
    const el = wrap.querySelector(".sinav-sure");
    if (el) { el.textContent = `⏱️ ${kalan}s`; el.classList.toggle("az", kalan <= 10); }
  }
  _ara(() => { if (bittiBayrak) return; kalan--; sureGuncelle(); if (kalan <= 0) bitir(true); }, 1000);

  function ciz() {
    const s = sorular[i];
    wrap.innerHTML = `
      <div class="test-ust">
        <button class="geri">← Çık</button>
        <div class="ilerleme-cubuk"><div style="width:${(i / sorular.length) * 100}%"></div></div>
        <span class="sinav-sure">⏱️ ${kalan}s</span>
        <span>${i + 1}/${sorular.length}</span>
      </div>
      <p class="oyun-aciklama">⏭️ Atlama Sınavı — sorular ağırlıkla son aşamalardan • geçmek için %95 ve süreyi geçmemek</p>
      <div class="soru"><div class="soru-harf">${s.glyph}</div><p>Bu nedir?</p></div>
      <div class="secenekler"></div>
      <div class="geri-bildirim"></div>`;
    wrap.querySelector(".geri").addEventListener("click", render);
    const sec = wrap.querySelector(".secenekler");
    s.options.forEach((opt) => {
      const b = document.createElement("button");
      b.className = "secenek";
      b.textContent = opt;
      b.addEventListener("click", () => cevap(b, opt, s));
      sec.appendChild(b);
    });
  }
  function cevap(btn, opt, s) {
    wrap.querySelectorAll(".secenek").forEach((b) => (b.disabled = true));
    const gb = wrap.querySelector(".geri-bildirim");
    if (opt === s.a) { btn.classList.add("dogru"); dogru++; sesDogru(); gb.innerHTML = `<span class="iyi">Doğru ✓</span>`; }
    else {
      btn.classList.add("yanlis"); sesYanlis();
      wrap.querySelectorAll(".secenek").forEach((b) => { if (b.textContent === s.a) b.classList.add("dogru"); });
      gb.innerHTML = `<span class="kotu">Doğrusu: <b>${s.a}</b></span>`;
    }
    _gec(() => { if (bittiBayrak) return; i++; if (i < sorular.length) ciz(); else bitir(false); }, 480); // otomatik ilerle (süre baskısı)
  }
  function bitir(zamanBitti) {
    if (bittiBayrak) return;
    bittiBayrak = true;
    zamanlayicilariTemizle();
    const oran = dogru / sorular.length;
    const yuzde = Math.round(oran * 100);
    const gecti = !zamanBitti && oran >= 0.95;
    if (gecti) {
      for (let j = 0; j < hedefIndex; j++) ILERLEME.tamamlanan[DURAKLAR[j].id] = true;
      ilerlemeKaydet(ILERLEME);
      sesBasari(); konfetiPatlat();
    } else sesYanlis();
    app.innerHTML = "";
    const w = document.createElement("div");
    w.className = "test-wrap";
    w.innerHTML = `
      <div class="sonuc ${gecti ? "basarili" : "tekrar"}">
        <div class="sonuc-emoji">${gecti ? "⏭️" : "📚"}</div>
        <h2>${gecti ? "Tebrikler, geçtin!" : "Henüz olmadı"}</h2>
        <p>${dogru} / ${sorular.length} doğru — <b>%${yuzde}</b></p>
        <p>${gecti ? `“${bolge.name}” bölümüne kadar olan kısım açıldı!` : (zamanBitti ? "⏱️ Süre doldu! %95 ve süre içinde bitirmen gerek 💪" : "Geçmek için %95 gerekiyor. Önce dersleri çalış 💪")}</p>
        <div class="sonuc-butonlar">
          ${gecti ? `<button class="sonraki-btn">Bölüme Git ▶</button>` : `<button class="tekrar-btn">🔁 Tekrar Dene</button>`}
          <button class="harita-btn">🗺️ Haritaya Dön</button>
        </div>
      </div>`;
    app.appendChild(w);
    w.querySelector(".harita-btn").addEventListener("click", render);
    const sb = w.querySelector(".sonraki-btn");
    if (sb) sb.addEventListener("click", () => durakAc(DURAKLAR[hedefIndex], hedefIndex));
    const tb = w.querySelector(".tekrar-btn");
    if (tb) tb.addEventListener("click", () => atlamaSinavi(hedefIndex, bolge));
    window.scrollTo(0, 0);
  }
  ciz();
  window.scrollTo(0, 0);
}

// ---- PROFİL & ROZETLER ----
function hepsiTamam(filterFn) {
  const ds = DURAKLAR.filter(filterFn);
  return ds.length > 0 && ds.every((d) => ILERLEME.tamamlanan[d.id]);
}
function rozetler() {
  const ts = toplamYildiz();
  return [
    { emoji: "🔤", ad: "Harf Ustası",     aciklama: "Tüm Elif-Ba aşamaları", acik: hepsiTamam((d) => d.bolge.id.startsWith("bolge_a")) },
    { emoji: "🎯", ad: "Pekiştirmeci",    aciklama: "Tüm pekiştirme durakları", acik: hepsiTamam((d) => d.bolge.id.indexOf("pk") >= 0) },
    { emoji: "🍃", ad: "Hece Kahramanı",  aciklama: "Tüm hece bölümleri", acik: hepsiTamam((d) => d.bolge.id.indexOf("hc") >= 0) },
    { emoji: "〰️", ad: "Med Uzmanı",      aciklama: "Med Vadisi", acik: hepsiTamam((d) => d.bolge.id === "bolgeMed") },
    { emoji: "⛰️", ad: "Tenvin Kâşifi",   aciklama: "Tenvin Tepesi", acik: hepsiTamam((d) => d.bolge.id === "bolgeTenvin") },
    { emoji: "🏙️", ad: "Kelime Dostu",    aciklama: "Kelime Şehri", acik: hepsiTamam((d) => d.bolge.id === "bolgeKelime") },
    { emoji: "📖", ad: "Sure Hâfızı",     aciklama: "Tüm sureler", acik: hepsiTamam((d) => d.bolge.id === "bolgeSure") },
    { emoji: "⭐", ad: "25 Yıldız",        aciklama: "25 yıldız topla", acik: ts >= 25 },
    { emoji: "🌟", ad: "75 Yıldız",        aciklama: "75 yıldız topla", acik: ts >= 75 },
    { emoji: "👑", ad: "Kur'an Yolcusu",  aciklama: "Tüm haritayı bitir", acik: hepsiTamam(() => true) },
  ];
}

function profilEkrani() {
  zamanlayicilariTemizle();
  ILERLEME = ilerlemeYukle();
  const ts = toplamYildiz();
  const rs = rozetler();
  const kazanilan = rs.filter((r) => r.acik).length;
  const tamamSay = DURAKLAR.filter((d) => ILERLEME.tamamlanan[d.id]).length;
  const isim = (ILERLEME.isim || "").replace(/"/g, "&quot;");

  app.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "ders-wrap";
  wrap.innerHTML = `
    <div class="ders-ust"><button class="geri">← Harita</button><h2>👤 Profilim</h2></div>
    <div class="profil-kart">
      <div class="profil-avatar">🧒</div>
      <input class="profil-isim" placeholder="Adını yaz..." value="${isim}" maxlength="14" />
      <div class="profil-istat">
        <div><b>${ts}</b><span>⭐ Puan</span></div>
        <div><b>${tamamSay}/${DURAKLAR.length}</b><span>Durak</span></div>
        <div><b>${kazanilan}/${rs.length}</b><span>🏅 Rozet</span></div>
      </div>
    </div>
    <div class="ayar-kart">
      <div class="ayar-satir">
        <span>🔊 Harf/hece sesi</span>
        <div class="ayar-secim">
          <button class="ayar-btn ${arapcaAcik() ? "secili" : ""}" data-arapca="1">Arapça 🕌</button>
          <button class="ayar-btn ${arapcaAcik() ? "" : "secili"}" data-arapca="0">Türkçe okunuş</button>
        </div>
      </div>
      <p class="ayar-not">Arapça'da harfin kendi sesi okunur (cihazda Arapça TTS olmalı). Ses gelmezse Türkçe'ye al.</p>
    </div>
    <h3 class="rozet-baslik">🏅 Rozetlerim</h3>
    <div class="rozet-grid"></div>`;
  wrap.querySelector(".geri").addEventListener("click", render);
  const inp = wrap.querySelector(".profil-isim");
  inp.addEventListener("change", () => { ILERLEME.isim = inp.value.trim(); ilerlemeKaydet(ILERLEME); });
  wrap.querySelectorAll(".ayar-btn").forEach((b) => b.addEventListener("click", () => {
    ILERLEME.arapca = b.dataset.arapca === "1";
    ilerlemeKaydet(ILERLEME);
    wrap.querySelectorAll(".ayar-btn").forEach((x) => x.classList.toggle("secili", x.dataset.arapca === b.dataset.arapca));
    // örnek ses
    konusOrnek();
  }));
  const grid = wrap.querySelector(".rozet-grid");
  rs.forEach((r) => {
    const el = document.createElement("div");
    el.className = "rozet " + (r.acik ? "acik" : "kilitli");
    el.innerHTML = `<div class="rozet-emoji">${r.acik ? r.emoji : "🔒"}</div><div class="rozet-ad">${r.ad}</div><div class="rozet-acik">${r.aciklama}</div>`;
    grid.appendChild(el);
  });
  app.appendChild(wrap);
  window.scrollTo(0, 0);
}

// ---- HARF AVI (ızgarada hedef harfin hepsini bul) ----
function oyunAvla(durak, index) {
  const pool = durak.pool || durak.letters;
  const hedefSira = shuffleArr(durak.letters);
  const turSayisi = Math.max(4, Math.min(6, durak.letters.length));
  let tur = 0, hata = 0;

  app.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "ders-wrap";
  wrap.appendChild(ustBaslik(durak));
  const hedefBar = document.createElement("div");
  hedefBar.className = "hedef-bar";
  wrap.appendChild(hedefBar);
  const alan = document.createElement("div");
  wrap.appendChild(alan);
  app.appendChild(wrap);

  function ciz() {
    const hedef = hedefSira[tur % hedefSira.length];
    const adet = 2 + Math.floor(Math.random() * 2); // 2-3 hedef
    const distractPool = pool.filter((p) => p.name !== hedef.name);
    const hucreler = [];
    for (let i = 0; i < adet; i++) hucreler.push(hedef);
    while (hucreler.length < 16) hucreler.push(rastgele(distractPool));
    shuffleArr(hucreler);
    let kalan = adet;
    hedefBar.innerHTML = `🔎 Bul: <b>${hedef.glyph}</b> ${hedef.name} — ${adet} tane <button class="mini-dinle">🔊</button> <span class="sayac">${tur + 1}/${turSayisi}</span>`;
    hedefBar.querySelector(".mini-dinle").addEventListener("click", () => konus(hedef));
    konus(hedef);
    alan.innerHTML = `<div class="avla-grid"></div>`;
    const grid = alan.querySelector(".avla-grid");
    shuffleArr(hucreler).forEach((h) => {
      const b = document.createElement("button");
      b.className = "avla-hucre";
      b.textContent = h.glyph;
      b.addEventListener("click", () => {
        if (b.classList.contains("bulundu") || b.disabled) return;
        if (h.name === hedef.name) {
          b.classList.add("bulundu"); sesDogru(); kalan--;
          if (kalan === 0) { tur++; _gec(() => { tur >= turSayisi ? bitir() : ciz(); }, 350); }
        } else {
          sesYanlis(); hata++; b.classList.add("avla-yanlis");
          _gec(() => b.classList.remove("avla-yanlis"), 350);
        }
      });
      grid.appendChild(b);
    });
  }
  function bitir() {
    const yildiz = hata <= 1 ? 3 : hata <= 4 ? 2 : 1;
    tamamla(durak, index, yildiz, turSayisi, turSayisi, `🔎 Avı tamamladın!`);
  }
  ciz();
  window.scrollTo(0, 0);
}

// ---- KELİME TRENİ (harfleri sırayla dizerek kelimeyi kur) ----
function oyunDizi(durak, index) {
  const tur = shuffleArr(durak.kelimeler);
  let turNo = 0, hata = 0;

  app.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "ders-wrap";
  wrap.appendChild(ustBaslik(durak));
  const alan = document.createElement("div");
  wrap.appendChild(alan);
  app.appendChild(wrap);

  function ciz() {
    const k = tur[turNo];
    const hedef = k.harfler;
    let pos = 0;
    alan.innerHTML = `
      <div class="test-ust">
        <div class="ilerleme-cubuk"><div style="width:${(turNo / tur.length) * 100}%"></div></div>
        <span>${turNo + 1}/${tur.length}</span>
      </div>
      <p class="oyun-aciklama">🚂 Harfleri sırayla diz: <b>“${k.okunus}”</b> (${k.anlam})</p>
      <div class="tren" dir="rtl"></div>
      <div class="tren-havuz"></div>
      <div class="geri-bildirim"></div>`;
    const tren = alan.querySelector(".tren");
    hedef.forEach(() => { const s = document.createElement("span"); s.className = "tren-slot"; tren.appendChild(s); });
    const slotlar = [...tren.querySelectorAll(".tren-slot")];
    const havuz = alan.querySelector(".tren-havuz");
    shuffleArr(hedef.map((g, i) => ({ g, i }))).forEach((t) => {
      const b = document.createElement("button");
      b.className = "tren-tile";
      b.textContent = t.g;
      b.addEventListener("click", () => {
        if (b.disabled) return;
        if (t.g === hedef[pos]) {
          slotlar[pos].textContent = t.g; slotlar[pos].classList.add("dolu");
          b.disabled = true; b.classList.add("kullanildi"); sesDogru(); pos++;
          if (pos === hedef.length) {
            const gb = alan.querySelector(".geri-bildirim");
            gb.innerHTML = `<span class="iyi">${k.tam} = ${k.okunus} 🎉</span>`;
            const ileri = document.createElement("button");
            ileri.className = "devam";
            ileri.textContent = turNo === tur.length - 1 ? "Bitir 🏁" : "Devam ▶";
            ileri.addEventListener("click", () => {
              turNo++;
              if (turNo < tur.length) ciz();
              else tamamla(durak, index, hata <= 1 ? 3 : hata <= 3 ? 2 : 1, tur.length, tur.length, "🚂 Tüm kelimeleri kurdun!");
            });
            gb.appendChild(ileri);
          }
        } else {
          sesYanlis(); hata++; b.classList.add("tren-yanlis");
          _gec(() => b.classList.remove("tren-yanlis"), 350);
        }
      });
      havuz.appendChild(b);
    });
  }
  ciz();
  window.scrollTo(0, 0);
}

// ---- KAYAN YAKALA (düşen harflerden hedefi yakala) ----
function oyunYakala(durak, index) {
  const pool = durak.pool || durak.letters;
  const harfler = durak.letters;
  const hedefSayisi = Math.max(6, harfler.length);
  let vurus = 0, kacan = 0, hedef = rastgele(harfler);

  app.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "ders-wrap";
  wrap.appendChild(ustBaslik(durak));
  const hedefBar = document.createElement("div");
  hedefBar.className = "hedef-bar";
  wrap.appendChild(hedefBar);
  const alan = document.createElement("div");
  alan.className = "yakala-alan";
  wrap.appendChild(alan);
  app.appendChild(wrap);

  function yeniHedef() {
    hedef = rastgele(harfler);
    hedefBar.innerHTML = `🪂 Yakala: <b>${hedef.glyph}</b> ${hedef.name} <button class="mini-dinle">🔊</button> <span class="sayac">${vurus}/${hedefSayisi}</span>`;
    hedefBar.querySelector(".mini-dinle").addEventListener("click", () => konus(hedef));
    konus(hedef);
  }
  function dus() {
    const harf = Math.random() < 0.5 ? hedef : rastgele(pool);
    const el = document.createElement("button");
    el.className = "dusen";
    el.style.left = (4 + Math.random() * 84) + "%";
    el.style.background = rastgeleRenk();
    el.style.animationDuration = (3.4 + Math.random() * 1.7) + "s";
    el.textContent = harf.glyph;
    el.addEventListener("click", () => {
      if (el.dataset.done) return;
      el.dataset.done = "1";
      if (harf.name === hedef.name) {
        el.classList.add("yakalandi"); sesDogru(); vurus++;
        if (vurus >= hedefSayisi) { bitir(); return; }
        yeniHedef();
      } else { sesYanlis(); el.classList.add("kacti-x"); }
    });
    el.addEventListener("animationend", () => {
      if (!el.dataset.done && harf.name === hedef.name) { kacan++; hataEkle(hedef.name); }
      el.remove();
    });
    alan.appendChild(el);
  }

  function bitir() {
    const yildiz = kacan <= 1 ? 3 : kacan <= 3 ? 2 : 1;
    tamamla(durak, index, yildiz, vurus, hedefSayisi);
  }

  yeniHedef();
  _ara(dus, 850);
  window.scrollTo(0, 0);
}

// ---- YARIŞ (rakibe karşı: doğru cevapla koş, önce bitire ulaş) ----
function oyunYaris(durak, index) {
  const havuz = durak.letters || durak.havuz || durak.pairs || [];
  const pool = durak.pool || havuz;
  const HEDEF = 8;            // bitişe kaç adım
  let sen = 0, rakip = 0, bitti = false;

  app.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "test-wrap";
  app.appendChild(wrap);
  const ust = document.createElement("div");
  ust.className = "yaris-ust";
  wrap.appendChild(ust);
  const alan = document.createElement("div");
  wrap.appendChild(alan);

  function pist() {
    const sy = (sen / HEDEF) * 100, ry = (rakip / HEDEF) * 100;
    ust.innerHTML = `
      <button class="geri">← Çık</button>
      <div class="yaris-pistler">
        <div class="yaris-pist"><div class="yaris-kos" style="left:${Math.min(sy, 92)}%">🧒</div><span class="yaris-bayrak">🏁</span></div>
        <div class="yaris-pist"><div class="yaris-kos rakip" style="left:${Math.min(ry, 92)}%">🤖</div><span class="yaris-bayrak">🏁</span></div>
      </div>`;
    ust.querySelector(".geri").addEventListener("click", render);
  }

  function soru() {
    if (bitti) return;
    const hedef = rastgele(havuz);
    const yanlis = shuffleArr(pool.filter((x) => x.name !== hedef.name)).slice(0, 2).map((x) => x.name);
    const secenekler = shuffleArr([hedef.name, ...yanlis]);
    alan.innerHTML = `
      <div class="soru"><div class="soru-harf">${hedef.glyph}</div><p>Hangisi?</p></div>
      <div class="secenekler"></div>`;
    const sec = alan.querySelector(".secenekler");
    secenekler.forEach((opt) => {
      const b = document.createElement("button");
      b.className = "secenek";
      b.textContent = opt;
      b.addEventListener("click", () => {
        if (bitti) return;
        if (opt === hedef.name) { sen++; sesDogru(); }
        else { rakip++; sesYanlis(); hataEkle(hedef.name); b.classList.add("yanlis"); }
        pist();
        if (sen >= HEDEF || rakip >= HEDEF) bitir();
        else soru();
      });
      sec.appendChild(b);
    });
  }

  // rakip zamanla ilerler (heyecan): her ~2.6 sn bir adım
  _ara(() => { if (bitti) return; rakip++; pist(); if (rakip >= HEDEF) bitir(); }, 2600);

  function bitir() {
    if (bitti) return;
    bitti = true;
    zamanlayicilariTemizle();
    const kazandi = sen >= HEDEF && sen >= rakip;
    const yildiz = kazandi ? 3 : sen >= HEDEF - 3 ? 2 : 1;
    tamamla(durak, index, yildiz, sen, HEDEF, kazandi ? "🏆 Yarışı kazandın!" : "🤖 Rakip önde bitirdi, tekrar dene!");
  }

  pist();
  soru();
  window.scrollTo(0, 0);
}

// =====================================================================
//  YENİ ÖĞRETİCİ ALIŞTIRMALAR (çeşitlilik için)
// =====================================================================

// ---- AYNI MI? (görsel ayırt etme: ب ت ث / ج ح خ karışıklığını giderir) ----
function oyunAyni(durak, index) {
  const pool = durak.pool || durak.letters;
  const harfler = durak.letters;
  const turSayisi = Math.max(6, harfler.length + 1);
  const turlar = [];
  for (let i = 0; i < turSayisi; i++) {
    const a = rastgele(harfler);
    const ayniMi = Math.random() < 0.5;
    let b = a;
    if (!ayniMi) { b = rastgele(pool.filter((p) => p.name !== a.name)) || a; }
    turlar.push({ a, b, ayni: a.name === b.name });
  }
  let turNo = 0, dogru = 0;
  app.innerHTML = "";
  const wrap = document.createElement("div"); wrap.className = "test-wrap"; app.appendChild(wrap);
  function ciz() {
    const t = turlar[turNo];
    wrap.innerHTML = `
      <div class="test-ust"><button class="geri">← Çık</button>
        <div class="ilerleme-cubuk"><div style="width:${(turNo / turSayisi) * 100}%"></div></div>
        <span>${turNo + 1}/${turSayisi}</span></div>
      <p class="oyun-aciklama">Bu iki harf aynı mı?</p>
      <div class="ayni-kart"><span class="ayni-harf arabic">${t.a.glyph}</span><span class="ayni-vs">—</span><span class="ayni-harf arabic">${t.b.glyph}</span></div>
      <div class="dy-butonlar">
        <button class="dy-btn dogru-btn">✓ Aynı</button>
        <button class="dy-btn yanlis-btn">✗ Farklı</button>
      </div><div class="geri-bildirim"></div>`;
    wrap.querySelector(".geri").addEventListener("click", render);
    wrap.querySelector(".dogru-btn").addEventListener("click", () => cevap(true, t));
    wrap.querySelector(".yanlis-btn").addEventListener("click", () => cevap(false, t));
  }
  function cevap(sec, t) {
    wrap.querySelectorAll(".dy-btn").forEach((b) => (b.disabled = true));
    const gb = wrap.querySelector(".geri-bildirim");
    if (sec === t.ayni) { dogru++; sesDogru(); gb.innerHTML = `<span class="iyi">Aferin! 🎉</span>`; }
    else { sesYanlis(); hataEkle(t.a.name); gb.innerHTML = `<span class="kotu">${t.a.glyph} (${t.a.name}) — ${t.b.glyph} (${t.b.name})</span>`; }
    const ileri = document.createElement("button"); ileri.className = "devam";
    ileri.textContent = turNo === turSayisi - 1 ? "Bitir 🏁" : "Devam ▶";
    ileri.addEventListener("click", () => { turNo++; if (turNo < turSayisi) ciz(); else { const o = dogru / turSayisi; tamamla(durak, index, o >= 0.99 ? 3 : o >= 0.7 ? 2 : o >= 0.5 ? 1 : 0, dogru, turSayisi); } });
    gb.appendChild(ileri);
  }
  ciz(); window.scrollTo(0, 0);
}

// ---- SES YANKISI (dinle, sonra aynı sırayla harflere dokun) ----
function oyunYanki(durak, index) {
  const havuz = shuffleArr(durak.letters).slice(0, Math.min(5, Math.max(3, durak.letters.length)));
  const HEDEF = 5;
  let dizi = [], sira = 0, oyuncu = false, tur = 0, bitti = false;
  app.innerHTML = "";
  const wrap = document.createElement("div"); wrap.className = "ders-wrap"; wrap.appendChild(ustBaslik(durak));
  const bilgi = document.createElement("p"); bilgi.className = "oyun-aciklama"; bilgi.textContent = "Dinle, sonra aynı sırayla harflere dokun! 🎧"; wrap.appendChild(bilgi);
  const izgara = document.createElement("div"); izgara.className = "yanki-izgara"; wrap.appendChild(izgara);
  const durum = document.createElement("div"); durum.className = "retro-skor"; durum.textContent = "Tur: 1"; wrap.appendChild(durum);
  app.appendChild(wrap);
  const butonlar = havuz.map((h) => {
    const b = document.createElement("button"); b.className = "yanki-pad arabic"; b.textContent = h.glyph;
    izgara.appendChild(b); return { el: b, item: h };
  });
  function yak(i) {
    const b = butonlar[i].el; b.classList.add("aktif");
    seslendir(butonlar[i].item.glyph, arapcaAcik() ? "ar" : "tr");
    _gec(() => b.classList.remove("aktif"), 380);
  }
  function goster() {
    oyuncu = false; let k = 0;
    const t = _ara(() => { yak(dizi[k]); k++; if (k >= dizi.length) { clearInterval(t); _gec(() => { oyuncu = true; sira = 0; }, 480); } }, 820);
  }
  function yeniTur() { dizi.push(Math.floor(Math.random() * butonlar.length)); durum.textContent = "Tur: " + (tur + 1); _gec(goster, 480); }
  butonlar.forEach((b, i) => b.el.addEventListener("click", () => {
    if (!oyuncu || bitti) return;
    yak(i);
    if (i === dizi[sira]) {
      sira++;
      if (sira >= dizi.length) { oyuncu = false; tur++; sesDogru(); if (tur >= HEDEF) { bitti = true; return tamamla(durak, index, 3, tur, HEDEF, "Harika hafıza! 🎧🎉"); } yeniTur(); }
    } else { bitti = true; sesYanlis(); hataEkle(butonlar[dizi[sira]].item.name); const o = tur / HEDEF; tamamla(durak, index, o >= 0.7 ? 2 : o >= 0.4 ? 1 : 0, tur, HEDEF, "Dizi şaştı, tekrar dene!"); }
  }));
  wrap.querySelector(".geri") && wrap.querySelector(".geri").addEventListener("click", render);
  yeniTur(); window.scrollTo(0, 0);
}

// ---- HARF TOPLA (yönlendirmeli: hedef harfleri topla) ----
function oyunTopla(durak, index) {
  const pool = durak.pool || durak.letters;
  const hedef = rastgele(durak.letters);
  const N = 5, hedefSay = 4;
  const baska = shuffleArr(pool.filter((p) => p.name !== hedef.name));
  const hucreler = Array(N * N).fill(null);
  const yerler = shuffleArr([...Array(N * N).keys()].filter((i) => i !== 0));
  let yi = 0;
  for (let i = 0; i < hedefSay; i++) hucreler[yerler[yi++]] = { ...hedef, tip: "hedef" };
  for (let i = 0; i < 6 && baska.length; i++) hucreler[yerler[yi++]] = { ...baska[i % baska.length], tip: "yanlis" };
  let px = 0, py = 0, toplanan = 0, hata = 0, bitti = false;
  app.innerHTML = "";
  const wrap = document.createElement("div"); wrap.className = "ders-wrap"; wrap.appendChild(ustBaslik(durak));
  const bilgi = document.createElement("p"); bilgi.className = "oyun-aciklama"; bilgi.innerHTML = `Yönlendir, <b class="arabic">${hedef.glyph}</b> (${hedef.name}) harflerini topla! 🧭`; wrap.appendChild(bilgi);
  const grid = document.createElement("div"); grid.className = "topla-grid"; grid.style.gridTemplateColumns = `repeat(${N},1fr)`; wrap.appendChild(grid);
  const durum = document.createElement("div"); durum.className = "retro-skor"; wrap.appendChild(durum);
  app.appendChild(wrap);
  yonTuslari(wrap, hareket);
  function ciz() {
    grid.innerHTML = "";
    for (let i = 0; i < N * N; i++) {
      const c = document.createElement("div"); c.className = "topla-h";
      const x = i % N, y = Math.floor(i / N);
      if (x === px && y === py) { c.classList.add("oyuncu"); c.textContent = "🧒"; }
      else if (hucreler[i]) { c.classList.add("dolu", "arabic"); c.textContent = hucreler[i].glyph; }
      grid.appendChild(c);
    }
    durum.textContent = `Toplanan: ${toplanan}/${hedefSay}`;
  }
  function hareket(yon) {
    if (bitti) return;
    if (yon === "up" && py > 0) py--; else if (yon === "down" && py < N - 1) py++;
    else if (yon === "left" && px > 0) px--; else if (yon === "right" && px < N - 1) px++;
    const idx = py * N + px, c = hucreler[idx];
    if (c) {
      if (c.tip === "hedef") { toplanan++; sesDogru(); tonCal([660, 880]); }
      else { hata++; sesYanlis(); hataEkle(hedef.name); }
      hucreler[idx] = null;
    }
    ciz();
    if (toplanan >= hedefSay) { bitti = true; const y = hata === 0 ? 3 : hata <= 1 ? 2 : 1; _gec(() => tamamla(durak, index, y, toplanan, hedefSay, `Hepsini topladın! ${hata} yanlış`), 350); }
  }
  ciz(); window.scrollTo(0, 0);
}

// ---- KAYIP HARF (hangi harf kayboldu? görsel hafıza) ----
function oyunKayip(durak, index) {
  const kaynak = (durak.letters || []).concat(durak.pool || []).reduce((a, x) => { if (!a.find((y) => y.name === x.name)) a.push(x); return a; }, []);
  const turSayisi = 5;
  let turNo = 0, dogru = 0;
  app.innerHTML = "";
  const wrap = document.createElement("div"); wrap.className = "ders-wrap"; wrap.appendChild(ustBaslik(durak));
  const bilgi = document.createElement("p"); bilgi.className = "oyun-aciklama"; wrap.appendChild(bilgi);
  const satir = document.createElement("div"); satir.className = "kayip-satir"; wrap.appendChild(satir);
  const secAlan = document.createElement("div"); secAlan.className = "kayip-secenekler"; wrap.appendChild(secAlan);
  const gb = document.createElement("div"); gb.className = "geri-bildirim"; wrap.appendChild(gb);
  app.appendChild(wrap);
  function tur() {
    gb.innerHTML = ""; secAlan.innerHTML = "";
    const K = Math.min(5, Math.max(3, kaynak.length));
    const grup = shuffleArr(kaynak).slice(0, K);
    bilgi.textContent = "Harfleri ezberle... 👀";
    satir.innerHTML = ""; grup.forEach((g) => { const d = document.createElement("div"); d.className = "kayip-h arabic"; d.textContent = g.glyph; satir.appendChild(d); });
    _gec(() => {
      const kayipIdx = Math.floor(Math.random() * grup.length), kayip = grup[kayipIdx];
      bilgi.textContent = "Hangi harf kayboldu? 🤔";
      const cells = satir.querySelectorAll(".kayip-h");
      cells[kayipIdx].textContent = "❓"; cells[kayipIdx].classList.remove("arabic"); cells[kayipIdx].classList.add("bos");
      shuffleArr(grup).forEach((g) => { const b = document.createElement("button"); b.className = "kayip-sec arabic"; b.textContent = g.glyph; b.addEventListener("click", () => sec(g, kayip, b)); secAlan.appendChild(b); });
    }, 2300);
  }
  function sec(g, kayip, b) {
    secAlan.querySelectorAll(".kayip-sec").forEach((x) => (x.disabled = true));
    if (g.name === kayip.name) { dogru++; sesDogru(); b.classList.add("dogru"); gb.innerHTML = `<span class="iyi">Aferin! ${kayip.glyph} = ${kayip.name} 🎉</span>`; }
    else { sesYanlis(); hataEkle(kayip.name); b.classList.add("yanlis"); gb.innerHTML = `<span class="kotu">Kaybolan: ${kayip.glyph} (${kayip.name})</span>`; }
    const ileri = document.createElement("button"); ileri.className = "devam"; ileri.textContent = turNo === turSayisi - 1 ? "Bitir 🏁" : "Devam ▶";
    ileri.addEventListener("click", () => { turNo++; if (turNo < turSayisi) tur(); else { const o = dogru / turSayisi; tamamla(durak, index, o >= 0.99 ? 3 : o >= 0.6 ? 2 : o >= 0.4 ? 1 : 0, dogru, turSayisi); } });
    gb.appendChild(ileri);
  }
  tur(); window.scrollTo(0, 0);
}

// =====================================================================
//  RETRO EĞLENCE OYUNLARI (bölüm sonu, sadece eğlence, krediyle oynanır)
// =====================================================================
const RETRO_OYUNLAR = {
  snake: retroYilan, flappy: retroKus, breakout: retroTugla,
  shooter: retroUzay, simon: retroSimon,
};

// Ortak kabuk: üst çubuk + oyun alanı; "alan" elementini döndürür
function retroKabuk(baslik, altYazi) {
  zamanlayicilariTemizle();
  app.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "retro-wrap";
  wrap.innerHTML = `
    <div class="retro-ust">
      <button class="geri">← Çık</button>
      <span class="retro-baslik">${baslik}</span>
      <span class="retro-kredi">🎮 ${ILERLEME.kredi || 0}</span>
    </div>
    ${altYazi ? `<p class="retro-alt">${altYazi}</p>` : ""}
    <div class="retro-alan"></div>`;
  app.appendChild(wrap);
  wrap.querySelector(".geri").addEventListener("click", render);
  window.scrollTo(0, 0);
  return wrap.querySelector(".retro-alan");
}

// Oyun girişi: kredi kontrolü + krediyi düş + oyunu başlat
function oyunRetro(durak, index) {
  zamanlayicilariTemizle();
  const kredi = ILERLEME.kredi || 0;
  if (kredi < 1) return retroKrediYok(durak, index);
  ILERLEME.kredi = kredi - 1;
  ilerlemeKaydet(ILERLEME);
  const fn = RETRO_OYUNLAR[durak.retro] || retroYilan;
  fn(durak, index);
}

// Kredi yetersiz ekranı
function retroKrediYok(durak, index) {
  zamanlayicilariTemizle();
  app.innerHTML = "";
  const w = document.createElement("div");
  w.className = "test-wrap";
  const sonHint = "Kredi kazanmak için alıştırma çöz: her alıştırmayı <b>ilk oynayışta 1 🎮</b>, sonra <b>her 5 oynayışta 1 🎮</b> kazanırsın. Yeni bölümler geçtikçe kredin artar.";
  w.innerHTML = `
    <div class="sonuc tekrar">
      <div class="sonuc-emoji">🎮</div>
      <h2>Oyun Kredin Yok</h2>
      <p>Şu an <b>${ILERLEME.kredi || 0} 🎮</b> kredin var. Bu eğlence oyununu oynamak için <b>1 🎮</b> gerekir.</p>
      <p>${sonHint}</p>
      <div class="sonuc-butonlar">
        <button class="harita-btn">🗺️ Haritaya Dön</button>
      </div>
    </div>`;
  app.appendChild(w);
  w.querySelector(".harita-btn").addEventListener("click", render);
  window.scrollTo(0, 0);
}

// Oyun bitti ekranı (skor + krediyle tekrar oyna)
function retroBitti(durak, index, baslik, skorMetni) {
  zamanlayicilariTemizle();
  const kredi = ILERLEME.kredi || 0;
  app.innerHTML = "";
  const w = document.createElement("div");
  w.className = "test-wrap";
  w.innerHTML = `
    <div class="sonuc basarili">
      <div class="sonuc-emoji">🎮</div>
      <h2>${baslik}</h2>
      <p>${skorMetni}</p>
      <p>${kredi >= 1
        ? `Kalan kredi: <b>${kredi} 🎮</b>`
        : `Kredin bitti. Tekrar oynamak için yeni bölümler geç (her level 1 🎮).`}</p>
      <div class="sonuc-butonlar">
        ${kredi >= 1 ? `<button class="tekrar-btn">🔁 Tekrar Oyna (1 🎮)</button>` : ""}
        <button class="harita-btn">🗺️ Haritaya Dön</button>
      </div>
    </div>`;
  app.appendChild(w);
  const tb = w.querySelector(".tekrar-btn");
  if (tb) tb.addEventListener("click", () => oyunRetro(durak, index));
  w.querySelector(".harita-btn").addEventListener("click", render);
  konfetiPatlat();
  window.scrollTo(0, 0);
}

// Dokunmatik yön tuşları (D-pad) üretir
function yonTuslari(alan, onYon) {
  const pad = document.createElement("div");
  pad.className = "retro-dpad";
  [["up", "▲"], ["left", "◀"], ["right", "▶"], ["down", "▼"]].forEach(([yon, sim]) => {
    const b = document.createElement("button");
    b.className = "dbtn d-" + yon;
    b.textContent = sim;
    b.addEventListener("click", (e) => { e.preventDefault(); onYon(yon); });
    pad.appendChild(b);
  });
  alan.appendChild(pad);
  return pad;
}

// ---- 1) YILAN ----
function retroYilan(durak, index) {
  const alan = retroKabuk("🐍 Yılan", "Başlamak için dokun/yön ver • duvardan geçer, kendine çarpınca biter • ⭐ bonus topla!");
  const N = 15, CELL = 20, BOY = N * CELL;
  const cv = document.createElement("canvas");
  cv.width = BOY; cv.height = BOY; cv.className = "retro-canvas";
  alan.appendChild(cv);
  const ctx = cv.getContext("2d");
  const skorEl = document.createElement("div");
  skorEl.className = "retro-skor"; skorEl.textContent = "Skor: 0";
  alan.appendChild(skorEl);

  const GOVDE = ["#22c55e", "#10b981", "#14b8a6", "#06b6d4", "#3b82f6", "#8b5cf6"]; // renkli gövde
  let yilan = [{ x: 7, y: 7 }], dir = { x: 1, y: 0 }, nextDir = dir;
  let skor = 0, bitti = false, basladi = false, bekle = 165, renkKay = 0;
  let yem = yemKoy(), bonus = null;
  function yemKoy() {
    let p;
    do { p = { x: Math.floor(Math.random() * N), y: Math.floor(Math.random() * N) }; }
    while ((yilan && yilan.some((s) => s.x === p.x && s.y === p.y)) || (bonus && bonus.x === p.x && bonus.y === p.y));
    return p;
  }
  function ciz() {
    ctx.fillStyle = "#0b1220"; ctx.fillRect(0, 0, BOY, BOY);
    ctx.strokeStyle = "rgba(255,255,255,.05)"; ctx.lineWidth = 1;
    for (let i = 1; i < N; i++) { ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, BOY); ctx.moveTo(0, i * CELL); ctx.lineTo(BOY, i * CELL); ctx.stroke(); }
    ctx.font = CELL + "px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("🍎", yem.x * CELL + CELL / 2, yem.y * CELL + CELL / 2);
    if (bonus) { ctx.globalAlpha = (bonus.omur < 12 && bonus.omur % 2) ? 0.35 : 1; ctx.fillText(bonus.emoji, bonus.x * CELL + CELL / 2, bonus.y * CELL + CELL / 2); ctx.globalAlpha = 1; }
    yilan.forEach((s, i) => {
      ctx.fillStyle = i === 0 ? "#fde047" : GOVDE[(i + renkKay) % GOVDE.length];
      ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2);
    });
    if (!basladi) {
      ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.fillRect(0, 0, BOY, BOY);
      ctx.fillStyle = "#fff"; ctx.font = "bold 18px sans-serif";
      ctx.fillText("Başlamak için", BOY / 2, BOY / 2 - 12);
      ctx.fillText("dokun / yön ver ▶", BOY / 2, BOY / 2 + 14);
    }
  }
  function adim() {
    if (bitti) return;
    dir = nextDir;
    const bas = { x: (yilan[0].x + dir.x + N) % N, y: (yilan[0].y + dir.y + N) % N }; // duvardan geç (sarmal)
    if (yilan.some((s) => s.x === bas.x && s.y === bas.y)) { // sadece kendine çarpınca biter
      bitti = true; sesYanlis();
      return retroBitti(durak, index, "Oyun Bitti", `🍎 Skor: ${skor}`);
    }
    yilan.unshift(bas);
    let yedi = false;
    if (bas.x === yem.x && bas.y === yem.y) {
      skor++; tonCal([660]); yem = yemKoy(); yedi = true; renkKay = (renkKay + 1) % GOVDE.length;
      bekle = Math.max(70, 165 - skor * 6); // her yemde hızlan
      if (!bonus && skor % 4 === 0) { const p = yemKoy(); bonus = { x: p.x, y: p.y, omur: 38, emoji: "⭐", puan: 5 }; }
    }
    if (bonus && bas.x === bonus.x && bas.y === bonus.y) { skor += bonus.puan; tonCal([880, 1040]); bonus = null; yedi = true; } // bonus = ekstra büyüme
    if (!yedi) yilan.pop();
    if (bonus) { bonus.omur--; if (bonus.omur <= 0) bonus = null; }
    skorEl.textContent = "Skor: " + skor;
    ciz();
  }
  function dongu() { if (bitti || !basladi) return; adim(); if (!bitti) _gec(dongu, bekle); }
  function basla() { if (!basladi && !bitti) { basladi = true; ciz(); dongu(); } }
  function yon(y) {
    if (y === "up" && dir.y === 0) nextDir = { x: 0, y: -1 };
    else if (y === "down" && dir.y === 0) nextDir = { x: 0, y: 1 };
    else if (y === "left" && dir.x === 0) nextDir = { x: -1, y: 0 };
    else if (y === "right" && dir.x === 0) nextDir = { x: 1, y: 0 };
    basla();
  }
  yonTuslari(alan, yon);
  cv.addEventListener("pointerdown", (e) => { e.preventDefault(); basla(); });
  document.onkeydown = (e) => {
    const m = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
    if (m[e.key]) { e.preventDefault(); yon(m[e.key]); }
  };
  ciz(); // başlamadan önce "dokun" ekranı
}

// ---- 2) UÇAN KUŞ (flappy) ----
function retroKus(durak, index) {
  const alan = retroKabuk("🐤 Uçan Kuş", "Ekrana dokun; ilerledikçe borular hızlanır ve daralır!");
  const W = 300, H = 420;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H; cv.className = "retro-canvas";
  alan.appendChild(cv);
  const ctx = cv.getContext("2d");

  let y = H / 2, vy = 0, skor = 0, bitti = false, basladi = false;
  const G = 0.5, ZIPLA = -7.5, R = 14, GENIS = 46;
  const gapBoyu = () => Math.max(96, 150 - skor * 4);   // boşluk daralır
  const hizBoyu = () => Math.min(6, 2.3 + skor * 0.18); // borular hızlanır
  let borular = [{ x: W, bos: 130, gap: gapBoyu() }];
  function zipla() { if (bitti) return; if (!basladi) basladi = true; vy = ZIPLA; tonCal([520]); }
  cv.addEventListener("pointerdown", (e) => { e.preventDefault(); zipla(); });
  document.onkeydown = (e) => { if (e.key === " " || e.key === "ArrowUp") { e.preventDefault(); zipla(); } };

  function adim() {
    if (bitti) return;
    if (!basladi) { // ilk dokunuşu bekle: kuş süzülür, boru gelmez
      ctx.fillStyle = "#7dd3fc"; ctx.fillRect(0, 0, W, H);
      ctx.font = "26px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("🐤", 60, y);
      ctx.fillStyle = "#1e3a5f"; ctx.font = "bold 18px sans-serif";
      ctx.fillText("Başlamak için dokun", W / 2, H / 2);
      return;
    }
    const hiz = hizBoyu();
    vy += G; y += vy;
    borular.forEach((b) => (b.x -= hiz));
    if (borular[borular.length - 1].x < W - 165) {
      const g = gapBoyu();
      borular.push({ x: W + 20, bos: 45 + Math.random() * (H - g - 95), gap: g });
    }
    borular = borular.filter((b) => b.x > -GENIS);
    for (const b of borular) {
      if (!b.gecti && b.x + GENIS < 60) { b.gecti = true; skor++; tonCal([700]); }
      if (60 + R > b.x && 60 - R < b.x + GENIS && (y - R < b.bos || y + R > b.bos + b.gap)) {
        bitti = true; sesYanlis();
        return retroBitti(durak, index, "Oyun Bitti", `🐤 Skor: ${skor}`);
      }
    }
    if (y + R > H || y - R < 0) {
      bitti = true; sesYanlis();
      return retroBitti(durak, index, "Oyun Bitti", `🐤 Skor: ${skor}`);
    }
    ctx.fillStyle = "#7dd3fc"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#16a34a";
    borular.forEach((b) => { ctx.fillRect(b.x, 0, GENIS, b.bos); ctx.fillRect(b.x, b.bos + b.gap, GENIS, H); });
    ctx.font = "26px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("🐤", 60, y);
    ctx.fillStyle = "#1e3a5f"; ctx.font = "bold 24px sans-serif";
    ctx.fillText(skor, W / 2, 30);
  }
  _ara(adim, 24);
}

// ---- 3) TUĞLA KIR (breakout) ----
function retroTugla(durak, index) {
  const alan = retroKabuk("🧱 Tuğla Kır", "Parmağını SÜRÜKLE • düşen bonusları yakala: 🟦 geniş, ⭐ puan, 🐢 yavaş!");
  const W = 300, H = 380;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H; cv.className = "retro-canvas";
  alan.appendChild(cv);
  const ctx = cv.getContext("2d");

  const PW0 = 64, PH = 12, BR = 7;
  let PW = PW0, genisKalan = 0;
  let px = W / 2 - PW / 2;
  let bx = W / 2, by = H - 40, bvx = 2.6, bvy = -3.2, skor = 0, bitti = false;
  let dususler = []; // düşen bonuslar
  const BONUSLAR = [
    { e: "🟦", t: "genis", renk: "#60a5fa" },  // çubuğu genişlet
    { e: "⭐", t: "puan", renk: "#fbbf24" },   // +5 puan
    { e: "🐢", t: "yavas", renk: "#34d399" },  // topu yavaşlat
  ];
  const renkSat = ["#ef4444", "#f59e0b", "#fbbf24", "#34d399", "#60a5fa"];
  let tuglalar = [];
  const SUT = 5, KOL = 6, TG = 44, TH = 16, UST = 30, BOSL = 4;
  for (let r = 0; r < SUT; r++) for (let c = 0; c < KOL; c++)
    tuglalar.push({ x: 8 + c * (TG + BOSL), y: UST + r * (TH + BOSL), r, kirik: false });

  // Parmakla sürükleyerek çubuğu hareket ettir (çubuk merkezi parmağı takip eder)
  let suruk = false;
  function tasi(clientX) {
    const rect = cv.getBoundingClientRect();
    px = (clientX - rect.left) * (W / rect.width) - PW / 2;
    px = Math.max(0, Math.min(W - PW, px));
  }
  cv.addEventListener("pointerdown", (e) => { e.preventDefault(); suruk = true; try { cv.setPointerCapture(e.pointerId); } catch {} tasi(e.clientX); });
  cv.addEventListener("pointermove", (e) => { if (suruk) { e.preventDefault(); tasi(e.clientX); } });
  cv.addEventListener("pointerup", () => { suruk = false; });
  cv.addEventListener("pointercancel", () => { suruk = false; });

  // Topun hızını (yönü koruyarak) belirli bir büyüklüğe çek
  function hizla(faktor) {
    const m = Math.hypot(bvx, bvy) || 1;
    const yeni = Math.min(7.2, m * faktor);
    bvx = (bvx / m) * yeni; bvy = (bvy / m) * yeni;
  }

  function adim() {
    if (bitti) return;
    if (genisKalan > 0) { genisKalan--; if (genisKalan === 0) { px += (PW - PW0) / 2; PW = PW0; } }
    bx += bvx; by += bvy;
    if (bx - BR < 0 || bx + BR > W) bvx = -bvx;
    if (by - BR < 0) bvy = -bvy;
    if (by + BR >= H - PH - 4 && bx > px && bx < px + PW && bvy > 0) {
      bvy = -Math.abs(bvy); bvx += ((bx - (px + PW / 2)) / (PW / 2)) * 2; tonCal([440]);
    }
    if (by - BR > H) { bitti = true; sesYanlis(); return retroBitti(durak, index, "Oyun Bitti", `🧱 ${skor} tuğla kırdın!`); }
    for (const t of tuglalar) {
      if (t.kirik) continue;
      if (bx + BR > t.x && bx - BR < t.x + TG && by + BR > t.y && by - BR < t.y + TH) {
        t.kirik = true; bvy = -bvy; skor++; tonCal([600 + t.r * 40]); hizla(1.035);
        if (Math.random() < 0.22) { const b = BONUSLAR[Math.floor(Math.random() * BONUSLAR.length)]; dususler.push({ x: t.x + TG / 2, y: t.y + TH, ...b }); }
        break;
      }
    }
    // düşen bonuslar
    dususler.forEach((d) => (d.y += 2.4));
    for (const d of dususler) {
      if (!d.al && d.y >= H - PH - 8 && d.x > px && d.x < px + PW) {
        d.al = true;
        if (d.t === "genis") { if (genisKalan === 0) px -= (96 - PW0) / 2; PW = 96; genisKalan = 420; tonCal([700, 900]); }
        else if (d.t === "puan") { skor += 5; tonCal([1000]); }
        else { hizla(0.8); tonCal([300, 360]); }
      }
    }
    dususler = dususler.filter((d) => !d.al && d.y < H + 16);
    if (tuglalar.every((t) => t.kirik)) { bitti = true; return retroBitti(durak, index, "Kazandın! 🎉", `🧱 Tüm tuğlaları kırdın! Skor: ${skor}`); }
    ctx.fillStyle = "#0f172a"; ctx.fillRect(0, 0, W, H);
    tuglalar.forEach((t) => { if (!t.kirik) { ctx.fillStyle = renkSat[t.r]; ctx.fillRect(t.x, t.y, TG, TH); } });
    ctx.font = "16px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    dususler.forEach((d) => ctx.fillText(d.e, d.x, d.y));
    ctx.fillStyle = genisKalan > 0 ? "#60a5fa" : "#e2e8f0"; ctx.fillRect(px, H - PH - 4, PW, PH);
    ctx.beginPath(); ctx.arc(bx, by, BR, 0, 7); ctx.fillStyle = "#fbbf24"; ctx.fill();
    ctx.fillStyle = "#e2e8f0"; ctx.font = "bold 14px sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.fillText("Skor: " + skor, 8, 16);
  }
  _ara(adim, 18);
}

// ---- 4) UZAY ATIŞI (shooter) ----
function retroUzay(durak, index) {
  const alan = retroKabuk("🚀 Uzay Atışı", "Gemiyi SÜRÜKLE • otomatik ateş • ⚙️ silahını geliştir, ⭐ puan, ❤️ can topla!");
  const W = 300, H = 420;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H; cv.className = "retro-canvas";
  alan.appendChild(cv);
  const ctx = cv.getContext("2d");

  let gx = W / 2, skor = 0, can = 3, bitti = false, silah = 1;
  let mermiler = [], taslar = [], oduller = [], sayac = 0;
  const ODULLER = [
    { e: "⚙️", t: "silah" }, // silahı geliştir (Lv1→2→3)
    { e: "⭐", t: "puan" },  // +5 puan
    { e: "❤️", t: "can" },   // +1 can (en çok 5)
  ];
  // Parmakla sürükleyerek gemiyi hareket ettir
  let suruk = false;
  function tasi(clientX) {
    const rect = cv.getBoundingClientRect();
    gx = (clientX - rect.left) * (W / rect.width);
    gx = Math.max(16, Math.min(W - 16, gx));
  }
  function ates() {
    if (bitti) return;
    tonCal([880]);
    if (silah <= 1) mermiler.push({ x: gx, y: H - 40, vx: 0 });
    else if (silah === 2) { mermiler.push({ x: gx - 8, y: H - 40, vx: 0 }); mermiler.push({ x: gx + 8, y: H - 40, vx: 0 }); }
    else { mermiler.push({ x: gx, y: H - 42, vx: 0 }); mermiler.push({ x: gx - 9, y: H - 38, vx: -1.7 }); mermiler.push({ x: gx + 9, y: H - 38, vx: 1.7 }); }
  }
  cv.addEventListener("pointerdown", (e) => { e.preventDefault(); suruk = true; try { cv.setPointerCapture(e.pointerId); } catch {} tasi(e.clientX); });
  cv.addEventListener("pointermove", (e) => { if (suruk) { e.preventDefault(); tasi(e.clientX); } });
  cv.addEventListener("pointerup", () => { suruk = false; });
  cv.addEventListener("pointercancel", () => { suruk = false; });

  function adim() {
    if (bitti) return;
    sayac++;
    const atesHer = 14;                                     // otomatik ateş aralığı
    const spawnHer = Math.max(11, 28 - Math.floor(skor / 2)); // skor arttıkça sık taş
    if (sayac % atesHer === 0) ates();
    if (sayac % spawnHer === 0) taslar.push({ x: 20 + Math.random() * (W - 40), y: -16, hiz: 1.3 + Math.random() * 1.5 + skor * 0.04 });
    if (sayac % 175 === 30) { const o = ODULLER[Math.floor(Math.random() * ODULLER.length)]; oduller.push({ x: 20 + Math.random() * (W - 40), y: -16, e: o.e, t: o.t }); }
    mermiler.forEach((m) => { m.y -= 7; m.x += m.vx || 0; });
    mermiler = mermiler.filter((m) => m.y > -10 && m.x > -10 && m.x < W + 10);
    taslar.forEach((t) => (t.y += t.hiz));
    for (const t of taslar) {
      for (const m of mermiler) {
        if (!t.vur && Math.abs(m.x - t.x) < 16 && Math.abs(m.y - t.y) < 16) { t.vur = true; m.vur = true; skor++; tonCal([520]); }
      }
      if (!t.vur && t.y > H) { t.vur = true; can--; sesYanlis(); if (can <= 0) { bitti = true; return retroBitti(durak, index, "Oyun Bitti", `🚀 ${skor} göktaşı vurdun!`); } }
    }
    // düşen ödüller — gemiye değince toplanır
    oduller.forEach((o) => (o.y += 2.3));
    for (const o of oduller) {
      if (!o.al && o.y > H - 42 && Math.abs(o.x - gx) < 22) {
        o.al = true;
        if (o.t === "silah") { silah = Math.min(3, silah + 1); tonCal([700, 900, 1100]); }
        else if (o.t === "puan") { skor += 5; tonCal([1000]); }
        else { can = Math.min(5, can + 1); tonCal([600, 800]); }
      }
    }
    oduller = oduller.filter((o) => !o.al && o.y < H + 16);
    taslar = taslar.filter((t) => !t.vur && t.y < H + 20);
    mermiler = mermiler.filter((m) => !m.vur);
    ctx.fillStyle = "#0b1026"; ctx.fillRect(0, 0, W, H);
    ctx.font = "26px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    taslar.forEach((t) => ctx.fillText("☄️", t.x, t.y));
    ctx.font = "20px serif"; oduller.forEach((o) => ctx.fillText(o.e, o.x, o.y));
    ctx.fillStyle = silah >= 3 ? "#f472b6" : silah === 2 ? "#fbbf24" : "#7dd3fc";
    mermiler.forEach((m) => ctx.fillRect(m.x - 2, m.y, 4, 10));
    ctx.font = "28px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("🚀", gx, H - 24);
    ctx.fillStyle = "#e2e8f0"; ctx.font = "bold 16px sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.fillText("Skor: " + skor + "  🔫Lv" + silah, 8, 18);
    ctx.textAlign = "right"; ctx.fillText("❤️".repeat(Math.max(0, can)), W - 8, 18);
  }
  _ara(adim, 24);
}

// ---- 5) HAFIZA DİZİSİ (simon) ----
function retroSimon(durak, index) {
  const alan = retroKabuk("🎵 Hafıza Dizisi", "Yanan renk sırasını izle, sonra aynısına dokun!");
  const renkler = [
    { ad: "ye", renk: "#22c55e", ton: 392 },
    { ad: "kr", renk: "#ef4444", ton: 523 },
    { ad: "ma", renk: "#3b82f6", ton: 330 },
    { ad: "sa", renk: "#facc15", ton: 659 },
  ];
  const izgara = document.createElement("div");
  izgara.className = "simon-izgara";
  const padlar = renkler.map((r) => {
    const b = document.createElement("button");
    b.className = "simon-pad"; b.style.background = r.renk; b.dataset.ad = r.ad;
    izgara.appendChild(b); return b;
  });
  const durum = document.createElement("div");
  durum.className = "retro-skor"; durum.textContent = "Tur: 1";
  alan.appendChild(izgara); alan.appendChild(durum);

  let dizi = [], sira = 0, oyuncuSira = false, skor = 0;
  function yak(i, sure) {
    const p = padlar[i]; p.classList.add("aktif"); tonCal([renkler[i].ton]);
    _gec(() => p.classList.remove("aktif"), sure || 320);
  }
  function gosterDizi() {
    oyuncuSira = false; let k = 0;
    const araMs = Math.max(280, 640 - dizi.length * 28); // tur ilerledikçe hızlanır
    const yanma = Math.max(180, araMs - 120);
    const t = _ara(() => {
      yak(dizi[k], yanma); k++;
      if (k >= dizi.length) { clearInterval(t); _gec(() => { oyuncuSira = true; sira = 0; }, 420); }
    }, araMs);
  }
  function yeniTur() {
    dizi.push(Math.floor(Math.random() * 4));
    durum.textContent = "Tur: " + dizi.length;
    _gec(gosterDizi, 600);
  }
  padlar.forEach((p, i) => p.addEventListener("click", () => {
    if (!oyuncuSira) return;
    yak(i);
    if (i === dizi[sira]) {
      sira++;
      if (sira >= dizi.length) { skor++; oyuncuSira = false; yeniTur(); }
    } else {
      oyuncuSira = false; sesYanlis();
      retroBitti(durak, index, "Oyun Bitti", `🎵 ${dizi.length - 1} turluk diziyi hatırladın!`);
    }
  }));
  yeniTur();
}

// ---- Konfeti efekti ----
function konfetiPatlat() {
  const renkler = ["#f87171", "#fbbf24", "#34d399", "#60a5fa", "#a78bfa", "#f472b6"];
  for (let i = 0; i < 40; i++) {
    const k = document.createElement("div");
    k.className = "konfeti";
    k.style.left = Math.random() * 100 + "vw";
    k.style.background = renkler[Math.floor(Math.random() * renkler.length)];
    k.style.animationDelay = Math.random() * 0.5 + "s";
    document.body.appendChild(k);
    setTimeout(() => k.remove(), 2500);
  }
}

// Başlat
harekeBoyaBaslat(); // harekeleri kırmızı göster (gözlemci)
render();
