import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useRouter } from 'expo-router';
import { Button, StyleSheet, View } from 'react-native';

export default function ProfileScreen() {
    const router = useRouter();

    return (
        <ThemedView style={styles.container}>
            <ThemedText type="title">個人資料</ThemedText>
            <ThemedText style={styles.welcome}>歡迎來到 Vivelog！</ThemedText>
            <ThemedText>你已成功登入 Google 帳戶</ThemedText>
            
            <View style={styles.buttonContainer}>
                <Button 
                    title="返回首頁" 
                    onPress={() => router.push('/')} 
                />
            </View>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        gap: 20,
    },
    welcome: {
        fontSize: 18,
        textAlign: 'center',
    },
    buttonContainer: {
        marginTop: 20,
    },
});
