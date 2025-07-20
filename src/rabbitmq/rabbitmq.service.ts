import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import * as amqp from 'amqplib';
import { AuctionsService } from '../auctions/auctions.service';
import { PubsubService } from '../redis/pubsub/pubsub.service';

@Injectable()
export class RabbitmqService implements OnModuleInit, OnModuleDestroy {
  // Inject these services for bid processing
  private auctionsService: AuctionsService;
  private pubsubService: PubsubService;

  setDependencies(
    auctionsService: AuctionsService,
    pubsubService: PubsubService,
  ) {
    this.auctionsService = auctionsService;
    this.pubsubService = pubsubService;
  }
  private readonly logger = new Logger(RabbitmqService.name);
  private connection: amqp.Connection;
  private channel: amqp.Channel;
  private readonly exchanges = {
    bid: 'auction.bid',
    notification: 'auction.notification',
    audit: 'auction.audit',
    dlx: 'auction.dlx',
  };
  private readonly queues = {
    bid: 'auction.bid.queue',
    notification: 'auction.notification.queue',
    audit: 'auction.audit.queue',
    dlq: 'auction.dlq',
  };

  async onModuleInit() {
    this.connection = await amqp.connect('amqp://localhost');
    this.channel = await this.connection.createChannel();
    // Exchanges
    await this.channel.assertExchange(this.exchanges.bid, 'direct', {
      durable: true,
    });
    await this.channel.assertExchange(this.exchanges.notification, 'fanout', {
      durable: true,
    });
    await this.channel.assertExchange(this.exchanges.audit, 'fanout', {
      durable: true,
    });
    await this.channel.assertExchange(this.exchanges.dlx, 'fanout', {
      durable: true,
    });
    // Queues with DLQ
    await this.channel.assertQueue(this.queues.bid, {
      durable: true,
      deadLetterExchange: this.exchanges.dlx,
    });
    await this.channel.assertQueue(this.queues.notification, { durable: true });
    await this.channel.assertQueue(this.queues.audit, { durable: true });
    await this.channel.assertQueue(this.queues.dlq, { durable: true });
    // Bindings
    await this.channel.bindQueue(this.queues.bid, this.exchanges.bid, 'bid');
    await this.channel.bindQueue(
      this.queues.notification,
      this.exchanges.notification,
      '',
    );
    await this.channel.bindQueue(this.queues.audit, this.exchanges.audit, '');
    await this.channel.bindQueue(this.queues.dlq, this.exchanges.dlx, '');
    // Start consumers
    void this.consumeBidQueue();
    void this.consumeNotificationQueue();
    void this.consumeAuditQueue();
    void this.consumeDLQ();
    this.logger.log('RabbitMQ connected and queues/exchanges set up');
  }

  async onModuleDestroy() {
    await this.channel.close();
    await this.connection.close();
  }

  // --- Producers ---
  async publishBid(bid: any) {
    await this.channel.publish(
      this.exchanges.bid,
      'bid',
      Buffer.from(JSON.stringify(bid)),
      { persistent: true },
    );
  }
  async publishNotification(notification: any) {
    await this.channel.publish(
      this.exchanges.notification,
      '',
      Buffer.from(JSON.stringify(notification)),
      { persistent: true },
    );
  }
  async publishAudit(audit: any) {
    await this.channel.publish(
      this.exchanges.audit,
      '',
      Buffer.from(JSON.stringify(audit)),
      { persistent: true },
    );
  }
  // --- Consumers ---
  private async consumeBidQueue() {
    await this.channel.consume(this.queues.bid, async (msg) => {
      if (!msg) return;
      try {
        const bid = JSON.parse(msg.content.toString());
        if (!this.auctionsService || !this.pubsubService) {
          this.logger.error('Bid processing dependencies not set!');
          this.channel.nack(msg, false, false);
          return;
        }
        // Validate and process bid
        const result = await this.auctionsService.placeBid(
          bid.auctionId,
          bid.userId,
          bid.amount,
        );
        if (result.success) {
          await this.pubsubService.setHighestBid(bid.auctionId, result.bid);
          await this.pubsubService.publishBidUpdate(bid.auctionId, result.bid);
          this.logger.log(`Processed bid: ${JSON.stringify(result.bid)}`);
        } else {
          this.logger.warn(`Bid rejected: ${result.message}`);
        }
        this.channel.ack(msg);
      } catch (err) {
        this.logger.error(`Bid processing failed, sending to DLQ: ${err}`);
        this.channel.nack(msg, false, false); // Send to DLQ
      }
    });
  }
  private async consumeNotificationQueue() {
    await this.channel.consume(this.queues.notification, (msg) => {
      if (!msg) return;
      try {
        const notification = JSON.parse(msg.content.toString());
        // TODO: Send notification (WebSocket, email, etc.)
        this.logger.log(`Notification: ${JSON.stringify(notification)}`);
        this.channel.ack(msg);
      } catch (err) {
        this.channel.nack(msg, false, false);
      }
    });
  }
  private async consumeAuditQueue() {
    await this.channel.consume(this.queues.audit, (msg) => {
      if (!msg) return;
      try {
        const audit = JSON.parse(msg.content.toString());
        // TODO: Log audit event
        this.logger.log(`Audit: ${JSON.stringify(audit)}`);
        this.channel.ack(msg);
      } catch (err) {
        this.channel.nack(msg, false, false);
      }
    });
  }
  private async consumeDLQ() {
    await this.channel.consume(this.queues.dlq, (msg) => {
      if (!msg) return;
      // TODO: Handle failed messages (alert, log, etc.)
      this.logger.warn(`DLQ message: ${msg.content.toString()}`);
      this.channel.ack(msg);
    });
  }
}
