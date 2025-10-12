import * as Google from 'expo-auth-session/providers/google';
import { useRouter } from 'expo-router';
import React from 'react';
import { Button, View } from 'react-native';

export default function LoginScreen() {
    const router = useRouter();
    const [request, response, promptAsync] = Google.useAuthRequest({
        clientId: '378393317597-j31sos4uciqcj6bc3uoj8ishg1je0a2i.apps.googleusercontent.com',
        scopes: ['profile', 'email'],
    });

    React.useEffect(() => {
        if (response?.type === 'success') {
            // 登入成功引導
            router.replace('/profile'); // 個人主頁
        }
    }, [response]);

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Button
                title="使用 Google 登入"
                disabled={!request}
                onPress={() => promptAsync()}
            />
        </View>
    );
}