import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Medidas de la barra de navegación flotante (ver RootNavigator).
// Viven aquí para que las pantallas reserven el espacio exacto que ocupa
// y nada quede debajo de ella ni encimado con la navegación del sistema.
export const TAB_BAR_HEIGHT = 68;
/** Separación entre la barra flotante y la navegación del sistema. */
export const TAB_BAR_GAP = 14;

/**
 * Espacio libre que una pantalla debe dejar en su parte inferior para que
 * el contenido no quede tapado por la barra flotante.
 *
 * @param extra Holgura adicional (por defecto, un respiro visual).
 */
export function useTabBarClearance(extra = 12): number {
  const insets = useSafeAreaInsets();
  return Math.max(insets.bottom, 8) + TAB_BAR_GAP + TAB_BAR_HEIGHT + extra;
}
