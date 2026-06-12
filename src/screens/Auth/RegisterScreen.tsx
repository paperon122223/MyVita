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
import { TextInput, Button, SegmentedButtons } from 'react-native-paper';
import { useDispatch } from 'react-redux';
import authService from '../../services/authService';
import { useForm } from '../../hooks/useForm';
import { validateRegisterForm } from '../../utils/validators';
import { registerSuccess, registerFailure } from '../../redux/slices/userSlice';
import { AuthNavigationProp } from '../../navigation/types';

interface RegisterFormValues {
  nombre: string;
  email: string;
  password: string;
  passwordConfirm: string;
  edad: string;
  genero: string;
}

interface RegisterScreenProps {
  navigation: AuthNavigationProp;
}

function RegisterScreen({ navigation }: RegisterScreenProps) {
  const dispatch = useDispatch();

  const form = useForm<RegisterFormValues>({
    initialValues: {
      nombre: '',
      email: '',
      password: '',
      passwordConfirm: '',
      edad: '',
      genero: '',
    },
    validate: (values) =>
      validateRegisterForm(
        values.nombre,
        values.email,
        values.password,
        values.passwordConfirm,
        parseInt(values.edad, 10) || 0,
        values.genero,
      ),
    onSubmit: async (values) => {
      try {
        const response = await authService.register({
          nombre: values.nombre,
          email: values.email,
          password: values.password,
          edad: parseInt(values.edad),
          genero: values.genero as 'M' | 'F' | 'Otro',
        });

        dispatch(
          registerSuccess({
            user: response.user,
            tokens: response.tokens,
          }),
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error en registro';
        dispatch(registerFailure(message));
        throw error;
      }
    },
  });

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Crear Cuenta</Text>
          <Text style={styles.subtitle}>Únete a MyVita</Text>
        </View>

        <View style={styles.formContainer}>
          <TextInput
            mode="outlined"
            label="Nombre Completo"
            placeholder="Juan Pérez"
            value={form.values.nombre}
            onChangeText={(text) => form.handleChange('nombre', text)}
            onBlur={() => form.handleBlur('nombre')}
            error={!!form.errors.nombre && form.touched.nombre}
            style={styles.input}
            editable={!form.isSubmitting}
          />
          {form.errors.nombre && form.touched.nombre && (
            <Text style={styles.errorText}>{form.errors.nombre}</Text>
          )}

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
            placeholder="Mín. 8 caracteres"
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

          <TextInput
            mode="outlined"
            label="Confirmar Contraseña"
            placeholder="••••••••"
            secureTextEntry
            value={form.values.passwordConfirm}
            onChangeText={(text) => form.handleChange('passwordConfirm', text)}
            onBlur={() => form.handleBlur('passwordConfirm')}
            error={!!form.errors.passwordConfirm && form.touched.passwordConfirm}
            style={styles.input}
            editable={!form.isSubmitting}
          />
          {form.errors.passwordConfirm && form.touched.passwordConfirm && (
            <Text style={styles.errorText}>{form.errors.passwordConfirm}</Text>
          )}

          <TextInput
            mode="outlined"
            label="Edad"
            placeholder="65"
            keyboardType="number-pad"
            value={form.values.edad}
            onChangeText={(text) => form.handleChange('edad', text)}
            onBlur={() => form.handleBlur('edad')}
            error={!!form.errors.edad && form.touched.edad}
            style={styles.input}
            editable={!form.isSubmitting}
          />
          {form.errors.edad && form.touched.edad && (
            <Text style={styles.errorText}>{form.errors.edad}</Text>
          )}

          <Text style={styles.label}>Género</Text>
          <SegmentedButtons
            value={form.values.genero}
            onValueChange={(value) => form.handleChange('genero', value)}
            buttons={[
              { value: 'M', label: 'Masculino' },
              { value: 'F', label: 'Femenino' },
              { value: 'Otro', label: 'Otro' },
            ]}
            style={styles.segmentedButtons}
          />
          {form.errors.genero && form.touched.genero && (
            <Text style={styles.errorText}>{form.errors.genero}</Text>
          )}

          {form.submitError && <Text style={styles.errorText}>{form.submitError}</Text>}

          <Button
            mode="contained"
            onPress={form.handleSubmit}
            style={styles.submitButton}
            disabled={form.isSubmitting}
            loading={form.isSubmitting}
          >
            {form.isSubmitting ? 'Registrando...' : 'Registrarse'}
          </Button>

          <View style={styles.linkContainer}>
            <Text style={styles.linkText}>¿Ya tienes cuenta? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')} disabled={form.isSubmitting}>
              <Text style={styles.linkButton}>Inicia sesión aquí</Text>
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
    marginBottom: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00A86B',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
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
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
  },
  segmentedButtons: {
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

export default RegisterScreen;
