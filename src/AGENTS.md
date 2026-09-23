# AGENTS.md — Frontend (`src/`)

Bu dosya sadece `src/` (React frontend) tarafını ilgilendirir. Proje geneli, mimari, Firestore
koleksiyon sahipliği ve puanlama kuralı için önce **`../AGENTS.md`**'yi okuyun — burada
tekrarlanmıyor.

---

## 1. Teknoloji yığını

- **React 19** + **Vite 8** + **TypeScript** (`tsconfig.app.json` → `strict`, `noUnusedLocals`,
  `erasableSyntaxOnly` açık — yani class'larda parameter-property shorthand gibi TS-özel syntax
  KULLANILAMAZ, sadece tip erasure'a indirgenen kod yazılabilir).
- **Tailwind CSS v4** — CSS-first config (`src/index.css`), JS config dosyası yok.
  `@theme inline` ile semantik renk token'ları tanımlı (`--color-background`, `--color-primary`,
  `--color-success/warning/tendency/destructive` vb. — leaderboard hücre renklendirmesi bunları
  kullanıyor), `@custom-variant dark (&:where(.dark, .dark *))` ile class-bazlı dark mode.
- **react-router-dom v7** — `src/router.tsx`, `createBrowserRouter`.
- **Radix UI**: sadece `@radix-ui/react-dialog` (→ `src/components/ui/Dialog.tsx` wrapper) ve
  `@radix-ui/react-dropdown-menu` (→ `CommunitySwitcher.tsx`) kullanılıyor. Kullanılmayan
  `alert-dialog`/`tabs`/`toast`/`toggle` paketleri kaldırıldı (bkz. değişiklik geçmişi).
- **lucide-react** ikonlar, **nanoid** (davet kodu üretimi `src/lib/inviteCode.ts`; topluluk ID
  üretimi `src/lib/communityId.ts` — bkz. §5).
- **Vitest** + jsdom (`environment: 'jsdom'`, vite.config.ts'de tanımlı) + `@firebase/rules-unit-testing`.

---

## 2. Klasör yapısı ve sorumluluklar

```
src/
├── shared/          scoring.ts (PUANLAMA MOTORU — worker da import eder, bkz. ../AGENTS.md §4), types.ts
├── firebase/         config.ts (env'den init, emulator auto-connect),
│                     auth.ts (Google popup sign-in),
│                     firestore.ts (TÜM koleksiyon/doküman referansları burada merkezi),
│                     communityActions.ts (create/join/leave/delete/removeMember — SIRALI
│                       yazmalar, bkz. §4 aşağı), predictionActions.ts (create-vs-update branch'i),
│                     accountActions.ts (hesap silme cascade'i)
├── contexts/         AuthContext, ThemeContext (localStorage + prefers-color-scheme),
│                     ActiveCommunityContext (communityId route param'ından community+membership sağlar)
├── hooks/            useCommunities (collectionGroup keşif sorgusu), useCommunity,
│                     useMembers, useGameweekMatches, useGameweekPredictions (İKİ SORGU PATTERN'İ,
│                       bkz. §4), useMyPrediction, useStandings, useTeams, useConfig
├── components/
│   ├── layout/        NavBar, AppShell, BottomTabBar, CommunitySwitcher, GameRulesDialog,
│   │                  BrandLink (tıklanabilir "Tahmin Ligi" logosu → `/`, bkz. §5), tabs.ts
│   ├── community/      CommunitySettingsDialog, InviteLinkCard, MemberList
│   ├── standings/       StandingsTable, TeamCrest (bkz. §3 — piksel bazlı boyutlandırma), FormBadge, ZoneLegend
│   ├── leaderboard/     LeaderboardMatrix (artık haftalık VE sezon toplamı tek tabloda — bkz. §5),
│   │                    MatchColumnHeader, PredictionCell, SortableHeaderCell, GameweekSwitcher
│   ├── predictions/      FixtureCard (maç durumu rozeti + manuel skor girişi), ScoreInput
│   └── ui/                Button (bkz. §3 — `google` varyantı), Card, Dialog, Input, Switch
│                          (bkz. §3 — inline style ile konumlandırma), Spinner, IconButton
├── pages/            LandingPage (GİRİŞ GEREKTİRMEZ — çıkışlıyken marketing kart, girişliyken
│                     DOĞRUDAN `<CommunityHubPage/>` render eder (topluluklarını görürsün, ayrı
│                     bir tıklama gerekmez), bkz. §5), LoginPage (/login, tek Google girişi
│                     ekranı), CommunityHubPage, JoinCommunityPage, CommunityLayout, StandingsTab,
│                     LeaderboardTab, PredictionCenterTab, CalendarTab (bkz. §5), ProfileTab,
│                     RequireAuth
├── lib/               cn (clsx wrapper), time, inviteCode, communityId (bkz. §5),
│                     lastCommunity, liveScoring (computeCellState — canlı hücre durumu
│                     hesaplama), standingsZones
└── test/              firestore.rules.test.ts
```

---

## 3. KESİN KURAL — Dinamik Tailwind class'ını ASLA template literal ile kurma

Bu oturumda gerçek bir bug'a sebep oldu (karanlık mod anahtarı ters duruyordu, bkz. `git log` /
önceki konuşma), o yüzden ayrıntılı yazıyorum:

```tsx
// YANLIŞ — translate-x-0.5 hiç üretilmedi, ama className string'i DOĞRU görünüyordu
className={`... ${cond ? 'translate-x-5' : 'translate-x-0.5'}`}
```

**Kök neden:** Tailwind v4'ün class tarayıcısı, iç içe tırnaklı ternary içinde ondalıklı değer
içeren (`0.5`, `1.5` gibi) class'ları bazen ATLIYOR — class DOM'a render ediliyor ama karşılık
gelen CSS kuralı Tailwind'in ürettiği stylesheet'te hiç yok, sessizce. React state/mantık
tamamen doğru olsa bile sonuç yanlış render oluyor.

**Kural:**
- **Statik/basit koşullu class'lar için** `cn()` (`src/lib/cn.ts`) kullan, her dal AYRI ve TAM bir
  string literal olsun: `cn('base', cond && 'bg-primary')`. Bu güvenli.
- **Dinamik/ondalıklı SAYISAL değerler için** (transform, translate, hesaplanan boyut vb.)
  Tailwind class'ı değil, **inline `style={{...}}`** kullan. Örnekler:
  - `src/components/ui/Switch.tsx` — toggle konumunu `style={{ transform: checked ?
    'translateX(20px)' : 'translateX(0)' }}` ile yapıyor, `translate-x-*` class'ı DEĞİL.
  - `src/components/standings/TeamCrest.tsx` — `size` prop'u alıp `style={{ width, height }}`
    üretiyor, çağıran taraf `className="size-N"` YAZMIYOR (eskiden yazıyordu, bug'a sebep oldu —
    fallback baş harfleri de `style={{ fontSize: size * 0.34 }}` ile piksel bazlı ölçekleniyor).
- **Şüphedeysen doğrulama yöntemi:** sadece render edilen `className` string'ine bakmak
  YETERSİZ. Tarayıcı konsolunda gerçekten üretilen CSS'i kontrol et:
  ```js
  document.querySelector('style').textContent.includes('.translate-x-0\\.5')
  ```
  Bu bug'da className DOĞRU görünüyordu (`translate-x-0.5` DOM'daydı) ama bu satır `false`
  dönüyordu — yani class hiç CSS karşılığı olmadan orada duruyordu.

---

## 4. Firestore sorgu pattern'leri (frontend'e özel gotcha'lar)

Kurallar dosyasının genel mantığı `../AGENTS.md §5`'te — burada bunun CLIENT KODUNA somut etkisi:

- **`useGameweekPredictions`** (`src/hooks/useGameweekPredictions.ts`): bir topluluğun tahminlerini
  TEK sorguyla çekmiyor, İKİ ayrı `onSnapshot` açıp sonuçları merge ediyor — ama artık iki sorgu
  FARKLI KOLEKSİYON ŞEKİLLERİ üzerinde çalışıyor (tahminler `members/{uid}/predictions` altında
  nested olduğu için, düz bir "topluluğun tüm tahminleri" koleksiyonu artık yok):
  - "mine": `memberPredictionsCol(communityId, myUid)` — kendi nested alt koleksiyonumu FİLTRESİZ
    okuyorum (path zaten bana scoped).
  - "locked": `collectionGroup(db,'predictions')` + `where('communityId','==',id)` +
    `where('locked','==',true)` — topluluktaki HERKESİN kilitli tahminlerini bulmanın tek yolu,
    çünkü collection-group sorgusu ata path'ine göre filtreleyemez, sadece alan değerine göre
    (bu yüzden her prediction dokümanı `communityId` alanını da taşıyor).
  Sonuçlar `predictionKey(uid, matchId)` (VERİDEN türetilen, `${uid}_${matchId}` biçiminde bir
  string) ile birleştiriliyor — **ASLA ham `doc.id` ile değil**: nested yapıda doküman id'si artık
  sadece `matchId`, yani farklı üyelerin aynı maça ait dokümanları AYNI id'yi taşıyor ve ham id'yi
  key olarak kullanmak sessizce birini diğerinin üstüne yazar. Yeni bir liderlik/tahmin görünümü
  eklerken bu iki-sorgu + veri-bazlı-key pattern'ini kopyala, tek birleşik sorgu ya da `doc.id`
  key'i YAZMA (biri reddedilir, diğeri veri kaybına yol açar).
- **`useMyPrediction`** (`src/hooks/useMyPrediction.ts`): henüz hiç tahmin girilmemiş bir maç için
  `onSnapshot(predictionDoc(...))` — doküman yok, `resource` null. `firestore.rules`'taki ilgili
  `get` kuralı bunu `resource == null || ...` ile karşılıyor. Yeni benzer bir "tekil doküman var mı
  yok mu" okuması eklerken kuralın da bu guard'a sahip olduğunu kontrol et.
- **`useCommunities`** (`src/hooks/useCommunities.ts`): "hangi topluluklardayım" keşfi
  `collectionGroup(db,'members').where('uid','==',myUid)` ile yapılıyor — bunun çalışması için
  `firestore.rules`'ta `match /{path=**}/members/{memberUid}` bloğu şart (normal nested
  `communities/{id}/members/{uid}` bloğu collection-group sorgularını kapsamaz).
- **`communityActions.ts` → `createCommunity`**: topluluk oluşturma tek bir `writeBatch` DEĞİL,
  SIRALI üç ayrı `await setDoc(...)` (community → member(owner) → inviteCode). Sebep: her yazmanın
  güvenlik kuralı bir önceki dokümanı `get()` ile kontrol ediyor, ve Firestore kuralları bir
  batch içindeki `get()` çağrılarını batch'in KENDİ pending yazmalarını görecek şekilde
  garanti ETMİYOR — bu yüzden atomiklik feda edilip sıralı yazma tercih edildi (crash durumunda
  yarım kalmış topluluk riski var ama kabul edilebilir, hub sayfası self-heal etmiyor şu an).

---

## 5. Şu ana kadar yapılan ve doğrulanan (frontend)

- **Tüm frontend "canlı skor tablosu / yayın grafiği" kimliğine göre yeniden tasarlandı**
  (kullanıcı: her sayfada istemeden bir "AI look" oluşmuştu — Landing/Login/404'te birebir
  kopyalanmış gradient-blob arka plan + glassmorphism kart + jenerik gradyanlı Trophy-ikon rozeti,
  hiç yüklenmeyen bir "Inter" fontu, radius token'ı olmadan rastgele `rounded-*` kullanımı, favicon
  olarak markayla alakasız soyut bir gradyan blob). Değişenler:
  - **Renk paleti** (`src/index.css`): kullanıcının ChatGPT ile ürettiği yeni forma-arması logosundan
    (siyah/kırmızı/altın/krem) türetildi — `--primary` artık altın (taç rengi), `--accent` kırmızı
    (kalkan rengi); `--destructive` (kırmızı) ve `--warning` (altın/amber) ile çakışmaması için
    `--warning`'in hue'su 75→58'e kaydırıldı, `--destructive` hiç dokunulmadı. Koyu tema öncelikli
    tasarlandı ama açık tema de tam destekleniyor (aynı token çifti, ayrı değerler).
  - **Radius token'ı** eklendi (`@theme { --radius-sm/md/lg/xl/2xl }`) — eskiden her bileşende ayrı
    `rounded-*` serpiştirilmişti, artık tek ölçek; `rounded-3xl` (sadece 3 hero sayfasında vardı)
    tamamen kaldırıldı.
  - **Fontlar gerçekten yükleniyor** artık (`index.html`'e Google Fonts `<link>`): `Oswald`
    (`font-display` token'ı — başlıklar, puan/skor rakamları) + `Inter` (`font-sans`, zaten
    tanımlıydı ama hiç linklenmemişti, sessizce sistem fontuna düşüyordu).
  - **Logo işleme pipeline'ı** (`scripts/process-logo.py`, elle çalıştırılır, build'in parçası
    değil): kaynak PNG'nin opak siyah arkaplanını **köşeden başlayan flood-fill** ile şeffaflaştırır
    (global chroma-key KULLANMADI — topun kendi siyah pentagonlarını da şeffaflaştırırdı). İki türev
    üretir: `public/brand/logo-full-*` (amblem+"TAHMİN LİGİ" yazısı, hero kullanımı) ve
    `public/brand/mark-64.png`+favicon boyutları (sadece taç+top, yazısız — küçük boyutta okunmaz
    olurdu). `BrandLink.tsx` artık jenerik gradyanlı Trophy ikonu değil gerçek marka görselini
    gösteriyor; `public/favicon.svg` (alakasız gradyan blob) ve `public/icons.svg` (hiç kullanılmayan
    ölü sprite) silindi.
  - **`AuthHeroShell.tsx`** (yeni paylaşılan bileşen): `LandingPage`/`LoginPage`/`NotFoundPage`'de
    birebir kopyalanmış (aynı inline `style` gradyan blob + `backdrop-blur` cam kart) hero bloğunu
    tekilleştirdi — yumuşak gradyan blob + pitch-line doku yerine tek yönlü altın "spotlight" +
    ince mesh doku, glassmorphism yerine düz `bg-surface` + `border-t-4 border-t-primary` "lower
    third" kenarlığı. `LoginPage`'den jenerik "Tamamen ücretsiz, kredi kartı gerekmez." cümlesi
    kaldırıldı (Google OAuth'ta anlamsızdı).
  - **`Dialog.tsx` + `CommunitySwitcher.tsx`'in dropdown'ı artık framer-motion ile gerçekten
    animasyonlu** açılıp kapanıyor (`AnimatePresence` + Radix `forceMount`). **Dikkat**:
    framer-motion'ın `scale`/`y` animasyonu da CSS `transform` kullandığı için, Dialog'un ESKİ
    `-translate-x-1/2 -translate-y-1/2` ile ortalama yöntemi transform'u PAYLAŞIP birbirini
    ezerdi — bu yüzden ortalama artık transformsuz bir `fixed inset-0 flex items-center
    justify-center` sarmalayıcıya taşındı, `transform`'u sadece iç `motion.div` kullanıyor.
  - **Skeleton loading** (`src/components/ui/skeletons/`, `react-content-loader` ile) 5 adet
    içerik-bazlı `<Spinner>` yerine geçti (Standings/Leaderboard/PredictionCenter/Calendar/
    CommunityHub) — 5 tam-sayfa/auth-gate `<FullScreenSpinner>` (içerik şekli henüz belli değilken)
    olduğu gibi bırakıldı. **Bulunan gerçek kütüphane bug'ı**: `react-content-loader`'a geçirilen
    children bir `<g>` ile sarmalanınca (`<g key={i}>...</g>`) bu tarayıcıda `<clipPath>` içinde HİÇ
    render olmuyordu (tamamen boş/görünmez) — React `Fragment`'a çevrilince (gerçek bir DOM elementi
    oluşturmadığı için children doğrudan `clipPath`'in altına düşüyor) düzeldi. Yeni bir skeleton
    yazarken bunu tekrar riske atma: children'ı `<g>` ile GRUPLAMA, `<Fragment key={...}>` kullan.
  - **`MemberAvatar.tsx`** (yeni, `TeamCrest.tsx`'in `onError`→baş harf-dairesi fallback deseninin
    aynısı): `LeaderboardMatrix`, `MemberList`, `ProfileTab`'daki çıplak `<img src={photoURL}>`
    kullanımlarının HİÇBİRİNDE fallback yoktu (URL eksik/kırıksa hiçbir şey görünmüyordu) — artık
    üçü de bunu kullanıyor. `MemberList.tsx`'e ayrıca eksik olan boş-durum mesajı ("Henüz üye yok.")
    eklendi.
  - **Canlı gösterge rengi primary(altın)'dan accent(kırmızı)'ya çevrildi** (`FixtureCard.tsx`nın
    `MatchStatusBadge`'i, `CalendarTab.tsx`nın `ResultBadge`'i, `MatchColumnHeader.tsx`) — kırmızı
    canlı için yaygın yayın konvansiyonu, altın CTA/lider vurgusuna ayrıldı.
  - **`public/crests/*.png` sıkıştırıldı** (`scripts/compress-crests.mjs`, `sharp`+`pngquant`):
    18 dosya 1.2MB → ~56KB (**%95 azalma**) — 500px kaynak çözünürlükten fiili render boyutunun
    (18-28px) 2 katına (64px) küçültüldü. `TeamCrest.tsx`'te kod değişikliği YOK, sadece dosya
    değişti.
  - Yeni bağımlılıklar: `framer-motion`, `react-content-loader` (runtime); `sharp` (devDependency,
    logo + crest sıkıştırma script'lerinde kullanılıyor, `pngquant` de `brew install pngquant` ile
    kurulu olmalı — kurulu değilse script'ler sharp-only sıkıştırmaya düşer).
  - Backend'e (Firestore rules/schema, `worker/`, hook'ların döndürdüğü veri şekli) KESİNLİKLE
    dokunulmadı — sadece render/asset katmanı değişti.
- Google girişi, topluluk oluşturma/katılma/ayarlar (davet linki paylaşma, üye çıkarma, ayrılma,
  tek-üyeyken silme), Süper Lig puan durumu (zon renkleri — güncel TFF 2026-27 UEFA katılım
  sırasına göre, bkz. `standingsZones.ts`, form ikonları), Tahmin Merkezi (manuel skor girişi —
  **+/- stepper YOK**, kullanıcı doğrudan rakam yazıyor, `ScoreInput.tsx`), maç saatine kadar
  düzenlenebilir/maç başlayınca kilitlenir (hem UI hem kural katmanında), Oyun Kuralları penceresi
  (navbar'da, `GameRulesDialog.tsx`).
- **Sıralama artık TEK tablo** (`LeaderboardMatrix.tsx`): maç-bazlı hücreler + "Hafta" (o
  gameweek'in toplamı) + "Toplam" (sezon) yan yana. Önceki "Bu Hafta / Sezon Toplamı" sekme
  ayrımı ve ayrı `LeaderboardSeasonTable.tsx` kaldırıldı (kullanıcı isteğiyle birleştirildi).
- **Giriş akışı yeniden tasarlandı** (kullanıcı isteğiyle): `/` (`LandingPage.tsx`) artık **giriş
  gerektirmeyen, her zaman erişilebilir bir ana menü** — "Topluluk oluştur" (`/hub`) ve "Profilim"
  (`/profil`) butonları, ikisi de `RequireAuth` altında. Google girişi ekranı ayrı bir sayfaya
  taşındı: **`/login`** (`LoginPage.tsx`, eski `LandingPage`'in giriş kartıyla aynı). `RequireAuth`
  artık `/?redirect=...` değil **`/login?redirect=...`**'a yönlendiriyor. Kimliği doğrulanmamış biri
  `/hub` veya `/profil`'e (doğrudan ya da ana menüdeki butonlarla) gitmeye çalışırsa otomatik
  `/login`'e düşer, giriş sonrası `redirect` parametresindeki hedefe döner. Her sayfada geri
  dönüşü kolaylaştırmak için sol üstte tıklanabilir bir **`BrandLink`** ("Tahmin Ligi" logosu →
  `/`) var — `LoginPage`'de kendi başına, `NavBar`'da HER ZAMAN (topluluk aktifken bile,
  `CommunitySwitcher`'ın solunda; dar ekranda metin gizlenip sadece ikon kalıyor, bkz. §3'teki
  gibi bir responsive-metin pattern'i) gösteriliyor.
- **`LandingPage` (`/`) girişliyken artık ikinci bir "tıkla → topluluklarını gör" adımı değil**:
  `useAuth()` ile `user` doluysa doğrudan `<CommunityHubPage/>` render ediyor (aynı bileşen,
  `/hub`'da da kullanılıyor — iki route, tek kaynak, kod tekrarı yok). Çıkışlıyken hâlâ eski
  marketing kart (Topluluk oluştur / Profilim, ikisi de `/hub`→`/login` ya da `/profil`→`/login`
  zincirinden geçiyor).
- **Topluluk ID'leri artık Firestore'un çirkin 20 karakterlik auto-ID'si değil, isimden türeyen
  okunabilir bir slug**: `createCommunity` artık `src/lib/communityId.ts`'deki
  `generateCommunityId(name)` ile üretilen `{slug}-{5-karakter-rastgele-suffix}` biçiminde bir ID
  kullanıyor (ör. "Ofis Şampiyonası" → `ofis-sampiyonasi-mmbex`) — `/{communityId}/...`
  URL'sinin "açıkça bir veritabanı ID'si gibi görünmesin" istendiği için (kullanıcı: "domain de
  firebase id gözüksün istemem", sonra: "topluluk adı/puan-tablosu olsun"). Türkçe karakterler
  transliterate ediliyor (ş→s, ğ→g, vb.), suffix her zaman ekleniyor (aynı isimli iki topluluk
  çakışmasın diye) — yani URL asla salt "temiz" bir isim değil, hep `-xxxxx` son eki taşıyor;
  bu bilinçli bir tercih (id, Firestore doc id olarak da kullanılıyor, gerçek benzersizlik şart).
  **Sadece YENİ oluşturulan topluluklar için geçerli** — eski topluluklar (bu oturumdan önce
  oluşturulanlar) hâlâ eski Firestore auto-ID'sini taşıyor, geriye dönük migrasyon YAPILMADI
  (mevcut kullanıcı verisini bozma riski / istenmedi).
- **Topluluk route'undan `/c/` öneki tamamen kaldırıldı** (kullanıcı: "o c de olmasın işte
  url de") — `router.tsx`'te `path: '/c/:communityId'` → `path: '/:communityId'` oldu, artık
  DOĞRUDAN kök seviyede bir dinamik segment. Bu, `/hub`, `/login`, `/profil`, `/join/:code` gibi
  statik route'larla ÇAKIŞMAZ çünkü React Router route ranking'i statik segmentleri dinamik
  `:param`'dan her zaman önce dener (aynı üst route'un kardeşleri olarak tanımlı oldukları
  sürece) — ayrıca topluluk ID'leri her zaman rastgele bir suffix taşıdığı için (bkz. yukarı)
  "hub"/"profil"/"login"/"join" ile birebir çakışması pratikte imkansız. Tüm `/c/${id}/...`
  inşa noktaları (`tabs.ts`, `CommunitySwitcher`, `CreateCommunityDialog`,
  `CommunityHubPage`, `JoinCommunityPage`) `/${id}/...`'e güncellendi.
- **Gerçek 404 sayfası** (`NotFoundPage.tsx`, `BrandLink` + "Sayfa bulunamadı" + "Ana sayfaya
  dön" butonu): önceden `*` route'u ve geçersiz/erişimsiz topluluk ID'si (`CommunityLayout`)
  kullanıcıyı sessizce `/`'e ya da `/hub`'a yönlendiriyordu — kullanıcı bunu "erişilemeyen
  sayfa ... sayfa bulunamadı, ana sayfaya dön olsun" diye özellikle istedi çünkü sessiz
  yönlendirme neyin ters gittiğini belli etmiyordu. Tek segment'lik geçersiz bir yol (ör.
  `/ornek`) route yapısı gereği `/:communityId`'ye düşüyor, `CommunityLayout` community'yi
  bulamayınca (ya da üye değilsen) artık `<NotFoundPage/>` render ediyor — asıl `*` catch-all
  sadece çok-segmentli/tamamen tanınmayan yollar için devreye giriyor, ikisi de aynı bileşeni
  kullanıyor.
- **`computeCellState` artık bir `isOwn` parametresi alıyor** (`liveScoring.ts`) — kullanıcı:
  "girdiğim tahmin skoru burada gözüksün ... asıl maç sonucu ve kaç puan aldığım gözüksün".
  Kod zaten tahmini (`pending`) ve sonuç+puanı (`scored`) doğru gösteriyordu; asıl sorun KENDİ
  satırında henüz tahmin GİRMEDİĞİN, hâlâ açık (SCHEDULED) bir maçın da diğer üyelerin gizlilik
  kuralıyla gizlenen hücreleriyle AYNI kilit ikonunu göstermesiydi — kafa karıştırıcıydı çünkü
  kendi tahminin senden asla "gizli" değil, sadece henüz girilmemiş. `LeaderboardMatrix.tsx`
  artık `member.uid === user?.uid` olan satır için `isOwn=true` geçiyor; bu durumda `prediction
  === null` her zaman `no-prediction` (tire) döner, `hidden` (kilit) ASLA — kilit artık sadece
  BAŞKALARININ henüz kilitlenmemiş hücrelerinde görünüyor (orada gerçekten belirsiz: tahmin
  etmiş olabilirler, edememiş olabilirler, gizlilik kuralı gereği bilemiyoruz).
- **`PredictionCell.tsx`'in `pending` hücresi artık bare "1-0" değil, üstte küçük "Tahmin"
  etiketiyle** (kullanıcı: "1-0 yazmaktansa ... böyle yazınca sanki maç öyle bitti oluyor" —
  etiketsiz skor, maç henüz oynanmamışken bile bitmiş gibi okunuyordu). `scored` hücresine de
  `title` tooltip eklendi ("Tahmin: H-A / Sonuç: {tier etiketi} / Kazanılan puan: N") — dar
  matris hücresinin (72px sütun) kompakt görünümünü bozmadan tam detay hover'da görünüyor.
- **Topluluk ID migrasyon script'i** (`worker/scratch/migrateCommunityIds.ts`, gitignored):
  eski 20-karakterlik Firestore auto-ID'li toplulukları (`/^[A-Za-z0-9]{20}$/` deseni) yeni
  slug formatına taşıyor — community dokümanını + `members`/`predictions` alt koleksiyonlarını
  yeni ID'ye kopyalar, `inviteCodes/{code}.communityId`'yi ve her üyenin
  `users/{uid}.communityIds` dizisini günceller, kopya doğrulandıktan SONRA eski dokümanları
  siler. **Emulator'da çalıştırılıp doğrulandı** (abb, Test Topluluğu başarıyla taşındı).
  **Production'da ÇALIŞTIRILAMADI** — auto mode classifier bunu "Cloud Storage Mass Delete"
  olarak işaretleyip engelledi (silme adımı içerdiği için). Kullanıcıdan açık onay/manuel
  çalıştırma gerekiyor; script hazır ve test edilmiş durumda, sadece izin bekliyor.
- **Yeni "Takvim" sekmesi** (`CalendarTab.tsx`, `/{id}/takvim`, `communityTabs`'a eklendi):
  `GameweekSwitcher` ile herhangi bir haftaya gidip o haftanın TÜM maçlarını (geçmiş/canlı/
  gelecek) salt-okunur görebiliyorsun — sonuç + varsa kendi tahminin ve kazandığın puan
  (`computeCellState` yeniden kullanılıyor, Tahmin Merkezi'ndeki `ScoreInput` YOK, düzenleme
  içermiyor). `BottomTabBar`'daki sekme sayısı artık sabit değil (4 topluluk sekmesi + Profil =
  5) — bu yüzden `grid-cols-4` hardcode'u kaldırıldı, `style={{ gridTemplateColumns: ... }}`
  inline style'a geçildi (dinamik Tailwind class ASLA template literal ile kurulmaz — bkz. §3).
- **Canlı puanlama uçtan uca test edildi**: emulator'da bir maç elle 1-1 → 2-0 → bitti 2-1 yapıldı,
  arayüz sayfa yenilemeden her aşamada doğru puan/renk gösterdi (`src/lib/liveScoring.ts` →
  `computeCellState`, `LeaderboardMatrix`/`PredictionCell` bunu tüketir).
- Karanlık mod, mobil genişlik (gerçek 390px görünümde tek tek sayfa/dialog kontrol edildi),
  takım logoları (`TeamCrest` — **artık local `public/crests/{team.id}.png`'den**, veri
  yoksa/kırıksa baş harfli daire fallback; API'ye hotlink KARARINDAN VAZGEÇİLDİ çünkü
  Highlightly'nin logoları güncel değildi — detay `../AGENTS.md §9`).
- **Bu oturumda bulunup düzeltilen 4 UI bug'ı**:
  1. Karanlık mod anahtarı ters duruyordu → `Switch.tsx` (bkz. §3)
  2. `FixtureCard`'da canlı/biten maçın gerçek skoru hiç gösterilmiyordu → `MatchStatusBadge`
     eklendi, artık "Bitti 2-1" / "Canlı · 34' 1-1 ●" gösteriyor + kilitliyken "Bu tahminden N
     puan kazandın" satırı
  3. `TeamCrest` fallback'lerinde küçük boyutlarda metin taşması/üst üste binme → piksel bazlı
     boyutlandırmaya geçildi (bkz. §3)
  4. Devre dışı butonlar aktif butondan görsel olarak ayırt edilemiyordu (`disabled:opacity-50`
     karanlık temada neredeyse görünmüyordu) → `Button.tsx`'te `disabled:bg-surface-muted
     disabled:text-muted-foreground`'a çevrildi
- **29 test geçiyor** (16 `scoring.test.ts` + 13 `test/firestore.rules.test.ts`), `npm run build`
  temiz (tek uyarı: ana JS bundle ~1MB, code-split edilmedi — backlog).
- **Tahminler artık `communities/{id}/members/{uid}/predictions/{matchId}` altında nested**
  (eskiden `communities/{id}/predictions/{uid}_{matchId}` düz koleksiyondu). Sebep: kullanıcı
  "her member ayrı prediction yapacak, members altında olsun" istedi. Prod'daki eski
  `predictions` alt koleksiyonu MİGRASYON YAPILMADAN silindi (kullanıcı kararı: "direkt sil,
  sıfırdan başla") — `members.totalPoints/totalPredictions/winsCount` etkilenmedi, sadece maç
  bazlı tahmin geçmişi (Calendar/Leaderboard hücreleri) o ana kadarki maçlar için boş görünür.
  Bu değişiklik `useGameweekPredictions`'ın iki-sorgu deseninin ŞEKLİNİ değiştirdi (bkz. §4) ve
  her prediction dokümanına bir `communityId` alanı eklettirdi (collection-group sorgusu ata
  yoluna göre filtreleyemediği için gerekli — bkz. `../AGENTS.md §5`).

---

## 6. Backlog (frontend'e özel)

- Ana JS bundle'ı (`dist/assets/index-*.js`, ~1MB) `dynamic import()` ile code-split et.
- Hesap silme "blocked" durumunun (çoklu üyeli topluluğun tek sahibiyken engellenmesi) görsel
  testi hiç yapılmadı — sadece `accountActions.ts` kod incelemesiyle doğrulandı. Gerçek 2.
  kullanıcı hesabıyla test edilebilir.
- "Wins" tie-break semantiği (`winsCount`) gerçek Kicktipp "haftalık kazanma" anlamına
  çevrilmek istenirse hem worker (`finalize.ts`) hem burada (leaderboard gösterimi) değişiklik
  gerekir — detay `../AGENTS.md §4`.
- Chrome MCP `resize_window` aracı bu geliştirme ortamında tutarsız çalıştı (bazen viewport
  gerçekten küçülmüyordu) — mobil test yaparken screenshot ÇÖZÜNÜRLÜĞÜNDEN doğrula, sadece tool
  çağrısının "success" dönmesine güvenme.
- `navigator.clipboard.writeText` (`InviteLinkCard.tsx`) otomatik tarayıcı testlerinde "Document
  is not focused" hatasıyla başarısız olabilir — kodda hata değil, gerçek kullanıcı tıklamasında
  sorunsuz çalışır.

---

## 7. Yerelde çalıştırma / test

```bash
npm install
firebase emulators:start --only firestore,auth   # ayrı terminal, kural testleri için de gerekli
npm run dev                                        # http://localhost:5173
npm test                                            # vitest — scoring + rules testleri
npx tsc -b                                          # tip kontrolü
npm run build                                       # production build
```

`.env.local` zaten emulator'a bağlanacak şekilde dolu (`VITE_USE_EMULATORS=true`). Google girişi
emulator'da sahte hesap seçiciyle çalışır. Test verisi için `../AGENTS.md §8` veya
`worker/AGENTS.md`'deki seed script'ine bakın.
