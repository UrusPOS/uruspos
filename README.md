# UrusPOS

Sistem POS F&B Malaysia — Next.js 14, TypeScript, Tailwind CSS, dan Supabase.

## Tech stack

- **Next.js 14** — App Router (`src/app`)
- **TypeScript**
- **Tailwind CSS**
- **Supabase** — PostgreSQL, Auth, Row Level Security

## User roles

| Role | Laluan | Penerangan |
|------|--------|------------|
| `superadmin` | `/superadmin` | Pemilik platform |
| `owner` | `/owner` | Pemilik / admin kedai |
| `staff` | `/cashier` | Kakitangan kaunter |
| `kitchen` | `/kitchen` | Paparan dapur (KDS) |

## Project structure

```
src/
├── app/
│   ├── (auth)/login/          # Log masuk
│   ├── (platform)/superadmin/ # Platform admin
│   ├── (dashboard)/owner/     # Pentadbiran kedai
│   ├── (pos)/cashier/         # POS kaunter
│   ├── (kitchen)/kitchen/     # Kitchen display
│   └── auth/callback/         # Supabase OAuth callback
├── components/
│   ├── auth/
│   └── layout/
├── hooks/
├── lib/
│   ├── auth/
│   ├── constants/
│   └── supabase/
├── middleware.ts              # Session + role-based routing
└── types/
supabase/migrations/             # SQL schema
```

## Getting started

1. **Install dependencies** (sudah dipasang jika anda clone repo ini):

   ```bash
   npm install
   ```

2. **Supabase**

   - Cipta projek di [supabase.com](https://supabase.com)
   - Jalankan SQL dalam `supabase/migrations/001_initial_schema.sql` (SQL Editor atau CLI)
   - Salin `.env.example` ke `.env.local` dan isi URL + anon key

3. **Cipta pengguna pertama (superadmin)**

   Daftar pengguna melalui Supabase Auth, kemudian dalam SQL Editor:

   ```sql
   UPDATE public.profiles
   SET role = 'superadmin'
   WHERE email = 'admin@example.com';
   ```

4. **Jalankan dev server**

   ```bash
   npm run dev
   ```

   Buka [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Production server |
| `npm run lint` | ESLint |

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
