import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useDarkMode } from '../../hooks/useDarkMode';
import { DesignSystem as DS } from '../../theme/designSystem';

type MoreRoute = 'Chat' | 'Diary' | 'Mapa' | 'Cuidador' | 'Settings';

const OPTIONS: Array<{
  route: MoreRoute;
  title: string;
  description: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  colors: { bg: string; fg: string };
}> = [
  {
    route: 'Chat',
    title: 'Asistente IA',
    description: 'Consulta información sobre tu rutina de salud',
    icon: 'chat',
    colors: DS.statContainers.blue,
  },
  {
    route: 'Diary',
    title: 'Diario de bienestar',
    description: 'Registra síntomas, emociones y notas',
    icon: 'edit-note',
    colors: DS.statContainers.green,
  },
  {
    route: 'Mapa',
    title: 'Mi ubicación',
    description: 'Consulta y comparte tu ubicación actual',
    icon: 'location-on',
    colors: DS.statContainers.orange,
  },
  {
    route: 'Cuidador',
    title: 'Modo cuidador',
    description: 'Vincula y acompaña a familiares o pacientes',
    icon: 'supervisor-account',
    colors: DS.statContainers.blue,
  },
  {
    route: 'Settings',
    title: 'Configuración',
    description: 'Perfil, apariencia, permisos y sesión',
    icon: 'settings',
    colors: DS.statContainers.green,
  },
];

function MoreScreen({ navigation }: any) {
  const { isDark } = useDarkMode();
  const backgroundColor = isDark ? DS.colors.surfaceDark : DS.colors.surface;
  const cardColor = isDark ? DS.colors.cardDark : DS.colors.card;
  const textColor = isDark ? DS.colors.textDark : DS.colors.text;
  const mutedColor = isDark ? DS.colors.mutedDark : DS.colors.muted;
  const borderColor = isDark ? DS.colors.borderDark : DS.colors.border;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.intro, { color: mutedColor }]}>Todas tus herramientas, organizadas en un solo lugar.</Text>

      {OPTIONS.map((option) => (
        <TouchableOpacity
          key={option.route}
          style={[styles.option, { backgroundColor: cardColor, borderColor }]}
          activeOpacity={0.75}
          onPress={() => navigation.navigate(option.route)}
          accessibilityRole="button"
          accessibilityLabel={`${option.title}. ${option.description}`}
        >
          <View style={[styles.iconTile, { backgroundColor: option.colors.bg }]}>
            <MaterialIcons name={option.icon} size={28} color={option.colors.fg} />
          </View>
          <View style={styles.optionText}>
            <Text style={[styles.optionTitle, { color: textColor }]}>{option.title}</Text>
            <Text style={[styles.optionDescription, { color: mutedColor }]}>{option.description}</Text>
          </View>
          <MaterialIcons name="chevron-right" size={28} color={mutedColor} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 36 },
  intro: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: DS.fonts.regular,
    marginBottom: 18,
  },
  option: {
    minHeight: 88,
    borderWidth: 1,
    borderRadius: DS.borderRadius.xl,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    ...DS.shadows.sm,
  },
  iconTile: {
    width: 54,
    height: 54,
    borderRadius: DS.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: { flex: 1 },
  optionTitle: {
    fontSize: 18,
    fontFamily: DS.fonts.bold,
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: DS.fonts.regular,
  },
});

export default MoreScreen;
