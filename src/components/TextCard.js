import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { PRIMARY, DARK, MUTED, BORDER } from '../constants/theme';

export default function TextCard({ job, lang, t, tCat, onShare, onApply }) {
  const getTitle = () => (lang === 'hi' && job.titleHi) ? job.titleHi : (lang === 'mr' && job.titleMr) ? job.titleMr : job.title;
  const getDesc = () => (lang === 'hi' && job.descriptionHi) ? job.descriptionHi : (lang === 'mr' && job.descriptionMr) ? job.descriptionMr : job.description;
  const salaryLabel = job.salaryType ? t(job.salaryType === 'daily' ? 'perDay' : job.salaryType === 'weekly' ? 'perWeek' : job.salaryType === 'yearly' ? 'perYear' : 'perMonth') : '';

  return (
    <View style={s.textCard}>
      {job.imageUrl ? <Image source={{ uri: job.imageUrl }} style={s.textCardImage} /> : null}
      <Text style={s.textCardTitle}>{getTitle()}</Text>
      {getDesc() ? <Text style={s.textCardDesc} numberOfLines={4}>{getDesc()}</Text> : null}
      <Text style={s.textCardSalary}>₹{job.salaryMin?.toLocaleString()} - ₹{job.salaryMax?.toLocaleString()} {salaryLabel}</Text>
      
      {job.locationText ? (
        <View style={s.metaChip}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Feather name="map-pin" size={12} color="#475569" />
            <Text style={s.metaChipText}>{job.locationText}</Text>
          </View>
        </View>
      ) : null}
      
      {job.contacts && job.contacts[0] ? (
        <View style={s.metaChip}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Feather name="phone" size={12} color="#475569" />
            <Text style={s.metaChipText}>{job.contacts.filter(c => c).join(', ')}</Text>
          </View>
        </View>
      ) : null}
      
      <View style={s.textCardActions}>
        <View style={s.textCardTag}><Text style={s.textCardTagText}>{tCat(job.category)}</Text></View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={[s.applyBtn, { backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: BORDER }]} onPress={() => onShare(job)}>
            <Feather name="share-2" size={14} color={DARK} />
          </TouchableOpacity>
          <TouchableOpacity style={s.applyBtn} onPress={() => onApply(job.id)}>
            <Text style={s.applyBtnText}>{t('apply')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  textCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: '#f1f5f9' },
  textCardImage: { width: '100%', height: 150, borderRadius: 8, marginBottom: 10 },
  textCardTitle: { fontSize: 16, fontWeight: '700', color: DARK, marginBottom: 4 },
  textCardDesc: { fontSize: 13, color: MUTED, lineHeight: 20, marginBottom: 8 },
  textCardSalary: { fontSize: 14, fontWeight: '700', color: PRIMARY, marginBottom: 8 },
  textCardActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  textCardTag: { backgroundColor: '#f1f5f9', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6 },
  textCardTagText: { fontSize: 11, fontWeight: '600', color: MUTED },
  metaChip: { backgroundColor: '#f1f5f9', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 6, alignSelf: 'flex-start', marginBottom: 4 },
  metaChipText: { fontSize: 12, color: '#475569' },
  applyBtn: { backgroundColor: PRIMARY, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  applyBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
