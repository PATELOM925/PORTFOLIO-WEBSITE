# Om Patel Portfolio (Next.js + Cloudflare Workers)

A redesigned personal website migrated from Streamlit to Next.js App Router with a future-ready content model for projects and blog posts.

## Stack
- Next.js (TypeScript, App Router)
- MDX content with frontmatter (`content/blog`, `content/projects`)
- Cloudflare Workers deployment via OpenNext Cloudflare adapter
- Formspree contact form

## Routes
- `/`
- `/projects`
- `/projects/[slug]`
- `/blog`
- `/blog/[slug]`

## Local development
```bash
npm install
npm run dev
```

## Required environment variables
Create `.env.local`:
```bash
NEXT_PUBLIC_FORMSPREE_ID=xnnjbpve
NEXT_PUBLIC_SITE_URL=https://iampatelom.com
```

## Deploy to Cloudflare Workers
```bash
npm install
npm run cf:build
npm run cf:deploy
```

For non-interactive deploy environments, set a Cloudflare API token first:
```bash
export CLOUDFLARE_API_TOKEN=<your_cloudflare_api_token>
npm run cf:deploy
```

Recommended token permissions:
- `Account.Workers Scripts:Edit`
- `Account.Workers Tail:Read`
- `Zone.Workers Routes:Edit` (if using routes)

If your installed adapter version exposes different commands, run:
```bash
npx opennextjs-cloudflare --help
```
and map scripts accordingly.

## Content authoring
- Add project files to `content/projects/*.mdx`
- Add blog files to `content/blog/*.mdx`
- Keep frontmatter aligned with `src/types/content.ts`
