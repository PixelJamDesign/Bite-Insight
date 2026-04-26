/**
 * /recipes/:id preview — Vercel Edge Function.
 *
 * Renders an Open Graph-tagged HTML page so shared recipe links
 * unfurl as a rich card in iMessage / WhatsApp / Slack / Discord
 * and any other client that reads OG metadata.
 *
 * Routing:
 *   vercel.json maps /recipes/:id  →  /api/recipe-preview?id=:id
 *
 * Universal-link interaction:
 *   On a device with the Bite Insight app installed, iOS / Android
 *   intercept the URL via the AASA / assetlinks.json files at
 *   biteinsight.app/.well-known/ and open the app directly — this
 *   function never runs for those users. It only renders for
 *   browsers and link-preview bots (where the OG tags are the
 *   point) and for users who don't have the app yet.
 *
 * Data source:
 *   Public recipes via Supabase REST (the existing
 *   "Anyone can view public recipes" RLS policy on recipes + the
 *   "Authors of public recipes are visible" policy on profiles
 *   permit unauthenticated reads). Private / unknown recipes
 *   fall back to a generic "View recipe on Bite Insight"
 *   preview so we never leak data and never 404.
 */

export const config = {
  runtime: 'edge',
};

const SUPABASE_URL = 'https://bfkxjgbvsygvenmciasg.supabase.co';
// The anon key is intentionally hard-coded — it's the public key
// designed to be embedded in clients, scoped by RLS. Same key
// already lives in EXPO_PUBLIC_SUPABASE_ANON_KEY in the mobile bundle.
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJma3hqZ2J2c3lndmVubWNpYXNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1MzA0NTgsImV4cCI6MjA4MDEwNjQ1OH0.C9Xno8VHQIzFz-BgAUBanGcHllC8yzfhm8lbka572Yo';

interface RecipePreview {
  id: string;
  name: string;
  cover_image_url: string | null;
  author: { full_name: string | null } | null;
}

const APP_STORE_URL = 'https://apps.apple.com/app/bite-insight/id6739489541';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.biteinsightapp.gcahill';
const FALLBACK_OG_IMAGE = 'https://biteinsight.app/og-default.png';

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const id = url.searchParams.get('id') ?? '';
  const canonical = `https://biteinsight.app/recipes/${id}`;

  let recipe: RecipePreview | null = null;
  if (id) {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/recipes?id=eq.${encodeURIComponent(id)}` +
          `&visibility=eq.public&limit=1` +
          `&select=id,name,cover_image_url,author:profiles!recipes_user_id_fkey(full_name)`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
          // Edge runtime caching — five-minute revalidation is
          // plenty for share previews and saves Supabase from
          // getting hammered when a popular recipe goes viral.
          cf: { cacheTtl: 300 },
        } as RequestInit,
      );
      if (res.ok) {
        const rows = (await res.json()) as RecipePreview[];
        if (rows.length > 0) recipe = rows[0];
      }
    } catch {
      // Fall through to generic preview.
    }
  }

  const title = recipe?.name ?? 'Recipe on Bite Insight';
  const author = recipe?.author?.full_name ?? null;
  const description = recipe
    ? author
      ? `${recipe.name}, shared by ${author} on Bite Insight.`
      : `${recipe.name} — a recipe shared on Bite Insight.`
    : 'Open this recipe in the Bite Insight app, or grab the app to start scanning, building recipes, and tracking what suits your family.';
  const ogImage = recipe?.cover_image_url ?? FALLBACK_OG_IMAGE;

  const html = renderHtml({
    canonical,
    title,
    description,
    ogImage,
    recipeName: recipe?.name ?? null,
    author,
    coverImage: recipe?.cover_image_url ?? null,
  });

  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // Short cache so updates to a recipe propagate quickly without
      // hammering Supabase. Apple / Slack / WhatsApp link-preview
      // crawlers will respect this.
      'cache-control': 'public, max-age=300, s-maxage=300',
    },
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderHtml(args: {
  canonical: string;
  title: string;
  description: string;
  ogImage: string;
  recipeName: string | null;
  author: string | null;
  coverImage: string | null;
}): string {
  const t = escapeHtml(args.title);
  const d = escapeHtml(args.description);
  const og = escapeHtml(args.ogImage);
  const u = escapeHtml(args.canonical);
  const recipeName = args.recipeName ? escapeHtml(args.recipeName) : null;
  const author = args.author ? escapeHtml(args.author) : null;
  const cover = args.coverImage ? escapeHtml(args.coverImage) : null;

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${t} — Bite Insight</title>
    <meta name="description" content="${d}" />
    <link rel="canonical" href="${u}" />

    <!-- Open Graph (Facebook, iMessage, WhatsApp, Slack, Discord, etc.) -->
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="Bite Insight" />
    <meta property="og:title" content="${t}" />
    <meta property="og:description" content="${d}" />
    <meta property="og:url" content="${u}" />
    <meta property="og:image" content="${og}" />
    <meta property="og:image:alt" content="${t}" />

    <!-- Twitter / X -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${t}" />
    <meta name="twitter:description" content="${d}" />
    <meta name="twitter:image" content="${og}" />

    <!-- iOS Smart App Banner -->
    <meta name="apple-itunes-app" content="app-id=6739489541, app-argument=${u}" />

    <link rel="icon" href="/favicon.ico" />

    <style>
      :root {
        color-scheme: light;
        --bg: #e2f1ee;
        --surface: #ffffff;
        --primary: #023432;
        --secondary: #00776f;
        --accent: #3b9586;
        --stroke: #aad4cd;
      }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; }
      body {
        background: var(--bg);
        color: var(--primary);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 24px 16px 48px;
      }
      .wrap {
        width: 100%;
        max-width: 480px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .brand {
        font-weight: 700;
        font-size: 18px;
        letter-spacing: -0.4px;
        color: var(--primary);
        text-align: center;
        margin-top: 8px;
      }
      .card {
        background: var(--surface);
        border: 1px solid var(--stroke);
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 12px 24px rgba(2, 52, 50, 0.08);
      }
      .cover {
        width: 100%;
        aspect-ratio: 16 / 10;
        object-fit: cover;
        display: block;
        background: var(--bg);
      }
      .cover-placeholder {
        width: 100%;
        aspect-ratio: 16 / 10;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--bg);
        color: var(--secondary);
        font-weight: 700;
      }
      .body {
        padding: 16px 20px 20px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .name {
        font-size: 24px;
        line-height: 30px;
        font-weight: 700;
        letter-spacing: -0.48px;
        margin: 0;
      }
      .author {
        font-size: 16px;
        line-height: 24px;
        font-weight: 300;
        color: var(--secondary);
        margin: 0;
      }
      .cta {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 8px;
      }
      .btn {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 700;
        text-decoration: none;
        text-align: center;
        line-height: 20px;
      }
      .btn-primary {
        background: var(--secondary);
        color: #fff;
      }
      .btn-secondary {
        background: var(--surface);
        color: var(--primary);
        border: 1px solid var(--stroke);
      }
      .stores {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin-top: 8px;
      }
      .footer {
        font-size: 13px;
        color: var(--secondary);
        text-align: center;
        line-height: 18px;
        margin-top: 8px;
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="brand">Bite Insight</div>

      <div class="card">
        ${cover
          ? `<img class="cover" src="${cover}" alt="${t}" />`
          : `<div class="cover-placeholder">No cover image</div>`}
        <div class="body">
          <h1 class="name">${recipeName ?? 'Recipe'}</h1>
          ${author ? `<p class="author">By ${author}</p>` : ''}
        </div>
      </div>

      <div class="cta">
        <a class="btn btn-primary" href="biteinsight://recipes/${escapeHtml(args.canonical.split('/').pop() ?? '')}">
          Open in Bite Insight
        </a>
      </div>

      <div class="stores">
        <a class="btn btn-secondary" href="${APP_STORE_URL}">App Store</a>
        <a class="btn btn-secondary" href="${PLAY_STORE_URL}">Google Play</a>
      </div>

      <p class="footer">
        Tap "Open in Bite Insight" if you've got the app.
        Otherwise grab it on the App Store or Google Play.
      </p>
    </div>

    <script>
      // If the user has the app, the OS handles the universal link
      // before this page ever loads — they never see this. For users
      // who do reach this page, attempt a soft custom-scheme open in
      // case the app is installed but not yet associated with the
      // domain (e.g. fresh install, AASA cache not warmed). If that
      // does nothing, the on-page CTA buttons take over.
      (function () {
        var ua = navigator.userAgent || '';
        var isMobile = /iPhone|iPad|iPod|Android/i.test(ua);
        if (!isMobile) return;
        var id = ${JSON.stringify(args.canonical.split('/').pop() ?? '')};
        if (!id) return;
        // Slight delay so the page renders the OG fallback first;
        // if the deep link works, the user never notices.
        setTimeout(function () {
          window.location.href = 'biteinsight://recipes/' + id;
        }, 500);
      })();
    </script>
  </body>
</html>
`;
}
