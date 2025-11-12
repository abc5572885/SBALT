export const FontWeight = {
  light: '300',
  regular: '400',
  medium: '500',
  semiBold: '600',
  bold: '700',
} as const;

export type FontWeightValue = typeof FontWeight[keyof typeof FontWeight];

export const FontFamily = {
  inter: {
    light: 'Inter-Light',
    regular: 'Inter-Regular',
    medium: 'Inter-Medium',
    semiBold: 'Inter-SemiBold',
    bold: 'Inter-Bold',
  },
  sourceHanSerif: {
    regular: 'SourceHanSerifTW-Regular',
    medium: 'SourceHanSerifTW-Medium',
    semiBold: 'SourceHanSerifTW-SemiBold',
    bold: 'SourceHanSerifTW-Bold',
  },
} as const;

export const Typography = {
  default: {
    english: {
      fontFamily: FontFamily.inter.regular,
      fontWeight: FontWeight.regular,
    },
    chinese: {
      fontFamily: FontFamily.sourceHanSerif.regular,
      fontWeight: FontWeight.regular,
    },
  },
  medium: {
    english: {
      fontFamily: FontFamily.inter.medium,
      fontWeight: FontWeight.medium,
    },
    chinese: {
      fontFamily: FontFamily.sourceHanSerif.medium,
      fontWeight: FontWeight.medium,
    },
  },
  semiBold: {
    english: {
      fontFamily: FontFamily.inter.semiBold,
      fontWeight: FontWeight.semiBold,
    },
    chinese: {
      fontFamily: FontFamily.sourceHanSerif.semiBold,
      fontWeight: FontWeight.semiBold,
    },
  },
  bold: {
    english: {
      fontFamily: FontFamily.inter.bold,
      fontWeight: FontWeight.bold,
    },
    chinese: {
      fontFamily: FontFamily.sourceHanSerif.bold,
      fontWeight: FontWeight.bold,
    },
  },
} as const;

export function getTypographyConfig(
  type: 'default' | 'title' | 'subtitle' | 'defaultSemiBold' | 'link',
  isChinese: boolean
): { fontFamily: string; fontWeight: FontWeightValue } {
  const lang = isChinese ? 'chinese' : 'english';
  
  switch (type) {
    case 'title':
    case 'subtitle':
      return Typography.bold[lang];
    case 'defaultSemiBold':
      return Typography.semiBold[lang];
    case 'link':
      return Typography.medium[lang];
    default:
      return Typography.medium[lang];
  }
}
