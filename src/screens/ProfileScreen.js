import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { callApi } from '../services/api';
import { PRIMARY, DARK, MUTED, BORDER, BG } from '../constants/theme';
import { translations } from '../constants/translations';
import StarDisplay from '../components/StarDisplay';
import StarInput from '../components/StarInput';
import TextCard from '../components/TextCard';
import EditProfileModal from './EditProfileModal';

export default function ProfileScreen({ lang, token, userId, profileId, onBack, onMessage, onLogout }) {
  const [profileData, setProfileData] = useState(null);
  const [profileTab, setProfileTab] = useState('about');
  const [editProfile, setEditProfile] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 0, comment: '' });
  const [loading, setLoading] = useState(true);

  const t = (key) => (translations[lang] && translations[lang][key]) || translations.en[key] || key;

  useEffect(() => {
    loadProfile();
  }, [profileId]);

  async function loadProfile() {
    setLoading(true);
    try {
      const data = await callApi(`/users/${profileId}/profile`);
      setProfileData(data);
    } catch (e) {
      Alert.alert('Error', 'Profile not found');
    } finally {
      setLoading(false);
    }
  }

  async function submitReview() {
    if (!token) {
      Alert.alert('Error', t('loginFirst'));
      return;
    }
    if (reviewForm.rating === 0) {
      Alert.alert('Error', t('selectRating'));
      return;
    }
    try {
      await callApi(`/users/${profileId}/reviews`, 'POST', token, reviewForm);
      Alert.alert('Success', t('reviewSubmitted'));
      setReviewForm({ rating: 0, comment: '' });
      loadProfile();
    } catch (e) {
      Alert.alert('Error', e.message || 'Review failed');
    }
  }

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 40 }} color={PRIMARY} />;
  }

  if (!profileData) return null;

  const isOwn = String(profileId) === userId;

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {/* Header Back button (if viewing someone else) */}
      {!isOwn && (
        <View style={s.topBar}>
          <TouchableOpacity style={s.backBtn} onPress={onBack}>
            <Ionicons name="arrow-back" size={20} color={DARK} />
            <Text style={s.backBtnText}>Back</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Cover Banner */}
        <View style={{ height: 100, backgroundColor: PRIMARY }} />

        {/* Profile Card details */}
        <View style={s.profileHeaderCard}>
          <View style={s.avatarWrapper}>
            <View style={s.avatarPlaceholder}>
              <Text style={s.avatarInit}>{(profileData.name || '?')[0].toUpperCase()}</Text>
            </View>
          </View>
          
          <Text style={s.profileName}>{profileData.name}</Text>
          <Text style={s.profileRole}>{profileData.role}</Text>
          
          {profileData.headline ? <Text style={s.profileHeadline}>{profileData.headline}</Text> : null}

          {profileData.location ? (
            <View style={s.locationRow}>
              <Feather name="map-pin" size={12} color={MUTED} />
              <Text style={s.locationText}>{profileData.location}</Text>
            </View>
          ) : null}

          {/* Average rating and review count */}
          <View style={s.ratingRow}>
            <StarDisplay rating={profileData.averageRating || 0} size={14} />
            <Text style={s.ratingText}>
              {profileData.averageRating?.toFixed(1) || '0.0'} ({profileData.totalReviews || 0} reviews)
            </Text>
          </View>

          {profileData.bio ? <Text style={s.profileBio}>{profileData.bio}</Text> : null}

          {profileData.skills && profileData.skills.length > 0 ? (
            <View style={s.skillsWrapper}>
              {profileData.skills.map((skill, idx) => (
                <View key={idx} style={s.skillChip}>
                  <Text style={s.skillChipText}>{skill}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Action buttons */}
          <View style={s.actionRow}>
            {isOwn ? (
              <>
                <TouchableOpacity style={s.primaryActionBtn} onPress={() => setEditProfile(true)}>
                  <Text style={s.primaryActionBtnText}>Edit Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.dangerActionBtn} onPress={onLogout}>
                  <Text style={s.dangerActionBtnText}>{t('logout')}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity style={s.primaryActionBtn} onPress={() => onMessage(profileData.id)}>
                  <Text style={s.primaryActionBtnText}>Message</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.outlineActionBtn} onPress={() => setProfileTab('reviews')}>
                  <Text style={s.outlineActionBtnText}>Write Review</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Profile Tabs */}
        <View style={s.tabBar}>
          {['about', 'jobs', 'reviews'].map(tab => {
            const isActive = profileTab === tab;
            const labels = { 
              about: 'About', 
              jobs: `Jobs (${(profileData.jobs || []).length})`, 
              reviews: `Reviews (${(profileData.reviews || []).length})` 
            };
            return (
              <TouchableOpacity 
                key={tab} 
                style={[s.tabItem, isActive ? s.tabItemActive : null]}
                onPress={() => setProfileTab(tab)}
              >
                <Text style={[s.tabText, isActive ? s.tabTextActive : null]}>
                  {labels[tab]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tab contents */}
        <View style={{ padding: 16 }}>
          {profileTab === 'about' && (
            <View style={{ gap: 16 }}>
              {/* Education section */}
              <View style={s.sectionCard}>
                <Text style={s.sectionTitle}>Education</Text>
                {profileData.education && profileData.education.length > 0 ? (
                  <View style={{ gap: 12 }}>
                    {profileData.education.map((edu, idx) => (
                      <View key={idx} style={s.entryContainer}>
                        <Text style={s.entrySchool}>{edu.school}</Text>
                        <Text style={s.entryDetail}>{edu.degree} · {edu.field}</Text>
                        <Text style={s.entryYear}>{edu.year}</Text>
                        {idx < profileData.education.length - 1 && <View style={s.separator} />}
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={s.emptyText}>No education listed</Text>
                )}
              </View>

              {/* Experience section */}
              <View style={s.sectionCard}>
                <Text style={s.sectionTitle}>Experience</Text>
                {profileData.experience && profileData.experience.length > 0 ? (
                  <View style={{ gap: 12 }}>
                    {profileData.experience.map((exp, idx) => (
                      <View key={idx} style={s.entryContainer}>
                        <Text style={s.entrySchool}>{exp.company}</Text>
                        <Text style={s.entryDetail}>{exp.title}</Text>
                        <Text style={s.entryYear}>{exp.startDate} - {exp.endDate}</Text>
                        {exp.description ? <Text style={s.entryDesc}>{exp.description}</Text> : null}
                        {idx < profileData.experience.length - 1 && <View style={s.separator} />}
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={s.emptyText}>No experience listed</Text>
                )}
              </View>
            </View>
          )}

          {profileTab === 'jobs' && (
            <View style={{ gap: 12 }}>
              {profileData.jobs && profileData.jobs.length > 0 ? (
                profileData.jobs.map(job => (
                  <TextCard 
                    key={job.id} 
                    job={job} 
                    lang={lang} 
                    t={t} 
                    tCat={val => val} 
                    onApply={() => {}} 
                    onShare={() => {}}
                  />
                ))
              ) : (
                <Text style={s.emptyTabMessage}>No jobs posted by this user</Text>
              )}
            </View>
          )}

          {profileTab === 'reviews' && (
            <View style={{ gap: 12 }}>
              {/* Write Review container (if not own profile) */}
              {!isOwn && token && (
                <View style={s.sectionCard}>
                  <Text style={s.sectionTitle}>Write a Review</Text>
                  <StarInput 
                    rating={reviewForm.rating} 
                    onRatingChange={rating => setReviewForm({ ...reviewForm, rating })} 
                  />
                  <TextInput
                    style={[s.input, { height: 60, textAlignVertical: 'top', padding: 8 }]}
                    placeholder="Share your experience..."
                    placeholderTextColor={MUTED}
                    multiline
                    value={reviewForm.comment}
                    onChangeText={comment => setReviewForm({ ...reviewForm, comment })}
                  />
                  <TouchableOpacity style={s.submitReviewBtn} onPress={submitReview}>
                    <Text style={s.submitReviewBtnText}>Submit Review</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Reviews List */}
              {profileData.reviews && profileData.reviews.length > 0 ? (
                profileData.reviews.map(review => (
                  <View key={review.id} style={s.sectionCard}>
                    <View style={s.reviewHeader}>
                      <Text style={s.reviewerName}>{review.reviewerName || 'Anonymous'}</Text>
                      <StarDisplay rating={review.rating} size={12} />
                    </View>
                    <Text style={s.reviewComment}>{review.comment}</Text>
                    <Text style={s.reviewDate}>{new Date(review.createdAt).toLocaleDateString()}</Text>
                  </View>
                ))
              ) : (
                <Text style={s.emptyTabMessage}>No reviews yet</Text>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={editProfile} transparent animationType="slide">
        <EditProfileModal 
          token={token} 
          profileData={profileData} 
          onClose={() => setEditProfile(false)} 
          onSaveSuccess={loadProfile} 
        />
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  topBar: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor: '#fff' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backBtnText: { fontSize: 14, color: DARK, fontWeight: '600' },
  profileHeaderCard: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', marginTop: -40, alignItems: 'center' },
  avatarWrapper: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#f1f5f9', borderWidth: 4, borderColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 },
  avatarPlaceholder: { width: '100%', height: '100%', borderRadius: 40, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  avatarInit: { fontSize: 28, fontWeight: 'bold', color: MUTED },
  profileName: { fontSize: 20, fontWeight: '800', color: DARK, marginTop: 8 },
  profileRole: { fontSize: 13, fontWeight: '600', color: PRIMARY, marginTop: 2 },
  profileHeadline: { fontSize: 13, color: '#475569', textAlign: 'center', marginTop: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  locationText: { fontSize: 12, color: MUTED },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  ratingText: { fontSize: 12, color: DARK, fontWeight: '600' },
  profileBio: { fontSize: 13, color: '#475569', textAlign: 'center', marginTop: 10, lineHeight: 18 },
  skillsWrapper: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 12 },
  skillChip: { backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  skillChipText: { fontSize: 11, color: '#475569', fontWeight: '500' },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 16, width: '100%' },
  primaryActionBtn: { flex: 1, backgroundColor: PRIMARY, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  primaryActionBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  dangerActionBtn: { flex: 1, backgroundColor: '#ef4444', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  dangerActionBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  outlineActionBtn: { flex: 1, backgroundColor: '#f1f5f9', paddingVertical: 10, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: BORDER },
  outlineActionBtnText: { color: DARK, fontWeight: '700', fontSize: 13 },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  tabItem: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabItemActive: { borderBottomColor: PRIMARY },
  tabText: { fontSize: 13, fontWeight: '500', color: MUTED },
  tabTextActive: { color: PRIMARY, fontWeight: '700' },
  sectionCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#f1f5f9' },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: DARK, marginBottom: 12 },
  entryContainer: { paddingVertical: 4 },
  entrySchool: { fontSize: 14, fontWeight: '700', color: DARK },
  entryDetail: { fontSize: 12, color: '#475569', marginTop: 2 },
  entryYear: { fontSize: 11, color: MUTED, marginTop: 2 },
  entryDesc: { fontSize: 12, color: '#64748b', marginTop: 4 },
  separator: { height: 1, backgroundColor: '#f1f5f9', marginTop: 10 },
  emptyText: { color: MUTED, fontSize: 12 },
  emptyTabMessage: { textAlign: 'center', color: MUTED, marginTop: 20 },
  input: { borderWidth: 1, borderColor: BORDER, borderRadius: 10, padding: 12, fontSize: 14, marginBottom: 10, backgroundColor: BG, color: DARK },
  submitReviewBtn: { backgroundColor: PRIMARY, paddingVertical: 10, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  submitReviewBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  reviewerName: { fontSize: 13, fontWeight: '700', color: DARK },
  reviewComment: { fontSize: 12, color: '#475569', lineHeight: 18 },
  reviewDate: { fontSize: 10, color: MUTED, marginTop: 4 }
});
