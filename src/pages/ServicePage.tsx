import { Avatar, Button, Card, Col, Descriptions, Image, Row, Space, Tag, Typography } from 'antd';
import { EditOutlined, EnvironmentOutlined, ShopOutlined, UserOutlined } from '@ant-design/icons';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/api';
import { useAppSelector } from '../app/store';
import { QueryState } from '../components/QueryState';
import { AddressLabel } from '../components/AddressPicker';
import { formatPrice } from '../lib/validation';
import { isContact } from '../lib/validation';
import type { Contact, LocationSelection } from '../api/types';

export function Contacts({ contacts }: { contacts: Contact[] }) {
  const safeContacts = contacts.filter((c) => isContact(c.type, c.value));
  return safeContacts.length ? <Space wrap>{safeContacts.map((contact) => <Button key={contact.type} type="primary" href={contact.value} target="_blank" rel="noopener noreferrer">{contact.type === 'TELEGRAM' ? 'Написать в Telegram' : 'Написать в WhatsApp'}</Button>)}</Space>
    : <Typography.Text type="secondary">Исполнитель пока не указал контакты.</Typography.Text>;
}

function CoverageRow({ selection }: { selection: LocationSelection }) {
  const buildings = api.useBuildingsQuery(selection.residentialComplexId, { skip: selection.selectionMode === 'ALL_BUILDINGS' });
  return <Space orientation="vertical" size={4}>
    <Typography.Text strong><EnvironmentOutlined /> <AddressLabel id={selection.residentialComplexId} /></Typography.Text>
    {selection.selectionMode === 'ALL_BUILDINGS' ? <Typography.Text type="secondary">По выбранному адресу</Typography.Text> : <>
      <QueryState loading={buildings.isLoading} error={buildings.error} retry={buildings.refetch} />
      {buildings.data && <Typography.Text type="secondary">{selection.buildingIds.map((id) => { const b = buildings.data?.find((item) => item.id === id); return b ? b.label ? `${b.label} · ${b.address}` : b.address : 'Дом недоступен'; }).join('; ')}</Typography.Text>}
    </>}
  </Space>;
}

export function ServiceDetailPage() {
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const service = api.useServiceQuery(id);
  const profile = api.useProfileQuery(service.data?.owner.id || '', { skip: !service.data });
  const categories = api.useCategoriesQuery();
  const tokens = useAppSelector((s) => s.auth.tokens);
  const me = api.useMeQuery(undefined, { skip: !tokens });
  if (service.isLoading || service.error || !service.data) return <QueryState loading={service.isLoading} error={service.error} retry={service.refetch} />;
  const item = service.data;
  return <Space orientation="vertical" size={24} style={{ width: '100%' }}>
    <Link to="/">← Все услуги</Link>
    <Row gutter={[24, 24]}>
      <Col xs={24} lg={16}>
        <Card>
          <Tag color="blue">{categories.data?.find((c) => c.id === item.categoryId)?.name || item.categoryId}</Tag>
          <Typography.Title level={1}>{item.title}</Typography.Title>
          {item.photoUrls.length > 0 ? <Image.PreviewGroup><Row gutter={[12, 12]}>{item.photoUrls.map((url, index) => <Col xs={24} sm={index === 0 ? 24 : 12} key={`${index}-${url}`}><Image src={url} alt={`${item.title} — фото ${index + 1}`} width="100%" style={{ maxHeight: 420, objectFit: 'cover', borderRadius: 12 }} /></Col>)}</Row></Image.PreviewGroup>
            : <div className="detail-placeholder"><ShopOutlined aria-hidden="true" /><Typography.Text type="secondary">Исполнитель пока не добавил фото</Typography.Text></div>}
          <Typography.Title level={3}>Об услуге</Typography.Title>
          <Typography.Paragraph className="preserve-text">{item.description}</Typography.Paragraph>
          <Typography.Title level={3}>Где доступна услуга</Typography.Title>
          <Space orientation="vertical" size={16}>{item.coverage.map((selection) => <CoverageRow key={selection.residentialComplexId} selection={selection} />)}</Space>
        </Card>
      </Col>
      <Col xs={24} lg={8}><Card className="contact-card">
        <Typography.Text type="secondary">Стоимость услуги</Typography.Text>
        <Typography.Title level={2}>{formatPrice(item.price)}</Typography.Title>
        <Typography.Paragraph type="secondary">Детали и оплату обсудите с исполнителем напрямую.</Typography.Paragraph>
        <Space size={12}><Avatar size={48} src={profile.data?.photoUrl} icon={<UserOutlined />} /><Link to={`/users/${item.owner.id}`}><Typography.Text strong>{item.owner.name}</Typography.Text></Link></Space>
        <Typography.Paragraph />
        <QueryState loading={profile.isLoading} error={profile.error} retry={profile.refetch} />
        {profile.data && <Contacts contacts={profile.data.contacts} />}
        <Typography.Paragraph />
        <Button block onClick={() => navigate(`/users/${item.owner.id}`)}>Профиль и все услуги</Button>
        {tokens && me.data?.profile.id === item.owner.id && <Button block icon={<EditOutlined aria-hidden="true" />} className="top-gap" onClick={() => navigate(`/services/${id}/edit`)}>Редактировать услугу</Button>}
        <Descriptions className="top-gap" size="small" column={1} items={[{ key: 'currency', label: 'Валюта', children: 'Уточните у исполнителя' }]} />
      </Card></Col>
    </Row>
  </Space>;
}
