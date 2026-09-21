# AGENTS.md — Worker / API tarafı (`worker/`)

Bu dosya sadece `worker/` (canlı veri senkronizasyon paketi, API-Football entegrasyonu) tarafını
ilgilendirir. Proje geneli, mimari, Firestore koleksiyon sahipliği ve puanlama kuralı için önce
**`../AGENTS.md`**'yi okuyun — burada tekrarlanmıyor.

---

## 1. Ne işe yarar, neden var

Firebase Spark (ücretsiz) planında Cloud Functions dış ağ isteği atamıyor (API-Football'a
bağlanamıyor). Bu yüzden "canlı skor senkronizasyonu" tamamen ayrı, bağımsız bir Node.js paketi
olarak yazıldı: GitHub Actions üzerinde zamanlanmış çalışır, `firebase-admin` SDK'sı ile
Firestore'a **güvenlik kurallarını atlayarak** (Admin SDK = güvenilir taraf) doğrudan yazar.

Bu, kendi `package.json`/`tsconfig.json`'ı olan **ayrı bir paket** — kök `package.json`'ın bir
parçası değil, `npm install` kökte VE burada ayrı ayrı çalıştırılmalı.

---

## 2. Dosya sorumlulukları

```
worker/src/
├── config.ts          env değişkenleri (API_FOOTBALL_KEY, SUPERLIG_LEAGUE_ID, SUPERLIG_SEASON)
│                       — SUPERLIG_LEAGUE_ID şu an TAHMİNİ "203", DOĞRULANMADI (bkz. §4)
├── firestoreAdmin.ts    Admin SDK init — FIRESTORE_EMULATOR_HOST varsa emulator'a (credential
│                       gerekmez), yoksa GOOGLE_APPLICATION_CREDENTIALS'daki service account'a bağlanır
├── apiFootball.ts       API-Football HTTP client (fetch wrapper), tüm endpoint çağrıları burada:
│                       fetchLeagueFixtures, fetchLiveFixtures, fetchStandings, fetchLeagueTeams,
│                       findLeagueId (bkz. §4 — lig ID doğrulama aracı)
├── statusMap.ts          API-Football fixture status kodlarını (`NS`,`1H`,`HT`,`FT`,`PST`...)
│                       kendi `MatchStatus` union'ımıza çevirir
├── teams.ts              /teams endpoint'inden takım listesi + resmi crestUrl'i senkronize eder
├── fixtures.ts           /fixtures endpoint'inden tam sezon fikstürünü çeker, `matches` koleksiyonuna
│                       upsert eder, `meta/config.currentGameweek`'i hesaplar (round parse + "hangi
│                       hafta henüz bitmemiş" mantığı)
├── live.ts                /fixtures?live=all çağırır (TEK istek TÜM canlı maçları kapsar), bizim
│                        lig ID'mize filtreler, `matches`'i günceller, yeni bitenleri döndürür
├── liveWindow.ts          "bugün kalan canlı dakika" hesaplaması — çakışan maç pencerelerini
│                        birleştirip union alıyor (eşzamanlı maçlar istek sayısını ÇARPMAMALI)
├── quota.ts               `syncState/apiFootballQuota` transaction'ları + adaptif bekleme aralığı
│                        hesaplama (`computeIntervalSeconds`)
├── lock.ts                kickoff'u geçmiş maçların tahminlerini `locked:true` yapar (API
│                        maliyeti yok, her çalıştırmada koşar)
├── finalize.ts            biten maçların `points`'ini hesaplar (src/shared/scoring.ts import
│                        eder), `communities/*/members`'a toplam artışı dağıtır, idempotent
├── sync.ts                ORKESTRATÖR — GitHub Actions'ın çalıştırdığı asıl giriş noktası,
│                        bkz. §3
└── seed/localSeed.ts      SADECE emulator için — gerçek takım isimleriyle 3 maç (bitmiş/canlı/
                          planlanmış) + puan durumu seed eder, production'a karşı ÇALIŞMAYI
                          reddeder (`FIRESTORE_EMULATOR_HOST` kontrolü var)
```

---

## 3. Senkronizasyon algoritması (`sync.ts`)

GitHub Actions cron'u **her 5 dakikada bir** tetiklenir (bu, yeni bir ÇALIŞTIRMA'nın ne sıklıkla
başladığının tabanı — 5 dakikadan daha sık güncelleme, tek bir çalıştırmanın İÇİNDEKİ döngüden
gelir):

1. **Vadesi gelmiş bakım işleri** (`runDueHousekeeping`): fikstür senkronu >24 saatse, puan
   durumu senkronu >2 saatse çalışır.
2. **Kilit bakımı** (`runLockMaintenance`) + **puan kesinleştirme** (`finalizeFinishedMatches`) —
   her çalıştırmada, API maliyeti yok.
3. **Canlı pencere kontrolü**: Firestore'da `status in [SCHEDULED,LIVE,HT]` olan maçlardan biri
   şu an canlı/yakın mı diye bakar (API çağrısı yok, sadece Firestore okuması).
4. **Canlı maç yoksa**: "sakin çalışma", birkaç saniyede biter.
5. **Canlı maç varsa**: bu çalıştırma içinde ~4.5 dakika boyunca (bir sonraki cron tetiklemesine
   kadar) döngüye girer:
   - Her turda `computeIntervalSeconds(kalan_canlı_dakika, bugün_kullanılan_istek)` ile bekleme
     süresini YENİDEN hesaplar (günlük 100 istek bütçesine göre adaptif — tek maçlık gün ~60-70sn,
     yoğun gün 2-4dk'ya kadar uzayabilir, ASLA günlük kotayı aşmaz).
   - `pollLiveScores()` çağırır (tek istek, tüm eşzamanlı canlı maçları kapsar).
   - Yeni biten maç varsa hemen `finalizeFinishedMatches` çalıştırır (bir sonraki turu beklemez).
   - Canlı maç kalmadıysa döngüden erken çıkar.

**Pratik etki**: ortalama ~1 dakika gecikme (tek maçlık pencerelerde), yoğun günlerde zarifçe
uzar. Bu tasarım kullanıcıyla üç seçenek arasından ("düz 5dk", "adaptif ~1dk", "resmi olmayan
kazıma ~20sn") görüşülüp **adaptif ~1dk** seçilerek kararlaştırıldı.

---

## 4. API-Football — DOĞRULANMASI GEREKEN nokta

`config.ts`'teki `SUPERLIG_LEAGUE_ID` varsayılanı **`203` — bu bir TAHMİN, hiç doğrulanmadı**
(gerçek bir API anahtarı olmadan doğrulanamaz). Gerçek anahtarı aldıktan sonra İLK YAPILACAK ŞEY:

```bash
cd worker
API_FOOTBALL_KEY=<gerçek-anahtar> npx tsx -e "
import('./src/apiFootball.ts').then(m => m.findLeagueId('Super Lig','Turkey')).then(r => console.log(JSON.stringify(r, null, 2)))
"
```

Dönen `league.id`'yi GitHub repo değişkeni `SUPERLIG_LEAGUE_ID` olarak ayarla (bkz. §6).

**Ücretsiz plan limitleri** (api-sports.io direkt kayıt, RapidAPI değil): **100 istek/gün, 10
istek/dakika**. `x-apisports-key` header'ıyla auth. `/fixtures?live=all` TEK istekte TÜM ligleri
kapsar — bizim tarafımızda `league.id` ile filtreleniyor (`live.ts`).

**Hiçbir worker modülü gerçek API'ye karşı hiç çalıştırılmadı** — sadece:
- `worker/src/seed/localSeed.ts` (sahte veri, emulator)
- Elle yazılmış geçici script'ler (`worker/scratch/` — git'e girmiyor) ile Firestore'a doğrudan
  sahte canlı skor yazıp `finalizeFinishedMatches`'i test etmek

İlk gerçek çalıştırma GitHub Actions'ta `workflow_dispatch` ile elle tetiklenmeli, loglar dikkatle
izlenmeli (özellikle `fetchLeagueFixtures`/`fetchStandings` response şeklinin `apiFootball.ts`'teki
TypeScript interface'leriyle GERÇEKTEN eşleştiğini doğrulamak için — bu interface'ler API
dokümantasyonuna göre yazıldı, gerçek response'a karşı hiç test edilmedi).

---

## 5. Puanlama — sadece pointer

Worker kendi puanlama formülünü İÇERMİYOR. `finalize.ts` şunu yapıyor:
```ts
import { computeMatchPoints, isTendencyOrBetter } from '../../src/shared/scoring.ts'
```
Kuralın kendisi ve güncel değerleri için **`../AGENTS.md §4`**'e bakın. Worker tarafında kural
değişikliği gerekmez — sadece `src/shared/scoring.ts` değişir, worker otomatik günceli kullanır.

---

## 6. Yapılacaklar (worker'a özel)

**Tamamlanan:** GitHub reposu oluşturuldu (`ayildirim12/tahmin-ligi`, **public**), kod push
edildi. Secret `FIREBASE_SERVICE_ACCOUNT_JSON` ve variable `SUPERLIG_SEASON=2026` zaten ayarlı
(`gh secret list` / `gh variable list --repo ayildirim12/tahmin-ligi` ile doğrulanabilir). Worker
servis hesabının (`tahmin-ligi-worker@tahmin-ligi-sl2026.iam.gserviceaccount.com`,
`roles/datastore.user`) gerçek Firestore'a yazabildiği doğrulandı. **Workflow şu an bilinçli
olarak `gh workflow disable` ile durduruldu** (aşağıdaki 1-2 tamamlanmadan aktif olursa her 5
dakikada bir başarısız olup e-posta spam'i yapar).

1. **API-Football hesabı**: dashboard.api-football.com → ücretsiz kayıt → anahtar al →
   `gh secret set API_FOOTBALL_KEY --repo ayildirim12/tahmin-ligi` (değeri stdin'den okur, terminale
   yapıştırıp Ctrl+D, ya da `echo "<anahtar>" | gh secret set ...`).
2. **Lig ID doğrulama**: §4'teki `findLeagueId` komutunu çalıştır, sonra
   `gh variable set SUPERLIG_LEAGUE_ID --repo ayildirim12/tahmin-ligi --body <ID>`.
3. **Workflow'u yeniden etkinleştir**: `gh workflow enable "Sync Süper Lig data" --repo
   ayildirim12/tahmin-ligi`.
4. **İlk gerçek çalıştırma**: `gh workflow run "Sync Süper Lig data" --repo ayildirim12/tahmin-ligi`
   ile elle tetikle, `gh run watch --repo ayildirim12/tahmin-ligi` ile izle, Firestore konsolundan
   `matches`/`teams`/`standings` dokümanlarının doğru yazıldığını doğrula.
5. **(Opsiyonel/backlog)** "Wins" tie-break'i gerçek "haftalık kazanma" semantiğine çevirmek
   istenirse: `finalize.ts`'e bir gameweek-sonu pass'i eklenmeli — o haftanın TÜM maçları
   `pointsFinalized` olduğunda, topluluk üyelerinin o haftaki toplam puanını karşılaştırıp en
   yükseği alan(lar)a `winsCount++` yapmalı (şu anki gibi her maç sonrası tek satır increment
   yeterli değil, haftanın tamamının bitmesini beklemek gerekir).
6. **(Opsiyonel)** `apiFootball.ts`'teki TypeScript interface'lerini (`ApiFixture`,
   `ApiStandingRow`, `ApiTeam`) gerçek API response'una karşı doğrula — dokümantasyona göre
   yazıldılar, hiç gerçek veriyle test edilmediler.

---

## 7. Yerelde çalıştırma / test

```bash
cd worker && npm install
npx tsc --noEmit                                    # tip kontrolü

# emulator ayaktayken (bkz. ../AGENTS.md §8):
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run seed:local   # sahte veri yükle
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 GOOGLE_CLOUD_PROJECT=demo-tahmin-ligi npm run sync
```

`sync.ts` API_FOOTBALL_KEY olmadan da kısmen çalışır ama gerçek istek atan adımlarda
(`fetchLeagueFixtures` vb.) hata verir — emulator'a karşı SADECE Firestore-only adımları
(kilit bakımı, puan kesinleştirme) test etmek için `requireApiFootballKey()` çağıran fonksiyonları
geçici olarak atlaman gerekebilir, ya da sahte bir env değişkeni set edip gerçek dış istek
atmayacak bir test senaryosu kurgula.
