# AGENTS.md — Worker / API tarafı (`worker/`)

Bu dosya sadece `worker/` (canlı veri senkronizasyon paketi, Highlightly Football API
entegrasyonu) tarafını ilgilendirir. Proje geneli, mimari, Firestore koleksiyon sahipliği ve
puanlama kuralı için önce **`../AGENTS.md`**'yi okuyun — burada tekrarlanmıyor.

**Sağlayıcı geçmişi:** Bu proje başlangıçta API-Football kullanıyordu. Kullanıcı "başka bir API
var mı" diye sorunca alternatifler araştırıldı (SportMonks/SoccersAPI Süper Lig'i kapsamıyor,
AllSportsAPI'de lig garantisi yok, Goalserve/live-score-api.com'da kalıcı ücretsiz plan yok) ve
**Highlightly**'nin aynı koşullarda (100 istek/gün, kredi kartı yok, Süper Lig dahil, canlı skor
dahil) gerçek bir alternatif olduğu bulunup kullanıcı tarafından seçildi. Tüm entegrasyon buna
göre yeniden yazıldı.

---

## 1. Ne işe yarar, neden var

Firebase Spark (ücretsiz) planında Cloud Functions dış ağ isteği atamıyor (Highlightly'ye
bağlanamıyor). Bu yüzden "canlı skor senkronizasyonu" tamamen ayrı, bağımsız bir Node.js paketi
olarak yazıldı: GitHub Actions üzerinde zamanlanmış çalışır, `firebase-admin` SDK'sı ile
Firestore'a **güvenlik kurallarını atlayarak** (Admin SDK = güvenilir taraf) doğrudan yazar.

Bu, kendi `package.json`/`tsconfig.json`'ı olan **ayrı bir paket** — kök `package.json`'ın bir
parçası değil, `npm install` kökte VE burada ayrı ayrı çalıştırılmalı.

---

## 2. Dosya sorumlulukları

```
worker/src/
├── config.ts          env değişkenleri (HIGHLIGHTLY_API_KEY, SUPERLIG_LEAGUE_ID, SUPERLIG_SEASON)
│                       — SUPERLIG_LEAGUE_ID varsayılanı "0" (GEÇERSİZ, kasıtlı) — DOĞRULANMADI (bkz. §4)
├── firestoreAdmin.ts    Admin SDK init — FIRESTORE_EMULATOR_HOST varsa emulator'a (credential
│                       gerekmez), yoksa GOOGLE_APPLICATION_CREDENTIALS'daki service account'a bağlanır
├── highlightlyApi.ts     Highlightly HTTP client (fetch wrapper), tüm endpoint çağrıları burada:
│                       fetchLeagueFixtures, fetchMatchesForDate, fetchStandings, fetchLeagueTeams,
│                       findLeagueId (bkz. §4 — lig ID doğrulama aracı). **Response tipleri
│                       (HlMatch, HlStandingRow, HlTeam) dokümantasyon ÖRNEKLERİNDEN çıkarıldı,
│                       gerçek API'ye karşı HİÇ doğrulanmadı** (bkz. §4).
├── statusMap.ts          Highlightly'nin serbest metin durumunu (`state.description`: "First
│                       half", "Finished", "Postponed"...) kendi `MatchStatus` union'ımıza çevirir
│                       (`mapApiStatus`) + skor string'ini ("2 - 1") parse eder (`parseScore`) —
│                       İKİSİ DE dokümantasyon örneğinden çıkarıldı, DOĞRULANMADI
├── teams.ts              Ayrı bir /teams çağrısı YOK (Highlightly'nin lig-filtreli teams endpoint'i
│                       dokümantasyonda görünmüyor) — takım listesi fikstür listesinden (homeTeam/
│                       awayTeam objelerinden benzersizleştirilerek) türetiliyor, bu hem daha
│                       güvenilir hem bir istek tasarrufu
├── fixtures.ts           `/matches?leagueId=X&season=Y` ile tam sezon fikstürünü çeker (sayfalanır,
│                       100'lük sayfalar halinde `fetchAllPages` ile), `matches` koleksiyonuna
│                       upsert eder, `meta/config.currentGameweek`'i hesaplar (round parse + "hangi
│                       hafta henüz bitmemiş" mantığı)
├── live.ts                `/matches?leagueId=X&date=<bugün-TR-yerel>` çağırır (TEK istek, o günün
│                       TÜM Süper Lig maçlarını kapsar — Highlightly'de API-Football'daki gibi
│                       global "live=all" YOK, ama bizim için sorun değil çünkü zaten tek ligle
│                       ilgileniyoruz), LIVE/HT/FINISHED olanları `matches`'e yazar, yeni bitenleri
│                       döndürür
├── liveWindow.ts          "bugün kalan canlı dakika" hesaplaması — çakışan maç pencerelerini
│                        birleştirip union alıyor (eşzamanlı maçlar istek sayısını ÇARPMAMALI) —
│                        sağlayıcıdan bağımsız, değişmedi
├── quota.ts               `syncState/highlightlyQuota` transaction'ları + adaptif bekleme aralığı
│                        hesaplama (`computeIntervalSeconds`) — Highlightly'de dakika limiti
│                        YOK (API-Football'ın 10/dk'sının aksine), ama 7sn taban yine de korunuyor
│                        (kendi koyduğumuz güvenlik payı, dokümante bir limit değil)
├── lock.ts                kickoff'u geçmiş maçların tahminlerini `locked:true` yapar (API
│                        maliyeti yok, her çalıştırmada koşar) — sağlayıcıdan bağımsız, değişmedi
├── finalize.ts            biten maçların `points`'ini hesaplar (src/shared/scoring.ts import
│                        eder), `communities/*/members`'a toplam artışı dağıtır, idempotent —
│                        sağlayıcıdan bağımsız, değişmedi
├── sync.ts                ORKESTRATÖR — GitHub Actions'ın çalıştırdığı asıl giriş noktası,
│                        bkz. §3 — sağlayıcıdan bağımsız, değişmedi
└── seed/localSeed.ts      SADECE emulator için — gerçek takım isimleriyle 3 maç (bitmiş/canlı/
                          planlanmış) + puan durumu seed eder, production'a karşı ÇALIŞMAYI
                          reddeder (`FIRESTORE_EMULATOR_HOST` kontrolü var) — herhangi bir API'ye
                          bağımlı değil, değişmedi
```

---

## 3. Senkronizasyon algoritması (`sync.ts`)

**Bu bölüm sağlayıcıdan bağımsız, API-Football'dan Highlightly'ye geçişte değişmedi.**

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
   - `pollLiveScores()` çağırır (tek istek, o günün tüm Süper Lig maçlarını — dolayısıyla tüm
     eşzamanlı canlı maçları — kapsar).
   - Yeni biten maç varsa hemen `finalizeFinishedMatches` çalıştırır (bir sonraki turu beklemez).
   - Canlı maç kalmadıysa döngüden erken çıkar.

**Pratik etki**: ortalama ~1 dakika gecikme (tek maçlık pencerelerde), yoğun günlerde zarifçe
uzar. Bu tasarım kullanıcıyla üç seçenek arasından ("düz 5dk", "adaptif ~1dk", "resmi olmayan
kazıma ~20sn") görüşülüp **adaptif ~1dk** seçilerek kararlaştırıldı. Highlightly dokümantasyonu
kendi canlı verisini "dakikada bir" yenilediğini belirtiyor — bu, ~1dk hedefimizle zaten uyumlu
(daha sık sorgulamanın getirisi sınırlı olurdu).

---

## 4. Highlightly — DOĞRULANDI (gerçek anahtarla test edildi)

Bu entegrasyon önce dokümantasyon örneklerine göre yazıldı, sonra dokümantasyon sayfası "her
şeyi kelimesi kelimesine alıntıla" diye özel taranıp birkaç hata bulundu, **ve nihayet gerçek
bir Highlightly API anahtarıyla `worker/scratch/` altında bir dizi test script'i çalıştırılarak
her endpoint'in gerçek response'u doğrulandı** (fikstürler, standings, canlı skor sorgusu,
tam `sync.ts` orkestratörü — hepsi gerçek Firestore'a (`tahmin-ligi-sl2026`) karşı çalıştırıldı
ve sonuçlar gözle kontrol edildi). Aşağıdaki liste artık **doğrulanmış gerçek durumu** yansıtıyor.

**Süper Lig gerçek kimlikleri (artık sabit, değişmeyecek):**
- Lig ID: **`173537`** (isim tam olarak `"Süper Lig"` — Türkçe ü ile; `"Super Lig"` aramasında
  SIFIR sonuç döner, bu yüzden `findLeagueId` çağrılarında dikkatli olun)
- 2026 sezonu şu an **153 maç** listeliyor (18 takımın tek devreliği, 17 hafta × 9 maç) — bu,
  sezonun TAMAMI değil, ikinci devre muhtemelen ilerleyen zamanda API'ye eklenecek; worker'ın
  günlük fikstür senkronu (`lastFixtureSyncAt` >24 saat) bunu otomatik yakalayacak, ekstra bir
  işlem gerekmiyor.
- İlk test çalıştırıldığında (21 Eylül 2026) `currentGameweek` doğru şekilde **7** olarak
  hesaplandı (sezon 14 Ağustos 2026'da başlamış).

**Dokümantasyondan KELİMESİ KELİMESİNE doğrulanmış, artık güvenilir:**

- **Auth header**: direkt erişimde de (`soccer.highlightly.net`) `x-rapidapi-key` header'ı
  kullanılıyor (RapidAPI'ye özgü değilmiş, ikisinde de aynı header adı) — kodda doğru.
- **`state.description`'ın TAM 19 değerlik listesi** (dokümantasyondan birebir alıntı):
  "Not started", "First half", "Second half", "Half time", "Extra time", "Break time",
  "Penalties", "Finished", "Finished after penalties", "Finished after extra time",
  "Postponed", "Suspended", "Cancelled", "Awarded", "Interrupted", "Abandoned",
  "In progress", "Unknown", "To be announced". `statusMap.ts` artık bu 19 değerin TAMAMINI
  tek tek sınıflandırıyor (önceden sadece birkaç tanesi tahmin edilmişti, "Suspended",
  "Interrupted", "Awarded", "Break time" gibi değerler hiç ele alınmıyordu ve sessizce
  `SCHEDULED`'a düşüyordu — düzeltildi, artık eşleşmeyen bir değer gelirse `console.warn` ile
  Actions loglarında görünür oluyor).
- **`/leagues` param adı**: `name` DEĞİL, **`leagueName`** — `findLeagueId()` bu hatayla
  yazılmıştı, düzeltildi.
- **`/matches` param adları**: `leagueId`, `date`, `season`, `limit`, `offset` (kullandıklarımız)
  hepsi dokümantasyon tablosunda birebir doğrulandı — değişiklik gerekmedi.
- **`/teams` endpoint'inde lig filtresi YOK** (param listesi: sadece `limit,offset,name,type`) —
  takım listesini fikstürlerden türetme kararı DOĞRU çıktı, değişiklik gerekmiyor.
- **Sayfalama response şekli**: `{ data: [...], pagination: { limit, offset, totalCount } }` —
  alan adı `total` değil **`totalCount`**, düzeltildi. `fetchAllPages` artık `totalCount`'a
  ulaşınca duruyor (önceden sadece "son sayfa kısaysa dur" vardı, hâlâ yedek olarak duruyor).
- **`date` formatı**: `YYYY-MM-DD` doğrulandı — `live.ts`'teki `turkeyTodayYmd()` zaten bu
  formatı üretiyor, değişiklik gerekmedi.

**Gerçek testte bulunup düzeltilen 2 ek hata** (dokümantasyon taramasında yakalanamamıştı):

- **`/standings` satır şekli TAMAMEN farklıydı.** Varsayılan `total.played/win/draw/lose/
  goals.for/goals.against` yerine gerçek alan adları: **`total.games/wins/draws/loses/
  scoredGoals/receivedGoals`** (goals `for`/`against` diye ayrı bir obje DEĞİL, flat alanlar).
  `HlStandingRow` ve `standings.ts`'teki `syncStandings()` düzeltildi. `form` alanı gerçekten
  YOK (doğrulandı) — zaten zarifçe boş diziye düşüyordu.
- **GitHub Actions workflow'u Node 20 kullanıyordu ama `@google-cloud/firestore` (firebase-admin
  bağımlılığı) Node ≥22 istiyor.** Node 20'de npm bu opsiyonel bağımlılığı SESSİZCE atlıyor,
  çalışma zamanında `Cannot find module '@google-cloud/firestore'` hatasına yol açıyor — yerelde
  hiç yakalanmadı çünkü yerel Node zaten 22+ idi. İlk gerçek `workflow_dispatch` çalıştırmasında
  bulundu. `.github/workflows/sync.yml`'de `node-version: 22`'ye çıkarıldı, `worker/package.json`'a
  `"engines": {"node": ">=22"}` eklendi.

**Doğrulanmış, sorunsuz çıkanlar**: auth header, `/matches` param adları, `/teams`'te lig
filtresi olmaması (fikstürden türetme kararı doğru), sayfalama (`totalCount` dahil), `date`
formatı, `state.description`'ın 19 değerlik tam listesi, `state.score.current` formatı
(`"3 - 1"` doğrulandı), `homeTeam`/`awayTeam`/`league`/`round` alan adları (gerçek veride
`type` alanı YOK — tipte opsiyonel yapıldı), `/leagues?countryCode=TR` ile lig keşfi.

**Test yöntemi (ileride benzer bir sorun çıkarsa aynısını uygula)**: `worker/scratch/` altına
(git'e girmez) `console.log(JSON.stringify(...))` içeren geçici bir script yazıp gerçek anahtarla
çalıştırmak, her endpoint'in TAM response şeklini görmenin en hızlı yolu. Kod fonksiyonlarını
gerçek Firestore'a karşı (emulator KULLANMADAN, `GOOGLE_APPLICATION_CREDENTIALS` + gerçek
`HIGHLIGHTLY_API_KEY` ile) çalıştırıp Firestore konsolundan/okuyarak doğrulamak, dokümantasyon
taramasının YAKALAYAMADIĞI hataları (standings şekli gibi) ortaya çıkardı — sadece dokümantasyon
okumak yeterli değil, gerçek çalıştırma şart.

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

**Tamamlanan (worker tarafı artık production'da tam çalışır durumda):**
- GitHub reposu oluşturuldu (`ayildirim12/tahmin-ligi`, **public**), kod push edildi.
- Secrets: `FIREBASE_SERVICE_ACCOUNT_JSON`, `HIGHLIGHTLY_API_KEY` — ikisi de ayarlı.
- Variables: `SUPERLIG_SEASON=2026`, `SUPERLIG_LEAGUE_ID=173537` — ikisi de ayarlı ve doğrulandı.
- Worker servis hesabı (`tahmin-ligi-worker@tahmin-ligi-sl2026.iam.gserviceaccount.com`,
  `roles/datastore.user`) gerçek Firestore'a yazabildiği doğrulandı.
- `syncTeams()`, `syncFixtures()`, `syncStandings()`, `pollLiveScores()` ve tam `sync.ts`
  orkestratörünün TAMAMI gerçek Highlightly API'sine ve gerçek Firestore'a (`tahmin-ligi-sl2026`)
  karşı çalıştırılıp doğrulandı (bkz. §4) — `teams` (18), `matches` (153), `standings/superlig`
  (18 satır) koleksiyonları gerçek veriyle dolu.
- Node 20→22 bug'ı bulunup düzeltildi (§4), GitHub Actions workflow'u `workflow_dispatch` ile
  gerçekten tetiklenip izlendi.
- Workflow **etkin** (`gh workflow enable` yapıldı) — artık normal 5 dakikalık cron'a göre
  otomatik çalışıyor.

**Kalan tek şey:**
1. **(Opsiyonel/backlog)** "Wins" tie-break'i gerçek "haftalık kazanma" semantiğine çevirmek
   istenirse: `finalize.ts`'e bir gameweek-sonu pass'i eklenmeli — o haftanın TÜM maçları
   `pointsFinalized` olduğunda, topluluk üyelerinin o haftaki toplam puanını karşılaştırıp en
   yükseği alan(lar)a `winsCount++` yapmalı (şu anki gibi her maç sonrası tek satır increment
   yeterli değil, haftanın tamamının bitmesini beklemek gerekir).
2. **(Opsiyonel)** İlk gerçek CANLI maç geldiğinde (`state.description` "First half" vb. dönen bir
   maç), `pollLiveScores()`'un ve `LeaderboardMatrix`'in ucuca gerçekten doğru çalıştığını bir kez
   daha gözle izlemek iyi olur — şu ana kadarki testler sadece "Not started"/"Finished" durumlarıyla
   yapıldı (test sırasında canlı maç yoktu), LIVE/HT geçişleri prod'da hiç görülmedi.

---

## 7. Yerelde çalıştırma / test

```bash
cd worker && npm install
npx tsc --noEmit                                    # tip kontrolü

# emulator ayaktayken (bkz. ../AGENTS.md §8):
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run seed:local   # sahte veri yükle
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 GOOGLE_CLOUD_PROJECT=demo-tahmin-ligi npm run sync
```

`sync.ts` HIGHLIGHTLY_API_KEY olmadan da kısmen çalışır ama gerçek istek atan adımlarda
(`fetchLeagueFixtures` vb.) hata verir — emulator'a karşı SADECE Firestore-only adımları
(kilit bakımı, puan kesinleştirme) test etmek için `requireHighlightlyKey()` çağıran fonksiyonları
geçici olarak atlaman gerekebilir, ya da sahte bir env değişkeni set edip gerçek dış istek
atmayacak bir test senaryosu kurgula.
