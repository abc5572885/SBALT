import { Redirect, useLocalSearchParams } from 'expo-router';

export default function OpenRedirect() {
  const { event } = useLocalSearchParams<{ event: string }>();

  if (event) {
    return <Redirect href={{ pathname: '/event/detail', params: { eventId: event } }} />;
  }

  return <Redirect href="/(tabs)" />;
}
