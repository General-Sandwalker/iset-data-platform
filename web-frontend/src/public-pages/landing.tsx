import { useState, useEffect, useRef } from 'react';
import {
  Card, Typography, Button, Row, Col, theme, Space, Spin, Tag,
} from 'antd';
import {
  useNavigate,
} from 'react-router-dom';
import {
  LineChartOutlined, TeamOutlined, FileTextOutlined, ApartmentOutlined,
  ArrowRightOutlined, RocketOutlined, DatabaseOutlined,
  ThunderboltOutlined, BranchesOutlined, CheckCircleOutlined,
  DashboardOutlined, MailOutlined, PhoneOutlined, EnvironmentOutlined,
} from '@ant-design/icons';
import { apiClient, type ApiResponse } from '../core/api/client';

const { Title, Text, Paragraph } = Typography;

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  highlights: string[];
}

interface LandingStats {
  students: number;
  tables: number;
  surveys: number;
  dashboards: number;
}

interface PublicDashboard {
  id: string;
  title: string;
  description: string | null;
  slug: string;
}

export default function LandingPage() {
  const navigate = useNavigate();
  const { token } = theme.useToken();
  const [scrollY, setScrollY] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const heroRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState<LandingStats | null>(null);
  const [dashboards, setDashboards] = useState<PublicDashboard[]>([]);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    const handleMouseMove = (e: MouseEvent) => {
      if (heroRef.current) {
        const rect = heroRef.current.getBoundingClientRect();
        setMousePosition({
          x: (e.clientX - rect.left - rect.width / 2) / 20,
          y: (e.clientY - rect.top - rect.height / 2) / 20,
        });
      }
    };
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get<ApiResponse<LandingStats>>('/public/stats');
        if (res.data.success && res.data.data) setStats(res.data.data);
      } catch { /* fallback to null */ }
    })();
    (async () => {
      try {
        const res = await apiClient.get<ApiResponse<PublicDashboard[]>>('/public/dashboards');
        if (res.data.success && res.data.data) setDashboards(res.data.data);
      } catch { /* no dashboards */ }
    })();
  }, []);

  const features: Feature[] = [
    {
      icon: <LineChartOutlined />,
      title: 'Academic Analytics',
      description: 'Comprehensive tracking of enrollments, success rates, and student evolution across all filieres and academic years.',
      color: '#6366f1',
      highlights: ['Real-time dashboards', 'Predictive insights', 'Multi-dimensional reports'],
    },
    {
      icon: <TeamOutlined />,
      title: 'Alumni Tracking',
      description: 'Monitor professional insertion rates, employment delays, and career trajectories of graduates over time.',
      color: '#10b981',
      highlights: ['Employment analytics', 'Career progression', 'Sector distribution'],
    },
    {
      icon: <FileTextOutlined />,
      title: 'Dynamic Surveys',
      description: 'Create and distribute surveys powered by AI. Collect data directly into your structured database.',
      color: '#a855f7',
      highlights: ['AI-assisted creation', 'Automated analysis', 'Multi-format exports'],
    },
    {
      icon: <DatabaseOutlined />,
      title: 'Visual Database',
      description: 'Build and manage your data structure visually. Create tables, fields, and relationships without code.',
      color: '#22d3ee',
      highlights: ['Drag-and-drop builder', 'Auto migrations', 'Relationship mapping'],
    },
    {
      icon: <BranchesOutlined />,
      title: 'Partnerships',
      description: 'Manage company partnerships, job offers, and internship opportunities in one unified platform.',
      color: '#f59e0b',
      highlights: ['Company management', 'Offer tracking', 'Collaboration history'],
    },
    {
      icon: <ThunderboltOutlined />,
      title: 'AI-Powered',
      description: 'Leverage Groq AI to generate surveys, charts, and comprehensive reports from your data.',
      color: '#ec4899',
      highlights: ['Smart suggestions', 'Natural language queries', 'Automated summaries'],
    },
  ];

  const statItems = stats
    ? [
        { value: stats.students.toString(), suffix: '', label: 'Utilisateurs' },
        { value: stats.tables.toString(), suffix: '', label: 'Tables de Données' },
        { value: stats.surveys.toString(), suffix: '', label: 'Enquêtes Publiées' },
        { value: stats.dashboards.toString(), suffix: '', label: 'Tableaux de Bord' },
      ]
    : [
        { value: '—', suffix: '', label: 'Utilisateurs' },
        { value: '—', suffix: '', label: 'Tables de Données' },
        { value: '—', suffix: '', label: 'Enquêtes Publiées' },
        { value: '—', suffix: '', label: 'Tableaux de Bord' },
      ];

  return (
    <div style={{ minHeight: '100vh', background: token.colorBgBase, overflow: 'hidden' }}>
      {/* Hero Section */}
      <div
        ref={heroRef}
        style={{
          position: 'relative',
          minHeight: '90vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          background: token.colorBgBase,
        }}
      >
        {/* Animated Background */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `
                linear-gradient(${token.colorBorderSecondary}40 1px, transparent 1px),
                linear-gradient(90deg, ${token.colorBorderSecondary}40 1px, transparent 1px)
              `,
              backgroundSize: '60px 60px',
              maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
              WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
              transform: `translateY(${scrollY * 0.3}px)`,
            }}
          />
          <div
            style={{
              position: 'absolute', top: '10%', left: '10%', width: 400, height: 400,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
              transform: `translate(${mousePosition.x}px, ${mousePosition.y}px)`,
              transition: 'transform 0.5s ease-out',
              animation: 'float 8s ease-in-out infinite',
            }}
          />
          <div
            style={{
              position: 'absolute', bottom: '20%', right: '10%', width: 500, height: 500,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(34,211,238,0.1) 0%, transparent 70%)',
              transform: `translate(${-mousePosition.x}px, ${-mousePosition.y}px)`,
              transition: 'transform 0.5s ease-out',
              animation: 'float 10s ease-in-out infinite reverse',
            }}
          />
          <div
            style={{
              position: 'absolute', top: '50%', right: '20%', width: 300, height: 300,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)',
              transform: `translate(${-mousePosition.x * 0.5}px, ${mousePosition.y * 0.5}px)`,
              transition: 'transform 0.5s ease-out',
              animation: 'float 12s ease-in-out infinite',
            }}
          />
        </div>

        {/* Hero Content */}
        <div style={{ position: 'relative', zIndex: 10, maxWidth: 900, margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '8px 20px', borderRadius: 100,
              background: `${token.colorPrimary}15`, border: `1px solid ${token.colorPrimary}30`,
              marginBottom: 32, animation: 'fadeIn 0.8s ease forwards',
            }}
          >
            <RocketOutlined style={{ color: token.colorPrimary }} />
            <Text strong style={{ color: token.colorPrimary, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase' }}>
              Observatoire Numérique
            </Text>
          </div>

          <Title
            level={1}
            style={{
              fontSize: 64, fontWeight: 800, lineHeight: 1.1, marginBottom: 24,
              background: `linear-gradient(135deg, ${token.colorText} 0%, ${token.colorPrimary} 50%, ${token.colorInfo} 100%)`,
              backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              animation: 'fadeIn 1s ease forwards',
            }}
          >
            ISET Tozeur<br />Digital Observatory
          </Title>

          <Paragraph
            style={{
              fontSize: 20, color: token.colorTextSecondary, lineHeight: 1.6,
              maxWidth: 640, margin: '0 auto 40px',
              animation: 'fadeIn 1s ease 0.2s forwards', opacity: 0,
            }}
          >
            Plateforme unifiée de gestion des données académiques, suivi des diplômés,
            analyse de l'insertion professionnelle et intelligence artificielle au service
            de l'observation stratégique.
          </Paragraph>

          <Space size={16} style={{ animation: 'fadeIn 1s ease 0.4s forwards', opacity: 0 }}>
            <Button
              type="primary" size="large"
              icon={<ArrowRightOutlined />} iconPosition="end"
              onClick={() => navigate('/login')}
              style={{
                height: 52, paddingInline: 32, fontSize: 16, fontWeight: 600, borderRadius: 12,
                background: `linear-gradient(135deg, ${token.colorPrimary} 0%, ${token.colorInfo} 100%)`,
                border: 'none', boxShadow: `0 8px 32px ${token.colorPrimary}40`,
              }}
            >
              Accéder à la Plateforme
            </Button>
            <Button
              size="large" onClick={() => navigate('/login')}
              style={{ height: 52, paddingInline: 32, fontSize: 16, fontWeight: 600, borderRadius: 12, borderColor: token.colorBorder }}
            >
              En Savoir Plus
            </Button>
          </Space>

          <div style={{ position: 'absolute', bottom: -80, left: '50%', transform: 'translateX(-50%)', animation: 'float 2s ease-in-out infinite' }}>
            <div style={{ width: 24, height: 40, borderRadius: 12, border: `2px solid ${token.colorBorder}`, position: 'relative' }}>
              <div style={{ position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)', width: 4, height: 8, borderRadius: 2, background: token.colorPrimary, animation: 'float 1.5s ease-in-out infinite' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div
        style={{
          padding: '80px 24px',
          background: token.colorBgContainer,
          borderTop: `1px solid ${token.colorBorderSecondary}`,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Row gutter={[48, 32]} justify="center">
            {statItems.map((stat, index) => (
              <Col xs={12} sm={6} key={stat.label}>
                <div style={{ textAlign: 'center', animation: `fadeIn 0.5s ease ${index * 0.1}s forwards`, opacity: 0 }}>
                  <div
                    style={{
                      fontSize: 56, fontWeight: 800,
                      background: `linear-gradient(135deg, ${token.colorPrimary}, ${token.colorInfo})`,
                      backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                      lineHeight: 1, marginBottom: 8,
                    }}
                  >
                    {stat.value}
                    <span style={{ fontSize: 32 }}>{stat.suffix}</span>
                  </div>
                  <Text style={{ color: token.colorTextSecondary, fontSize: 14, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1 }}>
                    {stat.label}
                  </Text>
                </div>
              </Col>
            ))}
          </Row>
        </div>
      </div>

      {/* Features Section */}
      <div style={{ padding: '100px 24px', background: token.colorBgBase }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <Text style={{ color: token.colorPrimary, fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16, display: 'block' }}>
              Fonctionnalités
            </Text>
            <Title level={2} style={{ fontSize: 42, fontWeight: 700, marginBottom: 16, color: token.colorText }}>
              Tout ce dont vous avez besoin
            </Title>
            <Paragraph style={{ fontSize: 16, color: token.colorTextSecondary, maxWidth: 560, margin: '0 auto' }}>
              Une suite complète d'outils pour gérer les données académiques, suivre les parcours des diplômés et générer des insights exploitables.
            </Paragraph>
          </div>

          <Row gutter={[24, 24]}>
            {features.map((feature) => (
              <Col xs={24} sm={12} lg={8} key={feature.title}>
                <Card
                  hoverable
                  style={{
                    height: '100%', borderRadius: 16,
                    border: `1px solid ${token.colorBorderSecondary}`,
                    background: token.colorBgContainer,
                    position: 'relative', overflow: 'hidden', transition: 'all 0.4s ease',
                  }}
                  styles={{ body: { padding: '28px 28px 32px', height: '100%', display: 'flex', flexDirection: 'column' } }}
                >
                  <div
                    style={{
                      width: 56, height: 56, borderRadius: 14,
                      background: `${feature.color}15`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginBottom: 20, fontSize: 24, color: feature.color,
                    }}
                  >
                    {feature.icon}
                  </div>
                  <Title level={4} style={{ marginBottom: 12, color: token.colorText }}>{feature.title}</Title>
                  <Paragraph style={{ color: token.colorTextSecondary, lineHeight: 1.6, marginBottom: 20, flex: 1 }}>
                    {feature.description}
                  </Paragraph>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {feature.highlights.map((h) => (
                      <div key={h} style={{ display: 'flex', alignItems: 'center', gap: 8, color: token.colorTextSecondary, fontSize: 13 }}>
                        <CheckCircleOutlined style={{ color: feature.color, fontSize: 12 }} />
                        {h}
                      </div>
                    ))}
                  </div>
                  <div
                    style={{
                      position: 'absolute', top: 0, right: 0, width: 120, height: 120,
                      background: `radial-gradient(circle at top right, ${feature.color}10, transparent 70%)`,
                      pointerEvents: 'none',
                    }}
                  />
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </div>

      {/* Public Dashboards Section */}
      {dashboards.length > 0 && (
        <div
          style={{
            padding: '100px 24px',
            background: token.colorBgContainer,
            borderTop: `1px solid ${token.colorBorderSecondary}`,
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 64 }}>
              <Text style={{ color: token.colorPrimary, fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16, display: 'block' }}>
                Données Publiques
              </Text>
              <Title level={2} style={{ fontSize: 42, fontWeight: 700, marginBottom: 16, color: token.colorText }}>
                Tableaux de Bord Publics
              </Title>
              <Paragraph style={{ fontSize: 16, color: token.colorTextSecondary, maxWidth: 560, margin: '0 auto' }}>
                Explorez nos données ouvertes et tableaux de bord publiés par l'observatoire.
              </Paragraph>
            </div>

            <Row gutter={[24, 24]}>
              {dashboards.map((db) => (
                <Col xs={24} sm={12} lg={8} key={db.id}>
                  <Card
                    hoverable
                    onClick={() => navigate(`/public/dashboards/${db.slug}`)}
                    style={{
                      height: '100%', borderRadius: 16,
                      border: `1px solid ${token.colorBorderSecondary}`,
                      background: token.colorBgBase,
                      cursor: 'pointer',
                    }}
                    styles={{ body: { padding: 24 } }}
                  >
                    <Space style={{ marginBottom: 12 }}>
                      <DashboardOutlined style={{ fontSize: 24, color: token.colorPrimary }} />
                      <Title level={4} style={{ margin: 0 }}>{db.title}</Title>
                    </Space>
                    {db.description && (
                      <Paragraph style={{ color: token.colorTextSecondary, lineHeight: 1.6, marginBottom: 16 }}>
                        {db.description}
                      </Paragraph>
                    )}
                    <Tag color="blue">Public</Tag>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        </div>
      )}

      {/* CTA Section */}
      <div
        style={{
          padding: '100px 24px',
          background: token.colorBgBase,
        }}
      >
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          <div
            style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              width: 500, height: 300,
              background: `radial-gradient(ellipse, ${token.colorPrimary}15, transparent 70%)`,
              pointerEvents: 'none',
            }}
          />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div
              style={{
                width: 80, height: 80, borderRadius: '50%',
                background: `linear-gradient(135deg, ${token.colorPrimary}, ${token.colorInfo})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 32px', fontSize: 32, color: 'white',
                boxShadow: `0 16px 48px ${token.colorPrimary}40`,
              }}
            >
              <ApartmentOutlined />
            </div>
            <Title level={2} style={{ fontSize: 40, fontWeight: 700, marginBottom: 16, color: token.colorText }}>
              Prêt à Transformer la<br />Gestion de vos Données ?
            </Title>
            <Paragraph style={{ fontSize: 16, color: token.colorTextSecondary, marginBottom: 40 }}>
              Rejoignez ISET Tozeur dans la construction du futur de l'intelligence académique. Commencez en quelques minutes.
            </Paragraph>
            <Button
              type="primary" size="large"
              icon={<ArrowRightOutlined />} iconPosition="end"
              onClick={() => navigate('/login')}
              style={{
                height: 56, paddingInline: 40, fontSize: 16, fontWeight: 600, borderRadius: 14,
                background: `linear-gradient(135deg, ${token.colorPrimary}, ${token.colorInfo})`,
                border: 'none', boxShadow: `0 8px 32px ${token.colorPrimary}40`,
              }}
            >
              Commencer Maintenant
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '60px 24px 40px',
          background: token.colorBgContainer,
          borderTop: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Row gutter={[48, 32]}>
            <Col xs={24} md={8}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <ApartmentOutlined style={{ fontSize: 24, color: token.colorPrimary }} />
                <Text strong style={{ fontSize: 18, color: token.colorText }}>ISET Tozeur</Text>
              </div>
              <Paragraph style={{ color: token.colorTextSecondary, lineHeight: 1.6, maxWidth: 300 }}>
                Observatoire Numérique — Plateforme de gestion et d'analyse des données académiques et de l'insertion professionnelle.
              </Paragraph>
            </Col>
            <Col xs={24} md={8}>
              <Title level={5} style={{ marginBottom: 16, color: token.colorText }}>Contact</Title>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: token.colorTextSecondary }}>
                  <EnvironmentOutlined style={{ color: token.colorPrimary }} />
                  <Text style={{ color: token.colorTextSecondary }}>Route de El Hamma, 2200 Tozeur, Tunisie</Text>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: token.colorTextSecondary }}>
                  <PhoneOutlined style={{ color: token.colorPrimary }} />
                  <Text style={{ color: token.colorTextSecondary }}>+216 76 450 000</Text>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: token.colorTextSecondary }}>
                  <MailOutlined style={{ color: token.colorPrimary }} />
                  <Text style={{ color: token.colorTextSecondary }}>contact@iset-tozeur.tn</Text>
                </div>
              </div>
            </Col>
            <Col xs={24} md={8}>
              <Title level={5} style={{ marginBottom: 16, color: token.colorText }}>Liens Utiles</Title>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <a onClick={() => navigate('/login')} style={{ color: token.colorTextSecondary, cursor: 'pointer' }}>Connexion</a>
                <a href="https://www.iset-tozeur.rnu.tn" target="_blank" rel="noopener noreferrer" style={{ color: token.colorTextSecondary }}>Site ISET Tozeur</a>
                <a href="https://www.univtg.rnu.tn" target="_blank" rel="noopener noreferrer" style={{ color: token.colorTextSecondary }}>Université de Tozeur</a>
              </div>
            </Col>
          </Row>
          <div
            style={{
              marginTop: 40, paddingTop: 20,
              borderTop: `1px solid ${token.colorBorderSecondary}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16,
            }}
          >
            <Text style={{ color: token.colorTextTertiary, fontSize: 13 }}>
              &copy; {new Date().getFullYear()} ISET Tozeur — Observatoire Numérique. Tous droits réservés.
            </Text>
            <Text style={{ color: token.colorTextTertiary, fontSize: 13 }}>
              Propulsé par l'intelligence artificielle
            </Text>
          </div>
        </div>
      </div>
    </div>
  );
}
