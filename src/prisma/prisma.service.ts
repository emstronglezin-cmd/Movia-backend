import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super();
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('✅ Database connected');
    // Auto-migrate: crée les tables si elles n'existent pas
    await this.autoMigrate();
    // Auto-seed: insère les données de base si vides
    await this.autoSeed();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Crée toutes les tables PostgreSQL si elles n'existent pas encore.
   * S'exécute automatiquement au démarrage du service.
   */
  private async autoMigrate() {
    try {
      // Vérifier si la table User existe
      const result = await this.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'User'
      `;
      const userTableExists = Number(result[0]?.count ?? 0) > 0;

      if (userTableExists) {
        this.logger.log('✅ Tables already exist — skipping auto-migrate');
        return;
      }

      this.logger.log('⚠️  Tables missing — running auto-migrate...');

      const sqls = [
        `CREATE TABLE IF NOT EXISTS "User" (
          "id" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "phone" TEXT,
          "email" TEXT,
          "cnib" TEXT,
          "avatarUrl" TEXT,
          "emailVerified" BOOLEAN NOT NULL DEFAULT false,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "User_pkey" PRIMARY KEY ("id")
        )`,
        `CREATE UNIQUE INDEX IF NOT EXISTS "User_phone_key" ON "User"("phone")`,
        `CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email")`,
        `CREATE UNIQUE INDEX IF NOT EXISTS "User_cnib_key" ON "User"("cnib")`,
        `CREATE TABLE IF NOT EXISTS "OtpCode" (
          "id" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "code" TEXT NOT NULL,
          "expiresAt" TIMESTAMP(3) NOT NULL,
          "used" BOOLEAN NOT NULL DEFAULT false,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "OtpCode_pkey" PRIMARY KEY ("id")
        )`,
        `CREATE TABLE IF NOT EXISTS "Company" (
          "id" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "shortName" TEXT NOT NULL,
          "color" TEXT NOT NULL,
          "phone" TEXT,
          "email" TEXT,
          "description" TEXT,
          "schedules" TEXT,
          "supportsReservation" BOOLEAN NOT NULL DEFAULT true,
          "requiresImmediatePayment" BOOLEAN NOT NULL DEFAULT false,
          "isFeatured" BOOLEAN NOT NULL DEFAULT false,
          "featuredOrder" INTEGER,
          "featuredUntil" TIMESTAMP(3),
          "maxBookingDaysAhead" INTEGER NOT NULL DEFAULT 30,
          CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
        )`,
        `CREATE TABLE IF NOT EXISTS "City" (
          "id" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "stations" TEXT NOT NULL,
          CONSTRAINT "City_pkey" PRIMARY KEY ("id")
        )`,
        `CREATE UNIQUE INDEX IF NOT EXISTS "City_name_key" ON "City"("name")`,
        `CREATE TABLE IF NOT EXISTS "Trip" (
          "id" TEXT NOT NULL,
          "companyId" TEXT NOT NULL,
          "from" TEXT NOT NULL,
          "to" TEXT NOT NULL,
          "fromStation" TEXT NOT NULL,
          "toStation" TEXT NOT NULL,
          "departureTime" TEXT NOT NULL,
          "arrivalTime" TEXT NOT NULL,
          "duration" TEXT NOT NULL,
          "price" INTEGER NOT NULL,
          "totalSeats" INTEGER NOT NULL,
          "date" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
        )`,
        `CREATE TABLE IF NOT EXISTS "Payment" (
          "id" TEXT NOT NULL,
          "amount" INTEGER NOT NULL,
          "provider" TEXT NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'pending',
          "reference" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
        )`,
        `CREATE UNIQUE INDEX IF NOT EXISTS "Payment_reference_key" ON "Payment"("reference")`,
        `CREATE TABLE IF NOT EXISTS "Booking" (
          "id" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "tripId" TEXT NOT NULL,
          "passengerName" TEXT NOT NULL,
          "passengerPhone" TEXT NOT NULL,
          "passengerCnib" TEXT,
          "seatNumber" INTEGER NOT NULL,
          "price" INTEGER NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'active',
          "bookingReference" TEXT NOT NULL,
          "isRoundTrip" BOOLEAN NOT NULL DEFAULT false,
          "returnDate" TEXT,
          "returnDepartureTime" TEXT,
          "returnArrivalTime" TEXT,
          "returnSeatNumber" INTEGER,
          "paymentId" TEXT,
          "baggageWeight" TEXT,
          "reservationExpiresAt" TIMESTAMP(3),
          "returnBookingId" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
        )`,
        `CREATE UNIQUE INDEX IF NOT EXISTS "Booking_bookingReference_key" ON "Booking"("bookingReference")`,
        `CREATE TABLE IF NOT EXISTS "Package" (
          "id" TEXT NOT NULL,
          "reference" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "companyId" TEXT NOT NULL,
          "from" TEXT NOT NULL,
          "to" TEXT NOT NULL,
          "fromStation" TEXT NOT NULL,
          "toStation" TEXT NOT NULL,
          "senderName" TEXT NOT NULL,
          "senderPhone" TEXT NOT NULL,
          "recipientName" TEXT NOT NULL,
          "recipientPhone" TEXT NOT NULL,
          "description" TEXT NOT NULL,
          "weight" TEXT NOT NULL,
          "price" INTEGER NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'en_cours',
          "date" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "Package_pkey" PRIMARY KEY ("id")
        )`,
        `CREATE UNIQUE INDEX IF NOT EXISTS "Package_reference_key" ON "Package"("reference")`,
        `CREATE TABLE IF NOT EXISTS "Notification" (
          "id" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "type" TEXT NOT NULL,
          "title" TEXT NOT NULL,
          "message" TEXT NOT NULL,
          "read" BOOLEAN NOT NULL DEFAULT false,
          "linkTo" TEXT,
          "linkParams" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
        )`,
        `CREATE TABLE IF NOT EXISTS "PackageStep" (
          "id" SERIAL NOT NULL,
          "packageId" TEXT NOT NULL,
          "label" TEXT NOT NULL,
          "date" TEXT,
          "completed" BOOLEAN NOT NULL DEFAULT false,
          "active" BOOLEAN NOT NULL DEFAULT false,
          "order" INTEGER NOT NULL,
          CONSTRAINT "PackageStep_pkey" PRIMARY KEY ("id")
        )`,
        `CREATE TABLE IF NOT EXISTS "LoyaltyAccount" (
          "id" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "points" INTEGER NOT NULL DEFAULT 0,
          "totalEarned" INTEGER NOT NULL DEFAULT 0,
          "level" TEXT NOT NULL DEFAULT 'bronze',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "LoyaltyAccount_pkey" PRIMARY KEY ("id")
        )`,
        `CREATE UNIQUE INDEX IF NOT EXISTS "LoyaltyAccount_userId_key" ON "LoyaltyAccount"("userId")`,
        `CREATE TABLE IF NOT EXISTS "LoyaltyTransaction" (
          "id" TEXT NOT NULL,
          "accountId" TEXT NOT NULL,
          "bookingId" TEXT,
          "type" TEXT NOT NULL,
          "points" INTEGER NOT NULL,
          "description" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "LoyaltyTransaction_pkey" PRIMARY KEY ("id")
        )`,
        // Foreign Keys
        `DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OtpCode_userId_fkey') THEN
            ALTER TABLE "OtpCode" ADD CONSTRAINT "OtpCode_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
          END IF;
        END $$`,
        `DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Trip_companyId_fkey') THEN
            ALTER TABLE "Trip" ADD CONSTRAINT "Trip_companyId_fkey"
            FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
          END IF;
        END $$`,
        `DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Booking_userId_fkey') THEN
            ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
          END IF;
        END $$`,
        `DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Booking_tripId_fkey') THEN
            ALTER TABLE "Booking" ADD CONSTRAINT "Booking_tripId_fkey"
            FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
          END IF;
        END $$`,
        `DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Booking_paymentId_fkey') THEN
            ALTER TABLE "Booking" ADD CONSTRAINT "Booking_paymentId_fkey"
            FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
          END IF;
        END $$`,
        `DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Package_userId_fkey') THEN
            ALTER TABLE "Package" ADD CONSTRAINT "Package_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
          END IF;
        END $$`,
        `DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Package_companyId_fkey') THEN
            ALTER TABLE "Package" ADD CONSTRAINT "Package_companyId_fkey"
            FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
          END IF;
        END $$`,
        `DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Notification_userId_fkey') THEN
            ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
          END IF;
        END $$`,
        `DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PackageStep_packageId_fkey') THEN
            ALTER TABLE "PackageStep" ADD CONSTRAINT "PackageStep_packageId_fkey"
            FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE CASCADE ON UPDATE CASCADE;
          END IF;
        END $$`,
        `DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LoyaltyAccount_userId_fkey') THEN
            ALTER TABLE "LoyaltyAccount" ADD CONSTRAINT "LoyaltyAccount_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
          END IF;
        END $$`,
        `DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LoyaltyTransaction_accountId_fkey') THEN
            ALTER TABLE "LoyaltyTransaction" ADD CONSTRAINT "LoyaltyTransaction_accountId_fkey"
            FOREIGN KEY ("accountId") REFERENCES "LoyaltyAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
          END IF;
        END $$`,
      ];

      for (const sql of sqls) {
        try {
          await this.$executeRawUnsafe(sql);
        } catch (e: any) {
          if (!e.message?.includes('already exists')) {
            this.logger.warn(`SQL warning: ${e.message?.substring(0, 100)}`);
          }
        }
      }

      this.logger.log('✅ Auto-migrate completed — all tables created');
    } catch (e: any) {
      this.logger.error(`❌ Auto-migrate failed: ${e.message}`);
    }
  }

  /**
   * Insère les données de base (companies, cities, trips) si la DB est vide.
   */
  private async autoSeed() {
    try {
      const companyCount = await this.company.count().catch(() => 0);
      if (companyCount > 0) {
        this.logger.log(`✅ DB already seeded (${companyCount} companies)`);
        return;
      }

      this.logger.log('🌱 Seeding database...');
      const today = new Date();

      // Companies
      const companies = [
        { id: 'saramaya', name: 'Saramaya', shortName: 'Saramaya', color: '#D4380D', supportsReservation: true, requiresImmediatePayment: false, isFeatured: true, featuredOrder: 1, maxBookingDaysAhead: 14 },
        { id: 'elitis', name: 'Elitis Transport', shortName: 'Elitis', color: '#C0392B', supportsReservation: true, requiresImmediatePayment: false, isFeatured: true, featuredOrder: 2, maxBookingDaysAhead: 28 },
        { id: 'tsr', name: 'TSR Voyages', shortName: 'TSR', color: '#2980B9', supportsReservation: true, requiresImmediatePayment: false, isFeatured: false, featuredOrder: null, maxBookingDaysAhead: 30 },
        { id: 'rahimo', name: 'Rahimo Transport', shortName: 'Rahimo', color: '#16A085', supportsReservation: true, requiresImmediatePayment: false, isFeatured: false, featuredOrder: null, maxBookingDaysAhead: 21 },
        { id: 'rakieta', name: 'Rakieta Express', shortName: 'Rakieta', color: '#8E44AD', supportsReservation: true, requiresImmediatePayment: false, isFeatured: true, featuredOrder: 3, maxBookingDaysAhead: 21 },
      ];
      for (const c of companies) {
        await this.company.upsert({ where: { id: c.id }, update: {}, create: { ...c, schedules: '[]', description: c.name } });
      }

      // Cities
      const cities = [
        { id: 'ouagadougou', name: 'Ouagadougou', stations: JSON.stringify(['Gare Centrale', 'ZAD', 'Wemtenga', 'Ouaga 2000']) },
        { id: 'bobo', name: 'Bobo Dioulasso', stations: JSON.stringify(['Gare Centrale de Bobo', 'Gare de Kôkô', 'Secteur 25']) },
        { id: 'kaya', name: 'Kaya', stations: JSON.stringify(['Gare Centrale de Kaya']) },
        { id: 'ouahigouya', name: 'Ouahigouya', stations: JSON.stringify(['Gare de Ouahigouya']) },
        { id: 'koudougou', name: 'Koudougou', stations: JSON.stringify(['Gare Centrale de Koudougou']) },
        { id: 'banfora', name: 'Banfora', stations: JSON.stringify(['Gare de Banfora']) },
        { id: 'dedougou', name: 'Dédougou', stations: JSON.stringify(['Gare de Dédougou']) },
        { id: 'fada', name: "Fada N'Gourma", stations: JSON.stringify(["Gare de Fada N'Gourma"]) },
      ];
      for (const city of cities) {
        await this.city.upsert({ where: { id: city.id }, update: {}, create: city });
      }

      // Trips — 14 jours
      const tripTemplates = [
        { companyId: 'saramaya', from: 'Ouagadougou', to: 'Bobo Dioulasso', fromStation: 'Gare Saramaya (ZAD)', toStation: 'Gare Saramaya Bobo', departureTime: '6:30', arrivalTime: '11:30', duration: '5h 00', price: 8500, totalSeats: 72 },
        { companyId: 'saramaya', from: 'Ouagadougou', to: 'Bobo Dioulasso', fromStation: 'Gare Saramaya (ZAD)', toStation: 'Gare Saramaya Bobo', departureTime: '14:30', arrivalTime: '19:30', duration: '5h 00', price: 8500, totalSeats: 72 },
        { companyId: 'saramaya', from: 'Bobo Dioulasso', to: 'Ouagadougou', fromStation: 'Gare Saramaya Bobo', toStation: 'Gare Saramaya (ZAD)', departureTime: '6:30', arrivalTime: '11:30', duration: '5h 00', price: 8500, totalSeats: 72 },
        { companyId: 'saramaya', from: 'Ouagadougou', to: 'Kaya', fromStation: 'Gare Saramaya (ZAD)', toStation: 'Gare Saramaya Kaya', departureTime: '9:30', arrivalTime: '12:30', duration: '3h 00', price: 4000, totalSeats: 72 },
        { companyId: 'elitis', from: 'Ouagadougou', to: 'Bobo Dioulasso', fromStation: 'Gare Elitis (Wemtenga)', toStation: 'Gare Elitis Bobo', departureTime: '6:30', arrivalTime: '11:30', duration: '5h 00', price: 9500, totalSeats: 60 },
        { companyId: 'elitis', from: 'Ouagadougou', to: 'Bobo Dioulasso', fromStation: 'Gare Elitis (Wemtenga)', toStation: 'Gare Elitis Bobo', departureTime: '10:30', arrivalTime: '15:30', duration: '5h 00', price: 9500, totalSeats: 60 },
        { companyId: 'elitis', from: 'Ouagadougou', to: 'Bobo Dioulasso', fromStation: 'Gare Elitis (Wemtenga)', toStation: 'Gare Elitis Bobo', departureTime: '14:30', arrivalTime: '19:30', duration: '5h 00', price: 9500, totalSeats: 60 },
        { companyId: 'elitis', from: 'Bobo Dioulasso', to: 'Ouagadougou', fromStation: 'Gare Elitis Bobo', toStation: 'Gare Elitis (Wemtenga)', departureTime: '6:30', arrivalTime: '11:30', duration: '5h 00', price: 9500, totalSeats: 60 },
        { companyId: 'tsr', from: 'Ouagadougou', to: 'Bobo Dioulasso', fromStation: 'Gare TSR (Centre)', toStation: 'Gare Centrale de Bobo', departureTime: '6:00', arrivalTime: '11:15', duration: '5h 15', price: 8000, totalSeats: 55 },
        { companyId: 'tsr', from: 'Ouagadougou', to: 'Bobo Dioulasso', fromStation: 'Gare TSR (Centre)', toStation: 'Gare Centrale de Bobo', departureTime: '10:00', arrivalTime: '15:15', duration: '5h 15', price: 8000, totalSeats: 55 },
        { companyId: 'tsr', from: 'Ouagadougou', to: 'Bobo Dioulasso', fromStation: 'Gare TSR (Centre)', toStation: 'Gare Centrale de Bobo', departureTime: '14:00', arrivalTime: '19:15', duration: '5h 15', price: 8000, totalSeats: 55 },
        { companyId: 'tsr', from: 'Bobo Dioulasso', to: 'Ouagadougou', fromStation: 'Gare Centrale de Bobo', toStation: 'Gare TSR (Centre)', departureTime: '6:00', arrivalTime: '11:15', duration: '5h 15', price: 8000, totalSeats: 55 },
        { companyId: 'rahimo', from: 'Ouagadougou', to: 'Ouahigouya', fromStation: 'Gare Centrale', toStation: 'Gare de Ouahigouya', departureTime: '7:00', arrivalTime: '10:00', duration: '3h 00', price: 4000, totalSeats: 60 },
        { companyId: 'rahimo', from: 'Ouagadougou', to: 'Ouahigouya', fromStation: 'Gare Centrale', toStation: 'Gare de Ouahigouya', departureTime: '13:00', arrivalTime: '16:00', duration: '3h 00', price: 4000, totalSeats: 60 },
        { companyId: 'rakieta', from: 'Ouagadougou', to: 'Bobo Dioulasso', fromStation: 'Gare de la ZAD', toStation: 'Gare de Kôkô', departureTime: '8:30', arrivalTime: '14:00', duration: '5h 30', price: 8000, totalSeats: 65 },
        { companyId: 'rakieta', from: 'Ouagadougou', to: 'Koudougou', fromStation: 'Gare de la ZAD', toStation: 'Gare Centrale de Koudougou', departureTime: '8:30', arrivalTime: '11:00', duration: '2h 30', price: 3000, totalSeats: 65 },
      ];

      for (let d = 0; d < 14; d++) {
        const date = new Date(today);
        date.setDate(date.getDate() + d);
        const dateStr = date.toISOString().split('T')[0];
        for (const t of tripTemplates) {
          const id = `${t.companyId}-${t.from.substring(0, 3).toLowerCase()}-${t.to.substring(0, 3).toLowerCase()}-${t.departureTime.replace(':', '')}-${dateStr}`;
          await this.trip.upsert({ where: { id }, update: {}, create: { id, ...t, date: dateStr } });
        }
      }

      this.logger.log('✅ Database seeded successfully');
    } catch (e: any) {
      this.logger.error(`❌ Auto-seed failed: ${e.message}`);
    }
  }
}
