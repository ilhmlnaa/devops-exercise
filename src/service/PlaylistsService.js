class PlaylistsService {
  constructor(pool) {
    this._pool = pool;
  }

  async verifyPlaylistAccess(playlistId, userId) {
    const query = {
      text: 'SELECT id, owner FROM playlists WHERE id = $1',
      values: [playlistId],
    };

    const result = await this._pool.query(query);

    if (result.rows.length && result.rows[0].owner !== userId) {
      throw new Error('Hanya pemilik playlist yang dapat mengakses');
    }
  }

  async getPlaylistById(playlistId) {
    const playlistQuery = {
      text: `SELECT playlists.id, playlists.name 
             FROM playlists 
             WHERE playlists.id = $1`,
      values: [playlistId],
    };

    const playlistResult = await this._pool.query(playlistQuery);

    if (!playlistResult.rows.length) {
      throw new Error('Playlist tidak ditemukan');
    }

    const playlist = playlistResult.rows[0];

    const songsQuery = {
      text: `SELECT songs.id, songs.title, songs.performer 
             FROM songs
             LEFT JOIN playlist_songs ON playlist_songs.song_id = songs.id
             WHERE playlist_songs.playlist_id = $1`,
      values: [playlistId],
    };

    const songsResult = await this._pool.query(songsQuery);

    return {
      id: playlist.id,
      name: playlist.name,
      songs: songsResult.rows,
    };
  }
}

module.exports = PlaylistsService;
