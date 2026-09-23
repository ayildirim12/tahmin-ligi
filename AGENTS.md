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
| `communities/{id}/members/{uid}/predictions/{matchId}` | kullanıcı (kendi tahmini) | **topluluk VE üye bazlı** (nested), global değil — bkz. aşağı. Doküman ayrıca `communityId` alanını da taşır (denormalize) — collection-group sorguları ata yoluna göre filtreleyemediği için şart |
| `inviteCodes/{code}` | sahip | `get` var, `list` yok (numaralandırma engellenir) |
| `teams/{id}` | worker | `apiTeamId, name, shortName` (crest YOK — bkz. §9, logolar API'den değil `public/crests/{id}.png`'den) |
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
   `firestore.rules`'ta bu yüzden ayrıca `match /{path=**}/members/{memberUid}` (self-uid only) ve
   `match /{path=**}/predictions/{predictionId}` blokları var — ikincisi self-uid'e EK olarak
   `resource.data.locked==true && isCommunityMember(resource.data.communityId)` de kabul eder,
   çünkü tahminler artık `members/{uid}/predictions` altında nested olduğu için "bu topluluktaki
   TÜM kilitli tahminler" sorgusu (liderlik tablosu) ancak collection-group + denormalize
   `communityId` alanıyla mümkün.
2. **`get` isteğinde doküman yoksa `resource` `null` olur.** `resource.data.X` şeklinde
   dereference etmek "evaluation error" (= permission-denied) fırlatır, `false` değil. İlgili
   `get` kurallarında `resource == null || ...` guard'ı var.
3. **`list` sorguları "provable" olmalı.** Bir kural `resource.data.X == Y` gibi bir koşula
   bakıyorsa, istemci sorgusu `where('X','==',Y)` ile filtrelenmiş olmalı — yoksa Firestore
   sorgunun TAMAMINI reddeder. (Frontend tarafında bunun somut etkisi için `src/AGENTS.md`'ye
   bakın — `useGameweekPredictions` bu yüzden iki ayrı sorgu çalıştırıyor.)

Bu üç noktayı doğrulayan otomatik testler: `src/test/firestore.rules.test.ts` (13 test, Firestore
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
- **29/29 test geçiyor** (16 puanlama + 13 güvenlik kuralı), `npm run build` temiz, worker
  `tsc --noEmit` temiz.
- **Hiçbir zaman gerçek API-Football verisine karşı çalıştırılmadı** — sadece yerel seed script'i
  ve elle yazılmış simülasyon script'leriyle test edildi (detay: `worker/AGENTS.md`).
- **Xcode lisansı çözüldü, git kuruldu, GitHub'a push edildi.** Repo: **public**,
  `github.com/ayildirim12/tahmin-ligi`. `.env.local`, `.env.production.local` ve
  `worker/secrets/` (service account) `.gitignore` ile korunuyor.
- **Gerçek Firebase projesi hazır**: `tahmin-ligi-sl2026` (kullanıcının kendi Google hesabında).
  Firestore (Spark, `eur3`) oluşturuldu, `firestore.rules`/`firestore.indexes.json` deploy edildi,
  web app kaydedildi (config → `.env.production.local`, gitignored ama SIR DEĞİL — Firebase web
  config zaten public olmak üzere tasarlanmış). Worker için `tahmin-ligi-worker` servis hesabı
  oluşturuldu (`roles/datastore.user`), anahtarı `worker/secrets/service-account.json`'da
  (gitignored) VE GitHub secret `FIREBASE_SERVICE_ACCOUNT_JSON` olarak yüklü. Gerçek Firestore'a
  karşı Admin SDK write+read testi yapıldı, başarılı.
- **Google Sign-In auth provider'ı AÇILDI VE DOĞRULANDI** (Identity Toolkit API'den
  `"enabled": true` kontrol edildi).
- **Canlı veri sağlayıcısı API-Football'dan Highlightly'e değiştirildi VE PRODUCTION'DA
  DOĞRULANDI** (kullanıcının "başka bir API var mı" sorusu üzerine araştırılıp seçildi — detay
  ve gerekçe: `worker/AGENTS.md` başlığı). `worker/src/apiFootball.ts` →
  `worker/src/highlightlyApi.ts`, `statusMap.ts` Highlightly'nin metin tabanlı durumlarına göre
  yeniden yazıldı. Gerçek API anahtarıyla test edilip 2 gerçek hata bulunup düzeltildi
  (standings alan adları, Node 20→22 gereksinimi) — detay `worker/AGENTS.md §4/§6`.
- **Süper Lig gerçek lig ID'si**: `173537` (isim tam olarak `"Süper Lig"`, Türkçe ü ile).
- **GitHub Actions workflow'u AKTİF VE PRODUCTION'DA DOĞRULANDI ÇALIŞIYOR.** Tüm secrets/
  variables ayarlı (`HIGHLIGHTLY_API_KEY`, `FIREBASE_SERVICE_ACCOUNT_JSON`,
  `SUPERLIG_LEAGUE_ID=173537`, `SUPERLIG_SEASON=2026`). İlk `workflow_dispatch` denemesi Node 20
  hatasıyla başarısız oldu (§ yukarı), düzeltilip tekrar tetiklendi — **ikinci deneme tamamen
  başarılı** (`gh run view 35656525688 --repo ayildirim12/tahmin-ligi`, ~19sn, "no live/imminent
  match — quiet run" ile temiz çıktı). Artık normal 5 dakikalık cron'a göre kendiliğinden
  çalışıyor. `teams` (18), `matches` (153), `standings/superlig` (18 satır) prod Firestore'da
  gerçek veriyle dolu.

---

## 7. Yapılacaklar (proje geneli, öncelik sırasıyla)

**Highlightly kurulumu ve prod deploy TAMAMLANDI** (worker aktif çalışıyor, site
`https://tahmin-ligi-sl2026.web.app` adresinde canlı — bkz. §6 ve `worker/AGENTS.md` §6).
Landing page Google marka kurallarına uygun giriş butonu + özgün görsel kimlikle yenilendi
(`src/pages/LandingPage.tsx`, `src/components/icons/GoogleIcon.tsx`).

Kalan, hepsi opsiyonel/polish niteliğinde (zorunlu değil):

1. **JS bundle code-split** — `dist/assets/index-*.js` ~1MB, `dynamic import()` ile bölünebilir
   (detay `src/AGENTS.md` §6).
2. **Hesap silme "blocked" akışının görsel testi** — çoklu üyeli topluluğun tek sahibiyken
   engellenmesi şu ana kadar sadece kod incelemesiyle doğrulandı, gerçek 2. kullanıcıyla
   denenmedi.
3. **"Wins" tie-break semantiği** — şu an "eğilim-veya-üstü tahmin sayısı"; gerçek Kicktipp
   "haftalık kazanma" anlamına çevrilmek istenirse hem `worker/finalize.ts` hem leaderboard
   gösterimi değişmeli (detay `worker/AGENTS.md` §6). Kullanıcı bunu şu ana kadar istemedi.
4. **İlk gerçek CANLI maçta gözle doğrulama** — `pollLiveScores()` ve `LeaderboardMatrix`'in
   LIVE/HT geçişleri prod'da hiç görülmedi (testler sadece "Not started"/"Finished" ile yapıldı).

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
- **Takım logoları artık local dosya (`public/crests/{teamId}.png`), API'den değil.** Bu,
  daha önceki bilinçli kararın (Highlightly `team.logo`'ya hotlink, telif/yeniden-dağıtım
  riskinden kaçınmak için) **kullanıcı talebiyle tersine çevrilmiş hali** — Highlightly'nin
  logoları güncel değildi (ör. isim/amblem değiştiren kulüpler eski logoyu döndürüyordu).
  18 kulübün güncel resmi amblemi Wikipedia/Wikimedia Commons'tan indirilip `{teamId}.png`
  olarak (dosya adı = Firestore doc id = Highlightly numeric team id) kondu; `TeamCrest.tsx`
  artık Firestore'da hiç `crestUrl` alanına bakmıyor, direkt `/crests/${team.id}.png`
  path'ini kullanıyor (resim yoksa/kırıksa `onError` ile baş harfli daireye düşüyor).
  Worker (`worker/src/teams.ts`) artık `crestUrl` yazmıyor. **Bilinen ödün:** bu, kulüp
  amblemlerini ticari olmayan bir hobi projesinde barındırmak — yaygın pratik ama saf
  copyright/marka riski sıfır değil; kullanıcı bilerek bu tercihi yaptı. Yeni bir takım
  eklenirse (küme değişikliği vb.) `public/crests/{yeniId}.png` elle eklenmeli, otomatik
  gelmez.
- **Takım `name`/`shortName` de artık API'den güvenilir okunmuyor — `worker/src/teamOverrides.ts`
  ile hardcode override ediliyor.** Sebep: Highlightly bazı kulüpleri Türkçe karaktersiz
  döndürüyor ("Besiktas", "Fenerbahce", "Goztepe", "Genclerbirligi") ve en az iki kulüpte isim
  değişikliğinden sonra eski ismi döndürüyordu ("Gazişehir Gaziantep" → gerçek güncel isim
  "Gaziantep FK"; "Yeni Çorumspor" → "Çorum FK") — crest URL'lerindeki güncel-olmama sorunuyla
  aynı kök neden. Eski `shortName` üretimi de (`name.slice(0,3).toUpperCase()`) JS'in
  `toUpperCase()`'ının Türkçe noktalı İ kuralını bilmemesinden bozuktu (ör. "Rizespor" →
  "RIZ", doğrusu "RİZ"). `TEAM_OVERRIDES` 18 kulübün hepsini elle doğru isim + tanınır
  kısaltmayla kapsıyor (büyük 4 için gerçek yayın kısaltmaları: GS/FB/BJK/TS). `syncTeams()`
  bilinen bir id için override'ı kullanıyor, bilinmeyen (yeni) bir takım için API'nin
  ham/mekanik türetilmiş değerine düşüyor. **Bu değişiklik prod Firestore'a worker koduyla
  DEĞİL, tek seferlik bir admin script'iyle anında uygulandı** (API key yerelde yoktu) —
  worker'ın kendisi bir sonraki gerçek çalıştırmasında zaten aynı override'ları yazacağı için
  idempotent, fark yaratmaz.
