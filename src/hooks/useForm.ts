import { useState, useCallback } from 'react';

interface UseFormOptions<T> {
  initialValues: T;
  onSubmit: (values: T) => Promise<void> | void;
  validate?: (values: T) => Partial<Record<keyof T, string | undefined>>;
}

interface UseFormReturn<T> {
  values: T;
  errors: Partial<Record<keyof T, string | undefined>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  submitError: string | null;
  handleChange: (field: keyof T, value: any) => void;
  handleBlur: (field: keyof T) => void;
  handleSubmit: () => Promise<void>;
  setFieldValue: (field: keyof T, value: any) => void;
  setFieldError: (field: keyof T, error: string | undefined) => void;
  resetForm: () => void;
  resetErrors: () => void;
}

export const useForm = <T extends Record<string, any>>({
  initialValues,
  onSubmit,
  validate,
}: UseFormOptions<T>): UseFormReturn<T> => {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string | undefined>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleChange = useCallback((field: keyof T, value: any) => {
    setValues((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Validate field if touched
    if (touched[field] && validate) {
      const newErrors = validate({
        ...values,
        [field]: value,
      });
      setErrors((prev) => ({
        ...prev,
        [field]: newErrors[field],
      }));
    }
  }, [values, touched, validate]);

  const handleBlur = useCallback((field: keyof T) => {
    setTouched((prev) => ({
      ...prev,
      [field]: true,
    }));

    // Validate on blur
    if (validate) {
      const newErrors = validate(values);
      setErrors((prev) => ({
        ...prev,
        [field]: newErrors[field],
      }));
    }
  }, [values, validate]);

  const handleSubmit = useCallback(async () => {
    try {
      setIsSubmitting(true);
      setSubmitError(null);

      // Mark all fields as touched
      const allTouched = Object.keys(initialValues).reduce(
        (acc, key) => ({
          ...acc,
          [key]: true,
        }),
        {} as Record<keyof T, boolean>,
      );
      setTouched(allTouched);

      // Validate form
      if (validate) {
        const validationErrors = validate(values);
        const hasErrors = Object.values(validationErrors).some((error) => error !== undefined);
        if (hasErrors) {
          setErrors(validationErrors);
          return;
        }
      }

      // Submit
      await onSubmit(values);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Form submission failed';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [values, initialValues, validate, onSubmit]);

  const setFieldValue = useCallback((field: keyof T, value: any) => {
    setValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const setFieldError = useCallback((field: keyof T, error: string | undefined) => {
    setErrors((prev) => ({
      ...prev,
      [field]: error,
    }));
  }, []);

  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({} as any);
    setTouched({} as any);
    setSubmitError(null);
  }, [initialValues]);

  const resetErrors = useCallback(() => {
    setErrors({} as any);
    setSubmitError(null);
  }, []);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    submitError,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
    setFieldError,
    resetForm,
    resetErrors,
  };
};

// Utility hook for form field props
interface UseFormFieldProps {
  value: any;
  onChangeText: (text: string) => void;
  onBlur: () => void;
  error?: string;
  touched?: boolean;
}

export const useFormField = <T extends Record<string, any>>(
  form: UseFormReturn<T>,
  field: keyof T,
): UseFormFieldProps => {
  return {
    value: form.values[field],
    onChangeText: (text) => form.handleChange(field, text),
    onBlur: () => form.handleBlur(field),
    error: form.errors[field],
    touched: form.touched[field],
  };
};
