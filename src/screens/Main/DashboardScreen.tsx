import React, { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Text,
  TouchableOpacity,
} from 'react-native';
import { Card, ProgressBar } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { useAlarms } from '../../hooks/useAlarms';
import { useDarkMode } from '../../hooks/useDarkMode';
import { RootState } from '../../types';
import { DashboardNavigationProp } from '../../navigation/types';
import dayjs from 'dayjs';

interface DashboardScreenProps {
  navigation: DashboardNavigationProp;
}

function DashboardScreen({ navigation }: DashboardScreenProps) {
  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  const { isDark } = useDarkMode();
  const userId = currentUser?.id || '';
  const { alarms, statistics, loading, refreshAlarms } = useAlarms(userId);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshAlarms();
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshAlarms]);

  const colors = {
    background: isDark ? '#1a1a1a' : '#f5f5f5',
    text: isDark ? '#fff' : '#000',
    cardBg: isDark ? '#2a2a2a' : '#fff',
    primary: '#00A86B',
    secondary: '#FF6B6B',
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={isRefreshing || loading} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.text }]}>Hola, {currentUser?.nombre || 'Usuario'}</Text>
          <Text style={[styles.date, { color: '#888' }]}>{dayjs().format('dddd, D [de] MMMM YYYY')}</Text>
        </View>
        <MaterialIcons name="wb-sunny" size={32} color={colors.primary} />
      </View>

      <View style={styles.content}>
        {/* Adherence Stats */}
        <Card style={[styles.card, { backgroundColor: colors.cardBg }]}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Adherencia Hoy</Text>
              <MaterialIcons name="trending-up" size={24} color={colors.primary} />
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.primary }]}>{statistics.total}</Text>
                <Text style={[styles.statLabel, { color: colors.text }]}>Total</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.primary }]}>{statistics.tomadas}</Text>
                <Text style={[styles.statLabel, { color: colors.text }]}>Tomadas</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.secondary }]}>{statistics.pendientes}</Text>
                <Text style={[styles.statLabel, { color: colors.text }]}>Pendientes</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.primary }]}>
                  {Math.round(statistics.adherencia)}%
                </Text>
                <Text style={[styles.statLabel, { color: colors.text }]}>Adherencia</Text>
              </View>
            </View>

            <View style={styles.progressContainer}>
              <ProgressBar
                progress={statistics.adherencia / 100}
                color={colors.primary}
                style={styles.progressBar}
              />
              <Text style={[styles.progressText, { color: colors.text }]}>
                {statistics.adherencia > 80
                  ? '¡Excelente adherencia!'
                  : statistics.adherencia > 50
                    ? 'Buen progreso'
                    : 'Necesita mejora'}
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Next Medications */}
        <Card style={[styles.card, { backgroundColor: colors.cardBg }]}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Próximas Alarmas</Text>
              <MaterialIcons name="schedule" size={24} color={colors.primary} />
            </View>

            {alarms.length > 0 ? (
              alarms.slice(0, 3).map((alarm, index) => (
                <TouchableOpacity key={alarm.id} style={styles.alarmItem}>
                  <View style={styles.alarmTime}>
                    <Text style={[styles.alarmTimeText, { color: colors.primary }]}>{alarm.hora}</Text>
                  </View>
                  <View style={styles.alarmInfo}>
                    <Text style={[styles.alarmName, { color: colors.text }]}>Medicamento {index + 1}</Text>
                    <Text style={[styles.alarmDosis, { color: '#888' }]}>{alarm.descripcion || 'Sin descripción'}</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={24} color="#ccc" />
                </TouchableOpacity>
              ))
            ) : (
              <Text style={[styles.emptyText, { color: '#888' }]}>No hay alarmas programadas</Text>
            )}
          </Card.Content>
        </Card>

        {/* Quick Actions */}
        <Card style={[styles.card, { backgroundColor: colors.cardBg }]}>
          <Card.Content>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Acciones Rápidas</Text>
            <View style={styles.actionsGrid}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.primary + '20' }]}
                onPress={() => navigation.navigate('AlarmsTab')}
              >
                <MaterialIcons name="notifications-active" size={28} color={colors.primary} />
                <Text style={[styles.actionLabel, { color: colors.text }]}>Alarmas</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#FF6B6B20' }]}
                onPress={() => navigation.navigate('MedicationsTab')}
              >
                <MaterialIcons name="medication" size={28} color="#FF6B6B" />
                <Text style={[styles.actionLabel, { color: colors.text }]}>Medicinas</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#FFB84D20' }]}
                onPress={() => navigation.navigate('ChatTab')}
              >
                <MaterialIcons name="chat" size={28} color="#FFB84D" />
                <Text style={[styles.actionLabel, { color: colors.text }]}>Chat IA</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#FF0000' + '20' }]}
                onPress={() => navigation.navigate('SOSTab')}
              >
                <MaterialIcons name="emergency-share" size={28} color="#FF0000" />
                <Text style={[styles.actionLabel, { color: colors.text }]}>SOS</Text>
              </TouchableOpacity>
            </View>
          </Card.Content>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingTop: 10,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
  },
  content: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  progressText: {
    fontSize: 12,
    textAlign: 'center',
  },
  alarmItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  alarmTime: {
    width: 60,
    alignItems: 'center',
  },
  alarmTimeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  alarmInfo: {
    flex: 1,
    marginLeft: 12,
  },
  alarmName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  alarmDosis: {
    fontSize: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  actionButton: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionLabel: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default DashboardScreen;
