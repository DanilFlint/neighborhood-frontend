import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Modal, Select, Space, Spin, Typography } from 'antd';
import { EnvironmentOutlined } from '@ant-design/icons';
import { api } from '../api/api';
import type { Address, AddressCandidate } from '../api/types';
import { AddressMap } from './AddressMap';

export function AddressLabel({ id }: { id: string }) {
  const address = api.useAddressQuery(id);
  return <>{address.data?.label || (address.isError ? 'Адрес недоступен' : 'Загрузка адреса…')}</>;
}

export function AddressPicker({ value, onChange, id, 'aria-label': ariaLabel = 'Адрес', allowClear = false }: {
  value?: string; onChange?: (id?: string) => void; id?: string; 'aria-label'?: string; allowClear?: boolean;
}) {
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<Address>();
  const [error, setError] = useState(false);
  const [nearby, setNearby] = useState<AddressCandidate[]>([]);
  const [mapBusy, setMapBusy] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [mapSearched, setMapSearched] = useState(false);
  const version = useRef(0);
  const pendingSelection = useRef<number | null>(null);
  const mapVersion = useRef(0);
  const address = api.useAddressQuery(value!, { skip: !value });
  const results = api.useSearchAddressesQuery(query, { skip: query.length < 3 || query !== text.trim(), refetchOnMountOrArgChange: true });
  const [select, saving] = api.useSelectAddressMutation();
  const [reverse] = api.useLazyReverseAddressQuery();
  useEffect(() => { const timer = setTimeout(() => setQuery(text.trim()), 650); return () => clearTimeout(timer); }, [text]);
  useEffect(() => () => { version.current++; mapVersion.current++; }, []);
  async function choose(candidate: AddressCandidate) {
    const current = ++version.current;
    pendingSelection.current = current;
    setError(false);
    try {
      const selected = await select(candidate.key).unwrap();
      if (current !== version.current) return;
      setChosen(selected); onChange?.(selected.id); setText(''); setQuery(''); setOpen(false);
    } catch { if (current === version.current) setError(true); }
    finally { if (pendingSelection.current === current) pendingSelection.current = null; }
  }
  async function locate(point: { latitude: number; longitude: number }) {
    version.current++;
    const current = ++mapVersion.current;
    setMapBusy(true); setMapError(false); setMapSearched(true); setNearby([]);
    try { const found = await reverse(point).unwrap(); if (current === mapVersion.current) setNearby(found); }
    catch { if (current === mapVersion.current) setMapError(true); }
    finally { if (current === mapVersion.current) setMapBusy(false); }
  }
  const active = chosen?.id === value ? chosen : address.data;
  const suggestions = query === text.trim() && query.length >= 3 ? results.currentData || [] : [];
  return <Space orientation="vertical" style={{ width: '100%' }}>
    <Select id={id} aria-label={ariaLabel} style={{ width: '100%' }} showSearch allowClear={allowClear} filterOption={false}
      placeholder="Город, улица, номер дома" value={value} searchValue={text} disabled={saving.isLoading} loading={results.isFetching || saving.isLoading}
      options={[...(value ? [{ value, label: active?.label || 'Загрузка адреса…' }] : []), ...suggestions.map((item) => ({ value: item.key, label: item.label }))]}
      onSearch={(input) => {
        // Select clears its search after an option click; that must not cancel the pending confirmation.
        if (!input && pendingSelection.current !== null) return;
        version.current++; setText(input); setError(false); if (value) onChange?.(undefined);
      }}
      onClear={() => { version.current++; onChange?.(undefined); setText(''); setQuery(''); }}
      onChange={(key) => { const candidate = suggestions.find((item) => item.key === key); if (candidate) void choose(candidate); }}
      notFoundContent={results.isFetching ? <Spin size="small" /> : text.trim().length < 3 ? 'Введите минимум 3 символа' : 'Адрес не найден. Уточните город, улицу и номер дома.'} />
    {(results.isError || error || address.isError) && <Alert type="error" showIcon title={error ? 'Не удалось выбрать адрес. Повторите поиск и выберите вариант снова.' : 'Не удалось загрузить адреса. Повторите поиск немного позже.'} />}
    <Button icon={<EnvironmentOutlined aria-hidden="true" />} onClick={() => { version.current++; setNearby([]); setMapBusy(false); setMapError(false); setError(false); setMapSearched(false); setOpen(true); }}>Выбрать на карте</Button>
    <Typography.Text type="secondary">Адреса: © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>, поиск Photon.</Typography.Text>
    <Modal title="Выберите адрес на карте" open={open} footer={null} width={760} destroyOnHidden onCancel={() => { mapVersion.current++; version.current++; setOpen(false); }}>
      {open && <AddressMap address={active} onLocate={(point) => { void locate(point); }} />}
      {mapBusy && <Spin className="top-gap" tip="Ищем ближайшие дома…"><div style={{ minHeight: 40 }} /></Spin>}
      {mapError && <Alert className="top-gap" type="error" title="Не удалось найти адрес. Попробуйте ещё раз через несколько секунд." />}
      {error && <Alert className="top-gap" type="error" title="Не удалось выбрать адрес. Найдите дом на карте ещё раз." />}
      {mapSearched && !mapBusy && !mapError && nearby.length === 0 && <Alert className="top-gap" type="info" title="В пределах 150 метров нет адреса дома в России. Выберите другую точку или воспользуйтесь поиском." />}
      <Space orientation="vertical" className="top-gap" style={{ width: '100%' }}>{nearby.map((candidate) => <Button key={candidate.key} block loading={saving.isLoading} style={{ minHeight: 40, height: 'auto', whiteSpace: 'normal', textAlign: 'left' }} onClick={() => { void choose(candidate); }}>{candidate.label}</Button>)}</Space>
    </Modal>
  </Space>;
}
