// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 */
const MAPPING: Partial<IconMapping> = {
  "house.fill": "home",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  // FocusPath app icons
  "checklist": "check-box",
  "schedule": "calendar-today",
  "flag": "flag",
  "smart_toy": "psychology",
  "checkmark.circle.fill": "check-circle",
  "clock": "access-time",
  "star.fill": "star",
  "plus.circle.fill": "add-circle",
  "timer": "timer",
  "chat.bubble.fill": "chat-bubble",
  "person.fill": "person",
  "target": "my-location",
  "list.bullet": "list",
  "chart.pie": "pie-chart",
} as Partial<IconMapping>;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  const materialName = MAPPING[name];
  if (!materialName) {
    console.warn(`Icon "${name}" not mapped. Using "home" as fallback.`);
    return <MaterialIcons color={color} size={size} name="home" style={style} />;
  }
  return <MaterialIcons color={color} size={size} name={materialName} style={style} />;
}
