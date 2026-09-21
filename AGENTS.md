# AGENTS.md — Tahmin Ligi (proje geneli)

Bu dosya, bu repoda çalışacak herhangi bir AI ajanı için ÜST SEVİYE bağlam dosyasıdır. Sadece iki
tarafı da ilgilendiren (paylaşılan) bilgiyi içerir. Asıl çalışacağınız tarafa göre şu dosyaları da
okuyun:

- **Frontend'de çalışacaksanız** (`src/` altında): **`src/AGENTS.md`**'yi de okuyun.
- **Worker/API tarafında çalışacaksanız** (`worker/` altında): **`worker/AGENTS.md`**'yi de okuyun.

Kullanıcıya son teslim edilen özet niteliğindedir — önceki oturumlarda (Claude Sonnet 5 ile)
alınan kararları ve mevcut durumu yansıtır.

---

## 1. Proje nedir

Süper Lig maçları için arkadaş grubu tahmin oyunu (Kicktipp tarzı). Kullanıcılar Google ile giriş
yapar, "topluluk" kurar veya davet linkiyle bir topluluğa katılır, her hafta maçlara kesin skor
tahmini girer, hem gerçek Süper Lig puan durumunu hem de kendi topluluğundaki sıralamayı
(haftalık + sezon toplamı) canlı olarak takip eder.

**Mutlak kısıt: her şey ücretsiz olmalı.** Bu, mimarinin her kararını şekillendirdi: Firebase Spark
(ücretsiz) planı, Cloud Function yok (Spark'ta dış API'ye giden Function çalışmıyor), canlı veri
için GitHub Actions cron + API-Football'ın ücretsiz katmanı (100 istek/gün), repo'nun **public**
olması gerekliliği (private repoda GitHub Actions dakika sınırı aşılabilir).

---

## 2. Depo yapısı (üst seviye)

```
tahmin-ligi/
├── AGENTS.md              ← bu dosya (proje geneli)
├── README.md               ← kullanıcıya yönelik kurulum adımları (Firebase, API-Football, GitHub, deploy)
├── src/                    ← React frontend — bkz. src/AGENTS.md
│   └── shared/scoring.ts   ← PUANLAMA MOTORU, tek kaynak, worker de bunu import eder
├── worker/                 ← Node.js canlı-veri senkronizasyon paketi — bkz. worker/AGENTS.md
├── firestore.rules          ← GÜVENLİK MODELİNİN TEK KAYNAĞI (her iki tarafı da ilgilendirir)
├── firestore.indexes.json
├── firebase.json / .firebaserc   (default proje = "demo-tahmin-ligi", emulator-only)
└── .github/workflows/sync.yml    ← worker'ı çalıştıran GitHub Actions cron'u
```

---

## 3. Mimari — veri akışı (paylaşılan gerçek)

```
React SPA ──onSnapshot──> Firestore (Spark) <──Admin SDK (kuralları atlar)── worker/ (GitHub Actions, 5dk cron)
                                                                                    │
                                                                                    ▼
                                                                          API-Football (100 istek/gün, ücretsiz)
```

- İstemci (frontend) yazmaları **tamamen `firestore.rules` ile denetlenir**.
- Worker'ın yazdığı her şey (maçlar, puan durumu, tahmin `points` alanı, `locked` bayrağı)
  **kurallara tabi değildir** — Admin SDK güvenilir bir yazardır, frontend'e bu veri `onSnapshot`
  ile anlık yansır.

### Firestore koleksiyonları — kim neyi yazar

| Yol | Kim yazar | Notlar |
|---|---|---|
| `users/{uid}` | sadece kendisi | e-posta içerir, başkası okuyamaz |
| `communities/{id}` | oluşturan (create), sahip (rename/delete) | `list` hiç açılmaz |
| `communities/{id}/members/{uid}` | worker (puan alanları), kullanıcı (profil alanları) | `role`, `totalPoints`, `totalPredictions`, `winsCount` sadece worker |
| `communities/{id}/predictions/{uid}_{matchId}` | kullanıcı (kendi tahmini) | **topluluk bazlı**, global değil — bkz. aşağı |
| `inviteCodes/{code}` | sahip | `get` var, `list` yok (numaralandırma engellenir) |
| `teams/{id}` | worker | `apiTeamId, name, shortName, crestUrl` |
| `matches/{id}` | worker | global, tüm topluluklarda ortak |
| `standings/superlig` | worker | tek doküman, tüm tablo |
| `meta/config` | worker | `season, currentGameweek, lastFixtureSyncAt, lastStandingsSyncAt` |
| `syncState/highlightlyQuota` | worker | günlük istek sayacı |

**Neden tahminler topluluk bazlı (global değil):** Bir maç kilitlendikten sonra tahmin sadece AYNI
topluluktaki üyelere görünmeli (kullanıcı kararı). Global saklansaydı, kilitlenen bir tahmin
sitedeki HERKESE açık olurdu. Bedeli: kullanıcı birden fazla toplulukta ise aynı tahmin N kez
yazılır (frontend'de `saveMyPrediction` bunu otomatik yapar, kullanıcı tek skor girer).

---

## 4. Puanlama kuralı (GÜNCEL — "Rule of Nine" değil!)

İlk tasarımda klasik Kicktipp "Rule of Nine" (ev/deplasman ayrımlı) kullanılmıştı, ama kullanıcı
sonradan **basitleştirilmiş, ev/deplasman ayrımı olmayan** tabloya geçilmesini istedi:

| | Eğilim | Gol Farkı | Sonuç |
|---|---|---|---|
| **Galibiyet** (ev ya da deplasman fark etmez) | 2 | 3 | 5 |
| **Beraberlik** | 2 | — | 5 |

**Tek kaynak: `src/shared/scoring.ts`** (`computeMatchPoints`, `classifyPrediction`,
`isTendencyOrBetter`). Worker bu dosyayı `../../src/shared/scoring.ts` göreli yoluyla import eder,
**kopyalamaz**. Kural değişirse SADECE bu dosyayı değiştir, `src/shared/scoring.test.ts`'i yeni
değerlerle güncelle. Detay için `src/AGENTS.md` ve `worker/AGENTS.md`'deki ilgili bölümlere bakın.

**Bilinen tutarsızlık (kasıtlı, düzeltilmedi):** Kullanıcının orijinal kural metni "Tied on
points... wins ON MATCHDAYS" diyor (yani W = en yüksek puanı aldığınız hafta sayısı). Şu an
uygulanan `winsCount` bunun yerine "en az eğilim doğru tahmin ettiğiniz MAÇ sayısı"nı sayıyor.
Gerçek "haftalık kazanma" semantiğine geçmek istenirse `worker/AGENTS.md`'deki backlog'a bakın.

---

## 5. Güvenlik kuralları — kritik noktalar (`firestore.rules`)

Bu üç incelik bu oturumda **canlı emulator testleriyle bulunup düzeltildi** — her iki tarafta
çalışan ajanlar da bunları bilmeli (frontend hangi sorguları nasıl atması gerektiğini bilmeli,
worker/kural değiştiren taraf bunları tekrar kırmamalı):

1. **Collection-group sorguları için `{path=**}/<koleksiyon>/{id}` bloğu şart.** Normal
   `match /communities/{id}/members/{uid}` bloğu SADECE tek bir topluluğa scoped doğrudan
   sorguları kapsar — `collectionGroup(db,'members')` gibi bir sorguyu KAPSAMAZ.
   `firestore.rules`'ta bu yüzden ayrıca `match /{path=**}/members/{memberUid}` ve
   `match /{path=**}/predictions/{predictionId}` blokları var (self-uid only).
2. **`get` isteğinde doküman yoksa `resource` `null` olur.** `resource.data.X` şeklinde
   dereference etmek "evaluation error" (= permission-denied) fırlatır, `false` değil. İlgili
   `get` kurallarında `resource == null || ...` guard'ı var.
3. **`list` sorguları "provable" olmalı.** Bir kural `resource.data.X == Y` gibi bir koşula
   bakıyorsa, istemci sorgusu `where('X','==',Y)` ile filtrelenmiş olmalı — yoksa Firestore
   sorgunun TAMAMINI reddeder. (Frontend tarafında bunun somut etkisi için `src/AGENTS.md`'ye
   bakın — `useGameweekPredictions` bu yüzden iki ayrı sorgu çalıştırıyor.)

Bu üç noktayı doğrulayan otomatik testler: `src/test/firestore.rules.test.ts` (9 test, Firestore
emulator gerektirir). **`firestore.rules`'ı değiştirdikten sonra mutlaka bu testleri çalıştırın**
(`firebase emulators:start --only firestore,auth` ayaktayken `npm test`). Emulator, kural
dosyasındaki değişiklikleri otomatik hot-reload eder.

---

## 6. Şu ana kadarki durum (özet)

- Uçtan uca çalışan bir uygulama: giriş, topluluk oluşturma/katılma, tahmin girişi, canlı puan
  durumu, liderlik tablosu — hepsi Firestore emulator'ına karşı elle test edildi.
- **Canlı puanlama doğrulandı**: bir maç elle canlı 1-1 → 2-0 → bitti 2-1 yapıldı, arayüz sayfa
  yenilemeden doğru güncellendi; worker'ın puan kesinleştirme (`finalizeFinishedMatches`)
  fonksiyonu da emulator'a karşı çalıştırılıp `totalPoints`/`winsCount` doğru arttığı doğrulandı.
- 4 UI bug'ı bu oturumda bulunup düzeltildi (detay: `src/AGENTS.md`).
- **25/25 test geçiyor** (16 puanlama + 9 güvenlik kuralı), `npm run build` temiz, worker
  `tsc --noEmit` temiz.
- **Hiçbir zaman gerçek API-Football verisine karşı çalıştırılmadı** — sadece yerel seed script'i
  ve elle yazılmış simülasyon script'leriyle test edildi (detay: `worker/AGENTS.md`).
- **Xcode lisansı çözüldü, git kuruldu, GitHub'a push edildi.** Repo: **public**,
  `github.com/ayildirim12/tahmin-ligi`. `.env.local`, `.env.production.local` ve
  `worker/secrets/` (service account) `.gitignore` ile korunuyor.
- **Gerçek Firebase projesi hazır**: `tahmin-ligi-sl2026` (hesap: [redacted]).
  Firestore (Spark, `eur3`) oluşturuldu, `firestore.rules`/`firestore.indexes.json` deploy edildi,
  web app kaydedildi (config → `.env.production.local`, gitignored ama SIR DEĞİL — Firebase web
  config zaten public olmak üzere tasarlanmış). Worker için `tahmin-ligi-worker` servis hesabı
  oluşturuldu (`roles/datastore.user`), anahtarı `worker/secrets/service-account.json`'da
  (gitignored) VE GitHub secret `FIREBASE_SERVICE_ACCOUNT_JSON` olarak yüklü. Gerçek Firestore'a
  karşı Admin SDK write+read testi yapıldı, başarılı.
- **Google Sign-In auth provider'ı AÇILDI VE DOĞRULANDI** (Identity Toolkit API'den
  `"enabled": true` kontrol edildi).
- **Canlı veri sağlayıcısı API-Football'dan Highlightly'e değiştirildi** (kullanıcının "başka
  bir API var mı" sorusu üzerine araştırılıp seçildi — detay ve gerekçe: `worker/AGENTS.md`
  başlığı). `worker/src/apiFootball.ts` → `worker/src/highlightlyApi.ts`, `statusMap.ts`
  Highlightly'nin metin tabanlı durumlarına göre yeniden yazıldı. **Hiçbir response şekli gerçek
  API'ye karşı doğrulanmadı** (bkz. `worker/AGENTS.md §4`) — dokümantasyon örneklerinden çıkarıldı.
- **GitHub Actions workflow'u BİLİNÇLİ OLARAK DEVRE DIŞI** (`gh workflow disable`) — çünkü
  `HIGHLIGHTLY_API_KEY` secret'ı ve `SUPERLIG_LEAGUE_ID` variable'ı henüz yok, aktifken her 5
  dakikada bir başarısız olup e-posta spam'i yapardı. `SUPERLIG_SEASON=2026` variable'ı ve
  `FIREBASE_SERVICE_ACCOUNT_JSON` secret'ı zaten ayarlı. Highlightly anahtarı gelince:
  `gh secret set HIGHLIGHTLY_API_KEY --repo ayildirim12/tahmin-ligi`,
  `gh variable set SUPERLIG_LEAGUE_ID --repo ayildirim12/tahmin-ligi --body <ID>`, sonra
  `gh workflow enable "Sync Süper Lig data" --repo ayildirim12/tahmin-ligi`.

---

## 7. Yapılacaklar (proje geneli, öncelik sırasıyla)

1. **Highlightly hesabı + GitHub kurulumu**: detay için `worker/AGENTS.md` §4 ve §6 — anahtar/lig
   ID alındıktan sonra TÜM §4 doğrulama maddelerini test edip workflow'u yeniden etkinleştirmeyi
   unutma (SADECE kullanıcı hesap açabilir; doğrulama + kod tarafı burada yapılabilir).
2. **Deploy**: `npm run build` (bu `.env.production.local`'ı otomatik kullanır) →
   `firebase deploy --only hosting --project=production` → Firebase Console → Authentication →
   Authorized domains'e prod Hosting alan adını ekle (Google girişinin prod'da çalışması için).

---

## 8. Yerelde çalıştırma (her ikisi birden)

```bash
npm install && (cd worker && npm install)
firebase emulators:start --only firestore,auth     # ayrı terminal
npm run dev                                          # ayrı terminal — http://localhost:5173
```

`.env.local` zaten emulator'a bağlanacak şekilde dolu (`VITE_USE_EMULATORS=true`, demo config).
Google girişi emulator'da sahte hesap seçiciyle çalışır — gerçek Google hesabı gerekmez.

Bu oturumun sonunda emulator (8080/9099 portları) ve `npm run dev` (5173) arka planda **hâlâ
çalışıyor olabilir** — yeni bir terminal/ajan bunları bulamazsa yukarıdaki komutlarla yeniden
başlatın.

---

## 9. Diğer notlar

- `~/Projects/superlig-tahmin` diye **alakasız** bir başka proje var (kişisel kullanım için
  ML tabanlı skor tahmin sistemi, Python). Bu projeyle **hiçbir ilgisi yok**, karıştırmayın.
- UI metni Türkçe, kod/yorumlar İngilizce (mevcut konvansiyon, her iki tarafta da geçerli).
