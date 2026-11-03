import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Space, Typography } from 'antd';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Address } from '../api/types';

export function AddressMap({ address, onLocate }: { address?: Address; onLocate: (point: { latitude: number; longitude: number }) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.CircleMarker | null>(null);
  const locateRef = useRef(onLocate);
  const [tileError, setTileError] = useState(false);
  const initial = useRef(address);
  useEffect(() => { locateRef.current = onLocate; }, [onLocate]);
  useEffect(() => {
    const latitude = initial.current?.latitude ?? 55.751244;
    const longitude = initial.current?.longitude ?? 37.618423;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const map = L.map(container.current!, { zoomAnimation: !reduced, fadeAnimation: !reduced, markerZoomAnimation: !reduced })
      .setView([latitude, longitude], initial.current?.latitude != null ? 17 : 11);
    mapRef.current = map;
    const tiles = L.tileLayer(import.meta.env.VITE_OSM_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    }).addTo(map);
    tiles.on('tileerror', () => setTileError(true));
    const marker = L.circleMarker([latitude, longitude], { radius: 8, color: '#1677ff', fillOpacity: 0.8 }).addTo(map);
    markerRef.current = marker;
    map.on('click', (event: L.LeafletMouseEvent) => {
      marker.setLatLng(event.latlng);
      locateRef.current({ latitude: event.latlng.lat, longitude: event.latlng.lng });
    });
    const resize = new ResizeObserver(() => map.invalidateSize());
    resize.observe(container.current!);
    return () => { resize.disconnect(); map.remove(); mapRef.current = null; markerRef.current = null; };
  }, []);
  return <Space orientation="vertical" style={{ width: '100%' }}>
    <Typography.Paragraph>Нажмите на нужный дом. Можно перемещать карту стрелками и менять масштаб кнопками +/−, затем найти адрес в центре.</Typography.Paragraph>
    <div ref={container} className="address-map" role="region" aria-label="Карта выбора адреса" />
    {tileError && <Alert type="info" title="Если карта не загрузилась, выберите адрес через поиск." />}
    <Button block style={{ minHeight: 40, height: 'auto', whiteSpace: 'normal' }} onClick={() => {
      const point = mapRef.current?.getCenter();
      if (point) { markerRef.current?.setLatLng(point); onLocate({ latitude: point.lat, longitude: point.lng }); }
    }}>Найти адрес в центре карты</Button>
  </Space>;
}
