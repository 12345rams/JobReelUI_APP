import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { callApi } from '../services/api';
import { PRIMARY, DARK, MUTED, BORDER, BG } from '../constants/theme';
import { translations, categoryTranslations, educationLevels } from '../constants/translations';

export default function PostJobScreen({ lang, token, onClose, onPostSuccess }) {
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState([]);
  const [jobForm, setJobForm] = useState({
    title: '', description: '', salaryMin: 10000, salaryMax: 30000,
    latitude: 12.9716, longitude: 77.5946, category: '', videoUrl: '',
    textDescription: '', contacts: [''], salaryType: 'monthly', locationText: '', education: ''
  });

  const t = (key) => (translations[lang] && translations[lang][key]) || translations.en[key] || key;
  const tCat = (value) => (categoryTranslations[lang] && categoryTranslations[lang][value]) || categoryTranslations.en[value] || value?.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

  React.useEffect(() => {
    callApi('/categories')
      .then(data => setCategories(data || []))
      .catch(() => {});
  }, []);

  async function postJob() {
    if (!jobForm.title || !jobForm.category) {
      Alert.alert('Error', 'Fill required fields (Title and Category)');
      return;
    }
    setSubmitting(true);
    try {
      const contacts = (jobForm.contacts || []).filter(c => c.trim());
      await callApi('/jobs', 'POST', token, { 
        ...jobForm, 
        contacts, 
        salaryMin: Number(jobForm.salaryMin), 
        salaryMax: Number(jobForm.salaryMax), 
        latitude: Number(jobForm.latitude), 
        longitude: Number(jobForm.longitude) 
      });
      Alert.alert('Success', 'Job posted successfully!');
      onPostSuccess();
      onClose();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function generateDescription() {
    if (!jobForm.title) {
      Alert.alert('Error', 'Enter title first');
      return;
    }
    try {
      const data = await callApi('/jobs/generate-description', 'POST', token, { 
        title: jobForm.title, 
        category: jobForm.category, 
        language: lang === 'hi' ? 'hindi' : lang === 'mr' ? 'marathi' : 'english' 
      });
      setJobForm({ ...jobForm, description: data.description });
    } catch (e) {
      Alert.alert('Error', 'AI generation failed');
    }
  }

  async function pickMedia() {
    const result = await ImagePicker.launchImageLibraryAsync({ 
      mediaTypes: ImagePicker.MediaTypeOptions.All, 
      quality: 0.8 
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const fd = new FormData();
      fd.append('file', { 
        uri: asset.uri, 
        type: asset.type === 'video' ? 'video/mp4' : 'image/jpeg', 
        name: 'upload.' + (asset.type === 'video' ? 'mp4' : 'jpg') 
      });
      try {
        Alert.alert('Uploading', 'Uploading media file...');
        const res = await callApi('/videos/upload', 'POST', token, fd, true);
        setJobForm({ ...jobForm, videoUrl: res.videoUrl || res.url || res.imageUrl });
        Alert.alert('Success', 'Uploaded successfully!');
      } catch (e) {
        Alert.alert('Error', 'Upload failed');
      }
    }
  }

  async function getGPSLocation() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Error', 'Location permission denied');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setJobForm({ 
        ...jobForm, 
        latitude: loc.coords.latitude, 
        longitude: loc.coords.longitude, 
        locationText: 'GPS Location' 
      });
      Alert.alert('Success', t('locationSet'));
    } catch (e) {
      Alert.alert('Error', 'Location error');
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.modalHeader}>
        <Text style={s.modalTitle}>{t('postJob')}</Text>
        <TouchableOpacity onPress={onClose}><Text style={s.closeText}>✕</Text></TouchableOpacity>
      </View>
      <ScrollView style={{ flex: 1, padding: 16 }} showsVerticalScrollIndicator={false}>
        {/* Category */}
        <Text style={s.label}>{t('category')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {categories.map(cat => (
            <TouchableOpacity 
              key={cat.value} 
              style={[s.catChip, jobForm.category === cat.value && s.catChipActive]} 
              onPress={() => setJobForm({...jobForm, category: cat.value})}
            >
              <Text style={[s.catChipText, jobForm.category === cat.value && { color: '#fff' }]}>{tCat(cat.value)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Education */}
        <Text style={s.label}>{t('education')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {educationLevels.filter(e => e.value).map(ed => (
            <TouchableOpacity 
              key={ed.value} 
              style={[s.catChip, jobForm.education === ed.value && s.catChipActive]} 
              onPress={() => setJobForm({...jobForm, education: ed.value})}
            >
              <Text style={[s.catChipText, jobForm.education === ed.value && { color: '#fff' }]}>{ed.label[lang] || ed.label.en}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Title */}
        <Text style={s.label}>{t('jobTitle')}</Text>
        <TextInput style={s.input} placeholder={t('jobTitle')} value={jobForm.title} onChangeText={v => setJobForm({...jobForm, title: v})} placeholderTextColor={MUTED} />

        {/* Description */}
        <Text style={s.label}>{t('description')}</Text>
        <TextInput 
          style={[s.input, { height: 100, textAlignVertical: 'top' }]} 
          placeholder={t('description')} 
          multiline 
          value={jobForm.description} 
          onChangeText={v => setJobForm({...jobForm, description: v})} 
          placeholderTextColor={MUTED}
        />
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          <TouchableOpacity style={s.aiBtn} onPress={generateDescription}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="sparkles-outline" size={14} color={MUTED} />
              <Text style={s.aiBtnText}>{t('aiGenerate')}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Salary */}
        <Text style={s.label}>{t('salary')}: ₹{Number(jobForm.salaryMin).toLocaleString()} - ₹{Number(jobForm.salaryMax).toLocaleString()}</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
          <TextInput style={[s.input, { flex: 1 }]} placeholder="Min" keyboardType="numeric" value={String(jobForm.salaryMin)} onChangeText={v => setJobForm({...jobForm, salaryMin: Number(v) || 0})} placeholderTextColor={MUTED} />
          <TextInput style={[s.input, { flex: 1 }]} placeholder="Max" keyboardType="numeric" value={String(jobForm.salaryMax)} onChangeText={v => setJobForm({...jobForm, salaryMax: Number(v) || 0})} placeholderTextColor={MUTED} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {['daily', 'weekly', 'monthly', 'yearly'].map(type => (
            <TouchableOpacity 
              key={type} 
              style={[s.catChip, jobForm.salaryType === type && s.catChipActive]} 
              onPress={() => setJobForm({...jobForm, salaryType: type})}
            >
              <Text style={[s.catChipText, jobForm.salaryType === type && { color: '#fff' }]}>
                {t(type === 'daily' ? 'perDay' : type === 'weekly' ? 'perWeek' : type === 'yearly' ? 'perYear' : 'perMonth')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Contacts */}
        <Text style={s.label}>{t('contact')}</Text>
        {(jobForm.contacts || ['']).map((c, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
            <TextInput 
              style={[s.input, { flex: 1, marginBottom: 0 }]} 
              placeholder="Phone or email" 
              value={c} 
              onChangeText={v => { const u = [...(jobForm.contacts||[''])]; u[i] = v; setJobForm({...jobForm, contacts: u}); }} 
              placeholderTextColor={MUTED}
            />
            {(jobForm.contacts||[]).length > 1 && (
              <TouchableOpacity onPress={() => { const u = [...jobForm.contacts]; u.splice(i,1); setJobForm({...jobForm, contacts: u}); }} style={s.removeBtn}>
                <Text style={{color:'#ef4444'}}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
        <TouchableOpacity onPress={() => setJobForm({...jobForm, contacts: [...(jobForm.contacts||['']), '']})} style={s.addBtn}>
          <Text style={s.addBtnText}>+ Add Contact</Text>
        </TouchableOpacity>

        {/* Media */}
        <Text style={s.label}>{t('media')}</Text>
        <TouchableOpacity style={s.mediaBtn} onPress={pickMedia}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
            <Feather name={jobForm.videoUrl ? 'check-circle' : 'image'} size={16} color={jobForm.videoUrl ? PRIMARY : MUTED} />
            <Text style={s.mediaBtnText}>{jobForm.videoUrl ? 'Media uploaded' : 'Choose image or video'}</Text>
          </View>
        </TouchableOpacity>

        {/* Location */}
        <Text style={s.label}>{t('location')}</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          <TextInput style={[s.input, { flex: 1 }]} placeholder="e.g. Mumbai, Delhi..." value={jobForm.locationText} onChangeText={v => setJobForm({...jobForm, locationText: v})} placeholderTextColor={MUTED} />
          <TouchableOpacity style={s.gpsBtn} onPress={getGPSLocation}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Feather name="crosshair" size={14} color="#ef4444" />
              <Text style={s.gpsBtnText}>GPS</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Submit */}
        <TouchableOpacity 
          style={[s.primaryBtn, { marginBottom: 40 }, submitting && s.disabledBtn]} 
          onPress={postJob} 
          disabled={submitting || !jobForm.title || !jobForm.category}
        >
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>{t('postJob')}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: DARK },
  closeText: { fontSize: 20, color: MUTED },
  label: { fontSize: 12, fontWeight: '600', color: MUTED, marginBottom: 4, textTransform: 'uppercase' },
  input: { borderWidth: 1, borderColor: BORDER, borderRadius: 10, padding: 12, fontSize: 14, marginBottom: 10, backgroundColor: BG, color: DARK },
  catChip: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: BORDER, marginRight: 6, backgroundColor: '#fff' },
  catChipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  catChipText: { fontSize: 12, fontWeight: '600', color: MUTED },
  aiBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: BORDER },
  aiBtnText: { fontSize: 12, fontWeight: '600', color: MUTED },
  addBtn: { marginBottom: 12, marginTop: 4 },
  addBtnText: { color: PRIMARY, fontWeight: '600', fontSize: 13 },
  removeBtn: { justifyContent: 'center', paddingHorizontal: 8 },
  mediaBtn: { borderWidth: 1, borderColor: BORDER, borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 12, backgroundColor: BG },
  mediaBtnText: { fontSize: 13, color: MUTED, fontWeight: '600' },
  gpsBtn: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 10, paddingHorizontal: 14, justifyContent: 'center', marginBottom: 10 },
  gpsBtnText: { fontSize: 12, fontWeight: '600', color: '#ef4444' },
  primaryBtn: { backgroundColor: PRIMARY, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  disabledBtn: { opacity: 0.5 }
});
