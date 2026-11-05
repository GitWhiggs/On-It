import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';

type HelperState = 'none' | 'away' | 'here';

const HEIGHT = 160; 
const ACCENT = '#3B83F6';

const YOU = { latitude: 41.8084, longitude: -72.2495 };
const AWAY = { latitude: 41.814, longitude: -72.256 };
const HERE = { latitude: 41.8087, longitude: -72.2492 };

interface TrackMapProps {
  step: number;
  helper?: HelperState;
  onActionPress?: () => void;
  readOnly?: boolean; // ✨ Added readOnly prop for past receipts
}

export default function TrackMap({ step, helper = 'none', onActionPress, readOnly = false }: TrackMapProps) {
  const isDone = step === 4; 
  
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const initialRegion = {
    latitude: YOU.latitude,
    longitude: YOU.longitude,
    latitudeDelta: 0.015,
    longitudeDelta: 0.015,
  };

  return (
    <View style={styles.slot}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        showsUserLocation={hasPermission}
        showsMyLocationButton={false} 
        scrollEnabled={false}
        zoomEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}
      >
        {helper === 'away' && (
          <Marker coordinate={AWAY} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.helperAvatar}>
              <Text style={styles.helperAvatarText}>M</Text>
            </View>
          </Marker>
        )}
        {helper === 'here' && (
          <Marker coordinate={HERE} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.helperAvatar}>
              <Text style={styles.helperAvatarText}>M</Text>
            </View>
          </Marker>
        )}
      </MapView>

      {/* If readOnly is true, show a clean static badge instead of action buttons */}
      {isDone && readOnly && (
        <View style={styles.doneOverlay}>
          <MaterialCommunityIcons name="check-circle" size={28} color="#22C55E" />
          <Text style={styles.doneTitle}>Task completed successfully</Text>
        </View>
      )}

      {/* Interactive completion view for active jobs */}
      {isDone && !readOnly && (
        <View style={styles.doneOverlay}>
          <MaterialCommunityIcons name="check-circle-outline" size={26} color="#22C55E" />
          <Text style={styles.doneTitle}>Helper completed the task</Text>
          <Text style={styles.doneSub}>Confirm everything looks good.</Text>
          <Pressable
            style={styles.actionButton}
            onPress={onActionPress}
            accessibilityRole="button"
          >
            <Text style={styles.actionButtonText}>Yes, all good</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    height: HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#E9E7E1',
  },
  helperAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EFEDE7', 
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF', 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  helperAvatarText: {
    color: '#111111',
    fontSize: 14,
    fontWeight: '700',
  },
  doneOverlay: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(17, 17, 17, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 4,
  },
  doneTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', marginTop: 2 },
  doneSub: { color: '#98989F', fontSize: 12 },
  actionButton: {
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 32,
    marginTop: 6,
  },
  actionButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});