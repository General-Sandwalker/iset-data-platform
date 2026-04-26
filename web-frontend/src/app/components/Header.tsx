import { Layout, Button, theme } from 'antd';
import { useNavigate, Link } from 'react-router-dom';
import { ApartmentOutlined } from '@ant-design/icons';

const { Header } = Layout;

export default function PublicHeader() {
  const navigate = useNavigate();
  const { token } = theme.useToken();

  return (
    <Header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 40px',
        height: 72,
        background: token.colorBgContainer,
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      <Link
        to="/"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          textDecoration: 'none',
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: `linear-gradient(135deg, ${token.colorPrimary}, ${token.colorInfo})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ApartmentOutlined style={{ fontSize: 20, color: 'white' }} />
        </div>
        <span
          style={{
            fontWeight: 700,
            fontSize: 16,
            color: token.colorText,
            letterSpacing: '-0.01em',
          }}
        >
          ISET Tozeur
        </span>
      </Link>
      <Button
        type="primary"
        onClick={() => navigate('/login')}
        style={{
          height: 40,
          paddingInline: 24,
          borderRadius: 10,
          fontWeight: 600,
        }}
      >
        Login
      </Button>
    </Header>
  );
}