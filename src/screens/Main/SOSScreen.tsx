import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSendSOS } from '../../hooks/useApi';
import { useContactosEmergencia } from '../../hooks/useDatabase';
import { useSelector } from 'react-redux';
import { RootState } from '../../types';

function SOSScreen() {
  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  const userId = currentUser?.id || '';
  const { sendSOS, loading } = useSendSOS();
  const { data: contacts } = useContactosEmergencia(userId);
  const [cooldown, setCooldown] = useState(false);

  const handleSOS = async () => {
    Alert.alert('Confirmar SOS', '¿Deseas enviar una alerta de emergencia?', [
      { text: 'Cancelar' },
      {
        text: 'Sí, enviar SOS',
        onPress: async () => {
          try {
            await sendSOS(userId);
            setCooldown(true);
            setTimeout(() => setCooldown(false), 5000);
            Alert.alert('SOS Enviado', 'Se ha notificado a tus contactos de emergencia');
          } catch (error) {
            Alert.alert('Error', 'No se pudo enviar el SOS');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.sosSection}>
        <Text style={styles.title}>Botón de Emergencia</Text>

        <TouchableOpacity
          style={[styles.sosButton, cooldown && styles.sosButtonCooldown]}
          onPress={handleSOS}
          disabled={loading || cooldown}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="large" />
          ) : (
            <>
              <MaterialIcons name="emergency" size={64} color="#fff" />
              <Text style={styles.sosButtonText}>SOS</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.instruction}>Toca el botón rojo para enviar una alerta a tus contactos</Text>
      </View>

      <View style={styles.contactsSection}>
        <Text style={styles.subtitle}>Contactos de Emergencia</Text>
        {contacts && contacts.length > 0 ? (
          contacts.map((contact) => (
            <View key={contact.id} style={styles.contactCard}>
              <MaterialIcons name="person" size={24} color="#00A86B" />
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{contact.nombre}</Text>
                <Text style={styles.contactRelation}>{contact.relacion}</Text>
                <Text style={styles.contactPhone}>{contact.telefono}</Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.noContacts}>No hay contactos de emergencia registrados</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  sosSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 24,
  },
  sosButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#FF0000',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 8,
    shadowColor: '#FF0000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  sosButtonCooldown: {
    backgroundColor: '#999',
  },
  sosButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  instruction: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
  },
  contactsSection: {
    flex: 1,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  contactInfo: {
    flex: 1,
    marginLeft: 12,
  },
  contactName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  contactRelation: {
    fontSize: 12,
    color: '#888',
  },
  contactPhone: {
    fontSize: 12,
    color: '#00A86B',
    fontWeight: '500',
  },
  noContacts: {
    textAlign: 'center',
    color: '#888',
    marginTop: 20,
  },
});

export default SOSScreen;
