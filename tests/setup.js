// Setup file untuk Jest
// File ini akan dijalankan sebelum semua test

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.SMTP_HOST = 'test-smtp.example.com';
process.env.SMTP_PORT = '587';
process.env.SMTP_USER = 'test@example.com';
process.env.SMTP_PASSWORD = 'testpassword';
process.env.PGHOST = 'localhost';
process.env.PGPORT = '5432';
process.env.PGUSER = 'testuser';
process.env.PGPASSWORD = 'testpassword';
process.env.PGDATABASE = 'testdb';
process.env.RABBITMQ_SERVER = 'amqp://localhost';

// Mock console methods untuk mengurangi noise dalam test output
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
};

// Increase max listeners untuk menghindari warning
process.setMaxListeners(20);
