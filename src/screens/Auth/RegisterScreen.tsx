import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Text,
  TextInput,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import authService from '../../services/authService';
import { GradientButton } from '../../components/ui/GradientButton';
import { ScreenBackground } from '../../components/ui/ScreenBackground';
import { isValidEmail } from '../../utils/validators';
import { registerSuccess, registerFailure } from '../../redux/slices/userSlice';
import { useDarkMode } from '../../hooks/useDarkMode';
import { DesignSystem as DS } from '../../theme/designSystem';

interface FieldProps {
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  value: string;
  onChange: (text: string) => void;
  placeholder: string;
  secure?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  editable?: boolean;
  textColor?: string;
  mutedColor?: string;
  borderColor?: string;
  inputBg?: string;
}

function Field({
  label,
  icon,
  value,
  onChange,
  placeholder,
  secure,
  keyboardType,
  editable,
  textColor = DS.colors.text,
  mutedColor = DS.colors.subtle,
  borderColor = DS.colors.border,
  inputBg = DS.colors.surfaceContainerLow,
}: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor }]}>
        <MaterialIcons name={icon} size={22} color={mutedColor} />
        <TextInput
          style={[styles.input, { color: textColor }]}
          placeholder={placeholder}
          placeholderTextColor={mutedColor}
          secureTextEntry={secure}
          keyboardType={keyboardType || 'default'}
          autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
          value={value}
          onChangeText={onChange}
          editable={editable !== false}
        />
      </View>
    </View>
  );
}

function RegisterScreen({ navigation }: any) {
  const dispatch = useDispatch();
  const { isDark } = useDarkMode();
  // Título/subtítulo (fuera de la tarjeta) siguen el tema normal
  const textColor = isDark ? DS.colors.textDark : DS.colors.text;
  const mutedColor = isDark ? DS.colors.mutedDark : DS.colors.muted;
  // La tarjeta del formulario siempre lleva el degradado de marca — textos fijos en blanco
  const formTextColor = '#fff';
  const formMutedColor = 'rgba(255,255,255,0.75)';
  const formBorderColor = 'rgba(255,255,255,0.35)';
  const formInputBg = 'rgba(255,255,255,0.15)';
  const [nombre, setNombre] = useState('');
  const [usuario, setUsuario] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Validación heredada de register.js: nombre, usuario, correo y contraseña
  // obligatorios; contraseña mínima de 4 caracteres
  const handleRegister = async () => {
    setError(null);
    if (!nombre.trim() || !usuario.trim() || !email.trim() || !password) {
      setError('Nombre, usuario, correo y contraseña son obligatorios');
      return;
    }
    if (!isValidEmail(email)) {
      setError('El correo electrónico no es válido');
      return;
    }
    // El usuario debe ser alfanumérico (regla de Supabase en el backend)
    if (!/^[a-zA-Z0-9]+$/.test(usuario.trim())) {
      setError('El usuario solo puede tener letras y números, sin espacios');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (password !== passwordConfirm) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      const response = await authService.register({
        nombre: nombre.trim(),
        usuario: usuario.trim(),
        email: email.trim(),
        telefono: telefono.trim() || undefined,
        password,
      });
      dispatch(registerSuccess({ user: response.user, tokens: response.tokens }));
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Error en el registro';
      setError(message);
      dispatch(registerFailure(message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenBackground isDark={isDark}>
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.headerContainer}>
          <Image
            source={require('../../../assets/images/logo-myvita-register.png')}
            style={styles.logoTop}
            resizeMode="contain"
          />
          <Image
            source={require('../../../assets/images/login-familia.png')}
            style={styles.illustrationBig}
            resizeMode="contain"
          />
          <Text style={[styles.title, { color: textColor }]}>Crear Cuenta</Text>
          <Text style={[styles.subtitle, { color: mutedColor }]}>Únete a MyVita y cuida tu salud</Text>
        </View>

        <LinearGradient
          colors={DS.statGradients.signature}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.formCard}
        >
          <Field
            label="NOMBRE COMPLETO"
            icon="badge"
            value={nombre}
            onChange={setNombre}
            placeholder="Juan Pérez"
            editable={!loading}
            textColor={formTextColor}
            mutedColor={formMutedColor}
            borderColor={formBorderColor}
            inputBg={formInputBg}
          />
          <Field
            label="USUARIO"
            icon="alternate-email"
            value={usuario}
            onChange={setUsuario}
            placeholder="juanp"
            editable={!loading}
            textColor={formTextColor}
            mutedColor={formMutedColor}
            borderColor={formBorderColor}
            inputBg={formInputBg}
          />
          <Field
            label="CORREO ELECTRÓNICO"
            icon="mail-outline"
            value={email}
            onChange={setEmail}
            placeholder="tu@correo.com"
            keyboardType="email-address"
            editable={!loading}
            textColor={formTextColor}
            mutedColor={formMutedColor}
            borderColor={formBorderColor}
            inputBg={formInputBg}
          />
          <Field
            label="TELÉFONO (OPCIONAL)"
            icon="phone"
            value={telefono}
            onChange={setTelefono}
            placeholder="55 1234 5678"
            keyboardType="phone-pad"
            editable={!loading}
            textColor={formTextColor}
            mutedColor={formMutedColor}
            borderColor={formBorderColor}
            inputBg={formInputBg}
          />
          <Field
            label="CONTRASEÑA"
            icon="lock-outline"
            value={password}
            onChange={setPassword}
            placeholder="Mínimo 8 caracteres"
            secure
            editable={!loading}
            textColor={formTextColor}
            mutedColor={formMutedColor}
            borderColor={formBorderColor}
            inputBg={formInputBg}
          />
          <Field
            label="CONFIRMAR CONTRASEÑA"
            icon="lock-outline"
            value={passwordConfirm}
            onChange={setPasswordConfirm}
            placeholder="••••••••"
            secure
            editable={!loading}
            textColor={formTextColor}
            mutedColor={formMutedColor}
            borderColor={formBorderColor}
            inputBg={formInputBg}
          />

          {error && (
            <View style={styles.errorBox}>
              <MaterialIcons name="error-outline" size={16} color={DS.colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <GradientButton
            label={loading ? 'Registrando…' : 'Registrarse'}
            onPress={handleRegister}
            loading={loading}
            style={styles.submitButton}
          />

          <View style={styles.linkContainer}>
            <Text style={[styles.linkText, { color: formMutedColor }]}>¿Ya tienes cuenta? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')} disabled={loading}>
              <Text style={styles.linkButton}>Inicia sesión</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </ScrollView>
    </KeyboardAvoidingView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 22,
    paddingVertical: 40,
  },
  headerContainer: {
    marginBottom: 22,
    alignItems: 'center',
  },
  logoTop: {
    width: 260,
    height: 56,
    marginBottom: 6,
  },
  illustrationBig: {
    width: 300,
    height: 230,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontFamily: DS.fonts.extrabold,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: DS.fonts.medium,
  },
  formCard: {
    borderRadius: DS.borderRadius.xl,
    padding: 22,
    ...DS.shadows.md,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontFamily: DS.fonts.semibold,
    color: DS.colors.text,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: DS.colors.surfaceContainerLow,
    borderRadius: DS.borderRadius.lg,
    borderWidth: 1.5,
    borderColor: DS.colors.border,
    paddingHorizontal: 14,
    minHeight: 56,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 18,
    fontFamily: DS.fonts.regular,
    color: DS.colors.text,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: DS.statContainers.red.bg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 15,
    color: DS.colors.error,
    fontFamily: DS.fonts.medium,
  },
  submitButton: {
    marginTop: 4,
  },
  linkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 18,
  },
  linkText: {
    color: DS.colors.muted,
    fontSize: 16,
    fontFamily: DS.fonts.regular,
  },
  linkButton: {
    color: '#fff',
    fontSize: 16,
    fontFamily: DS.fonts.bold,
    textDecorationLine: 'underline',
  },
});

export default RegisterScreen;
