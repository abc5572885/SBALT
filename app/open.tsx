import { Redirect, useLocalSearchParams } from 'expo-router';

export default function OpenRedirect() {
  const { event, tournament, group, venue } = useLocalSearchParams<{
    event?: string;
    tournament?: string;
    group?: string;
    venue?: string;
  }>();

  if (event) {
    return <Redirect href={{ pathname: '/event/detail', params: { eventId: event } }} />;
  }
  if (tournament) {
    return <Redirect href={{ pathname: '/tournament/[id]', params: { id: tournament } }} />;
  }
  if (venue) {
    return <Redirect href={{ pathname: '/venue/[id]', params: { id: venue } }} />;
  }
  if (group) {
    return <Redirect href={{ pathname: '/group/[id]', params: { id: group } }} />;
  }

  return <Redirect href="/(tabs)" />;
}
