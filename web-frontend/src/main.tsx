import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, theme, App as AntApp } from 'antd';
import App from './App';
import { baseThemeConfig, lightTokens, darkTokens } from './design-system/theme';
import { useThemeStore } from './core/stores/theme.store';
import './design-system/styles/global.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

function ThemedApp() {
  const { isDarkMode } = useThemeStore();

  const antdTheme = {
    ...baseThemeConfig,
    token: {
      ...baseThemeConfig.token,
      ...(isDarkMode ? darkTokens : lightTokens),
      colorPrimary: isDarkMode ? '#22d3ee' : '#6366f1',
      colorPrimaryHover: isDarkMode ? '#67e8f9' : '#818cf8',
    },
    algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
  };

  React.useEffect(() => {
    document.documentElement.setAttribute(
      'data-theme',
      isDarkMode ? 'dark' : 'light'
    );
  }, [isDarkMode]);

  return (
    <ConfigProvider theme={antdTheme}>
      <AntApp>
        <BrowserRouter>
          <QueryClientProvider client={queryClient}>
            <App />
          </QueryClientProvider>
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemedApp />
  </React.StrictMode>
);