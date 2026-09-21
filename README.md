# Tahmin Ligi

Süper Lig maçları için arkadaş grubu tahmin oyunu — topluluk kur, davet linkiyle arkadaşlarını
ekle, her hafta skor tahmin et. Tamamen ücretsiz altyapı: Firebase (Auth + Firestore, Spark planı),
GitHub Actions (canlı skor senkronizasyonu), Firebase Hosting.

## Mimari özeti

- **`src/`** — React + Vite + TypeScript SPA. Firestore'a `onSnapshot` ile bağlanır, canlı skor/puan
  değişikliklerini sayfa yenilemeden gösterir.
- **`worker/`** — bağımsız bir Node.js paketi. GitHub Actions üzerinde 5 dakikada bir tetiklenir,
  API-Football'dan fikstür/canlı skor/puan durumu çeker ve `firebase-admin` ile doğrudan Firestore'a
  yazar (güvenlik kurallarını atlar — tek güvenilir yazma yolu budur). Bir maç canlıyken, tek bir
  çalıştırma içinde adaptif aralıklarla (ortalama ~1 dk) birkaç kez sorgu atarak 5 dakikalık cron
  tabanının altına iner — bkz. `worker/src/sync.ts`.
- **`firestore.rules`** — tüm istemci yazma/okuma izinleri burada; worker Admin SDK ile bu kuralları
  atlar.

## Yerel geliştirme

```bash
npm install
cd worker && npm install && cd ..

# Firestore + Auth emulator'larını başlat (gerçek Firebase hesabı GEREKMEZ)
firebase emulators:start --only firestore,auth

# ayrı bir terminalde
npm run dev
```

`.env.local` zaten emulator'a bağlanacak şekilde ayarlı (`VITE_USE_EMULATORS=true`, demo proje
kimlik bilgileri). Google girişi emulator'da sahte bir hesap seçici ile çalışır.

Emulator'a örnek veri (takımlar + 1 haftalık maç + puan durumu) yüklemek için:

```bash
cd worker
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run seed:local
```

### Testler

```bash
npm test              # puanlama motoru + Firestore güvenlik kuralları testleri
                       # (kural testleri çalışan bir Firestore emulator'ı gerektirir)
cd worker && npx tsc --noEmit   # worker tip kontrolü
```

## Gerçek Firebase projesi kurulumu (production için)

1. [Firebase Console](https://console.firebase.google.com)'da yeni proje oluştur (Spark/ücretsiz plan
   yeterli).
2. **Authentication** → Sign-in method → **Google**'ı etkinleştir.
3. **Firestore Database** → oluştur (Türkiye'ye yakın bir bölge, örn. `eur3`), **production mode**
   (kurallar zaten `firestore.rules`'ta hazır).
4. **Project settings** → **Your apps** → Web app ekle → verilen config değerlerini `.env.local`'a
   kopyala (`.env.example`'ı referans al), `VITE_USE_EMULATORS=false` yap.
5. **Project settings** → **Service accounts** → **Generate new private key** — bu JSON, worker'ın
   GitHub Actions secret'ı olacak (`FIREBASE_SERVICE_ACCOUNT_JSON`), asla repoya commit etme.
6. Firebase CLI ile projeyi bağla:
   ```bash
   firebase login
   firebase use --add   # az önce oluşturduğun projeyi seç, alias: production
   firebase deploy --only firestore:rules,firestore:indexes
   ```

## API-Football kurulumu

1. [dashboard.api-football.com](https://dashboard.api-football.com) üzerinden ücretsiz hesap aç
   (günde 100 istek, dakikada 10 istek limitiyle).
2. Dashboard'dan API anahtarını al.
3. Süper Lig'in gerçek lig ID'sini bul (worker'daki `203` varsayımını doğrula/düzelt):
   ```bash
   cd worker
   API_FOOTBALL_KEY=<anahtarın> npx tsx -e "
   import('./src/apiFootball.ts').then(m => m.findLeagueId('Super Lig','Turkey')).then(r => console.log(JSON.stringify(r, null, 2)))
   "
   ```
   Dönen `league.id` değerini not al — GitHub repo değişkeni (`SUPERLIG_LEAGUE_ID`) olarak kullanılacak.

## GitHub reposu ve Actions kurulumu

Repo **public** olmalı — canlı skor döngüsü GitHub Actions dakikalarını job içi bekleme ile
tüketiyor; public repolarda Actions dakikası sınırsız ücretsiz, private'ta aylık ~2000 dk sınırı var
ve yoğun maç haftalarında aşılabilir. API anahtarları/service account her iki durumda da GitHub
Secrets'ta gizli kalır.

1. Repoyu GitHub'da **public** olarak oluştur, kodu push et.
2. **Settings → Secrets and variables → Actions → Secrets**:
   - `API_FOOTBALL_KEY`
   - `FIREBASE_SERVICE_ACCOUNT_JSON` (yukarıdaki adım 5'teki JSON'un tüm içeriği)
3. **Settings → Secrets and variables → Actions → Variables**:
   - `SUPERLIG_LEAGUE_ID` (API-Football'dan bulduğun gerçek ID)
   - `SUPERLIG_SEASON` (örn. `2026`)
4. `.github/workflows/sync.yml` zaten hazır — ilk `workflow_dispatch` ile elle tetikleyip Actions
   loglarından doğrula, sonra 5 dakikalık cron kendiliğinden devam eder.
5. **Not:** GitHub, 60 gün hareketsiz kalan repolardaki scheduled workflow'ları otomatik durdurur —
   uzun süre commit atılmazsa cron'u elle yeniden tetiklemek (`workflow_dispatch`) gerekebilir.

## Deploy (Firebase Hosting)

```bash
npm run build
firebase deploy --only hosting,firestore
```

Deploy sonrası Firebase Console → Authentication → Settings → Authorized domains kısmına Hosting
alan adını eklemeyi unutma (Google girişinin prod'da çalışması için).

## Bilinmeyen / doğrulanması gerekenler

- `worker/src/config.ts`'teki `SUPERLIG_LEAGUE_ID` varsayılanı (`203`) tahminidir — yukarıdaki
  `findLeagueId` adımıyla doğrula.
- Takım logoları API-Football'ın resmi `crestUrl`'lerine doğrudan bağlanıyor (yerelde barındırılmıyor)
  — telif/yeniden dağıtım riskini önlemek için bilinçli bir tercih.
