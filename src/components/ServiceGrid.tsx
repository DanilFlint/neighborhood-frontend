import { Button, Card, Col, Empty, Image, Row, Space, Tag, Typography } from 'antd';
import { ArrowRightOutlined, ShopOutlined, UserOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/api';
import type { ServiceSummary } from '../api/types';
import { formatPrice } from '../lib/validation';

export function ServiceGrid({ items, editable = false }: { items: ServiceSummary[]; editable?: boolean }) {
  const navigate = useNavigate();
  const { data: categories } = api.useCategoriesQuery();
  if (!items.length) return <Card><Empty description="Пока нет услуг. Попробуйте выбрать другой адрес или категорию." /></Card>;
  return <Row gutter={[20, 20]}>{items.map((service) => <Col xs={24} sm={12} xl={8} key={service.id}>
    <Card className="service-card" cover={service.photoUrls[0]
      ? <Image alt={service.title} src={service.photoUrls[0]} height={170} style={{ objectFit: 'cover' }} preview={false} />
      : <div className={`service-cover cover-${service.categoryId.toLowerCase()}`}><ShopOutlined aria-hidden="true" /><Typography.Text>Помощь от соседей</Typography.Text></div>}>
      <Space orientation="vertical" size={12} style={{ width: '100%' }}>
        <Tag color="blue" variant="filled">{categories?.find((c) => c.id === service.categoryId)?.name || service.categoryId}</Tag>
        <Typography.Title level={4} className="service-title"><Link to={`/services/${service.id}`}>{service.title}</Link></Typography.Title>
        <Typography.Text type="secondary"><UserOutlined /> {service.owner.name}</Typography.Text>
        <Space className="card-bottom"><Typography.Text strong className="price">{formatPrice(service.price)}</Typography.Text>
          <Button shape="circle" icon={<ArrowRightOutlined />} aria-label={`Подробнее: ${service.title}`} onClick={() => navigate(`/services/${service.id}`)} />
        </Space>
        {editable && <Button block onClick={() => navigate(`/services/${service.id}/edit`)}>Редактировать</Button>}
      </Space>
    </Card>
  </Col>)}</Row>;
}
