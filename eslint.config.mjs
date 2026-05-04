import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'

const config = [
  { ignores: ['coverage/**', 'playwright-report/**', 'test-results/**', 'tests/e2e/artifacts/**'] },
  ...(Array.isArray(nextCoreWebVitals) ? nextCoreWebVitals : [nextCoreWebVitals])
]

export default config
