import { Button, Card, Form, Radio, Select, Space } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { api } from '../api/api';
import type { LocationSelection } from '../api/types';
import { QueryState } from './QueryState';

function LocationRow({ listName, index, remove }: { listName: string; index: number; remove: () => void }) {
  const form = Form.useFormInstance();
  const complexId = Form.useWatch([listName, index, 'residentialComplexId'], form);
  const mode = Form.useWatch([listName, index, 'selectionMode'], form);
  const { data: complexes = [], error, refetch } = api.useComplexesQuery();
  const buildings = api.useBuildingsQuery(complexId!, { skip: !complexId });
  return <Card size="small" title={`Жилой комплекс ${index + 1}`} extra={<Button danger type="text" icon={<DeleteOutlined />} onClick={remove} aria-label={`Убрать ЖК ${index + 1}`} />}>
    <QueryState error={error} retry={refetch} />
    <Form.Item name={[index, 'residentialComplexId']} label="Жилой комплекс" rules={[{ required: true, message: 'Выберите ЖК' }]}>
      <Select showSearch optionFilterProp="label" placeholder="Выберите из справочника" options={complexes.map((c) => ({ value: c.id, label: c.name }))}
        onChange={() => form.setFieldValue([listName, index, 'buildingIds'], [])} />
    </Form.Item>
    <Form.Item name={[index, 'selectionMode']} label="Дома" rules={[{ required: true }]}>
      <Radio.Group onChange={() => form.setFieldValue([listName, index, 'buildingIds'], [])} options={[
        { value: 'ALL_BUILDINGS', label: 'Все дома ЖК' }, { value: 'SELECTED_BUILDINGS', label: 'Выбрать дома' },
      ]} />
    </Form.Item>
    {mode === 'SELECTED_BUILDINGS' && <>
      <QueryState error={buildings.error} retry={buildings.refetch} />
      <Form.Item name={[index, 'buildingIds']} label="Выбранные дома" rules={[{ required: true, type: 'array', min: 1, max: 500, message: 'Выберите от 1 до 500 домов' }]}>
        <Select mode="multiple" loading={buildings.isFetching} disabled={!complexId} optionFilterProp="label" placeholder="Выберите дома"
          options={(buildings.data || []).map((b) => ({ value: b.id, label: b.label ? `${b.label} · ${b.address}` : b.address }))} />
      </Form.Item>
    </>}
    {mode !== 'SELECTED_BUILDINGS' && <Form.Item name={[index, 'buildingIds']} hidden><Select mode="multiple" /></Form.Item>}
  </Card>;
}

export function LocationFields({ name }: { name: 'coverage' | 'selections' }) {
  return <Form.List name={name} rules={[{ validator: async (_, selections?: LocationSelection[]) => {
    if (!selections?.length || selections.length > 50) throw new Error('Добавьте от 1 до 50 жилых комплексов');
    const ids = selections.map((s) => s?.residentialComplexId);
    if (new Set(ids).size !== ids.length) throw new Error('Жилые комплексы не должны повторяться');
  } }]}>
    {(fields, { add, remove }, { errors }) => <Space orientation="vertical" size={16} style={{ width: '100%' }}>
      {fields.map((field) => <LocationRow key={field.key} listName={name} index={field.name} remove={() => remove(field.name)} />)}
      <Form.ErrorList errors={errors} />
      <Button icon={<PlusOutlined />} type="dashed" block disabled={fields.length >= 50}
        onClick={() => add({ selectionMode: 'ALL_BUILDINGS', buildingIds: [] })}>Добавить жилой комплекс</Button>
    </Space>}
  </Form.List>;
}
