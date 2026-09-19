import React from 'react';
import { Image, ImageSourcePropType, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTabBarClearance } from '../../utils/layout';
import { useDarkMode } from '../../hooks/useDarkMode';
import { ScreenBackground } from '../../components/ui/ScreenBackground';
import { DesignSystem as DS } from '../../theme/designSystem';

type MoreRoute = 'Chat' | 'Historial' | 'Diary' | 'Mapa' | 'Cuidador' | 'Settings';

const OPTIONS: Array<{
  route: MoreRoute;
  title: string;
  description: string;
  image: ImageSourcePropType;
}> = [
  {
    route: 'Chat',
    title: 'Asistente IA',
    description: 'Resuelve dudas sobre el uso de MyVita',
    image: require('../../../assets/images/section-assistant.png'),
  },
  {
    route: 'Historial',
    title: 'Historial de tomas',
    description: 'Consulta tus tomas registradas',
    image: require('../../../assets/images/section-alarms.png'),
  },
  {
    route: 'Diary',
    title: 'Diario',
    description: 'Registra cómo te sientes hoy',
    image: require('../../../assets/images/section-diary.png'),
  },
  {
    route: 'Mapa',
    title: 'Mi ubicación',
    description: 'Consulta y comparte dónde estás',
    image: require('../../../assets/images/section-location.png'),
  },
  {
    route: 'Cuidador',
    title: 'Cuidadores',
    description: 'Vincula a un familiar que te acompañe',
    image: require('../../../assets/images/section-caregiver.png'),
  },
  {
    route: 'Settings',
    title: 'Configuración',
    description: 'Perfil, tema, notificaciones y sesión',
    image: require('../../../assets/images/section-settings.png'),
  },
];

function MoreScreen({ navigation }: any) {
  const { isDark } = useDarkMode();
  const clearance = useTabBarClearance();
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
          { paddingBottom: clearance },
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
            <Image source={option.image} style={styles.optionImage} resizeMode="contain" />
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
  optionImage: {
    width: 60,
    height: 60,
    borderRadius: DS.borderRadius.lg,
    backgroundColor: '#fff',
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
    fontSize: 16,
    fontFamily: DS.fonts.regular,
    lineHeight: 24,
  },
});

export default MoreScreen;
