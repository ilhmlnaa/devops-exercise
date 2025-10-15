const PlaylistsService = require('../../src/service/PlaylistsService');

describe('PlaylistsService', () => {
  let playlistsService;
  let mockPool;

  beforeEach(() => {
    mockPool = {
      query: jest.fn(),
    };
    playlistsService = new PlaylistsService(mockPool);
  });

  describe('verifyPlaylistAccess', () => {
    it('should not throw error when user is playlist owner', async () => {
      // Arrange
      const playlistId = 'playlist-123';
      const userId = 'user-123';
      mockPool.query.mockResolvedValue({
        rows: [{ id: playlistId, owner: userId }],
      });

      // Act & Assert
      await expect(
        playlistsService.verifyPlaylistAccess(playlistId, userId),
      ).resolves.not.toThrow();

      expect(mockPool.query).toHaveBeenCalledWith({
        text: 'SELECT id, owner FROM playlists WHERE id = $1',
        values: [playlistId],
      });
    });

    it('should throw error when user is not playlist owner', async () => {
      // Arrange
      const playlistId = 'playlist-123';
      const userId = 'user-123';
      const differentUserId = 'user-456';
      mockPool.query.mockResolvedValue({
        rows: [{ id: playlistId, owner: differentUserId }],
      });

      // Act & Assert
      await expect(
        playlistsService.verifyPlaylistAccess(playlistId, userId),
      ).rejects.toThrow('Hanya pemilik playlist yang dapat mengakses');
    });

    it('should not throw error when playlist does not exist', async () => {
      // Arrange
      const playlistId = 'playlist-999';
      const userId = 'user-123';
      mockPool.query.mockResolvedValue({
        rows: [],
      });

      // Act & Assert
      await expect(
        playlistsService.verifyPlaylistAccess(playlistId, userId),
      ).resolves.not.toThrow();
    });

    it('should handle database errors', async () => {
      // Arrange
      const playlistId = 'playlist-123';
      const userId = 'user-123';
      const dbError = new Error('Database connection failed');
      mockPool.query.mockRejectedValue(dbError);

      // Act & Assert
      await expect(
        playlistsService.verifyPlaylistAccess(playlistId, userId),
      ).rejects.toThrow(dbError);
    });
  });

  describe('getPlaylistById', () => {
    it('should return playlist with songs when playlist exists', async () => {
      // Arrange
      const playlistId = 'playlist-123';
      const expectedPlaylist = {
        id: playlistId,
        name: 'Test Playlist',
      };
      const expectedSongs = [
        { id: 'song-1', title: 'Song 1', performer: 'Artist 1' },
        { id: 'song-2', title: 'Song 2', performer: 'Artist 2' },
      ];

      mockPool.query
        .mockResolvedValueOnce({
          rows: [expectedPlaylist],
        })
        .mockResolvedValueOnce({
          rows: expectedSongs,
        });

      // Act
      const result = await playlistsService.getPlaylistById(playlistId);

      // Assert
      expect(result).toEqual({
        id: expectedPlaylist.id,
        name: expectedPlaylist.name,
        songs: expectedSongs,
      });

      expect(mockPool.query).toHaveBeenNthCalledWith(1, {
        text: `SELECT playlists.id, playlists.name 
             FROM playlists 
             WHERE playlists.id = $1`,
        values: [playlistId],
      });

      expect(mockPool.query).toHaveBeenNthCalledWith(2, {
        text: `SELECT songs.id, songs.title, songs.performer 
             FROM songs
             LEFT JOIN playlist_songs ON playlist_songs.song_id = songs.id
             WHERE playlist_songs.playlist_id = $1`,
        values: [playlistId],
      });
    });

    it('should throw error when playlist does not exist', async () => {
      // Arrange
      const playlistId = 'playlist-999';
      mockPool.query.mockResolvedValue({
        rows: [],
      });

      // Act & Assert
      await expect(
        playlistsService.getPlaylistById(playlistId),
      ).rejects.toThrow('Playlist tidak ditemukan');
    });

    it('should return playlist with empty songs array when no songs found', async () => {
      // Arrange
      const playlistId = 'playlist-123';
      const expectedPlaylist = {
        id: playlistId,
        name: 'Empty Playlist',
      };

      mockPool.query
        .mockResolvedValueOnce({
          rows: [expectedPlaylist],
        })
        .mockResolvedValueOnce({
          rows: [],
        });

      // Act
      const result = await playlistsService.getPlaylistById(playlistId);

      // Assert
      expect(result).toEqual({
        id: expectedPlaylist.id,
        name: expectedPlaylist.name,
        songs: [],
      });
    });

    it('should handle database errors', async () => {
      // Arrange
      const playlistId = 'playlist-123';
      const dbError = new Error('Database connection failed');
      mockPool.query.mockRejectedValue(dbError);

      // Act & Assert
      await expect(
        playlistsService.getPlaylistById(playlistId),
      ).rejects.toThrow(dbError);
    });
  });
});
