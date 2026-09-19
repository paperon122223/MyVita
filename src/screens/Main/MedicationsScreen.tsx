import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Image,
  Alert,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useMedicamentos } from '../../hooks/useDatabase';
import { useDarkMode } from '../../hooks/useDarkMode';
import databaseService from '../../services/database';
import fotoMedicamentoService from '../../services/fotoMedicamentoService';
import { GradientButton } from '../../components/ui/GradientButton';
import { ScreenBackground } from '../../components/ui/ScreenBackground';
import { SectionHero } from '../../components/ui/SectionHero';
import { TAB_BAR_HEIGHT } from '../../utils/layout';
import { DesignSystem as DS } from '../../theme/designSystem';
import { RootState } from '../../types';

function MedicationsScreen() {
  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  const userId = currentUser?.id || '';
  const { isDark } = useDarkMode();
  const insets = useSafeAreaInsets();
  // La barra de tabs flota (position:absolute) sobre el contenido, con su propio
  // margen de safe-area — el FAB debe despejarla usando el mismo cálculo,
  // si no queda tapado o dentro de la zona de gestos del sistema.
  const fabBottom = Math.max(insets.bottom, 8) + TAB_BAR_HEIGHT + 16;
  const { data: medications, loading, refetch } = useMedicamentos(userId);

  const [modalVisible, setModalVisible] = useState(false);
  // Id del medicamento en edición; null = alta de uno nuevo.
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [dosis, setDosis] = useState('');
  const [unidad, setUnidad] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [existencias, setExistencias] = useState('');
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  // Existencias por medicamento_id (vacío = sin control de inventario)
  const [inventario, setInventario] = useState<Record<string, any>>({});

  const cargarInventario = useCallback(async () => {
    if (!userId) return;
    try {
      setInventario(await databaseService.getInventario(userId));
    } catch {
      setInventario({});
    }
  }, [userId]);

  useEffect(() => {
    cargarInventario();
  }, [cargarInventario, medications]);

  const bg = isDark ? DS.colors.surfaceDark : DS.colors.surface;
  const cardBg = isDark ? DS.colors.cardDark : DS.colors.card;
  const medGradient = DS.sectionGradients.medicinas;
  const textColor = isDark ? DS.colors.textDark : DS.colors.text;
  const mutedColor = isDark ? DS.colors.mutedDark : DS.colors.muted;

  const tileVariants = ['green', 'orange', 'blue'] as const;
  const medsFiltradas = (medications || []).filter((m: any) =>
    m.nombre?.toLowerCase().includes(busqueda.trim().toLowerCase()),
  );

  const limpiarFormulario = useCallback(() => {
    setEditandoId(null);
    setNombre('');
    setDosis('');
    setUnidad('');
    setDescripcion('');
    setExistencias('');
    setFotoUri(null);
  }, []);

  const elegirFoto = useCallback(() => {
    const manejar = async (accion: () => Promise<string | null>) => {
      try {
        const uri = await accion();
        if (uri) setFotoUri(uri);
      } catch (error: any) {
        const mensaje =
          error?.message === 'sin-permiso-camara'
            ? 'Necesito permiso para usar la cámara. Puedes activarlo en los ajustes del teléfono.'
            : error?.message === 'sin-permiso-galeria'
              ? 'Necesito permiso para ver tus fotos. Puedes activarlo en los ajustes del teléfono.'
              : 'No se pudo guardar la foto.';
        Alert.alert('Foto', mensaje);
      }
    };

    Alert.alert('Foto del medicamento', '¿De dónde quieres tomarla?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cámara', onPress: () => manejar(() => fotoMedicamentoService.tomarFoto()) },
      { text: 'Galería', onPress: () => manejar(() => fotoMedicamentoService.elegirDeGaleria()) },
    ]);
  }, []);

  const abrirNuevo = useCallback(() => {
    limpiarFormulario();
    setModalVisible(true);
  }, [limpiarFormulario]);

  const abrirEdicion = useCallback((med: any) => {
    setEditandoId(med.id);
    setNombre(med.nombre ?? '');
    setDosis(med.dosis ?? '');
    setUnidad(med.unidad ?? '');
    setDescripcion(med.descripcion ?? '');
    const stock = inventario[med.id]?.cantidad;
    setExistencias(stock === null || stock === undefined ? '' : String(stock));
    setFotoUri(med.foto_uri ?? null);
    setModalVisible(true);
  }, [inventario]);

  const cerrarModal = useCallback(() => {
    setModalVisible(false);
    limpiarFormulario();
  }, [limpiarFormulario]);

  const handleGuardar = useCallback(async () => {
    if (!nombre.trim()) {
      Alert.alert('Falta información', 'Escribe el nombre del medicamento');
      return;
    }
    setSaving(true);
    try {
      let medicamentoId = editandoId;
      if (editandoId) {
        await databaseService.actualizarMedicamento(editandoId, {
          nombre: nombre.trim(),
          dosis: dosis.trim(),
          unidad: unidad.trim(),
          descripcion: descripcion.trim(),
          fotoUri,
        });
      } else {
        medicamentoId = await databaseService.crearMedicamento({
          usuarioId: userId,
          nombre: nombre.trim(),
          dosis: dosis.trim() || null,
          unidad: unidad.trim() || null,
          descripcion: descripcion.trim() || null,
          fotoUri,
        });
      }

      // Campo vacío = el usuario no quiere llevar conteo de este medicamento.
      const cantidad = existencias.trim() === '' ? null : Number(existencias.trim());
      if (medicamentoId && (cantidad === null || Number.isFinite(cantidad))) {
        await databaseService.guardarInventario(userId, medicamentoId, cantidad);
      }

      setModalVisible(false);
      limpiarFormulario();
      await refetch();
      await cargarInventario();
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar el medicamento.');
    } finally {
      setSaving(false);
    }
  }, [
    editandoId,
    nombre,
    dosis,
    unidad,
    descripcion,
    existencias,
    userId,
    refetch,
    limpiarFormulario,
    cargarInventario,
  ]);

  const handleEliminar = useCallback(
    async (med: any) => {
      // Avisar si el medicamento tiene alarmas por venir: borrarlo dejaría
      // recordatorios apuntando a algo que ya no existe.
      let aviso = '';
      try {
        const alarmas = await databaseService.contarAlarmasDeMedicamento(med.id);
        if (alarmas > 0) {
          aviso = `\n\nTiene ${alarmas} alarma${alarmas === 1 ? '' : 's'} programada${
            alarmas === 1 ? '' : 's'
          }. Revísalas después de borrarlo.`;
        }
      } catch {
        // Si falla el conteo, se continúa: no debe impedir el borrado.
      }

      Alert.alert(
        'Borrar medicamento',
        `¿Seguro que quieres borrar "${med.nombre}"?${aviso}`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Borrar',
            style: 'destructive',
            onPress: async () => {
              try {
                await databaseService.eliminarMedicamento(med.id);
                // Sin esto la foto quedaría huérfana ocupando espacio.
                await fotoMedicamentoService.borrar(med.foto_uri);
                await refetch();
              } catch (e) {
                Alert.alert('Error', 'No se pudo borrar el medicamento.');
              }
            },
          },
        ],
      );
    },
    [refetch],
  );

  const renderMedication = ({ item, index }: any) => {
    const tile = DS.statContainers[tileVariants[index % tileVariants.length]];
    const registro = inventario[item.id];
    // null = sin control de inventario para este medicamento
    const stock =
      registro?.cantidad === null || registro?.cantidad === undefined
        ? null
        : Number(registro.cantidad);
    const stockBajo = stock !== null && stock <= (registro?.umbral_aviso ?? 5);
    return (
      <View style={[styles.medCard, { backgroundColor: cardBg }]}>
        <View style={[styles.medIcon, { backgroundColor: isDark ? DS.colors.surfaceContainerDark : tile.bg }]}>
          {item.foto_uri ? (
            <Image source={{ uri: item.foto_uri }} style={styles.medFoto} resizeMode="cover" />
          ) : (
            <Image source={require('../../../assets/images/pildora.png')} style={styles.medIconImage} resizeMode="contain" />
          )}
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
          {stock !== null && (
            <View style={styles.stockRow}>
              <MaterialIcons
                name={stockBajo ? 'error-outline' : 'inventory-2'}
                size={15}
                color={stockBajo ? DS.colors.error : mutedColor}
              />
              <Text
                style={[
                  styles.stockTexto,
                  { color: stockBajo ? DS.colors.error : mutedColor },
                ]}
              >
                {stock === 0
                  ? 'Se agotó — compra más'
                  : stockBajo
                    ? `Quedan ${stock} — compra más`
                    : `Quedan ${stock}`}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.medActions}>
          <TouchableOpacity
            onPress={() => abrirEdicion(item)}
            style={[
              styles.medActionButton,
              { backgroundColor: isDark ? DS.colors.surfaceContainerDark : DS.colors.surfaceContainer },
            ]}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`Editar ${item.nombre}`}
          >
            <MaterialIcons name="edit" size={22} color={DS.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleEliminar(item)}
            style={[
              styles.medActionButton,
              { backgroundColor: isDark ? 'rgba(229,57,53,0.16)' : '#FBDEDC' },
            ]}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`Borrar ${item.nombre}`}
          >
            <MaterialIcons name="delete-outline" size={22} color={DS.colors.error} />
          </TouchableOpacity>
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
      <ScreenBackground isDark={isDark}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={DS.colors.primary} />
        </View>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground isDark={isDark}>
    <View style={styles.container}>
      <FlatList
        data={medsFiltradas}
        renderItem={renderMedication}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={<><SectionHero title="Tus medicinas" subtitle="Organiza tus tratamientos en un solo lugar." image={require('../../../assets/images/section-medicine.png')} isDark={isDark} />{(medications && medications.length > 0) ? SearchHeader : null}</>}
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
              <Text style={[styles.emptyTitle, { color: textColor }]}>Sin medicamentos</Text>
              <Text style={[styles.emptyText, { color: mutedColor }]}>
                Agrega tus medicamentos para llevar el control de tus tomas
              </Text>
              <GradientButton label="Agregar medicamento" icon="add" onPress={abrirNuevo} style={{ marginTop: 16 }} />
            </View>
          )
        }
      />

      {(medications && medications.length > 0) && <TouchableOpacity
        style={[styles.fab, { bottom: fabBottom }]}
        onPress={abrirNuevo}
        accessibilityLabel="Agregar medicamento"
      >
        <LinearGradient colors={medGradient} style={styles.fabGradient}>
          <MaterialIcons name="add" size={26} color="#fff" />
          <Text style={styles.fabText}>Agregar</Text>
        </LinearGradient>
      </TouchableOpacity>}

      <Modal visible={modalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.modalCard, { backgroundColor: cardBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textColor }]}>
                {editandoId ? 'Editar Medicamento' : 'Nuevo Medicamento'}
              </Text>
              <TouchableOpacity onPress={cerrarModal}>
                <MaterialIcons name="close" size={24} color={mutedColor} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.fieldLabel}>FOTO (OPCIONAL)</Text>
            <View style={styles.fotoRow}>
              <TouchableOpacity
                onPress={elegirFoto}
                style={[
                  styles.fotoPreview,
                  { backgroundColor: bg, borderColor: isDark ? DS.colors.borderDark : DS.colors.border },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Agregar foto del medicamento"
              >
                {fotoUri ? (
                  <Image source={{ uri: fotoUri }} style={styles.fotoPreviewImg} resizeMode="cover" />
                ) : (
                  <MaterialIcons name="add-a-photo" size={30} color={DS.colors.subtle} />
                )}
              </TouchableOpacity>
              <View style={styles.fotoTexto}>
                <Text style={[styles.fieldHint, { color: mutedColor, marginTop: 0 }]}>
                  Una foto ayuda a reconocer la pastilla por su color y forma, sin depender
                  de leer el nombre.
                </Text>
                {!!fotoUri && (
                  <TouchableOpacity onPress={() => setFotoUri(null)} hitSlop={8}>
                    <Text style={[styles.fotoQuitar, { color: DS.colors.error }]}>Quitar foto</Text>
                  </TouchableOpacity>
                )}
              </View>
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

            <Text style={styles.fieldLabel}>EXISTENCIAS (OPCIONAL)</Text>
            <TextInput
              style={[styles.modalInput, { color: textColor, backgroundColor: bg, borderColor: isDark ? DS.colors.borderDark : DS.colors.border }]}
              placeholder="¿Cuántas te quedan? Ej. 30"
              placeholderTextColor={DS.colors.subtle}
              value={existencias}
              onChangeText={(texto) => setExistencias(texto.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
            />
            <Text style={[styles.fieldHint, { color: mutedColor }]}>
              Se descuenta sola cada vez que marcas una toma. Te avisamos cuando queden 5 o menos.
              Déjalo vacío si no quieres llevar el conteo.
            </Text>

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
              label={saving ? 'Guardando…' : editandoId ? 'Guardar Cambios' : 'Guardar Medicamento'}
              onPress={handleGuardar}
              loading={saving}
              style={styles.modalButton}
              gradientColors={medGradient}
            />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
    </ScreenBackground>
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
    paddingBottom: 150,
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
  medIconImage: {
    width: 38,
    height: 38,
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
  medFoto: {
    width: '100%',
    height: '100%',
    borderRadius: DS.borderRadius.md,
  },
  fotoRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginBottom: 14,
  },
  fotoPreview: {
    width: 82,
    height: 82,
    borderRadius: DS.borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fotoPreviewImg: {
    width: '100%',
    height: '100%',
  },
  fotoTexto: {
    flex: 1,
  },
  fotoQuitar: {
    fontSize: 13,
    fontFamily: DS.fonts.bold,
    marginTop: 4,
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  stockTexto: {
    fontSize: 13,
    fontFamily: DS.fonts.semibold,
  },
  fieldHint: {
    fontSize: 12,
    fontFamily: DS.fonts.regular,
    lineHeight: 17,
    marginTop: -6,
    marginBottom: 6,
  },
  medActions: {
    flexDirection: 'row',
    gap: 8,
  },
  medActionButton: {
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
  emptyIconImage: {
    width: 48,
    height: 48,
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
    borderRadius: DS.borderRadius.full,
    paddingVertical: 15,
    paddingHorizontal: 22,
    ...DS.shadows.lg,
  },
  fabText: {
    color: '#fff',
    fontSize: 15,
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
    maxHeight: '90%',
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
