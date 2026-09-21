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
- **lucide-react** ikonlar, **nanoid** (davet kodu üretimi, `src/lib/inviteCode.ts`).
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
│   ├── layout/        NavBar, AppShell, BottomTabBar, CommunitySwitcher, GameRulesDialog, tabs.ts
│   ├── community/      CommunitySettingsDialog, InviteLinkCard, MemberList
│   ├── standings/       StandingsTable, TeamCrest (bkz. §3 — piksel bazlı boyutlandırma), FormBadge, ZoneLegend
│   ├── leaderboard/     LeaderboardMatrix, LeaderboardSeasonTable, MatchColumnHeader,
│   │                    PredictionCell, SortableHeaderCell, GameweekSwitcher
│   ├── predictions/      FixtureCard (maç durumu rozeti + manuel skor girişi), ScoreInput
│   └── ui/                Button, Card, Dialog, Input, Switch (bkz. §3 — inline style ile
│                          konumlandırma), Spinner, IconButton
├── pages/            LandingPage, CommunityHubPage, JoinCommunityPage, CommunityLayout,
│                     StandingsTab, LeaderboardTab, PredictionCenterTab, ProfileTab, RequireAuth
├── lib/               cn (clsx wrapper), time, inviteCode, lastCommunity, liveScoring
│                     (computeCellState — canlı hücre durumu hesaplama), standingsZones
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
  tek-üyeyken silme), Süper Lig puan durumu (zon renkleri, form ikonları), haftalık + sezon
  toplamı sıralama (sıralanabilir T/W/P), Tahmin Merkezi (manuel skor girişi — **+/- stepper
  YOK**, kullanıcı doğrudan rakam yazıyor, `ScoreInput.tsx`), maç saatine kadar düzenlenebilir/maç
  başlayınca kilitlenir (hem UI hem kural katmanında), Oyun Kuralları penceresi (navbar'da,
  `GameRulesDialog.tsx`).
- **Canlı puanlama uçtan uca test edildi**: emulator'da bir maç elle 1-1 → 2-0 → bitti 2-1 yapıldı,
  arayüz sayfa yenilemeden her aşamada doğru puan/renk gösterdi (`src/lib/liveScoring.ts` →
  `computeCellState`, `LeaderboardMatrix`/`PredictionCell` bunu tüketir).
- Karanlık mod, mobil genişlik (gerçek 390px görünümde tek tek sayfa/dialog kontrol edildi),
  takım logoları (`TeamCrest` — API-Football `crestUrl`'üne hotlink, veri yoksa baş harfli daire
  fallback; logo YEREL DOSYA OLARAK BULUNDURULMUYOR, bilinçli — telif/yeniden dağıtım riskini
  önlemek için).
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
