# Kur'an Yolculuğu 🕌

Çocuklara **Kuran okumayı (Elif-Ba)** harita üzerinde ilerleyerek, oyunlaştırılmış ve eğlenceli bir şekilde öğreten web uygulaması.

## Nasıl Çalışır?

Kurulum gerektirmez. `kuran-yolculugu/index.html` dosyasını tarayıcıda açın
(veya kök dizindeki tek dosyalık `Kuran-Yolculugu.html`). Android için APK: bkz. `mobile/`.

## Tam Elif-Ba Müfredatı (7 Aşama)

28 harfin tamamı 7 aşamaya bölünmüştür. **Her aşamada en az 5 farklı oyun modeli** ile
aynı harfler farklı yollarla pekiştirilir:

| Aşama | Harfler |
|------|---------|
| 1 | ا ب ت ث |
| 2 | ج ح خ |
| 3 | د ذ ر ز |
| 4 | س ش ص ض |
| 5 | ط ظ ع غ |
| 6 | ف ق ك ل |
| 7 | م ن ه و ي |

Her aşama akışı: **📖 Öğren → 🧩 Eşleştir → (arcade) → 👂 Dinle & Bul → (arcade) → (arcade) → 🏅 Sınav**

## Oyun Modelleri (10 çeşit)

| Oyun | Açıklama |
|------|----------|
| 📖 Öğren | Kartlarla harfleri tanı (sesli) |
| 🏅 Sınav | Çoktan seçmeli test |
| 🧩 Eşleştir | Harfi ismiyle eşleştir |
| 👂 Dinle & Bul | Sesi dinle, doğru harfi seç |
| 🎈 Balon Patlat | Yükselen balonlardan hedef harfi patlat |
| 🐹 Köstebek | Deliklerden çıkan hedef harfe vur |
| ⚡ Doğru mu? | Hızlı doğru/yanlış kararı |
| 🃏 Hafıza | Kartları çevir, çiftleri bul |
| 🖊️ Harf İzi | Harfi parmakla çiz |
| 📖 Sure | Kısa sureyi kelime kelime oku |

## İleri Konular

🔤 Şekil Atölyesi (başta/ortada/sonda) · 🌳 Hareke Ormanı (üstün/esre/ötre, heceler) ·
🔢 Rakamlar Diyarı · 🌟 Yıldız Şehri (cezm, şedde, kelimeler) ·
🤲 Dua Bahçesi (Esmaü'l-Hüsna) · 📖 Sure Sarayı (İhlâs, Kevser, Nâs)

Toplam **13 bölge, 67 durak.**

## Özellikler

- 🔓 Kilit sistemi (adım adım ilerleme) · ⭐ 1-3 yıldız · 🎉 konfeti · 🔊 sesli okuma
- 💾 İlerleme tarayıcıda kayıtlı (localStorage)

## Teknik

Saf HTML + CSS + JavaScript. `index.html`, `css/style.css`, `js/data.js` (müfredat üretici), `js/app.js` (oyun motorları).

## Ses / Tilavet

- **Harf / hece / kelime okunuşları:** cihazın Türkçe seslendirme (TTS) motoruyla okunur.
- **Sure tilaveti:** Sure ekranlarında, âyetler **gerçek hâfız tilavetiyle** seslendirilir.
  Ses, cihazın internetiyle [everyayah.com](https://everyayah.com) üzerinden **Mahmud Halil
  el-Husary (murattal)** kaydından akıtılır. İnternet yoksa otomatik olarak TTS okunuşa düşer.
- Tilavet kaydı, eğitim/kişisel kullanım için serbestçe dağıtılan bir kayıttır; hak sahibi
  kāridir. Tümüyle çevrimdışı ve kendi ses dosyalarınızla bir sürüm istenirse entegre edilebilir.
