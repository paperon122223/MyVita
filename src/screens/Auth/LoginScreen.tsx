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
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useDispatch } from 'react-redux';
import authService from '../../services/authService';
import { GradientButton } from '../../components/ui/GradientButton';
import { isValidEmail } from '../../utils/validators';
import { loginSuccess, loginFailure } from '../../redux/slices/userSlice';
import { DesignSystem as DS } from '../../theme/designSystem';

function LoginScreen({ navigation }: any) {
  const dispatch = useDispatch();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Logo */}
        <Animated.View entering={FadeInUp.duration(600)} style={styles.headerContainer}>
          <LinearGradient colors={DS.statGradients.signature} style={styles.logoTile}>
            <MaterialIcons name="medication" size={44} color="#fff" />
          </LinearGradient>
          <Text style={styles.title}>
            My<Text style={{ color: DS.colors.secondary }}>Vita</Text>
          </Text>
          <Text style={styles.subtitle}>Tu salud, siempre a tiempo</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(150).duration(600)} style={styles.formCard}>
          <View style={styles.field}>
            <Text style={styles.label}>Correo electrónico</Text>
            <View style={styles.inputWrapper}>
              <MaterialIcons name="mail-outline" size={22} color={DS.colors.subtle} />
              <TextInput
                style={styles.input}
                placeholder="ejemplo@correo.com"
                placeholderTextColor={DS.colors.subtle}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                editable={!loading}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Contraseña</Text>
            <View style={styles.inputWrapper}>
              <MaterialIcons name="lock-outline" size={22} color={DS.colors.subtle} />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={DS.colors.subtle}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                <MaterialIcons
                  name={showPassword ? 'visibility-off' : 'visibility'}
                  size={22}
                  color={DS.colors.subtle}
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
            <View style={[styles.checkbox, remember && styles.checkboxOn]}>
              {remember && <MaterialIcons name="check" size={16} color="#fff" />}
            </View>
            <Text style={styles.rememberText}>Recordar mi sesión</Text>
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
            <Text style={styles.linkText}>¿No tienes cuenta? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')} disabled={loading}>
              <Text style={styles.linkButton}>Regístrate aquí</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DS.colors.surface,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  headerContainer: {
    marginBottom: 28,
    alignItems: 'center',
  },
  logoTile: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    ...DS.shadows.lg,
  },
  title: {
    fontSize: 34,
    fontFamily: DS.fonts.extrabold,
    color: DS.colors.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: DS.fonts.medium,
    color: DS.colors.muted,
  },
  formCard: {
    backgroundColor: DS.colors.card,
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
    color: DS.colors.primary,
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
    backgroundColor: '#ffdad6',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 15,
    fontFamily: DS.fonts.medium,
    color: '#93000a',
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
    color: DS.colors.primary,
    fontSize: 16,
    fontFamily: DS.fonts.bold,
  },
});

export default LoginScreen;
