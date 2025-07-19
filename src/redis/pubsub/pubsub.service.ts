
import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import Redis, { Redis as RedisInstance } from 'ioredis';
import { EventEmitter } from 'events';


@Injectable()
export class PubsubService extends EventEmitter implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PubsubService.name);
  private pub: RedisInstance;
  private sub: RedisInstance;
  private cache: RedisInstance;
  private readonly prefix = 'auction_highest_bid:';

  async onModuleInit() {
    this.pub = new Redis();
    this.sub = new Redis();
    this.cache = new Redis();
    this.sub.on('message', (channel, message) => {
      // Emit event for listeners (e.g., gateway)
      this.emit(channel, JSON.parse(message));
    });
    this.handleReconnect(this.pub, 'pub');
    this.handleReconnect(this.sub, 'sub');
    this.handleReconnect(this.cache, 'cache');
  }

  async onModuleDestroy() {
    await this.pub.quit();
    await this.sub.quit();
    await this.cache.quit();
  }

  // Cache highest bid for an auction
  async setHighestBid(auctionId: number, bid: any) {
    await this.cache.set(this.prefix + auctionId, JSON.stringify(bid));
  }

  async getHighestBid(auctionId: number) {
    const data = await this.cache.get(this.prefix + auctionId);
    return data ? JSON.parse(data) : null;
  }

  // Publish bid event to auction channel
  async publishBidUpdate(auctionId: number, bid: any) {
    await this.pub.publish(`auction_bid_${auctionId}`, JSON.stringify(bid));
  }

  // Subscribe to bid updates for an auction
  async subscribeBidUpdates(auctionId: number, handler: (bid: any) => void) {
    const channel = `auction_bid_${auctionId}`;
    this.sub.subscribe(channel);
    this.on(channel, handler);
  }

  // Unsubscribe from bid updates
  async unsubscribeBidUpdates(auctionId: number, handler: (bid: any) => void) {
    const channel = `auction_bid_${auctionId}`;
    this.sub.unsubscribe(channel);
    this.off(channel, handler);
  }

  // Handle Redis connection failures and reconnection
  private handleReconnect(client: RedisInstance, label: string) {
    client.on('error', (err) => {
      this.logger.error(`[${label}] Redis error: ${err}`);
    });
    client.on('reconnecting', () => {
      this.logger.warn(`[${label}] Redis reconnecting...`);
    });
    client.on('connect', () => {
      this.logger.log(`[${label}] Redis connected`);
    });
  }
}
