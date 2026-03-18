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
    title: 'Scanning & Identification',
    features: [
      {
        icon: 'scan-outline',
        name: 'AI Part Identification',
        description: 'Point your camera at any electronic component and Gemini AI identifies it — name, manufacturer, specs, and category. Works with ICs, resistors, cables, boards, and more.',
      },
      {
        icon: 'repeat-outline',
        name: 'Auto-Scan Mode',
        description: 'Scan multiple items in rapid succession. Choose Handheld (motion-triggered), On Stand (timed), or Manual. Trace animation shows capture countdown. All items queue for batch review.',
      },
      {
        icon: 'images-outline',
        name: 'Bulk Scan',
        description: 'Photograph a bin or tray of parts and AI identifies each one separately. Review and add/skip individual items.',
      },
      {
        icon: 'options-outline',
        name: 'Scan Quality Presets',
        description: 'Choose Fast (~1.5s), Balanced (~3s), Detailed (~5s), or Maximum (~8s) quality. Higher quality reads smaller markings on SMD parts and QFP packages.',
      },
      {
        icon: 'timer-outline',
        name: 'Adjustable Scan Timing',
        description: 'Customize auto-scan delay for Handheld (1–5s) and On Stand (2–8s) modes. Set your preferred pace in Settings.',
      },
    ],
  },
  {
    title: 'Inventory Management',
    features: [
      {
        icon: 'cube-outline',
        name: 'Parts Inventory',
        description: 'Track every component with name, manufacturer, MPN, category, quantity, specs, and notes. Filter by category, search by any field.',
      },
      {
        icon: 'pencil-outline',
        name: 'Inline Editing',
        description: 'Tap the pencil icon on any part to edit every field — name, manufacturer, MPN, category, subcategory, description, notes, quantity, and low stock threshold.',
      },
      {
        icon: 'camera-outline',
        name: 'Part Photos',
        description: 'Each scanned part saves a quality thumbnail (480px) from the original camera image. Visible in inventory list and part detail.',
      },
      {
        icon: 'notifications-outline',
        name: 'Low Stock Alerts',
        description: 'Set a threshold per item. When quantity drops below it, alerts appear on the Home screen. Toggle alerts on/off in Settings.',
      },
      {
        icon: 'archive-outline',
        name: 'Persistent Scans',
        description: 'Unconfirmed scans are saved automatically after every capture. Close the app, take a call, come back — your scans are waiting for review.',
      },
    ],
  },
  {
    title: 'Search & Categories',
    features: [
      {
        icon: 'search-outline',
        name: 'Smart Search',
        description: 'Search across item names, manufacturers, part numbers, categories, and notes. Results update as you type.',
      },
      {
        icon: 'grid-outline',
        name: 'Category Browser',
        description: '7 default categories (Electronics, Fasteners, Tools, 3D Printing, Materials, Mechanical, Safety) with 50+ subcategories. Tap a category to drill down.',
      },
      {
        icon: 'pricetag-outline',
        name: 'Subcategory Filtering',
        description: 'Each category shows its subcategories with item counts. Tap a subcategory to see matching parts in your inventory.',
      },
    ],
  },
  {
    title: 'Suppliers & Ordering',
    features: [
      {
        icon: 'cart-outline',
        name: 'Where to Buy',
        description: '15 suppliers built-in: Amazon, DigiKey, Mouser, McMaster-Carr, Adafruit, SparkFun, and more. Tap any part\'s "Where to Buy" to search across suppliers instantly.',
      },
      {
        icon: 'star-outline',
        name: 'Favourite Suppliers',
        description: 'Star up to 4 suppliers as favourites. They appear first on every part detail page for quick access.',
      },
      {
        icon: 'globe-outline',
        name: 'Country Filtering',
        description: 'Set your country (US, UK, Canada, Australia, or Global) in Settings. Only suppliers that ship to your region are shown.',
      },
      {
        icon: 'cash-outline',
        name: 'Affiliate Codes',
        description: 'Enter your Amazon Associates tag, Jameco AvantLink ID, or Home Depot Impact ID in Settings. Your codes are automatically appended to supplier links.',
      },
    ],
  },
  {
    title: 'Projects',
    features: [
      {
        icon: 'construct-outline',
        name: 'Project Tracking',
        description: 'Create projects, track which parts you need vs. what you have. AI suggests project ideas based on your inventory.',
      },
      {
        icon: 'bulb-outline',
        name: 'AI Project Ideas',
        description: 'Gemini analyzes your inventory and suggests buildable projects — prioritizing ones where you already own most parts.',
      },
      {
        icon: 'open-outline',
        name: 'External Projects',
        description: 'Browse projects from Instructables matched to your parts. Tap to open the full guide in your browser.',
      },
    ],
  },
  {
    title: 'Customization',
    features: [
      {
        icon: 'color-palette-outline',
        name: '10 Color Themes',
        description: 'Midnight Workshop (default), Solder Smoke, Circuit Noir, PCB Green, Oscilloscope, Titanium, Neon Lab, Forge, Deep Space, and Graphene. Each with 7 background layers and coordinated colors.',
      },
      {
        icon: 'mic-outline',
        name: 'Voice Commands',
        description: 'Tap the Voice card on the Home screen to search your inventory by voice. Ask "do I have any 10k resistors?" and get an instant answer.',
      },
      {
        icon: 'hand-left-outline',
        name: 'Haptic Feedback',
        description: 'Feel a vibration on every capture, button press, and scan result. Toggle on/off in Settings.',
      },
    ],
  },
  {
    title: 'Storage & Locations',
    features: [
      {
        icon: 'file-tray-stacked-outline',
        name: 'Storage Locations',
        description: 'Organize parts by physical location — bins, shelves, drawers, pegboards. Nested locations supported.',
      },
      {
        icon: 'qr-code-outline',
        name: 'QR Code Labels',
        description: 'Generate printable QR codes for each storage location. Scan a QR to jump straight to that location\'s contents.',
      },
      {
        icon: 'bookmark-outline',
        name: 'Wishlist',
        description: 'Keep a running list of parts to order. Group by supplier for efficient ordering.',
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
