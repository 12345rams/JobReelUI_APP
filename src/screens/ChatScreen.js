import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Image, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Video } from 'expo-av';
import { callApi } from '../services/api';
import { PRIMARY, DARK, MUTED, BORDER, BG } from '../constants/theme';
import { translations } from '../constants/translations';

const getAvatarBg = (name) => {
  const colors = ['#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#22c55e', '#eab308', '#f97316'];
  if (!name) return colors[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

export default function ChatScreen({ lang, token, userId, chatRecipientId, setChatRecipientId }) {
  const [conversations, setConversations] = useState([]);
  const [activeConvo, setActiveConvo] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  
  // Search state for starting new chats (aligned with web feature)
  const [showNewChatSearch, setShowNewChatSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const [uploading, setUploading] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const flatListRef = useRef(null);

  const t = (key) => (translations[lang] && translations[lang][key]) || translations.en[key] || key;

  const formatTime = (ts) => {
    if (!ts) return '';
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  const formatLastMessageTime = (ts) => {
    if (!ts) return '';
    try {
      const date = new Date(ts);
      const now = new Date();
      if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
      }
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch (e) {
      return '';
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  // Poll for messages in active conversation
  useEffect(() => {
    let interval;
    if (activeConvo) {
      loadMessages(activeConvo.id);
      interval = setInterval(() => loadMessages(activeConvo.id), 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeConvo]);

  // Load chatRecipientId when passed from other screens (like ReelCard Profile)
  useEffect(() => {
    if (chatRecipientId && !activeConvo) {
      callApi(`/users/${chatRecipientId}/profile`, 'GET', token)
        .then(data => {
          if (data && data.name) {
            setSelectedUser({ id: data.id, name: data.name, role: data.role });
            setShowNewChatSearch(true);
          }
        })
        .catch(() => {});
    }
  }, [chatRecipientId]);

  // Search user by name hook (matching Web ChatPage debounced search)
  useEffect(() => {
    if (searchQuery.trim().length < 1) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await callApi(`/users/search?q=${encodeURIComponent(searchQuery)}`, 'GET', token);
        setSearchResults((results || []).filter(u => String(u.id) !== String(userId)));
      } catch (e) {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  async function loadConversations() {
    try {
      const data = await callApi('/messages/conversations', 'GET', token);
      setConversations(data || []);
    } catch (e) {}
  }

  async function loadMessages(convoId) {
    try {
      const data = await callApi(`/messages/conversations/${convoId}`, 'GET', token);
      setChatMessages(data || []);
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (e) {}
  }

  async function sendMessage() {
    if (!chatInput.trim()) return;
    let receiverId = null;
    if (activeConvo) {
      receiverId = activeConvo.participantIds.find(id => String(id) !== String(userId));
    } else if (chatRecipientId) {
      receiverId = Number(chatRecipientId);
    }
    if (!receiverId) return;

    try {
      await callApi('/messages/send', 'POST', token, { receiverId, content: chatInput });
      setChatInput('');
      if (activeConvo) {
        loadMessages(activeConvo.id);
      } else {
        setChatRecipientId('');
        setSelectedUser(null);
        setShowNewChatSearch(false);
        const convs = await callApi('/messages/conversations', 'GET', token);
        setConversations(convs || []);
        if (convs && convs.length > 0) {
          const newConv = convs.find(c => c.participantIds.includes(receiverId));
          if (newConv) {
            setActiveConvo(newConv);
          }
        }
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to send message');
    }
  }

  // File upload and message attachment handler (aligned with Web handleFileUpload)
  async function uploadChatMessageFile(uri, type, fileName) {
    setUploading(true);
    setShowAttachMenu(false);
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
        name: fileName || 'file.jpg',
        type: type || 'image/jpeg'
      });
      const uploadRes = await callApi('/messages/upload', 'POST', token, formData, true);
      
      let receiverId = null;
      if (activeConvo) {
        receiverId = activeConvo.participantIds.find(id => String(id) !== String(userId));
      } else if (chatRecipientId) {
        receiverId = Number(chatRecipientId);
      }
      
      if (receiverId && uploadRes) {
        await callApi('/messages/send', 'POST', token, {
          receiverId,
          content: uploadRes.fileName || 'file',
          messageType: uploadRes.messageType,
          fileUrl: uploadRes.fileUrl,
          fileName: uploadRes.fileName,
          fileSize: Number(uploadRes.fileSize || 0)
        });
        
        if (activeConvo) {
          loadMessages(activeConvo.id);
        } else {
          setChatRecipientId('');
          setSelectedUser(null);
          setShowNewChatSearch(false);
          const convs = await callApi('/messages/conversations', 'GET', token);
          setConversations(convs || []);
          if (convs && convs.length > 0) {
            const newConv = convs.find(c => c.participantIds.includes(receiverId));
            if (newConv) setActiveConvo(newConv);
          }
        }
      }
    } catch (e) {
      Alert.alert('Error', 'File upload failed');
    } finally {
      setUploading(false);
    }
  }

  const pickChatMedia = async (mediaType) => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: mediaType === 'video' ? ImagePicker.MediaTypeOptions.Videos : ImagePicker.MediaTypeOptions.Images,
        quality: 0.8
      });
      if (!res.canceled && res.assets && res.assets[0]) {
        const asset = res.assets[0];
        const uri = asset.uri;
        const type = asset.mimeType || (mediaType === 'video' ? 'video/mp4' : 'image/jpeg');
        const name = uri.substring(uri.lastIndexOf('/') + 1) || 'file.jpg';
        await uploadChatMessageFile(uri, type, name);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not pick media');
    }
  };

  function selectUserToChat(user) {
    setSelectedUser(user);
    setChatRecipientId(String(user.id));
    setSearchQuery('');
    setSearchResults([]);
  }

  function clearSelectedUser() {
    setSelectedUser(null);
    setChatRecipientId('');
  }

  function renderMessageContent(msg) {
    const type = msg.messageType || 'text';
    const text = msg.content || msg.text || '';
    const isSent = String(msg.senderId) === userId;
    const color = '#1e293b';

    if (type === 'image') {
      return (
        <View style={{ gap: 4 }}>
          <Image source={{ uri: msg.fileUrl }} style={s.msgImage} />
          {text && text !== msg.fileName ? <Text style={[s.msgText, { color }]}>{text}</Text> : null}
        </View>
      );
    }
    if (type === 'video') {
      return (
        <View style={{ gap: 4 }}>
          <Video
            source={{ uri: msg.fileUrl }}
            style={s.msgImage}
            useNativeControls
            resizeMode="cover"
            isLooping={false}
          />
          {text && text !== msg.fileName ? <Text style={[s.msgText, { color }]}>{text}</Text> : null}
        </View>
      );
    }
    if (type === 'audio') {
      return (
        <View style={{ width: 200, paddingVertical: 4 }}>
          <Video
            source={{ uri: msg.fileUrl }}
            style={{ width: 200, height: 40 }}
            useNativeControls
            resizeMode="contain"
          />
        </View>
      );
    }
    if (type === 'file') {
      return (
        <View style={s.fileBubble}>
          <Feather name="file" size={16} color={DARK} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: DARK }} numberOfLines={1}>{msg.fileName || 'File'}</Text>
            {msg.fileSize ? <Text style={{ fontSize: 10, color: MUTED }}>{(msg.fileSize / 1024).toFixed(1)} KB</Text> : null}
          </View>
        </View>
      );
    }
    return <Text style={[s.msgText, { color }]}>{text}</Text>;
  }

  // Conversation Thread screen
  if (activeConvo || chatRecipientId) {
    const headerTitle = activeConvo ? (activeConvo.otherUserName || 'Chat') : (selectedUser ? selectedUser.name : 'New Chat');
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={80}>
        <View style={{ flex: 1, backgroundColor: '#efeae2' }}>
          <View style={[s.chatHeader, { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 }]}>
            <TouchableOpacity onPress={() => { setActiveConvo(null); setChatRecipientId(''); clearSelectedUser(); loadConversations(); }}>
              <Ionicons name="arrow-back" size={24} color={DARK} />
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[s.convoAvatar, { width: 36, height: 36, borderRadius: 18, backgroundColor: getAvatarBg(headerTitle) }]}>
                <Text style={[s.avatarInit, { fontSize: 14, color: '#fff', fontWeight: 'bold' }]}>{headerTitle[0]?.toUpperCase()}</Text>
              </View>
              <Text style={[s.chatHeaderTitle, { fontSize: 16, fontWeight: '700', color: DARK }]}>{headerTitle}</Text>
            </View>
          </View>
          
          <FlatList
            ref={flatListRef}
            data={chatMessages}
            keyExtractor={(item, i) => String(item.id || i)}
            renderItem={({ item }) => {
              const isSent = String(item.senderId) === userId;
              return (
                <View style={[s.msgBubble, isSent ? s.msgSent : s.msgReceived]}>
                  {renderMessageContent(item)}
                  <Text style={[
                    s.msgTime,
                    { color: 'rgba(30, 41, 59, 0.5)' }
                  ]}>
                    {formatTime(item.timestamp)}
                  </Text>
                </View>
              );
            }}
            contentContainerStyle={{ padding: 12, gap: 8, paddingBottom: 30 }}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />

          {/* Chat attachment picker drawer */}
          {showAttachMenu && (
            <View style={s.attachMenu}>
              <TouchableOpacity style={s.attachMenuItem} onPress={() => pickChatMedia('image')}>
                <Ionicons name="image" size={18} color={PRIMARY} />
                <Text style={s.attachMenuText}>Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.attachMenuItem} onPress={() => pickChatMedia('video')}>
                <Ionicons name="videocam" size={18} color={PRIMARY} />
                <Text style={s.attachMenuText}>Video</Text>
              </TouchableOpacity>
            </View>
          )}

          {uploading && (
            <View style={s.uploadingStatus}>
              <ActivityIndicator size="small" color={PRIMARY} />
              <Text style={s.uploadingStatusText}>Uploading media...</Text>
            </View>
          )}

          <View style={s.chatInputBar}>
            <TouchableOpacity style={s.attachBtn} onPress={() => setShowAttachMenu(!showAttachMenu)}>
              <Ionicons name={showAttachMenu ? "close" : "add"} size={24} color={MUTED} />
            </TouchableOpacity>
            <TextInput 
              style={s.chatInput} 
              placeholder={t('typeMessage')} 
              value={chatInput} 
              onChangeText={setChatInput} 
              placeholderTextColor={MUTED}
            />
            <TouchableOpacity style={s.sendBtn} onPress={sendMessage} disabled={uploading}>
              {uploading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.sendBtnText}>{t('send')}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // Conversations List screen / User Search screen
  const filteredConversations = conversations.filter(conv => {
    const otherName = conv.participantNames?.find((n, idx) => String(conv.participantIds[idx]) !== String(userId)) || 'User';
    return otherName.toLowerCase().includes(localSearchQuery.toLowerCase());
  });

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <View style={s.sidebarHeader}>
        <Text style={s.sidebarTitle}>{t('messages')}</Text>
        <TouchableOpacity 
          style={s.newChatBtn} 
          onPress={() => {
            setShowNewChatSearch(!showNewChatSearch);
            clearSelectedUser();
          }}
        >
          <Text style={s.newChatBtnText}>{showNewChatSearch ? 'Cancel' : t('newChat')}</Text>
        </TouchableOpacity>
      </View>

      {showNewChatSearch ? (
        /* User search mode (aligned with web start conversation feature) */
        <View style={{ flex: 1, padding: 16 }}>
          <View style={s.searchRow}>
            <Ionicons name="search" size={18} color={MUTED} />
            <TextInput
              style={s.searchInput}
              placeholder="Search user by name..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={MUTED}
              autoFocus
            />
          </View>
          
          {searching && <ActivityIndicator style={{ marginTop: 20 }} color={PRIMARY} />}
          
          <FlatList
            data={searchResults}
            keyExtractor={item => String(item.id)}
            contentContainerStyle={{ marginTop: 12, gap: 8 }}
            renderItem={({ item }) => (
              <TouchableOpacity style={s.convoItem} onPress={() => selectUserToChat(item)}>
                <View style={[s.convoAvatar, { backgroundColor: getAvatarBg(item.name) }]}>
                  <Text style={[s.avatarInit, { color: '#fff', fontWeight: 'bold' }]}>{item.name[0]?.toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.convoName}>{item.name}</Text>
                  <Text style={s.convoLastMsg}>{item.role}</Text>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              !searching && searchQuery ? (
                <Text style={s.emptyText}>No users found</Text>
              ) : null
            }
          />
        </View>
      ) : (
        /* Regular Conversations lists */
        <View style={{ flex: 1 }}>
          <View style={s.localSearchContainer}>
            <Ionicons name="search" size={16} color={MUTED} style={s.localSearchIcon} />
            <TextInput
              style={s.localSearchInput}
              placeholder="Search chats..."
              value={localSearchQuery}
              onChangeText={setLocalSearchQuery}
              placeholderTextColor={MUTED}
            />
            {localSearchQuery ? (
              <TouchableOpacity onPress={() => setLocalSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color={MUTED} />
              </TouchableOpacity>
            ) : null}
          </View>

          <FlatList
            data={filteredConversations}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
            renderItem={({ item }) => {
              const otherName = item.participantNames?.find((n, idx) => String(item.participantIds[idx]) !== String(userId)) || 'User';
              return (
                <TouchableOpacity style={s.convoItem} onPress={() => { setActiveConvo(item); loadMessages(item.id); }}>
                  <View style={[s.convoAvatar, { backgroundColor: getAvatarBg(otherName) }]}>
                    <Text style={[s.avatarInit, { color: '#fff', fontWeight: 'bold' }]}>{otherName[0]?.toUpperCase()}</Text>
                  </View>
                  <View style={s.convoTextContainer}>
                    <View style={s.convoRow}>
                      <Text style={s.convoName}>{otherName}</Text>
                      <Text style={s.convoTime}>{formatLastMessageTime(item.lastMessageAt)}</Text>
                    </View>
                    <Text style={s.convoLastMsg} numberOfLines={1}>{item.lastMessage || 'No messages'}</Text>
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={<Text style={s.emptyText}>No conversations found</Text>}
          />
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  chatHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor: '#fff' },
  chatHeaderTitle: { fontSize: 16, fontWeight: '700', color: DARK },
  msgBubble: { 
    maxWidth: '75%', 
    padding: 10, 
    paddingHorizontal: 14,
    borderRadius: 16, 
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  msgSent: { 
    backgroundColor: '#d9fdd3', 
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  msgReceived: { 
    backgroundColor: '#fff', 
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  msgText: { fontSize: 13, color: '#1e293b' },
  msgTime: { 
    fontSize: 9, 
    alignSelf: 'flex-end', 
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  msgImage: { width: 220, height: 160, borderRadius: 12, resizeMode: 'cover' },
  fileBubble: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, backgroundColor: '#f1f5f9', borderRadius: 8, width: 200 },
  chatInputBar: { flexDirection: 'row', gap: 8, padding: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9', backgroundColor: '#fff', alignItems: 'center' },
  chatInput: { borderWidth: 1, borderColor: BORDER, borderRadius: 10, padding: 10, fontSize: 14, backgroundColor: BG, color: DARK, flex: 1 },
  attachBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' },
  sendBtn: { backgroundColor: PRIMARY, paddingHorizontal: 16, borderRadius: 10, height: 40, justifyContent: 'center', alignItems: 'center' },
  sendBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  sidebarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  sidebarTitle: { fontSize: 24, fontWeight: '700', color: DARK },
  newChatBtn: { backgroundColor: '#f8fafc', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  newChatBtnText: { color: DARK, fontWeight: '600', fontSize: 13 },
  convoItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  convoAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' },
  avatarInit: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  convoTextContainer: { flex: 1, justifyContent: 'center' },
  convoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  convoName: { fontSize: 15, fontWeight: '700', color: DARK },
  convoTime: { fontSize: 11, color: MUTED, fontWeight: '500' },
  convoLastMsg: { fontSize: 13, color: MUTED, marginTop: 2, flex: 1 },
  localSearchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e2e8f0', borderRadius: 10, marginHorizontal: 16, marginBottom: 12, paddingHorizontal: 10, height: 38 },
  localSearchIcon: { marginRight: 6 },
  localSearchInput: { flex: 1, fontSize: 14, color: DARK, padding: 0 },
  emptyText: { textAlign: 'center', color: MUTED, marginTop: 40, fontSize: 14 },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: '#e2e8f0' },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15, color: DARK },
  attachMenu: { flexDirection: 'row', gap: 12, padding: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9', backgroundColor: '#fff', justifyContent: 'space-around' },
  attachMenuItem: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: BG, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
  attachMenuText: { fontSize: 13, color: DARK, fontWeight: '600' },
  uploadingStatus: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    padding: 10, 
    backgroundColor: '#eff6ff', 
    borderTopWidth: 1, 
    borderTopColor: '#dbeafe', 
    justifyContent: 'center' 
  },
  uploadingStatusText: { 
    fontSize: 12, 
    color: PRIMARY, 
    fontWeight: '600' 
  }
});
