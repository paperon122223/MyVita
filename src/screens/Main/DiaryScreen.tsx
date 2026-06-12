import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { Button } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useSaveDiary } from '../../hooks/useApi';
import { useSelector } from 'react-redux';
import { RootState } from '../../types';
import dayjs from 'dayjs';

function DiaryScreen() {
  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  const { save, loading } = useSaveDiary();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<'muy_bien' | 'bien' | 'normal' | 'mal' | 'muy_mal' | null>(null);

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      alert('Por favor completa el título y contenido');
      return;
    }

    try {
      await save(currentUser?.id || '', dayjs().format('YYYY-MM-DD'), title, content, mood || undefined);
      alert('Entrada guardada');
      setTitle('');
      setContent('');
      setMood(null);
    } catch (error) {
      alert('Error al guardar');
    }
  };

  const moods = [
    { value: 'muy_bien', emoji: '😄', label: 'Muy bien' },
    { value: 'bien', emoji: '🙂', label: 'Bien' },
    { value: 'normal', emoji: '😐', label: 'Normal' },
    { value: 'mal', emoji: '😞', label: 'Mal' },
    { value: 'muy_mal', emoji: '😢', label: 'Muy mal' },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.date}>{dayjs().format('D [de] MMMM YYYY')}</Text>

        <TextInput
          style={styles.titleInput}
          placeholder="Título de la entrada"
          value={title}
          onChangeText={setTitle}
          editable={!loading}
        />

        <Text style={styles.label}>¿Cómo te sientes hoy?</Text>
        <View style={styles.moodsContainer}>
          {moods.map((m) => (
            <TouchableOpacity
              key={m.value}
              style={[styles.moodButton, mood === m.value && styles.moodButtonActive]}
              onPress={() => setMood(m.value as any)}
            >
              <Text style={styles.moodEmoji}>{m.emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={styles.contentInput}
          placeholder="Escribe tus pensamientos y sentimientos..."
          value={content}
          onChangeText={setContent}
          multiline
          editable={!loading}
          textAlignVertical="top"
        />

        <Button mode="contained" onPress={handleSave} loading={loading} style={styles.saveButton}>
          Guardar Entrada
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  date: {
    fontSize: 12,
    color: '#888',
    marginBottom: 16,
  },
  titleInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  moodsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  moodButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#eee',
  },
  moodButtonActive: {
    backgroundColor: '#00A86B',
    borderColor: '#00A86B',
  },
  moodEmoji: {
    fontSize: 24,
  },
  contentInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    minHeight: 200,
    marginBottom: 16,
    fontSize: 14,
  },
  saveButton: {
    paddingVertical: 6,
  },
});

export default DiaryScreen;
