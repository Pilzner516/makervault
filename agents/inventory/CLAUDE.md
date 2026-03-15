# Agent: Inventory & Search

## Responsibility
- Parts inventory CRUD (create, read, update, delete)
- Natural language search with LLM query parsing
- Storage location management and QR code generation
- Low-stock alerts and wishlist
- Inventory screen UI

## Key Screens

### Inventory Screen (`/app/(tabs)/inventory.tsx`)
- Searchable, filterable parts list
- Sort by: name, category, quantity, recently added
- Filter by: category, storage location, low stock
- Swipe actions: quick decrement quantity, edit, delete
- FAB (floating action button) to add part manually
- Low stock badge on parts below threshold

### Part Detail Screen (`/app/part/[id].tsx`)
- Full part info: name, MPN, specs, image
- Quantity adjuster (+ / - with manual entry)
- Storage location(s) with map hint
- Supplier links (reorder buttons)
- "Use in project" button
- Edit and delete actions
- Datasheet link if available

### Storage Locations Screen
- Tree view of containers and sub-locations
- Add/edit/delete locations
- QR code generator per location (print label)
- Tap location to see all parts inside

## Natural Language Search (`/lib/search.ts`)

### Search flow
1. User types or speaks query
2. Query sent to Gemini with structured prompt
3. Gemini returns parsed filters as JSON
4. Filters applied to Supabase query
5. Results returned — inventory first, then shop flow if empty

### Search parsing prompt
```
Parse this electronics inventory search query into structured filters.
Query: "{user_query}"

Return JSON:
{
  "part_name": string | null,
  "category": string | null,
  "subcategory": string | null,
  "specs": object | null,       // e.g. { "resistance": "10k", "voltage": "5V" }
  "keywords": string[],
  "intent": "find_part" | "check_quantity" | "find_location" | "get_ideas"
}
```

### Example mappings
| Query | Parsed result |
|-------|--------------|
| "usb c to a cable" | category: cable, specs: {from: USB-C, to: USB-A} |
| "do I have any 10k resistors" | category: resistor, specs: {resistance: "10k"} |
| "something to control a motor" | keywords: [motor driver, H-bridge, ESC] |
| "small blue capacitors" | category: capacitor, keywords: [ceramic, blue] |

### Fuzzy matching
- Use Supabase full-text search on name, description, mpn, specs
- Fall back to keyword matching across synonyms
- Electronics synonym map: BJT→transistor, FET→MOSFET, pot→potentiometer, etc.

## QR Code System
- Each storage location gets a unique QR code on creation
- QR encodes: `makervault://location/{location_id}`
- Use `react-native-qrcode-svg` to generate printable QR labels
- Scanning a location QR in the app opens that location's parts list
- Scanning before taking a photo pre-fills the storage location on confirm

## Low Stock Alerts
- Check quantities on every inventory update
- If quantity <= low_stock_threshold, flag in UI and push notification
- Weekly digest notification: "You're low on 4 parts"
- Use `expo-notifications` for push alerts

## Dependencies to Install
```bash
npx expo install react-native-qrcode-svg
npx expo install expo-barcode-scanner
npx expo install expo-notifications
npx expo install @shopify/flash-list  # performant list rendering
```
