import React from 'react';
import { View, StyleSheet, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { FAB } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { useAlarms } from '../../hooks/useAlarms';
import { RootState } from '../../types';
import { AlarmsNavigationProp } from '../../navigation/types';

interface AlarmsScreenProps {
  navigation: AlarmsNavigationProp;
}

function AlarmsScreen({ navigation }: AlarmsScreenProps) {
  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  const userId = currentUser?.id || '';
  const { alarms, loading } = useAlarms(userId);

  const renderAlarmItem = ({ item }: any) => (
    <TouchableOpacity style={styles.alarmCard}>
      <View style={styles.alarmLeft}>
        <Text style={styles.alarmTime}>{item.hora}</Text>
        <Text style={styles.alarmFreq}>{item.frecuencia}</Text>
      </View>
      <View style={styles.alarmMiddle}>
        <Text style={styles.alarmName}>Medicamento</Text>
        <Text style={styles.alarmNote}>{item.descripcion || 'Sin descripción'}</Text>
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
        data={alarms}
        renderItem={renderAlarmItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="schedule" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No hay alarmas programadas</Text>
          </View>
        }
      />
      <FAB
        icon="plus"
        label="Nueva Alarma"
        onPress={() => navigation.navigate('CreateAlarm')}
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
  alarmCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  alarmLeft: {
    alignItems: 'center',
    marginRight: 16,
    minWidth: 60,
  },
  alarmTime: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00A86B',
  },
  alarmFreq: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  alarmMiddle: {
    flex: 1,
  },
  alarmName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  alarmNote: {
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

export default AlarmsScreen;
