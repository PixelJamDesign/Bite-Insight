# Open Food Facts attribution & licensing

Bite Insight uses product data from **Open Food Facts** (https://world.openfoodfacts.org).

Open Food Facts data is made available under the **Open Database License (ODbL) v1.0**
(https://opendatacommons.org/licenses/odbl/1-0/). Individual contents of the database
are available under the **Database Contents License (DbCL) v1.0**. Product images are
available under the **Creative Commons Attribution-ShareAlike (CC BY-SA)** licence.

## How we comply

**Attribution.** Open Food Facts is credited in-app:
- a "Data by Open Food Facts" link in Settings, and
- a "Product data from Open Food Facts (ODbL)" credit on each product screen.

**Custom User-Agent.** Every request to the Open Food Facts API identifies the app in
the form `BiteInsight/<version> (hello@biteinsight.app)`, as required by their terms.
See `lib/openFoodFacts.ts`.

**No scraping.** Live calls (barcode lookups and product search) are user-initiated,
debounced, and paginated, well within Open Food Facts' rate limits. Bulk data is not
scraped from the API — the optional offline region databases are built from Open Food
Facts data exports.

**Share-alike.** The offline region database files distributed with this project (via
GitHub releases) are a derivative of the Open Food Facts database. They are therefore
also made available under the ODbL v1.0. This notice accompanies those releases.

## Terms

- Terms of use: https://world.openfoodfacts.org/terms-of-use
- API documentation: https://openfoodfacts.github.io/openfoodfacts-server/api/
- Reusing the data: https://wiki.openfoodfacts.org/Reusing_Open_Food_Facts_Data
