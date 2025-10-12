import { ThemedText } from '@/components/themed-text';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Button, StyleSheet, View } from 'react-native';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Image
        source={require('@/assets/images/partial-react-logo.png')}
        style={styles.logo}
      />
      <ThemedText type="title">Vivelog</ThemedText>
      <ThemedText style={styles.welcome}>Welcome to use Vivelog！</ThemedText>
      <Button title="Login" onPress={() => router.push('/login')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  logo: {
    height: 120,
    width: 200,
    marginBottom: 28,
  },
  welcome: {
    marginVertical: 8,
  },
});
