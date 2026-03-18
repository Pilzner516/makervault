import { View, Text, ScrollView, TouchableOpacity, Switch, TextInput, Share, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Alert } from 'react-native';
import { File as ExpoFile, Paths } from 'expo-file-system';
import {
  ScreenLayout, ScreenHeader,
  EngravingLabel, FieldRow, PanelCard,
  PrimaryButton,
  Spacing, FontSize, Radius,
} from '@/components/UIKit';
import { useTheme } from '@/context/ThemeContext';
import { ThemePicker } from '@/components/ThemePicker';
import { useAuthStore } from '@/lib/zustand/authStore';
import { useSettingsStore, SCAN_QUALITY_PRESETS } from '@/lib/zustand/settingsStore';
import { useSupplierStore } from '@/lib/zustand/supplierStore';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useInventoryStore } from '@/lib/zustand/inventoryStore';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const { user, signOut } = useAuthStore();
  const {
    lowStockAlertsEnabled,
    voiceEnabled,
    hapticFeedbackEnabled,
    setLowStockAlerts,
    setVoiceEnabled,
    setHapticFeedback,
    scanQuality,
    setScanQuality,
    handheldDelay,
    standDelay,
    setHandheldDelay,
    setStandDelay,
    init: initSettings,
  } = useSettingsStore();
  const {
    userSettings, favourites, fetchAll: fetchSuppliers,
    setCountry, setShowGlobal, setAffiliateCode, toggleFavourite,
  } = useSupplierStore();

  const [amazonTag, setAmazonTag] = useState(userSettings?.amazon_affiliate_tag ?? '');
  const [jamecoId, setJamecoId] = useState(userSettings?.jameco_avantlink_id ?? '');
  const [hdId, setHdId] = useState(userSettings?.home_depot_impact_id ?? '');

  useEffect(() => {
    initSettings();
    fetchSuppliers().catch(() => {});
  }, [initSettings, fetchSuppliers]);

  useEffect(() => {
    if (userSettings) {
      setAmazonTag(userSettings.amazon_affiliate_tag ?? '');
      setJamecoId(userSettings.jameco_avantlink_id ?? '');
      setHdId(userSettings.home_depot_impact_id ?? '');
    }
  }, [userSettings]);

  const favList = favourites();
  const countries = [
    { code: 'US', label: '🇺🇸 United States' },
    { code: 'UK', label: '🇬🇧 United Kingdom' },
    { code: 'CA', label: '🇨🇦 Canada' },
    { code: 'AU', label: '🇦🇺 Australia' },
    { code: 'GLOBAL', label: '🌍 Global' },
  ];

  const { parts, fetchParts } = useInventoryStore();
  const [isExporting, setIsExporting] = useState(false);

  const exportAsCsv = async () => {
    setIsExporting(true);
    try {
      await fetchParts();
      const allParts = useInventoryStore.getState().parts;
      const headers = ['Name', 'Manufacturer', 'MPN', 'Category', 'Quantity', 'Location', 'Notes'];
      const rows = allParts.map((p) => [
        `"${(p.name ?? '').replace(/"/g, '""')}"`,
        `"${(p.manufacturer ?? '').replace(/"/g, '""')}"`,
        `"${(p.mpn ?? '').replace(/"/g, '""')}"`,
        `"${(p.category ?? '').replace(/"/g, '""')}"`,
        String(p.quantity),
        '""',
        `"${(p.notes ?? '').replace(/"/g, '""')}"`,
      ].join(','));
      const csv = [headers.join(','), ...rows].join('\n');

      try {
        const file = new ExpoFile(Paths.cache, 'makervault_export.csv');
        file.write(csv);
        await Share.share({ url: file.uri, title: 'MakerVault Inventory Export' });
      } catch {
        // Fallback: share as text
        await Share.share({ message: csv, title: 'MakerVault Inventory (CSV)' });
      }
    } catch (e) {
      Alert.alert('Export Failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setIsExporting(false);
    }
  };

  const exportAsJson = async () => {
    setIsExporting(true);
    try {
      await fetchParts();
      const allParts = useInventoryStore.getState().parts;
      const exportData = allParts.map((p) => ({
        name: p.name,
        manufacturer: p.manufacturer,
        mpn: p.mpn,
        category: p.category,
        quantity: p.quantity,
        notes: p.notes,
      }));
      const json = JSON.stringify(exportData, null, 2);

      try {
        const file = new ExpoFile(Paths.cache, 'makervault_export.json');
        file.write(json);
        await Share.share({ url: file.uri, title: 'MakerVault Inventory Export' });
      } catch {
        // Fallback: share as text
        await Share.share({ message: json, title: 'MakerVault Inventory (JSON)' });
      }
    } catch (e) {
      Alert.alert('Export Failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut().catch(() => {}) },
    ]);
  };

  return (
    <ScreenLayout style={{ paddingTop: insets.top }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title="Settings"
        rightElement={
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="close" size={24} color={colors.textMuted} />
          </TouchableOpacity>
        }
      />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>

        {/* What MakerVault Can Do */}
        <TouchableOpacity
          activeOpacity={0.75}
          style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            marginHorizontal: 12, marginTop: 8, marginBottom: 8,
            paddingHorizontal: 14, paddingVertical: 14,
            backgroundColor: colors.accentBg, borderRadius: 4, borderWidth: 1, borderColor: colors.accentBorder,
          }}
          onPress={() => router.push('/features' as any)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="sparkles" size={20} color={colors.accent} />
            <View>
              <Text style={{ fontSize: 16, fontWeight: '800', color: colors.accent }}>ALL FEATURES</Text>
              <Text style={{ fontSize: 14, color: colors.textMuted }}>See everything MakerVault can do</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.accent} />
        </TouchableOpacity>

        {/* Feature Toggles */}
        <EngravingLabel label="Feature Toggles" />
        <PanelCard>
          <ToggleRow
            icon="notifications-outline"
            label="Low Stock Alerts"
            description="Show alerts when items drop below threshold"
            value={lowStockAlertsEnabled}
            onValueChange={setLowStockAlerts}
          />
          <ToggleRow
            icon="mic-outline"
            label="Voice Assistant"
            description="Enable voice commands via mic button"
            value={voiceEnabled}
            onValueChange={setVoiceEnabled}
          />
          <ToggleRow
            icon="hand-left-outline"
            label="Haptic Feedback"
            description="Vibrate on button presses and scans"
            value={hapticFeedbackEnabled}
            onValueChange={setHapticFeedback}
            last
          />
        </PanelCard>

        {/* Scan Quality */}
        <EngravingLabel label="Scan Quality" />
        <PanelCard>
          {SCAN_QUALITY_PRESETS.map((preset, i) => {
            const isActive = scanQuality === preset.id;
            return (
              <TouchableOpacity
                key={preset.id}
                activeOpacity={0.75}
                style={{
                  flexDirection: 'row', alignItems: 'center',
                  paddingHorizontal: Spacing.md, paddingVertical: 12, minHeight: 52,
                  borderBottomWidth: i < SCAN_QUALITY_PRESETS.length - 1 ? 1 : 0,
                  borderBottomColor: colors.borderSubtle,
                  backgroundColor: isActive ? colors.accentBg : undefined,
                }}
                onPress={() => setScanQuality(preset.id)}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: isActive ? colors.accent : colors.textSecondary }}>
                      {preset.name}
                    </Text>
                    <Text style={{ fontSize: FontSize.xs, color: colors.statusOk }}>{preset.accuracy}</Text>
                    <Text style={{ fontSize: FontSize.xs, color: colors.textMuted }}>{preset.speed}</Text>
                  </View>
                  <Text style={{ fontSize: FontSize.xs, color: colors.textMuted }}>{preset.description}</Text>
                </View>
                {isActive && <Ionicons name="checkmark-circle" size={20} color={colors.accent} />}
              </TouchableOpacity>
            );
          })}
        </PanelCard>

        {/* Auto-Scan Timing */}
        <EngravingLabel label="Auto-Scan Timing" />
        <PanelCard>
          <TimingRow
            label="Handheld delay"
            description="Time between captures when holding phone"
            value={handheldDelay}
            options={[1.0, 1.5, 2.0, 3.0, 5.0]}
            onSelect={setHandheldDelay}
            colors={colors}
          />
          <TimingRow
            label="On Stand delay"
            description="Time between captures when phone is propped"
            value={standDelay}
            options={[2.0, 3.0, 3.5, 5.0, 8.0]}
            onSelect={setStandDelay}
            colors={colors}
            isLast
          />
        </PanelCard>

        {/* Theme Picker */}
        <ThemePicker />

        {/* Country / Region */}
        <EngravingLabel label="Country / Region" />
        <PanelCard>
          {countries.map((c, i) => (
            <TouchableOpacity
              key={c.code}
              activeOpacity={0.75}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                paddingHorizontal: Spacing.md, paddingVertical: 13,
                borderBottomWidth: i < countries.length - 1 ? 1 : 0,
                borderBottomColor: colors.borderSubtle,
              }}
              onPress={() => setCountry(c.code)}
            >
              <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary }}>{c.label}</Text>
              {userSettings?.country_code === c.code && (
                <Ionicons name="checkmark" size={18} color={colors.accent} />
              )}
            </TouchableOpacity>
          ))}
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingHorizontal: Spacing.md, paddingVertical: 13,
          }}>
            <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary }}>Show global suppliers</Text>
            <Switch
              value={userSettings?.show_global ?? true}
              onValueChange={setShowGlobal}
              trackColor={{ true: colors.accent, false: colors.bgElevated }}
              thumbColor={colors.textPrimary}
            />
          </View>
        </PanelCard>

        {/* Affiliate Codes */}
        <EngravingLabel label="Affiliate Codes" />
        <PanelCard>
          <View style={{ paddingHorizontal: Spacing.md, paddingVertical: 10 }}>
            <Text style={{ fontSize: FontSize.xs, color: colors.textMuted }}>
              Enter your codes to earn commission when users tap supplier links
            </Text>
          </View>
          <AffiliateRow
            label="Amazon" sublabel="3-4% · 24hr cookie" logoBg="#FF9900" logoText="#000" logoLabel="AMZ"
            value={amazonTag} placeholder="yourtag-20"
            onSave={(v) => { setAmazonTag(v); setAffiliateCode('amazon_affiliate_tag', v); }}
            colors={colors}
          />
          <AffiliateRow
            label="Jameco" sublabel="5% · 120-day cookie" logoBg="#003366" logoText="#FFF" logoLabel="JAMC"
            value={jamecoId} placeholder="Publisher ID"
            onSave={(v) => { setJamecoId(v); setAffiliateCode('jameco_avantlink_id', v); }}
            colors={colors}
          />
          <AffiliateRow
            label="Home Depot" sublabel="1-8% · 1-day cookie" logoBg="#F96302" logoText="#FFF" logoLabel="HD"
            value={hdId} placeholder="Impact ID"
            onSave={(v) => { setHdId(v); setAffiliateCode('home_depot_impact_id', v); }}
            colors={colors} isLast
          />
        </PanelCard>

        {/* Your Favourites */}
        <EngravingLabel label="Your favourite suppliers" />
        <PanelCard>
          {favList.length === 0 ? (
            <View style={{ paddingHorizontal: Spacing.md, paddingVertical: 16 }}>
              <Text style={{ fontSize: FontSize.sm, color: colors.textMuted }}>No favourites yet — star suppliers to add them</Text>
            </View>
          ) : (
            favList.map((sup, i) => (
              <View key={sup.id} style={{
                flexDirection: 'row', alignItems: 'center', gap: 8,
                paddingHorizontal: Spacing.md, paddingVertical: 10, minHeight: 48,
                borderBottomWidth: i < favList.length - 1 ? 1 : 0,
                borderBottomColor: colors.borderSubtle,
              }}>
                <View style={{ width: 44, height: 24, borderRadius: 3, backgroundColor: sup.logo_bg, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: sup.logo_text, letterSpacing: -0.3 }}>{sup.logo_label}</Text>
                </View>
                <Text style={{ flex: 1, fontSize: FontSize.sm, fontWeight: '700', color: colors.textSecondary }}>{sup.name}</Text>
                <TouchableOpacity onPress={() => toggleFavourite(sup.id)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="star" size={18} color="#fcd34d" />
                </TouchableOpacity>
              </View>
            ))
          )}
          <TouchableOpacity
            activeOpacity={0.75}
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
              paddingVertical: 13, borderTopWidth: 1, borderTopColor: colors.borderSubtle,
            }}
            onPress={() => router.push({ pathname: '/all-suppliers', params: { itemName: '' } })}
          >
            <Text style={{ fontSize: FontSize.sm, color: colors.accent }}>Manage all suppliers</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.accent} />
          </TouchableOpacity>
        </PanelCard>

        {/* Account */}
        <EngravingLabel label="Account" />
        <PanelCard>
          {user ? (
            <>
              <View style={{
                flexDirection: 'row', alignItems: 'center',
                paddingHorizontal: Spacing.md, paddingVertical: 13,
                backgroundColor: colors.bgRow,
                borderBottomWidth: 0.5, borderBottomColor: colors.borderSubtle,
              }}>
                <Ionicons name="person" size={18} color={colors.accent} />
                <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                  <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary }}>
                    {user.email ?? 'Anonymous user'}
                  </Text>
                  <Text style={{ fontSize: FontSize.xs, color: colors.textFaint, marginTop: 1 }}>Signed in</Text>
                </View>
              </View>
              {user.email && (
                <TouchableOpacity
                  activeOpacity={0.75}
                  style={{
                    flexDirection: 'row', alignItems: 'center',
                    paddingHorizontal: Spacing.md, paddingVertical: 13,
                    backgroundColor: colors.bgRow, gap: Spacing.sm,
                  }}
                  onPress={handleSignOut}
                >
                  <Ionicons name="log-out-outline" size={18} color={colors.statusOut} />
                  <Text style={{ fontSize: FontSize.sm, color: colors.statusOut }}>Sign Out</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              paddingHorizontal: Spacing.md, paddingVertical: 13,
              backgroundColor: colors.bgRow,
            }}>
              <Ionicons name="person-outline" size={18} color={colors.textFaint} />
              <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary }}>Not signed in</Text>
                <Text style={{ fontSize: FontSize.xs, color: colors.textFaint, marginTop: 1 }}>
                  {isSupabaseConfigured() ? 'Sign in to sync across devices' : 'Configure Supabase to enable sync'}
                </Text>
              </View>
            </View>
          )}
        </PanelCard>

        {/* About */}
        <EngravingLabel label="About" />
        <PanelCard>
          <FieldRow label="Version" value="1.0.0" />
          <FieldRow label="Supabase" value={isSupabaseConfigured() ? 'Connected' : 'Not configured'} />
          <FieldRow
            label="AI Vision"
            value={process.env.EXPO_PUBLIC_GEMINI_API_KEY ? 'Ready' : 'Not configured'}
            isLast
          />
        </PanelCard>

        {/* Data — Export / Import */}
        <EngravingLabel label="Data" />
        <PanelCard>
          <TouchableOpacity
            activeOpacity={0.75}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
              paddingHorizontal: Spacing.md, paddingVertical: 13, minHeight: 44,
              borderBottomWidth: 1, borderBottomColor: colors.borderSubtle,
            }}
            onPress={exportAsCsv}
            disabled={isExporting}
          >
            <Ionicons name="document-text-outline" size={18} color={colors.accent} />
            <Text style={{ flex: 1, fontSize: FontSize.sm, color: colors.textSecondary }}>Export as CSV</Text>
            {isExporting ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Ionicons name="share-outline" size={16} color={colors.textMuted} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.75}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
              paddingHorizontal: Spacing.md, paddingVertical: 13, minHeight: 44,
              borderBottomWidth: 1, borderBottomColor: colors.borderSubtle,
            }}
            onPress={exportAsJson}
            disabled={isExporting}
          >
            <Ionicons name="code-slash-outline" size={18} color={colors.accent} />
            <Text style={{ flex: 1, fontSize: FontSize.sm, color: colors.textSecondary }}>Export as JSON</Text>
            {isExporting ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Ionicons name="share-outline" size={16} color={colors.textMuted} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.75}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
              paddingHorizontal: Spacing.md, paddingVertical: 13, minHeight: 44,
            }}
            onPress={() => router.push('/import' as any)}
          >
            <Ionicons name="cloud-upload-outline" size={18} color={colors.accent} />
            <Text style={{ flex: 1, fontSize: FontSize.sm, color: colors.textSecondary }}>Import from CSV</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </PanelCard>
      </ScrollView>
    </ScreenLayout>
  );
}

function TimingRow({
  label, description, value, options, onSelect, colors, isLast,
}: {
  label: string; description: string; value: number; options: number[];
  onSelect: (v: number) => void;
  colors: { textSecondary: string; textMuted: string; accent: string; accentBg: string; accentBorder: string; borderSubtle: string; bgDeep: string; borderDefault: string };
  isLast?: boolean;
}) {
  return (
    <View style={{
      paddingHorizontal: Spacing.md, paddingVertical: 12,
      borderBottomWidth: isLast ? 0 : 1, borderBottomColor: colors.borderSubtle,
    }}>
      <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textSecondary }}>{label}</Text>
      <Text style={{ fontSize: FontSize.xs, color: colors.textMuted, marginBottom: 8 }}>{description}</Text>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {options.map((opt) => {
          const active = Math.abs(value - opt) < 0.01;
          return (
            <TouchableOpacity key={opt} activeOpacity={0.75}
              style={{
                flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 4, borderWidth: 1,
                backgroundColor: active ? colors.accentBg : colors.bgDeep,
                borderColor: active ? colors.accentBorder : colors.borderDefault,
              }}
              onPress={() => onSelect(opt)}>
              <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: active ? colors.accent : colors.textMuted }}>
                {opt}s
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function AffiliateRow({
  label, sublabel, logoBg, logoText, logoLabel,
  value, placeholder, onSave, colors, isLast,
}: {
  label: string; sublabel: string; logoBg: string; logoText: string; logoLabel: string;
  value: string; placeholder: string; onSave: (v: string) => void;
  colors: { textSecondary: string; textMuted: string; statusOk: string; bgDeep: string; borderDefault: string; borderSubtle: string };
  isLast?: boolean;
}) {
  const [local, setLocal] = useState(value);
  const saved = local === value && value.length > 0;

  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingHorizontal: Spacing.md, paddingVertical: 10, minHeight: 52,
      borderBottomWidth: isLast ? 0 : 1, borderBottomColor: colors.borderSubtle,
    }}>
      <View style={{ width: 44, height: 24, borderRadius: 3, backgroundColor: logoBg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 14, fontWeight: '800', color: logoText, letterSpacing: -0.3 }}>{logoLabel}</Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, fontWeight: '600' }}>{label}</Text>
        <Text style={{ fontSize: FontSize.xs, color: colors.textMuted }}>{sublabel}</Text>
      </View>
      <TextInput
        style={{
          width: 100, fontSize: 14, color: colors.textSecondary,
          backgroundColor: colors.bgDeep, borderWidth: 1, borderColor: colors.borderDefault,
          borderRadius: 4, paddingHorizontal: 8, paddingVertical: 6, textAlign: 'center',
        }}
        value={local}
        onChangeText={setLocal}
        onBlur={() => { if (local !== value) onSave(local); }}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
      />
      {saved && <Ionicons name="checkmark-circle" size={18} color={colors.statusOk} />}
    </View>
  );
}

function ToggleRow({
  icon,
  label,
  description,
  value,
  onValueChange,
  last,
}: {
  icon: string;
  label: string;
  description: string;
  value: boolean;
  onValueChange: (val: boolean) => void;
  last?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: Spacing.md, paddingVertical: 13, backgroundColor: colors.bgRow,
        ...(!last ? { borderBottomWidth: 0.5, borderBottomColor: colors.borderSubtle } : {}),
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: Spacing.sm }}>
        <Ionicons name={icon as any} size={18} color={colors.textMuted} />
        <View style={{ flex: 1, marginLeft: Spacing.sm }}>
          <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary }}>{label}</Text>
          <Text style={{ fontSize: FontSize.xs, color: colors.textFaint, marginTop: 1 }}>{description}</Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: colors.accent, false: colors.bgElevated }}
        thumbColor={colors.textPrimary}
      />
    </View>
  );
}
