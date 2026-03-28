import { View, Text, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useTheme } from '@/context/ThemeContext';

// ─── UNIVERSAL QR LABEL TYPES ─────────────────────────────────────────────────

export type QRLabelType = 'location' | 'category' | 'part';

interface QRLabelProps {
  type: QRLabelType;
  id: string;
  title: string;
  subtitle?: string;
  size?: 'small' | 'medium' | 'large';
  getRef?: (ref: unknown) => void;
}

// ─── LEGACY COMPAT PROPS (used by locations.tsx) ──────────────────────────────

interface LegacyQRCodeLabelProps {
  locationId: string;
  locationName: string;
  size?: number;
  getRef?: (ref: unknown) => void;
}

// ─── SIZE CONFIG ──────────────────────────────────────────────────────────────

const SIZE_CONFIG = {
  small: {
    qrSize: 80,
    padding: 4,
    qrPadding: 4,
    titleSize: 10,
    subtitleSize: 8,
    hintSize: 0,        // no hint for small
    titleMaxChars: 20,
    showHint: false,
    gap: 2,
  },
  medium: {
    qrSize: 120,
    padding: 12,
    qrPadding: 8,
    titleSize: 14,
    subtitleSize: 12,
    hintSize: 0,
    titleMaxChars: 30,
    showHint: false,
    gap: 6,
  },
  large: {
    qrSize: 200,
    padding: 20,
    qrPadding: 12,
    titleSize: 16,
    subtitleSize: 14,
    hintSize: 12,
    titleMaxChars: 40,
    showHint: true,
    gap: 8,
  },
} as const;

// ─── QR VALUE BUILDERS ───────────────────────────────────────────────────────

function buildQRValue(_type: QRLabelType, id: string): string {
  return `MV:${id}`;
}

// ─── UNIVERSAL QR LABEL COMPONENT ────────────────────────────────────────────

export function UniversalQRLabel({ type, id, title, subtitle, size = 'medium', getRef }: QRLabelProps) {
  const { colors } = useTheme();
  const config = SIZE_CONFIG[size];
  const qrValue = buildQRValue(type, id);

  const truncatedTitle = title.length > config.titleMaxChars
    ? title.slice(0, config.titleMaxChars - 1) + '\u2026'
    : title;

  return (
    <View style={[
      s.container,
      {
        backgroundColor: colors.bgCard,
        borderColor: colors.borderDefault,
        padding: config.padding,
      },
    ]}>
      <View style={[s.qrWrap, { padding: config.qrPadding }]}>
        <QRCode
          value={qrValue}
          size={config.qrSize}
          backgroundColor="#ffffff"
          color="#000000"
          getRef={getRef}
        />
      </View>
      <Text
        style={[
          s.title,
          {
            color: colors.textSecondary,
            fontSize: config.titleSize,
            marginTop: config.gap,
          },
        ]}
        numberOfLines={1}
      >
        {truncatedTitle}
      </Text>
      {subtitle ? (
        <Text
          style={[
            s.subtitle,
            {
              color: colors.textFaint,
              fontSize: config.subtitleSize,
              marginTop: 2,
            },
          ]}
          numberOfLines={1}
        >
          {subtitle}
        </Text>
      ) : null}
      {config.showHint ? (
        <Text style={[s.hint, { color: colors.textFaint, fontSize: config.hintSize, marginTop: 4 }]}>
          Scan with MakerVault
        </Text>
      ) : null}
    </View>
  );
}

// ─── PRINT-OPTIMIZED QR LABEL (white bg, black text — for export) ────────────

interface PrintQRLabelProps {
  type: QRLabelType;
  id: string;
  title: string;
  subtitle?: string;
  size?: 'small' | 'medium' | 'large';
  getRef?: (ref: unknown) => void;
}

export function PrintQRLabel({ type, id, title, subtitle, size = 'medium', getRef }: PrintQRLabelProps) {
  const config = SIZE_CONFIG[size];
  const qrValue = buildQRValue(type, id);

  const truncatedTitle = title.length > config.titleMaxChars
    ? title.slice(0, config.titleMaxChars - 1) + '\u2026'
    : title;

  return (
    <View style={[s.printContainer, { padding: config.padding }]}>
      <View style={[s.qrWrap, { padding: config.qrPadding }]}>
        <QRCode
          value={qrValue}
          size={config.qrSize}
          backgroundColor="#ffffff"
          color="#000000"
          getRef={getRef}
        />
      </View>
      <Text
        style={[
          s.printTitle,
          {
            fontSize: config.titleSize,
            marginTop: config.gap,
          },
        ]}
        numberOfLines={1}
      >
        {truncatedTitle}
      </Text>
      {subtitle ? (
        <Text
          style={[
            s.printSubtitle,
            {
              fontSize: config.subtitleSize,
              marginTop: 2,
            },
          ]}
          numberOfLines={1}
        >
          {subtitle}
        </Text>
      ) : null}
      {config.showHint ? (
        <Text style={[s.printHint, { fontSize: config.hintSize, marginTop: 4 }]}>
          Scan with MakerVault
        </Text>
      ) : null}
    </View>
  );
}

// ─── LEGACY COMPAT — matches old API used in locations.tsx ────────────────────

export function QRCodeLabel({ locationId, locationName, size = 120, getRef }: LegacyQRCodeLabelProps) {
  const { colors } = useTheme();
  const qrValue = `MV:${locationId}`;

  return (
    <View style={[s.container, { backgroundColor: colors.bgCard, borderColor: colors.borderDefault, padding: 20 }]}>
      <View style={[s.qrWrap, { padding: 12 }]}>
        <QRCode
          value={qrValue}
          size={size}
          backgroundColor="#ffffff"
          color="#000000"
          getRef={getRef}
        />
      </View>
      <Text style={[s.title, { color: colors.textSecondary, fontSize: 16, marginTop: 12 }]}>
        {locationName}
      </Text>
      <Text style={[s.hint, { color: colors.textFaint, fontSize: 14, marginTop: 4 }]}>
        Scan to view contents
      </Text>
    </View>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderRadius: 4,
    borderWidth: 1,
  },
  qrWrap: {
    backgroundColor: '#ffffff',
    borderRadius: 4,
  },
  title: {
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
  },
  hint: {
    textAlign: 'center',
  },
  // Print styles (white bg, black text)
  printContainer: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 4,
  },
  printTitle: {
    fontWeight: '700',
    textAlign: 'center',
    color: '#000000',
  },
  printSubtitle: {
    textAlign: 'center',
    color: '#333333',
  },
  printHint: {
    textAlign: 'center',
    color: '#666666',
  },
});
