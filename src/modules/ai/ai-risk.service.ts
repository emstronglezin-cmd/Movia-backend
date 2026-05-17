import { Injectable, Logger } from '@nestjs/common';
import * as http from 'http';

export interface AiRiskPayload {
  userId: string;
  tripId: string;
  from_city: string;
  to_city: string;
  date: string;
  departureTime: string;
  passengerCount: number;
  price: number;
  paymentProvider: string;
  userBookingHistory: Array<{
    from: string; to: string; date: string;
    status: string; createdAt?: string;
  }>;
}

export interface AiRiskResult {
  score: number;
  riskLevel: 'low' | 'medium' | 'high';
  flags: string[];
  approved: boolean;
  recommendation: string;
}

@Injectable()
export class AiRiskService {
  private readonly logger = new Logger(AiRiskService.name);
  private readonly aiBaseUrl: string;

  constructor() {
    this.aiBaseUrl = process.env.AI_SERVICE_URL || 'http://localhost:8001';
  }

  async analyzeRisk(payload: AiRiskPayload): Promise<AiRiskResult | null> {
    return new Promise((resolve) => {
      try {
        const body = JSON.stringify(payload);
        const url = new URL('/analyze/booking-risk', this.aiBaseUrl);
        const req = http.request(
          {
            hostname: url.hostname,
            port: Number(url.port) || 8001,
            path: url.pathname,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(body),
            },
            timeout: 3000,
          },
          (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
              try {
                resolve(JSON.parse(data) as AiRiskResult);
              } catch {
                resolve(null);
              }
            });
          },
        );
        req.on('error', () => resolve(null));
        req.on('timeout', () => { req.destroy(); resolve(null); });
        req.write(body);
        req.end();
      } catch {
        resolve(null);
      }
    });
  }

  async predictDemand(payload: {
    from_city: string; to_city: string; date: string;
    departureTime?: string; historicalData?: unknown[];
  }): Promise<unknown | null> {
    return this.postJson('/predict/demand', payload);
  }

  async getPriceInsight(payload: {
    from_city: string; to_city: string; price: number; date: string; companyName?: string;
  }): Promise<unknown | null> {
    return this.postJson('/predict/price-insight', payload);
  }

  async getSmartTips(payload: {
    from_city: string; to_city: string; date: string;
  }): Promise<unknown | null> {
    return this.postJson('/insights/smart-tips', payload);
  }

  async getAnalytics(payload: {
    routes: Array<{ from: string; to: string; date: string; bookings: number }>;
  }): Promise<unknown | null> {
    return this.postJson('/analytics/revenue', payload);
  }

  private postJson(path: string, payload: unknown): Promise<unknown | null> {
    return new Promise((resolve) => {
      try {
        const body = JSON.stringify(payload);
        const url = new URL(path, this.aiBaseUrl);
        const req = http.request(
          {
            hostname: url.hostname,
            port: Number(url.port) || 8001,
            path: url.pathname,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(body),
            },
            timeout: 5000,
          },
          (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
              try { resolve(JSON.parse(data)); } catch { resolve(null); }
            });
          },
        );
        req.on('error', () => resolve(null));
        req.on('timeout', () => { req.destroy(); resolve(null); });
        req.write(body);
        req.end();
      } catch {
        resolve(null);
      }
    });
  }
}
