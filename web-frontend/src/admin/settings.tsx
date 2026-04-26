import {
  Card,
  Typography,
  Tabs,
  theme,
  Space,
  Button,
  Switch,
  Divider,
  ColorPicker,
} from 'antd';
import {
  SettingOutlined,
  BgColorsOutlined,
  CalendarOutlined,
  CloudUploadOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import { useState } from 'react';

const { Title, Text } = Typography;

export default function SettingsPage() {
  const { token } = theme.useToken();
  const [primaryColor, setPrimaryColor] = useState('#6366f1');

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <Title
          level={3}
          style={{ marginBottom: 4, color: token.colorText, fontWeight: 700 }}
        >
          System Settings
        </Title>
        <Text style={{ color: token.colorTextSecondary }}>
          Configure your observatory preferences and system options.
        </Text>
      </div>

      <Card
        style={{
          borderRadius: 16,
          border: `1px solid ${token.colorBorderSecondary}`,
        }}
        styles={{ body: { padding: '8px 24px 24px' } }}
      >
        <Tabs
          tabPosition="left"
          style={{ minHeight: 400 }}
          tabBarStyle={{
            width: 200,
            marginRight: 24,
          }}
          items={[
            {
              key: 'theme',
              label: (
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <BgColorsOutlined />
                  Theme
                </span>
              ),
              children: (
                <div>
                  <Title
                    level={5}
                    style={{ color: token.colorText, marginBottom: 24 }}
                  >
                    Theme Customization
                  </Title>

                  <div
                    style={{
                      padding: 20,
                      borderRadius: 12,
                      background: token.colorBgSpotlight,
                      marginBottom: 20,
                    }}
                  >
                    <Text
                      style={{
                        color: token.colorText,
                        fontWeight: 500,
                        display: 'block',
                        marginBottom: 8,
                      }}
                    >
                      Dark Mode
                    </Text>
                    <Text
                      style={{
                        color: token.colorTextSecondary,
                        fontSize: 12,
                        display: 'block',
                        marginBottom: 12,
                      }}
                    >
                      Toggle between light and dark themes
                    </Text>
                    <Switch />
                  </div>

                  <div
                    style={{
                      padding: 20,
                      borderRadius: 12,
                      background: token.colorBgSpotlight,
                    }}
                  >
                    <Text
                      style={{
                        color: token.colorText,
                        fontWeight: 500,
                        display: 'block',
                        marginBottom: 8,
                      }}
                    >
                      Primary Color
                    </Text>
                    <Text
                      style={{
                        color: token.colorTextSecondary,
                        fontSize: 12,
                        display: 'block',
                        marginBottom: 12,
                      }}
                    >
                      Customize the primary brand color
                    </Text>
                    <Space>
                      <ColorPicker
                        value={primaryColor}
                        onChange={(color) => setPrimaryColor(color.toHexString())}
                        showText
                      />
                      <Button size="small">Reset</Button>
                    </Space>
                  </div>
                </div>
              ),
            },
            {
              key: 'academic-years',
              label: (
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CalendarOutlined />
                  Academic Years
                </span>
              ),
              children: (
                <div>
                  <Title
                    level={5}
                    style={{ color: token.colorText, marginBottom: 24 }}
                  >
                    Academic Years
                  </Title>
                  <Text
                    style={{ color: token.colorTextSecondary, fontSize: 13 }}
                  >
                    Configure academic years and set the current active year.
                  </Text>
                </div>
              ),
            },
            {
              key: 'backup',
              label: (
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CloudUploadOutlined />
                  Backup
                </span>
              ),
              children: (
                <div>
                  <Title
                    level={5}
                    style={{ color: token.colorText, marginBottom: 24 }}
                  >
                    System Backup
                  </Title>
                  <Button
                    icon={<CloudUploadOutlined />}
                    style={{ borderRadius: 10, marginBottom: 16 }}
                  >
                    Create Backup Now
                  </Button>
                  <Text
                    style={{ color: token.colorTextSecondary, fontSize: 13 }}
                  >
                    Backups are stored securely and can be downloaded at any
                    time.
                  </Text>
                </div>
              ),
            },
            {
              key: 'activity',
              label: (
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <HistoryOutlined />
                  Activity Logs
                </span>
              ),
              children: (
                <div>
                  <Title
                    level={5}
                    style={{ color: token.colorText, marginBottom: 24 }}
                  >
                    Activity Logs
                  </Title>
                  <Text
                    style={{ color: token.colorTextSecondary, fontSize: 13 }}
                  >
                    View system activity, user actions, and audit trails.
                  </Text>
                </div>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}