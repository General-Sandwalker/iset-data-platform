import type { ThemeConfig } from 'antd';

const ISET_PRIMARY = '#6366f1';
const ISET_PRIMARY_HOVER = '#818cf8';
const ISET_ACCENT = '#22d3ee';
const ISET_SUCCESS = '#10b981';
const ISET_WARNING = '#f59e0b';
const ISET_ERROR = '#ef4444';

export const baseThemeConfig: ThemeConfig = {
  token: {
    colorPrimary: ISET_PRIMARY,
    colorSuccess: ISET_SUCCESS,
    colorWarning: ISET_WARNING,
    colorError: ISET_ERROR,
    colorInfo: ISET_PRIMARY,
    borderRadius: 10,
    fontFamily:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: 14,
    wireframe: false,
    motion: true,
  },
  components: {
    Button: {
      borderRadius: 8,
      controlHeight: 40,
      paddingInline: 20,
      primaryShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
    },
    Card: {
      borderRadius: 14,
      paddingLG: 24,
      boxShadowTertiary: '0 4px 24px rgba(0, 0, 0, 0.06)',
    },
    Input: {
      borderRadius: 8,
      controlHeight: 42,
    },
    Select: {
      borderRadius: 8,
      controlHeight: 42,
    },
    Table: {
      borderRadius: 12,
      headerBorderRadius: 8,
    },
    Modal: {
      borderRadius: 16,
    },
    Menu: {
      itemBorderRadius: 8,
      itemPaddingInline: 16,
    },
    Tabs: {
      itemSelectedColor: ISET_PRIMARY,
      inkBarColor: ISET_PRIMARY,
    },
    Switch: {
      borderRadius: 20,
    },
    Badge: {
      dotSize: 8,
    },
  },
};

export const lightTokens = {
  colorPrimary: ISET_PRIMARY,
  colorPrimaryHover: ISET_PRIMARY_HOVER,
  colorBgBase: '#ffffff',
  colorBgContainer: '#ffffff',
  colorBgElevated: '#ffffff',
  colorBgLayout: '#f8fafc',
  colorBgSpotlight: '#f1f5f9',
  colorBorder: '#e2e8f0',
  colorBorderSecondary: '#f1f5f9',
  colorText: '#0f172a',
  colorTextSecondary: '#475569',
  colorTextTertiary: '#94a3b8',
  colorTextQuaternary: '#cbd5e1',
};

export const darkTokens = {
  colorPrimary: ISET_ACCENT,
  colorPrimaryHover: '#67e8f9',
  colorBgBase: '#0a0a0f',
  colorBgContainer: '#13131a',
  colorBgElevated: '#1c1c26',
  colorBgLayout: '#0a0a0f',
  colorBgSpotlight: '#1e1e2a',
  colorBorder: '#2d2d3f',
  colorBorderSecondary: '#1f1f2e',
  colorText: '#f1f5f9',
  colorTextSecondary: '#94a3b8',
  colorTextTertiary: '#64748b',
  colorTextQuaternary: '#334155',
};