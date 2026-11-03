export function isHttps(value: string) {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && !url.port; }
  catch { return false; }
}
export const httpsRule = {
  validator: (_: unknown, value?: string) => !value || (value.length <= 2048 && isHttps(value))
    ? Promise.resolve() : Promise.reject(new Error('Укажите HTTPS-ссылку длиной до 2048 символов')),
};
export function isContact(type: string, value: string) {
  try {
    const url = new URL(value);
    if (!isHttps(value) || url.search || url.hash || url.port || value.length > 2048) return false;
    return type === 'TELEGRAM'
      ? url.hostname === 't.me' && /^\/[A-Za-z0-9_]+$/.test(url.pathname)
      : url.hostname === 'wa.me' && /^\/[1-9]\d{4,14}$/.test(url.pathname);
  } catch { return false; }
}
export function isPassword(value: string) { return value.trim().length > 0 && value.length >= 12 && new TextEncoder().encode(value).length <= 72; }
export function photoLines(value?: string): string[] { return (value || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean); }
export function errorText(error: unknown): string {
  if (!error || typeof error !== 'object' || !('status' in error)) return 'Не удалось выполнить действие. Повторите попытку.';
  switch (error.status) {
    case 400: case 422: return 'Проверьте заполнение полей и выбранные локации.';
    case 401: return 'Не удалось подтвердить вход. Проверьте email и пароль или войдите снова.';
    case 403: return 'У вас нет прав для этого действия.';
    case 404: return 'Запись не найдена или больше недоступна.';
    case 409: return 'Этот email уже зарегистрирован.';
    case 'FETCH_ERROR': case 'TIMEOUT_ERROR': return 'Нет связи с сервером. Проверьте подключение и повторите попытку.';
    default: return 'Сервер временно недоступен. Повторите попытку позже.';
  }
}
export const formatPrice = (value: number) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value);
export function formatServiceCount(value: number) {
  const ending = new Intl.PluralRules('ru-RU').select(value);
  return `${value} ${{ one: 'предложение', few: 'предложения', many: 'предложений', other: 'предложения', zero: 'предложений', two: 'предложения' }[ending]}`;
}
