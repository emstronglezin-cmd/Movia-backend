import { Controller, Post, Get, Headers, UnauthorizedException, Logger } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Admin Controller — Routes d'administration interne
 * Protégé par X-Internal-Secret (INTERNAL_API_SECRET)
 * À supprimer après stabilisation de la production
 */
@ApiExcludeController()
@Controller('admin')
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(private readonly prisma: PrismaService) {}

  private checkSecret(secret: string | undefined) {
    const expected = process.env.INTERNAL_API_SECRET || 'movia-internal-2025';
    if (!secret || secret !== expected) {
      throw new UnauthorizedException('Accès refusé');
    }
  }

  /**
   * POST /admin/migrate
   * Exécute prisma migrate deploy + prisma db seed
   */
  @Post('migrate')
  async runMigrations(@Headers('x-internal-secret') secret: string) {
    this.checkSecret(secret);
    this.logger.log('🔄 Starting migration via admin endpoint...');

    const results: Record<string, any> = {};

    // Step 1: Exécuter les migrations SQL directement via Prisma
    try {
      // Vérifier si les tables existent déjà
      const tableCheck = await this.prisma.$queryRaw<Array<{count: BigInt}>>`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'User'
      `;
      const userTableExists = Number(tableCheck[0]?.count ?? 0) > 0;
      results.tableCheckBefore = { userTableExists };

      if (!userTableExists) {
        this.logger.log('Tables manquantes — exécution des migrations SQL...');
        
        // Créer les tables via SQL direct
        await this.createAllTables();
        results.migrations = 'applied';
      } else {
        results.migrations = 'already_applied';
      }
    } catch (e: any) {
      results.migrationsError = e.message;
      this.logger.error('Migration error:', e.message);
    }

    // Step 2: Seeder les données de base
    try {
      const companyCount = await this.prisma.company.count();
      if (companyCount === 0) {
        this.logger.log('Seeding database...');
        await this.seedDatabase();
        results.seed = 'applied';
      } else {
        results.seed = `already_seeded (${companyCount} companies)`;
      }
    } catch (e: any) {
      results.seedError = e.message;
      this.logger.error('Seed error:', e.message);
    }

    // Vérification finale
    try {
      const counts = {
        companies: await this.prisma.company.count(),
        cities: await this.prisma.city.count(),
        trips: await this.prisma.trip.count(),
      };
      results.counts = counts;
      results.status = 'success';
    } catch (e: any) {
      results.verificationError = e.message;
      results.status = 'partial';
    }

    return results;
  }

  /**
   * GET /admin/status
   * Statut de la base de données
   */
  @Get('status')
  async dbStatus(@Headers('x-internal-secret') secret: string) {
    this.checkSecret(secret);
    
    try {
      const counts = {
        companies: await this.prisma.company.count().catch(() => -1),
        cities: await this.prisma.city.count().catch(() => -1),
        trips: await this.prisma.trip.count().catch(() => -1),
        users: await this.prisma.user.count().catch(() => -1),
        bookings: await this.prisma.booking.count().catch(() => -1),
      };
      return { status: 'ok', counts };
    } catch (e: any) {
      return { status: 'error', error: e.message };
    }
  }

  private async createAllTables() {
    // Exécuter les migrations SQL en blocs séparés
    const sqls = [
      `CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT NOT NULL, "name" TEXT NOT NULL, "phone" TEXT, "email" TEXT, "cnib" TEXT,
        "avatarUrl" TEXT, "emailVerified" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "User_pkey" PRIMARY KEY ("id")
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "User_phone_key" ON "User"("phone")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "User_cnib_key" ON "User"("cnib")`,
      `CREATE TABLE IF NOT EXISTS "OtpCode" (
        "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "code" TEXT NOT NULL,
        "expiresAt" TIMESTAMP(3) NOT NULL, "used" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "OtpCode_pkey" PRIMARY KEY ("id")
      )`,
      `CREATE TABLE IF NOT EXISTS "Company" (
        "id" TEXT NOT NULL, "name" TEXT NOT NULL, "shortName" TEXT NOT NULL, "color" TEXT NOT NULL,
        "phone" TEXT, "email" TEXT, "description" TEXT, "schedules" TEXT,
        "supportsReservation" BOOLEAN NOT NULL DEFAULT true,
        "requiresImmediatePayment" BOOLEAN NOT NULL DEFAULT false,
        "isFeatured" BOOLEAN NOT NULL DEFAULT false,
        "featuredOrder" INTEGER, "featuredUntil" TIMESTAMP(3),
        "maxBookingDaysAhead" INTEGER NOT NULL DEFAULT 30,
        CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
      )`,
      `CREATE TABLE IF NOT EXISTS "City" (
        "id" TEXT NOT NULL, "name" TEXT NOT NULL, "stations" TEXT NOT NULL,
        CONSTRAINT "City_pkey" PRIMARY KEY ("id")
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "City_name_key" ON "City"("name")`,
      `CREATE TABLE IF NOT EXISTS "Trip" (
        "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "from" TEXT NOT NULL, "to" TEXT NOT NULL,
        "fromStation" TEXT NOT NULL, "toStation" TEXT NOT NULL, "departureTime" TEXT NOT NULL,
        "arrivalTime" TEXT NOT NULL, "duration" TEXT NOT NULL, "price" INTEGER NOT NULL,
        "totalSeats" INTEGER NOT NULL, "date" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
      )`,
      `CREATE TABLE IF NOT EXISTS "Payment" (
        "id" TEXT NOT NULL, "amount" INTEGER NOT NULL, "provider" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'pending', "reference" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "Payment_reference_key" ON "Payment"("reference")`,
      `CREATE TABLE IF NOT EXISTS "Booking" (
        "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "tripId" TEXT NOT NULL,
        "passengerName" TEXT NOT NULL, "passengerPhone" TEXT NOT NULL, "passengerCnib" TEXT,
        "seatNumber" INTEGER NOT NULL, "price" INTEGER NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'active', "bookingReference" TEXT NOT NULL,
        "isRoundTrip" BOOLEAN NOT NULL DEFAULT false, "returnDate" TEXT,
        "returnDepartureTime" TEXT, "returnArrivalTime" TEXT, "returnSeatNumber" INTEGER,
        "paymentId" TEXT, "baggageWeight" TEXT, "reservationExpiresAt" TIMESTAMP(3),
        "returnBookingId" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "Booking_bookingReference_key" ON "Booking"("bookingReference")`,
      `CREATE TABLE IF NOT EXISTS "Package" (
        "id" TEXT NOT NULL, "reference" TEXT NOT NULL, "userId" TEXT NOT NULL, "companyId" TEXT NOT NULL,
        "from" TEXT NOT NULL, "to" TEXT NOT NULL, "fromStation" TEXT NOT NULL, "toStation" TEXT NOT NULL,
        "senderName" TEXT NOT NULL, "senderPhone" TEXT NOT NULL, "recipientName" TEXT NOT NULL,
        "recipientPhone" TEXT NOT NULL, "description" TEXT NOT NULL, "weight" TEXT NOT NULL,
        "price" INTEGER NOT NULL, "status" TEXT NOT NULL DEFAULT 'en_cours', "date" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Package_pkey" PRIMARY KEY ("id")
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "Package_reference_key" ON "Package"("reference")`,
      `CREATE TABLE IF NOT EXISTS "Notification" (
        "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "type" TEXT NOT NULL,
        "title" TEXT NOT NULL, "message" TEXT NOT NULL, "read" BOOLEAN NOT NULL DEFAULT false,
        "linkTo" TEXT, "linkParams" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
      )`,
      `CREATE TABLE IF NOT EXISTS "PackageStep" (
        "id" SERIAL NOT NULL, "packageId" TEXT NOT NULL, "label" TEXT NOT NULL,
        "date" TEXT, "completed" BOOLEAN NOT NULL DEFAULT false,
        "active" BOOLEAN NOT NULL DEFAULT false, "order" INTEGER NOT NULL,
        CONSTRAINT "PackageStep_pkey" PRIMARY KEY ("id")
      )`,
      `CREATE TABLE IF NOT EXISTS "LoyaltyAccount" (
        "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "points" INTEGER NOT NULL DEFAULT 0,
        "totalEarned" INTEGER NOT NULL DEFAULT 0, "level" TEXT NOT NULL DEFAULT 'bronze',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "LoyaltyAccount_pkey" PRIMARY KEY ("id")
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "LoyaltyAccount_userId_key" ON "LoyaltyAccount"("userId")`,
      `CREATE TABLE IF NOT EXISTS "LoyaltyTransaction" (
        "id" TEXT NOT NULL, "accountId" TEXT NOT NULL, "bookingId" TEXT,
        "type" TEXT NOT NULL, "points" INTEGER NOT NULL, "description" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "LoyaltyTransaction_pkey" PRIMARY KEY ("id")
      )`,
      // Foreign Keys
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OtpCode_userId_fkey') THEN
          ALTER TABLE "OtpCode" ADD CONSTRAINT "OtpCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$`,
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Trip_companyId_fkey') THEN
          ALTER TABLE "Trip" ADD CONSTRAINT "Trip_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        END IF;
      END $$`,
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Booking_userId_fkey') THEN
          ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        END IF;
      END $$`,
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Booking_tripId_fkey') THEN
          ALTER TABLE "Booking" ADD CONSTRAINT "Booking_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        END IF;
      END $$`,
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Booking_paymentId_fkey') THEN
          ALTER TABLE "Booking" ADD CONSTRAINT "Booking_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
      END $$`,
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Package_userId_fkey') THEN
          ALTER TABLE "Package" ADD CONSTRAINT "Package_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        END IF;
      END $$`,
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Package_companyId_fkey') THEN
          ALTER TABLE "Package" ADD CONSTRAINT "Package_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        END IF;
      END $$`,
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Notification_userId_fkey') THEN
          ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$`,
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PackageStep_packageId_fkey') THEN
          ALTER TABLE "PackageStep" ADD CONSTRAINT "PackageStep_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$`,
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LoyaltyAccount_userId_fkey') THEN
          ALTER TABLE "LoyaltyAccount" ADD CONSTRAINT "LoyaltyAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$`,
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LoyaltyTransaction_accountId_fkey') THEN
          ALTER TABLE "LoyaltyTransaction" ADD CONSTRAINT "LoyaltyTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "LoyaltyAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$`,
    ];

    for (const sql of sqls) {
      try {
        await this.prisma.$executeRawUnsafe(sql);
      } catch (e: any) {
        if (!e.message.includes('already exists')) {
          this.logger.warn(`SQL warning: ${e.message.substring(0, 100)}`);
        }
      }
    }
    
    this.logger.log('✅ All tables created');
  }

  private async seedDatabase() {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Seed companies
    const companies = [
      { id: 'saramaya', name: 'Saramaya', shortName: 'Saramaya', color: '#D4380D', supportsReservation: true, requiresImmediatePayment: false, isFeatured: true, featuredOrder: 1, maxBookingDaysAhead: 14 },
      { id: 'elitis', name: 'Elitis Transport', shortName: 'Elitis', color: '#C0392B', supportsReservation: true, requiresImmediatePayment: false, isFeatured: true, featuredOrder: 2, maxBookingDaysAhead: 28 },
      { id: 'tsr', name: 'TSR Voyages', shortName: 'TSR', color: '#2980B9', supportsReservation: true, requiresImmediatePayment: false, isFeatured: false, featuredOrder: null, maxBookingDaysAhead: 30 },
      { id: 'rahimo', name: 'Rahimo Transport', shortName: 'Rahimo', color: '#16A085', supportsReservation: true, requiresImmediatePayment: false, isFeatured: false, featuredOrder: null, maxBookingDaysAhead: 21 },
      { id: 'rakieta', name: 'Rakieta Express', shortName: 'Rakieta', color: '#8E44AD', supportsReservation: true, requiresImmediatePayment: false, isFeatured: true, featuredOrder: 3, maxBookingDaysAhead: 21 },
    ];

    for (const company of companies) {
      await this.prisma.company.upsert({
        where: { id: company.id },
        update: {},
        create: { ...company, schedules: '[]', description: company.name },
      });
    }

    // Seed cities
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
      await this.prisma.city.upsert({ where: { id: city.id }, update: {}, create: city });
    }

    // Seed trips for the next 14 days
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

    // Générer les trips pour les 14 prochains jours
    for (let d = 0; d < 14; d++) {
      const date = new Date(today);
      date.setDate(date.getDate() + d);
      const dateStr = date.toISOString().split('T')[0];

      for (const template of tripTemplates) {
        const id = `${template.companyId}-${template.from.substring(0,3).toLowerCase()}-${template.to.substring(0,3).toLowerCase()}-${template.departureTime.replace(':', '')}-${dateStr}`;
        await this.prisma.trip.upsert({
          where: { id },
          update: {},
          create: { id, ...template, date: dateStr },
        });
      }
    }

    this.logger.log('✅ Database seeded successfully');
  }
}
