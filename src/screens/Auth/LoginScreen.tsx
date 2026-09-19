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
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useDispatch } from 'react-redux';
import authService from '../../services/authService';
import { GradientButton } from '../../components/ui/GradientButton';
import { ScreenBackground } from '../../components/ui/ScreenBackground';
import { isValidEmail } from '../../utils/validators';
import { loginSuccess, loginFailure } from '../../redux/slices/userSlice';
import { useDarkMode } from '../../hooks/useDarkMode';
import { DesignSystem as DS } from '../../theme/designSystem';

function LoginScreen({ navigation }: any) {
  const dispatch = useDispatch();
  const { isDark } = useDarkMode();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // La tarjeta del formulario siempre lleva el degradado de marca — textos fijos en blanco.
  const textColor = '#fff';
  const mutedColor = 'rgba(255,255,255,0.75)';
  const borderColor = 'rgba(255,255,255,0.35)';
  const inputBg = 'rgba(255,255,255,0.15)';

  const handleLogin = async () => {
    setError(null);
    if (!email.trim() || !isValidEmail(email)) {
      setError('Ingresa un correo válido');
      return;
    }
    if (!password) {
      setError('Ingresa tu contraseña');
      return;
    }

    setLoading(true);
    try {
      const response = await authService.login({ email: email.trim(), password });
      dispatch(loginSuccess({ user: response.user, tokens: response.tokens }));
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Error al iniciar sesión';
      setError(message);
      dispatch(loginFailure(message));
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
        {/* Logo grande arriba + ilustración grande abajo */}
        <Animated.View entering={FadeInUp.duration(600)} style={styles.headerContainer}>
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
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(150).duration(600)}>
        <LinearGradient
          colors={DS.statGradients.signature}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.formCard}
        >
          <Text style={[styles.welcomeTitle, { color: textColor }]}>Bienvenido de nuevo</Text>
          <View style={styles.field}>
            <Text style={[styles.label, { color: textColor }]}>Correo electrónico</Text>
            <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor }]}>
              <MaterialIcons name="mail-outline" size={22} color={mutedColor} />
              <TextInput
                style={[styles.input, { color: textColor }]}
                placeholder="ejemplo@correo.com"
                placeholderTextColor={mutedColor}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                editable={!loading}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: textColor }]}>Contraseña</Text>
            <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor }]}>
              <MaterialIcons name="lock-outline" size={22} color={mutedColor} />
              <TextInput
                style={[styles.input, { color: textColor }]}
                placeholder="••••••••"
                placeholderTextColor={mutedColor}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                <MaterialIcons
                  name={showPassword ? 'visibility-off' : 'visibility'}
                  size={22}
                  color={mutedColor}
                />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.forgot}
              onPress={() => Alert.alert('Recuperar contraseña', 'Esta función estará disponible pronto.')}
            >
              <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.remember} onPress={() => setRemember((v) => !v)}>
            <View style={[styles.checkbox, { borderColor }, remember && styles.checkboxOn]}>
              {remember && <MaterialIcons name="check" size={16} color="#fff" />}
            </View>
            <Text style={[styles.rememberText, { color: mutedColor }]}>Recordar mi sesión</Text>
          </TouchableOpacity>

          {error && (
            <View style={styles.errorBox}>
              <MaterialIcons name="error-outline" size={18} color={DS.colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <GradientButton
            label={loading ? 'Iniciando sesión…' : 'Iniciar Sesión'}
            onPress={handleLogin}
            loading={loading}
            icon="arrow-forward"
            style={styles.submitButton}
          />

          <View style={styles.linkContainer}>
            <Text style={[styles.linkText, { color: mutedColor }]}>¿No tienes cuenta? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')} disabled={loading}>
              <Text style={styles.linkButton}>Regístrate aquí</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
        </Animated.View>
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
    padding: 24,
  },
  headerContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  logoTop: {
    width: 260,
    height: 56,
    marginBottom: 6,
  },
  illustrationBig: {
    width: 340,
    height: 260,
  },
  welcomeTitle: {
    fontSize: 22,
    fontFamily: DS.fonts.bold,
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  formCard: {
    borderRadius: DS.borderRadius.xl,
    padding: 24,
    ...DS.shadows.md,
  },
  field: {
    marginBottom: 18,
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
  forgot: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  forgotText: {
    fontSize: 15,
    fontFamily: DS.fonts.semibold,
    color: '#fff',
    textDecorationLine: 'underline',
  },
  remember: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: DS.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: DS.colors.primary,
    borderColor: DS.colors.primary,
  },
  rememberText: {
    fontSize: 16,
    fontFamily: DS.fonts.medium,
    color: DS.colors.muted,
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
    fontFamily: DS.fonts.medium,
    color: DS.colors.error,
  },
  submitButton: {
    marginTop: 4,
  },
  linkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
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

export default LoginScreen;
