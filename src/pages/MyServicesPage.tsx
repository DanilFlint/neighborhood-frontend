import { useState } from 'react';
import { Button, Pagination, Space, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/api';
import { QueryState } from '../components/QueryState';
import { ServiceGrid } from '../components/ServiceGrid';

export function MyServicesPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const me = api.useMeQuery();
  const services = api.useUserServicesQuery({ id: me.data?.profile.id || '', page }, { skip: !me.data });
  return <Space orientation="vertical" size={24} style={{ width: '100%' }}>
    <Space className="section-heading" wrap><Typography.Title level={1}>Мои услуги</Typography.Title><Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/services/new')}>Предложить услугу</Button></Space>
    <Typography.Text type="secondary">Все ваши услуги сразу видны соседям. Вы можете обновить описание, стоимость и географию.</Typography.Text>
    <QueryState loading={me.isLoading || services.isFetching} error={me.error || services.error} retry={() => { void me.refetch(); if (me.data) void services.refetch(); }} />
    {!services.isFetching && !services.error && services.data && <>
      <ServiceGrid editable items={services.data.items} />
      <Pagination align="center" hideOnSinglePage current={page + 1} total={services.data.totalElements} pageSize={12} showSizeChanger={false} onChange={(p) => setPage(p - 1)} />
    </>}
  </Space>;
}
