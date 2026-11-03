import { test, expect, type Page } from '@playwright/test';

const complexId = '11111111-1111-4111-8111-111111111111';
const buildingId = '22222222-2222-4222-8222-222222222222';
const serviceId = '33333333-3333-4333-8333-333333333333';
const userId = '44444444-4444-4444-8444-444444444444';
const addressLabel = 'Москва, Речная улица, 1';
const candidate = { key: 'osm:W:123', label: addressLabel, latitude: 55.75, longitude: 37.61 };
const address = { id: complexId, label: addressLabel, latitude: 55.75, longitude: 37.61 };
const categories = [{ id: 'FOOD', name: 'Еда' }, { id: 'ELECTRICAL', name: 'Электрика' }, { id: 'PLUMBING', name: 'Сантехника' }, { id: 'CLEANING', name: 'Уборка' }, { id: 'REPAIR', name: 'Ремонт' }];
const coverage = [{ residentialComplexId: complexId, selectionMode: 'ALL_BUILDINGS', buildingIds: [] }];
const initialProfile = { id: userId, name: 'Анна', photoUrl: null, about: 'Помогаю соседям', primaryResidentialComplexId: complexId, additionalResidentialComplexIds: [], contacts: [{ type: 'TELEGRAM', value: 'https://t.me/neighbor' }] };
const initialService = { id: serviceId, title: 'Уборка квартиры', categoryId: 'CLEANING', price: 1500, photoUrls: [], owner: { id: userId, name: 'Анна' }, description: 'Поддерживающая уборка квартиры', coverage };

test.beforeEach(async ({ page }) => {
  let profile = structuredClone(initialProfile);
  let service = structuredClone(initialService);
  let locations = { primaryResidentialComplexId: complexId, selections: structuredClone(coverage) };
  await page.route('https://tile.openstreetmap.org/**', (route) => route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jG1EAAAAASUVORK5CYII=', 'base64') }));
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace('/api/v1', '');
    const method = request.method();
    const body = method === 'POST' || method === 'PUT' ? request.postDataJSON() : undefined;
    let data: unknown;
    let status = 200;
    if (path === '/categories') data = categories;
    else if (path === '/addresses/search' || path === '/addresses/reverse') data = [candidate];
    else if (path === '/addresses/select' || path === `/addresses/${complexId}`) data = address;
    else if (path === `/residential-complexes/${complexId}/buildings`) data = [{ id: buildingId, residentialComplexId: complexId, address: 'Речная улица, 1', label: 'Корпус 1' }];
    else if (path === '/auth/login') data = { access_token: 'test-access', refresh_token: 'test-refresh', expires_in: 900, username: userId };
    else if (path === '/auth/register') { data = { id: userId, name: body.name, email: body.email }; status = 201; }
    else if (path === '/auth/logout') { await route.fulfill({ status: 204 }); return; }
    else if (path === '/auth/me') data = { id: userId, name: profile.name, email: 'anna@example.test' };
    else if (path === '/me' && method === 'GET') data = { profile, locations };
    else if (path === '/me' && method === 'PUT') { profile = { ...profile, ...body }; data = profile; }
    else if (path === '/me/locations') { locations = body; data = locations; }
    else if (path === `/users/${userId}`) data = profile;
    else if ((path === '/services' || path === `/users/${userId}/services`) && method === 'GET') data = { items: [service], page: Number(url.searchParams.get('page') || 0), size: 12, totalElements: 1 };
    else if (path === `/services/${serviceId}` && method === 'GET') data = service;
    else if ((path === '/services' && method === 'POST') || (path === `/services/${serviceId}` && method === 'PUT')) { service = { ...service, ...body }; data = service; status = method === 'POST' ? 201 : 200; }
    else if (path === '/health') data = { status: 'UP' };
    else { await route.fulfill({ status: 404, json: { message: 'Not found' } }); return; }
    await route.fulfill({ status, json: data });
  });
});

async function login(page: Page, destination = '/my-services') {
  await page.goto(destination);
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('Email', { exact: true }).fill('anna@example.test');
  await page.getByLabel('Пароль', { exact: true }).fill('password-1234');
  await page.getByRole('main').getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(destination.replaceAll('/', '\\/') + '$'));
}

test('catalog, URL filters, service, messenger and public profile', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Услуги соседей' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Уборка квартиры', exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('catalog.png'), fullPage: true, animations: 'disabled' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Уборка', exact: true }).click();
  await expect(page).toHaveURL(/categoryId=CLEANING/);
  await page.getByRole('combobox', { name: 'Адрес поиска' }).fill('Москва Речная 1');
  await page.getByRole('option', { name: addressLabel, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`residentialComplexId=${complexId}`));
  await page.getByRole('link', { name: 'Уборка квартиры', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Уборка квартиры', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Написать в Telegram' })).toHaveAttribute('href', 'https://t.me/neighbor');
  await page.getByRole('button', { name: 'Профиль и все услуги' }).click();
  await expect(page.getByRole('heading', { name: 'Анна', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Услуги исполнителя' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('register with searched address and require a separate login', async ({ page }) => {
  await page.goto('/register');
  await page.getByLabel('Как вас зовут').fill('Анна');
  await page.getByLabel('Email', { exact: true }).fill('anna@example.test');
  await page.getByLabel('Пароль', { exact: true }).fill('password-1234');
  await page.getByLabel('Повторите пароль').fill('password-1234');
  await page.getByRole('combobox', { name: 'Ваш основной адрес' }).fill('Москва Речная 1');
  await page.getByRole('option', { name: addressLabel, exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Ваш основной адрес' })).toHaveValue('');
  const request = page.waitForRequest((r) => r.url().endsWith('/auth/register') && r.method() === 'POST');
  await page.getByRole('button', { name: 'Создать аккаунт', exact: true }).click();
  expect((await request).postDataJSON()).toEqual({ name: 'Анна', email: 'anna@example.test', password: 'password-1234', primaryResidentialComplexId: complexId });
  await expect(page.getByText('Аккаунт создан', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Перейти ко входу' }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test('edit profile, clear contacts and logout', async ({ page }) => {
  await login(page, '/me');
  await page.getByLabel('Имя', { exact: true }).fill('Анна Соседова');
  await page.getByLabel(/^О себе/).fill('Помогу с уборкой');
  await page.getByLabel(/^Telegram/).fill('');
  const request = page.waitForRequest((r) => r.url().endsWith('/me') && r.method() === 'PUT');
  await page.getByRole('button', { name: 'Сохранить профиль' }).click();
  expect((await request).postDataJSON()).toEqual({ name: 'Анна Соседова', about: 'Помогу с уборкой', photoUrl: null, contacts: [] });
  await expect(page.getByText('Профиль сохранён', { exact: true })).toBeVisible();
  const mobileMenu = page.getByRole('button', { name: 'Открыть меню' });
  if (await mobileMenu.isVisible()) await mobileMenu.click();
  await page.getByRole('button', { name: 'Выйти', exact: true }).click();
  await expect(page).toHaveURL(`http://localhost:${process.env.E2E_PORT || '5173'}/`);
  await page.goto('/me');
  await expect(page).toHaveURL(/\/login$/);
});

test('save address selections in location settings', async ({ page }) => {
  await login(page, '/me/locations');
  await expect(page.getByText(addressLabel, { exact: true }).first()).toBeVisible();
  const request = page.waitForRequest((r) => r.url().endsWith('/me/locations') && r.method() === 'PUT');
  await page.getByRole('button', { name: 'Сохранить локации' }).click();
  expect((await request).postDataJSON()).toEqual({ primaryResidentialComplexId: complexId, selections: coverage });
  await expect(page.getByText('Локации сохранены', { exact: true })).toBeVisible();
});

test('publish and then edit a service with coverage', async ({ page }, info) => {
  await login(page, '/services/new');
  await page.getByLabel('Название услуги').fill('Помощь с уборкой');
  await page.getByLabel('Категория', { exact: true }).click();
  await page.getByRole('option', { name: 'Уборка', exact: true }).click();
  await page.getByLabel('Описание', { exact: true }).fill('Уборка для соседей в удобное время');
  await page.getByLabel('Стоимость', { exact: true }).fill('1250.50');
  await page.getByRole('heading', { name: 'Предложить услугу', exact: true }).click();
  await page.screenshot({ path: info.outputPath('service-editor.png'), fullPage: true, animations: 'disabled' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const created = page.waitForRequest((r) => new URL(r.url()).pathname === '/api/v1/services' && r.method() === 'POST');
  await page.getByRole('button', { name: 'Опубликовать услугу' }).click();
  expect((await created).postDataJSON()).toEqual({ title: 'Помощь с уборкой', categoryId: 'CLEANING', description: 'Уборка для соседей в удобное время', price: 1250.5, photoUrls: [], coverage });
  await expect(page.getByRole('heading', { name: 'Помощь с уборкой', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Редактировать услугу', exact: true }).click();
  await page.getByLabel('Название услуги').fill('Уборка по выходным');
  const edited = page.waitForRequest((r) => r.url().endsWith(`/services/${serviceId}`) && r.method() === 'PUT');
  await page.getByRole('button', { name: 'Сохранить изменения' }).click();
  expect((await edited).postDataJSON().title).toBe('Уборка по выходным');
  await expect(page.getByRole('heading', { name: 'Уборка по выходным', exact: true })).toBeVisible();
});

test('empty catalog, server failure, health and not found', async ({ page }) => {
  await page.route('**/api/v1/services?**', (route) => route.fulfill({ json: { items: [], page: 0, size: 12, totalElements: 0 } }));
  await page.goto('/');
  await expect(page.getByText('Пока нет услуг.', { exact: false })).toBeVisible();
  await page.route('**/api/v1/services?**', (route) => route.fulfill({ status: 500, json: {} }));
  await page.getByRole('button', { name: 'Уборка', exact: true }).click();
  await expect(page.getByText('Сервер временно недоступен.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Повторить', exact: true }).click();
  await page.goto('/health');
  await expect(page.getByText('Сервер доступен', { exact: true })).toBeVisible();
  await page.goto('/missing-page');
  await expect(page.getByText('Страница не найдена', { exact: true })).toBeVisible();
});

test('choose an address by clicking the map and confirm the nearby house', async ({ page }, info) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Выбрать на карте' }).click();
  const map = page.getByRole('region', { name: 'Карта выбора адреса' });
  await expect(map).toBeVisible();
  const reverse = page.waitForRequest((r) => r.url().includes('/addresses/reverse?'));
  await map.click({ position: { x: 120, y: 160 } });
  const point = new URL((await reverse).url());
  expect(Number.isFinite(Number(point.searchParams.get('latitude')))).toBe(true);
  await page.screenshot({ path: info.outputPath('address-map.png'), fullPage: true });
  await page.getByRole('button', { name: addressLabel, exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page).toHaveURL(new RegExp(`residentialComplexId=${complexId}`));
});

test('map center lookup supports keyboard users and handles no houses', async ({ page }) => {
  await page.route('**/api/v1/addresses/reverse?**', (route) => route.fulfill({ json: [] }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Выбрать на карте' }).click();
  await page.getByRole('button', { name: 'Найти адрес в центре карты' }).click();
  await expect(page.getByText('В пределах 150 метров нет адреса дома в России.', { exact: false })).toBeVisible();
});

test('require a suggested address and handle provider and selection errors', async ({ page }) => {
  await page.route('**/api/v1/addresses/search?**', (route) => route.fulfill({ status: 503, json: {} }));
  await page.goto('/register');
  const input = page.getByRole('combobox', { name: 'Ваш основной адрес' });
  await input.fill('Москва Речная 1');
  await expect(page.getByText('Не удалось загрузить адреса.', { exact: false })).toBeVisible();
  await page.route('**/api/v1/addresses/search?**', (route) => route.fulfill({ json: [candidate] }));
  await page.route('**/api/v1/addresses/select', (route) => route.fulfill({ status: 400, json: {} }));
  await input.fill('Москва Речная 1а');
  await page.getByRole('option', { name: addressLabel, exact: true }).click();
  await expect(page.getByText('Не удалось выбрать адрес.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Создать аккаунт', exact: true }).click();
  await expect(page.getByText('Выберите адрес из подсказок или на карте', { exact: true })).toBeVisible();
});

test('prevent duplicate addresses in coverage', async ({ page }) => {
  await login(page, '/me/locations');
  await page.getByRole('button', { name: 'Добавить адрес', exact: true }).click();
  await page.getByRole('combobox', { name: 'Адрес', exact: true }).nth(1).fill('Москва Речная 1');
  await page.getByRole('option', { name: addressLabel, exact: true }).click();
  await page.getByRole('button', { name: 'Сохранить локации' }).click();
  await expect(page.getByText('Адреса не должны повторяться', { exact: true })).toBeVisible();
});

test('add a new address and make it primary', async ({ page }) => {
  const secondId = '55555555-5555-4555-8555-555555555555';
  const secondLabel = 'Москва, Речная улица, 2';
  const second = { ...address, id: secondId, label: secondLabel };
  await page.route('**/api/v1/addresses/search?**', (route) => route.fulfill({ json: [{ ...candidate, key: 'osm:W:456', label: secondLabel }] }));
  await page.route('**/api/v1/addresses/select', (route) => route.fulfill({ json: second }));
  await page.route(`**/api/v1/addresses/${secondId}`, (route) => route.fulfill({ json: second }));
  await login(page, '/me/locations');
  await page.getByRole('button', { name: 'Добавить адрес', exact: true }).click();
  await page.getByRole('combobox', { name: 'Адрес', exact: true }).nth(1).fill('Москва Речная 2');
  await page.getByRole('option', { name: secondLabel, exact: true }).click();
  await expect(page.getByText(secondLabel, { exact: true }).first()).toBeVisible();
  const primary = page.getByLabel('Основной адрес', { exact: true });
  await primary.click();
  const listId = await primary.getAttribute('aria-controls');
  await page.locator(`[id="${listId}"]`).getByRole('option', { name: secondLabel, exact: true }).click();
  const request = page.waitForRequest((r) => r.url().endsWith('/me/locations') && r.method() === 'PUT');
  await page.getByRole('button', { name: 'Сохранить локации' }).click();
  expect((await request).postDataJSON()).toEqual({ primaryResidentialComplexId: secondId, selections: [...coverage,
    { residentialComplexId: secondId, selectionMode: 'ALL_BUILDINGS', buildingIds: [] }] });
});

test('preserve legacy selected houses when saving without changing address', async ({ page }) => {
  const legacy = [{ residentialComplexId: complexId, selectionMode: 'SELECTED_BUILDINGS', buildingIds: [buildingId] }];
  await page.route('**/api/v1/me', (route) => route.fulfill({ json: { profile: initialProfile,
    locations: { primaryResidentialComplexId: complexId, selections: legacy } } }));
  await login(page, '/me/locations');
  await expect(page.getByText('Сохранённый ранее выбор домов будет сохранён.', { exact: false })).toBeVisible();
  const request = page.waitForRequest((r) => r.url().endsWith('/me/locations') && r.method() === 'PUT');
  await page.getByRole('button', { name: 'Сохранить локации' }).click();
  expect((await request).postDataJSON()).toEqual({ primaryResidentialComplexId: complexId, selections: legacy });
});

test('hide stale suggestions after the search text changes', async ({ page }) => {
  let release!: () => void;
  const firstResponse = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/api/v1/addresses/search?**', async (route) => {
    const q = new URL(route.request().url()).searchParams.get('q');
    if (q === 'Москва') { await firstResponse; await route.fulfill({ json: [candidate] }); }
    else await route.fulfill({ json: [{ ...candidate, key: 'osm:W:789', label: 'Тверь, Советская улица, 1' }] });
  });
  await page.goto('/');
  const input = page.getByRole('combobox', { name: 'Адрес поиска' });
  const request = page.waitForRequest((r) => r.url().includes('/addresses/search?'));
  await input.fill('Москва');
  await request;
  await input.fill('Тверь');
  release();
  await expect(page.getByRole('option', { name: 'Тверь, Советская улица, 1', exact: true })).toBeVisible();
  await expect(page.getByRole('option', { name: addressLabel, exact: true })).not.toBeVisible();
});
