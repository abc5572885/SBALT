import { StyleSheet, Text, type TextProps } from 'react-native';

import { getTypographyConfig } from '@/constants/fonts';
import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

function containsChinese(text: string): boolean {
  return /[\u4e00-\u9fa5]/.test(text);
}

function extractTextContent(children: React.ReactNode): string {
  if (typeof children === 'string') {
    return children;
  }
  if (Array.isArray(children)) {
    return children.map(extractTextContent).join('');
  }
  if (children && typeof children === 'object' && 'toString' in children) {
    return children.toString();
  }
  return '';
}

function mergeStyles(
  externalStyle: any,
  typography: { fontFamily: string; fontWeight: string }
): any[] {
  const {
    fontFamily: _externalFontFamily,
    fontWeight: _externalFontWeight,
    ...restExternalStyle
  } = externalStyle;

  return [restExternalStyle, typography];
}

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  children,
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  const textContent = extractTextContent(children);
  const isChinese = containsChinese(textContent);
  const typography = getTypographyConfig(type, isChinese);
  
  const externalStyle = style 
    ? (Array.isArray(style) ? Object.assign({}, ...style) : style)
    : {};
  
  const mergedStyles = mergeStyles(externalStyle, typography);
  
  return (
    <Text
      style={[
        { color },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'defaultSemiBold' && styles.defaultSemiBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        ...mergedStyles,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
  },
  title: {
    fontSize: 32,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 20,
    lineHeight: 28,
  },
  link: {
    fontSize: 16,
    lineHeight: 24,
    color: '#0a7ea4',
  },
});
