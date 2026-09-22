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
  TEK sorguyla çekmiyor. `where('locked','==',true)` ve `where('uid','==',myUid)` diye İKİ ayrı
  `onSnapshot` açıp sonuçları merge ediyor. Sebep: güvenlik kuralı `resource.data.uid==self ||
  resource.data.locked==true` şeklinde, ve Firestore `list` sorgularında bu tarz OR koşulunu
  ancak sorgunun kendisi ilgili alanla filtrelenmişse "provable" sayıyor. Yeni bir liderlik/tahmin
  görünümü eklerken bu pattern'i kopyala, tek birleşik sorgu YAZMA (reddedilir).
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
- **25 test geçiyor** (16 `scoring.test.ts` + 9 `test/firestore.rules.test.ts`), `npm run build`
  temiz (tek uyarı: ana JS bundle ~1MB, code-split edilmedi — backlog).

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
