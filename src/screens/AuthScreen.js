import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, Alert, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PRIMARY, DARK, MUTED, BORDER, BG } from '../constants/theme';
import { translations } from '../constants/translations';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen({ lang, changeLang, onLoginSuccess }) {
  const [authMode, setAuthMode] = useState('login');
  const [auth, setAuth] = useState({ identifier: 'admin@company.com', password: 'password123', name: '', role: 'SEEKER' });
  const [submitting, setSubmitting] = useState(false);

  const t = (key) => (translations[lang] && translations[lang][key]) || translations.en[key] || key;

  // Configure Google Login
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
  });

  React.useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      handleGoogleLoginBackend(authentication.accessToken);
    }
  }, [response]);

  async function handleGoogleLoginBackend(accessToken) {
    setSubmitting(true);
    try {
      const API_BASE = process.env.EXPO_PUBLIC_API_BASE || 'http://localhost:8080';
      const res = await fetch(`${API_BASE}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken, role: auth.role })
      });
      if (!res.ok) throw new Error('Backend validation failed');
      const data = await res.json();
      onLoginSuccess(data);
    } catch (e) {
      Alert.alert(t('loginFailed'), e.message || 'Google Login Verification failed');
    } finally {
      setSubmitting(false);
    }
  }

  // Handle Mock Google login for development/simulators
  function handleMockGoogleLogin() {
    Alert.prompt(
      "Simulate Google Login",
      "Enter a mock Google Access Token (or keep blank for mock verification)",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Login", 
          onPress: async (token) => {
            // If they enter nothing, we simulate an access token or fetch direct from userinfo
            const mockToken = token || "mock-access-token";
            setSubmitting(true);
            try {
              // Let's attempt to log in using a mock token (or verify with backend)
              await handleGoogleLoginBackend(mockToken);
            } catch (err) {
              Alert.alert("Failed", "Verification failed. Starting simulator bypass...");
              // Dev bypass if backend not reachable:
              onLoginSuccess({ token: 'mock-jwt-token', role: auth.role, userId: '1' });
            } finally {
              setSubmitting(false);
            }
          }
        }
      ],
      "plain-text"
    );
  }

  async function handleEmailLogin() {
    if (!auth.identifier.trim() || !auth.password.trim()) {
      return Alert.alert('Error', 'Please enter email/phone and password');
    }
    setSubmitting(true);
    try {
      const API_BASE = process.env.EXPO_PUBLIC_API_BASE || 'http://localhost:8080';
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: auth.identifier, password: auth.password })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Invalid credentials');
      }
      const data = await res.json();
      onLoginSuccess(data);
    } catch (e) {
      Alert.alert(t('loginFailed'), e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEmailRegister() {
    if (!auth.name.trim() || !auth.identifier.trim() || !auth.password.trim()) {
      return Alert.alert('Error', 'Please fill all fields');
    }
    if (auth.password.length < 6) {
      return Alert.alert('Error', 'Password must be at least 6 characters');
    }
    setSubmitting(true);
    try {
      const payload = {
        name: auth.name,
        email: auth.identifier.includes('@') ? auth.identifier : null,
        phone: auth.identifier.includes('@') ? null : auth.identifier,
        password: auth.password,
        role: auth.role
      };
      const API_BASE = process.env.EXPO_PUBLIC_API_BASE || 'http://localhost:8080';
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Registration failed');
      }
      const data = await res.json();
      onLoginSuccess(data);
    } catch (e) {
      Alert.alert(t('registerFailed'), e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.authPage}>
        <View style={s.authCard}>
          <Text style={s.authTitle}>{authMode === 'login' ? t('login') : t('signUp')}</Text>
          
          {/* Language Toggle */}
          <View style={s.langRow}>
            {['en', 'hi', 'mr'].map(l => (
              <TouchableOpacity key={l} onPress={() => changeLang(l)} style={[s.langBtn, lang === l && s.langBtnActive]}>
                <Text style={[s.langBtnText, lang === l && s.langBtnTextActive]}>{l === 'en' ? 'EN' : l === 'hi' ? 'हिं' : 'मरा'}</Text>
              </TouchableOpacity>
            ))}
          </View>
          
          {/* Auth Mode Tabs */}
          <View style={s.authTabs}>
            <TouchableOpacity style={[s.authTab, authMode === 'login' && s.authTabActive]} onPress={() => setAuthMode('login')}>
              <Text style={[s.authTabText, authMode === 'login' && s.authTabTextActive]}>{t('login')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.authTab, authMode === 'register' && s.authTabActive]} onPress={() => setAuthMode('register')}>
              <Text style={[s.authTabText, authMode === 'register' && s.authTabTextActive]}>{t('signUp')}</Text>
            </TouchableOpacity>
          </View>
          
          {authMode === 'register' && (
            <TextInput style={s.input} placeholder={t('yourName')} value={auth.name} onChangeText={v => setAuth({...auth, name: v})} placeholderTextColor={MUTED} />
          )}
          
          <TextInput style={s.input} placeholder={t('email')} value={auth.identifier} onChangeText={v => setAuth({...auth, identifier: v})} autoCapitalize="none" placeholderTextColor={MUTED} keyboardType="email-address" />
          <TextInput style={s.input} placeholder={t('password')} secureTextEntry value={auth.password} onChangeText={v => setAuth({...auth, password: v})} placeholderTextColor={MUTED} />
          
          {authMode === 'register' && (
            <View style={s.roleRow}>
              <TouchableOpacity style={[s.roleBtn, auth.role === 'SEEKER' && s.roleBtnActive]} onPress={() => setAuth({...auth, role: 'SEEKER'})}>
                <Text style={[s.roleBtnText, auth.role === 'SEEKER' && s.roleBtnTextActive]}>{t('lookingForWork')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.roleBtn, auth.role === 'EMPLOYER' && s.roleBtnActive]} onPress={() => setAuth({...auth, role: 'EMPLOYER'})}>
                <Text style={[s.roleBtnText, auth.role === 'EMPLOYER' && s.roleBtnTextActive]}>{t('hiring')}</Text>
              </TouchableOpacity>
            </View>
          )}
          
          <TouchableOpacity style={[s.primaryBtn, submitting && s.disabledBtn]} onPress={authMode === 'login' ? handleEmailLogin : handleEmailRegister} disabled={submitting}>
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>{authMode === 'login' ? t('login') : t('createAccount')}</Text>}
          </TouchableOpacity>

          {/* Google Login button */}
          <TouchableOpacity 
            style={s.googleBtn} 
            onPress={() => {
              if (request) {
                promptAsync().catch(() => handleMockGoogleLogin());
              } else {
                handleMockGoogleLogin();
              }
            }}
          >
            <Ionicons name="logo-google" size={18} color="#db4437" />
            <Text style={s.googleBtnText}>Sign in with Google</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  authPage: { flex: 1, justifyContent: 'center', padding: 24 },
  authCard: { backgroundColor: '#fff', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 20, elevation: 5 },
  authTitle: { fontSize: 24, fontWeight: '800', color: DARK, textAlign: 'center', marginBottom: 16 },
  authTabs: { flexDirection: 'row', marginBottom: 16, borderRadius: 10, backgroundColor: '#f1f5f9', padding: 3 },
  authTab: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  authTabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  authTabText: { fontSize: 13, fontWeight: '700', color: MUTED },
  authTabTextActive: { color: DARK },
  roleRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  roleBtn: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1.5, borderColor: BORDER, alignItems: 'center' },
  roleBtnActive: { borderColor: PRIMARY, backgroundColor: 'rgba(14,165,233,0.05)' },
  roleBtnText: { fontSize: 12, fontWeight: '600', color: MUTED },
  roleBtnTextActive: { color: PRIMARY },
  langRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 16, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: BORDER, alignSelf: 'center' },
  langBtn: { paddingVertical: 6, paddingHorizontal: 14, backgroundColor: '#fff', borderRightWidth: 1, borderRightColor: BORDER },
  langBtnActive: { backgroundColor: PRIMARY },
  langBtnText: { fontSize: 12, fontWeight: '700', color: MUTED },
  langBtnTextActive: { color: '#fff' },
  input: { borderWidth: 1, borderColor: BORDER, borderRadius: 10, padding: 12, fontSize: 14, marginBottom: 10, backgroundColor: BG, color: DARK },
  primaryBtn: { backgroundColor: PRIMARY, paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  disabledBtn: { opacity: 0.5 },
  googleBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 10 },
  googleBtnText: { color: '#475569', fontWeight: 'bold', fontSize: 14 }
});
