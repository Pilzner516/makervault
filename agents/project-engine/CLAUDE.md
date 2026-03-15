# Agent: Project Idea Engine

## Responsibility
- Generate project ideas based on user's current inventory
- Pull curated projects from Instructables and Hackster.io
- AI-generated project ideas for unique inventory combinations
- Project detail screen with parts checklist
- Build history and parts consumption tracking
- Difficulty, time, and category filtering

## Key Screens

### Projects Screen (`/app/(tabs)/projects.tsx`)
- "Ideas for your inventory" section — top AI suggestions
- Browse by category: robotics, home automation, sensors, displays, audio, etc.
- Filter: difficulty, build time, "I have all parts" toggle
- Saved/bookmarked projects
- Build history (completed projects)

### Project Detail Screen
- Title, description, difficulty badge, estimated hours
- Source link (Instructables, Hackster, GitHub)
- **Parts checklist**:
  - ✅ Parts you have (with quantity owned vs needed)
  - 🛒 Parts you need to buy (with reorder button)
- "Start Build" button → marks project in_progress, reserves parts
- "Mark Complete" → logs to build history, decrements consumed parts

## AI Project Generation (`/lib/projectEngine.ts`)

### Inventory-to-projects prompt
```
You are an expert electronics maker and educator.
The user has the following parts in their inventory:
{inventory_summary}

Suggest 5 project ideas they could build. For each project:
- Prioritize projects where they already own most/all parts
- Range from beginner to advanced difficulty
- Include a mix of categories (robotics, IoT, displays, audio, etc.)

Return JSON array:
[{
  "title": string,
  "description": string,           // 2-3 sentences
  "difficulty": "beginner" | "intermediate" | "advanced",
  "estimated_hours": number,
  "category": string,
  "parts_needed": [{
    "name": string,
    "mpn": string | null,
    "quantity": number,
    "user_has": boolean,
    "quantity_owned": number
  }],
  "source_suggestion": string      // search term to find guides online
}]
```

### Inventory summary format
Condense inventory for prompt efficiency:
```typescript
const buildInventorySummary = (parts: Part[]): string => {
  // Group by category with counts
  // e.g. "Microcontrollers: Arduino Nano (3), ESP32 (2), Raspberry Pi Zero (1)
  //       Sensors: PIR motion (2), DHT22 temp/humidity (4), ultrasonic HC-SR04 (1)
  //       Motors: SG90 servo (2), 28BYJ-48 stepper (1)..."
}
```

## External Project Sources

### Instructables API
- Search endpoint: `https://www.instructables.com/json-api/search?q={query}`
- Filter by category: electronics, technology
- Extract: title, description, difficulty, thumbnail, url, parts list (if available)

### Hackster.io
- RSS feed and oEmbed available
- Search: `https://www.hackster.io/search?q={query}&type=project`
- Use web fetch for project data

### Matching algorithm
1. Extract parts list from external project (if available)
2. Cross-reference with user inventory
3. Calculate "match score": (parts owned / total parts needed) * 100
4. Sort by match score descending
5. Flag "Ready to build" if score >= 80%

## Build History
When user marks a project complete:
```typescript
// 1. Log to projects table: status = 'completed', completed_at = now()
// 2. Decrement quantities in parts table for consumed components
// 3. Show completion summary: parts used, time taken
// 4. Prompt: "Rate this project difficulty" (improves future suggestions)
```

## Personalization Over Time
- Track which project categories user builds most
- Weight future suggestions toward preferred categories
- Learn which difficulty level user prefers
- "Because you built [X], you might like [Y]"

## Dependencies to Install
```bash
npx expo install expo-web-browser  # open project source URLs
```
