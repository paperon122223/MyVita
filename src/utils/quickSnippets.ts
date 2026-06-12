export const QuickSnippets = {
  ScreenTemplate: `
import React, { useEffect } from 'react';
import { View, Text, ScrollView, AccessibilityInfo } from 'react-native';
import { DesignSystem } from '../theme/designSystem';

export const MyScreen = () => {
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility('Pantalla de [Nombre]');
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: DesignSystem.colors.gray[50] }}>
      <View style={{ padding: DesignSystem.spacing.md, backgroundColor: DesignSystem.colors.primary }}>
        <Text style={{ ...DesignSystem.typography.heading2, color: '#FFFFFF' }}>
          Mi Pantalla
        </Text>
      </View>
      <ScrollView style={{ flex: 1, padding: DesignSystem.spacing.md }}>
        {/* Contenido aquí */}
      </ScrollView>
    </View>
  );
};
`,

  FormTemplate: `
import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text } from 'react-native';
import { DesignSystem } from '../theme/designSystem';

export const MyForm = () => {
  const [value, setValue] = useState('');

  return (
    <View>
      <TextInput
        style={{
          borderWidth: 1,
          borderColor: DesignSystem.colors.gray[300],
          borderRadius: DesignSystem.borderRadius.md,
          padding: DesignSystem.spacing.md,
          fontSize: 16,
          minHeight: 48,
          marginBottom: DesignSystem.spacing.md,
        }}
        value={value}
        onChangeText={setValue}
        placeholder="Email"
        keyboardType="email-address"
        accessibilityLabel="Campo de email"
      />
      <TouchableOpacity
        style={{
          backgroundColor: DesignSystem.colors.primary,
          padding: DesignSystem.spacing.md,
          borderRadius: DesignSystem.borderRadius.lg,
          ...DesignSystem.shadows.md,
        }}
        accessibilityRole="button"
        accessibilityLabel="Enviar formulario"
      >
        <Text style={{ ...DesignSystem.typography.button, color: '#FFFFFF', textAlign: 'center' }}>
          Enviar
        </Text>
      </TouchableOpacity>
    </View>
  );
};
`,

  ListTemplate: `
import React from 'react';
import { FlatList, Text, TouchableOpacity } from 'react-native';
import { DesignSystem } from '../theme/designSystem';

type Item = { id: string; title: string };

export const MyList = ({ items }: { items: Item[] }) => (
  <FlatList
    data={items}
    accessibilityRole="list"
    keyExtractor={(item) => item.id}
    renderItem={({ item }) => (
      <TouchableOpacity
        style={{
          backgroundColor: '#FFFFFF',
          padding: DesignSystem.spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: DesignSystem.colors.gray[200],
          minHeight: 56,
          justifyContent: 'center',
        }}
        accessibilityRole="menuitem"
        accessibilityLabel={item.title}
      >
        <Text style={DesignSystem.typography.body1}>{item.title}</Text>
      </TouchableOpacity>
    )}
  />
);
`,
};
