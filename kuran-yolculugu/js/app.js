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

function seslendir(metin) {
  // 1) Native uygulama (Capacitor) -> cihazın kendi TTS motoru (WebView'de en güvenilir yol)
  const cap = window.Capacitor;
  if (cap && cap.Plugins && cap.Plugins.TextToSpeech) {
    try {
      cap.Plugins.TextToSpeech.stop().catch(() => {});
      cap.Plugins.TextToSpeech.speak({
        text: metin, lang: "tr-TR", rate: 1.0, pitch: 1.1, volume: 1.0, category: "playback",
      }).catch(() => {});
      return;
    } catch {}
  }
  // 2) Tarayıcı -> Web Speech API
  if ("speechSynthesis" in window) {
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(metin);
      const tr = _sesler.find((v) => /tr/i.test(v.lang));
      if (tr) u.voice = tr;
      u.lang = "tr-TR"; u.rate = 0.9; u.pitch = 1.1;
      speechSynthesis.speak(u);
    } catch {}
  }
}

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

// Durak tipine göre doğru ekranı açan dağıtıcı
function durakAc(durak, index) {
  zamanlayicilariTemizle();
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
    case "quiz":      return testeGir(durak, index);
    case "sure":      return sureEkrani(durak, index);
    default:          return derseGir(durak, index);
  }
}

// Durak tipine göre küçük etiket
function tipEtiketi(type) {
  return {
    lesson: "📖 Öğren", quiz: "🏅 Sınav", match: "🧩 Eşleştir", listen: "👂 Dinle-Bul",
    memory: "🃏 Hafıza", trace: "🖊️ Çizme", balloon: "🎈 Balon", mole: "🐹 Köstebek",
    truefalse: "⚡ Doğru mu?", riddle: "🧠 Bilmece", fill: "📝 Boşluk", sure: "📖 Sure",
  }[type] || "📚 Ders";
}

// ---- HARİTA EKRANI ----
function haritaEkrani() {
  const wrap = document.createElement("div");
  wrap.className = "harita-wrap";

  const bar = document.createElement("div");
  bar.className = "topbar";
  bar.innerHTML = `
    <div class="logo">🕌 Kur'an Yolculuğu</div>
    <div class="yildiz-sayac">⭐ <span>${toplamYildiz()}</span></div>
  `;
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
      bb.textContent = durak.bolge.name;
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
    const k = durak.cards[kartNo];
    kartAlan.innerHTML = `
      <div class="flashcard">
        <div class="harf-buyuk">${k.glyph}</div>
        <div class="harf-ad">${k.name}</div>
        <div class="harf-ipucu">${k.hint || ""}</div>
        <button class="dinle">🔊 Dinle</button>
      </div>`;
    kartAlan.querySelector(".dinle").addEventListener("click", () => seslendir(k.name));
    seslendir(k.name);
    altBar.querySelector(".kart-sayac").textContent = `${kartNo + 1} / ${durak.cards.length}`;
    altBar.querySelector(".onceki").disabled = kartNo === 0;
    altBar.querySelector(".sonraki").textContent =
      kartNo === durak.cards.length - 1
        ? (durak.quiz ? "Teste Geç ✏️" : "Bitir 🏁")
        : "İleri ▶";
  }

  altBar.querySelector(".onceki").addEventListener("click", () => { if (kartNo > 0) { kartNo--; kartCiz(); } });
  altBar.querySelector(".sonraki").addEventListener("click", () => {
    if (kartNo < durak.cards.length - 1) { kartNo++; kartCiz(); }
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
      btn.classList.add("yanlis"); sesYanlis();
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
    seslendir(p.name);
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
    alan.querySelector(".buyuk-dinle").addEventListener("click", () => seslendir(hedef.name));
    seslendir(hedef.name);
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
      btn.classList.add("yanlis"); sesYanlis();
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
  aciklama.textContent = "Kartları çevir, harfi ismiyle eşleştir! 🃏";
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

// ---- HARF İZİ (parmakla/fareyle çizme) ----
function oyunTrace(durak, index) {
  let kartNo = 0;
  app.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "ders-wrap";
  wrap.appendChild(ustBaslik(durak));
  const aciklama = document.createElement("p");
  aciklama.className = "oyun-aciklama";
  aciklama.textContent = "Harfin üzerinden parmağınla (veya fareyle) geçerek çiz! ✏️";
  wrap.appendChild(aciklama);
  const alan = document.createElement("div");
  wrap.appendChild(alan);
  app.appendChild(wrap);

  function ciz() {
    const k = durak.cards[kartNo];
    alan.innerHTML = `
      <div class="trace-kutu">
        <div class="trace-harf">${k.glyph}</div>
        <canvas class="trace-canvas" width="300" height="300"></canvas>
      </div>
      <div class="trace-ad">${k.name} <button class="dinle-mini">🔊</button></div>
      <div class="kart-nav">
        <button class="temizle">🧽 Temizle</button>
        <span class="kart-sayac">${kartNo + 1} / ${durak.cards.length}</span>
        <button class="sonraki">${kartNo === durak.cards.length - 1 ? "Bitir 🏁" : "Sonraki ▶"}</button>
      </div>`;
    alan.querySelector(".dinle-mini").addEventListener("click", () => seslendir(k.name));
    seslendir(k.name);

    const canvas = alan.querySelector(".trace-canvas");
    const ctx = canvas.getContext("2d");
    ctx.lineWidth = 14; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#38bdf8";
    let ciziyor = false;
    const nokta = (e) => {
      const r = canvas.getBoundingClientRect();
      const t = e.touches ? e.touches[0] : e;
      return { x: (t.clientX - r.left) * (canvas.width / r.width), y: (t.clientY - r.top) * (canvas.height / r.height) };
    };
    const basla = (e) => { e.preventDefault(); ciziyor = true; const p = nokta(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
    const devam = (e) => { if (!ciziyor) return; e.preventDefault(); const p = nokta(e); ctx.lineTo(p.x, p.y); ctx.stroke(); };
    const bitir = () => { ciziyor = false; };
    canvas.addEventListener("mousedown", basla); canvas.addEventListener("mousemove", devam);
    window.addEventListener("mouseup", bitir);
    canvas.addEventListener("touchstart", basla, { passive: false });
    canvas.addEventListener("touchmove", devam, { passive: false });
    canvas.addEventListener("touchend", bitir);

    alan.querySelector(".temizle").addEventListener("click", () => ctx.clearRect(0, 0, canvas.width, canvas.height));
    alan.querySelector(".sonraki").addEventListener("click", () => {
      tonCal([523]);
      if (kartNo < durak.cards.length - 1) { kartNo++; ciz(); }
      else tamamla(durak, index, 3, 0, 0, "Tüm harfleri çizdin! ✏️🎉");
    });
  }
  ciz();
  window.scrollTo(0, 0);
}

// ---- SURE OKUMA EKRANI (kelime kelime) ----
function sureEkrani(durak, index) {
  const s = durak.sure;
  let ayetNo = 0;
  app.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "ders-wrap";
  wrap.appendChild(ustBaslik(durak));
  const bilgi = document.createElement("p");
  bilgi.className = "oyun-aciklama";
  bilgi.textContent = s.bilgi;
  wrap.appendChild(bilgi);
  const alan = document.createElement("div");
  wrap.appendChild(alan);
  app.appendChild(wrap);

  function ciz() {
    const a = s.ayetler[ayetNo];
    alan.innerHTML = `
      <div class="sure-kart">
        <div class="sure-no">${ayetNo + 1}. âyet</div>
        <div class="sure-arapca">${a.glyph}</div>
        <div class="sure-okunus">${a.okunus}</div>
        <div class="sure-meal">“${a.meal}”</div>
        <button class="dinle">🔊 Oku</button>
      </div>
      <div class="kart-nav">
        <button class="onceki" ${ayetNo === 0 ? "disabled" : ""}>◀ Geri</button>
        <span class="kart-sayac">${ayetNo + 1} / ${s.ayetler.length}</span>
        <button class="sonraki">${ayetNo === s.ayetler.length - 1 ? "Bitir 🏁" : "İleri ▶"}</button>
      </div>`;
    alan.querySelector(".dinle").addEventListener("click", () => seslendir(a.okunus));
    seslendir(a.okunus);
    alan.querySelector(".onceki").addEventListener("click", () => { if (ayetNo > 0) { ayetNo--; ciz(); } });
    alan.querySelector(".sonraki").addEventListener("click", () => {
      if (ayetNo < s.ayetler.length - 1) { ayetNo++; ciz(); }
      else tamamla(durak, index, 3, 0, 0, `${s.ad}'ni okudun! 📖🎉`);
    });
  }
  ciz();
  window.scrollTo(0, 0);
}

// ---- BALON PATLATMA (hedef harfi patlat) ----
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

  function dalga(hedef) {
    gok.innerHTML = "";
    let cozuldu = false;
    const distract = shuffleArr(pool.filter((p) => p.name !== hedef.name)).slice(0, 4);
    const balonlar = shuffleArr([hedef, ...distract]);
    const n = balonlar.length;
    balonlar.forEach((b, k) => {
      const el = document.createElement("button");
      el.className = "balon";
      el.style.left = (5 + k * (90 / n) + Math.random() * 5) + "%";
      el.style.background = rastgeleRenk();
      el.style.animationDuration = (4.6 + Math.random() * 2) + "s";
      el.innerHTML = `<span class="balon-ic">${b.glyph}</span><span class="balon-ip"></span>`;
      el.addEventListener("click", () => {
        if (cozuldu) return;
        if (b.name === hedef.name) {
          cozuldu = true;
          el.classList.add("pat"); sesDogru(); basari++;
          _gec(() => { tur++; tur >= turSayisi ? bitir() : sonraki(); }, 380);
        } else {
          sesYanlis(); el.classList.add("salla");
          _gec(() => el.classList.remove("salla"), 400);
        }
      });
      gok.appendChild(el);
    });
    // tüm balonlar kaçarsa hedefi yeniden gönder
    _gec(() => { if (!cozuldu) dalga(hedef); }, 7000);
  }

  function sonraki() {
    const hedef = hedefSira[tur % hedefSira.length];
    hedefBar.innerHTML = `🎯 Patlat: <b>${hedef.name}</b> <button class="mini-dinle">🔊</button> <span class="sayac">${tur + 1}/${turSayisi}</span>`;
    hedefBar.querySelector(".mini-dinle").addEventListener("click", () => seslendir(hedef.name));
    seslendir(hedef.name);
    dalga(hedef);
  }

  function bitir() {
    const oran = basari / turSayisi;
    tamamla(durak, index, oran >= 0.99 ? 3 : oran >= 0.6 ? 2 : 1, basari, turSayisi);
  }

  sonraki();
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
    hedefBar.querySelector(".mini-dinle").addEventListener("click", () => seslendir(hedef.name));
    seslendir(hedef.name);
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
    seslendir(t.glyph === t.iddia ? t.iddia : t.gercek);
    wrap.querySelector(".dogru-btn").addEventListener("click", () => cevap(true, t));
    wrap.querySelector(".yanlis-btn").addEventListener("click", () => cevap(false, t));
  }

  function cevap(secim, t) {
    wrap.querySelectorAll(".dy-btn").forEach((b) => (b.disabled = true));
    const gb = wrap.querySelector(".geri-bildirim");
    const doruMu = secim === t.dogruMu;
    if (doruMu) { dogru++; sesDogru(); gb.innerHTML = `<span class="iyi">Aferin! 🎉</span>`; }
    else { sesYanlis(); gb.innerHTML = `<span class="kotu">Doğrusu: ${t.glyph} = <b>${t.gercek}</b></span>`; }
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
      btn.classList.add("dogru"); dogru++; sesDogru(); seslendir(h.name);
      gb.innerHTML = `<span class="iyi">Doğru: ${h.glyph} = ${h.name} 🎉</span>`;
    } else {
      btn.classList.add("yanlis"); sesYanlis();
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
      <p class="oyun-aciklama">Boşluğu doldur: <b>“${t.hedefHece}”</b> diye okunsun
        <button class="mini-dinle">🔊</button></p>
      <div class="fill-satir">
        <span class="fill-govde">${t.govde}</span>
        <span class="fill-kutu">?</span>
      </div>
      <div class="fill-secenekler"></div>
      <div class="geri-bildirim"></div>`;
    alan.querySelector(".mini-dinle").addEventListener("click", () => seslendir(t.hedefHece));
    seslendir(t.hedefHece);
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
      btn.classList.add("yanlis"); sesYanlis();
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
