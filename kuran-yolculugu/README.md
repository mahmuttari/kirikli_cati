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
- 🔊 **Sesli okuma:** "Dinle" butonu ile harf/hece adı Türkçe seslendirilir (tarayıcı konuşma sentezi).
- ✏️ **Mini testler:** Çoktan seçmeli, anında geri bildirimli sorular.
- ⭐ **Yıldız & ödül:** Başarıya göre 1-3 yıldız, konfeti ve neşeli ses efektleri.
- 💾 **İlerleme kaydı:** Tarayıcıda (localStorage) saklanır; tekrar açınca kaldığı yerden devam eder.

## İçerik (Müfredat)

1. **Harf Adası** 🏝️ — Tüm Elif-Ba harfleri (gruplar halinde + genel sınav)
2. **Çöl Vadisi** 🏜️ — Kalın harfler ve son harfler
3. **Sihirli Orman** 🌳 — Harekeler (üstün/esre/ötre) ve heceler
4. **Yıldız Şehri** 🌟 — Cezm, şedde ve ilk kelimeler

## Teknik

Saf HTML + CSS + JavaScript (bağımlılık yok, build adımı yok).

- `index.html` — giriş
- `css/style.css` — renkli, çocuk dostu tasarım
- `js/data.js` — harfler ve ders/test müfredatı
- `js/app.js` — harita, ders, test ve ilerleme mantığı
