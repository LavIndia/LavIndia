````markdown
This is a [Next.js](https://nextjs.org) project using the App Router and Prisma.

## Project structure

- `app/` — App Router pages and routes
  - `page.tsx` — Home
  - `layout.tsx` — Root layout
  - `globals.css` — Global styles
  - `api/products/route.ts` — Products API route
  - `earrings/`, `necklaces/`, `rings/` — Category pages
- `components/` — UI and layout components
- `lib/` — Utilities
- `public/` — Static assets (images, etc.)
- `prisma/` — Prisma schema and seeds
  - `schema.prisma`
  - `seed.ts`
- `styles/` — Design tokens and theme helpers

Notes:

- Removed duplicate root files (`layout.tsx`, `page.tsx`, `globals.css`), duplicate `api/` folder, and duplicate `schema.prisma`/`seed.ts` at the root.
- Removed committed Prisma generated client folders. Generation happens via `@prisma/client` and `prisma generate`.
- ESLint ignores `generated/**` so accidental local artifacts don't break linting.

## Getting Started

Run the development server:

```bash
npm run dev
```

Open http://localhost:3000 to see the app. Edit `app/page.tsx` and save to reload.

## Prisma

- Generate client: `npm run db:generate`
- Migrate dev: `npm run db:migrate`
- Seed: `npm run db:seed`
- Studio: `npm run db:studio`

## Deploy

Follow the Next.js deployment guide: https://nextjs.org/docs/app/building-your-application/deploying
````
