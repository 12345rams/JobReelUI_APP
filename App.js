import React, { useState, useEffect } from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, StyleSheet, Modal, StatusBar, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { PRIMARY, DARK, MUTED, BG } from './src/constants/theme';
import { translations } from './src/constants/translations';
import { callApi } from './src/services/api';

// Modular Screen Imports
import AuthScreen from './src/screens/AuthScreen';
import FeedScreen from './src/screens/FeedScreen';
import PostJobScreen from './src/screens/PostJobScreen';
import PostsScreen from './src/screens/PostsScreen';
import ChatScreen from './src/screens/ChatScreen';
import ProfileScreen from './src/screens/ProfileScreen';

export default function App() {
  const [lang, setLang] = useState('en');
  const [token, setToken] = useState('');
  const [role, setRole] = useState('');
  const [userId, setUserId] = useState('');
  const [currentView, setCurrentView] = useState('feed');
  const [toast, setToast] = useState('');
  const [loadingSession, setLoadingSession] = useState(true);

  // Modal and Navigation states
  const [showJobForm, setShowJobForm] = useState(false);
  const [profileId, setProfileId] = useState('');
  const [chatRecipientId, setChatRecipientId] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  const t = (key) => (translations[lang] && translations[lang][key]) || translations.en[key] || key;

  // Load saved session on mount
  useEffect(() => {
    (async () => {
      try {
        const savedToken = await AsyncStorage.getItem('token');
        const savedRole = await AsyncStorage.getItem('role');
        const savedUserId = await AsyncStorage.getItem('userId');
        const savedLang = await AsyncStorage.getItem('lang');
        
        if (savedToken) {
          setToken(savedToken);
          setRole(savedRole || '');
          setUserId(savedUserId || '');
        }
        if (savedLang) {
          setLang(savedLang);
        }
      } catch (e) {
        console.error('Session loading failed', e);
      } finally {
        setLoadingSession(false);
      }
    })();
  }, []);

  // Poll for unread chat message counts
  useEffect(() => {
    let interval;
    if (token) {
      loadUnreadCount();
      interval = setInterval(loadUnreadCount, 15000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [token]);

  async function loadUnreadCount() {
    try {
      const data = await callApi('/messages/unread-count', 'GET', token);
      setUnreadCount(data.count || 0);
    } catch (e) {}
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  async function handleLoginSuccess(data) {
    setToken(data.token);
    setRole(data.role);
    setUserId(String(data.userId || ''));
    setProfileId(String(data.userId || ''));
    
    await AsyncStorage.setItem('token', data.token);
    await AsyncStorage.setItem('role', data.role);
    await AsyncStorage.setItem('userId', String(data.userId || ''));
    
    showToast(t('welcome'));
    setCurrentView('feed');
  }

  async function handleLogout() {
    setToken('');
    setRole('');
    setUserId('');
    setProfileId('');
    await AsyncStorage.multiRemove(['token', 'role', 'userId']);
    showToast('Logged out');
  }

  function changeLang(l) {
    setLang(l);
    AsyncStorage.setItem('lang', l);
  }

  if (loadingSession) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG }}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  // Auth Screen
  if (!token) {
    return (
      <AuthScreen 
        lang={lang} 
        changeLang={changeLang} 
        onLoginSuccess={handleLoginSuccess} 
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header Bar */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>JobReel</Text>
        <View style={styles.langRow}>
          {['en', 'hi', 'mr'].map(l => (
            <TouchableOpacity key={l} onPress={() => changeLang(l)} style={[styles.langBtn, lang === l && styles.langBtnActive]}>
              <Text style={[styles.langBtnText, lang === l && styles.langBtnTextActive]}>{l === 'en' ? 'EN' : l === 'hi' ? 'हिं' : 'मरा'}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Main View Router */}
      <View style={{ flex: 1 }}>
        {currentView === 'feed' && (
          <FeedScreen 
            lang={lang} 
            role={role} 
            token={token} 
            userId={userId} 
            onPostJobPress={() => setShowJobForm(true)}
            onViewProfile={(id) => {
              setProfileId(id);
              setCurrentView('profile');
            }}
            onMessage={(id) => {
              setChatRecipientId(id);
              setCurrentView('chat');
            }}
          />
        )}
        
        {currentView === 'posts' && (
          <PostsScreen 
            lang={lang} 
            token={token} 
            role={role}
            userId={userId} 
            onViewProfile={(id) => {
              setProfileId(id);
              setCurrentView('profile');
            }}
          />
        )}

        {currentView === 'chat' && (
          <ChatScreen 
            lang={lang} 
            token={token} 
            userId={userId} 
            chatRecipientId={chatRecipientId} 
            setChatRecipientId={setChatRecipientId} 
          />
        )}

        {currentView === 'profile' && (
          <ProfileScreen 
            lang={lang} 
            token={token} 
            userId={userId} 
            profileId={profileId} 
            onBack={() => {
              setProfileId(userId);
              setCurrentView('feed');
            }} 
            onMessage={(id) => {
              setChatRecipientId(id);
              setCurrentView('chat');
            }}
            onLogout={handleLogout}
          />
        )}
      </View>

      {/* Bottom Tab Navigation */}
      <View style={styles.bottomNav}>
        {[
          { key: 'feed', label: t('home'), icon: 'home-outline', iconActive: 'home' },
          { key: 'posts', label: t('posts'), icon: 'document-text-outline', iconActive: 'document-text' },
          { key: 'chat', label: t('chat'), icon: 'chatbubble-outline', iconActive: 'chatbubble', badge: unreadCount },
          { key: 'myProfile', label: t('profile'), icon: 'person-outline', iconActive: 'person' },
        ].map(tab => (
          <TouchableOpacity 
            key={tab.key} 
            style={styles.navBtn} 
            onPress={() => {
              if (tab.key === 'myProfile') {
                setProfileId(userId);
                setCurrentView('profile');
              } else {
                setCurrentView(tab.key);
              }
            }}
          >
            <Ionicons 
              name={currentView === tab.key || (tab.key === 'myProfile' && currentView === 'profile' && profileId === userId) ? tab.iconActive : tab.icon} 
              size={22} 
              color={currentView === tab.key || (tab.key === 'myProfile' && currentView === 'profile' && profileId === userId) ? PRIMARY : MUTED} 
              style={{ marginBottom: 2 }} 
            />
            <Text style={[styles.navLabel, (currentView === tab.key || (tab.key === 'myProfile' && currentView === 'profile' && profileId === userId)) && { color: PRIMARY }]}>{tab.label}</Text>
            {tab.badge > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{tab.badge}</Text></View>}
          </TouchableOpacity>
        ))}
      </View>

      {/* Toast Alert popup */}
      {toast ? <View style={styles.toast}><Text style={styles.toastText}>{toast}</Text></View> : null}

      {/* Create Job Modal Overlay */}
      <Modal visible={showJobForm} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          <PostJobScreen 
            lang={lang} 
            token={token} 
            onClose={() => setShowJobForm(false)} 
            onPostSuccess={() => {}} 
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: DARK },
  langRow: { flexDirection: 'row', justifyContent: 'center', borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0', alignSelf: 'center' },
  langBtn: { paddingVertical: 4, paddingHorizontal: 10, backgroundColor: '#fff', borderRightWidth: 1, borderRightColor: '#e2e8f0' },
  langBtnActive: { backgroundColor: PRIMARY },
  langBtnText: { fontSize: 11, fontWeight: '700', color: MUTED },
  langBtnTextActive: { color: '#fff' },
  bottomNav: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingVertical: 6, backgroundColor: '#fff' },
  navBtn: { flex: 1, alignItems: 'center', paddingVertical: 4, position: 'relative' },
  navLabel: { fontSize: 10, fontWeight: '600', color: MUTED, marginTop: 2 },
  badge: { position: 'absolute', top: 0, right: '25%', backgroundColor: '#ef4444', width: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  toast: { position: 'absolute', bottom: 80, left: 20, right: 20, backgroundColor: DARK, padding: 12, borderRadius: 10, alignItems: 'center', zIndex: 999 },
  toastText: { color: '#fff', fontSize: 13, fontWeight: '600' }
});
