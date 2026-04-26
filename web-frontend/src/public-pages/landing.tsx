import { useState, useEffect, useRef } from 'react';
import {
  Card,
  Typography,
  Button,
  Row,
  Col,
  theme,
  Space,
} from 'antd';
import {
  useNavigate,
  Link,
} from 'react-router-dom';
import {
  LineChartOutlined,
  TeamOutlined,
  FileTextOutlined,
  ApartmentOutlined,
  ArrowRightOutlined,
  RocketOutlined,
  DatabaseOutlined,
  SafetyOutlined,
  ThunderboltOutlined,
  GlobalOutlined,
  BranchesOutlined,
  CrownOutlined,
  EyeOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  highlights: string[];
}

interface Stat {
  value: string;
  label: string;
  suffix: string;
}

export default function LandingPage() {
  const navigate = useNavigate();
  const { token } = theme.useToken();
  const [scrollY, setScrollY] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const heroRef = useRef<HTMLDivElement>(null);

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

  const features: Feature[] = [
    {
      icon: <LineChartOutlined />,
      title: 'Academic Analytics',
      description:
        'Comprehensive tracking of enrollments, success rates, and student evolution across all filieres and academic years.',
      color: '#6366f1',
      highlights: [
        'Real-time dashboards',
        'Predictive insights',
        'Multi-dimensional reports',
      ],
    },
    {
      icon: <TeamOutlined />,
      title: 'Alumni Tracking',
      description:
        'Monitor professional insertion rates, employment delays, and career trajectories of graduates over time.',
      color: '#10b981',
      highlights: [
        'Employment analytics',
        'Career progression',
        'Sector distribution',
      ],
    },
    {
      icon: <FileTextOutlined />,
      title: 'Dynamic Surveys',
      description:
        'Create and distribute surveys powered by AI. Collect data directly into your structured database.',
      color: '#a855f7',
      highlights: [
        'AI-assisted creation',
        'Automated analysis',
        'Multi-format exports',
      ],
    },
    {
      icon: <DatabaseOutlined />,
      title: 'Visual Database',
      description:
        'Build and manage your data structure visually. Create tables, fields, and relationships without code.',
      color: '#22d3ee',
      highlights: [
        'Drag-and-drop builder',
        'Auto migrations',
        'Relationship mapping',
      ],
    },
    {
      icon: <BranchesOutlined />,
      title: 'Partnerships',
      description:
        'Manage company partnerships, job offers, and internship opportunities in one unified platform.',
      color: '#f59e0b',
      highlights: [
        'Company management',
        'Offer tracking',
        'Collaboration history',
      ],
    },
    {
      icon: <ThunderboltOutlined />,
      title: 'AI-Powered',
      description:
        'Leverage Groq AI to generate surveys, charts, and comprehensive reports from your data.',
      color: '#ec4899',
      highlights: [
        'Smart suggestions',
        'Natural language queries',
        'Automated summaries',
      ],
    },
  ];

  const stats: Stat[] = [
    { value: '10', suffix: 'K+', label: 'Students Tracked' },
    { value: '95', suffix: '%', label: 'Insertion Rate' },
    { value: '50', suffix: '+', label: 'Partners' },
    { value: '24', suffix: '/7', label: 'Data Available' },
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: token.colorBgBase,
        overflow: 'hidden',
      }}
    >
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
        <div
          style={{
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
          }}
        >
          {/* Grid Pattern */}
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

          {/* Floating Orbs */}
          <div
            style={{
              position: 'absolute',
              top: '10%',
              left: '10%',
              width: '400px',
              height: '400px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
              transform: `translate(${mousePosition.x}px, ${mousePosition.y}px)`,
              transition: 'transform 0.5s ease-out',
              animation: 'float 8s ease-in-out infinite',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '20%',
              right: '10%',
              width: '500px',
              height: '500px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(34,211,238,0.1) 0%, transparent 70%)',
              transform: `translate(${-mousePosition.x}px, ${-mousePosition.y}px)`,
              transition: 'transform 0.5s ease-out',
              animation: 'float 10s ease-in-out infinite reverse',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '50%',
              right: '20%',
              width: '300px',
              height: '300px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)',
              transform: `translate(${-mousePosition.x * 0.5}px, ${mousePosition.y * 0.5}px)`,
              transition: 'transform 0.5s ease-out',
              animation: 'float 12s ease-in-out infinite',
            }}
          />
        </div>

        {/* Hero Content */}
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            maxWidth: '900px',
            margin: '0 auto',
            padding: '0 24px',
            textAlign: 'center',
          }}
        >
          {/* Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 20px',
              borderRadius: 100,
              background: `${token.colorPrimary}15`,
              border: `1px solid ${token.colorPrimary}30`,
              marginBottom: 32,
              animation: 'fadeIn 0.8s ease forwards',
            }}
          >
            <RocketOutlined style={{ color: token.colorPrimary }} />
            <Text
              strong
              style={{
                color: token.colorPrimary,
                fontSize: 13,
                letterSpacing: 1,
                textTransform: 'uppercase',
              }}
            >
              Next Generation Observatory
            </Text>
          </div>

          {/* Main Title */}
          <Title
            level={1}
            style={{
              fontSize: 64,
              fontWeight: 800,
              lineHeight: 1.1,
              marginBottom: 24,
              background: `linear-gradient(135deg, ${token.colorText} 0%, ${token.colorPrimary} 50%, ${token.colorInfo} 100%)`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'fadeIn 1s ease forwards',
            }}
          >
            ISET Tozeur
            <br />
            Digital Observatory
          </Title>

          {/* Subtitle */}
          <Paragraph
            style={{
              fontSize: 20,
              color: token.colorTextSecondary,
              lineHeight: 1.6,
              maxWidth: '640px',
              margin: '0 auto 40px',
              animation: 'fadeIn 1s ease 0.2s forwards',
              opacity: 0,
            }}
          >
            A unified platform for academic data management, alumni tracking,
            professional insertion analytics, and AI-powered insights. Transforming
            education data into strategic intelligence.
          </Paragraph>

          {/* CTA Buttons */}
          <Space
            size={16}
            style={{
              animation: 'fadeIn 1s ease 0.4s forwards',
              opacity: 0,
            }}
          >
            <Button
              type="primary"
              size="large"
              icon={<ArrowRightOutlined />}
              iconPosition="end"
              onClick={() => navigate('/login')}
              style={{
                height: 52,
                paddingInline: 32,
                fontSize: 16,
                fontWeight: 600,
                borderRadius: 12,
                background: `linear-gradient(135deg, ${token.colorPrimary} 0%, ${token.colorInfo} 100%)`,
                border: 'none',
                boxShadow: `0 8px 32px ${token.colorPrimary}40`,
              }}
            >
              Access Dashboard
            </Button>
            <Button
              size="large"
              onClick={() => navigate('/login')}
              style={{
                height: 52,
                paddingInline: 32,
                fontSize: 16,
                fontWeight: 600,
                borderRadius: 12,
                borderColor: token.colorBorder,
              }}
            >
              Learn More
            </Button>
          </Space>

          {/* Scroll Indicator */}
          <div
            style={{
              position: 'absolute',
              bottom: -80,
              left: '50%',
              transform: 'translateX(-50%)',
              animation: 'float 2s ease-in-out infinite',
            }}
          >
            <div
              style={{
                width: 24,
                height: 40,
                borderRadius: 12,
                border: `2px solid ${token.colorBorder}`,
                position: 'relative',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 6,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 4,
                  height: 8,
                  borderRadius: 2,
                  background: token.colorPrimary,
                  animation: 'float 1.5s ease-in-out infinite',
                }}
              />
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
            {stats.map((stat, index) => (
              <Col xs={12} sm={6} key={stat.label}>
                <div
                  style={{
                    textAlign: 'center',
                    animation: `fadeIn 0.5s ease ${index * 0.1}s forwards`,
                    opacity: 0,
                  }}
                >
                  <div
                    style={{
                      fontSize: 56,
                      fontWeight: 800,
                      background: `linear-gradient(135deg, ${token.colorPrimary}, ${token.colorInfo})`,
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      lineHeight: 1,
                      marginBottom: 8,
                    }}
                  >
                    {stat.value}
                    <span style={{ fontSize: 32 }}>{stat.suffix}</span>
                  </div>
                  <Text
                    style={{
                      color: token.colorTextSecondary,
                      fontSize: 14,
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: 1,
                    }}
                  >
                    {stat.label}
                  </Text>
                </div>
              </Col>
            ))}
          </Row>
        </div>
      </div>

      {/* Features Section */}
      <div
        style={{
          padding: '100px 24px',
          background: token.colorBgBase,
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          {/* Section Header */}
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <Text
              style={{
                color: token.colorPrimary,
                fontSize: 13,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: 2,
                marginBottom: 16,
                display: 'block',
              }}
            >
              Powerful Features
            </Text>
            <Title
              level={2}
              style={{
                fontSize: 42,
                fontWeight: 700,
                marginBottom: 16,
                color: token.colorText,
              }}
            >
              Everything You Need
            </Title>
            <Paragraph
              style={{
                fontSize: 16,
                color: token.colorTextSecondary,
                maxWidth: '560px',
                margin: '0 auto',
              }}
            >
              A complete suite of tools for managing academic data, tracking
              alumni outcomes, and generating actionable insights.
            </Paragraph>
          </div>

          {/* Feature Cards */}
          <Row gutter={[24, 24]}>
            {features.map((feature, index) => (
              <Col xs={24} sm={12} lg={8} key={feature.title}>
                <Card
                  hoverable
                  style={{
                    height: '100%',
                    borderRadius: 16,
                    border: `1px solid ${token.colorBorderSecondary}`,
                    background: token.colorBgContainer,
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.4s ease',
                  }}
                  styles={{
                    body: {
                      padding: '28px 28px 32px',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                    },
                  }}
                >
                  {/* Icon */}
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 14,
                      background: `${feature.color}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 20,
                      fontSize: 24,
                      color: feature.color,
                    }}
                  >
                    {feature.icon}
                  </div>

                  {/* Title */}
                  <Title
                    level={4}
                    style={{
                      marginBottom: 12,
                      color: token.colorText,
                    }}
                  >
                    {feature.title}
                  </Title>

                  {/* Description */}
                  <Paragraph
                    style={{
                      color: token.colorTextSecondary,
                      lineHeight: 1.6,
                      marginBottom: 20,
                      flex: 1,
                    }}
                  >
                    {feature.description}
                  </Paragraph>

                  {/* Highlights */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {feature.highlights.map((h) => (
                      <div
                        key={h}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          color: token.colorTextSecondary,
                          fontSize: 13,
                        }}
                      >
                        <CheckCircleOutlined
                          style={{ color: feature.color, fontSize: 12 }}
                        />
                        {h}
                      </div>
                    ))}
                  </div>

                  {/* Decorative Corner */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      right: 0,
                      width: '120px',
                      height: '120px',
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

      {/* CTA Section */}
      <div
        style={{
          padding: '100px 24px',
          background: token.colorBgContainer,
          borderTop: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <div
          style={{
            maxWidth: 800,
            margin: '0 auto',
            textAlign: 'center',
            position: 'relative',
          }}
        >
          {/* Background Glow */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '500px',
              height: '300px',
              background: `radial-gradient(ellipse, ${token.colorPrimary}15, transparent 70%)`,
              pointerEvents: 'none',
            }}
          />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${token.colorPrimary}, ${token.colorInfo})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 32px',
                fontSize: 32,
                color: 'white',
                boxShadow: `0 16px 48px ${token.colorPrimary}40`,
              }}
            >
              <ApartmentOutlined />
            </div>

            <Title
              level={2}
              style={{
                fontSize: 40,
                fontWeight: 700,
                marginBottom: 16,
                color: token.colorText,
              }}
            >
              Ready to Transform Your
              <br />
              Data Management?
            </Title>

            <Paragraph
              style={{
                fontSize: 16,
                color: token.colorTextSecondary,
                marginBottom: 40,
              }}
            >
              Join ISET Tozeur in pioneering the future of academic data
              intelligence. Get started in minutes.
            </Paragraph>

            <Button
              type="primary"
              size="large"
              icon={<ArrowRightOutlined />}
              iconPosition="end"
              onClick={() => navigate('/login')}
              style={{
                height: 56,
                paddingInline: 40,
                fontSize: 16,
                fontWeight: 600,
                borderRadius: 14,
                background: `linear-gradient(135deg, ${token.colorPrimary}, ${token.colorInfo})`,
                border: 'none',
                boxShadow: `0 8px 32px ${token.colorPrimary}40`,
              }}
            >
              Get Started Now
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '40px 24px',
          borderTop: `1px solid ${token.colorBorderSecondary}`,
          background: token.colorBgBase,
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <ApartmentOutlined
              style={{
                fontSize: 24,
                color: token.colorPrimary,
              }}
            />
            <Text
              strong
              style={{
                fontSize: 16,
                color: token.colorText,
              }}
            >
              ISET Tozeur
            </Text>
          </div>
          <Text
            style={{
              color: token.colorTextTertiary,
              fontSize: 13,
            }}
          >
            Digital Observatory Platform &copy; {new Date().getFullYear()}
          </Text>
        </div>
      </div>
    </div>
  );
}