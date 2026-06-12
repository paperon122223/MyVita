import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Text,
} from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { useDispatch } from 'react-redux';
import authService from '../../services/authService';
import { useForm } from '../../hooks/useForm';
import { validateLoginForm } from '../../utils/validators';
import { loginSuccess, loginFailure } from '../../redux/slices/userSlice';
import { AuthNavigationProp } from '../../navigation/types';

interface LoginFormValues {
  email: string;
  password: string;
}

interface LoginScreenProps {
  navigation: AuthNavigationProp;
}

function LoginScreen({ navigation }: LoginScreenProps) {
  const dispatch = useDispatch();

  const form = useForm<LoginFormValues>({
    initialValues: {
      email: '',
      password: '',
    },
    validate: (values) => validateLoginForm(values.email, values.password),
    onSubmit: async (values) => {
      try {
        const response = await authService.login({
          email: values.email,
          password: values.password,
        });

        dispatch(
          loginSuccess({
            user: response.user,
            tokens: response.tokens,
          }),
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error en login';
        dispatch(loginFailure(message));
        throw error;
      }
    },
  });

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerContainer}>
          <Text style={styles.title}>MyVita</Text>
          <Text style={styles.subtitle}>Gestor de Medicamentos</Text>
        </View>

        <View style={styles.formContainer}>
          <TextInput
            mode="outlined"
            label="Email"
            placeholder="tu@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={form.values.email}
            onChangeText={(text) => form.handleChange('email', text)}
            onBlur={() => form.handleBlur('email')}
            error={!!form.errors.email && form.touched.email}
            style={styles.input}
            editable={!form.isSubmitting}
          />
          {form.errors.email && form.touched.email && (
            <Text style={styles.errorText}>{form.errors.email}</Text>
          )}

          <TextInput
            mode="outlined"
            label="Contraseña"
            placeholder="••••••••"
            secureTextEntry
            value={form.values.password}
            onChangeText={(text) => form.handleChange('password', text)}
            onBlur={() => form.handleBlur('password')}
            error={!!form.errors.password && form.touched.password}
            style={styles.input}
            editable={!form.isSubmitting}
          />
          {form.errors.password && form.touched.password && (
            <Text style={styles.errorText}>{form.errors.password}</Text>
          )}

          {form.submitError && <Text style={styles.errorText}>{form.submitError}</Text>}

          <Button
            mode="contained"
            onPress={form.handleSubmit}
            style={styles.submitButton}
            disabled={form.isSubmitting}
            loading={form.isSubmitting}
          >
            {form.isSubmitting ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </Button>

          <View style={styles.linkContainer}>
            <Text style={styles.linkText}>¿No tienes cuenta? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')} disabled={form.isSubmitting}>
              <Text style={styles.linkButton}>Regístrate aquí</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  headerContainer: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#00A86B',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  input: {
    marginBottom: 12,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 12,
    marginTop: -8,
    marginBottom: 12,
  },
  submitButton: {
    marginTop: 20,
    paddingVertical: 8,
  },
  linkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  linkText: {
    color: '#666',
    fontSize: 14,
  },
  linkButton: {
    color: '#00A86B',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default LoginScreen;
