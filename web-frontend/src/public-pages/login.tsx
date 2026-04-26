import { Form, Input, Button, Card, Typography, Alert } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { apiClient } from '../../core/api/client';
import { useAuthStore } from '../../core/stores/auth.store';

const { Title } = Typography;

interface LoginForm {
  identifier: string;
  password: string;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFinish = async (values: LoginForm) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.post('/auth/login', values);
      if (response.data.success) {
        login(response.data.data.token, response.data.data.user);
        navigate('/admin');
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
        <Form name="login" onFinish={onFinish} layout="vertical">
          <Form.Item name="identifier" rules={[{ required: true, message: 'Please enter your CIN or username' }]}>
            <Input prefix={<UserOutlined />} placeholder="CIN or Username" size="large" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: 'Please enter your password' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Password" size="large" />
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