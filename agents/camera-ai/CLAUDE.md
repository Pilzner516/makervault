# Agent: Camera & AI Identification

## Responsibility
- Camera capture screen
- Image preprocessing and compression
- Gemini Vision API integration for part identification
- Part confirmation screen (side-by-side user photo vs supplier image)
- AI feedback loop (confirmed / rejected / corrected)

## Key Screens

### Scan Screen (`/app/(tabs)/scan.tsx`)
- Full-screen camera view using `expo-camera`
- Capture button with haptic feedback
- Toggle between single-part and bulk-scan mode
- Flash toggle
- Switch to gallery (pick existing photo)
- On capture → navigate to confirm screen with image

### Confirm Screen (`/app/confirm.tsx`)
Side-by-side confirmation layout:

**Left panel — Your capture:**
- Cropped/zoomed photo of the component
- Bounding boxes around detected text/markings
- Raw text extracted by Gemini (part number, markings)

**Right panel — AI best match:**
- Product image from Octopart/supplier
- Part name, manufacturer, MPN
- Key specs summary
- Confidence score badge (e.g. "94% match")
- Supplier logo + "View on DigiKey" link

**Action buttons:**
- ✅ Confirm Match → save to inventory
- 🔄 See other matches → swipe carousel of top 3 alternatives
- 🔁 Check another supplier → toggle supplier for right panel image
- ✏️ Edit manually → open part edit form pre-filled with AI data
- ❌ Not a match → discard, retake photo

## Gemini Vision Integration (`/lib/gemini.ts`)

### Identification prompt
```
You are an expert electronics component identifier.
Analyze this image and identify the electronic component shown.

Return a JSON object with:
{
  "part_name": string,
  "manufacturer": string,
  "mpn": string,           // manufacturer part number
  "category": string,      // resistor, capacitor, IC, microcontroller, cable, sensor, etc.
  "subcategory": string,
  "specs": object,         // key specs relevant to this category
  "markings_detected": string[],  // text/codes visible on the component
  "confidence": number,    // 0-1
  "alternatives": [        // up to 2 alternative matches
    { "part_name": string, "mpn": string, "confidence": number }
  ]
}

If you cannot identify the component, set confidence below 0.3 and explain in part_name.
```

### Image preprocessing
- Compress to max 1MB before sending to Gemini
- Use `expo-image-manipulator` to resize if needed
- Convert to base64 for API transmission

## Feedback Loop
Every confirmation action is logged to Supabase:
```typescript
type ConfirmationFeedback = {
  image_hash: string        // hash of captured image
  gemini_suggestion: string // what Gemini guessed
  action: 'confirmed' | 'chose_alternative' | 'edited' | 'rejected'
  final_mpn: string         // what user actually confirmed
}
```
This data improves future identification accuracy.

## Dependencies to Install
```bash
npx expo install expo-camera
npx expo install expo-image-manipulator
npx expo install expo-haptics
npx expo install expo-image-picker
```

## Android Permissions
Add to `app.json`:
```json
"android": {
  "permissions": ["CAMERA", "READ_EXTERNAL_STORAGE"]
}
```

## Notes
- Always request camera permission gracefully with explanation screen before asking system permission
- Bulk scan mode: send full bin photo to Gemini, parse response as array of parts
- Save captured image to Supabase Storage under `parts/{user_id}/{part_id}.jpg` on confirm
- Confidence below 0.6 should always require manual confirmation — never auto-save
