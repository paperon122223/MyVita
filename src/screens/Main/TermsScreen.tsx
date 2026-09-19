import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useDarkMode } from '../../hooks/useDarkMode';
import { DesignSystem as DS } from '../../theme/designSystem';
import { SectionHero } from '../../components/ui/SectionHero';

const SECTIONS = [
  ['Naturaleza del proyecto', 'MyVita es un prototipo académico de apoyo para organizar medicamentos y bienestar. No es un dispositivo médico ni un servicio de emergencias.'],
  ['No sustituye atención profesional', 'La información y las respuestas del asistente son orientativas. No diagnostican, prescriben ni reemplazan a profesionales de la salud. Ante síntomas graves o una emergencia, llama a los servicios de emergencia de tu localidad.'],
  ['Alarmas y recordatorios', 'Las alarmas son una ayuda complementaria. Su funcionamiento puede depender del volumen, permisos, batería, restricciones del sistema o configuración del reloj. Verifica siempre las indicaciones de tu tratamiento.'],
  ['Función SOS', 'MyVita prepara el mensaje y abre WhatsApp, SMS o la llamada. La aplicación no puede garantizar que el mensaje sea enviado, recibido o atendido, y no contacta automáticamente a los servicios de emergencia.'],
  ['Uso responsable', 'Debes proporcionar información correcta, proteger el acceso al dispositivo, revisar destinatarios antes de compartir datos y utilizar la aplicación de acuerdo con la ley. No uses MyVita para causar daño, suplantar personas o acceder a información ajena.'],
  ['Disponibilidad', 'Al tratarse de un prototipo, algunas funciones pueden cambiar, depender de conexión o no estar disponibles temporalmente. El equipo procurará corregir fallos detectados durante la evaluación.'],
  ['Aceptación y cambios', 'Al continuar utilizando MyVita aceptas estas condiciones. Las modificaciones importantes se mostrarán dentro de la aplicación. Versión: 6 de agosto de 2026.'],
] as const;

function TermsScreen() {
  const { isDark } = useDarkMode();
  const backgroundColor = isDark ? DS.colors.surfaceDark : DS.colors.surface;
  const cardColor = isDark ? DS.colors.cardDark : DS.colors.card;
  const textColor = isDark ? DS.colors.textDark : DS.colors.text;
  const mutedColor = isDark ? DS.colors.mutedDark : DS.colors.muted;

  return (
    <ScrollView style={[styles.container, { backgroundColor }]} contentContainerStyle={styles.content}>
      <SectionHero title="Uso responsable" subtitle="Conoce cómo MyVita te acompaña." image={require('../../../assets/images/section-medicine.png')} isDark={isDark} />
      <View style={[styles.notice, { backgroundColor: cardColor }]}>
        <MaterialIcons name="health-and-safety" size={30} color={DS.colors.secondary} />
        <Text style={[styles.noticeText, { color: textColor }]}>MyVita acompaña tu organización; las decisiones médicas corresponden a profesionales de la salud.</Text>
      </View>
      {SECTIONS.map(([title, body]) => (
        <View key={title} style={[styles.section, { backgroundColor: cardColor, borderColor: isDark ? DS.colors.borderDark : DS.colors.border }]}>
          <Text style={[styles.title, { color: textColor }]}>{title}</Text>
          <Text style={[styles.body, { color: mutedColor }]}>{body}</Text>
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

export default TermsScreen;
