import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ScreenLayout, ScreenHeader, EngravingLabel, PanelCard } from '@/components/UIKit';
import { useTheme } from '@/context/ThemeContext';

interface FeatureSection {
  title: string;
  features: {
    icon: string;
    name: string;
    description: string;
  }[];
}

const FEATURE_SECTIONS: FeatureSection[] = [
  {
    title: 'Scan & Identify Parts',
    features: [
      {
        icon: 'scan-outline',
        name: 'AI Part Identification',
        description: 'Point your camera at any electronic component and AI instantly identifies it — name, manufacturer, specs, category, and markings. Works with ICs, resistors, cables, boards, connectors, and more.',
      },
      {
        icon: 'repeat-outline',
        name: 'Auto-Scan Mode',
        description: 'Scan multiple items hands-free. Choose Handheld (captures as you hold items up) or On Stand (auto-captures at a set interval while you swap items). All items queue for batch review.',
      },
      {
        icon: 'images-outline',
        name: 'Bulk Scan',
        description: 'Photograph a bin or tray of mixed parts. AI identifies each component separately. Review and add or skip individual items one by one.',
      },
      {
        icon: 'archive-outline',
        name: 'Never Lose a Scan',
        description: 'Every scan is saved automatically the moment it\'s captured. Take a phone call, switch apps, or close MakerVault — your unconfirmed scans are waiting when you return.',
      },
      {
        icon: 'options-outline',
        name: 'Scan Quality & Timing',
        description: 'Choose from 4 quality levels (Fast to Maximum) to balance speed vs. accuracy for small markings. Adjust auto-scan timing for handheld and stand modes in Settings.',
      },
    ],
  },
  {
    title: 'Inventory',
    features: [
      {
        icon: 'cube-outline',
        name: 'Complete Parts Database',
        description: 'Track every component with name, manufacturer, part number, category, quantity, specs, notes, and a photo. Filter and sort by any field.',
      },
      {
        icon: 'pencil-outline',
        name: 'Edit Any Detail',
        description: 'Tap the pencil icon on any part to edit everything inline — name, manufacturer, MPN, category, quantity, low stock threshold, notes, and more.',
      },
      {
        icon: 'camera-outline',
        name: 'Part Photos & Product Images',
        description: 'Every scanned part keeps your camera photo plus a clean product image from suppliers. See both side by side on the part detail screen. Tap to re-scan if the product image is wrong.',
      },
      {
        icon: 'notifications-outline',
        name: 'Low Stock Alerts',
        description: 'Set a restock threshold per item. When quantity drops below it, an alert appears on the Home screen so you never run out of critical parts.',
      },
      {
        icon: 'bookmark-outline',
        name: 'Wishlist',
        description: 'Bookmark any part to add it to your wishlist. Add from part detail or the Price Check screen. View all wishlist items from the Home screen, grouped by supplier for efficient purchasing.',
      },
    ],
  },
  {
    title: 'Organization',
    features: [
      {
        icon: 'search-outline',
        name: 'Smart Search',
        description: 'Find any part instantly. Search across names, manufacturers, part numbers, categories, and notes. Results appear as you type. Recent searches are saved and synced from the cloud.',
      },
      {
        icon: 'grid-outline',
        name: 'Category Browser',
        description: 'Browse 8 built-in categories (Electronics, Robotics, Fasteners, Tools, 3D Printing, Materials, Mechanical, Safety & PPE) with 70+ subcategories. Tap to drill down.',
      },
      {
        icon: 'file-tray-stacked-outline',
        name: 'Storage Locations',
        description: 'Map your workshop — bins, shelves, drawers, pegboards, cabinets. Assign parts to locations so you always know where to find them. Supports nested locations.',
      },
      {
        icon: 'qr-code-outline',
        name: 'QR Code Labels',
        description: 'Generate QR codes for parts, categories, and storage locations. Three sizes: Small (Phomemo D30 12mm labels), Medium (standard drawer labels), and Large (full detail). Simplified MV: format for the smallest possible QR codes.',
      },
      {
        icon: 'print-outline',
        name: 'Print & Share Labels',
        description: 'Export QR labels as PNG images. Share via the system share sheet, save to your photo library, or send directly to a Phomemo D30 label printer. Works with any label printer that accepts images.',
      },
      {
        icon: 'scan-outline',
        name: 'Find Item in Cabinet',
        description: 'Lost a part? Tap "Find Item" on any part, then point your camera at a cabinet with QR-labeled drawers. The app highlights the exact drawer that contains your part in real-time.',
      },
      {
        icon: 'barcode-outline',
        name: 'Barcode Scanning',
        description: 'Scan product barcodes (EAN, UPC, Code128) to identify parts instantly. AI looks up the product from the barcode number. Also scans multiple QR codes at once to find all labeled items.',
      },
    ],
  },
  {
    title: 'Suppliers & Reordering',
    features: [
      {
        icon: 'cart-outline',
        name: 'Price Check',
        description: '15 suppliers built in — Amazon, DigiKey, Mouser, McMaster-Carr, Adafruit, SparkFun, and more. Tap "Price Check" on any part to compare prices across all suppliers. AI estimates prices at scan time.',
      },
      {
        icon: 'star-outline',
        name: 'Favourite Suppliers',
        description: 'Star up to 4 go-to suppliers. They appear first on every part page so your preferred shops are always one tap away.',
      },
      {
        icon: 'globe-outline',
        name: 'Regional Suppliers',
        description: 'Set your country in Settings (US, UK, Canada, Australia, or Global). Only suppliers that ship to your region are shown — no irrelevant results.',
      },
      {
        icon: 'document-text-outline',
        name: 'Datasheet Search',
        description: 'Find datasheets for any component. One tap searches Google for the PDF datasheet by part number.',
      },
    ],
  },
  {
    title: 'Projects',
    features: [
      {
        icon: 'compass-outline',
        name: 'Project Discovery',
        description: 'Browse 27 curated maker projects across 9 categories — Robotics, Home Automation, Lighting, IoT, Audio, Wearables, Tools, Art & Decor. Filter by category and difficulty level.',
      },
      {
        icon: 'git-compare-outline',
        name: 'Parts Matching',
        description: 'Every project shows how many required parts you already own with a match percentage and progress bar. "Matched to Your Parts" section surfaces projects you can start right away.',
      },
      {
        icon: 'flash-outline',
        name: 'Quick Builds',
        description: 'Dedicated section for beginner-level projects under 2 hours. Perfect for a weekend afternoon or learning a new skill.',
      },
      {
        icon: 'bookmark-outline',
        name: 'Save & Track Projects',
        description: 'Bookmark projects to save them for later. Saved projects sync to your account and appear in a dedicated section on the Projects screen.',
      },
      {
        icon: 'cart-outline',
        name: 'Order Missing Parts',
        description: 'Project detail shows exactly which parts you are missing. Tap any missing part to search suppliers, or use the "Order Missing Parts" button to start shopping.',
      },
      {
        icon: 'construct-outline',
        name: 'Build Tracking',
        description: 'Start a build to mark it in-progress. Complete it to deduct consumed parts from your inventory automatically.',
      },
    ],
  },
  {
    title: 'Data Management',
    features: [
      {
        icon: 'download-outline',
        name: 'Export as CSV',
        description: 'Export your entire parts inventory as a CSV file with Name, Manufacturer, MPN, Category, Quantity, and Notes columns. Share via email, save to Files, or send to any app.',
      },
      {
        icon: 'code-slash-outline',
        name: 'Export as JSON',
        description: 'Export your inventory in JSON format for developers, backup, or integration with other tools. Share directly from the app.',
      },
      {
        icon: 'cloud-upload-outline',
        name: 'Import from CSV',
        description: 'Bulk-import parts from a CSV file. Pick a file, preview the parsed items, and import them all at once. Handles flexible column names and missing data gracefully.',
      },
      {
        icon: 'copy-outline',
        name: 'Duplicate Detection',
        description: 'When scanning or saving a part that already exists in your inventory, MakerVault detects the duplicate and lets you merge quantities instead of creating a duplicate entry.',
      },
    ],
  },
  {
    title: 'Personalization',
    features: [
      {
        icon: 'color-palette-outline',
        name: '10 Color Themes',
        description: 'Choose from Midnight Workshop, Solder Smoke, Circuit Noir, PCB Green, Oscilloscope, Titanium, Neon Lab, Forge, Deep Space, or Graphene. Switch instantly in Settings.',
      },
      {
        icon: 'mic-outline',
        name: 'Voice Commands',
        description: 'Search your inventory by voice. Ask "do I have any 10k resistors?" or "where are my servo motors?" and get an instant spoken answer. A dedicated overlay shows a pulsing mic, live transcript, and AI response.',
      },
      {
        icon: 'hand-left-outline',
        name: 'Haptic Feedback',
        description: 'Feel a vibration on captures, button presses, and scan confirmations. Respects your haptic feedback preference in Settings — toggle on or off globally.',
      },
      {
        icon: 'camera-reverse-outline',
        name: 'Front & Rear Camera',
        description: 'Switch between front and rear cameras during scanning. Use front camera with a phone stand for hands-free operation.',
      },
    ],
  },
];

export default function FeaturesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <ScreenLayout style={{ paddingTop: insets.top }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title="Features"
        subtitle="EVERYTHING MAKERVAULT CAN DO"
        backLabel="Settings"
        onBack={() => router.back()}
      />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        {/* App version header */}
        <View style={[s.versionBar, { backgroundColor: colors.accentBg, borderBottomColor: colors.accentBorder }]}>
          <Text style={[s.versionText, { color: colors.accent }]}>
            MAKERVAULT v1.0.0 · POWERED BY GEMINI AI
          </Text>
        </View>

        {FEATURE_SECTIONS.map((section) => (
          <View key={section.title}>
            <EngravingLabel label={section.title} />
            <PanelCard>
              {section.features.map((feature, i) => (
                <View
                  key={feature.name}
                  style={[
                    s.featureRow,
                    { borderBottomColor: colors.borderSubtle },
                    i === section.features.length - 1 && { borderBottomWidth: 0 },
                  ]}
                >
                  <View style={[s.featureIcon, { backgroundColor: colors.accentBg, borderColor: colors.accentBorder }]}>
                    <Ionicons name={feature.icon as any} size={20} color={colors.accent} />
                  </View>
                  <View style={s.featureInfo}>
                    <Text style={[s.featureName, { color: colors.textSecondary }]}>{feature.name}</Text>
                    <Text style={[s.featureDesc, { color: colors.textMuted }]}>{feature.description}</Text>
                  </View>
                </View>
              ))}
            </PanelCard>
          </View>
        ))}

        {/* Footer */}
        <View style={s.footer}>
          <Text style={[s.footerText, { color: colors.textFaint }]}>
            BUILT FOR MAKERS, BY MAKERS
          </Text>
          <Text style={[s.footerText, { color: colors.textFaint }]}>
            MORE FEATURES ADDED WITH EVERY UPDATE
          </Text>
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}

const s = StyleSheet.create({
  versionBar: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.05,
  },
  featureRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    minHeight: 52,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  featureInfo: {
    flex: 1,
    gap: 4,
  },
  featureName: {
    fontSize: 16,
    fontWeight: '700',
  },
  featureDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 4,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.05,
  },
});
