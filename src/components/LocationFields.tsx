import { Button, Card, Form, Input, Select, Space, Typography } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import type { LocationSelection } from '../api/types';
import { AddressPicker } from './AddressPicker';

function LocationRow({ listName, index, remove }: { listName: string; index: number; remove: () => void }) {
  const form = Form.useFormInstance();
  const mode = Form.useWatch([listName, index, 'selectionMode'], form);
  return <Card size="small" title={`Адрес ${index + 1}`} extra={<Button danger type="text" icon={<DeleteOutlined />} onClick={remove} aria-label={`Убрать адрес ${index + 1}`} />}>
    <Form.Item name={[index, 'residentialComplexId']} label="Адрес" rules={[{ required: true, message: 'Выберите адрес из подсказок или на карте' }]}>
      <AddressPicker onChange={() => { form.setFieldValue([listName, index, 'selectionMode'], 'ALL_BUILDINGS'); form.setFieldValue([listName, index, 'buildingIds'], []); }} />
    </Form.Item>
    {mode === 'SELECTED_BUILDINGS' && <Typography.Paragraph type="secondary">Сохранённый ранее выбор домов будет сохранён. Выбор нового адреса заменит его одним домом.</Typography.Paragraph>}
    <Form.Item name={[index, 'selectionMode']} hidden><Input /></Form.Item>
    <Form.Item name={[index, 'buildingIds']} hidden><Select mode="multiple" /></Form.Item>
  </Card>;
}

export function LocationFields({ name }: { name: 'coverage' | 'selections' }) {
  return <Form.List name={name} rules={[{ validator: async (_, selections?: LocationSelection[]) => {
    if (!selections?.length || selections.length > 50) throw new Error('Добавьте от 1 до 50 адресов');
    const ids = selections.map((s) => s?.residentialComplexId).filter(Boolean);
    if (new Set(ids).size !== ids.length) throw new Error('Адреса не должны повторяться');
  } }]}>
    {(fields, { add, remove }, { errors }) => <Space orientation="vertical" size={16} style={{ width: '100%' }}>
      {fields.map((field) => <LocationRow key={field.key} listName={name} index={field.name} remove={() => remove(field.name)} />)}
      <Form.ErrorList errors={errors} />
      <Button icon={<PlusOutlined aria-hidden="true" />} type="dashed" block disabled={fields.length >= 50}
        onClick={() => add({ selectionMode: 'ALL_BUILDINGS', buildingIds: [] })}>Добавить адрес</Button>
    </Space>}
  </Form.List>;
}
