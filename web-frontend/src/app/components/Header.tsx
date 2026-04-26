import { Layout, Button, Space } from 'antd';
import { useNavigate } from 'react-router-dom';

const { Header } = Layout;

export default function PublicHeader() {
  const navigate = useNavigate();

  return (
    <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 24px', background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
      <Space>
        <Button onClick={() => navigate('/login')}>Login</Button>
      </Space>
    </Header>
  );
}