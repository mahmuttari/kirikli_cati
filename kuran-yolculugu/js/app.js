/*
 * Kur'an Yolculuğu - Uygulama Mantığı
 * Harita + farklı öğrenme biçimleri (ders, eşleştirme, dinle-bul, hafıza, harf izi, sure).
 */

const STORAGE_KEY = "kuranYolculugu_v1";

// ---- İlerleme (localStorage) ----
function ilerlemeYukle() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { tamamlanan: {}, yildiz: {} };
  } catch {
    return { tamamlanan: {}, yildiz: {} };
  }
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
function durakAcikMi(index) {
  if (index === 0) return true;
  return !!ILERLEME.tamamlanan[DURAKLAR[index - 1].id];
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

function render() {
  zamanlayicilariTemizle();
  if (typeof tilavetDurdur === "function") tilavetDurdur();
  ILERLEME = ilerlemeYukle();
  app.innerHTML = "";
  app.appendChild(haritaEkrani());
  window.scrollTo(0, 0);
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
    case "timed":     return oyunSimsek(durak, index);
    case "yaris":     return oyunYaris(durak, index);
    case "random":    return oyunRandom(durak, index);
    case "quiz":      return testeGir(durak, index);
    case "sure":      return sureEkrani(durak, index);
    default:          return derseGir(durak, index);
  }
}

// 🎁 SÜRPRİZ: tek dokunuşta rastgele EĞLENCELİ bir oyun gelir (içerik de rastgele)
const SURPRIZ_OYUNLAR_VAR = {
  yaris: oyunYaris, catch: oyunYakala, balloon: oyunBalon, mole: oyunKostebek,
  avla: oyunAvla, truefalse: oyunDogruYanlis, memory: oyunMemory, listen: oyunListen,
  match: oyunMatch, riddle: oyunBilmece,
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
    <div class="yildiz-sayac">⭐ <span>${toplamYildiz()}</span></div>
  `;
  bar.querySelector(".profil-btn").addEventListener("click", profilEkrani);
  wrap.appendChild(bar);

  const intro = document.createElement("p");
  intro.className = "intro";
  intro.textContent = "Haritada ilerle, harfleri öğren, oyunlar oyna, yıldızları topla! 🎉";
  wrap.appendChild(intro);

  const yol = document.createElement("div");
  yol.className = "yol";

  let sonBolgeId = null;
  DURAKLAR.forEach((durak, i) => {
    if (durak.bolge.id !== sonBolgeId) {
      const bb = document.createElement("div");
      bb.className = "bolge-baslik";
      bb.style.background = durak.bolge.color;
      bb.innerHTML = `<span>${durak.bolge.name}</span>`;
      // Bölüm kilitliyse "Sınavla Atla" butonu (iyi bilenler için)
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

    const node = document.createElement("button");
    node.className = "durak " + (i % 2 === 0 ? "sol" : "sag");
    node.classList.add(tamam ? "tamam" : acik ? "acik" : "kilitli");
    node.disabled = !acik;
    node.innerHTML = `
      <span class="durak-tip">${tipEtiketi(durak.type)}</span>
      <span class="durak-emoji">${acik ? durak.emoji : "🔒"}</span>
      <span class="durak-isim">${durak.title}</span>
      <span class="durak-yildiz">${"⭐".repeat(yildiz)}${"☆".repeat(3 - yildiz)}</span>
    `;
    node.addEventListener("click", () => { if (acik) durakAc(durak, i); });
    yol.appendChild(node);
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
function tamamla(durak, index, yildiz, dogru, toplam, mesaj) {
  zamanlayicilariTemizle();
  if (yildiz >= 1) {
    ILERLEME.tamamlanan[durak.id] = true;
    ILERLEME.yildiz[durak.id] = Math.max(ILERLEME.yildiz[durak.id] || 0, yildiz);
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
  // Havuz: hedef bölge dâhil, ondan önceki çekirdek "okuma" bölgeleri
  const havuzMap = new Map();
  for (let bi = 0; bi < BOLGELER.length; bi++) {
    const b = BOLGELER[bi];
    if (idArapca(b.id)) bolgeTestOgeleri(b).forEach((it) => { if (!havuzMap.has(it.name)) havuzMap.set(it.name, it); });
    if (b.id === bolge.id) break;
  }
  const havuz = [...havuzMap.values()];
  if (havuz.length < 3) { alert("Bu bölüm için sınav oluşturulamadı."); return; }
  // Daha kapsayıcı ve zor: çok soru + 4 şık + toplam süre
  const soruSay = Math.min(24, Math.max(15, havuz.length));
  const secilen = (havuz.length >= soruSay ? shuffleArr(havuz).slice(0, soruSay)
                                            : Array.from({ length: soruSay }, () => rastgele(havuz)));
  const sorular = secilen.map((it) => {
    const yanlis = shuffleArr(havuz.filter((h) => h.name !== it.name)).slice(0, 3).map((h) => h.name);
    return { glyph: it.glyph, a: it.name, options: shuffleArr([it.name, ...yanlis]) };
  });
  const toplamSure = soruSay * 4; // saniye (belli sürede bitirilmeli)
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
      <p class="oyun-aciklama">⏭️ Atlama Sınavı — geçmek için %95 (en çok 1 yanlış) ve süreyi geçmemek</p>
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
    _gec(() => { if (bittiBayrak) return; i++; if (i < sorular.length) ciz(); else bitir(false); }, 650); // otomatik ilerle (süre baskısı)
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
render();
