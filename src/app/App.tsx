import { lazy, Suspense, useEffect, useState } from 'react';
import { App as AntApp, Avatar, Button, ConfigProvider, Drawer, Layout, Menu, Result, Skeleton, Space, Tag, Typography } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import { EnvironmentOutlined, HeartOutlined, HomeOutlined, MenuOutlined, PlusOutlined, ShopOutlined, UserOutlined } from '@ant-design/icons';
import { Link, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api/api';
import { useAppDispatch, useAppSelector } from './store';
import { signedOut } from './auth';
import { QueryState } from '../components/QueryState';

const CatalogPage = lazy(() => import('../pages/CatalogPage').then((m) => ({ default: m.CatalogPage })));
const AuthPage = lazy(() => import('../pages/AuthPage').then((m) => ({ default: m.AuthPage })));
const ServiceDetailPage = lazy(() => import('../pages/ServicePage').then((m) => ({ default: m.ServiceDetailPage })));
const UserPage = lazy(() => import('../pages/UserPage').then((m) => ({ default: m.UserPage })));
const SettingsPage = lazy(() => import('../pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const MyServicesPage = lazy(() => import('../pages/MyServicesPage').then((m) => ({ default: m.MyServicesPage })));
const ServiceEditorPage = lazy(() => import('../pages/ServiceEditorPage').then((m) => ({ default: m.ServiceEditorPage })));

function RequireAuth() {
  const tokens = useAppSelector((s) => s.auth.tokens);
  const location = useLocation();
  return tokens ? <Outlet /> : <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
}

function HealthPage() {
  const health = api.useHealthQuery();
  return <Result status={health.error ? 'warning' : 'info'} title="Состояние сервиса" subTitle="Проверка доступности HTTP-сервера. Не проверяет базу данных.">
    <QueryState loading={health.isFetching} error={health.error} retry={health.refetch} />
    {!health.isFetching && health.data && <Tag color={health.data.status === 'UP' ? 'green' : 'orange'}>{health.data.status === 'UP' ? 'Сервер доступен' : health.data.status}</Tag>}
    <div className="top-gap"><Button onClick={() => void health.refetch()} loading={health.isFetching}>Проверить ещё раз</Button></div>
  </Result>;
}

function Shell() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { message } = AntApp.useApp();
  const tokens = useAppSelector((s) => s.auth.tokens);
  const me = api.useMeQuery(undefined, { skip: !tokens });
  const [logout, logoutState] = api.useLogoutMutation();
  const [drawer, setDrawer] = useState(false);
  const [finishingLogout, setFinishingLogout] = useState(false);
  useEffect(() => { setDrawer(false); window.scrollTo({ top: 0, behavior: 'instant' }); }, [location.pathname]);
  useEffect(() => {
    // Router navigation can be a transition; clear auth once the protected route has unmounted.
    if (finishingLogout && location.pathname === '/') {
      dispatch(signedOut());
      dispatch(api.util.resetApiState());
      setFinishingLogout(false);
    }
  }, [finishingLogout, location.pathname, dispatch]);
  const items = [
    { key: '/', icon: <HomeOutlined />, label: <Link to="/">Каталог услуг</Link> },
    ...(tokens ? [
      { key: '/my-services', icon: <ShopOutlined />, label: <Link to="/my-services">Мои услуги</Link> },
      { key: '/me/locations', icon: <EnvironmentOutlined />, label: <Link to="/me/locations">Мои локации</Link> },
      { key: '/me', icon: <UserOutlined />, label: <Link to="/me">Мой профиль</Link> },
    ] : []),
  ];
  async function signOut() {
    if (!tokens) return;
    try { await logout(tokens.refresh_token).unwrap(); }
    catch { void message.warning('Выход выполнен на устройстве. Сервер не подтвердил завершение сессии.'); }
    finally {
      setFinishingLogout(true);
      navigate('/', { replace: true });
    }
  }
  const selected = items.filter((i) => location.pathname === i.key).map((i) => i.key);
  return <Layout className="site-layout">
    <a href="#main" className="skip-link">Перейти к содержимому</a>
    <Layout.Header className="site-header"><div className="header-inner">
      <Link to="/" className="brand"><Avatar shape="square" size={40} icon={<HomeOutlined />} /><span>соседи<Typography.Text type="secondary">услуги рядом</Typography.Text></span></Link>
      <Menu className="desktop-nav" mode="horizontal" selectedKeys={selected} items={items.slice(0, 2)} />
      <Space className="desktop-actions">
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/services/new')}>Предложить услугу</Button>
        {tokens ? <Button icon={<UserOutlined />} onClick={() => navigate('/me')}>{me.data?.profile.name || 'Мой профиль'}</Button> : <Button onClick={() => navigate('/login')}>Войти</Button>}
      </Space>
      <Button className="mobile-menu" aria-label="Открыть меню" icon={<MenuOutlined />} onClick={() => setDrawer(true)} />
    </div></Layout.Header>
    <Drawer title="Соседи" open={drawer} onClose={() => setDrawer(false)} size="default">
      <Menu mode="inline" selectedKeys={selected} items={items} />
      <Button className="top-gap" block type="primary" icon={<PlusOutlined />} onClick={() => { setDrawer(false); navigate('/services/new'); }}>Предложить услугу</Button>
      {!tokens && <Button block className="top-gap" onClick={() => { setDrawer(false); navigate('/login'); }}>Войти</Button>}
      {tokens && <Button block className="top-gap" loading={logoutState.isLoading} onClick={() => void signOut()}>Выйти</Button>}
    </Drawer>
    {tokens && <nav className="account-nav" aria-label="Личный кабинет"><Menu mode="horizontal" selectedKeys={selected} items={items.slice(1)} /><Button type="text" loading={logoutState.isLoading} onClick={() => void signOut()}>Выйти</Button></nav>}
    <Layout.Content id="main" className="main-content"><Suspense fallback={<Skeleton active paragraph={{ rows: 6 }} />}><Outlet /></Suspense></Layout.Content>
    <Layout.Footer className="site-footer"><div><Link className="footer-brand" to="/">соседи</Link><Typography.Text type="secondary">Помощь ближе, чем кажется</Typography.Text></div><Space wrap><Typography.Text type="secondary"><HeartOutlined /> Сделано для соседей</Typography.Text><Link to="/health">Состояние сервиса</Link></Space></Layout.Footer>
  </Layout>;
}

export function App() {
  return <ConfigProvider locale={ruRU} virtual={false} theme={{ token: {
    colorPrimary: '#165dcc', colorInfo: '#165dcc', colorBgLayout: '#f4f7fc', colorText: '#152c4c',
    colorTextSecondary: '#61738b', borderRadius: 12, fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
    controlHeight: 42, motionDurationMid: '0.22s',
  }, components: { Layout: { headerBg: '#ffffff', footerBg: '#ffffff' }, Card: { paddingLG: 24 } } }}>
    <AntApp><Routes><Route element={<Shell />}>
      <Route index element={<CatalogPage />} />
      <Route path="login" element={<AuthPage key="login" />} />
      <Route path="register" element={<AuthPage key="register" register />} />
      <Route path="services/:id" element={<ServiceDetailPage />} />
      <Route path="users/:id" element={<UserPage />} />
      <Route path="health" element={<HealthPage />} />
      <Route element={<RequireAuth />}>
        <Route path="me" element={<SettingsPage key="profile" />} />
        <Route path="me/locations" element={<SettingsPage key="locations" locations />} />
        <Route path="my-services" element={<MyServicesPage />} />
        <Route path="services/new" element={<ServiceEditorPage />} />
        <Route path="services/:id/edit" element={<ServiceEditorPage />} />
      </Route>
      <Route path="*" element={<Result status="404" title="Страница не найдена" extra={<Link to="/"><Button type="primary">Открыть каталог</Button></Link>} />} />
    </Route></Routes></AntApp>
  </ConfigProvider>;
}
