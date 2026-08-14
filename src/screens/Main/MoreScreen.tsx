import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDarkMode } from '../../hooks/useDarkMode';
import { ScreenBackground } from '../../components/ui/ScreenBackground';
import { DesignSystem as DS } from '../../theme/designSystem';

type MoreRoute = 'Historial' | 'Diary' | 'Mapa' | 'Cuidador' | 'Settings';

const OPTIONS: Array<{
  route: MoreRoute;
  title: string;
  description: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  gradient: readonly [string, string];
}> = [
  {
    route: 'Historial',
    title: 'Historial de tomas',
    description: 'Revisa qué tomaste y qué se te pasó',
    icon: 'history',
    gradient: DS.sectionGradients.alarmas,
  },
  {
    route: 'Diary',
    title: 'Diario',
    description: 'Registra cómo te sientes hoy',
    icon: 'edit-note',
    gradient: DS.sectionGradients.diario,
  },
  {
    route: 'Mapa',
    title: 'Mi ubicación',
    description: 'Consulta y comparte dónde estás',
    icon: 'location-on',
    gradient: DS.sectionGradients.mapa,
  },
  {
    route: 'Cuidador',
    title: 'Cuidadores',
    description: 'Vincula a un familiar que te acompañe',
    icon: 'supervisor-account',
    gradient: DS.sectionGradients.cuidador,
  },
  {
    route: 'Settings',
    title: 'Configuración',
    description: 'Perfil, tema, notificaciones y sesión',
    icon: 'settings',
    gradient: DS.sectionGradients.configuracion,
  },
];

function MoreScreen({ navigation }: any) {
  const { isDark } = useDarkMode();
  const insets = useSafeAreaInsets();
  const cardColor = isDark ? DS.colors.cardDark : DS.colors.card;
  const textColor = isDark ? DS.colors.textDark : DS.colors.text;
  const mutedColor = isDark ? DS.colors.mutedDark : DS.colors.muted;
  const borderColor = isDark ? DS.colors.borderDark : DS.colors.border;

  return (
    <ScreenBackground isDark={isDark}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          // Deja libre la barra flotante (56) + su separación del sistema.
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.intro, { color: mutedColor }]}>
          Todas tus herramientas en un solo lugar.
        </Text>

        {OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.route}
            style={[styles.option, { backgroundColor: cardColor, borderColor }]}
            activeOpacity={0.75}
            onPress={() => navigation.navigate(option.route)}
            accessibilityRole="button"
            accessibilityLabel={`${option.title}. ${option.description}`}
          >
            <LinearGradient
              colors={option.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconTile}
            >
              <MaterialIcons name={option.icon} size={32} color="#fff" />
            </LinearGradient>
            <View style={styles.optionText}>
              <Text style={[styles.optionTitle, { color: textColor }]}>{option.title}</Text>
              <Text style={[styles.optionDescription, { color: mutedColor }]}>
                {option.description}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={28} color={mutedColor} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: DS.spacing.md,
  },
  intro: {
    fontSize: 16,
    fontFamily: DS.fonts.medium,
    marginBottom: DS.spacing.md,
    marginLeft: 4,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: DS.borderRadius.xl,
    borderWidth: 1,
    padding: 18,
    marginBottom: 14,
    // Zona táctil amplia para adultos mayores
    minHeight: 88,
    ...DS.shadows.sm,
  },
  iconTile: {
    width: 60,
    height: 60,
    borderRadius: DS.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 20,
    fontFamily: DS.fonts.bold,
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 15,
    fontFamily: DS.fonts.regular,
    lineHeight: 20,
  },
});

export default MoreScreen;
