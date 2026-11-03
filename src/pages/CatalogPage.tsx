import { Alert, Button, Card, Col, Form, Pagination, Row, Select, Space, Tag, Typography } from 'antd';
import { EnvironmentOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/api';
import { QueryState } from '../components/QueryState';
import { ServiceGrid } from '../components/ServiceGrid';
import { formatServiceCount } from '../lib/validation';

export function CatalogPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const categoryId = params.get('categoryId') || undefined;
  const complexId = params.get('residentialComplexId') || undefined;
  const buildingId = params.get('buildingId') || undefined;
  const rawPage = Number(params.get('page') || 0);
  const page = Number.isSafeInteger(rawPage) && rawPage >= 0 ? rawPage : 0;
  const categories = api.useCategoriesQuery();
  const complexes = api.useComplexesQuery();
  const buildings = api.useBuildingsQuery(complexId!, { skip: !complexId });
  const services = api.useServicesQuery({ categoryId, residentialComplexId: complexId, buildingId, page, size: 12 });
  function change(key: string, value?: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== 'page') next.delete('page');
    if (key === 'residentialComplexId') next.delete('buildingId');
    setParams(next);
  }
  return <Space orientation="vertical" size={28} style={{ width: '100%' }}>
    <Card className="hero" variant="borderless">
      <Row align="middle" gutter={[32, 24]}>
        <Col xs={24} lg={17}>
          <Tag icon={<EnvironmentOutlined />} color="blue">Рядом с домом</Tag>
          <Typography.Title level={1}>Хорошие соседи.<br />Полезные услуги.</Typography.Title>
          <Typography.Paragraph className="hero-description">Найдите мастера в своём ЖК или предложите помощь соседям. Без долгой дороги — с прямой связью с исполнителем.</Typography.Paragraph>
          <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => navigate('/services/new')}>Предложить услугу</Button>
        </Col>
        <Col xs={24} lg={7} className="hero-note"><Space orientation="vertical" size={16}>
          <SearchOutlined className="hero-icon" />
          <Typography.Title level={4}>Всё начинается по соседству</Typography.Title>
          <Typography.Text>Выберите свой дом, найдите услугу и напишите исполнителю в мессенджере.</Typography.Text>
        </Space></Col>
      </Row>
    </Card>
    <Row gutter={[24, 24]}>
      <Col xs={24} lg={6}>
        <Card title={<><EnvironmentOutlined /> Где ищем?</>} className="filter-card">
          <Form layout="vertical">
            <Form.Item label="Жилой комплекс"><Select aria-label="Жилой комплекс" allowClear showSearch optionFilterProp="label" placeholder="Все жилые комплексы" value={complexId}
              loading={complexes.isFetching} options={complexes.data?.map((c) => ({ value: c.id, label: c.name }))} onChange={(v) => change('residentialComplexId', v)} /></Form.Item>
            <Form.Item label="Дом"><Select aria-label="Дом" allowClear showSearch optionFilterProp="label" placeholder="Все дома" value={buildingId} disabled={!complexId}
              loading={buildings.isFetching} options={buildings.data?.map((b) => ({ value: b.id, label: b.label ? `${b.label} · ${b.address}` : b.address }))} onChange={(v) => change('buildingId', v)} /></Form.Item>
            <Button block onClick={() => setParams({})}>Сбросить фильтры</Button>
          </Form>
          <QueryState error={complexes.error || buildings.error} retry={() => { void complexes.refetch(); if (complexId) void buildings.refetch(); }} />
          {complexes.data?.length === 0 && <Alert type="info" title="Жилые комплексы ещё не добавлены" description="Справочник заполняет администратор сервиса." />}
        </Card>
      </Col>
      <Col xs={24} lg={18}>
        <Space orientation="vertical" size={20} style={{ width: '100%' }}>
          <Space wrap className="category-options">
            <Button type={!categoryId ? 'primary' : 'default'} onClick={() => change('categoryId')}>Все услуги</Button>
            {categories.data?.map((c) => <Button key={c.id} type={categoryId === c.id ? 'primary' : 'default'} onClick={() => change('categoryId', c.id)}>{c.name}</Button>)}
          </Space>
          <QueryState error={categories.error} retry={categories.refetch} />
          <Space className="section-heading" wrap><Typography.Title level={2}>Услуги соседей</Typography.Title><Typography.Text type="secondary">{services.data ? formatServiceCount(services.data.totalElements) : 'Находим услуги рядом'}</Typography.Text></Space>
          <QueryState loading={services.isFetching} error={services.error} retry={services.refetch} />
          {!services.isFetching && !services.error && services.data && <>
            <ServiceGrid items={services.data.items} />
            <Pagination align="center" current={page + 1} pageSize={12} total={services.data.totalElements} showSizeChanger={false} hideOnSinglePage onChange={(p) => change('page', String(p - 1))} />
          </>}
        </Space>
      </Col>
    </Row>
  </Space>;
}
