import { useState } from 'react';
import {
  Layout, Menu, Avatar, Dropdown, Switch, Button, theme, Breadcrumb, Typography,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  DashboardOutlined, FileTextOutlined, UserOutlined,
  LogoutOutlined, SunOutlined, MoonOutlined, MenuFoldOutlined,
  MenuUnfoldOutlined, ApartmentOutlined, FundProjectionScreenOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../core/stores/auth.store';
import { useThemeStore } from '../../core/stores/theme.store';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

type MenuItem = Required<MenuProps>['items'][number];

const menuItems: MenuItem[] = [
  { key: '/alumni/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: '/alumni/profile', icon: <UserOutlined />, label: 'Professional Profile' },
  { key: '/alumni/surveys', icon: <FileTextOutlined />, label: 'Surveys' },
  { key: '/alumni/dashboards', icon: <BarChartOutlined />, label: 'Insertion Dashboards' },
];

const breadcrumbMap: Record<string, string> = {
  '/alumni/dashboard': 'Dashboard',
  '/alumni/profile': 'Professional Profile',
  '/alumni/surveys': 'Surveys',
  '/alumni/dashboards': 'Insertion Dashboards',
};

export function AlumniLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { isDarkMode, toggleTheme } = useThemeStore();
  const [collapsed, setCollapsed] = useState(false);
  const { token } = theme.useToken();

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: <span>{user?.firstName} {user?.lastName}</span>,
      disabled: true,
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      danger: true,
      onClick: () => { logout(); navigate('/login'); },
    },
  ];

  const breadcrumbItems = [
    { title: 'Alumni' },
    ...(breadcrumbMap[location.pathname] ? [{ title: breadcrumbMap[location.pathname] }] : []),
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible collapsed={collapsed} onCollapse={setCollapsed}
        trigger={null} breakpoint="lg" collapsedWidth={72} width={260}
        style={{
          overflow: 'auto', height: '100vh', position: 'sticky', top: 0, left: 0,
          borderRight: `1px solid ${token.colorBorderSecondary}`, background: token.colorBgContainer,
        }}
      >
        <div style={{
          height: 72, display: 'flex', alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? 0 : '0 20px', borderBottom: `1px solid ${token.colorBorderSecondary}`, gap: 12,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #a855f7, #6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <ApartmentOutlined style={{ fontSize: 18, color: 'white' }} />
          </div>
          {!collapsed && (
            <div>
              <Text strong style={{ fontSize: 15, color: token.colorText, whiteSpace: 'nowrap', lineHeight: 1.2 }}>ISET Tozeur</Text><br />
              <Text style={{ fontSize: 11, color: token.colorTextTertiary, whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: 0.5 }}>Alumni Portal</Text>
            </div>
          )}
        </div>
        <Menu
          mode="inline" selectedKeys={[location.pathname]} items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0, marginTop: 12, padding: '0 12px' }}
        />
      </Sider>
      <Layout>
        <Header style={{
          padding: '0 24px', background: token.colorBgContainer,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 10, height: 72,
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Button type="text" icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={() => setCollapsed(!collapsed)} style={{ fontSize: 16, width: 40, height: 40 }} />
            <Breadcrumb items={breadcrumbItems} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 10, background: token.colorBgSpotlight, cursor: 'pointer' }} onClick={toggleTheme}>
              {isDarkMode ? <MoonOutlined style={{ color: token.colorPrimary }} /> : <SunOutlined style={{ color: token.colorWarning }} />}
              <Switch size="small" checked={isDarkMode} disabled />
            </div>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '6px 12px', borderRadius: 10, background: token.colorBgSpotlight, transition: 'all 0.2s' }}>
                <Avatar size={32} style={{ background: 'linear-gradient(135deg, #a855f7, #6366f1)', fontWeight: 600 }} icon={<UserOutlined />} />
                {user && (
                  <div style={{ lineHeight: 1.2 }}>
                    <Text style={{ fontSize: 13, fontWeight: 600, color: token.colorText, display: 'block' }}>{user.firstName} {user.lastName}</Text>
                    <Text style={{ fontSize: 11, color: token.colorTextTertiary, textTransform: 'capitalize' }}>Alumni</Text>
                  </div>
                )}
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content style={{
          margin: 24, padding: 28, background: token.colorBgContainer,
          borderRadius: 16, border: `1px solid ${token.colorBorderSecondary}`,
          minHeight: 'calc(100vh - 72px - 48px - 72px)',
        }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
