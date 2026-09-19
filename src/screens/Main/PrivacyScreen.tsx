import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useDarkMode } from '../../hooks/useDarkMode';
import { DesignSystem as DS } from '../../theme/designSystem';
import { SectionHero } from '../../components/ui/SectionHero';

const SECTIONS = [
  {
    title: 'Responsable y alcance',
    body: 'MyVita es un prototipo académico desarrollado para InovaTecNM por el equipo del proyecto MyVita. Este aviso describe el tratamiento realizado por la aplicación durante su demostración y evaluación.',
  },
  {
    title: 'Datos que utilizamos',
    body: 'Datos de cuenta (nombre y correo); medicamentos, horarios, alarmas y registros de toma; notas del diario y síntomas; contactos de emergencia; vínculos de cuidador; ubicación únicamente cuando solicitas una función que la necesita; y datos técnicos de sesión y sincronización. Los datos de salud y ubicación se consideran sensibles.',
  },
  {
    title: 'Para qué los utilizamos',
    body: 'Organizar tratamientos, mostrar recordatorios, calcular adherencia, conservar el diario, preparar alertas SOS, compartir información autorizada con cuidadores y responder consultas del asistente. No vendemos tus datos ni los usamos para publicidad.',
  },
  {
    title: 'Asistente con IA',
    body: 'Si aceptas utilizarlo, la pregunta y el contexto necesario de medicamentos, adherencia o diario pueden enviarse al servicio de MyVita para generar una respuesta. Puedes rechazar este uso y continuar utilizando las demás funciones.',
  },
  {
    title: 'Almacenamiento y terceros',
    body: 'Parte de la información se conserva localmente en el dispositivo. Cuando existe conexión, algunas funciones pueden comunicarse con el servidor de MyVita y con proveedores técnicos indispensables. WhatsApp, SMS, mapas y la aplicación de reloj se rigen además por sus propios avisos.',
  },
  {
    title: 'Tus decisiones y derechos',
    body: 'Puedes negar o retirar permisos desde los ajustes de Android, dejar de usar el asistente y solicitar al equipo responsable acceso, rectificación, cancelación u oposición sobre tus datos (derechos ARCO). Durante la etapa de prototipo, presenta la solicitud directamente al equipo expositor de MyVita.',
  },
  {
    title: 'Conservación y seguridad',
    body: 'La información se conserva mientras la cuenta o la demostración permanezcan activas y se aplican controles razonables de acceso y almacenamiento. Ningún sistema ofrece seguridad absoluta; evita registrar información que no sea necesaria.',
  },
  {
    title: 'Cambios',
    body: 'Los cambios importantes a este aviso se comunicarán dentro de la aplicación. Versión del aviso: 6 de agosto de 2026.',
  },
];

function PrivacyScreen() {
  const { isDark } = useDarkMode();
  const backgroundColor = isDark ? DS.colors.surfaceDark : DS.colors.surface;
  const cardColor = isDark ? DS.colors.cardDark : DS.colors.card;
  const textColor = isDark ? DS.colors.textDark : DS.colors.text;
  const mutedColor = isDark ? DS.colors.mutedDark : DS.colors.muted;

  return (
    <ScrollView style={[styles.container, { backgroundColor }]} contentContainerStyle={styles.content}>
      <SectionHero title="Tu privacidad" subtitle="Información clara sobre tus datos." image={require('../../../assets/images/section-caregiver.png')} isDark={isDark} />
      <View style={[styles.notice, { backgroundColor: cardColor }]}>
        <MaterialIcons name="privacy-tip" size={30} color={DS.colors.primary} />
        <Text style={[styles.noticeText, { color: textColor }]}>Tu información de salud merece un tratamiento claro y cuidadoso.</Text>
      </View>
      {SECTIONS.map((section) => (
        <View key={section.title} style={[styles.section, { backgroundColor: cardColor, borderColor: isDark ? DS.colors.borderDark : DS.colors.border }]}>
          <Text style={[styles.title, { color: textColor }]}>{section.title}</Text>
          <Text style={[styles.body, { color: mutedColor }]}>{section.body}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: DS.borderRadius.xl, marginBottom: 24, ...DS.shadows.sm },
  noticeText: { flex: 1, fontSize: 17, lineHeight: 25, fontFamily: DS.fonts.semibold },
  section: { marginBottom: 14, padding: 18, borderRadius: DS.borderRadius.xl, borderWidth: 1, ...DS.shadows.sm },
  title: { fontSize: 19, fontFamily: DS.fonts.bold, marginBottom: 7 },
  body: { fontSize: 16, lineHeight: 25, fontFamily: DS.fonts.regular },
});

export default PrivacyScreen;
