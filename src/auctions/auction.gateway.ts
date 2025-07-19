import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { UseGuards, UseInterceptors } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { AuctionsService } from './auctions.service';
import { PubsubService } from 'src/redis/pubsub/pubsub.service';
import { RabbitmqService } from 'src/rabbitmq/rabbitmq.service';
import { WsConnectionRateLimitGuard } from 'src/common/guards/ws-connection-rate-limit.guard';
import { BidThrottleInterceptor } from 'src/common/interceptors/bid-throttle.interceptor';


@WebSocketGateway({ namespace: '/auctions', cors: true })
@UseGuards(WsConnectionRateLimitGuard)
export class AuctionGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(AuctionGateway.name);
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly auctionsService: AuctionsService,
    private readonly pubsubService: PubsubService,
    private readonly rabbitmqService: RabbitmqService,
  ) {}

  async afterInit() {
    // Configure Redis adapter for socket.io
    const pubClient = createClient();
    const subClient = createClient();
    await pubClient.connect();
    await subClient.connect();
    // Use the actual socket.io server instance (handle NestJS wrapper)
    const io = ((this.server as any).server || this.server) as Server;
    io.adapter(createAdapter(pubClient, subClient));
    this.logger.log('WebSocket server initialized with Redis adapter');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    // Unsubscribe all Redis listeners for this client
    const joinedRooms = Object.keys((client as any).rooms || {});
    for (const room of joinedRooms) {
      if (room.startsWith('auction_')) {
        const auctionId = Number(room.replace('auction_', ''));
        const handler = (client as any)[`_auction_${auctionId}_handler`];
        if (handler) {
          this.pubsubService.unsubscribeBidUpdates(auctionId, handler);
        }
      }
    }
  }

  @SubscribeMessage('joinAuction')
  async handleJoinAuction(
    @MessageBody() data: { auctionId: number },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`joinAuction: client=${client.id}, auctionId=${data.auctionId}`);
    await client.join(`auction_${data.auctionId}`);
    // Send current highest bid to the joining client (prefer Redis cache)
    let highestBid = await this.pubsubService.getHighestBid(data.auctionId);
    if (!highestBid) {
      // Fallback to DB if not cached
      const auction = await this.auctionsService.findAuctionById(
        data.auctionId,
      );
      if (auction)
        highestBid = { currentHighestBid: auction.currentHighestBid };
    }
    if (highestBid) {
      client.emit('bidUpdate', highestBid);
    }
    // Subscribe to Redis pub/sub for this auction
    const handler = (bid: any) => {
      client.emit('bidUpdate', bid);
    };
    await this.pubsubService.subscribeBidUpdates(data.auctionId, handler);
    // Store handler on socket for cleanup
    (client as any)[`_auction_${data.auctionId}_handler`] = handler;
  }

  @SubscribeMessage('placeBid')
  @UseInterceptors(BidThrottleInterceptor)
  async handlePlaceBid(
    @MessageBody() data: { auctionId: number; userId: number; amount: number },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`placeBid: client=${client.id}, auctionId=${data.auctionId}, userId=${data.userId}, amount=${data.amount}`);
    const result = await this.auctionsService.placeBid(
      data.auctionId,
      data.userId,
      data.amount,
    );
    if (result.success) {
      // Publish bid to RabbitMQ for processing (reliable, ordered)
      await this.rabbitmqService.publishBid(result.bid);
      // Cache the new highest bid and publish to Redis channel
      await this.pubsubService.setHighestBid(data.auctionId, result.bid);
      await this.pubsubService.publishBidUpdate(data.auctionId, result.bid);
      // Publish audit and notification events
      await this.rabbitmqService.publishAudit({ type: 'bid', bid: result.bid });
      await this.rabbitmqService.publishNotification({ type: 'bid', bid: result.bid });
    } else {
      client.emit('bidError', result.message);
    }
  }
  @SubscribeMessage('auctionEnd')
  async handleAuctionEnd(@MessageBody() data: { auctionId: number }) {
    this.logger.log(`auctionEnd: auctionId=${data.auctionId}`);
    const result = await this.auctionsService.endAuction(data.auctionId);
    // Publish auction end event to RabbitMQ
    await this.rabbitmqService.publishNotification({ type: 'auctionEnd', auction: result });
    await this.rabbitmqService.publishAudit({ type: 'auctionEnd', auction: result });
    this.server.to(`auction_${data.auctionId}`).emit('auctionEnded', result);
  }
  @SubscribeMessage('auctionStart')
  async handleAuctionStart(@MessageBody() data: { carId: string; startingBid: number }, @ConnectedSocket() client: Socket) {
    this.logger.log(`auctionStart: carId=${data.carId}, startingBid=${data.startingBid}`);
    const result = await this.auctionsService.startAuction(data);
    // Publish auction start event to RabbitMQ
    await this.rabbitmqService.publishNotification({ type: 'auctionStart', auction: result });
    await this.rabbitmqService.publishAudit({ type: 'auctionStart', auction: result });
    // Optionally, notify all clients in the new auction room
    this.server.to(`auction_${result.id}`).emit('auctionStarted', result);
  }
}
