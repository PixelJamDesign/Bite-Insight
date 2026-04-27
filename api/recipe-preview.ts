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
  nutriscore_grade: string | null;
  like_count: number | null;
  author: { full_name: string | null; avatar_url: string | null } | null;
}

const APP_STORE_URL = 'https://apps.apple.com/app/bite-insight-food-scanner/id6760033160';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.biteinsightapp.gcahill';
const FALLBACK_OG_IMAGE = 'https://biteinsight.app/og-default.png';

// Nutri-score colour map — matches the in-app palette.
const NUTRISCORE_COLORS: Record<string, string> = {
  a: '#009a1f',
  b: '#b8d828',
  c: '#ffc72d',
  d: '#ff8736',
  e: '#ff3f42',
};

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
          `&select=id,name,cover_image_url,nutriscore_grade,like_count,` +
          `author:profiles!recipes_user_id_fkey(full_name,avatar_url)`,
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
    recipeId: id,
    recipeName: recipe?.name ?? null,
    author,
    authorAvatar: recipe?.author?.avatar_url ?? null,
    coverImage: recipe?.cover_image_url ?? null,
    nutriscore: recipe?.nutriscore_grade ?? null,
    likeCount: recipe?.like_count ?? null,
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
  recipeId: string;
  recipeName: string | null;
  author: string | null;
  authorAvatar: string | null;
  coverImage: string | null;
  nutriscore: string | null;
  likeCount: number | null;
}): string {
  const t = escapeHtml(args.title);
  const d = escapeHtml(args.description);
  const og = escapeHtml(args.ogImage);
  const u = escapeHtml(args.canonical);
  const recipeName = args.recipeName ? escapeHtml(args.recipeName) : null;
  const author = args.author ? escapeHtml(args.author) : null;
  const cover = args.coverImage ? escapeHtml(args.coverImage) : null;
  const avatar = args.authorAvatar ? escapeHtml(args.authorAvatar) : null;
  const grade = args.nutriscore ? args.nutriscore.toLowerCase() : null;
  const gradeColor = grade && NUTRISCORE_COLORS[grade] ? NUTRISCORE_COLORS[grade] : null;
  const likeCount =
    typeof args.likeCount === 'number' && args.likeCount > 0 ? args.likeCount : null;
  const initial =
    args.author && args.author.trim().length > 0
      ? escapeHtml(args.author.trim().charAt(0).toUpperCase())
      : 'B';

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
    <meta name="apple-itunes-app" content="app-id=6760033160, app-argument=${u}" />

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
        --mint: #b8dfd6;
        --spring-water: #e2f1ee;
      }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; }
      body {
        background: var(--bg);
        color: var(--primary);
        font-family: 'Figtree', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 60px 24px 48px;
        gap: 32px;
      }

      /* ── Brand block (app icon + wordmark + tagline) ─────────── */
      .brand {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 32px;
      }
      .app-icon {
        width: 70px;
        height: 70px;
        border-radius: 13px;
        background: linear-gradient(180deg, #ffffff 0%, var(--spring-water) 100%);
        box-shadow: inset 0 0 14px rgba(59, 149, 134, 0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      }
      .app-icon img { width: 100%; height: 100%; object-fit: cover; }
      .wordmark { display: flex; flex-direction: column; align-items: center; }
      .wordmark img.logo { width: 220px; height: auto; display: block; }

      /* ── Recipe card ──────────────────────────────────────────── */
      .feed {
        width: 100%;
        max-width: 640px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
      }
      .card {
        position: relative;
        width: 100%;
        background: #ffffff;
        border: 1px solid var(--stroke);
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 12px 12px rgba(68, 71, 112, 0.1);
        /* The card is a <button> so the whole tile is tappable —
           reset the default button look and lay it out like a div. */
        padding: 0;
        font: inherit;
        color: inherit;
        text-align: left;
        cursor: pointer;
        display: block;
        appearance: none;
        -webkit-tap-highlight-color: transparent;
        transition: transform 120ms ease, box-shadow 120ms ease;
      }
      .card:hover { transform: translateY(-1px); box-shadow: 0 14px 18px rgba(68, 71, 112, 0.14); }
      .card:active { transform: translateY(0); }
      .card:focus-visible { outline: 3px solid var(--accent); outline-offset: 3px; }
      .cover-wrap {
        position: relative;
        width: 100%;
        aspect-ratio: 320 / 180;
        background: var(--bg);
      }
      .cover-wrap img.cover {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .cover-placeholder {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--secondary);
        font-weight: 700;
      }
      .nutri-pill {
        position: absolute;
        right: 9px;
        bottom: -12px;
        width: 24px;
        height: 36px;
        border-radius: 999px;
        border: 2px solid #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
        font-weight: 700;
        font-size: 16px;
        line-height: 20px;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.29);
        box-shadow: 0 4px 4px rgba(68, 71, 112, 0.3);
      }
      .body {
        padding: 16px;
        display: flex;
        align-items: center;
        gap: 16px;
      }
      .avatar {
        flex: 0 0 auto;
        width: 48px;
        height: 48px;
        border-radius: 999px;
        border: 3px solid #ffffff;
        background: var(--spring-water);
        overflow: hidden;
        box-shadow: 0 3px 5px rgba(140, 166, 161, 0.22);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--primary);
        font-weight: 700;
        font-size: 18px;
      }
      .avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .meta {
        flex: 1 1 auto;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .name {
        font-size: 16px;
        line-height: 20px;
        font-weight: 700;
        color: var(--primary);
        margin: 0;
      }
      .author {
        font-size: 14px;
        line-height: 21px;
        font-weight: 300;
        color: var(--secondary);
        margin: 0;
        letter-spacing: -0.14px;
      }
      .likes {
        flex: 0 0 auto;
        background: var(--spring-water);
        border-radius: 8px;
        padding: 4px 8px;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        color: var(--secondary);
        font-size: 13px;
        font-weight: 700;
        letter-spacing: -0.26px;
        line-height: 1.2;
      }
      .likes svg { width: 14px; height: 14px; flex: 0 0 auto; }

      /* ── Primary CTA ──────────────────────────────────────────── */
      .cta {
        width: 100%;
        max-width: 640px;
        background: var(--secondary);
        color: #ffffff;
        text-decoration: none;
        text-align: center;
        font-size: 16px;
        font-weight: 700;
        font-family: inherit;
        line-height: 20px;
        padding: 16px 24px;
        border: 0;
        cursor: pointer;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      /* ── Download block ─────────────────────────────────────── */
      .download {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
      }
      .download h2 {
        margin: 0;
        font-size: 18px;
        line-height: 22px;
        font-weight: 700;
        color: var(--primary);
        letter-spacing: -0.36px;
        text-align: center;
      }
      .stores {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
        justify-content: center;
      }
      .stores a { display: inline-flex; }
      .stores img.app-store { height: 42px; width: auto; display: block; }
      .stores img.google-play { height: 60px; width: auto; display: block; margin: -9px 0; }
    </style>
  </head>
  <body>
    <!-- Brand: app icon + wordmark + tagline -->
    <div class="brand">
      <div class="app-icon">
        <img src="/share/app-icon.png" alt="Bite Insight" />
      </div>
      <div class="wordmark">
        <img class="logo" src="/share/logo-full.svg" alt="Bite Insight — Scan your snacks. Know the facts." />
      </div>
    </div>

    <!-- Recipe card -->
    <div class="feed">
      <button id="open-app-card" class="card" type="button" aria-label="Open this recipe in Bite Insight">
        <div class="cover-wrap">
          ${cover
            ? `<img class="cover" src="${cover}" alt="${t}" />`
            : `<div class="cover-placeholder">No cover image</div>`}
          ${gradeColor
            ? `<div class="nutri-pill" style="background:${gradeColor}">${escapeHtml(grade!.toUpperCase())}</div>`
            : ''}
        </div>
        <div class="body">
          <div class="avatar">
            ${avatar
              ? `<img src="${avatar}" alt="${author ?? 'Avatar'}" />`
              : `<span>${initial}</span>`}
          </div>
          <div class="meta">
            <h1 class="name">${recipeName ?? 'Recipe'}</h1>
            ${author ? `<p class="author">by ${author}</p>` : ''}
          </div>
          ${likeCount
            ? `<span class="likes">
                 <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                   <path d="M2 9h4v12H2zM22 11a2 2 0 0 0-2-2h-6l1-4.5c.2-1-.6-1.9-1.6-1.5L8 9v12h11.3a2 2 0 0 0 2-1.6L22 11z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
                 </svg>
                 ${likeCount} ${likeCount === 1 ? 'like' : 'likes'}
               </span>`
            : ''}
        </div>
      </button>

      <button id="open-app-btn" class="cta" type="button">
        Open Bite Insight app
      </button>
    </div>

    <!-- Download block -->
    <div class="download">
      <h2>Download the app today</h2>
      <div class="stores">
        <a href="${APP_STORE_URL}" aria-label="Download on the App Store">
          <img class="app-store" src="/share/app-store-badge.svg" alt="Download on the App Store" />
        </a>
        <a href="${PLAY_STORE_URL}" aria-label="Get it on Google Play">
          <img class="google-play" src="/share/google-play-badge.png" alt="Get it on Google Play" />
        </a>
      </div>
    </div>

    <script>
      // The big "Open Bite Insight app" button needs to do the right
      // thing on three different surfaces:
      //   • iOS / Android with the app installed → custom-scheme
      //     deep link launches straight into the recipe.
      //   • iOS / Android without the app → fall through to the
      //     platform's App Store / Play Store after ~1.2s.
      //   • Desktop browsers → can't launch a native app at all, so
      //     send them to the App Store directly. Otherwise the click
      //     would silently do nothing (which is the bug we just hit).
      (function () {
        var id = ${JSON.stringify(args.recipeId)};
        var ua = navigator.userAgent || '';
        var isIos = /iPhone|iPad|iPod/i.test(ua);
        var isAndroid = /Android/i.test(ua);
        var isMobile = isIos || isAndroid;
        var APP_STORE_URL = ${JSON.stringify(APP_STORE_URL)};
        var PLAY_STORE_URL = ${JSON.stringify(PLAY_STORE_URL)};
        var storeUrl = isAndroid ? PLAY_STORE_URL : APP_STORE_URL;

        function openApp() {
          if (!isMobile) {
            // No native app on desktop — send them to the store.
            window.location.href = storeUrl;
            return;
          }
          if (!id) {
            window.location.href = storeUrl;
            return;
          }
          // Try the custom scheme. If the app is installed the
          // browser switches context and our setTimeout never fires.
          // If nothing handles the scheme, the timer ticks and we
          // forward the user to the relevant store.
          var start = Date.now();
          var timer = setTimeout(function () {
            if (Date.now() - start < 2000 && document.visibilityState === 'visible') {
              window.location.href = storeUrl;
            }
          }, 1200);
          // If the page becomes hidden, the deep link worked — clear
          // the fallback timer so the user doesn't get bounced to
          // the store after returning to Safari later.
          document.addEventListener('visibilitychange', function () {
            if (document.visibilityState === 'hidden') clearTimeout(timer);
          }, { once: true });
          window.location.href = 'biteinsight://recipes/' + id;
        }

        var btn = document.getElementById('open-app-btn');
        if (btn) btn.addEventListener('click', openApp);
        // The whole recipe card is also tappable — same handler so
        // there's no chance of the two paths drifting apart.
        var cardBtn = document.getElementById('open-app-card');
        if (cardBtn) cardBtn.addEventListener('click', openApp);

        // Auto-attempt on first load for mobile users — gives the
        // app the chance to take over before the user has to tap
        // anything. Desktop users always need an explicit click
        // (auto-redirecting them to the App Store would be hostile).
        if (isMobile && id) {
          setTimeout(openApp, 500);
        }
      })();
    </script>
  </body>
</html>
`;
}
