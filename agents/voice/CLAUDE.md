# Agent: Voice Interaction

## Responsibility
- Speech-to-text (Android + iOS)
- Intent parsing from transcribed text
- Text-to-speech responses
- Floating mic button UI (available on all screens)
- Multi-turn conversation context
- Ambient/hands-free workbench mode

## Voice Interaction Flow
1. User presses mic button (or says wake phrase in ambient mode)
2. `react-native-voice` captures audio → transcribes to text
3. Transcript sent to Gemini with intent parsing prompt + conversation history
4. Intent extracted → routed to correct handler (inventory, search, reorder, etc.)
5. Handler returns result → formatted as short spoken response
6. `expo-speech` speaks the response aloud
7. Visual result appears on screen simultaneously

## Intent Types & Handlers

| Intent | Example | Handler |
|--------|---------|---------|
| `query_inventory` | "Do I have an ADS1115?" | inventoryStore.search() |
| `check_quantity` | "How many 10k resistors?" | inventoryStore.getQuantity() |
| `find_location` | "Where are my servo motors?" | inventoryStore.getLocation() |
| `update_quantity` | "Add 5 ESP32s to inventory" | inventoryStore.updateQuantity() |
| `consume_parts` | "I just used 3 capacitors" | inventoryStore.decrementQuantity() |
| `get_project_ideas` | "What can I build with a Pi Zero?" | projectEngine.getSuggestions() |
| `reorder_part` | "Order more ADS1115 from DigiKey" | supplierAgent.openReorder() |
| `low_stock_check` | "What am I running low on?" | inventoryStore.getLowStock() |
| `add_part` | "Add a new ESP32 to inventory" | navigate to scan/manual add |

## Intent Parsing Prompt
```
You are a voice assistant for an electronics parts inventory app.
Parse this voice command into a structured intent.

Command: "{transcript}"
Conversation history: {last_3_turns}

Return JSON:
{
  "intent": string,
  "entities": {
    "part_name": string | null,
    "mpn": string | null,
    "quantity": number | null,
    "location": string | null,
    "supplier": string | null
  },
  "response_needed": boolean,
  "clarification_needed": boolean,
  "clarification_question": string | null
}
```

## Spoken Response Guidelines
- Keep spoken responses under 20 words
- Lead with the answer, not preamble
- Example: "Yes, you have 3 in Bin 2, Drawer A" not "I found that you have 3 ADS1115s..."
- For lists > 3 items, speak the count and show the rest visually
- Ambiguous results → ask one clarifying question

## Multi-Turn Context
Store last 3 conversation turns in voiceStore so follow-up questions work:
- "Do I have an ADS1115?" → "Yes, 3 in Bin 2"
- "How many?" → understands "how many ADS1115s" from context
- "Where are they?" → understands location follow-up

## Floating Mic Button Component (`/components/VoiceFAB.tsx`)
- Always visible, bottom-right corner of every screen
- Visual states:
  - **Idle**: microphone icon, subtle shadow
  - **Listening**: pulsing red ring animation
  - **Processing**: spinner
  - **Speaking**: animated soundwave
- Haptic feedback on press and on response
- Long press → toggle ambient mode

## Ambient / Hands-Free Mode
- Low-profile listening indicator (thin colored bar at top of screen)
- Uses `@react-native-voice/voice` continuous recognition
- Only activates on wake phrase: "Hey MakerVault"
- Battery-conscious: pauses after 5 min inactivity
- Visual indicator always shows when mic is active

## Graceful Fallback
If voice doesn't understand or confidence is low:
- Drop into pre-filled text search with the transcript
- "I heard: [transcript] — is this what you meant?" with edit option
- Never leave user at a dead end

## Dependencies to Install
```bash
npx expo install @react-native-voice/voice
npx expo install expo-speech
npx expo install expo-haptics
```

## Android Permissions
Add to `app.json`:
```json
"android": {
  "permissions": ["RECORD_AUDIO"]
}
```
