import { Form, Input, Button, Card, Typography, Alert, Space, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import { apiClient } from '../../core/api/client';
import { useAuthStore } from '../../core/stores/auth.store';

const { Title } = Typography;

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
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', padding: 24 }}>
      <Card style={{ width: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={3}>ISET Tozeur Observatory</Title>
          <Title level={5} type="secondary">Sign In</Title>
        </div>
        {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}
        <Form name="login" onFinish={onFinish} layout="vertical" validateTrigger="onBlur">
          <Form.Item
            name="identifier"
            rules={[{ required: true, message: 'Please enter your CIN or username' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="CIN or Username" size="large" />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[
              { required: true, message: 'Please enter your password' },
              { min: 6, message: 'Password must be at least 6 characters' },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Password" size="large" />
          </Form.Item>
          <Form.Item style={{ textAlign: 'right' }}>
            <Link to="/forgot-password">Forgot password?</Link>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block size="large">
              Sign In
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}