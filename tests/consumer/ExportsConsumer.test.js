const ExportsConsumer = require('../../src/consumer/ExportsConsumer');

describe('ExportsConsumer', () => {
  let exportsConsumer;
  let mockUsersService;
  let mockPlaylistsService;
  let mockMailService;
  let mockChannel;

  beforeEach(() => {
    jest.spyOn(process, 'on').mockImplementation(() => {});

    mockUsersService = {
      verifyUserExists: jest.fn(),
    };

    mockPlaylistsService = {
      verifyPlaylistAccess: jest.fn(),
      getPlaylistById: jest.fn(),
    };

    mockMailService = {
      sendEmail: jest.fn(),
    };

    mockChannel = {
      assertQueue: jest.fn(),
      consume: jest.fn(),
      close: jest.fn(),
    };

    exportsConsumer = new ExportsConsumer({
      usersService: mockUsersService,
      playlistsService: mockPlaylistsService,
      mailService: mockMailService,
      channel: mockChannel,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct services', () => {
      expect(exportsConsumer.usersService).toBe(mockUsersService);
      expect(exportsConsumer.playlistsService).toBe(mockPlaylistsService);
      expect(exportsConsumer.mailService).toBe(mockMailService);
      expect(exportsConsumer.channel).toBe(mockChannel);
    });

    it('should setup graceful shutdown handlers', () => {
      expect(process.on).toHaveBeenCalledWith('SIGINT', expect.any(Function));
      expect(process.on).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
    });
  });

  describe('init', () => {
    it('should assert queue and start consuming', async () => {
      // Arrange
      mockChannel.assertQueue.mockResolvedValue();
      mockChannel.consume.mockResolvedValue();

      // Act
      await exportsConsumer.init();

      // Assert
      expect(mockChannel.assertQueue).toHaveBeenCalledWith('export:playlists', {
        durable: true,
      });
      expect(mockChannel.consume).toHaveBeenCalledWith(
        'export:playlists',
        exportsConsumer.listen,
        {
          noAck: true,
        },
      );
    });

    it('should handle queue assertion errors', async () => {
      // Arrange
      const error = new Error('Queue assertion failed');
      mockChannel.assertQueue.mockRejectedValue(error);

      // Act & Assert
      await expect(exportsConsumer.init()).rejects.toThrow(error);
    });
  });

  describe('listen', () => {
    it('should process message successfully', async () => {
      // Arrange
      const messageData = {
        playlistId: 'playlist-123',
        targetEmail: 'user@example.com',
        userId: 'user-123',
      };
      const mockMessage = {
        content: Buffer.from(JSON.stringify(messageData)),
      };
      const mockPlaylist = {
        id: 'playlist-123',
        name: 'Test Playlist',
        songs: [],
      };
      const mockEmailResult = { messageId: 'email-sent' };

      mockUsersService.verifyUserExists.mockResolvedValue();
      mockPlaylistsService.verifyPlaylistAccess.mockResolvedValue();
      mockPlaylistsService.getPlaylistById.mockResolvedValue(mockPlaylist);
      mockMailService.sendEmail.mockResolvedValue(mockEmailResult);

      // Act
      await exportsConsumer.listen(mockMessage);

      // Assert
      expect(mockUsersService.verifyUserExists).toHaveBeenCalledWith(
        messageData.userId,
      );
      expect(mockPlaylistsService.verifyPlaylistAccess).toHaveBeenCalledWith(
        messageData.playlistId,
        messageData.userId,
      );
      expect(mockPlaylistsService.getPlaylistById).toHaveBeenCalledWith(
        messageData.playlistId,
      );
      expect(mockMailService.sendEmail).toHaveBeenCalledWith(
        messageData.targetEmail,
        JSON.stringify({ playlist: mockPlaylist }),
      );
    });

    it('should handle user verification errors', async () => {
      // Arrange
      const messageData = {
        playlistId: 'playlist-123',
        targetEmail: 'user@example.com',
        userId: 'user-999',
      };
      const mockMessage = {
        content: Buffer.from(JSON.stringify(messageData)),
      };
      const userError = new Error('User not found');

      mockUsersService.verifyUserExists.mockRejectedValue(userError);

      // Spy on console.error
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      // Act
      await exportsConsumer.listen(mockMessage);

      // Assert
      expect(mockUsersService.verifyUserExists).toHaveBeenCalledWith(
        messageData.userId,
      );
      expect(mockPlaylistsService.verifyPlaylistAccess).not.toHaveBeenCalled();
      expect(mockPlaylistsService.getPlaylistById).not.toHaveBeenCalled();
      expect(mockMailService.sendEmail).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[ExportsConsumer] Error processing message:',
        userError,
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle playlist access verification errors', async () => {
      // Arrange
      const messageData = {
        playlistId: 'playlist-123',
        targetEmail: 'user@example.com',
        userId: 'user-123',
      };
      const mockMessage = {
        content: Buffer.from(JSON.stringify(messageData)),
      };
      const accessError = new Error('Access denied');

      mockUsersService.verifyUserExists.mockResolvedValue();
      mockPlaylistsService.verifyPlaylistAccess.mockRejectedValue(accessError);

      // Spy on console.error
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      // Act
      await exportsConsumer.listen(mockMessage);

      // Assert
      expect(mockUsersService.verifyUserExists).toHaveBeenCalledWith(
        messageData.userId,
      );
      expect(mockPlaylistsService.verifyPlaylistAccess).toHaveBeenCalledWith(
        messageData.playlistId,
        messageData.userId,
      );
      expect(mockPlaylistsService.getPlaylistById).not.toHaveBeenCalled();
      expect(mockMailService.sendEmail).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[ExportsConsumer] Error processing message:',
        accessError,
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle invalid JSON message', async () => {
      // Arrange
      const mockMessage = {
        content: Buffer.from('invalid json'),
      };

      // Spy on console.error
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      // Act
      await exportsConsumer.listen(mockMessage);

      // Assert
      expect(mockUsersService.verifyUserExists).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[ExportsConsumer] Error processing message:',
        expect.any(SyntaxError),
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle email sending errors', async () => {
      // Arrange
      const messageData = {
        playlistId: 'playlist-123',
        targetEmail: 'user@example.com',
        userId: 'user-123',
      };
      const mockMessage = {
        content: Buffer.from(JSON.stringify(messageData)),
      };
      const mockPlaylist = {
        id: 'playlist-123',
        name: 'Test Playlist',
        songs: [],
      };
      const emailError = new Error('Email sending failed');

      mockUsersService.verifyUserExists.mockResolvedValue();
      mockPlaylistsService.verifyPlaylistAccess.mockResolvedValue();
      mockPlaylistsService.getPlaylistById.mockResolvedValue(mockPlaylist);
      mockMailService.sendEmail.mockRejectedValue(emailError);

      // Spy on console.error
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      // Act
      await exportsConsumer.listen(mockMessage);

      // Assert
      expect(mockMailService.sendEmail).toHaveBeenCalledWith(
        messageData.targetEmail,
        JSON.stringify({ playlist: mockPlaylist }),
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[ExportsConsumer] Error processing message:',
        emailError,
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('start', () => {
    it('should initialize successfully', async () => {
      // Arrange
      mockChannel.assertQueue.mockResolvedValue();
      mockChannel.consume.mockResolvedValue();

      // Spy on console.log
      const consoleLogSpy = jest
        .spyOn(console, 'log')
        .mockImplementation(() => {});

      // Act
      await exportsConsumer.start();

      // Assert
      expect(mockChannel.assertQueue).toHaveBeenCalledWith('export:playlists', {
        durable: true,
      });
      expect(mockChannel.consume).toHaveBeenCalledWith(
        'export:playlists',
        exportsConsumer.listen,
        {
          noAck: true,
        },
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[ExportsConsumer] Initialization complete. Ready to process messages.',
      );

      consoleLogSpy.mockRestore();
    });

    it('should handle initialization errors', async () => {
      // Arrange
      const initError = new Error('Initialization failed');
      mockChannel.assertQueue.mockRejectedValue(initError);

      // Spy on console.error and process.exit
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const processExitSpy = jest
        .spyOn(process, 'exit')
        .mockImplementation(() => {});

      // Act
      await exportsConsumer.start();

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[ExportsConsumer] Failed to initialize:',
        initError,
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);

      consoleErrorSpy.mockRestore();
      processExitSpy.mockRestore();
    });
  });

  describe('stop', () => {
    it('should close channel gracefully', async () => {
      // Arrange
      mockChannel.close.mockResolvedValue();

      // Spy on console.log
      const consoleLogSpy = jest
        .spyOn(console, 'log')
        .mockImplementation(() => {});

      // Act
      await exportsConsumer.stop();

      // Assert
      expect(mockChannel.close).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[ExportsConsumer] Channel closed',
      );

      consoleLogSpy.mockRestore();
    });

    it('should handle channel close errors', async () => {
      // Arrange
      const closeError = new Error('Failed to close channel');
      mockChannel.close.mockRejectedValue(closeError);

      // Spy on console.error
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      // Act
      await exportsConsumer.stop();

      // Assert
      expect(mockChannel.close).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[ExportsConsumer] Error during shutdown:',
        closeError,
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle case when channel is null', async () => {
      // Arrange
      exportsConsumer.channel = null;

      // Spy on console.error
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      // Act
      await exportsConsumer.stop();

      // Assert
      expect(consoleErrorSpy).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });
});
