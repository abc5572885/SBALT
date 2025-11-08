/**
 * 認證診斷工具
 * 用於測試 Supabase 連線和 OAuth 配置
 */

import { supabase } from '@/lib/supabase';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Button, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function DebugAuthScreen() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    console.log(`[診斷] ${message}`);
    setResults((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testSupabaseConnection = async () => {
    setLoading(true);
    addResult('開始測試 Supabase 連線...');

    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        if (error.message?.includes('No session')) {
          addResult('✅ Supabase 連線正常（目前沒有 session）');
        } else {
          addResult(`❌ Supabase 連線錯誤: ${error.message}`);
          Alert.alert('連線錯誤', error.message);
        }
      } else {
        if (data.session) {
          addResult(`✅ Supabase 連線正常，已有 session: ${data.session.user?.email}`);
        } else {
          addResult('✅ Supabase 連線正常（目前沒有 session）');
        }
      }
    } catch (err: any) {
      addResult(`❌ 連線測試失敗: ${err.message || '未知錯誤'}`);
      Alert.alert('連線失敗', err.message || '未知錯誤');
    }

    setLoading(false);
  };

  const testConfiguration = () => {
    addResult('開始檢查配置...');

    const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
    const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey;
    const oauthRedirectUrl = Constants.expoConfig?.extra?.oauthRedirectUrl;

    if (!supabaseUrl) {
      addResult('❌ Supabase URL 未設定');
    } else {
      addResult(`✅ Supabase URL: ${supabaseUrl}`);
    }

    if (!supabaseAnonKey) {
      addResult('❌ Supabase Anon Key 未設定');
    } else {
      addResult(`✅ Supabase Anon Key: ${supabaseAnonKey.substring(0, 20)}...`);
    }

    addResult(`✅ OAuth Redirect URL: ${oauthRedirectUrl || 'spalt://'}`);
    addResult(`✅ 開發模式: ${__DEV__ ? '是' : '否'}`);

    if (__DEV__) {
      const hostUri = Constants.expoConfig?.hostUri || 'localhost:8081';
      addResult(`✅ 開發環境 Redirect URL: exp://${hostUri}`);
    }

    addResult('配置檢查完成');
  };

  const testDeepLinking = async () => {
    addResult('開始測試深度連結...');

    try {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        addResult(`✅ 初始 URL: ${initialUrl}`);
      } else {
        addResult('ℹ️ 沒有初始 URL（正常）');
      }

      // 測試是否可以處理 URL scheme
      const canOpen = await Linking.canOpenURL('spalt://test');
      addResult(`✅ 可以開啟 spalt://: ${canOpen ? '是' : '否'}`);

      const canOpenExp = await Linking.canOpenURL('exp://test');
      addResult(`✅ 可以開啟 exp://: ${canOpenExp ? '是' : '否'}`);
    } catch (err: any) {
      addResult(`❌ 深度連結測試失敗: ${err.message}`);
    }

    addResult('深度連結測試完成');
  };

  const testOAuthURL = async () => {
    setLoading(true);
    addResult('開始測試 OAuth URL 生成...');

    try {
      const redirectUrl = __DEV__ 
        ? `exp://${Constants.expoConfig?.hostUri || 'localhost:8081'}`
        : Constants.expoConfig?.extra?.oauthRedirectUrl || 'spalt://';

      addResult(`使用 Redirect URL: ${redirectUrl}`);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        addResult(`❌ OAuth URL 生成失敗: ${error.message}`);
        if (error.message?.includes('provider is not enabled')) {
          addResult('⚠️ 請在 Supabase Dashboard 中啟用 Google Provider');
        }
        Alert.alert('OAuth 錯誤', error.message);
      } else if (data?.url) {
        addResult(`✅ OAuth URL 生成成功`);
        addResult(`URL: ${data.url.substring(0, 100)}...`);
        Alert.alert('成功', 'OAuth URL 已生成，可以在瀏覽器中測試');
      } else {
        addResult('❌ 未收到 OAuth URL');
        Alert.alert('錯誤', '未收到 OAuth URL');
      }
    } catch (err: any) {
      addResult(`❌ OAuth URL 測試失敗: ${err.message}`);
      Alert.alert('錯誤', err.message || '未知錯誤');
    }

    setLoading(false);
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>認證診斷工具</Text>
      <Text style={styles.subtitle}>用於測試 Supabase 連線和 OAuth 配置</Text>

      <View style={styles.buttonContainer}>
        <Button title="測試 Supabase 連線" onPress={testSupabaseConnection} disabled={loading} />
        <Button title="檢查配置" onPress={testConfiguration} disabled={loading} />
        <Button title="測試深度連結" onPress={testDeepLinking} disabled={loading} />
        <Button title="測試 OAuth URL" onPress={testOAuthURL} disabled={loading} />
        <Button title="清除結果" onPress={clearResults} color="#ff3b30" />
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>處理中...</Text>
        </View>
      )}

      <View style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>診斷結果:</Text>
        {results.length === 0 ? (
          <Text style={styles.noResults}>尚未執行測試</Text>
        ) : (
          results.map((result, index) => (
            <Text key={index} style={styles.resultItem}>
              {result}
            </Text>
          ))
        )}
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>檢查清單:</Text>
        <Text style={styles.infoItem}>1. Supabase Dashboard 中已啟用 Google Provider</Text>
        <Text style={styles.infoItem}>2. Google Cloud Console 中已設定正確的 Redirect URI</Text>
        <Text style={styles.infoItem}>3. Supabase Dashboard 中已設定 Redirect URLs</Text>
        <Text style={styles.infoItem}>4. app.json 中已設定正確的 URL scheme</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 8,
    color: '#666',
  },
  resultsContainer: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    minHeight: 200,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  noResults: {
    color: '#999',
    fontStyle: 'italic',
  },
  resultItem: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 4,
    color: '#333',
  },
  infoContainer: {
    backgroundColor: '#e8f4f8',
    padding: 16,
    borderRadius: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  infoItem: {
    fontSize: 14,
    marginBottom: 8,
    color: '#333',
  },
});

