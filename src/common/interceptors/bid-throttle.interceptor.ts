import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Socket } from 'socket.io';

// In-memory store for bid timestamps per user/IP
const bidTimestamps: Record<string, number[]> = {};
const MAX_BIDS_PER_WINDOW = 5; // e.g., 5 bids
const WINDOW_MS = 3000; // e.g., per 3 seconds

@Injectable()
export class BidThrottleInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const client: Socket = context.switchToWs().getClient();
    const ip = client.handshake.address;
    const now = Date.now();
    bidTimestamps[ip] = (bidTimestamps[ip] || []).filter(ts => now - ts < WINDOW_MS);
    if (bidTimestamps[ip].length >= MAX_BIDS_PER_WINDOW) {
      client.emit('bidError', 'Too many bids, please slow down.');
      return throwError(() => new Error('Rate limit exceeded'));
    }
    bidTimestamps[ip].push(now);
    return next.handle().pipe(
      tap(() => {
        // Optionally, log or monitor
      })
    );
  }
}
