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
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { AuctionsService } from './auctions.service';
import { PubsubService } from 'src/redis/pubsub/pubsub.service';

@WebSocketGateway({ namespace: '/auctions', cors: true })
export class AuctionGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly auctionsService: AuctionsService,
    private readonly pubsubService: PubsubService,
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
    console.log('[AuctionGateway] WebSocket server initialized with Redis adapter');
  }

  handleConnection(client: Socket) {
    console.log(`[AuctionGateway] Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`[AuctionGateway] Client disconnected: ${client.id}`);
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
    console.log(
      `[AuctionGateway] joinAuction: client=${client.id}, auctionId=${data.auctionId}`,
    );
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
  async handlePlaceBid(
    @MessageBody() data: { auctionId: number; userId: number; amount: number },
    @ConnectedSocket() client: Socket,
  ) {
    console.log(
      `[AuctionGateway] placeBid: client=${client.id}, auctionId=${data.auctionId}, userId=${data.userId}, amount=${data.amount}`,
    );
    const result = await this.auctionsService.placeBid(
      data.auctionId,
      data.userId,
      data.amount,
    );
    if (result.success) {
      // Cache the new highest bid and publish to Redis channel
      await this.pubsubService.setHighestBid(data.auctionId, result.bid);
      await this.pubsubService.publishBidUpdate(data.auctionId, result.bid);
    } else {
      client.emit('bidError', result.message);
    }
  }
  @SubscribeMessage('auctionEnd')
  async handleAuctionEnd(@MessageBody() data: { auctionId: number }) {
    console.log(`[AuctionGateway] auctionEnd: auctionId=${data.auctionId}`);
    const result = await this.auctionsService.endAuction(data.auctionId);
    this.server.to(`auction_${data.auctionId}`).emit('auctionEnded', result);
  }
}
