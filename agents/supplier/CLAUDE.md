# Agent: Supplier & Ordering

## Responsibility
- Octopart API integration (parts search, specs, images, pricing)
- Amazon Associates deep links
- DigiKey, Mouser, Adafruit, AliExpress search and linking
- Price comparison UI
- Affiliate tag management
- Wishlist batch ordering

## Supplier Overview

| Supplier | API | Affiliate Program | Best For |
|----------|-----|-------------------|---------|
| Octopart | GraphQL API | N/A (aggregator) | Specs, images, multi-supplier pricing |
| DigiKey | REST API | Yes — direct program | Professional components, full specs |
| Mouser | REST API | Yes — direct program | Professional components, broad catalog |
| Amazon | Product Advertising API | Yes — Associates | Cables, common parts, fast shipping |
| Adafruit | Deep links only | Yes — ShareASale | Maker-focused, breakout boards |
| AliExpress | Search URL generation | Yes — Portal | Budget components, bulk |

## Octopart Integration (`/lib/octopart.ts`)

Octopart is the primary source for part identification data, images, and multi-supplier pricing. Use it to power both the confirm screen and the reorder comparison.

### GraphQL query example
```graphql
query SearchParts($mpn: String!) {
  search(q: $mpn, limit: 3) {
    results {
      part {
        name
        manufacturer { name }
        mpn
        category { name }
        descriptions { text }
        specs { attribute { name } value }
        images { url }
        sellers {
          company { name homepage_url }
          offers {
            prices { price currency quantity }
            in_stock
            stock_quantity
            product_url
          }
        }
      }
    }
  }
}
```

## Price Comparison Screen

When user taps "Reorder" on any part:
1. Query Octopart with part MPN
2. Parse seller offers — group by supplier
3. Display side-by-side comparison card:
   - Supplier name + logo
   - Unit price (at qty 1, 10, 100)
   - Stock quantity
   - "Buy" button → affiliate deep link

### Deep link format with affiliate tags
```typescript
const buildAffiliateUrl = (supplier: string, productUrl: string): string => {
  switch (supplier) {
    case 'amazon':
      return `${productUrl}?tag=${AMAZON_ASSOCIATE_TAG}`
    case 'digikey':
      return `${productUrl}?utm_source=makervault&ref=${DIGIKEY_AFFILIATE_ID}`
    case 'mouser':
      return `${productUrl}?utm_source=makervault`
    case 'adafruit':
      return `${productUrl}?aff=${ADAFRUIT_AFFILIATE_ID}`
    case 'aliexpress':
      // Generate search URL if no direct link
      return `https://www.aliexpress.com/wholesale?SearchText=${encodeURIComponent(mpn)}`
    default:
      return productUrl
  }
}
```

## "Not in Inventory" Shop Flow

When search returns no inventory results:
1. Show "Not in your inventory" message
2. Auto-trigger Octopart search with same query
3. Display shop results with price comparison
4. "Add to Wishlist" button on each result
5. One-tap to open in supplier app or browser

## Wishlist & Batch Ordering (`/app/wishlist.tsx`)
- Running list of parts to buy
- Each item shows: name, MPN, preferred supplier, estimated price
- "Optimize order" button: groups items by supplier to minimize shipping
- Bulk "Open all DigiKey items" → opens DigiKey cart with all items (via URL scheme)
- Export wishlist as CSV or share as text

## Supabase Edge Function: Price Refresh
Scheduled function that refreshes prices for low-stock parts weekly:
```typescript
// /supabase/functions/refresh-prices/index.ts
// Queries Octopart for all parts below reorder threshold
// Updates part_supplier_links table with latest prices
// Triggers push notification if price dropped > 10%
```

## Dependencies to Install
```bash
npx expo install expo-linking  # for deep links
npx expo install expo-web-browser  # open supplier pages in-app browser
```
