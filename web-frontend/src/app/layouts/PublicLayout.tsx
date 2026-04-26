import { Layout, theme } from 'antd';
import { Outlet } from 'react-router-dom';
import PublicHeader from '../components/Header';

const { Content, Footer } = Layout;

export function PublicLayout() {
  const { token } = theme.useToken();

  return (
    <Layout style={{ minHeight: '100vh', background: token.colorBgBase }}>
      <PublicHeader />
      <Content
        style={{
          flex: 1,
          background: token.colorBgBase,
        }}
      >
        <Outlet />
      </Content>
      <Footer
        style={{
          textAlign: 'center',
          background: token.colorBgBase,
          borderTop: `1px solid ${token.colorBorderSecondary}`,
          color: token.colorTextSecondary,
          fontSize: 13,
          padding: '24px',
        }}
      >
        ISET Tozeur Digital Observatory &copy; {new Date().getFullYear()}
      </Footer>
    </Layout>
  );
}