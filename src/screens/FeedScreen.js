import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, ScrollView, StyleSheet, Modal, RefreshControl, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { callApi } from '../services/api';
import { PRIMARY, DARK, MUTED, BORDER, BG, SCREEN_HEIGHT } from '../constants/theme';
import { translations, categoryTranslations, educationLevels } from '../constants/translations';
import ReelCard from '../components/ReelCard';
import TextCard from '../components/TextCard';
import PostJobScreen from './PostJobScreen';

export default function FeedScreen({ lang, role, token, userId, onViewProfile, onMessage }) {
  const [jobs, setJobs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedEducation, setSelectedEducation] = useState('ALL');
  
  const [showEducationFilterModal, setShowEducationFilterModal] = useState(false);
  const [showCategoryFilterModal, setShowCategoryFilterModal] = useState(false);
  const [sortBy, setSortBy] = useState('latest');
  const [viewMode, setViewMode] = useState('REELS');
  
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userLat, setUserLat] = useState(null);
  const [userLng, setUserLng] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Inline post toggling state (fixes full screen modal redirection to same page)
  const [showJobForm, setShowJobForm] = useState(false);

  // Dynamic list height calculation to avoid clipping of salary details
  const [listHeight, setListHeight] = useState(SCREEN_HEIGHT - 220);

  const onListLayout = (e) => {
    const { height } = e.nativeEvent.layout;
    if (height) {
      setListHeight(height);
    }
  };

  // Comments state for jobs
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [commentsJobId, setCommentsJobId] = useState(null);
  const [jobComments, setJobComments] = useState([]);
  const [commentInputText, setCommentInputText] = useState('');

  const t = (key) => (translations[lang] && translations[lang][key]) || translations.en[key] || key;
  const tCat = (value) => (categoryTranslations[lang] && categoryTranslations[lang][value]) || categoryTranslations.en[value] || value?.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

  useEffect(() => {
    loadCategories();
    getLocation();
  }, []);

  useEffect(() => {
    loadFeed();
  }, [selectedCategory, selectedEducation, sortBy, userLat, userLng]);

  async function getLocation() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setUserLat(loc.coords.latitude);
        setUserLng(loc.coords.longitude);
      }
    } catch (e) {}
  }

  async function loadCategories() {
    try {
      const data = await callApi('/categories');
      setCategories(data || []);
    } catch (e) {}
  }

  async function loadFeed() {
    setLoading(true);
    try {
      let url = '/jobs/feed?size=30';
      if (userLat && userLng) url += `&lat=${userLat}&lng=${userLng}`;
      const data = await callApi(url);
      let items = data.items || [];
      if (selectedCategory !== 'ALL') items = items.filter(j => j.category === selectedCategory);
      if (selectedEducation !== 'ALL') items = items.filter(j => j.education === selectedEducation);
      if (sortBy === 'nearest' && userLat && userLng) items.sort((a, b) => (a.distanceKm || 9999) - (b.distanceKm || 9999));
      setJobs(items);
    } catch (e) {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }

  async function semanticSearch(query) {
    if (!query.trim()) {
      setSearchQuery('');
      loadFeed();
      return;
    }
    setLoading(true);
    try {
      setSearchQuery(query);
      const data = await callApi(`/jobs/search?q=${encodeURIComponent(query)}&limit=20`);
      setJobs(data || []);
    } catch (e) {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }

  // Comments handlers
  async function openComments(jobId) {
    setCommentsJobId(jobId);
    setShowCommentsModal(true);
    try {
      const data = await callApi(`/jobs/${jobId}/comments`);
      setJobComments(data || []);
    } catch (e) {
      setJobComments([]);
    }
  }

  async function addJobComment() {
    if (!token) {
      Alert.alert('Error', t('loginFirst'));
      return;
    }
    if (!commentInputText.trim() || !commentsJobId) return;
    try {
      await callApi(`/jobs/${commentsJobId}/comments`, 'POST', token, { text: commentInputText });
      setCommentInputText('');
      const data = await callApi(`/jobs/${commentsJobId}/comments`);
      setJobComments(data || []);
    } catch (e) {
      Alert.alert('Error', 'Failed to add comment');
    }
  }

  // Social interactions
  async function likeJob(jobId) {
    if (!token) {
      Alert.alert('Error', t('loginFirst'));
      return null;
    }
    try {
      return await callApi(`/jobs/${jobId}/like`, 'POST', token);
    } catch (e) {
      return null;
    }
  }

  async function dislikeJob(jobId) {
    if (!token) {
      Alert.alert('Error', t('loginFirst'));
      return null;
    }
    try {
      return await callApi(`/jobs/${jobId}/dislike`, 'POST', token);
    } catch (e) {
      return null;
    }
  }

  async function applyJob(jobId) {
    if (!token) {
      Alert.alert('Error', t('loginFirst'));
      return;
    }
    try {
      await callApi('/applications', 'POST', token, { jobId });
      Alert.alert('Success', t('appliedSuccess'));
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  }

  async function shareJob(job) {
    try {
      const getTitle = () => (lang === 'hi' && job.titleHi) ? job.titleHi : (lang === 'mr' && job.titleMr) ? job.titleMr : job.title;
      const getDesc = () => (lang === 'hi' && job.descriptionHi) ? job.descriptionHi : (lang === 'mr' && job.descriptionMr) ? job.descriptionMr : job.description;
      const API_BASE = process.env.EXPO_PUBLIC_API_BASE || 'http://localhost:8080';
      const shareUrl = `${API_BASE}/jobs/${job.id}`;
      
      const Share = require('react-native').Share;
      await Share.share({
        title: getTitle(),
        message: `${getTitle()}\n\n${getDesc()}\n\nCheck out this job: ${shareUrl}`,
      });
    } catch (e) {
      Alert.alert('Error', 'Could not share job');
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {/* Search Bar */}
      <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 5 }}>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <View style={[s.searchRow, { flex: 1 }]}>
            <Ionicons name="search" size={18} color={MUTED} />
            <TextInput
              style={s.searchInput}
              placeholder={t('searchJobs')}
              value={searchQuery}
              placeholderTextColor={MUTED}
              onChangeText={(text) => {
                setSearchQuery(text);
                semanticSearch(text);
              }}
            />
          </View>
        </View>
      </View>

      {/* Filter Options */}
      <View style={s.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
          <TouchableOpacity style={[s.filterChip, viewMode === 'REELS' && s.filterChipActive]} onPress={() => setViewMode('REELS')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Feather name="video" size={14} color={viewMode === 'REELS' ? '#fff' : MUTED} />
              <Text style={[s.filterChipText, viewMode === 'REELS' && { color: '#fff' }]}>{t('video')}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={[s.filterChip, viewMode === 'TEXT' && s.filterChipActive]} onPress={() => setViewMode('TEXT')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Feather name="file-text" size={14} color={viewMode === 'TEXT' ? '#fff' : MUTED} />
              <Text style={[s.filterChipText, viewMode === 'TEXT' && { color: '#fff' }]}>{t('text')}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={[s.filterChip, sortBy === 'nearest' && s.filterChipActive]} onPress={() => setSortBy(sortBy === 'nearest' ? 'latest' : 'nearest')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Feather name="map-pin" size={14} color={sortBy === 'nearest' ? '#fff' : MUTED} />
              <Text style={[s.filterChipText, sortBy === 'nearest' && { color: '#fff' }]}>{sortBy === 'nearest' ? t('nearest') : t('latest')}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={[s.filterChip, selectedCategory !== 'ALL' && s.filterChipActive]} onPress={() => setShowCategoryFilterModal(true)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Feather name="grid" size={14} color={selectedCategory !== 'ALL' ? '#fff' : MUTED} />
              <Text style={[s.filterChipText, selectedCategory !== 'ALL' && { color: '#fff' }]}>
                {selectedCategory === 'ALL' ? t('category') : tCat(selectedCategory)}
              </Text>
              <Feather name="chevron-down" size={12} color={selectedCategory !== 'ALL' ? '#fff' : MUTED} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={[s.filterChip, selectedEducation !== 'ALL' && s.filterChipActive]} onPress={() => setShowEducationFilterModal(true)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Feather name="book-open" size={14} color={selectedEducation !== 'ALL' ? '#fff' : MUTED} />
              <Text style={[s.filterChipText, selectedEducation !== 'ALL' && { color: '#fff' }]}>
                {selectedEducation === 'ALL' ? t('education') : (educationLevels.find(e => e.value === selectedEducation)?.label[lang] || educationLevels.find(e => e.value === selectedEducation)?.label.en)}
              </Text>
              <Feather name="chevron-down" size={12} color={selectedEducation !== 'ALL' ? '#fff' : MUTED} />
            </View>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Main Feed Content */}
      {loading && jobs.length === 0 ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={PRIMARY} />
      ) : viewMode === 'REELS' ? (
        <View style={{ flex: 1 }} onLayout={onListLayout}>
          <FlatList
            data={jobs}
            keyExtractor={item => String(item.id)}
            renderItem={({ item }) => (
              <ReelCard 
                job={item} 
                lang={lang} 
                t={t} 
                tCat={tCat} 
                userId={userId} 
                token={token} 
                onLike={likeJob} 
                onDislike={dislikeJob} 
                onComment={openComments} 
                onMessage={onMessage} 
                onApply={applyJob} 
                onShare={shareJob} 
                onViewProfile={onViewProfile}
                cardHeight={listHeight}
              />
            )}
            pagingEnabled
            snapToInterval={listHeight}
            decelerationRate="fast"
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadFeed(); setRefreshing(false); }} />}
            ListEmptyComponent={<View style={s.empty}><Text style={s.emptyText}>{t('noJobs')}</Text></View>}
          />
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <TextCard 
              job={item} 
              lang={lang} 
              t={t} 
              tCat={tCat} 
              onShare={shareJob} 
              onApply={applyJob}
            />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadFeed(); setRefreshing(false); }} />}
          ListEmptyComponent={<View style={s.empty}><Text style={s.emptyText}>{t('noJobs')}</Text></View>}
        />
      )}

      {/* Comments Modal */}
      <Modal visible={showCommentsModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.bottomSheetCard}>
            <View style={s.bottomSheetHeader}>
              <Text style={s.bottomSheetTitle}>{t('comments')}</Text>
              <TouchableOpacity onPress={() => setShowCommentsModal(false)} style={s.closeCircleBtn}>
                <Ionicons name="close" size={20} color={DARK} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={jobComments}
              keyExtractor={item => String(item.id)}
              contentContainerStyle={{ gap: 12, paddingBottom: 16 }}
              renderItem={({ item }) => (
                <View style={s.commentBubble}>
                  <Text style={s.commentUser}>{item.userName}</Text>
                  <Text style={s.commentText}>{item.text}</Text>
                </View>
              )}
              ListEmptyComponent={<Text style={s.emptyComments}>No comments yet</Text>}
            />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <View style={s.commentInputRow}>
                <TextInput
                  style={s.commentInput}
                  placeholder="Add a comment..."
                  value={commentInputText}
                  onChangeText={setCommentInputText}
                  placeholderTextColor={MUTED}
                />
                <TouchableOpacity style={s.commentSendBtn} onPress={addJobComment}>
                  <Ionicons name="paper-plane" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        </View>
      </Modal>

      {/* Category Filter Modal */}
      <Modal visible={showCategoryFilterModal} transparent animationType="slide" onRequestClose={() => setShowCategoryFilterModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.bottomSheetCard}>
            <View style={s.bottomSheetHeader}>
              <Text style={s.bottomSheetTitle}>{t('category')}</Text>
              <TouchableOpacity onPress={() => setShowCategoryFilterModal(false)} style={s.closeCircleBtn}>
                <Ionicons name="close" size={20} color={DARK} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              <TouchableOpacity 
                style={[s.bottomSheetItem, selectedCategory === 'ALL' && s.bottomSheetItemActive]}
                onPress={() => {
                  setSelectedCategory('ALL');
                  setShowCategoryFilterModal(false);
                }}
              >
                <Text style={[s.bottomSheetItemText, selectedCategory === 'ALL' && s.bottomSheetItemTextActive]}>
                  {t('all')}
                </Text>
                {selectedCategory === 'ALL' && <Ionicons name="checkmark-circle" size={20} color={PRIMARY} />}
              </TouchableOpacity>
              {categories.map(cat => {
                const isSelected = selectedCategory === cat.value;
                return (
                  <TouchableOpacity 
                    key={cat.value} 
                    style={[s.bottomSheetItem, isSelected && s.bottomSheetItemActive]}
                    onPress={() => {
                      setSelectedCategory(cat.value);
                      setShowCategoryFilterModal(false);
                    }}
                  >
                    <Text style={[s.bottomSheetItemText, isSelected && s.bottomSheetItemTextActive]}>
                      {tCat(cat.value)}
                    </Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color={PRIMARY} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Education Filter Modal */}
      <Modal visible={showEducationFilterModal} transparent animationType="slide" onRequestClose={() => setShowEducationFilterModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.bottomSheetCard}>
            <View style={s.bottomSheetHeader}>
              <Text style={s.bottomSheetTitle}>{t('education')}</Text>
              <TouchableOpacity onPress={() => setShowEducationFilterModal(false)} style={s.closeCircleBtn}>
                <Ionicons name="close" size={20} color={DARK} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              {educationLevels.map(item => {
                const val = item.value || 'ALL';
                const isSelected = selectedEducation === val;
                return (
                  <TouchableOpacity 
                    key={val} 
                    style={[s.bottomSheetItem, isSelected && s.bottomSheetItemActive]}
                    onPress={() => {
                      setSelectedEducation(val);
                      setShowEducationFilterModal(false);
                    }}
                  >
                    <Text style={[s.bottomSheetItemText, isSelected && s.bottomSheetItemTextActive]}>
                      {item.label[lang] || item.label.en}
                    </Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color={PRIMARY} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: '#e2e8f0' },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15, color: DARK },
  filterBar: { paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: BORDER, marginRight: 6, backgroundColor: '#fff' },
  filterChipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  filterChipText: { fontSize: 12, fontWeight: '600', color: MUTED },
  postJobBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: PRIMARY, height: 44, paddingHorizontal: 14, borderRadius: 12, shadowColor: PRIMARY, shadowOpacity: 0.15, shadowRadius: 6, elevation: 3 },
  postJobBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, marginTop: 40 },
  emptyText: { color: MUTED, fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'flex-end' },
  bottomSheetCard: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 16, maxHeight: '80%', shadowColor: '#0f172a', shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
  bottomSheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', marginBottom: 12 },
  bottomSheetTitle: { fontSize: 18, fontWeight: '800', color: DARK },
  closeCircleBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  bottomSheetItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12, marginBottom: 6 },
  bottomSheetItemActive: { backgroundColor: '#f0f7ff' },
  bottomSheetItemText: { fontSize: 14, color: '#334155', fontWeight: '500' },
  bottomSheetItemTextActive: { color: PRIMARY, fontWeight: '700' },
  commentBubble: { backgroundColor: '#f8fafc', borderRadius: 8, padding: 10 },
  commentUser: { fontSize: 12, fontWeight: '700', color: DARK, marginBottom: 2 },
  commentText: { fontSize: 12, color: '#475569' },
  emptyComments: { textAlign: 'center', color: MUTED, marginTop: 20, marginBottom: 20 },
  commentInputRow: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10, paddingBottom: 20 },
  commentInput: { borderWidth: 1, borderColor: BORDER, borderRadius: 10, padding: 10, fontSize: 14, backgroundColor: BG, color: DARK, flex: 1 },
  commentSendBtn: { backgroundColor: PRIMARY, paddingHorizontal: 16, borderRadius: 10, justifyContent: 'center', alignItems: 'center' }
});
