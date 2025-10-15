class ExportsConsumer {
  constructor({
    usersService, playlistsService, mailService, channel,
  }) {
    console.log('[ExportsConsumer] Initializing OpenMusic API Consumer...');

    this.usersService = usersService;
    this.playlistsService = playlistsService;
    this.mailService = mailService;
    this.channel = channel;

    this.listen = this.listen.bind(this);

    this.setupGracefulShutdown();
  }

  async init() {
    await this.channel.assertQueue('export:playlists', { durable: true });

    this.channel.consume('export:playlists', this.listen, {
      noAck: true,
    });

    console.log('[ExportsConsumer] Listening on "export:playlists" queue...');
    console.log('[ExportsConsumer] Press CTRL+C to exit');
  }

  async listen(message) {
    try {
      const { playlistId, targetEmail, userId } = JSON.parse(
        message.content.toString(),
      );

      await this.usersService.verifyUserExists(userId);

      await this.playlistsService.verifyPlaylistAccess(playlistId, userId);

      const playlist = await this.playlistsService.getPlaylistById(playlistId);

      const result = await this.mailService.sendEmail(
        targetEmail,
        JSON.stringify({ playlist }),
      );
      console.log('[ExportsConsumer] Sending email for export:', { playlistId, userId });
      console.log('[ExportsConsumer] Email sent successfully:', result);
    } catch (error) {
      console.error('[ExportsConsumer] Error processing message:', error);
    }
  }

  async start() {
    await this.init()
      .then(() => console.log(
        '[ExportsConsumer] Initialization complete. Ready to process messages.',
      ))
      .catch((err) => {
        console.error('[ExportsConsumer] Failed to initialize:', err);
        process.exit(1);
      });
  }

  setupGracefulShutdown() {
    process.on('SIGINT', async () => {
      console.log('\n[ExportsConsumer] Shutting down gracefully...');
      await this.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n[ExportsConsumer] Received SIGTERM, shutting down...');
      await this.stop();
      process.exit(0);
    });
  }

  async stop() {
    try {
      if (this.channel) {
        await this.channel.close();
        console.log('[ExportsConsumer] Channel closed');
      }
      if (this.connection) {
        await this.connection.close();
        console.log('[ExportsConsumer] Connection closed');
      }
    } catch (error) {
      console.error('[ExportsConsumer] Error during shutdown:', error);
    }
  }
}

module.exports = ExportsConsumer;
