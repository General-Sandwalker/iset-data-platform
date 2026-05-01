import { useState } from 'react';
import { Card, Typography, Form, Input, Button, Row, Col, message, Divider, theme } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined, SaveOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../core/stores/auth.store';
import { apiClient, type ApiResponse } from '../../core/api/client';

const { Title, Text } = Typography;

interface ProfileFormValues {
  firstName: string;
  lastName: string;
  email: string;
}

interface PasswordFormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function TeacherProfilePage() {
  const { token } = theme.useToken();
  const { user, setUser } = useAuthStore();
  const [profileForm] = Form.useForm<ProfileFormValues>();
  const [passwordForm] = Form.useForm<PasswordFormValues>();
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const handleUpdateProfile = async (values: ProfileFormValues) => {
    setSavingProfile(true);
    try {
      const res = await apiClient.patch<ApiResponse<typeof user>>('/auth/me', values);
      if (res.data.success && res.data.data) {
        setUser(res.data.data);
        message.success('Profile updated successfully');
      }
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message || 'Failed to update profile');
    } finally { setSavingProfile(false); }
  };

  const handleChangePassword = async (values: PasswordFormValues) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error('Passwords do not match');
      return;
    }
    setSavingPassword(true);
    try {
      await apiClient.post('/auth/change-password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      message.success('Password changed successfully');
      passwordForm.resetFields();
    } catch (err: any) {
      const code = err?.response?.data?.error?.code;
      if (code === 'INVALID_PASSWORD') {
        message.error('Current password is incorrect');
      } else {
        message.error(err?.response?.data?.error?.message || 'Failed to change password');
      }
    } finally { setSavingPassword(false); }
  };

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <Title level={3} style={{ marginBottom: 4, color: token.colorText, fontWeight: 700 }}>My Profile</Title>
        <Text style={{ color: token.colorTextSecondary }}>Manage your personal information and security</Text>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={14}>
          <Card title={<span><UserOutlined style={{ marginRight: 8 }} />Personal Information</span>} style={{ borderRadius: 16, border: `1px solid ${token.colorBorderSecondary}` }}>
            <Form
              form={profileForm}
              layout="vertical"
              initialValues={{ firstName: user?.firstName || '', lastName: user?.lastName || '', email: user?.email || '' }}
              onFinish={handleUpdateProfile}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="First Name" name="firstName">
                    <Input prefix={<UserOutlined />} placeholder="First name" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Last Name" name="lastName">
                    <Input prefix={<UserOutlined />} placeholder="Last name" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item label="Email" name="email">
                <Input prefix={<MailOutlined />} placeholder="Email address" />
              </Form.Item>
              {user?.cin && (
                <Form.Item label="CIN">
                  <Input value={user.cin} disabled prefix={<LockOutlined />} />
                </Form.Item>
              )}
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={savingProfile} icon={<SaveOutlined />}>Save Changes</Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card title={<span><LockOutlined style={{ marginRight: 8 }} />Change Password</span>} style={{ borderRadius: 16, border: `1px solid ${token.colorBorderSecondary}` }}>
            <Form form={passwordForm} layout="vertical" onFinish={handleChangePassword}>
              <Form.Item label="Current Password" name="currentPassword" rules={[{ required: true, message: 'Enter your current password' }]}>
                <Input.Password placeholder="Current password" />
              </Form.Item>
              <Form.Item label="New Password" name="newPassword" rules={[{ required: true, message: 'Enter a new password' }, { min: 8, message: 'Password must be at least 8 characters' }]}>
                <Input.Password placeholder="New password" />
              </Form.Item>
              <Form.Item label="Confirm New Password" name="confirmPassword" dependencies={['newPassword']} rules={[
                { required: true, message: 'Confirm your new password' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
                    return Promise.reject(new Error('Passwords do not match'));
                  },
                }),
              ]}>
                <Input.Password placeholder="Confirm new password" />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={savingPassword} icon={<LockOutlined />}>Change Password</Button>
              </Form.Item>
            </Form>
          </Card>

          <Card style={{ marginTop: 24, borderRadius: 16, border: `1px solid ${token.colorBorderSecondary}` }}>
            <Title level={5} style={{ marginBottom: 12 }}>Account Info</Title>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div><Text type="secondary">Role:</Text> <Text strong style={{ textTransform: 'capitalize' }}>{user?.role?.replace('_', ' ')}</Text></div>
              <div><Text type="secondary">CIN:</Text> <Text strong>{user?.cin || '—'}</Text></div>
              <div><Text type="secondary">Email:</Text> <Text strong>{user?.email || '—'}</Text></div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
