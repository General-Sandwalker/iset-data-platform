import { Layout } from 'antd';
import { Outlet } from 'react-router-dom';
import PublicHeader from '../components/Header';

const { Content, Footer } = Layout;

export function PublicLayout() {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <PublicHeader />
      <Content style={{ flex: 1 }}>
        <Outlet />
      </Content>
      <Footer style={{ textAlign: 'center', background: 'transparent' }}>
        ISET Tozeur Digital Observatory © {new Date().getFullYear()}
      </Footer>
    </Layout>
  );
}