# Kur'an Yolculuğu 🕌

Çocuklara **Kuran okumayı (Elif-Ba)** harita üzerinde ilerleyerek, oyunlaştırılmış ve eğlenceli bir şekilde öğreten web uygulaması.

## Nasıl Çalışır?

Kurulum gerektirmez. Tarayıcıda açın:

```
kuran-yolculugu/index.html
```

dosyasına çift tıklamanız yeterli. (İstege bağlı yerel sunucu: `python3 -m http.server` ile `kuran-yolculugu` klasöründe açıp `http://localhost:8000` adresine gidebilirsiniz.)

## Özellikler

- 🗺️ **Harita modu:** Çocuk, duraktan durağa ilerleyerek (Candy Crush tarzı) konuları açar.
- 🔓 **Kilit sistemi:** Bir durağı bitirmeden sonraki açılmaz; adım adım öğrenme.
- 🃏 **Öğrenme kartları:** Her harf büyük gösterilir, Türkçe okunuşu ve çocuk dostu ipucu (benzetme) verilir.
- 🔊 **Sesli okuma:** "Dinle" butonu ile harf/hece/âyet Türkçe seslendirilir (tarayıcı konuşma sentezi).
- ⭐ **Yıldız & ödül:** Başarıya göre 1-3 yıldız, konfeti ve neşeli ses efektleri.
- 💾 **İlerleme kaydı:** Tarayıcıda (localStorage) saklanır; tekrar açınca kaldığı yerden devam eder.

### 🎮 Farklı öğrenme biçimleri (oyunlar)

Tek düze ezber yerine, popüler çocuk Elif-Ba uygulamalarından esinlenen 6 farklı etkinlik türü:

| Tür | Açıklama |
|-----|----------|
| 📚 **Ders** | Kartlarla öğren + çoktan seçmeli mini test |
| 🧩 **Eşleştirme** | Harfi doğru ismiyle eşleştir |
| 👂 **Dinle ve Bul** | Sesi dinle, doğru harfi seç |
| 🃏 **Hafıza Oyunu** | Kartları çevir, harf–isim çiftlerini bul |
| 🖊️ **Harf İzi** | Harfin üzerinden parmakla/fareyle çizerek yaz |
| 📖 **Sure Okuma** | Kısa sureleri kelime kelime, okunuş ve mealiyle oku |

## İçerik (Müfredat) — 8 bölge, 25 durak

1. **Harf Adası** 🏝️ — İlk harfler, kanca harfler + eşleştirme oyunu
2. **Çöl Vadisi** 🏜️ — Kalın/son harfler, dinle-bul oyunu, genel sınav
3. **Şekil Atölyesi** 🔤 — Harflerin başta/ortada/sonda hâlleri + harf izi çizme
4. **Sihirli Orman** 🌳 — Harekeler (üstün/esre/ötre), heceler + hafıza oyunu
5. **Rakamlar Diyarı** 🔢 — Arapça rakamlar (٠–٩) + rakam eşleştirme
6. **Yıldız Şehri** 🌟 — Cezm, şedde ve ilk kelimeler
7. **Dua Bahçesi** 🤲 — Güzel sözler (Bismillah…) ve Esmaü'l-Hüsna
8. **Sure Sarayı** 📖 — İhlâs, Kevser, Nâs sureleri (kelime kelime)

## Teknik

Saf HTML + CSS + JavaScript (bağımlılık yok, build adımı yok).

- `index.html` — giriş
- `css/style.css` — renkli, çocuk dostu tasarım
- `js/data.js` — harfler, rakamlar, sureler, dualar ve tüm müfredat
- `js/app.js` — harita + 6 öğrenme biçiminin mantığı

> Tek dosyalık sürüm: kök dizindeki `Kuran-Yolculugu.html` (her şey gömülü, çift tıkla çalışır).
