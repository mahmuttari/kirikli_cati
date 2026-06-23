/*
 * Kur'an Yolculuğu - Uygulama Mantığı
 * Harita, ders kartları, mini test ve ilerleme yönetimi.
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

// Bir durağın kilidi açık mı? (ilk durak hep açık, sonrakiler önceki tamamlanınca açılır)
function durakAcikMi(index) {
  if (index === 0) return true;
  const oncekiId = DURAKLAR[index - 1].id;
  return !!ILERLEME.tamamlanan[oncekiId];
}

const DURAKLAR = tumDuraklar();

// ---- Ses (Türkçe okunuş için tarayıcı konuşma sentezi) ----
function seslendir(metin) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(metin);
  u.lang = "tr-TR";
  u.rate = 0.85;
  u.pitch = 1.15;
  window.speechSynthesis.speak(u);
}

// ---- Basit ses efektleri (WebAudio, dosya gerektirmez) ----
function tonCal(freqs, sure = 0.12) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
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
  ILERLEME = ilerlemeYukle();
  app.innerHTML = "";
  app.appendChild(haritaEkrani());
}

// Toplam yıldız sayısı
function toplamYildiz() {
  return Object.values(ILERLEME.yildiz).reduce((a, b) => a + b, 0);
}

// ---- HARİTA EKRANI ----
function haritaEkrani() {
  const wrap = document.createElement("div");
  wrap.className = "harita-wrap";

  // Üst bilgi çubuğu
  const bar = document.createElement("div");
  bar.className = "topbar";
  bar.innerHTML = `
    <div class="logo">🕌 Kur'an Yolculuğu</div>
    <div class="yildiz-sayac">⭐ <span>${toplamYildiz()}</span></div>
  `;
  wrap.appendChild(bar);

  const intro = document.createElement("p");
  intro.className = "intro";
  intro.textContent = "Haritada ilerle, harfleri öğren, yıldızları topla! 🎉";
  wrap.appendChild(intro);

  const yol = document.createElement("div");
  yol.className = "yol";

  let sonBolgeId = null;
  DURAKLAR.forEach((durak, i) => {
    // Yeni bölge başlığı
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
      <span class="durak-emoji">${acik ? durak.emoji : "🔒"}</span>
      <span class="durak-isim">${durak.title}</span>
      <span class="durak-yildiz">${"⭐".repeat(yildiz)}${"☆".repeat(3 - yildiz)}</span>
    `;
    node.addEventListener("click", () => {
      if (!acik) return;
      tonCal([440]);
      derseGir(durak, i);
    });
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

// ---- DERS EKRANI (kartlar) ----
function derseGir(durak, index) {
  let kartNo = 0;
  app.innerHTML = "";

  const wrap = document.createElement("div");
  wrap.className = "ders-wrap";

  const ust = document.createElement("div");
  ust.className = "ders-ust";
  ust.innerHTML = `<button class="geri">← Harita</button><h2>${durak.emoji} ${durak.title}</h2>`;
  wrap.appendChild(ust);
  ust.querySelector(".geri").addEventListener("click", render);

  const kartAlan = document.createElement("div");
  kartAlan.className = "kart-alan";
  wrap.appendChild(kartAlan);

  const altBar = document.createElement("div");
  altBar.className = "kart-nav";
  altBar.innerHTML = `
    <button class="onceki">◀ Geri</button>
    <span class="kart-sayac"></span>
    <button class="sonraki">İleri ▶</button>
  `;
  wrap.appendChild(altBar);

  function kartCiz() {
    const k = durak.cards[kartNo];
    kartAlan.innerHTML = `
      <div class="flashcard">
        <div class="harf-buyuk">${k.glyph}</div>
        <div class="harf-ad">${k.name}</div>
        <div class="harf-ipucu">${k.hint || ""}</div>
        <button class="dinle">🔊 Dinle</button>
      </div>
    `;
    kartAlan.querySelector(".dinle").addEventListener("click", () => seslendir(k.name));
    seslendir(k.name);
    altBar.querySelector(".kart-sayac").textContent = `${kartNo + 1} / ${durak.cards.length}`;
    altBar.querySelector(".onceki").disabled = kartNo === 0;
    const son = kartNo === durak.cards.length - 1;
    altBar.querySelector(".sonraki").textContent = son ? "Teste Geç ✏️" : "İleri ▶";
  }

  altBar.querySelector(".onceki").addEventListener("click", () => {
    if (kartNo > 0) { kartNo--; kartCiz(); }
  });
  altBar.querySelector(".sonraki").addEventListener("click", () => {
    if (kartNo < durak.cards.length - 1) { kartNo++; kartCiz(); }
    else testeGir(durak, index);
  });

  app.appendChild(wrap);
  kartCiz();
}

// ---- TEST EKRANI ----
function testeGir(durak, index) {
  const sorular = shuffleArr(durak.quiz);
  let soruNo = 0;
  let dogru = 0;

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
      <div class="geri-bildirim"></div>
    `;
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
    const tumu = wrap.querySelectorAll(".secenek");
    tumu.forEach((b) => (b.disabled = true));
    const gb = wrap.querySelector(".geri-bildirim");
    if (opt === s.a) {
      btn.classList.add("dogru");
      dogru++;
      sesDogru();
      gb.innerHTML = `<span class="iyi">Aferin! 🎉</span>`;
    } else {
      btn.classList.add("yanlis");
      sesYanlis();
      tumu.forEach((b) => { if (b.textContent === s.a) b.classList.add("dogru"); });
      gb.innerHTML = `<span class="kotu">Doğrusu: <b>${s.a}</b></span>`;
    }
    const ileri = document.createElement("button");
    ileri.className = "devam";
    ileri.textContent = soruNo === sorular.length - 1 ? "Bitir 🏁" : "Devam ▶";
    ileri.addEventListener("click", () => {
      soruNo++;
      if (soruNo < sorular.length) soruCiz();
      else sonucEkrani();
    });
    gb.appendChild(ileri);
  }

  function sonucEkrani() {
    const oran = dogru / sorular.length;
    let yildiz = oran >= 0.99 ? 3 : oran >= 0.7 ? 2 : oran >= 0.5 ? 1 : 0;
    const gecti = yildiz >= 1;

    if (gecti) {
      // İlerlemeyi kaydet (en iyi yıldız korunur)
      ILERLEME.tamamlanan[durak.id] = true;
      ILERLEME.yildiz[durak.id] = Math.max(ILERLEME.yildiz[durak.id] || 0, yildiz);
      ilerlemeKaydet(ILERLEME);
      sesBasari();
    } else {
      sesYanlis();
    }

    const sonrakiVar = index < DURAKLAR.length - 1;
    wrap.innerHTML = `
      <div class="sonuc ${gecti ? "basarili" : "tekrar"}">
        <div class="sonuc-emoji">${gecti ? "🏆" : "💪"}</div>
        <h2>${gecti ? "Tebrikler!" : "Az Kaldı!"}</h2>
        <div class="sonuc-yildiz">${"⭐".repeat(yildiz)}${"☆".repeat(3 - yildiz)}</div>
        <p>${dogru} / ${sorular.length} doğru</p>
        <div class="sonuc-butonlar">
          <button class="tekrar-btn">🔁 Tekrar Dene</button>
          ${gecti && sonrakiVar ? `<button class="sonraki-btn">Sonraki Durak ▶</button>` : ""}
          <button class="harita-btn">🗺️ Haritaya Dön</button>
        </div>
      </div>
    `;
    if (gecti) konfetiPatlat();
    wrap.querySelector(".tekrar-btn").addEventListener("click", () => testeGir(durak, index));
    wrap.querySelector(".harita-btn").addEventListener("click", render);
    const sb = wrap.querySelector(".sonraki-btn");
    if (sb) sb.addEventListener("click", () => derseGir(DURAKLAR[index + 1], index + 1));
  }

  soruCiz();
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
