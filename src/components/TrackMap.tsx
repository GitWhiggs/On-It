import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

// Fake positions near Storrs for now. Later the helper's real location goes here.
const YOU = { latitude: 41.8084, longitude: -72.2495 };
const HELPER = { latitude: 41.814, longitude: -72.256 };

export default function TrackMap() {
  return (
    <View style={styles.wrap}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={{ latitude: 41.8112, longitude: -72.2528, latitudeDelta: 0.03, longitudeDelta: 0.03 }}
        scrollEnabled={false}
        zoomEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}
      >
        <Marker coordinate={YOU} title="You" pinColor="#111111" />
        <Marker coordinate={HELPER} title="Marcus" pinColor="#FF5A1F" />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
    wrap: { height: 200, borderRadius: 18, overflow: 'hidden' },
});