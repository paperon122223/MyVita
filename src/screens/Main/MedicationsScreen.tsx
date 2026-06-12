import React from 'react';
import { View, StyleSheet, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { FAB } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { useMedicamentos } from '../../hooks/useDatabase';
import { RootState } from '../../types';
import { MedicationsNavigationProp } from '../../navigation/types';

interface MedicationsScreenProps {
  navigation: MedicationsNavigationProp;
}

function MedicationsScreen({ navigation }: MedicationsScreenProps) {
  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  const userId = currentUser?.id || '';
  const { data: medications, loading } = useMedicamentos(userId);

  const renderMedicationItem = ({ item }: any) => (
    <TouchableOpacity style={styles.medCard}>
      <MaterialIcons name="medication" size={32} color="#00A86B" />
      <View style={styles.medInfo}>
        <Text style={styles.medName}>{item.nombre}</Text>
        <Text style={styles.medDosis}>{item.dosis}</Text>
        <Text style={styles.medPresentation}>{item.presentacion}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={24} color="#ccc" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#00A86B" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={medications}
        renderItem={renderMedicationItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="medication" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No hay medicinas registradas</Text>
          </View>
        }
      />
      <FAB
        icon="plus"
        label="Agregar Medicina"
        onPress={() => navigation.navigate('CreateMedication')}
        style={styles.fab}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  medCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  medInfo: {
    flex: 1,
    marginLeft: 16,
  },
  medName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  medDosis: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  medPresentation: {
    fontSize: 12,
    color: '#888',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 12,
    color: '#888',
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

export default MedicationsScreen;
