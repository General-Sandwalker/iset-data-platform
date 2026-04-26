import {
  Card,
  Typography,
  Row,
  Col,
  Statistic,
  theme,
  Space,
  Button,
  Progress,
} from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  FileTextOutlined,
  DashboardOutlined,
  PlusOutlined,
  UploadOutlined,
  ArrowRightOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../core/api/client';

const { Title, Text } = Typography;

export default function DashboardPage() {
  const { token } = theme.useToken();
  const navigate = useNavigate();

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['users-summary'],
    queryFn: async () => {
      const response = await apiClient.get('/users', {
        params: { limit: 1 },
      });
      return response.data;
    },
  });

  const totalUsers = usersData?.meta?.total || 0;

  const stats = [
    {
      title: 'Total Users',
      value: totalUsers,
      icon: <UserOutlined style={{ fontSize: 24 }} />,
      color: '#6366f1',
      bg: 'rgba(99, 102, 241, 0.1)',
      link: '/admin/users',
    },
    {
      title: 'Active Surveys',
      value: 0,
      icon: <FileTextOutlined style={{ fontSize: 24 }} />,
      color: '#a855f7',
      bg: 'rgba(168, 85, 247, 0.1)',
      link: '/admin/surveys',
    },
    {
      title: 'Data Tables',
      value: 0,
      icon: <DashboardOutlined style={{ fontSize: 24 }} />,
      color: '#22d3ee',
      bg: 'rgba(34, 211, 238, 0.1)',
      link: '/admin/database',
    },
    {
      title: 'Dashboards',
      value: 0,
      icon: <TeamOutlined style={{ fontSize: 24 }} />,
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.1)',
      link: '/admin/visualizations/dashboards',
    },
  ];

  const quickActions = [
    { label: 'Add User', icon: <PlusOutlined />, path: '/admin/users' },
    { label: 'Import Data', icon: <UploadOutlined />, path: '/admin/import' },
    { label: 'Create Survey', icon: <FileTextOutlined />, path: '/admin/surveys' },
    { label: 'New Chart', icon: <DashboardOutlined />, path: '/admin/visualizations/charts' },
  ];

  const recentActivity = [
    { action: 'New user registered', time: '2 minutes ago', type: 'user' },
    { action: 'Survey response received', time: '15 minutes ago', type: 'survey' },
    { action: 'Dashboard published', time: '1 hour ago', type: 'dashboard' },
    { action: 'Data import completed', time: '3 hours ago', type: 'import' },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <Title
          level={3}
          style={{
            marginBottom: 4,
            color: token.colorText,
            fontWeight: 700,
          }}
        >
          Dashboard
        </Title>
        <Text style={{ color: token.colorTextSecondary }}>
          Welcome back! Here's what's happening with your observatory.
        </Text>
      </div>

      {/* Stats Grid */}
      <Row gutter={[20, 20]} style={{ marginBottom: 28 }}>
        {stats.map((stat) => (
          <Col xs={24} sm={12} lg={6} key={stat.title}>
            <Card
              hoverable
              style={{
                borderRadius: 16,
                border: `1px solid ${token.colorBorderSecondary}`,
                background: token.colorBgContainer,
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
              }}
              styles={{ body: { padding: '20px 24px' } }}
              onClick={() => navigate(stat.link)}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: 100,
                  height: 100,
                  background: `radial-gradient(circle at top right, ${stat.bg}, transparent 70%)`,
                  pointerEvents: 'none',
                }}
              />
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <Text
                    style={{
                      color: token.colorTextSecondary,
                      fontSize: 13,
                      marginBottom: 8,
                      display: 'block',
                    }}
                  >
                    {stat.title}
                  </Text>
                  <Statistic
                    value={stat.value}
                    valueStyle={{
                      fontWeight: 700,
                      fontSize: 32,
                      color: token.colorText,
                      lineHeight: 1,
                    }}
                  />
                </div>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: stat.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: stat.color,
                  }}
                >
                  {stat.icon}
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[20, 20]}>
        {/* Quick Actions */}
        <Col xs={24} lg={8}>
          <Card
            style={{
              borderRadius: 16,
              border: `1px solid ${token.colorBorderSecondary}`,
              height: '100%',
            }}
            styles={{ body: { padding: 24 } }}
          >
            <Title
              level={5}
              style={{ marginBottom: 16, color: token.colorText }}
            >
              Quick Actions
            </Title>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {quickActions.map((action) => (
                <Button
                  key={action.label}
                  type="text"
                  block
                  onClick={() => navigate(action.path)}
                  style={{
                    height: 48,
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingInline: 16,
                    background: token.colorBgSpotlight,
                    color: token.colorText,
                    fontWeight: 500,
                  }}
                  icon={action.icon}
                  iconPosition="start"
                >
                  {action.label}
                  <RightOutlined style={{ color: token.colorTextTertiary }} />
                </Button>
              ))}
            </div>
          </Card>
        </Col>

        {/* Recent Activity */}
        <Col xs={24} lg={16}>
          <Card
            style={{
              borderRadius: 16,
              border: `1px solid ${token.colorBorderSecondary}`,
              height: '100%',
            }}
            styles={{ body: { padding: 24 } }}
          >
            <Title
              level={5}
              style={{ marginBottom: 20, color: token.colorText }}
            >
              Recent Activity
            </Title>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {recentActivity.map((item, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    padding: '12px 16px',
                    borderRadius: 12,
                    background: token.colorBgSpotlight,
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background:
                        item.type === 'user'
                          ? 'rgba(99, 102, 241, 0.1)'
                          : item.type === 'survey'
                          ? 'rgba(168, 85, 247, 0.1)'
                          : item.type === 'dashboard'
                          ? 'rgba(16, 185, 129, 0.1)'
                          : 'rgba(34, 211, 238, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color:
                        item.type === 'user'
                          ? '#6366f1'
                          : item.type === 'survey'
                          ? '#a855f7'
                          : item.type === 'dashboard'
                          ? '#10b981'
                          : '#22d3ee',
                    }}
                  >
                    {item.type === 'user' && <UserOutlined />}
                    {item.type === 'survey' && <FileTextOutlined />}
                    {item.type === 'dashboard' && <DashboardOutlined />}
                    {item.type === 'import' && <UploadOutlined />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: token.colorText,
                        fontWeight: 500,
                        display: 'block',
                      }}
                    >
                      {item.action}
                    </Text>
                    <Text
                      style={{
                        color: token.colorTextTertiary,
                        fontSize: 12,
                      }}
                    >
                      {item.time}
                    </Text>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}