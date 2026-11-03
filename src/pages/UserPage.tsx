import { useState } from 'react';
import { Avatar, Card, Col, Pagination, Row, Space, Tag, Typography } from 'antd';
import { EnvironmentOutlined, UserOutlined } from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import { api } from '../api/api';
import { QueryState } from '../components/QueryState';
import { ServiceGrid } from '../components/ServiceGrid';
import { Contacts } from './ServicePage';
import { AddressLabel } from '../components/AddressPicker';

export function UserPage() {
  const { id = '' } = useParams();
  const [page, setPage] = useState(0);
  const profile = api.useProfileQuery(id);
  const services = api.useUserServicesQuery({ id, page });
  if (profile.isLoading || profile.error || !profile.data) return <QueryState loading={profile.isLoading} error={profile.error} retry={profile.refetch} />;
  const user = profile.data;
  return <Space orientation="vertical" size={28} style={{ width: '100%' }}>
    <Card><Row gutter={[24, 24]} align="middle">
      <Col><Avatar size={88} src={user.photoUrl} icon={<UserOutlined />} /></Col>
      <Col flex="auto"><Typography.Text type="secondary">ВАШ СОСЕД</Typography.Text><Typography.Title level={1}>{user.name}</Typography.Title>
        <Space wrap>{[user.primaryResidentialComplexId, ...user.additionalResidentialComplexIds].filter(Boolean).map((complexId) => <Tag color="blue" icon={<EnvironmentOutlined />} key={complexId}><AddressLabel id={complexId!} /></Tag>)}</Space>
      </Col>
      <Col xs={24} md={24} lg={10}><Contacts contacts={user.contacts} /></Col>
    </Row>
      <Typography.Title level={3}>О себе</Typography.Title>
      <Typography.Paragraph className="preserve-text">{user.about || 'Сосед пока не рассказал о себе.'}</Typography.Paragraph>
    </Card>
    <Typography.Title level={2}>Услуги исполнителя</Typography.Title>
    <QueryState loading={services.isFetching} error={services.error} retry={services.refetch} />
    {!services.isFetching && !services.error && services.data && <>
      <ServiceGrid items={services.data.items} />
      <Pagination align="center" hideOnSinglePage current={page + 1} total={services.data.totalElements} pageSize={12} showSizeChanger={false} onChange={(p) => setPage(p - 1)} />
    </>}
  </Space>;
}
