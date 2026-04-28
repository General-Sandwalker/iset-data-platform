import { useState } from 'react';
import {
  Layout,
  Menu,
  Avatar,
  Dropdown,
  Switch,
  Button,
  theme,
  Breadcrumb,
  Typography,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  DatabaseOutlined,
  UploadOutlined,
  FileTextOutlined,
  BarChartOutlined,
  PieChartOutlined,
  SettingOutlined,
  LogoutOutlined,
  SunOutlined,
  MoonOutlined,
  TeamOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ApartmentOutlined,
  LineChartOutlined,
  FundProjectionScreenOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../core/stores/auth.store';
import { useThemeStore } from '../../core/stores/theme.store';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

type MenuItem = Required<MenuProps>['items'][number];

const allMenuItems: MenuItem[] = [
  { key: '/admin', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: '/admin/users', icon: <UserOutlined />, label: 'Users' },
  { key: '/admin/database', icon: <DatabaseOutlined />, label: 'Database' },
  { key: '/admin/import', icon: <UploadOutlined />, label: 'Import' },
  { key: '/admin/surveys', icon: <FileTextOutlined />, label: 'Surveys' },
  {
    key: 'viz-group',
    icon: <BarChartOutlined />,
    label: 'Visualizations',
    children: [
      {
        key: '/admin/visualizations/charts',
        icon: <LineChartOutlined />,
        label: 'Charts',
      },
      {
        key: '/admin/visualizations/dashboards',
        icon: <FundProjectionScreenOutlined />,
        label: 'Dashboards',
      },
    ],
  },
  { key: '/admin/reports', icon: <FileTextOutlined />, label: 'Reports' },
  {
    key: 'analytics-group',
    icon: <PieChartOutlined />,
    label: 'Analytics',
    children: [
      { key: '/admin/analytics/academic', label: 'Academic' },
      { key: '/admin/analytics/insertion', label: 'Insertion' },
    ],
  },
  { key: '/admin/partnerships', icon: <TeamOutlined />, label: 'Partnerships' },
  { key: '/admin/settings', icon: <SettingOutlined />, label: 'Settings' },
];

const adminOnlyKeys = new Set([
  '/admin/users',
  '/admin/database',
  '/admin/settings',
]);
const observatoireExtraKeys = new Set([
  '/admin/surveys',
  '/admin/visualizations/charts',
  '/admin/visualizations/dashboards',
  '/admin/reports',
  '/admin/analytics/academic',
  '/admin/analytics/insertion',
]);

function filterMenuByRole(items: MenuItem[], role: string): MenuItem[] {
  if (role === 'super_admin' || role === 'admin') return items;

  return items
    .filter((item) => {
      if (!item) return false;
      const key = 'key' in item ? (item.key as string) : '';
      if (key === 'viz-group' || key === 'analytics-group') return true;
      if (adminOnlyKeys.has(key)) return false;
      if (role === 'responsable_observatoire') {
        return (
          observatoireExtraKeys.has(key) || !adminOnlyKeys.has(key)
        );
      }
      return !adminOnlyKeys.has(key);
    })
    .map((item) => {
      if (item && 'children' in item && item.children) {
        const filteredChildren = filterMenuByRole(
          item.children as MenuItem[],
          role
        );
        if (filteredChildren.length === 0) return null;
        return { ...item, children: filteredChildren };
      }
      return item;
    })
    .filter(Boolean) as MenuItem[];
}

const breadcrumbMap: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/users': 'Users',
  '/admin/database': 'Database',
  '/admin/import': 'Import',
  '/admin/surveys': 'Surveys',
  '/admin/visualizations/charts': 'Charts',
  '/admin/visualizations/dashboards': 'Dashboards',
  '/admin/reports': 'Reports',
  '/admin/analytics/academic': 'Academic Analytics',
  '/admin/analytics/insertion': 'Insertion Analytics',
  '/admin/partnerships': 'Partnerships',
  '/admin/settings': 'Settings',
};

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { isDarkMode, toggleTheme } = useThemeStore();
  const [collapsed, setCollapsed] = useState(false);
  const { token } = theme.useToken();

  const menuItems = user ? filterMenuByRole(allMenuItems, user.role) : [];

  const getSelectedKeys = (): string[] => [location.pathname];

  const getOpenKeys = (): string[] => {
    if (location.pathname.startsWith('/admin/visualizations'))
      return ['viz-group'];
    if (location.pathname.startsWith('/admin/analytics'))
      return ['analytics-group'];
    return [];
  };

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: (
        <span>
          {user?.firstName} {user?.lastName}
        </span>
      ),
      disabled: true,
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      danger: true,
      onClick: () => {
        logout();
        navigate('/login');
      },
    },
  ];

  const breadcrumbItems = [
    { title: 'Admin' },
    ...(breadcrumbMap[location.pathname]
      ? [{ title: breadcrumbMap[location.pathname] }]
      : location.pathname.match(/^\/admin\/surveys\/[^/]+\/stats$/)
        ? [{ title: 'Surveys' }, { title: 'Stats' }]
        : location.pathname.match(/^\/admin\/surveys\/[^/]+$/)
          ? [{ title: 'Surveys' }, { title: 'Builder' }]
          : []),
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}
        breakpoint="lg"
        collapsedWidth={72}
        width={260}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'sticky',
          top: 0,
          left: 0,
          borderRight: `1px solid ${token.colorBorderSecondary}`,
          background: token.colorBgContainer,
        }}
      >
        {/* Logo */}
        <div
          style={{
            height: 72,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? 0 : '0 20px',
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            gap: 12,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: `linear-gradient(135deg, ${token.colorPrimary}, ${token.colorInfo})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ApartmentOutlined style={{ fontSize: 18, color: 'white' }} />
          </div>
          {!collapsed && (
            <div>
              <Text
                strong
                style={{
                  fontSize: 15,
                  color: token.colorText,
                  whiteSpace: 'nowrap',
                  lineHeight: 1.2,
                }}
              >
                ISET Tozeur
              </Text>
              <br />
              <Text
                style={{
                  fontSize: 11,
                  color: token.colorTextTertiary,
                  whiteSpace: 'nowrap',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                Observatory
              </Text>
            </div>
          )}
        </div>

        {/* Menu */}
        <Menu
          mode="inline"
          selectedKeys={getSelectedKeys()}
          defaultOpenKeys={getOpenKeys()}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{
            borderRight: 0,
            marginTop: 12,
            padding: '0 12px',
          }}
        />
      </Sider>

      <Layout>
        {/* Header */}
        <Header
          style={{
            padding: '0 24px',
            background: token.colorBgContainer,
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 10,
            height: 72,
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Button
              type="text"
              icon={
                collapsed ? (
                  <MenuUnfoldOutlined />
                ) : (
                  <MenuFoldOutlined />
                )
              }
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: 16, width: 40, height: 40 }}
            />
            <Breadcrumb items={breadcrumbItems} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Theme Toggle */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 12px',
                borderRadius: 10,
                background: token.colorBgSpotlight,
                cursor: 'pointer',
              }}
              onClick={toggleTheme}
            >
              {isDarkMode ? (
                <MoonOutlined style={{ color: token.colorPrimary }} />
              ) : (
                <SunOutlined style={{ color: token.colorWarning }} />
              )}
              <Switch
                size="small"
                checked={isDarkMode}
                disabled
              />
            </div>

            {/* User Menu */}
            <Dropdown
              menu={{ items: userMenuItems }}
              placement="bottomRight"
              trigger={['click']}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  cursor: 'pointer',
                  padding: '6px 12px',
                  borderRadius: 10,
                  background: token.colorBgSpotlight,
                  transition: 'all 0.2s',
                }}
              >
                <Avatar
                  size={32}
                  style={{
                    background: `linear-gradient(135deg, ${token.colorPrimary}, ${token.colorInfo})`,
                    fontWeight: 600,
                  }}
                  icon={<UserOutlined />}
                />
                {user && (
                  <div style={{ lineHeight: 1.2 }}>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: token.colorText,
                        display: 'block',
                      }}
                    >
                      {user.firstName} {user.lastName}
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        color: token.colorTextTertiary,
                        textTransform: 'capitalize',
                      }}
                    >
                      {user.role.replace('_', ' ')}
                    </Text>
                  </div>
                )}
              </div>
            </Dropdown>
          </div>
        </Header>

        {/* Content */}
        <Content
          style={{
            margin: 24,
            padding: 28,
            background: token.colorBgContainer,
            borderRadius: 16,
            border: `1px solid ${token.colorBorderSecondary}`,
            minHeight: 'calc(100vh - 72px - 48px - 72px)',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}