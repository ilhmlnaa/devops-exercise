// Mock pg Pool
jest.mock('pg', () => ({
  Pool: jest.fn(),
}));

// Mock amqplib
jest.mock('amqplib', () => ({
  connect: jest.fn(),
}));

// Mock config - akan di-override dalam test
const mockConfig = {
  database: {
    url: null,
    host: 'localhost',
    port: 5432,
    user: 'testuser',
    password: 'testpass',
    database: 'testdb',
  },
};

jest.mock('../../src/utils/config', () => mockConfig);

const { Pool } = require('pg');
const amqp = require('amqplib');
const {
  connectToPostgres,
  connectToRabbitMq,
} = require('../../src/utils/connection');

describe('Connection Utils', () => {
  let mockPool;
  let mockConnection;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Reset mockConfig
    mockConfig.database.url = null;
    mockConfig.database.host = 'localhost';
    mockConfig.database.port = 5432;
    mockConfig.database.user = 'testuser';
    mockConfig.database.password = 'testpass';
    mockConfig.database.database = 'testdb';

    // Mock Pool instance
    mockPool = {
      query: jest.fn(),
      on: jest.fn(),
    };

    // Mock RabbitMQ connection
    mockConnection = {
      createChannel: jest.fn(),
    };

    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(process, 'exit').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('connectToPostgres', () => {
    it('should connect using DATABASE_URL when provided', async () => {
      // Arrange
      Pool.mockImplementation(() => mockPool);
      mockPool.query.mockResolvedValue({ rows: [{ '?column?': 1 }] });

      // Set DATABASE_URL di mockConfig
      mockConfig.database.url = 'postgresql://user:pass@localhost:5432/testdb';

      // Act
      const result = await connectToPostgres(1, 100);

      // Assert
      expect(Pool).toHaveBeenCalledWith({
        connectionString: 'postgresql://user:pass@localhost:5432/testdb',
      });
      expect(mockPool.query).toHaveBeenCalledWith('SELECT 1');
      expect(mockPool.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(result).toBe(mockPool);

      // Cleanup
      mockConfig.database.url = null;
    });

    it('should connect using individual config when DATABASE_URL not provided', async () => {
      // Arrange
      Pool.mockImplementation(() => mockPool);
      mockPool.query.mockResolvedValue({ rows: [{ '?column?': 1 }] });

      // Pastikan DATABASE_URL null
      mockConfig.database.url = null;

      // Act
      const result = await connectToPostgres(1, 100);

      // Assert
      expect(Pool).toHaveBeenCalledWith({
        host: 'localhost',
        port: 5432,
        user: 'testuser',
        password: 'testpass',
        database: 'testdb',
      });
      expect(result).toBe(mockPool);
    });

    it('should retry on connection failure', async () => {
      // Arrange
      Pool.mockImplementation(() => mockPool);
      mockPool.query
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

      // Act
      const result = await connectToPostgres(2, 100);

      // Assert
      expect(Pool).toHaveBeenCalledTimes(2);
      expect(result).toBe(mockPool);
    });

    it('should exit process after max retries', async () => {
      // Arrange
      Pool.mockImplementation(() => mockPool);
      mockPool.query.mockRejectedValue(new Error('Connection failed'));

      // Act
      const result = await connectToPostgres(2, 100);

      // Assert
      expect(process.exit).toHaveBeenCalledWith(1);
      expect(result).toBeNull();
    });
  });

  describe('connectToRabbitMq', () => {
    it('should connect to RabbitMQ successfully', async () => {
      // Arrange
      amqp.connect.mockResolvedValue(mockConnection);

      // Act
      const result = await connectToRabbitMq('amqp://localhost', 1, 100);

      // Assert
      expect(amqp.connect).toHaveBeenCalledWith('amqp://localhost');
      expect(result).toBe(mockConnection);
    });

    it('should retry on connection failure', async () => {
      // Arrange
      amqp.connect
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockResolvedValueOnce(mockConnection);

      // Act
      const result = await connectToRabbitMq('amqp://localhost', 2, 100);

      // Assert
      expect(amqp.connect).toHaveBeenCalledTimes(2);
      expect(result).toBe(mockConnection);
    });

    it('should exit process after max retries', async () => {
      // Arrange
      amqp.connect.mockRejectedValue(new Error('Connection failed'));

      // Act
      const result = await connectToRabbitMq('amqp://localhost', 2, 100);

      // Assert
      expect(process.exit).toHaveBeenCalledWith(1);
      expect(result).toBeNull();
    });
  });
});
