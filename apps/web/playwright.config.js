import { defineConfig } from '@playwright/test'
import { randomBytes } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = fileURLToPath(new URL('../..', import.meta.url))
process.env.E2E_AUTH_PASSWORD ||= randomBytes(24).toString('hex')
const python = path.join(root, process.platform === 'win32' ? '.venv/Scripts/python.exe' : '.venv/bin/python')

export default defineConfig({
  testDir: './tests', fullyParallel: false, workers: 1,
  timeout: 60000,
  use: { baseURL: 'http://127.0.0.1:5174', headless: true, trace: 'retain-on-failure' },
  webServer: [
    { command: `"${python}" services/api/tests/e2e_server.py`, cwd: root,
      url: 'http://127.0.0.1:8765/api/health', reuseExistingServer: false,
      env: { PYTHONPATH: path.join(root, 'services/api'), E2E_AUTH_PASSWORD: process.env.E2E_AUTH_PASSWORD } },
    { command: 'npm run dev -- --host 127.0.0.1 --port 5174 --strictPort',
      url: 'http://127.0.0.1:5174', reuseExistingServer: false,
      env: { VITE_API_BASE_URL: 'http://127.0.0.1:8765', VITE_SUPABASE_URL: 'http://127.0.0.1:8765', VITE_SUPABASE_PUBLISHABLE_KEY: 'isolated-e2e-public-key' } },
  ],
})
