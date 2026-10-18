# Umut — KPSS Bilgi Yarışması

Umut, KPSS'ye hazırlananlar için tasarlanmış, gerçek zamanlı rekabete açık bir
bilgi yarışması web uygulamasıdır. Süreli sorular, hız/seri bonuslu puanlama,
seviye sistemi ve genel sıralama içerir.

> **Telif notu:** Uygulamadaki tüm sorular KPSS formatı örnek alınarak
> **özgün** olarak üretilmiştir. ÖSYM tarafından yayımlanmış çıkmış sorular
> kullanılmaz ve projenin ÖSYM ile bir bağlantısı yoktur.

## Teknoloji yığını

| Katman | Seçim |
| --- | --- |
| Çatı | Next.js 16 (App Router, Turbopack) + React 19 + TypeScript |
| Stil | Tailwind CSS v4 + el yapımı UI bileşenleri + `lucide-react` |
| Veritabanı | Prisma 7 + SQLite (dev) — production'da PostgreSQL'e taşınabilir |
| Kimlik | Better Auth 1.7 (e-posta + şifre, kullanıcı adı desteği) |
| Doğrulama | zod |

## Kurulum

```bash
npm.cmd install                # Windows'ta npm.ps1 politikaya takılırsa npm.cmd kullan
npm.cmd run db:migrate         # şemayı uygula
npm.cmd run db:seed            # 16 ders, 544 soru yükle
npm.cmd run dev                # http://localhost:3001
```

`.env` dosyası gerekir:

```env
DATABASE_URL="file:./prisma/dev.db"
BETTER_AUTH_SECRET="<32+ bayt rastgele>"
BETTER_AUTH_URL="http://localhost:3001"
NEXT_PUBLIC_APP_URL="http://localhost:3001"
BETTER_AUTH_TRUSTED_ORIGINS="http://localhost:3000,http://localhost:3001"
```

> **Not:** Port 3000 bu makinede başka bir proje tarafından kullanıldığı için
> Umut **3001** portuna sabitlenmiştir (`package.json` içindeki `dev`/`start`
> script'lerine `-p 3001` eklidir).

## Komutlar

| Komut | Açıklama |
| --- | --- |
| `npm.cmd run dev` | Geliştirme sunucusu (port 3001) |
| `npm.cmd run build` | Production derlemesi |
| `npm.cmd run typecheck` | `next typegen` + `tsc --noEmit` |
| `npm.cmd run db:migrate` | `prisma migrate dev` |
| `npm.cmd run db:seed` | Soru bankasını yükle (idempotent) |
| `npm.cmd run db:studio` | Prisma Studio |

## Sayfalar

| Yol | Açıklama |
| --- | --- |
| `/` | Tanıtım sayfası, dersler, zirvedekiler |
| `/kayit`, `/giris` | Kayıt ve giriş |
| `/oyna` | Oyun merkezi (mod seçimi + seviye/istatistik özeti) |
| `/oyun/[runId]` | Aktif tur (süreli soru ekranı) |
| `/oyun/[runId]/sonuc` | Tur sonucu, XP/seviye, yanlış soru tekrarı |
| `/siralama` | Genel sıralama |
| `/profil` | Profil, ders bazlı başarı, tur geçmişi |

## Mimari

```
src/
  app/
    api/auth/[...all]/route.ts   Better Auth handler
    oyun/actions.ts              Sunucu eylemleri (server actions)
    ...                          Rotalar
  components/
    game/                        Oyun tahtası, mod seçici, sonuç ekranı
    ui/                          Button, Card, Input, Badge, Progress, Avatar
    category-icon.tsx            Kategori slug → Lucide ikonu
  lib/
    auth.ts / auth-client.ts     Better Auth sunucu + istemci
    game.ts                      Oyun motoru (otoriter, sunucu tarafı)
    game-types.ts                SAF tipler (istemci + sunucu ortak)
    scoring.ts                   Puanlama, XP, seviye kuralları
    leaderboard.ts               Sıralama sorguları
    session.ts                   Oturum yardımcıları (requireUser/requireAdmin)
    prisma.ts                    Prisma client + better-sqlite3 adapter
  proxy.ts                       Next 16 "middleware" karşılığı (çerez kontrolü)
prisma/
  schema.prisma                  Veri modeli
  seed.ts                        Tohumlama (+ kullanımdan kalkanları pasife alma)
  seed-categories.ts             16 dersin kanonik listesi
  seed-data/questions.json       Soru bankası (tek doğruluk kaynağı)
  seed-data/parts/*.json         Toplu üretilen soru parçaları
scripts/
  validate-questions.ts          Soru dosyası doğrulayıcı
  merge-questions.ts             parts/*.json → questions.json birleştirici
  e2e-check.ts                   Uçtan uca motor testi
  inspect-db.ts                  DB dökümü
  inspect-run.ts                 Tek tur incelemesi
```

### Güvenlik modeli

- Doğru cevap ve puan **sunucuda** hesaplanır; istemciye doğru cevap
  gönderilmez.
- İstemciden gelen süre, sunucudaki geçen süreyle **kırpılır** — "0 ms cevap"
  hilesiyle hız bonusu toplanamaz.
- `src/proxy.ts` yalnızca hızlı bir çerez kontrolü yapar; **gerçek yetki
  kontrolü her sunucu eyleminde** (`requireSessionOrThrow`) tekrarlanır.
- `role` alanı Better Auth'ta `input: false` olarak işaretlidir; kullanıcı
  kendi rolünü yükseltemez.

## Puanlama

```
puan = round((BASE_POINTS + hız bonusu) × zorluk çarpanı) + seri bonusu

hız bonusu  = round(100 × (30000 - geçen_ms) / 30000)   # 0–100
seri bonusu = min(ardışık_doğru × 20, 100)              # 0–100
zorluk      = { kolay: 1.0, orta: 1.25, zor: 1.5 }
```

- Soru süresi 30 saniye; süre dolarsa soru boş sayılır ve seri sıfırlanır.
- Tur başına 10 soru.
- `XP = round(puan / 10) + (doğru sayısı × 5)`; her 500 XP bir seviye.
- Sıralama ölçütü: `totalScore` ↓ → `correctAnswers` ↓ → güncellenme zamanı ↑.

## İçerik

Soru bankası 16 dersten oluşur (toplam **544 soru**):

Türkçe 42 · Matematik 42 · Geometri 42 · Tarih 42 · Coğrafya 42 ·
Vatandaşlık ve Temel Hukuk 42 · Güncel Bilgiler 37 · Gelişim Psikolojisi 30 ·
Öğrenme Psikolojisi 30 · Program Geliştirme 30 · Ölçme ve Değerlendirme 30 ·
Rehberlik ve Psikolojik Danışma 30 · Öğretim İlkeleri ve Yöntemleri 30 ·
Sınıf Yönetimi 25 · Öğretim Teknolojileri 25 · Özel Eğitim 25

`prisma/seed-categories.ts` derslerin kanonik listesidir.
`prisma/seed-data/questions.json` ise **tek doğruluk kaynağıdır**: tohumlama
sırasında dosyada bulunmayan kayıtlar silinmez, `isActive: false` yapılır —
böylece geçmiş turların cevap kayıtları bozulmaz.

## Soru ekleme

### Yol 1 — Doğrudan (birkaç soru)

1. `prisma/seed-data/questions.json` dosyasına ekle:

```json
{
  "categorySlug": "matematik",
  "topic": "Denklem",
  "difficulty": 2,
  "text": "Soru metni?",
  "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
  "correctOption": "C",
  "explanation": "Kısa çözüm açıklaması"
}
```

2. `npm.cmd run db:seed` — mevcut sorular güncellenir, yenileri eklenir
   (kopya üretmez; id, kategori + soru metninden türetilir).

### Yol 2 — Parça hâlinde (toplu üretim)

Soruları `prisma/seed-data/parts/` altında ayrı JSON dosyalarına yazıp
birleştirmek, elle düzenlemeye göre daha güvenlidir:

```bash
npx.cmd tsx scripts/validate-questions.ts prisma/seed-data/parts/yeni.json
npx.cmd tsx scripts/merge-questions.ts   # parts/*.json + questions.json → questions.json
npm.cmd run db:seed
```

- `validate-questions.ts`: kategori slug'ını, zorluk aralığını, seçenekleri,
  açıklama uzunluğunu, dosya içi / dosyalar arası / mevcut soru bankasıyla
  çakışmayı denetler; zorluk ve doğru-cevap harfi dağılımını raporlar.
- `merge-questions.ts`: yalnızca geçerli soruları alır, kopyaları eler ve
  çıktıyı deterministik olarak sıralar.

## Yol haritası

- [x] Üyelik sistemi, oturum ve korumalı rotalar
- [x] Soru bankası, kategori yönetimi, tohumlama
- [x] Tek kişilik oyun: hızlı tur, kategori turu, günlük meydan okuma
- [x] Puanlama, XP, seviye, sonuç ekranı, yanlış soru tekrarı
- [x] Genel sıralama ve profil
- [ ] Karşılıklı canlı yarışma (mod seçimi bekleniyor)
- [ ] Yönetim paneli (soru CRUD)
- [ ] PostgreSQL'e geçiş ve yayına alma
