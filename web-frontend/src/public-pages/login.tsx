import {
  Form,
  Input,
  Button,
  Card,
  Typography,
  Alert,
  message,
  theme,
} from 'antd';
import {
  UserOutlined,
  LockOutlined,
  ApartmentOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { apiClient } from '../core/api/client';
import { useAuthStore } from '../core/stores/auth.store';

const { Title, Text } = Typography;

interface LoginForm {
  identifier: string;
  password: string;
}

const roleDashboard: Record<string, string> = {
  super_admin: '/admin',
  admin: '/admin',
  responsable_observatoire: '/admin',
  enseignant: '/teacher',
  etudiant: '/student',
  alumni: '/alumni',
};

export default function LoginPage() {
  const navigate = useNavigate();
  const { login: storeLogin } = useAuthStore();
  const { token } = theme.useToken();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFinish = async (values: LoginForm) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.post('/auth/login', values);
      if (response.data.success) {
        const user = response.data.data.user;
        storeLogin(response.data.data.token, user);
        const redirect = roleDashboard[user.role] || '/admin';
        navigate(redirect);
      } else {
        setError(response.data.error?.message || 'Login failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 'calc(100vh - 72px - 69px)',
        padding: '48px 24px',
        background: `radial-gradient(ellipse at top, ${token.colorBgSpotlight} 0%, ${token.colorBgBase} 50%)`,
        position: 'relative',
      }}
    >
      {/* Background Glow */}
      <div
        style={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '600px',
          height: '400px',
          background: `radial-gradient(ellipse, ${token.colorPrimary}10, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      <Card
        style={{
          width: 440,
          borderRadius: 20,
          border: `1px solid ${token.colorBorderSecondary}`,
          boxShadow: `0 24px 64px ${token.colorBgSpotlight}`,
          background: token.colorBgContainer,
          position: 'relative',
          overflow: 'hidden',
        }}
        styles={{
          body: {
            padding: '48px 40px',
          },
        }}
      >
        {/* Decorative Top Border */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: `linear-gradient(90deg, ${token.colorPrimary}, ${token.colorInfo}, ${token.colorPrimary})`,
          }}
        />

        {/* Logo and Title */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: `linear-gradient(135deg, ${token.colorPrimary}, ${token.colorInfo})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: `0 16px 40px ${token.colorPrimary}30`,
            }}
          >
            <ApartmentOutlined style={{ fontSize: 32, color: 'white' }} />
          </div>
          <Title
            level={3}
            style={{
              marginBottom: 4,
              color: token.colorText,
              fontWeight: 700,
            }}
          >
            Welcome Back
          </Title>
          <Text style={{ color: token.colorTextSecondary }}>
            Sign in to access the Digital Observatory
          </Text>
        </div>

        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            style={{
              marginBottom: 24,
              borderRadius: 12,
              background: `${token.colorError}10`,
              border: `1px solid ${token.colorError}30`,
            }}
          />
        )}

        <Form
          name="login"
          onFinish={onFinish}
          layout="vertical"
          validateTrigger="onBlur"
          size="large"
        >
          <Form.Item
            name="identifier"
            rules={[
              { required: true, message: 'Please enter your CIN or username' },
            ]}
          >
            <Input
              prefix={<UserOutlined style={{ color: token.colorTextTertiary }} />}
              placeholder="CIN or Username"
              style={{
                borderRadius: 12,
                height: 50,
                background: token.colorBgSpotlight,
              }}
            />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[
              { required: true, message: 'Please enter your password' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: token.colorTextTertiary }} />}
              placeholder="Password"
              style={{
                borderRadius: 12,
                height: 50,
                background: token.colorBgSpotlight,
              }}
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 16, marginTop: 32 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              style={{
                height: 50,
                borderRadius: 12,
                fontWeight: 600,
                fontSize: 15,
                background: `linear-gradient(135deg, ${token.colorPrimary}, ${token.colorInfo})`,
                border: 'none',
                boxShadow: `0 8px 24px ${token.colorPrimary}30`,
              }}
            >
              Sign In
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Text style={{ color: token.colorTextTertiary, fontSize: 12 }}>
            Protected by institutional security protocols
          </Text>
        </div>
      </Card>
    </div>
  );
}