import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView } from 'react-native';
import { Video } from 'expo-av';
import { Ionicons, Feather } from '@expo/vector-icons';
import { callApi } from '../services/api';
import { PRIMARY, DARK, MUTED, SCREEN_WIDTH, SCREEN_HEIGHT } from '../constants/theme';

export default function ReelCard({ job, lang, t, tCat, userId, token, onLike, onDislike, onComment, onMessage, onApply, onShare, onViewProfile, cardHeight }) {
  const [liked, setLiked] = useState(job.liked || false);
  const [likes, setLikes] = useState(job.likes || 0);
  const [disliked, setDisliked] = useState(job.disliked || false);
  const [dislikes, setDislikes] = useState(job.dislikes || 0);
  const [commentsCount, setCommentsCount] = useState(0);

  const getTitle = () => (lang === 'hi' && job.titleHi) ? job.titleHi : (lang === 'mr' && job.titleMr) ? job.titleMr : job.title;
  const getDesc = () => (lang === 'hi' && job.descriptionHi) ? job.descriptionHi : (lang === 'mr' && job.descriptionMr) ? job.descriptionMr : job.description;
  const getDetail = () => (lang === 'hi' && job.textDescriptionHi) ? job.textDescriptionHi : (lang === 'mr' && job.textDescriptionMr) ? job.textDescriptionMr : job.textDescription;
  const salaryLabel = job.salaryType ? t(job.salaryType === 'daily' ? 'perDay' : job.salaryType === 'weekly' ? 'perWeek' : job.salaryType === 'yearly' ? 'perYear' : 'perMonth') : '';

  useEffect(() => {
    callApi(`/jobs/${job.id}/comments`)
      .then(data => {
        if (data) setCommentsCount(data.length);
      })
      .catch(() => {});
  }, [job.id]);

  const handleLike = async () => {
    if (!token) return;
    const r = await onLike(job.id);
    if (r) {
      setLiked(r.liked);
      setLikes(r.likes);
      setDisliked(r.disliked);
      setDislikes(r.dislikes);
    }
  };

  const handleDislike = async () => {
    if (!token) return;
    const r = await onDislike(job.id);
    if (r) {
      setLiked(r.liked);
      setLikes(r.likes);
      setDisliked(r.disliked);
      setDislikes(r.dislikes);
    }
  };

  const hasMedia = !!(job.videoUrl || job.imageUrl);

  return (
    <View style={[s.reelCard, { height: cardHeight }]}>
      {/* Reel Media / Background */}
      {job.videoUrl ? (
        <Video 
          source={{ uri: job.videoUrl }} 
          style={s.reelVideo} 
          resizeMode="cover" 
          shouldPlay 
          isLooping 
          isMuted 
          useNativeControls={false} 
        />
      ) : job.imageUrl ? (
        <View style={s.reelBg}>
          <Image source={{ uri: job.imageUrl }} style={s.reelImage} />
        </View>
      ) : (
        /* Text Fallback Reel (matching ModernApp.jsx's text reel style) */
        <View style={s.textReelBg}>
          <ScrollView contentContainerStyle={s.textReelContent}>
            {job.imageUrl ? <Image source={{ uri: job.imageUrl }} style={s.textReelImage} /> : null}
            <Text style={s.textReelTitle}>{getTitle()}</Text>
            {getDesc() ? <Text style={s.textReelDesc}>{getDesc()}</Text> : null}
            {getDetail() ? <Text style={s.textReelDetail}>{getDetail()}</Text> : null}
            <Text style={s.textReelSalary}>₹{job.salaryMin?.toLocaleString()} - ₹{job.salaryMax?.toLocaleString()} {salaryLabel}</Text>
            
            {job.locationText ? (
              <View style={s.textReelMeta}>
                <Feather name="map-pin" size={12} color={PRIMARY} />
                <Text style={s.textReelMetaText}>{job.locationText}</Text>
              </View>
            ) : null}
            
            {job.contacts && job.contacts.length > 0 && job.contacts[0] ? (
              <View style={s.textReelMeta}>
                <Feather name="phone" size={12} color={PRIMARY} />
                <Text style={s.textReelMetaText}>{job.contacts.filter(c => c).join(', ')}</Text>
              </View>
            ) : null}
          </ScrollView>
        </View>
      )}

      {/* Overlay - show metadata when media exists. Otherwise metadata is in the textReelBg */}
      {hasMedia && (
        <View style={s.reelOverlay}>
          <Text style={s.reelTitle}>{getTitle()}</Text>
          {getDesc() ? <Text style={s.reelDesc} numberOfLines={3}>{getDesc()}</Text> : null}
          <Text style={s.reelSalary}>₹{job.salaryMin?.toLocaleString()} - ₹{job.salaryMax?.toLocaleString()} {salaryLabel}</Text>
          <View style={s.reelTags}>
            <TouchableOpacity onPress={() => onViewProfile(job.employerId)}>
              <View style={[s.reelTag, { backgroundColor: PRIMARY }]}><Text style={[s.reelTagText, { fontWeight: '700' }]}>{t('profile')}</Text></View>
            </TouchableOpacity>
            <View style={s.reelTag}><Text style={s.reelTagText}>{tCat(job.category)}</Text></View>
            {job.locationText ? (
              <View style={s.reelTag}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Feather name="map-pin" size={10} color="#fff" />
                  <Text style={s.reelTagText}>{job.locationText}</Text>
                </View>
              </View>
            ) : null}
            {job.contacts && job.contacts[0] ? (
              <View style={s.reelTag}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Feather name="phone" size={10} color="#fff" />
                  <Text style={s.reelTagText}>{job.contacts[0]}</Text>
                </View>
              </View>
            ) : null}
          </View>
        </View>
      )}

      {/* Actions (Always visible on the right) */}
      <View style={s.reelActions}>
        <TouchableOpacity style={s.reelActionBtn} onPress={handleLike}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={26} color={liked ? '#ef4444' : '#fff'} />
          <Text style={s.reelActionText}>{likes}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.reelActionBtn} onPress={handleDislike}>
          <Ionicons name={disliked ? 'thumbs-down' : 'thumbs-down-outline'} size={24} color={disliked ? '#38bdf8' : '#fff'} />
          <Text style={s.reelActionText}>{dislikes}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.reelActionBtn} onPress={() => onComment(job.id)}>
          <Ionicons name="chatbubble-outline" size={24} color="#fff" />
          <Text style={s.reelActionText}>{commentsCount || ''}</Text>
        </TouchableOpacity>
        {job.employerId && String(job.employerId) !== String(userId) && token && (
          <TouchableOpacity style={s.reelActionBtn} onPress={() => onMessage(job.employerId)}>
            <Ionicons name="mail-outline" size={24} color="#fff" />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={s.reelActionBtn} onPress={() => onApply(job.id)}>
          <Ionicons name="paper-plane" size={24} color="#fff" />
          <Text style={s.reelActionText}>{t('apply')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.reelActionBtn} onPress={() => onShare(job)}>
          <Ionicons name="share-social" size={24} color="#fff" />
          <Text style={s.reelActionText}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  reelCard: { width: SCREEN_WIDTH, backgroundColor: '#1e293b', position: 'relative' },
  reelVideo: { width: '100%', height: '100%' },
  reelBg: { width: '100%', height: '100%', backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  reelImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  reelOverlay: { position: 'absolute', bottom: 10, left: 0, right: 60, padding: 16, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 12, marginHorizontal: 8 },
  reelTitle: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 4 },
  reelDesc: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginBottom: 6 },
  reelSalary: { fontSize: 15, fontWeight: '700', color: '#0ea5e9' },
  reelTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  reelTag: { backgroundColor: 'rgba(255,255,255,0.15)', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 4 },
  reelTagText: { fontSize: 11, fontWeight: '600', color: '#fff' },
  reelActions: { position: 'absolute', right: 10, bottom: 80, gap: 16, alignItems: 'center', zIndex: 10 },
  reelActionBtn: { alignItems: 'center' },
  reelActionText: { fontSize: 11, color: '#fff', marginTop: 2 },
  
  // Text Fallback styles
  textReelBg: { width: SCREEN_WIDTH, height: '100%', backgroundColor: '#0f172a', justifyContent: 'center', paddingRight: 60 },
  textReelContent: { padding: 24, justifyContent: 'center', flexGrow: 1 },
  textReelImage: { width: '100%', borderRadius: 8, height: 150, resizeMode: 'cover', marginBottom: 12 },
  textReelTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 8 },
  textReelDesc: { fontSize: 14, color: '#94a3b8', marginBottom: 12, lineHeight: 20 },
  textReelDetail: { fontSize: 13, color: '#cbd5e1', marginBottom: 12, lineHeight: 18 },
  textReelSalary: { fontSize: 18, fontWeight: '700', color: PRIMARY, marginBottom: 16 },
  textReelMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  textReelMetaText: { fontSize: 13, color: '#94a3b8' },
});
