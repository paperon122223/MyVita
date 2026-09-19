import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Medidas de la barra de navegación flotante (ver RootNavigator).
// Viven aquí para que las pantallas reserven el espacio exacto que ocupa
// y nada quede debajo de ella ni encimado con la navegación del sistema.
export const TAB_BAR_HEIGHT = 80;
/** Separación entre la barra flotante y la navegación del sistema. */
export const TAB_BAR_GAP = 8;

export function useTabBarHeight(): number {
  const { fontScale } = useWindowDimensions();
  return TAB_BAR_HEIGHT + Math.ceil(Math.max(0, fontScale - 1) * 44);
}

/**
 * Espacio libre que una pantalla debe dejar en su parte inferior para que
 * el contenido no quede tapado por la barra flotante.
 *
 * @param extra Holgura adicional (por defecto, un respiro visual).
 */
export function useTabBarClearance(extra = 12): number {
  const insets = useSafeAreaInsets();
  const height = useTabBarHeight();
  return Math.max(insets.bottom, 8) + TAB_BAR_GAP + height + extra;
}
