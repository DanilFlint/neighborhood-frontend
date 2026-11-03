import { test, expect, type Page } from '@playwright/test';

const complexId = '11111111-1111-4111-8111-111111111111';
const buildingId = '22222222-2222-4222-8222-222222222222';
const serviceId = '33333333-3333-4333-8333-333333333333';
const userId = '44444444-4444-4444-8444-444444444444';
const complexes = [{ id: complexId, name: 'Речной парк' }];
const categories = [{ id: 'FOOD', name: 'Еда' }, { id: 'ELECTRICAL', name: 'Электрика' }, { id: 'PLUMBING', name: 'Сантехника' }, { id: 'CLEANING', name: 'Уборка' }, { id: 'REPAIR', name: 'Ремонт' }];
const coverage = [{ residentialComplexId: complexId, selectionMode: 'ALL_BUILDINGS', buildingIds: [] }];
const initialProfile = { id: userId, name: 'Анна', photoUrl: null, about: 'Помогаю соседям', primaryResidentialComplexId: complexId, additionalResidentialComplexIds: [], contacts: [{ type: 'TELEGRAM', value: 'https://t.me/neighbor' }] };
const initialService = { id: serviceId, title: 'Уборка квартиры', categoryId: 'CLEANING', price: 1500, photoUrls: [], owner: { id: userId, name: 'Анна' }, description: 'Поддерживающая уборка квартиры', coverage };

test.beforeEach(async ({ page }) => {
  let profile = structuredClone(initialProfile);
  let service = structuredClone(initialService);
  let locations = { primaryResidentialComplexId: complexId, selections: structuredClone(coverage) };
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace('/api/v1', '');
    const method = request.method();
    const body = method === 'POST' || method === 'PUT' ? request.postDataJSON() : undefined;
    let data: unknown;
    let status = 200;
    if (path === '/categories') data = categories;
    else if (path === '/residential-complexes') data = complexes;
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
  await page.getByRole('combobox', { name: 'Жилой комплекс', exact: true }).click();
  await page.getByRole('option', { name: 'Речной парк', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`residentialComplexId=${complexId}`));
  await page.getByRole('combobox', { name: 'Дом', exact: true }).click();
  await page.getByRole('option', { name: 'Корпус 1 · Речная улица, 1' }).click();
  await expect(page).toHaveURL(new RegExp(`buildingId=${buildingId}`));
  await page.getByRole('link', { name: 'Уборка квартиры', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Уборка квартиры', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Написать в Telegram' })).toHaveAttribute('href', 'https://t.me/neighbor');
  await page.getByRole('button', { name: 'Профиль и все услуги' }).click();
  await expect(page.getByRole('heading', { name: 'Анна', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Услуги исполнителя' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('register with primary complex and require a separate login', async ({ page }) => {
  await page.goto('/register');
  await page.getByLabel('Как вас зовут').fill('Анна');
  await page.getByLabel('Email', { exact: true }).fill('anna@example.test');
  await page.getByLabel('Пароль', { exact: true }).fill('password-1234');
  await page.getByLabel('Повторите пароль').fill('password-1234');
  await page.getByLabel('Ваш основной ЖК').click();
  await page.getByRole('option', { name: 'Речной парк', exact: true }).click();
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
  await expect(page).toHaveURL('http://localhost:5173/');
  await page.goto('/me');
  await expect(page).toHaveURL(/\/login$/);
});

test('save selected buildings in location settings', async ({ page }) => {
  await login(page, '/me/locations');
  await page.getByRole('radio', { name: 'Выбрать дома' }).check();
  await page.getByLabel('Выбранные дома').click();
  await page.getByRole('option', { name: 'Корпус 1 · Речная улица, 1' }).click();
  await page.getByRole('heading', { name: 'Мои локации' }).click();
  const request = page.waitForRequest((r) => r.url().endsWith('/me/locations') && r.method() === 'PUT');
  await page.getByRole('button', { name: 'Сохранить локации' }).click();
  expect((await request).postDataJSON()).toEqual({ primaryResidentialComplexId: complexId, selections: [{ residentialComplexId: complexId, selectionMode: 'SELECTED_BUILDINGS', buildingIds: [buildingId] }] });
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
