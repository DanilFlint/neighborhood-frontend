import { Button, Result, Skeleton } from 'antd';
import { errorText } from '../lib/validation';

export function QueryState({ loading, error, retry }: { loading?: boolean; error?: unknown; retry?: () => void }) {
  if (loading) return <Skeleton active paragraph={{ rows: 6 }} />;
  if (error) return <Result status="warning" title={errorText(error)} extra={retry && <Button onClick={retry}>Повторить</Button>} />;
  return null;
}
