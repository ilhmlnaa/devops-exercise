# Testing Guide untuk OpenMusic Consumer

## Struktur Testing

Proyek ini menggunakan **Jest** sebagai testing framework. Struktur testing:

```
tests/
├── .eslintrc.json          # Konfigurasi ESLint untuk test files
├── setup.js                # Setup global untuk Jest
├── services/               # Unit tests untuk services
│   ├── UsersService.test.js
│   ├── PlaylistsService.test.js
│   └── MailService.test.js
└── consumer/              # Unit tests untuk consumer
    └── ExportsConsumer.test.js
```

## Instalasi Dependencies

Install dependencies untuk testing:

```bash
npm install
```

## Menjalankan Tests

### Menjalankan semua tests

```bash
npm test
```

### Menjalankan tests dalam mode watch

```bash
npm run test:watch
```

### Menjalankan tests dengan coverage report

```bash
npm run test:coverage
```

### Menjalankan test file tertentu

```bash
npx jest tests/services/UsersService.test.js
```

### Menjalankan tests dengan pattern

```bash
npx jest --testNamePattern="should verify user exists"
```

## Coverage Report

Setelah menjalankan `npm run test:coverage`, laporan coverage akan tersedia di:

- **Terminal**: Laporan ringkas di terminal
- **HTML**: Buka `coverage/lcov-report/index.html` di browser untuk laporan detail

## Database Configuration

Proyek ini mendukung dua cara konfigurasi database:

### 1. Database URL (Recommended)

```bash
DATABASE_URL=postgresql://username:password@host:port/database_name
```

**Contoh:**

```bash
# Development
DATABASE_URL=postgresql://postgres:password@localhost:5432/openmusicapp

# Production (Heroku)
DATABASE_URL=postgres://user:pass@hostname:5432/dbname

# Production (Railway)
DATABASE_URL=postgresql://postgres:pass@containers-us-west-1.railway.app:5432/railway
```

### 2. Individual Config (Fallback)

```bash
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=password
PGDATABASE=openmusicapp
```

**Prioritas:** Jika `DATABASE_URL` tersedia, maka akan digunakan. Jika tidak ada, akan menggunakan config individual.

## Test Patterns

### 1. Service Layer Tests

**UsersService.test.js**

- ✅ Verify user exists (success)
- ✅ Verify user exists (user not found)
- ✅ Get user by ID (success)
- ✅ Get user by ID (user not found)
- ✅ Handle database errors

**PlaylistsService.test.js**

- ✅ Verify playlist access (owner access)
- ✅ Verify playlist access (non-owner access)
- ✅ Get playlist by ID (with songs)
- ✅ Get playlist by ID (playlist not found)
- ✅ Get playlist by ID (empty playlist)

**MailService.test.js**

- ✅ Send email (success)
- ✅ Send email (with error)
- ✅ Send email (empty content)
- ✅ Send email (multiple recipients)

### 2. Consumer Layer Tests

**ExportsConsumer.test.js**

- ✅ Constructor initialization
- ✅ Queue setup and consumption
- ✅ Message processing (success flow)
- ✅ Error handling (user verification)
- ✅ Error handling (playlist access)
- ✅ Error handling (invalid JSON)
- ✅ Error handling (email sending)
- ✅ Graceful shutdown

## Mocking Strategy

### Database Mock

```javascript
const mockPool = {
  query: jest.fn(),
};
```

### RabbitMQ Channel Mock

```javascript
const mockChannel = {
  assertQueue: jest.fn(),
  consume: jest.fn(),
  close: jest.fn(),
};
```

### Nodemailer Mock

```javascript
jest.mock("nodemailer", () => ({
  createTransporter: jest.fn(),
}));
```

## Environment Variables

File `tests/setup.js` mengatur environment variables untuk testing:

```javascript
process.env.NODE_ENV = "test";
process.env.SMTP_HOST = "test-smtp.example.com";
// ... dll
```

## Best Practices

1. **AAA Pattern**: Arrange, Act, Assert
2. **Descriptive Test Names**: Jelaskan apa yang di-test dan expected result
3. **Mock External Dependencies**: Database, SMTP, RabbitMQ
4. **Test Error Cases**: Jangan hanya test happy path
5. **Clean Up**: Gunakan `afterEach` untuk cleanup
6. **Isolated Tests**: Setiap test harus independent

## CI/CD Integration

Untuk integrasi dengan CI/CD, tambahkan:

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: "18"
      - run: npm ci
      - run: npm test
      - run: npm run test:coverage
```

## Debugging Tests

### Menjalankan test dengan debug mode

```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Menjalankan single test dengan logs

```bash
DEBUG=* npx jest tests/services/UsersService.test.js --verbose
```

## Troubleshooting

### ESLint errors dalam test files

- Pastikan `.eslintrc.json` di folder `tests/` sudah mengaktifkan Jest environment

### Test timeout

- Tambahkan timeout di Jest config jika test butuh waktu lama
- Gunakan `jest.setTimeout(10000)` untuk timeout khusus

### Mock tidak berfungsi

- Pastikan mock ditempatkan sebelum import module
- Gunakan `jest.clearAllMocks()` di `afterEach`
