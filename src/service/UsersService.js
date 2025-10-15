const ClientError = require('../exceptions/ClientError');

class UsersService {
  constructor(pool) {
    this._pool = pool;
  }

  async verifyUserExists(userId) {
    const query = {
      text: 'SELECT id FROM users WHERE id = $1',
      values: [userId],
    };

    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new ClientError(`User dengan ID ${userId} tidak ditemukan`);
    }
  }

  async getUserById(userId) {
    const query = {
      text: 'SELECT id, username, fullname FROM users WHERE id = $1',
      values: [userId],
    };

    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new ClientError('User tidak ditemukan');
    }

    return result.rows[0];
  }
}

module.exports = UsersService;
