const UsersService = require('../../src/service/UsersService');
const ClientError = require('../../src/exceptions/ClientError');

describe('UsersService', () => {
  let usersService;
  let mockPool;

  beforeEach(() => {
    mockPool = {
      query: jest.fn(),
    };
    usersService = new UsersService(mockPool);
  });

  describe('verifyUserExists', () => {
    it('should not throw error when user exists', async () => {
      // Arrange
      const userId = 'user-123';
      mockPool.query.mockResolvedValue({
        rowCount: 1,
        rows: [{ id: userId }],
      });

      // Act & Assert
      await expect(
        usersService.verifyUserExists(userId),
      ).resolves.not.toThrow();
      expect(mockPool.query).toHaveBeenCalledWith({
        text: 'SELECT id FROM users WHERE id = $1',
        values: [userId],
      });
    });

    it('should throw ClientError when user does not exist', async () => {
      // Arrange
      const userId = 'user-999';
      mockPool.query.mockResolvedValue({
        rowCount: 0,
        rows: [],
      });

      // Act & Assert
      await expect(usersService.verifyUserExists(userId)).rejects.toThrow(
        ClientError,
      );

      await expect(usersService.verifyUserExists(userId)).rejects.toThrow(
        `User dengan ID ${userId} tidak ditemukan`,
      );
    });

    it('should handle database errors', async () => {
      // Arrange
      const userId = 'user-123';
      const dbError = new Error('Database connection failed');
      mockPool.query.mockRejectedValue(dbError);

      // Act & Assert
      await expect(usersService.verifyUserExists(userId)).rejects.toThrow(
        dbError,
      );
    });
  });

  describe('getUserById', () => {
    it('should return user when user exists', async () => {
      // Arrange
      const userId = 'user-123';
      const expectedUser = {
        id: userId,
        username: 'testuser',
        fullname: 'Test User',
      };
      mockPool.query.mockResolvedValue({
        rowCount: 1,
        rows: [expectedUser],
      });

      // Act
      const result = await usersService.getUserById(userId);

      // Assert
      expect(result).toEqual(expectedUser);
      expect(mockPool.query).toHaveBeenCalledWith({
        text: 'SELECT id, username, fullname FROM users WHERE id = $1',
        values: [userId],
      });
    });

    it('should throw ClientError when user does not exist', async () => {
      // Arrange
      const userId = 'user-999';
      mockPool.query.mockResolvedValue({
        rowCount: 0,
        rows: [],
      });

      // Act & Assert
      await expect(usersService.getUserById(userId)).rejects.toThrow(
        ClientError,
      );

      await expect(usersService.getUserById(userId)).rejects.toThrow(
        'User tidak ditemukan',
      );
    });

    it('should handle database errors', async () => {
      // Arrange
      const userId = 'user-123';
      const dbError = new Error('Database connection failed');
      mockPool.query.mockRejectedValue(dbError);

      // Act & Assert
      await expect(usersService.getUserById(userId)).rejects.toThrow(dbError);
    });
  });
});
