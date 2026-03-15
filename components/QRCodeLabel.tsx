import { View, Text } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

interface QRCodeLabelProps {
  locationId: string;
  locationName: string;
  size?: number;
}

export function QRCodeLabel({ locationId, locationName, size = 120 }: QRCodeLabelProps) {
  const qrValue = `makervault://location/${locationId}`;

  return (
    <View className="items-center rounded-xl bg-white p-4 dark:bg-zinc-800">
      <QRCode value={qrValue} size={size} backgroundColor="transparent" />
      <Text className="mt-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {locationName}
      </Text>
      <Text className="mt-0.5 text-xs text-zinc-400">Scan to view contents</Text>
    </View>
  );
}
