import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, RefreshControl } from 'react-native';
import { callApi } from '../services/api';
import { PRIMARY, DARK, MUTED, BORDER, BG } from '../constants/theme';
import { translations } from '../constants/translations';
import PostJobScreen from './PostJobScreen';

export default function PostsScreen({ lang, token, role, userId, onViewProfile }) {
  const [myJobs, setMyJobs] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [formType, setFormType] = useState('list'); // 'list' or 'job'
  const [submitting, setSubmitting] = useState(false);

  const t = (key) => (translations[lang] && translations[lang][key]) || translations.en[key] || key;
  const tCat = (value) => value?.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

  useEffect(() => {
    loadMyJobs();
  }, []);

  async function loadMyJobs() {
    try {
      const profile = await callApi(`/users/${userId}/profile`);
      setMyJobs(profile.jobs || []);
    } catch (e) {
      console.error(e);
    }
  }

  async function deleteJob(jobId) {
    Alert.alert(
      t('confirm') || 'Delete Post',
      'Are you sure you want to delete this job post?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await callApi(`/jobs/${jobId}`, 'DELETE', token);
              Alert.alert('Success', 'Job deleted successfully');
              loadMyJobs();
            } catch (e) {
              Alert.alert('Error', 'Failed to delete job');
            }
          } 
        }
      ]
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <View style={s.screenHeader}>
        <Text style={s.screenTitle}>{formType === 'job' ? t('postJob') : 'My Job Posts'}</Text>
        {formType === 'list' ? (
          <TouchableOpacity 
            style={s.newPostBtn}
            onPress={() => setFormType('job')}
          >
            <Text style={s.newPostBtnText}>+ Add</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={s.cancelBtn}
            onPress={() => setFormType('list')}
          >
            <Text style={s.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>

      {formType === 'job' ? (
        <View style={{ flex: 1 }}>
          <PostJobScreen 
            lang={lang} 
            token={token} 
            onClose={() => setFormType('list')} 
            onPostSuccess={() => { setFormType('list'); loadMyJobs(); }} 
          />
        </View>
      ) : (
        <FlatList
          data={myJobs}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20, gap: 16, paddingTop: 10 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadMyJobs(); setRefreshing(false); }} />}
          renderItem={({ item: job }) => {
            return (
              <View style={s.jobCard}>
                <View style={s.jobCardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.jobTitle}>{job.title}</Text>
                    <Text style={s.jobCategory}>{tCat(job.category)}</Text>
                  </View>
                  <TouchableOpacity 
                    style={s.deleteBtn}
                    onPress={() => deleteJob(job.id)}
                  >
                    <Text style={s.deleteBtnText}>Delete</Text>
                  </TouchableOpacity>
                </View>

                <Text style={s.jobDescription}>{job.description}</Text>

                <View style={s.jobDetails}>
                  {job.salaryMin && (
                    <Text style={s.detailsText}>
                      Salary: ₹{job.salaryMin.toLocaleString()} - ₹{job.salaryMax.toLocaleString()}/{job.salaryType}
                    </Text>
                  )}
                  {job.locationText && <Text style={s.detailsText}>Location: {job.locationText}</Text>}
                  {job.contacts && job.contacts.length > 0 && job.contacts[0] && (
                    <Text style={s.detailsText}>Contact: {job.contacts.filter(Boolean).join(', ')}</Text>
                  )}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyText}>No job posts yet. Click '+ Add' to post one!</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screenHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  screenTitle: { fontSize: 20, fontWeight: '800', color: DARK },
  newPostBtn: { backgroundColor: PRIMARY, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  newPostBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  cancelBtn: { backgroundColor: '#f1f5f9', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1' },
  cancelBtnText: { color: '#475569', fontWeight: '700', fontSize: 13 },
  jobCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 2, shadowOffset: {width: 0, height: 1}, elevation: 1 },
  jobCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  jobTitle: { fontSize: 16, fontWeight: '700', color: DARK },
  jobCategory: { fontSize: 11, fontWeight: '600', color: PRIMARY, marginTop: 2 },
  deleteBtn: { backgroundColor: '#fef2f2', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  deleteBtnText: { color: '#ef4444', fontSize: 12, fontWeight: '700' },
  jobDescription: { fontSize: 14, color: '#475569', lineHeight: 20, marginBottom: 12 },
  jobDetails: { borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10, gap: 4 },
  detailsText: { fontSize: 12, color: MUTED, fontWeight: '500' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, marginTop: 40 },
  emptyText: { color: MUTED, fontSize: 14, textAlign: 'center' }
});
