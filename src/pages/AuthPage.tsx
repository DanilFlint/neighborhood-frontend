import { useState } from 'react';
import { Alert, Button, Card, Form, Input, Space, Typography } from 'antd';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api/api';
import { useAppDispatch } from '../app/store';
import { signedIn } from '../app/auth';
import { errorText, isPassword } from '../lib/validation';
import { AddressPicker } from '../components/AddressPicker';
import type { Registration } from '../api/types';

export function AuthPage({ register = false }: { register?: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const [login, loginState] = api.useLoginMutation();
  const [signUp, registerState] = api.useRegisterMutation();
  const [error, setError] = useState<unknown>();
  const [registered, setRegistered] = useState(false);
  const from = typeof location.state?.from === 'string' && location.state.from.startsWith('/') && !location.state.from.startsWith('//') ? location.state.from : '/';
  async function submit(values: Registration) {
    setError(undefined);
    try {
      if (register) {
        await signUp({ name: values.name.trim(), email: values.email.trim(), password: values.password, primaryResidentialComplexId: values.primaryResidentialComplexId }).unwrap();
        setRegistered(true);
      } else {
        const tokens = await login({ username: values.email.trim(), password: values.password }).unwrap();
        dispatch(api.util.resetApiState());
        dispatch(signedIn(tokens));
        navigate(from, { replace: true });
      }
    } catch (e) { setError(e); }
  }
  if (registered) return <Card className="auth-card"><Space orientation="vertical" size={20}>
    <Typography.Title level={2}>Добро пожаловать в соседи!</Typography.Title>
    <Alert type="success" showIcon title="Аккаунт создан" description="Войдите с указанными email и паролем." />
    <Button type="primary" block onClick={() => navigate('/login', { state: { from } })}>Перейти ко входу</Button>
  </Space></Card>;
  return <Card className="auth-card">
    <Typography.Text type="secondary">СОСЕДИ · ВАШ РАЙОН, ВАШИ ЛЮДИ</Typography.Text>
    <Typography.Title level={2}>{register ? 'Давайте знакомиться' : 'Рады вас видеть'}</Typography.Title>
    <Typography.Paragraph type="secondary">{register ? 'Создайте аккаунт, чтобы предлагать услуги и помогать соседям.' : 'Войдите, чтобы управлять услугами и своим профилем.'}</Typography.Paragraph>
    {error != null && <Alert className="form-alert" type="error" showIcon title={errorText(error)} />}
    <Form layout="vertical" requiredMark="optional" onFinish={submit} size="large">
      {register && <Form.Item name="name" label="Как вас зовут" rules={[{ required: true, whitespace: true, max: 100, message: 'Введите имя, до 100 символов' }]}><Input autoComplete="name" maxLength={100} /></Form.Item>}
      <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', max: 254, message: 'Введите корректный email' }]}><Input prefix={<MailOutlined />} autoComplete="email" type="email" /></Form.Item>
      <Form.Item name="password" label="Пароль" extra={register ? 'От 12 символов, не более 72 байт UTF-8' : undefined} rules={[
        { required: true, message: 'Введите пароль' }, ...(register ? [{ validator: (_: unknown, value: string) => !value || isPassword(value) ? Promise.resolve() : Promise.reject(new Error('От 12 символов и не более 72 байт UTF-8')) }] : []),
      ]}><Input.Password prefix={<LockOutlined />} autoComplete={register ? 'new-password' : 'current-password'} /></Form.Item>
      {register && <>
        <Form.Item name="confirmPassword" label="Повторите пароль" dependencies={['password']} rules={[{ required: true, message: 'Повторите пароль' }, ({ getFieldValue }) => ({ validator: (_, value) => !value || value === getFieldValue('password') ? Promise.resolve() : Promise.reject(new Error('Пароли не совпадают')) })]}><Input.Password autoComplete="new-password" /></Form.Item>
        <Form.Item name="primaryResidentialComplexId" label="Ваш основной адрес" rules={[{ required: true, message: 'Выберите адрес из подсказок или на карте' }]}><AddressPicker aria-label="Ваш основной адрес" /></Form.Item>
      </>}
      <Button type="primary" htmlType="submit" block loading={loginState.isLoading || registerState.isLoading}>{register ? 'Создать аккаунт' : 'Войти'}</Button>
    </Form>
    <Typography.Paragraph className="auth-switch">{register ? 'Уже знакомы? ' : 'Ещё нет аккаунта? '}<Link to={register ? '/login' : '/register'} state={{ from }}>{register ? 'Войти' : 'Зарегистрироваться'}</Link></Typography.Paragraph>
  </Card>;
}
