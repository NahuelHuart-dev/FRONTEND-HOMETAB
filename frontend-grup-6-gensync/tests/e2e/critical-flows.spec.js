import { expect, test } from '@playwright/test'

const email = process.env.E2E_EMAIL
const password = process.env.E2E_PASSWORD
const apiURL = process.env.E2E_API_URL || 'http://127.0.0.1:8000/api'

test.beforeEach(() => {
  test.skip(!email || !password, 'Set E2E_EMAIL and E2E_PASSWORD to run authenticated smoke tests.')
})

const login = async (page) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel(/contrasena|password/i).fill(password)
  await page.locator('.login-card .btn-login').first().click()

  const skipTwoFactorPrompt = page.getByRole('button', { name: /ahora no|ara no|not now/i })
  await Promise.race([
    page.waitForURL(/\/tabhub|\/households/, { timeout: 5_000 }).catch(() => null),
    skipTwoFactorPrompt.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => null),
  ])

  if (await skipTwoFactorPrompt.isVisible().catch(() => false)) {
    await skipTwoFactorPrompt.click()
  }

  await expect(page).toHaveURL(/\/tabhub|\/households/)
  await expect(page.getByRole('heading', { name: /mis tabs|my tabs|els meus tabs/i })).toBeVisible()
  await expect(page.getByText(/loading your homes|cargando|carregant/i)).toBeHidden({ timeout: 10_000 })
}

const createHousehold = async (page, name) => {
  await page.getByText(/crear nueva tab|create new tab|crear nou tab/i).click()
  await page.getByPlaceholder(/piso de estudiantes/i).fill(name)
  await page.getByRole('button', { name: /crear tab|create tab/i }).click()
  await expect(page.getByText(name)).toBeVisible()
  await page.getByText(name).click()
  await page.waitForURL(/\/households\/\d+\/dashboard/)
  return page.url().match(/\/households\/(\d+)\//)?.[1]
}

const openHouseTab = async (page, name) => {
  await page.locator('.desktop-house-tabs').getByRole('button', { name }).click()
}

const authHeaders = async (page) => {
  const token = await page.evaluate(() => localStorage.getItem('token'))
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

const createCriticalResources = async (request, page, homeId, suffix) => {
  const headers = await authHeaders(page)
  const membersResponse = await request.get(`${apiURL}/households/${homeId}/members`, { headers })
  expect(membersResponse.ok()).toBeTruthy()
  const membersBody = await membersResponse.json()
  const memberId = membersBody.members?.[0]?.id
  expect(memberId).toBeTruthy()

  const taskResponse = await request.post(`${apiURL}/households/${homeId}/tasks`, {
    headers,
    data: {
      title: `E2E Tarea ${suffix}`,
      description: 'Creada por Playwright',
      priority: 'Mitja',
      assignedTo: memberId,
    },
  })
  expect(taskResponse.ok()).toBeTruthy()

  const expenseResponse = await request.post(`${apiURL}/households/${homeId}/expenses`, {
    headers,
    data: {
      title: `E2E Gasto ${suffix}`,
      amount: 12,
      category: 'E2E',
      paymentType: 'shared',
      paidAt: '2026-05-19',
      splitBetween: [memberId],
      sharePayments: [{ userId: memberId, isPaid: false }],
    },
  })
  expect(expenseResponse.ok()).toBeTruthy()

  const eventResponse = await request.post(`${apiURL}/households/${homeId}/events`, {
    headers,
    data: {
      title: `E2E Evento ${suffix}`,
      description: 'Creado por Playwright',
      startDate: '2026-05-20T20:00:00',
      participants: [],
    },
  })
  expect(eventResponse.ok()).toBeTruthy()
}

test('login and open Mis Tabs', async ({ page }) => {
  await login(page)
  await expect(page.getByRole('heading', { name: /mis tabs|my tabs|els meus tabs/i })).toBeVisible()
})

test('create household, task, expense and event smoke path', async ({ page, request }) => {
  const suffix = Date.now().toString().slice(-6)

  await login(page)

  const homeId = await createHousehold(page, `E2E Casa ${suffix}`)
  await createCriticalResources(request, page, homeId, suffix)

  await openHouseTab(page, /tareas|tasks|tasques/i)
  await expect(page.getByText(`E2E Tarea ${suffix}`).first()).toBeVisible()

  await openHouseTab(page, /gastos|expenses|despeses/i)
  await expect(page.getByText(`E2E Gasto ${suffix}`).first()).toBeVisible()

  await openHouseTab(page, /calendario|calendar|calendari/i)
  await expect(page.getByText(`E2E Evento ${suffix}`).first()).toBeVisible()
})

test('open notifications, chat and multimedia smoke path', async ({ page }) => {
  const suffix = Date.now().toString().slice(-6)

  await login(page)

  const houseName = `E2E QA ${suffix}`
  await createHousehold(page, houseName)

  await page.getByRole('button', { name: /notifications|notificaciones|notificacions/i }).click()
  await expect(page.getByText(/notifications|notificaciones|notificacions/i)).toBeVisible()
  await page.getByRole('button', { name: /cerrar|close/i }).click()
  await expect(page.locator('.notifications-panel')).toBeHidden()

  await page.getByRole('button', { name: /chat/i }).click()
  const chatBox = page.getByRole('textbox', { name: /escribe|write/i })
  if (!(await chatBox.isVisible({ timeout: 2_000 }).catch(() => false))) {
    await page.getByRole('button', { name: new RegExp(houseName) }).click()
  }
  await chatBox.fill(`E2E chat ${suffix}`)
  await page.getByRole('button', { name: /send|enviar/i }).click()
  await expect(page.getByText(`E2E chat ${suffix}`)).toBeVisible()

  await openHouseTab(page, /multimedia|media/i)
  await page.getByPlaceholder(/playlist/i).fill(`E2E Playlist ${suffix}`)
  await page.getByRole('button', { name: /crear|create/i }).click()
  await expect(page.getByRole('button', { name: new RegExp(`E2E Playlist ${suffix}`) })).toBeVisible()
})
