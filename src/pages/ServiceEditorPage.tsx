import { useState } from 'react';
import { Alert, App, Button, Card, Form, Input, InputNumber, Select, Space, Typography } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/api';
import type { Me, Service, ServiceRequest } from '../api/types';
import { LocationFields } from '../components/LocationFields';
import { QueryState } from '../components/QueryState';
import { errorText, isHttps, photoLines } from '../lib/validation';

function EditorForm({ service, me }: { service?: Service; me: Me }) {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const categories = api.useCategoriesQuery();
  const [create, createState] = api.useCreateServiceMutation();
  const [update, updateState] = api.useUpdateServiceMutation();
  const [error, setError] = useState<unknown>();
  async function submit(values: Omit<ServiceRequest, 'photoUrls'> & { photos?: string }) {
    setError(undefined);
    const { photos, ...fields } = values;
    const body = { ...fields, title: fields.title.trim(), description: fields.description.trim(), price: Number(fields.price), photoUrls: photoLines(photos) };
    try {
      const result = await (service ? update({ id: service.id, body }).unwrap() : create(body).unwrap());
      void message.success(service ? 'Услуга обновлена' : 'Услуга опубликована');
      navigate(`/services/${result.id}`, { replace: true });
    } catch (e) { setError(e); }
  }
  return <Card className="editor-card">
    <Typography.Text type="secondary">ПОМОГАЙТЕ ТЕМ, КТО РЯДОМ</Typography.Text>
    <Typography.Title level={1}>{service ? 'Редактировать услугу' : 'Предложить услугу'}</Typography.Title>
    <Typography.Paragraph type="secondary">Расскажите, чем можете помочь. После сохранения услуга сразу появится в каталоге.</Typography.Paragraph>
    {error != null && <Alert className="form-alert" type="error" showIcon title={errorText(error)} />}
    <QueryState error={categories.error} retry={categories.refetch} />
    <Form layout="vertical" requiredMark="optional" onFinish={submit} initialValues={service ? { ...service, photos: service.photoUrls.join('\n') } : { coverage: me.locations.selections, photoUrls: [] }}>
      <Form.Item name="title" label="Название услуги" rules={[{ required: true, whitespace: true, max: 200, message: 'Введите название, до 200 символов' }]}><Input maxLength={200} placeholder="Например, помогу с уборкой квартиры" /></Form.Item>
      <Form.Item name="categoryId" label="Категория" rules={[{ required: true, message: 'Выберите категорию' }]}><Select placeholder="Выберите категорию" options={categories.data?.map((c) => ({ value: c.id, label: c.name }))} /></Form.Item>
      <Form.Item name="description" label="Описание" rules={[{ required: true, whitespace: true, max: 10000, message: 'Добавьте описание, до 10000 символов' }]}><Input.TextArea autoSize={{ minRows: 5, maxRows: 14 }} maxLength={10000} showCount placeholder="Что входит в услугу и что нужно знать соседям?" /></Form.Item>
      <Form.Item name="price" label="Стоимость" extra="Валюта пока не задаётся сервисом — обсудите её с заказчиком." rules={[{ required: true, message: 'Укажите стоимость' }, { validator: (_, value) => value == null || /^\d{1,12}(\.\d{1,2})?$/.test(String(value)) ? Promise.resolve() : Promise.reject(new Error('От 0 до 999999999999.99, не более двух знаков после точки')) }]}>
        <InputNumber stringMode controls={false} style={{ width: '100%' }} placeholder="0.00" />
      </Form.Item>
      <Form.Item name="photos" label="Ссылки на фотографии" extra="До 20 HTTPS-ссылок, каждая с новой строки. Пустое поле уберёт фотографии." rules={[{ validator: (_, value) => {
        const lines = photoLines(value);
        return lines.length <= 20 && lines.every((url) => url.length <= 2048 && isHttps(url)) ? Promise.resolve() : Promise.reject(new Error('До 20 корректных HTTPS-ссылок длиной до 2048 символов'));
      } }]}><Input.TextArea autoSize={{ minRows: 3, maxRows: 8 }} placeholder="https://…" /></Form.Item>
      <Typography.Title level={3}>Где вы оказываете услугу</Typography.Title>
      <LocationFields name="coverage" />
      <Space wrap className="top-gap"><Button type="primary" htmlType="submit" loading={createState.isLoading || updateState.isLoading}>{service ? 'Сохранить изменения' : 'Опубликовать услугу'}</Button><Button onClick={() => navigate(service ? `/services/${service.id}` : '/my-services')}>Отмена</Button></Space>
    </Form>
  </Card>;
}

export function ServiceEditorPage() {
  const { id } = useParams();
  const me = api.useMeQuery();
  const service = api.useServiceQuery(id || '', { skip: !id });
  if (me.isLoading || service.isLoading || me.error || service.error || !me.data) return <QueryState loading={me.isLoading || service.isLoading} error={me.error || service.error} retry={() => { void me.refetch(); if (id) void service.refetch(); }} />;
  if (id && !service.data) return null;
  if (service.data && service.data.owner.id !== me.data.profile.id) return <Alert showIcon type="error" title="Вы можете редактировать только свои услуги" />;
  return <EditorForm key={id || 'new'} me={me.data} service={service.data} />;
}
