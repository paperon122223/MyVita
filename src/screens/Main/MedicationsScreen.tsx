import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { useMedicamentos } from '../../hooks/useDatabase';
import { useDarkMode } from '../../hooks/useDarkMode';
import databaseService from '../../services/database';
import { GradientButton } from '../../components/ui/GradientButton';
import { DesignSystem as DS } from '../../theme/designSystem';
import { RootState } from '../../types';

function MedicationsScreen() {
  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  const userId = currentUser?.id || '';
  const { isDark } = useDarkMode();
  const { data: medications, loading, refetch } = useMedicamentos(userId);

  const [modalVisible, setModalVisible] = useState(false);
  const [nombre, setNombre] = useState('');
  const [dosis, setDosis] = useState('');
  const [unidad, setUnidad] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [saving, setSaving] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const bg = isDark ? DS.colors.surfaceDark : DS.colors.surface;
  const cardBg = isDark ? DS.colors.cardDark : DS.colors.card;
  const textColor = isDark ? DS.colors.textDark : DS.colors.text;
  const mutedColor = isDark ? DS.colors.mutedDark : DS.colors.muted;

  const tileVariants = ['green', 'orange', 'blue'] as const;
  const medsFiltradas = (medications || []).filter((m: any) =>
    m.nombre?.toLowerCase().includes(busqueda.trim().toLowerCase()),
  );

  const handleCreate = useCallback(async () => {
    if (!nombre.trim()) {
      Alert.alert('Falta información', 'Escribe el nombre del medicamento');
      return;
    }
    setSaving(true);
    try {
      await databaseService.crearMedicamento({
        usuarioId: userId,
        nombre: nombre.trim(),
        dosis: dosis.trim() || null,
        unidad: unidad.trim() || null,
        descripcion: descripcion.trim() || null,
      });
      setModalVisible(false);
      setNombre('');
      setDosis('');
      setUnidad('');
      setDescripcion('');
      await refetch();
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar el medicamento.');
    } finally {
      setSaving(false);
    }
  }, [nombre, dosis, unidad, descripcion, userId, refetch]);

  const renderMedication = ({ item, index }: any) => {
    const tile = DS.statContainers[tileVariants[index % tileVariants.length]];
    return (
      <View style={[styles.medCard, { backgroundColor: cardBg }]}>
        <View style={[styles.medIcon, { backgroundColor: tile.bg }]}>
          <MaterialIcons name="medication" size={28} color={tile.fg} />
        </View>
        <View style={styles.medInfo}>
          <Text style={[styles.medName, { color: textColor }]} numberOfLines={1}>
            {item.nombre}
          </Text>
          {(item.dosis || item.unidad) && (
            <Text style={[styles.medDosis, { color: tile.fg }]}>
              {[item.dosis, item.unidad].filter(Boolean).join(' ')}
            </Text>
          )}
          {!!item.descripcion && (
            <Text style={[styles.medNote, { color: mutedColor }]} numberOfLines={1}>
              {item.descripcion}
            </Text>
          )}
        </View>
        <View style={[styles.medCheck, { backgroundColor: isDark ? DS.colors.surfaceContainerDark : DS.colors.surfaceContainer }]}>
          <MaterialIcons name="check-circle-outline" size={24} color={DS.colors.primary} />
        </View>
      </View>
    );
  };

  const SearchHeader = () => (
    <View style={[styles.searchBar, { backgroundColor: cardBg, borderColor: isDark ? DS.colors.borderDark : DS.colors.border }]}>
      <MaterialIcons name="search" size={24} color={DS.colors.subtle} />
      <TextInput
        style={[styles.searchInput, { color: textColor }]}
        placeholder="Buscar medicamento…"
        placeholderTextColor={DS.colors.subtle}
        value={busqueda}
        onChangeText={setBusqueda}
      />
      {busqueda.length > 0 && (
        <TouchableOpacity onPress={() => setBusqueda('')} hitSlop={8}>
          <MaterialIcons name="close" size={20} color={DS.colors.subtle} />
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: bg }]}>
        <ActivityIndicator size="large" color={DS.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <FlatList
        data={medsFiltradas}
        renderItem={renderMedication}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={(medications && medications.length > 0) ? SearchHeader : null}
        ListEmptyComponent={
          busqueda.length > 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="search-off" size={40} color={DS.colors.subtle} />
              <Text style={[styles.emptyText, { color: mutedColor }]}>
                Sin resultados para "{busqueda}"
              </Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <LinearGradient colors={DS.statGradients.active} style={styles.emptyIcon}>
                <MaterialIcons name="medication" size={36} color="#fff" />
              </LinearGradient>
              <Text style={[styles.emptyTitle, { color: textColor }]}>Sin medicamentos</Text>
              <Text style={[styles.emptyText, { color: mutedColor }]}>
                Agrega tus medicamentos para llevar el control de tus tomas
              </Text>
            </View>
          )
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
        accessibilityLabel="Agregar medicamento"
      >
        <LinearGradient colors={DS.statGradients.signature} style={styles.fabGradient}>
          <MaterialIcons name="add" size={26} color="#fff" />
          <Text style={styles.fabText}>Agregar</Text>
        </LinearGradient>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: cardBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textColor }]}>Nuevo Medicamento</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={mutedColor} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>NOMBRE *</Text>
            <TextInput
              style={[styles.modalInput, { color: textColor, backgroundColor: bg, borderColor: isDark ? DS.colors.borderDark : DS.colors.border }]}
              placeholder="Ej. Paracetamol"
              placeholderTextColor={DS.colors.subtle}
              value={nombre}
              onChangeText={setNombre}
            />

            <View style={styles.row}>
              <View style={styles.rowItem}>
                <Text style={styles.fieldLabel}>DOSIS</Text>
                <TextInput
                  style={[styles.modalInput, { color: textColor, backgroundColor: bg, borderColor: isDark ? DS.colors.borderDark : DS.colors.border }]}
                  placeholder="500"
                  placeholderTextColor={DS.colors.subtle}
                  value={dosis}
                  onChangeText={setDosis}
                />
              </View>
              <View style={styles.rowItem}>
                <Text style={styles.fieldLabel}>UNIDAD</Text>
                <TextInput
                  style={[styles.modalInput, { color: textColor, backgroundColor: bg, borderColor: isDark ? DS.colors.borderDark : DS.colors.border }]}
                  placeholder="mg, ml, tabletas"
                  placeholderTextColor={DS.colors.subtle}
                  value={unidad}
                  onChangeText={setUnidad}
                />
              </View>
            </View>

            <Text style={styles.fieldLabel}>NOTAS (OPCIONAL)</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextarea, { color: textColor, backgroundColor: bg, borderColor: isDark ? DS.colors.borderDark : DS.colors.border }]}
              placeholder="Indicaciones, para qué sirve…"
              placeholderTextColor={DS.colors.subtle}
              value={descripcion}
              onChangeText={setDescripcion}
              multiline
            />

            <GradientButton
              label={saving ? 'Guardando…' : 'Guardar Medicamento'}
              onPress={handleCreate}
              loading={saving}
              style={styles.modalButton}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 96,
    flexGrow: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: DS.borderRadius.lg,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    minHeight: 56,
    marginBottom: 16,
    ...DS.shadows.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 18,
    fontFamily: DS.fonts.regular,
    paddingVertical: 12,
  },
  medCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: DS.borderRadius.xl,
    padding: 16,
    marginBottom: 14,
    gap: 14,
    ...DS.shadows.sm,
  },
  medIcon: {
    width: 56,
    height: 56,
    borderRadius: DS.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medInfo: {
    flex: 1,
  },
  medName: {
    fontSize: 20,
    fontFamily: DS.fonts.bold,
    marginBottom: 2,
  },
  medDosis: {
    fontSize: 16,
    fontFamily: DS.fonts.semibold,
    marginBottom: 2,
  },
  medNote: {
    fontSize: 14,
    fontFamily: DS.fonts.regular,
  },
  medCheck: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    ...DS.shadows.md,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: DS.fonts.bold,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 20,
  },
  fabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 28,
    paddingVertical: 14,
    paddingHorizontal: 20,
    ...DS.shadows.lg,
  },
  fabText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: DS.fonts.bold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: DS.borderRadius.xl,
    borderTopRightRadius: DS.borderRadius.xl,
    padding: 22,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 19,
    fontFamily: DS.fonts.extrabold,
  },
  fieldLabel: {
    fontSize: 11,
    fontFamily: DS.fonts.bold,
    color: DS.colors.muted,
    letterSpacing: 0.6,
    marginBottom: 7,
  },
  modalInput: {
    borderRadius: DS.borderRadius.md,
    borderWidth: 1.5,
    borderColor: DS.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 14,
  },
  modalTextarea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  rowItem: {
    flex: 1,
  },
  modalButton: {
    marginTop: 4,
  },
});

export default MedicationsScreen;
