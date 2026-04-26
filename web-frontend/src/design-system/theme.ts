import type { ThemeConfig } from 'antd';

const ISET_PRIMARY_COLOR = '#1a56db';

export const themeConfig: ThemeConfig['theme'] = {
  token: {
    colorPrimary: ISET_PRIMARY_COLOR,
    colorInfo: ISET_PRIMARY_COLOR,
    borderRadius: 6,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: 14,
    colorBgContainer: '#ffffff',
    colorBgLayout: '#f5f5f5',
    colorText: '#1f2937',
    colorTextSecondary: '#6b7280',
    colorBorder: '#e5e7eb',
    colorLink: ISET_PRIMARY_COLOR,
    controlHeight: 36,
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    boxShadowSecondary: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  },
  components: {
    Layout: {
      headerBg: '#ffffff',
      siderBg: '#ffffff',
      bodyBg: '#f5f5f5',
    },
    Menu: {
      itemBg: 'transparent',
      itemSelectedBg: '#eff6ff',
      itemSelectedColor: ISET_PRIMARY_COLOR,
    },
    Button: {
      primaryShadow: 'none',
    },
    Card: {
      paddingLG: 20,
    },
    Table: {
      headerBg: '#f9fafb',
    },
  },
};

export const darkThemeConfig: ThemeConfig['theme'] = {
  token: {
    colorPrimary: ISET_PRIMARY_COLOR,
    colorInfo: ISET_PRIMARY_COLOR,
    borderRadius: 6,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: 14,
    colorBgContainer: '#1f2937',
    colorBgLayout: '#111827',
    colorText: '#f9fafb',
    colorTextSecondary: '#9ca3af',
    colorBorder: '#374151',
    colorLink: ISET_PRIMARY_COLOR,
    controlHeight: 36,
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px 0 rgba(0, 0, 0, 0.2)',
    boxShadowSecondary: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
  },
  components: {
    Layout: {
      headerBg: '#1f2937',
      siderBg: '#1f2937',
      bodyBg: '#111827',
    },
    Menu: {
      itemBg: 'transparent',
      itemSelectedBg: '#1e3a5f',
      itemSelectedColor: '#60a5fa',
    },
    Button: {
      primaryShadow: 'none',
    },
    Card: {
      paddingLG: 20,
    },
    Table: {
      headerBg: '#1f2937',
    },
  },
};