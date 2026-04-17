import { PageHeader } from '@/components/PageHeader';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React, { useState } from 'react';
import {
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Venue {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  sports: string[];
}

// Popular sports venues in Zhubei / Hsinchu area
const VENUES: Venue[] = [
  {
    id: '1',
    name: '新科國民運動中心',
    address: '新竹縣竹北市科大一路2號',
    latitude: 24.8098,
    longitude: 121.0395,
    sports: ['籃球', '排球', '羽球', '游泳'],
  },
  {
    id: '2',
    name: '竹北國民運動中心',
    address: '新竹縣竹北市福興路1000號',
    latitude: 24.8296,
    longitude: 121.0133,
    sports: ['籃球', '排球', '羽球'],
  },
  {
    id: '3',
    name: '新竹市立體育館',
    address: '新竹市東區公園路295號',
    latitude: 24.8015,
    longitude: 120.9718,
    sports: ['籃球', '排球'],
  },
  {
    id: '4',
    name: '十八尖山',
    address: '新竹市東區寶山路',
    latitude: 24.7870,
    longitude: 120.9860,
    sports: ['跑步', '健行'],
  },
  {
    id: '5',
    name: '頭前溪自行車道',
    address: '新竹縣竹北市',
    latitude: 24.8180,
    longitude: 121.0050,
    sports: ['跑步', '騎車'],
  },
  {
    id: '6',
    name: '竹北市立體育場',
    address: '新竹縣竹北市光明六路10號',
    latitude: 24.8370,
    longitude: 121.0050,
    sports: ['籃球', '跑步'],
  },
];

export default function VenuesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);

  const openNavigation = (venue: Venue) => {
    const query = encodeURIComponent(venue.address);
    const url = Platform.select({
      ios: `maps:?q=${query}&ll=${venue.latitude},${venue.longitude}`,
      android: `geo:${venue.latitude},${venue.longitude}?q=${query}`,
      default: `https://maps.google.com/?q=${query}`,
    });
    Linking.openURL(url);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <PageHeader title="附近場地" />

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: 24.8200,
            longitude: 121.0100,
            latitudeDelta: 0.08,
            longitudeDelta: 0.08,
          }}
          showsUserLocation
        >
          {VENUES.map((venue) => (
            <Marker
              key={venue.id}
              coordinate={{ latitude: venue.latitude, longitude: venue.longitude }}
              title={venue.name}
              description={venue.sports.join(' · ')}
              onPress={() => setSelectedVenue(venue)}
            />
          ))}
        </MapView>
      </View>

      {/* Venue list */}
      <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
        {(selectedVenue ? [selectedVenue] : VENUES).map((venue) => (
          <TouchableOpacity
            key={venue.id}
            style={[styles.venueCard, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}
            onPress={() => openNavigation(venue)}
            activeOpacity={0.7}
          >
            <View style={styles.venueInfo}>
              <ThemedText style={styles.venueName}>{venue.name}</ThemedText>
              <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                {venue.address}
              </ThemedText>
              <View style={styles.sportTags}>
                {venue.sports.map((sport) => (
                  <View key={sport} style={[styles.sportTag, { backgroundColor: colors.primary + '12' }]}>
                    <ThemedText type="label" style={{ color: colors.primary }}>{sport}</ThemedText>
                  </View>
                ))}
              </View>
            </View>
            <IconSymbol name="chevron.right" size={16} color={colors.disabled} />
          </TouchableOpacity>
        ))}

        {selectedVenue && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setSelectedVenue(null)}
            activeOpacity={0.6}
          >
            <ThemedText type="caption" style={{ color: colors.primary }}>顯示全部場地</ThemedText>
          </TouchableOpacity>
        )}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  mapContainer: {
    height: 280,
    marginHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  map: {
    flex: 1,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  venueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.sm,
  },
  venueInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  venueName: {
    fontSize: 16,
    fontWeight: '600',
  },
  sportTags: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  sportTag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  clearButton: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
});
