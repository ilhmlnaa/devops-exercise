const amqp = require('amqplib');
const { Pool } = require('pg');
const config = require('./config');

const delay = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

const connectToRabbitMq = async (url, maxRetries = 10, delayMs = 5000) => {
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      console.log(`[RabbitMQ] Attempt ${attempt + 1} connecting...`);
      // eslint-disable-next-line no-await-in-loop
      const connection = await amqp.connect(url);
      console.log('[RabbitMQ] Connected ✅');
      return connection;
    } catch (err) {
      attempt += 1;
      console.error(
        `[RabbitMQ] Connection failed (attempt ${attempt}): ${err.message}`,
      );
      if (attempt >= maxRetries) {
        console.error('[RabbitMQ] Max retries reached. Exiting...');
        process.exit(1);
        return null; // satisfy ESLint
      }
      console.log(`[RabbitMQ] Retrying in ${delayMs / 1000} seconds...`);
      // eslint-disable-next-line no-await-in-loop
      await delay(delayMs);
    }
  }

  return null;
};

const connectToPostgres = async (maxRetries = 10, delayMs = 5000) => {
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      console.log(`[PostgreSQL] Attempt ${attempt + 1} connecting...`);

      // Gunakan DATABASE_URL jika tersedia, jika tidak gunakan config individual
      const poolConfig = config.database.url
        ? { connectionString: config.database.url }
        : {
          host: config.database.host,
          port: config.database.port,
          user: config.database.user,
          password: config.database.password,
          database: config.database.database,
        };

      const pool = new Pool(poolConfig);

      // eslint-disable-next-line no-await-in-loop
      await pool.query('SELECT 1');

      console.log('[PostgreSQL] Connected ✅');

      pool.on('error', (err) => {
        console.error('[PostgreSQL] Unexpected error on idle client', err);
        process.exit(-1);
      });

      return pool;
    } catch (err) {
      attempt += 1;
      console.error(
        `[PostgreSQL] Connection failed (attempt ${attempt}): ${err.message}`,
      );
      if (attempt >= maxRetries) {
        console.error('[PostgreSQL] Max retries reached. Exiting...');
        process.exit(1);
        return null;
      }
      console.log(`[PostgreSQL] Retrying in ${delayMs / 1000} seconds...`);
      // eslint-disable-next-line no-await-in-loop
      await delay(delayMs);
    }
  }

  return null;
};

module.exports = { connectToRabbitMq, connectToPostgres };
