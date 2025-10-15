require('dotenv').config();
const { connectToRabbitMq, connectToPostgres } = require('./utils/connection');

const ExportsConsumer = require('./consumer/ExportsConsumer');

const UsersService = require('./service/UsersService');
const PlaylistsService = require('./service/PlaylistsService');
const MailService = require('./service/MailService');

const config = require('./utils/config');

const startConsumer = async () => {
  try {
    const pgPool = await connectToPostgres();
    const connection = await connectToRabbitMq(config.rabbitMq.server);
    const channel = await connection.createChannel();

    const usersService = new UsersService(pgPool);
    const playlistsService = new PlaylistsService(pgPool);
    const mailService = new MailService();

    new ExportsConsumer({
      usersService,
      playlistsService,
      mailService,
      channel,
    }).start();
  } catch (error) {
    console.error('[Main] Fatal error:', error);
    process.exit(1);
  }
};

startConsumer();
