import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { callApi } from '../services/api';
import { PRIMARY, DARK, MUTED, BORDER } from '../constants/theme';

export default function EditProfileModal({ token, profileData, onClose, onSaveSuccess }) {
  const [profileForm, setProfileForm] = useState({
    name: profileData.name || '',
    bio: profileData.bio || '',
    headline: profileData.headline || '',
    location: profileData.location || '',
    skills: (profileData.skills || []).join(', '),
    education: profileData.education || [],
    experience: profileData.experience || []
  });

  function addEducation() {
    setProfileForm({
      ...profileForm,
      education: [...profileForm.education, { school: '', degree: '', field: '', year: '' }]
    });
  }

  function updateEducation(idx, field, value) {
    const edu = [...profileForm.education];
    edu[idx] = { ...edu[idx], [field]: value };
    setProfileForm({ ...profileForm, education: edu });
  }

  function removeEducation(idx) {
    setProfileForm({
      ...profileForm,
      education: profileForm.education.filter((_, i) => i !== idx)
    });
  }

  function addExperience() {
    setProfileForm({
      ...profileForm,
      experience: [...profileForm.experience, { company: '', title: '', startDate: '', endDate: '', description: '' }]
    });
  }

  function updateExperience(idx, field, value) {
    const exp = [...profileForm.experience];
    exp[idx] = { ...exp[idx], [field]: value };
    setProfileForm({ ...profileForm, experience: exp });
  }

  function removeExperience(idx) {
    setProfileForm({
      ...profileForm,
      experience: profileForm.experience.filter((_, i) => i !== idx)
    });
  }

  async function handleSaveProfile() {
    try {
      await callApi('/users/me/profile', 'PUT', token, {
        name: profileForm.name,
        bio: profileForm.bio,
        headline: profileForm.headline,
        location: profileForm.location,
        skills: typeof profileForm.skills === 'string' ? profileForm.skills.split(',').map(s => s.trim()).filter(Boolean) : profileForm.skills,
        education: profileForm.education,
        experience: profileForm.experience
      });
      Alert.alert('Success', 'Profile updated successfully');
      onSaveSuccess();
      onClose();
    } catch (e) {
      Alert.alert('Error', 'Update failed');
    }
  }

  return (
    <View style={s.modalOverlay}>
      <View style={s.bottomSheetCard}>
        <View style={s.bottomSheetHeader}>
          <Text style={s.bottomSheetTitle}>Edit Profile</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={DARK} />
          </TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <Text style={s.label}>Name</Text>
          <TextInput style={s.input} placeholder="Name" value={profileForm.name} onChangeText={val => setProfileForm({ ...profileForm, name: val })} placeholderTextColor={MUTED} />

          <Text style={s.label}>Headline</Text>
          <TextInput style={s.input} placeholder="Headline" value={profileForm.headline} onChangeText={val => setProfileForm({ ...profileForm, headline: val })} placeholderTextColor={MUTED} />

          <Text style={s.label}>Location</Text>
          <TextInput style={s.input} placeholder="Location" value={profileForm.location} onChangeText={val => setProfileForm({ ...profileForm, location: val })} placeholderTextColor={MUTED} />

          <Text style={s.label}>Bio</Text>
          <TextInput style={[s.input, { height: 80, textAlignVertical: 'top' }]} placeholder="Bio" multiline value={profileForm.bio} onChangeText={val => setProfileForm({ ...profileForm, bio: val })} placeholderTextColor={MUTED} />

          <Text style={s.label}>Skills (comma separated)</Text>
          <TextInput style={s.input} placeholder="Skills" value={profileForm.skills} onChangeText={val => setProfileForm({ ...profileForm, skills: val })} placeholderTextColor={MUTED} />

          {/* Education Section */}
          <View style={{ marginVertical: 12 }}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Education</Text>
              <TouchableOpacity onPress={addEducation}>
                <Text style={s.addText}>+ Add</Text>
              </TouchableOpacity>
            </View>
            {profileForm.education.map((edu, idx) => (
              <View key={idx} style={s.entryCard}>
                <TextInput style={s.entryInput} placeholder="School / University" value={edu.school} onChangeText={val => updateEducation(idx, 'school', val)} placeholderTextColor={MUTED} />
                <TextInput style={s.entryInput} placeholder="Degree" value={edu.degree} onChangeText={val => updateEducation(idx, 'degree', val)} placeholderTextColor={MUTED} />
                <TextInput style={s.entryInput} placeholder="Field of study" value={edu.field} onChangeText={val => updateEducation(idx, 'field', val)} placeholderTextColor={MUTED} />
                <TextInput style={s.entryInput} placeholder="Year" value={edu.year} onChangeText={val => updateEducation(idx, 'year', val)} placeholderTextColor={MUTED} />
                <TouchableOpacity style={s.removeBtn} onPress={() => removeEducation(idx)}>
                  <Text style={s.removeBtnText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Experience Section */}
          <View style={{ marginVertical: 12 }}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Experience</Text>
              <TouchableOpacity onPress={addExperience}>
                <Text style={s.addText}>+ Add</Text>
              </TouchableOpacity>
            </View>
            {profileForm.experience.map((exp, idx) => (
              <View key={idx} style={s.entryCard}>
                <TextInput style={s.entryInput} placeholder="Company" value={exp.company} onChangeText={val => updateExperience(idx, 'company', val)} placeholderTextColor={MUTED} />
                <TextInput style={s.entryInput} placeholder="Title" value={exp.title} onChangeText={val => updateExperience(idx, 'title', val)} placeholderTextColor={MUTED} />
                <TextInput style={s.entryInput} placeholder="Start Date" value={exp.startDate} onChangeText={val => updateExperience(idx, 'startDate', val)} placeholderTextColor={MUTED} />
                <TextInput style={s.entryInput} placeholder="End Date" value={exp.endDate} onChangeText={val => updateExperience(idx, 'endDate', val)} placeholderTextColor={MUTED} />
                <TextInput style={[s.entryInput, { height: 60, textAlignVertical: 'top' }]} placeholder="Description" multiline value={exp.description} onChangeText={val => updateExperience(idx, 'description', val)} placeholderTextColor={MUTED} />
                <TouchableOpacity style={s.removeBtn} onPress={() => removeExperience(idx)}>
                  <Text style={s.removeBtnText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <TouchableOpacity style={s.primaryBtn} onPress={handleSaveProfile}>
            <Text style={s.primaryBtnText}>Save Profile</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  bottomSheetCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, height: '90%' },
  bottomSheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  bottomSheetTitle: { fontSize: 18, fontWeight: '700', color: DARK },
  label: { fontSize: 12, fontWeight: '600', color: MUTED, marginBottom: 4, textTransform: 'uppercase' },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, fontSize: 14, marginBottom: 10, backgroundColor: '#f8fafc', color: DARK },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: DARK },
  addText: { color: PRIMARY, fontWeight: '700' },
  entryCard: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 8, marginBottom: 8, gap: 8 },
  entryInput: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 10, fontSize: 13, backgroundColor: '#fff', color: DARK },
  removeBtn: { alignSelf: 'flex-end', paddingVertical: 4 },
  removeBtnText: { color: '#ef4444', fontWeight: '600', fontSize: 12 },
  primaryBtn: { backgroundColor: PRIMARY, paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 12 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' }
});
