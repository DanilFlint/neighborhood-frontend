import { Alert, App, Button, Card, Form, Input, Select, Space, Typography } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/api';
import type { Locations, Me, ProfileRequest } from '../api/types';
import { QueryState } from '../components/QueryState';
import { LocationFields } from '../components/LocationFields';
import { errorText, httpsRule, isContact } from '../lib/validation';

interface ProfileValues { name: string; photoUrl: string; about: string; telegram: string; whatsapp: string }
function ProfileForm({ me }: { me: Me }) {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [save, state] = api.useSaveProfileMutation();
  const account = api.useAccountQuery();
  const [error, setError] = useState<unknown>();
  async function submit(values: ProfileValues) {
    setError(undefined);
    const contacts: ProfileRequest['contacts'] = [];
    if (values.telegram?.trim()) contacts.push({ type: 'TELEGRAM', value: values.telegram.trim() });
    if (values.whatsapp?.trim()) contacts.push({ type: 'WHATSAPP', value: values.whatsapp.trim() });
    try {
      await save({ name: values.name.trim(), photoUrl: values.photoUrl?.trim() || null, about: values.about?.trim() || null, contacts }).unwrap();
      void message.success('Профиль сохранён');
    } catch (e) { setError(e); }
  }
  return <Card className="editor-card">
    <Typography.Title level={1}>Мой профиль</Typography.Title>
    <Typography.Paragraph type="secondary">Расскажите соседям о себе и оставьте удобный способ связи.</Typography.Paragraph>
    <QueryState error={account.error} retry={account.refetch} />
    {account.data && <Typography.Paragraph type="secondary">Email для входа: {account.data.email}</Typography.Paragraph>}
    {error != null && <Alert type="error" className="form-alert" title={errorText(error)} showIcon />}
    <Form layout="vertical" onFinish={submit} initialValues={{ ...me.profile,
      telegram: me.profile.contacts.find((c) => c.type === 'TELEGRAM')?.value,
      whatsapp: me.profile.contacts.find((c) => c.type === 'WHATSAPP')?.value,
    }} requiredMark="optional">
      <Form.Item name="name" label="Имя" rules={[{ required: true, whitespace: true, max: 100, message: 'Введите имя, до 100 символов' }]}><Input maxLength={100} autoComplete="name" /></Form.Item>
      <Form.Item name="photoUrl" label="Ссылка на фото" rules={[httpsRule]} extra="HTTPS-ссылка на изображение. Загрузка файлов пока недоступна."><Input placeholder="https://…" maxLength={2048} /></Form.Item>
      <Form.Item name="about" label="О себе" rules={[{ max: 5000 }]}><Input.TextArea autoSize={{ minRows: 4, maxRows: 12 }} maxLength={5000} showCount /></Form.Item>
      <Alert className="form-alert" type="info" showIcon title="Контакты будут видны всем посетителям" />
      <Form.Item name="telegram" label="Telegram" rules={[{ validator: (_, v) => !v || isContact('TELEGRAM', v) ? Promise.resolve() : Promise.reject(new Error('Укажите https://t.me/username')) }]}><Input placeholder="https://t.me/username" maxLength={2048} /></Form.Item>
      <Form.Item name="whatsapp" label="WhatsApp" rules={[{ validator: (_, v) => !v || isContact('WHATSAPP', v) ? Promise.resolve() : Promise.reject(new Error('Укажите https://wa.me/номер (5–15 цифр, без +)')) }]}><Input placeholder="https://wa.me/79991234567" maxLength={2048} /></Form.Item>
      <Space wrap><Button type="primary" htmlType="submit" loading={state.isLoading}>Сохранить профиль</Button><Button onClick={() => navigate(`/users/${me.profile.id}`)}>Посмотреть публичный профиль</Button></Space>
    </Form>
  </Card>;
}

function LocationsForm({ me }: { me: Me }) {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const complexes = api.useComplexesQuery();
  const [save, state] = api.useSaveLocationsMutation();
  const [error, setError] = useState<unknown>();
  async function submit(values: Locations) {
    setError(undefined);
    if (!values.selections.some((s) => s.residentialComplexId === values.primaryResidentialComplexId)) {
      form.setFields([{ name: 'primaryResidentialComplexId', errors: ['Добавьте основной ЖК в список ниже'] }]);
      return;
    }
    try { await save(values).unwrap(); void message.success('Локации сохранены'); } catch (e) { setError(e); }
  }
  return <Card className="editor-card">
    <Typography.Title level={1}>Мои локации</Typography.Title>
    <Typography.Paragraph type="secondary">Выберите основной ЖК и дополнительные комплексы. Для каждого можно указать конкретные дома. География услуг настраивается отдельно при публикации.</Typography.Paragraph>
    <QueryState error={complexes.error} retry={complexes.refetch} />
    {error != null && <Alert className="form-alert" type="error" title={errorText(error)} showIcon />}
    <Form form={form} layout="vertical" onFinish={submit} initialValues={me.locations} requiredMark="optional">
      <Form.Item name="primaryResidentialComplexId" label="Основной жилой комплекс" rules={[{ required: true, message: 'Выберите основной ЖК' }]}>
        <Select showSearch optionFilterProp="label" placeholder="Выберите ЖК" options={complexes.data?.map((c) => ({ value: c.id, label: c.name }))} />
      </Form.Item>
      <LocationFields name="selections" />
      <Button className="top-gap" type="primary" htmlType="submit" loading={state.isLoading}>Сохранить локации</Button>
    </Form>
  </Card>;
}

export function SettingsPage({ locations = false }: { locations?: boolean }) {
  const me = api.useMeQuery();
  if (me.isLoading || me.error || !me.data) return <QueryState loading={me.isLoading} error={me.error} retry={me.refetch} />;
  return locations ? <LocationsForm me={me.data} /> : <ProfileForm me={me.data} />;
}
