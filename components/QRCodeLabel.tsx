import { View, Text, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useTheme } from '@/context/ThemeContext';

interface QRCodeLabelProps {
  locationId: string;
  locationName: string;
  size?: number;
  /** Callback to receive the SVG ref — used for toDataURL export */
  getRef?: (ref: unknown) => void;
}

export function QRCodeLabel({ locationId, locationName, size = 120, getRef }: QRCodeLabelProps) {
  const { colors } = useTheme();
  const qrValue = `makervault://location/${locationId}`;

  return (
    <View style={[s.container, { backgroundColor: colors.bgCard, borderColor: colors.borderDefault }]}>
      <View style={s.qrWrap}>
        <QRCode
          value={qrValue}
          size={size}
          backgroundColor="#ffffff"
          color="#000000"
          getRef={getRef}
        />
      </View>
      <Text style={[s.name, { color: colors.textSecondary }]}>
        {locationName}
      </Text>
      <Text style={[s.hint, { color: colors.textFaint }]}>
        Scan to view contents
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderRadius: 4,
    borderWidth: 1,
    padding: 20,
  },
  qrWrap: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 4,
  },
  name: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '700',
  },
  hint: {
    marginTop: 4,
    fontSize: 14,
  },
});
