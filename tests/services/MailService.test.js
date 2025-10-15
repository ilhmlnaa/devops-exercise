const nodemailer = require('nodemailer');
const MailService = require('../../src/service/MailService');

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(),
}));

// Mock config
jest.mock('../../src/utils/config', () => ({
  smtp: {
    host: 'test-smtp.example.com',
    port: 587,
    user: 'test@example.com',
    password: 'testpassword',
  },
}));

describe('MailService', () => {
  let mailService;
  let mockTransporter;

  beforeEach(() => {
    mockTransporter = {
      sendMail: jest.fn(),
    };

    // Mock createTransport untuk mengembalikan mock transporter
    nodemailer.createTransport.mockReturnValue(mockTransporter);

    mailService = new MailService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendEmail', () => {
    it('should send email with correct parameters', async () => {
      // Arrange
      const targetEmail = 'user@example.com';
      const content = JSON.stringify({
        playlist: { id: 'playlist-123', name: 'Test Playlist' },
      });
      const expectedResult = { messageId: 'test-message-id' };

      mockTransporter.sendMail.mockResolvedValue(expectedResult);

      // Act
      const result = await mailService.sendEmail(targetEmail, content);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'Open Music Apps',
        to: targetEmail,
        subject: 'Ekspor Playlist',
        text: 'Terlampir hasil dari ekspor playlist',
        attachments: [
          {
            filename: 'playlist.json',
            content,
          },
        ],
      });
    });

    it('should handle email sending errors', async () => {
      // Arrange
      const targetEmail = 'user@example.com';
      const content = '{"playlist": {"id": "playlist-123"}}';
      const emailError = new Error('Failed to send email');

      mockTransporter.sendMail.mockRejectedValue(emailError);

      // Act & Assert
      await expect(mailService.sendEmail(targetEmail, content)).rejects.toThrow(
        emailError,
      );
    });

    it('should send email with empty content', async () => {
      // Arrange
      const targetEmail = 'user@example.com';
      const content = '';
      const expectedResult = { messageId: 'test-message-id-2' };

      mockTransporter.sendMail.mockResolvedValue(expectedResult);

      // Act
      const result = await mailService.sendEmail(targetEmail, content);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'Open Music Apps',
        to: targetEmail,
        subject: 'Ekspor Playlist',
        text: 'Terlampir hasil dari ekspor playlist',
        attachments: [
          {
            filename: 'playlist.json',
            content: '',
          },
        ],
      });
    });

    it('should send email with multiple recipients', async () => {
      // Arrange
      const targetEmail = 'user1@example.com,user2@example.com';
      const content = '{"test": "data"}';
      const expectedResult = { messageId: 'test-message-id-3' };

      mockTransporter.sendMail.mockResolvedValue(expectedResult);

      // Act
      const result = await mailService.sendEmail(targetEmail, content);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'Open Music Apps',
        to: targetEmail,
        subject: 'Ekspor Playlist',
        text: 'Terlampir hasil dari ekspor playlist',
        attachments: [
          {
            filename: 'playlist.json',
            content,
          },
        ],
      });
    });
  });
});
