# Kur'an Yolculuğu — Android (APK)

Web uygulamasını ([`../kuran-yolculugu`](../kuran-yolculugu)) **Capacitor** ile bir Android
uygulamasına sarar. APK, GitHub Actions iş akışında otomatik derlenir.

## APK nasıl elde edilir?

1. `mobile/**` klasörüne her push'ta `.github/workflows/build-apk.yml` çalışır.
2. İş akışı:
   - Web uygulamasını `mobile/www` içine kopyalar
   - `npm install` + `npx cap add android` ile Android projesini üretir
   - `./gradlew assembleDebug` ile **debug APK** derler
   - APK'yı hem **Actions artifact** olarak yükler hem de bir **Release**'e ekler
3. APK'yı şuradan indirin:
   - **Releases:** https://github.com/mahmuttari/kirikli_cati/releases
   - veya Actions çalışmasının "Artifacts" bölümünden

## Telefona kurma

1. APK dosyasını Android telefona indirin.
2. İlk açışta "Bilinmeyen kaynaklardan yükleme" iznini verin (sadece bu uygulama için).
3. Kurun ve açın. 🎉

> Not: Bu bir **debug imzalı** APK'dır; aileyle paylaşmak/test için idealdir.
> Google Play'e yüklemek isterseniz release imzalı (keystore'lu) sürüm gerekir — istenirse eklenebilir.

## Yerel derleme (Android SDK'sı olan bilgisayarda)

```bash
cd mobile
mkdir -p www && cp -r ../kuran-yolculugu/* www/
npm install
npx cap add android
npx cap sync
cd android && ./gradlew assembleDebug
# APK: android/app/build/outputs/apk/debug/app-debug.apk
```
