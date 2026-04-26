# Universal Links for biteinsight.app

This folder contains the static files and instructions needed to make
shared recipe links open the Bite Insight app on a device that has it
installed, and fall through to the web app on a device that doesn't.

Configured for:
- **Domain**: `biteinsight.app` (Vercel)
- **iOS Team ID**: `F4SPMVBR2D`
- **iOS Bundle ID**: `com.biteinsight.app`
- **Android Package**: `com.biteinsightapp.gcahill`
- **Android SHA-256**: `FC:6D:C2:F8:89:FF:DF:B7:A9:EC:C5:D9:4A:5D:81:A5:05:32:E6:67:C6:37:FD:5C:D2:D8:5F:B4:AE:55:59:46`
- **Claimed path pattern**: `https://biteinsight.app/recipes/*`

## Mobile-app side (already done in this repo)

Already committed:

- `app.json` → `expo.ios.associatedDomains: ['applinks:biteinsight.app']`
- `app.json` → `expo.android.intentFilters` with `autoVerify: true` and
  `pathPrefix: /recipes/`
- Share message in `app/recipes/[id]/index.tsx` switched from
  `biteinsight://recipes/{id}` to `https://biteinsight.app/recipes/{id}`

A new TestFlight + Play Internal build is needed for the OS to pick
up the entitlements / intent filters. The OS verifies the AASA and
assetlinks JSON files at install time (and re-checks periodically)
so they need to be live before the new build hits a device.

## Web-app side (you need to do this)

Drop the two well-known files into the Vercel web app repo so they
serve at:

- `https://biteinsight.app/.well-known/apple-app-site-association`
- `https://biteinsight.app/.well-known/assetlinks.json`

Both files live in `well-known/` here for reference — copy them into
the web app repo.

### If the web app is Next.js (most likely)

Place the files at:

```
public/.well-known/apple-app-site-association
public/.well-known/assetlinks.json
```

Next.js serves anything under `public/` as-is. **Do not add a `.json`
extension to the AASA file** — iOS rejects it.

For the AASA file you must also set the Content-Type to
`application/json`. Add to `next.config.js`:

```js
module.exports = {
  async headers() {
    return [
      {
        source: '/.well-known/apple-app-site-association',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
      },
      {
        source: '/.well-known/assetlinks.json',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
      },
    ];
  },
};
```

### If the web app is plain static (Vite, etc.)

Put the files in your `public/` (or whatever directory Vercel serves
as the site root). Add a `vercel.json` at the project root if you don't
already have one:

```json
{
  "headers": [
    {
      "source": "/.well-known/apple-app-site-association",
      "headers": [{ "key": "Content-Type", "value": "application/json" }]
    },
    {
      "source": "/.well-known/assetlinks.json",
      "headers": [{ "key": "Content-Type", "value": "application/json" }]
    }
  ]
}
```

## Verifying it's working

After deploying the web changes:

1. **Check the AASA file is live and well-formed**

   ```bash
   curl -I https://biteinsight.app/.well-known/apple-app-site-association
   ```

   Should return `200`, `content-type: application/json`, no redirects.

   ```bash
   curl https://biteinsight.app/.well-known/apple-app-site-association | python3 -m json.tool
   ```

   Should pretty-print the JSON without errors.

2. **Apple's CDN validator** — Apple caches AASA. Force a re-fetch:

   ```
   https://app-site-association.cdn-apple.com/a/v1/biteinsight.app
   ```

   Open in a browser. Should return your AASA file. If it returns 404,
   give Apple's CDN 5–10 minutes after the file goes live and try again.

3. **Check assetlinks**

   ```bash
   curl https://biteinsight.app/.well-known/assetlinks.json | python3 -m json.tool
   ```

   Or use Google's tool:
   <https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://biteinsight.app&relation=delegate_permission/common.handle_all_urls>

4. **Test on iOS** — once you've shipped a TestFlight build with the
   updated `app.json`:

   - Send yourself a `https://biteinsight.app/recipes/<some-real-id>`
     link via iMessage / Notes / Mail.
   - **Long-press the link** in the app you sent it to. The preview
     menu should include "Open in Bite Insight" alongside "Open in
     Safari". That's the smoking gun that the OS has verified the
     AASA.
   - Tap the link normally. It should launch the app to the recipe
     detail screen.

5. **Test on Android** — once a Play Internal build is out:

   - Tap a `https://biteinsight.app/recipes/...` link.
   - First time, Android may show a "Open with" disambiguation. After
     you choose Bite Insight + "Always", it'll go straight there.
   - You can verify the app-link verification with:

     ```bash
     adb shell pm get-app-links com.biteinsightapp.gcahill
     ```

     Look for `Domain verification state: verified` for biteinsight.app.

## Web-fallback page (optional but recommended)

When a user opens a `https://biteinsight.app/recipes/{id}` link
without the app installed, the OS lets the browser handle it normally.
The web app should serve a sensible page at that URL — at minimum:

- Recipe cover + name (so the link unfurls nicely in iMessage / Slack /
  WhatsApp via OG meta tags).
- An "Open in Bite Insight" button that does `window.location =
  'biteinsight://recipes/{id}'` for users who do have the app but
  whose OS hasn't yet verified the universal link.
- "Get it on the App Store" / "Get it on Google Play" buttons for
  users without the app.

If the web app already renders a recipe detail page at this URL, just
add the OG tags and the App Store / Play badges. If not, a static
template is fine.

## Caveats

- **Apple caches AASA aggressively.** After your first deployment of
  the file, expect ~5 minutes before fresh installs see it. If you
  later edit the file, Apple may serve the stale version for up to a
  week to existing devices. For testing, uninstall + reinstall the app
  to force a fresh fetch.
- **Path patterns are case-sensitive.** Recipe IDs are UUIDs (lower
  hex), so this isn't a problem in practice — just don't change the
  pattern to e.g. `/Recipes/*`.
- **Deferred deep linking is not handled here.** If a user without
  the app taps a link, gets bounced to the App Store, installs, opens
  the app — they will land on the home screen, not the originally
  shared recipe. To preserve that, you'd need a service like
  Branch.io, AppsFlyer, or a custom server-side click attribution
  flow. Out of scope for this pass.
