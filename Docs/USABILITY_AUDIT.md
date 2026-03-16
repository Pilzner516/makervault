# MakerVault — Usability Audit & Fix

Read `docs/DESIGN_SYSTEM.md` before starting.

You are going to audit every single screen in this app for usability and fix every issue you find. This is not a style exercise. This is about whether a real person can actually use this app in a workshop with dirty hands and bad lighting.

---

## The one rule that overrides everything else

**If a human finger cannot comfortably tap it, it is broken. Fix it.**
**If a human eye cannot read it at arm's length, it is broken. Fix it.**

---

## Minimum sizes — non-negotiable, check every element

### Touch targets
Every tappable element must be at minimum 44×44px. No exceptions.
- Nav bar items: 44px tall minimum
- Buttons: 44px tall minimum  
- List rows: 48px tall minimum
- Mode buttons (AI / Barcode / Voice / Manual): 44px tall minimum — THIS IS THE MAIN PROBLEM RIGHT NOW
- Filter pills: 36px tall minimum
- Icon boxes in rows: 40×40px minimum
- Badge tap areas: wrap in a 44px container if tappable

### Font sizes — go through every Text element in every file
- Screen titles: 22px minimum
- Item names in rows: 16px minimum
- Meta / sublabel text: 13px minimum  
- Stat numbers (home screen): 32px minimum
- Metric numbers (detail screens): 24px minimum
- Section labels: 12px minimum
- Badge text: 12px minimum
- Button text: 15px minimum
- Nav bar labels: 11px minimum
- Mode button labels (AI / Barcode / Voice / Manual): 13px minimum
- Filter pill labels: 12px minimum
- Field labels: 13px minimum
- Field values: 15px minimum
- Form input text: 16px minimum
- Placeholder text: 15px minimum

### Contrast — go through every Text element in every file
Run through this check for every single Text component:
1. What is the background colour behind this text?
2. Is there at least a 4.5:1 contrast ratio?
3. If not — make the text lighter or the background darker until there is

Specific combinations that are ALWAYS wrong and must be fixed wherever found:
- Any text using `textFaint` (#2a6070) on `bgDeep` (#08141e) — too dark, use `textMuted` (#3a7888)
- Any text using `textDisabled` (#1a3a48) anywhere except inactive nav icons
- Any text using `textFaint` on `bgCard` — borderline, use `textMuted` instead
- Grey text on dark grey backgrounds — if you squint and it disappears, it's wrong
- Any label inside a badge that uses a colour darker than the badge background colour

---

## Screen-by-screen audit — fix all of these

### Every screen
- [ ] All Text components have fontSize at or above the minimums above
- [ ] All TouchableOpacity / Pressable have minHeight 44
- [ ] No dark text on dark background anywhere
- [ ] Bottom nav labels are 11px minimum and clearly readable
- [ ] Bottom nav tap areas are 44px tall

### Home screen
- [ ] Stat numbers (parts count, project count, alert count) are 32px bold
- [ ] Stat tiles are tall enough that the number doesn't feel crammed
- [ ] Alert banner is prominent — large enough to notice immediately
- [ ] List rows are 48px tall minimum

### Scan screen — THIS IS THE PRIORITY FIX
- [ ] Mode buttons (AI Identify / Barcode / Voice / Manual) are 44px tall minimum
- [ ] Mode button text is 13px minimum
- [ ] Mode buttons have enough padding that they feel like real buttons not tiny chips
- [ ] Scan viewfinder hint text is 13px minimum
- [ ] AI badge text is 12px minimum
- [ ] Result card item name is 20px minimum
- [ ] Result card confidence text is 14px minimum
- [ ] "Add to vault" button is 48px tall minimum
- [ ] "Wrong item" button is 48px tall minimum

### Inventory screen
- [ ] Search bar is 48px tall, input text is 16px
- [ ] Filter pills are 36px tall, text is 12px
- [ ] Item names in rows are 16px
- [ ] Meta text in rows is 13px
- [ ] Category section labels are 12px

### Item detail screen
- [ ] Metric numbers are 24px minimum
- [ ] Metric labels are 12px minimum
- [ ] Field labels are 13px
- [ ] Field values are 15px
- [ ] "Add stock" button is 48px tall
- [ ] "Remove / adjust" button is 44px tall

### Projects screen
- [ ] Project card names are 16px
- [ ] Project card meta text is 13px
- [ ] Tag chip text is 12px
- [ ] Progress bar is visible — at least 4px tall

### Add item screen
- [ ] All form inputs have 16px text
- [ ] All form labels are 13px
- [ ] All input fields are 48px tall
- [ ] Save button is 52px tall and impossible to miss

### Settings screen
- [ ] Theme swatches are large enough to tap (48px minimum)
- [ ] All setting labels are 15px minimum

---

## How to do the fix

Go file by file. For each screen file:

1. Find every `fontSize` value below the minimums — increase it
2. Find every `height` or `paddingVertical` on tappable elements — increase until 44px minimum tap target
3. Find every text colour — check it against its background
4. Fix the contrast where it fails
5. Do not change any logic, navigation, data fetching, or backend code
6. Do not change the visual design style — keep Level 3 aesthetic
7. Only change: fontSize, padding, minHeight, color (for contrast fixes)

Start with the Scan screen because the mode buttons are the most broken thing right now.
Show me each screen after fixing it before moving to the next one.
