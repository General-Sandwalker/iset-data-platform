import { Layout, Menu, Avatar, Dropdown, Switch, Button } from 'antd';
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
  BuildOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../core/stores/auth.store';
import { useThemeStore } from '../../core/stores/theme.store';

const { Header, Sider, Content } = Layout;

const adminMenuItems = [
  { key: '/admin', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: '/admin/users', icon: <UserOutlined />, label: 'Users' },
  { key: '/admin/database', icon: <DatabaseOutlined />, label: 'Database' },
  { key: '/admin/import', icon: <UploadOutlined />, label: 'Import' },
  { key: '/admin/surveys', icon: <FileTextOutlined />, label: 'Surveys' },
  { key: '/admin/visualizations/charts', icon: <BarChartOutlined />, label: 'Charts' },
  { key: '/admin/visualizations/dashboards', icon: <PieChartOutlined />, label: 'Dashboards' },
  { key: '/admin/reports', icon: <FileTextOutlined />, label: 'Reports' },
  { key: '/admin/analytics/academic', icon: <BarChartOutlined />, label: 'Academic Analytics' },
  { key: '/admin/analytics/insertion', icon: <PieChartOutlined />, label: 'Insertion Analytics' },
  { key: '/admin/partnerships', icon: <TeamOutlined />, label: 'Partnerships' },
  { key: '/admin/settings', icon: <SettingOutlined />, label: 'Settings' },
];

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { isDarkMode, toggleTheme } = useThemeStore();

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: () => {
        logout();
        navigate('/login');
      },
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        theme={isDarkMode ? 'dark' : 'light'}
        breakpoint="lg"
        collapsedWidth="0"
        style={{ borderRight: '1px solid', borderColor: isDarkMode ? '#2d3748' : '#e5e7eb' }}
      >
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid', borderColor: isDarkMode ? '#2d3748' : '#e5e7eb' }}>
          <BuildOutlined style={{ fontSize: 24, color: isDarkMode ? '#60a5fa' : '#1a56db' }} />
          <span style={{ marginLeft: 8, fontWeight: 600, color: isDarkMode ? '#f9fafb' : '#1f2937' }}>ISET</span>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={adminMenuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0, marginTop: 8 }}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: '0 24px', background: isDarkMode ? '#1f2937' : '#ffffff', borderBottom: '1px solid', borderColor: isDarkMode ? '#2d3748' : '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {isDarkMode ? <MoonOutlined /> : <SunOutlined />}
              <Switch size="small" checked={isDarkMode} onChange={() => toggleTheme()} />
            </span>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Avatar style={{ cursor: 'pointer' }} icon={<UserOutlined />} />
            </Dropdown>
          </div>
        </Header>
        <Content style={{ margin: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}