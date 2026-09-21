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

## 4. Highlightly — DOĞRULANMASI GEREKEN noktalar (ÖNEMLİ, oku)

Bu entegrasyon **hiçbir zaman gerçek bir API anahtarıyla test edilmedi** — tamamen
highlightly.net'in genel dokümantasyon sayfalarındaki ÖRNEK response'lara göre yazıldı. Gerçek
anahtar alınır alınmaz aşağıdaki her madde tek tek doğrulanmalı:

1. **Lig ID**: `config.ts`'teki `SUPERLIG_LEAGUE_ID` varsayılanı **`0` (kasıtlı geçersiz)**.
   ```bash
   cd worker
   HIGHLIGHTLY_API_KEY=<gerçek-anahtar> npx tsx -e "
   import('./src/highlightlyApi.ts').then(m => m.findLeagueId('Super Lig','TR')).then(r => console.log(JSON.stringify(r, null, 2)))
   "
   ```
   `countryCode` param adı/değeri de DOĞRULANMADI — `/leagues` çağrısı beklenmedik sonuç
   dönerse `name`/`countryCode` yerine farklı param adları (örn. `country`) denenmeli.
2. **`state.description` metinleri**: `statusMap.ts`'teki `LIVE_DESCRIPTIONS`/
   `FINISHED_DESCRIPTIONS`/`POSTPONED_DESCRIPTIONS`/`CANCELLED_DESCRIPTIONS` set'leri
   dokümantasyonda geçen "First half", "Second half", "Finished", "Postponed" örneklerinden
   tahmin edildi. Gerçek bir canlı maçta `state.description`'ın TAM OLARAK ne yazdığını
   (büyük/küçük harf, "Half Time" mi "HT" mi vb.) loglardan doğrula — eşleşmezse maç sessizce
   `SCHEDULED` durumunda takılı kalır (varsayılan fallback), bu sessiz bir hata modu, dikkatli ol.
3. **`state.score.current` formatı**: `"H - A"` (örn. `"3 - 1"`) varsayıldı, `parseScore()`
   regex'i buna göre yazıldı. Farklı bir ayraç/format çıkarsa (`"3-1"` boşluksuz, `"3:1"` vb.)
   regex hâlâ çalışır (`\s*-\s*` esnek boşluk bırakıyor) ama tire dışında bir ayraç kullanılırsa
   (`:` gibi) BOZULUR — gerçek veriyle doğrula.
4. **`/matches` sayfalama**: `fetchAllPages`'in "son sayfa `limit`'ten kısaysa dur" mantığı
   standart bir varsayım, Highlightly'nin gerçekten bu şekilde davrandığı doğrulanmadı. Bir
   sezonun tüm maçlarının (~300+) eksiksiz çekildiğini `db-stats` tarzı bir sayımla doğrula.
5. **`/standings` şekli**: `groups[0].standings` yapısı varsayıldı (tek grup/lig için). `form`
   alanının o response'da GERÇEKTEN var olup olmadığı da belirsiz — yoksa `standings.ts` zaten
   zarifçe boş forma düşüyor (kod bunu ele alıyor, ama teyit edilmeli).
6. **`/teams` endpoint'i hiç kullanılmıyor** — bilinçli bir tercih (dokümantasyonda lig filtresi
   görünmüyordu), takım listesi fikstürlerden türetiliyor. Eğer ileride Highlightly'nin gerçek
   `/teams?leagueId=X` gibi bir filtresi olduğu görülürse, bu daha basit/güvenilir olabilir —
   `teams.ts`'i buna göre güncellemek bir seçenek.

**Test yöntemi**: `worker/scratch/` altına (git'e girmez) `console.log(JSON.stringify(...))`
içeren geçici bir script yazıp gerçek anahtarla çalıştırmak, her endpoint'in TAM response
şeklini görmenin en hızlı yolu — önceki oturumda Firestore Admin SDK bağlantısını aynı şekilde
(`worker/scratch/testRealConnection.ts` örneği) doğrulamıştık.

İlk gerçek `sync.ts` çalıştırması GitHub Actions'ta `workflow_dispatch` ile tetiklenmeden önce,
mümkünse önce yerelde (`GOOGLE_APPLICATION_CREDENTIALS` + gerçek `HIGHLIGHTLY_API_KEY` ile, emulator
KULLANMADAN, gerçek Firestore'a karşı ama dikkatli) tek bir `syncFixtures()`/`syncTeams()`
çağrısı yapıp Firestore konsolundan yazılan veriyi gözle kontrol etmek çok daha güvenli.

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

1. **Highlightly hesabı**: highlightly.net → ücretsiz kayıt (kredi kartı gerekmiyor) → anahtar al →
   `gh secret set HIGHLIGHTLY_API_KEY --repo ayildirim12/tahmin-ligi` (değeri stdin'den okur,
   terminale yapıştırıp Ctrl+D, ya da `echo "<anahtar>" | gh secret set ...`).
2. **§4'teki TÜM doğrulama maddelerini gerçek anahtarla test et** — bu, sadece lig ID'sini bulmaktan
   ibaret DEĞİL, response şekillerinin tamamının kontrolü gerekiyor.
3. **Lig ID'yi ayarla**: `gh variable set SUPERLIG_LEAGUE_ID --repo ayildirim12/tahmin-ligi --body <ID>`.
4. **Workflow'u yeniden etkinleştir**: `gh workflow enable "Sync Süper Lig data" --repo
   ayildirim12/tahmin-ligi`.
5. **İlk gerçek çalıştırma**: `gh workflow run "Sync Süper Lig data" --repo ayildirim12/tahmin-ligi`
   ile elle tetikle, `gh run watch --repo ayildirim12/tahmin-ligi` ile izle, Firestore konsolundan
   `matches`/`teams`/`standings` dokümanlarının doğru yazıldığını doğrula.
6. **(Opsiyonel/backlog)** "Wins" tie-break'i gerçek "haftalık kazanma" semantiğine çevirmek
   istenirse: `finalize.ts`'e bir gameweek-sonu pass'i eklenmeli — o haftanın TÜM maçları
   `pointsFinalized` olduğunda, topluluk üyelerinin o haftaki toplam puanını karşılaştırıp en
   yükseği alan(lar)a `winsCount++` yapmalı (şu anki gibi her maç sonrası tek satır increment
   yeterli değil, haftanın tamamının bitmesini beklemek gerekir).

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
