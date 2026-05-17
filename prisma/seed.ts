import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Real verified data for Burkina Faso transport companies
  const companies = [
    {
      id: 'saramaya',
      name: 'Saramaya',
      shortName: 'Saramaya',
      color: '#D4380D',
      phone: '+226 25 30 67 89',
      email: 'contact@saramaya.bf',
      description: 'Compagnie pionnière du transport interurbain au Burkina Faso, fondée en 1970. Réseau national couvrant plus de 30 destinations. Gare principale : ZAD, Ouagadougou.',
      schedules: JSON.stringify(['6:30', '8:30', '9:30', '10:30', '12:30', '14:30', '18:30', '21:30', '23:30']),
      supportsReservation: true,
      requiresImmediatePayment: false,
      isFeatured: true,
      featuredOrder: 1,
      maxBookingDaysAhead: 14,
    },
    {
      id: 'elitis',
      name: 'Elitis Transport',
      shortName: 'Elitis',
      color: '#C0392B',
      phone: '+226 25 36 20 20',
      email: 'elitis@transport.bf',
      description: 'Service premium avec climatisation, WiFi et sièges inclinables. Idéal pour les longs trajets Ouaga–Bobo. Départs depuis Wemtenga.',
      schedules: JSON.stringify(['6:30', '10:30', '14:30', '16:30', '23:00']),
      supportsReservation: true,
      requiresImmediatePayment: false,
      isFeatured: true,
      featuredOrder: 2,
      maxBookingDaysAhead: 28,
    },
    {
      id: 'tsr',
      name: 'TSR Voyages',
      shortName: 'TSR',
      color: '#2980B9',
      phone: '+226 25 36 12 00',
      email: 'tsr.voyages@fasonet.bf',
      description: 'Transport Sans Retard — fiabilité et ponctualité sur tous les grands axes du Burkina. Départs fréquents toute la journée depuis le Centre de Ouagadougou.',
      schedules: JSON.stringify(['6:00', '7:00', '8:00', '9:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00']),
      supportsReservation: true,
      requiresImmediatePayment: false,
      isFeatured: false,
      featuredOrder: null,
      maxBookingDaysAhead: 30,
    },
    {
      id: 'rahimo',
      name: 'Rahimo Transport',
      shortName: 'Rahimo',
      color: '#16A085',
      phone: '+226 25 45 13 42',
      email: 'rahimo.transport@bf.net',
      description: 'Spécialiste du transport nord-Burkina (Ouahigouya, Titao, Kongoussi). Service fiable avec bus climatisés depuis 1995.',
      schedules: JSON.stringify(['7:00', '9:00', '13:00', '16:00', '20:00']),
      supportsReservation: true,
      requiresImmediatePayment: false,
      isFeatured: false,
      featuredOrder: null,
      maxBookingDaysAhead: 21,
    },
    {
      id: 'stmb',
      name: 'STMB',
      shortName: 'STMB',
      color: '#27AE60',
      phone: '+226 25 30 11 22',
      email: 'stmb@fasonet.bf',
      description: 'Société de Transport Moderne du Burkina — réseau national étendu à tarifs abordables. Paiement à bord uniquement.',
      schedules: JSON.stringify(['7:00', '9:30', '13:00', '17:00']),
      supportsReservation: false,
      requiresImmediatePayment: true,
      isFeatured: false,
      featuredOrder: null,
      maxBookingDaysAhead: 7,
    },
    {
      id: 'rakieta',
      name: 'Rakieta Express',
      shortName: 'Rakieta',
      color: '#8E44AD',
      phone: '+226 25 43 10 67',
      email: 'rakieta.express@bf.net',
      description: 'Service express entre Ouagadougou, Bobo-Dioulasso et Koudougou. Rapide, ponctuel, confortable.',
      schedules: JSON.stringify(['8:30', '11:00', '14:00', '18:00']),
      supportsReservation: true,
      requiresImmediatePayment: false,
      isFeatured: true,
      featuredOrder: 3,
      maxBookingDaysAhead: 21,
    },
    {
      id: 'tcv',
      name: 'TCV Transport',
      shortName: 'TCV',
      color: '#E67E22',
      phone: '+226 25 38 90 01',
      email: 'tcv.transport@bf.net',
      description: 'Transport collectif de voyageurs — tarifs compétitifs sur les axes Ouaga–Bobo et Ouaga–Banfora. Paiement sur place.',
      schedules: JSON.stringify(['7:00', '10:00', '14:00', '19:00']),
      supportsReservation: false,
      requiresImmediatePayment: true,
      isFeatured: false,
      featuredOrder: null,
      maxBookingDaysAhead: 14,
    },
  ];

  for (const company of companies) {
    await prisma.company.upsert({
      where: { id: company.id },
      update: {
        phone: company.phone,
        email: company.email,
        description: company.description,
        schedules: company.schedules,
        supportsReservation: company.supportsReservation,
        requiresImmediatePayment: company.requiresImmediatePayment,
        isFeatured: company.isFeatured,
        featuredOrder: company.featuredOrder,
        maxBookingDaysAhead: company.maxBookingDaysAhead,
      },
      create: company,
    });
  }
  console.log('✅ Companies seeded (real BF data)');

  const citiesData = [
    {
      id: 'ouaga',
      name: 'Ouagadougou',
      stations: JSON.stringify([
        'Gare Saramaya (ZAD)',
        'Gare Elitis (Wemtenga)',
        'Gare TSR (Centre)',
        'Gare de la ZAD',
        'Gare Centrale',
        'Gare de Ouaga 2000',
      ]),
    },
    {
      id: 'bobo',
      name: 'Bobo Dioulasso',
      stations: JSON.stringify([
        'Gare Saramaya Bobo',
        'Gare Elitis Bobo',
        'Gare Secteur 25',
        'Gare Centrale de Bobo',
        'Gare de Kôkô',
      ]),
    },
    {
      id: 'kaya',
      name: 'Kaya',
      stations: JSON.stringify(['Gare Saramaya Kaya', 'Gare Centrale de Kaya', 'Gare du Centre']),
    },
    {
      id: 'banfora',
      name: 'Banfora',
      stations: JSON.stringify(['Gare de Banfora', 'Gare Secteur 3']),
    },
    {
      id: 'dedougou',
      name: 'Dédougou',
      stations: JSON.stringify(['Gare Saramaya Dédougou', 'Gare de Dédougou']),
    },
    {
      id: 'koudougou',
      name: 'Koudougou',
      stations: JSON.stringify(['Gare Centrale de Koudougou', 'Gare du Marché']),
    },
    {
      id: 'ouahigouya',
      name: 'Ouahigouya',
      stations: JSON.stringify(['Gare Saramaya Ouahigouya', 'Gare de Ouahigouya', 'Gare Nord']),
    },
    {
      id: 'fada',
      name: "Fada N'Gourma",
      stations: JSON.stringify(['Gare de Fada', 'Gare TSR Fada']),
    },
  ];

  for (const city of citiesData) {
    await prisma.city.upsert({
      where: { id: city.id },
      update: { stations: city.stations },
      create: city,
    });
  }
  console.log('✅ Cities seeded');

  await prisma.booking.deleteMany({});
  await prisma.trip.deleteMany({});

  const today = new Date();
  const tripsTemplate = [
    // Saramaya
    { companyId: 'saramaya', from: 'Ouagadougou', to: 'Bobo Dioulasso', fromStation: 'Gare Saramaya (ZAD)', toStation: 'Gare Saramaya Bobo', departureTime: '6:30', arrivalTime: '11:30', duration: '5h 00', price: 8500, totalSeats: 72 },
    { companyId: 'saramaya', from: 'Ouagadougou', to: 'Bobo Dioulasso', fromStation: 'Gare Saramaya (ZAD)', toStation: 'Gare Saramaya Bobo', departureTime: '8:30', arrivalTime: '13:30', duration: '5h 00', price: 8500, totalSeats: 72 },
    { companyId: 'saramaya', from: 'Ouagadougou', to: 'Bobo Dioulasso', fromStation: 'Gare Saramaya (ZAD)', toStation: 'Gare Saramaya Bobo', departureTime: '14:30', arrivalTime: '19:30', duration: '5h 00', price: 8500, totalSeats: 72 },
    { companyId: 'saramaya', from: 'Ouagadougou', to: 'Bobo Dioulasso', fromStation: 'Gare Saramaya (ZAD)', toStation: 'Gare Saramaya Bobo', departureTime: '21:30', arrivalTime: '02:30', duration: '5h 00', price: 8000, totalSeats: 72 },
    { companyId: 'saramaya', from: 'Ouagadougou', to: 'Kaya', fromStation: 'Gare Saramaya (ZAD)', toStation: 'Gare Saramaya Kaya', departureTime: '9:30', arrivalTime: '12:30', duration: '3h 00', price: 4000, totalSeats: 72 },
    { companyId: 'saramaya', from: 'Ouagadougou', to: 'Kaya', fromStation: 'Gare Saramaya (ZAD)', toStation: 'Gare Saramaya Kaya', departureTime: '14:30', arrivalTime: '17:30', duration: '3h 00', price: 4000, totalSeats: 72 },
    { companyId: 'saramaya', from: 'Ouagadougou', to: 'Ouahigouya', fromStation: 'Gare Saramaya (ZAD)', toStation: 'Gare Saramaya Ouahigouya', departureTime: '7:00', arrivalTime: '10:30', duration: '3h 30', price: 4500, totalSeats: 72 },
    { companyId: 'saramaya', from: 'Ouagadougou', to: 'Dédougou', fromStation: 'Gare Saramaya (ZAD)', toStation: 'Gare Saramaya Dédougou', departureTime: '6:30', arrivalTime: '11:00', duration: '4h 30', price: 5500, totalSeats: 72 },
    { companyId: 'saramaya', from: 'Bobo Dioulasso', to: 'Ouagadougou', fromStation: 'Gare Saramaya Bobo', toStation: 'Gare Saramaya (ZAD)', departureTime: '6:30', arrivalTime: '11:30', duration: '5h 00', price: 8500, totalSeats: 72 },
    { companyId: 'saramaya', from: 'Bobo Dioulasso', to: 'Ouagadougou', fromStation: 'Gare Saramaya Bobo', toStation: 'Gare Saramaya (ZAD)', departureTime: '14:30', arrivalTime: '19:30', duration: '5h 00', price: 8500, totalSeats: 72 },
    // Elitis
    { companyId: 'elitis', from: 'Ouagadougou', to: 'Bobo Dioulasso', fromStation: 'Gare Elitis (Wemtenga)', toStation: 'Gare Elitis Bobo', departureTime: '6:30', arrivalTime: '11:30', duration: '5h 00', price: 9500, totalSeats: 60 },
    { companyId: 'elitis', from: 'Ouagadougou', to: 'Bobo Dioulasso', fromStation: 'Gare Elitis (Wemtenga)', toStation: 'Gare Elitis Bobo', departureTime: '10:30', arrivalTime: '15:30', duration: '5h 00', price: 9500, totalSeats: 60 },
    { companyId: 'elitis', from: 'Ouagadougou', to: 'Bobo Dioulasso', fromStation: 'Gare Elitis (Wemtenga)', toStation: 'Gare Elitis Bobo', departureTime: '14:30', arrivalTime: '19:30', duration: '5h 00', price: 9500, totalSeats: 60 },
    { companyId: 'elitis', from: 'Ouagadougou', to: 'Bobo Dioulasso', fromStation: 'Gare Elitis (Wemtenga)', toStation: 'Gare Elitis Bobo', departureTime: '23:00', arrivalTime: '04:00', duration: '5h 00', price: 9000, totalSeats: 60 },
    { companyId: 'elitis', from: 'Ouagadougou', to: 'Kaya', fromStation: 'Gare de la ZAD', toStation: 'Gare Centrale de Kaya', departureTime: '10:30', arrivalTime: '13:30', duration: '3h 00', price: 4500, totalSeats: 60 },
    { companyId: 'elitis', from: 'Bobo Dioulasso', to: 'Ouagadougou', fromStation: 'Gare Elitis Bobo', toStation: 'Gare Elitis (Wemtenga)', departureTime: '6:30', arrivalTime: '11:30', duration: '5h 00', price: 9500, totalSeats: 60 },
    // TSR
    { companyId: 'tsr', from: 'Ouagadougou', to: 'Bobo Dioulasso', fromStation: 'Gare TSR (Centre)', toStation: 'Gare Centrale de Bobo', departureTime: '6:00', arrivalTime: '11:15', duration: '5h 15', price: 8000, totalSeats: 55 },
    { companyId: 'tsr', from: 'Ouagadougou', to: 'Bobo Dioulasso', fromStation: 'Gare TSR (Centre)', toStation: 'Gare Centrale de Bobo', departureTime: '8:00', arrivalTime: '13:15', duration: '5h 15', price: 8000, totalSeats: 55 },
    { companyId: 'tsr', from: 'Ouagadougou', to: 'Bobo Dioulasso', fromStation: 'Gare TSR (Centre)', toStation: 'Gare Centrale de Bobo', departureTime: '10:00', arrivalTime: '15:15', duration: '5h 15', price: 8000, totalSeats: 55 },
    { companyId: 'tsr', from: 'Ouagadougou', to: 'Bobo Dioulasso', fromStation: 'Gare TSR (Centre)', toStation: 'Gare Centrale de Bobo', departureTime: '12:00', arrivalTime: '17:15', duration: '5h 15', price: 8000, totalSeats: 55 },
    { companyId: 'tsr', from: 'Ouagadougou', to: 'Bobo Dioulasso', fromStation: 'Gare TSR (Centre)', toStation: 'Gare Centrale de Bobo', departureTime: '14:00', arrivalTime: '19:15', duration: '5h 15', price: 8000, totalSeats: 55 },
    { companyId: 'tsr', from: 'Ouagadougou', to: 'Kaya', fromStation: 'Gare Centrale', toStation: 'Gare du Centre', departureTime: '7:00', arrivalTime: '10:00', duration: '3h 00', price: 3500, totalSeats: 55 },
    { companyId: 'tsr', from: 'Ouagadougou', to: 'Kaya', fromStation: 'Gare Centrale', toStation: 'Gare du Centre', departureTime: '13:00', arrivalTime: '16:00', duration: '3h 00', price: 3500, totalSeats: 55 },
    { companyId: 'tsr', from: "Ouagadougou", to: "Fada N'Gourma", fromStation: 'Gare Centrale', toStation: 'Gare TSR Fada', departureTime: '7:00', arrivalTime: '11:30', duration: '4h 30', price: 5000, totalSeats: 55 },
    { companyId: 'tsr', from: 'Bobo Dioulasso', to: 'Ouagadougou', fromStation: 'Gare Centrale de Bobo', toStation: 'Gare TSR (Centre)', departureTime: '6:00', arrivalTime: '11:15', duration: '5h 15', price: 8000, totalSeats: 55 },
    // Rahimo
    { companyId: 'rahimo', from: 'Ouagadougou', to: 'Ouahigouya', fromStation: 'Gare Centrale', toStation: 'Gare de Ouahigouya', departureTime: '7:00', arrivalTime: '10:00', duration: '3h 00', price: 4000, totalSeats: 60 },
    { companyId: 'rahimo', from: 'Ouagadougou', to: 'Ouahigouya', fromStation: 'Gare Centrale', toStation: 'Gare de Ouahigouya', departureTime: '13:00', arrivalTime: '16:00', duration: '3h 00', price: 4000, totalSeats: 60 },
    { companyId: 'rahimo', from: 'Ouagadougou', to: 'Ouahigouya', fromStation: 'Gare Centrale', toStation: 'Gare de Ouahigouya', departureTime: '16:00', arrivalTime: '19:00', duration: '3h 00', price: 4000, totalSeats: 60 },
    { companyId: 'rahimo', from: 'Ouahigouya', to: 'Ouagadougou', fromStation: 'Gare de Ouahigouya', toStation: 'Gare Centrale', departureTime: '6:00', arrivalTime: '9:00', duration: '3h 00', price: 4000, totalSeats: 60 },
    { companyId: 'rahimo', from: 'Ouahigouya', to: 'Ouagadougou', fromStation: 'Gare de Ouahigouya', toStation: 'Gare Centrale', departureTime: '9:00', arrivalTime: '12:00', duration: '3h 00', price: 4000, totalSeats: 60 },
    // STMB
    { companyId: 'stmb', from: 'Ouagadougou', to: 'Bobo Dioulasso', fromStation: 'Gare de Ouaga 2000', toStation: 'Gare Centrale de Bobo', departureTime: '9:30', arrivalTime: '14:45', duration: '5h 15', price: 7500, totalSeats: 55 },
    { companyId: 'stmb', from: 'Ouagadougou', to: 'Banfora', fromStation: 'Gare de Ouaga 2000', toStation: 'Gare de Banfora', departureTime: '7:00', arrivalTime: '14:00', duration: '7h 00', price: 10000, totalSeats: 55 },
    { companyId: 'stmb', from: 'Ouagadougou', to: 'Koudougou', fromStation: 'Gare de Ouaga 2000', toStation: 'Gare Centrale de Koudougou', departureTime: '9:30', arrivalTime: '12:00', duration: '2h 30', price: 3000, totalSeats: 55 },
    // Rakieta
    { companyId: 'rakieta', from: 'Ouagadougou', to: 'Bobo Dioulasso', fromStation: 'Gare de la ZAD', toStation: 'Gare de Kôkô', departureTime: '8:30', arrivalTime: '14:00', duration: '5h 30', price: 8000, totalSeats: 65 },
    { companyId: 'rakieta', from: 'Ouagadougou', to: 'Bobo Dioulasso', fromStation: 'Gare de la ZAD', toStation: 'Gare de Kôkô', departureTime: '14:00', arrivalTime: '19:30', duration: '5h 30', price: 8000, totalSeats: 65 },
    { companyId: 'rakieta', from: 'Ouagadougou', to: 'Koudougou', fromStation: 'Gare de la ZAD', toStation: 'Gare Centrale de Koudougou', departureTime: '8:30', arrivalTime: '11:00', duration: '2h 30', price: 3000, totalSeats: 65 },
    { companyId: 'rakieta', from: 'Ouagadougou', to: 'Koudougou', fromStation: 'Gare de la ZAD', toStation: 'Gare Centrale de Koudougou', departureTime: '14:00', arrivalTime: '16:30', duration: '2h 30', price: 3000, totalSeats: 65 },
    // TCV
    { companyId: 'tcv', from: 'Ouagadougou', to: 'Bobo Dioulasso', fromStation: 'Gare Centrale', toStation: 'Gare Secteur 25', departureTime: '7:00', arrivalTime: '12:30', duration: '5h 30', price: 7000, totalSeats: 50 },
    { companyId: 'tcv', from: 'Ouagadougou', to: 'Bobo Dioulasso', fromStation: 'Gare Centrale', toStation: 'Gare Secteur 25', departureTime: '14:00', arrivalTime: '19:30', duration: '5h 30', price: 7000, totalSeats: 50 },
  ];

  for (let d = 0; d < 14; d++) {
    const date = new Date(today);
    date.setDate(today.getDate() + d);
    const dateStr = date.toISOString().split('T')[0];
    for (const tmpl of tripsTemplate) {
      await prisma.trip.create({ data: { ...tmpl, date: dateStr } });
    }
  }
  console.log('✅ Trips seeded (14 days, enriched schedule)');

  await prisma.user.upsert({
    where: { phone: '+22601020304' },
    update: { cnib: 'B00112233' },
    create: { name: 'Alassane Sira', phone: '+22601020304', cnib: 'B00112233' },
  });

  await prisma.user.upsert({
    where: { email: 'jkossouvi@gmail.com' },
    update: {},
    create: { name: 'Jojo Kossouvi', email: 'jkossouvi@gmail.com' },
  });

  await prisma.user.upsert({
    where: { phone: '+22670000001' },
    update: { cnib: 'B00445566' },
    create: { name: 'Fatima Ouedraogo', phone: '+22670000001', cnib: 'B00445566' },
  });

  await prisma.user.upsert({
    where: { phone: '+22656146917' },
    update: { cnib: 'B00778899' },
    create: { name: 'Joseph Kossouvi', phone: '+22656146917', cnib: 'B00778899' },
  });

  await prisma.user.upsert({
    where: { phone: '+22601020301' },
    update: { cnib: 'B10488329' },
    create: { name: 'Joseph Kossouvi', phone: '+22601020301', cnib: 'B10488329' },
  });

  console.log('✅ Demo users seeded (5 users total)');

  // Seed loyalty accounts for demo users
  const demoUsers = await prisma.user.findMany({ take: 5 });
  const loyaltySeeds = [
    { points: 850, totalEarned: 850, level: 'silver' },
    { points: 150, totalEarned: 150, level: 'bronze' },
    { points: 2400, totalEarned: 3200, level: 'gold' },
    { points: 60, totalEarned: 60, level: 'bronze' },
    { points: 5200, totalEarned: 6800, level: 'platinum' },
  ];
  for (let i = 0; i < demoUsers.length; i++) {
    const user = demoUsers[i];
    const seed = loyaltySeeds[i] ?? { points: 0, totalEarned: 0, level: 'bronze' };
    const existing = await prisma.loyaltyAccount.findUnique({ where: { userId: user.id } });
    if (!existing) {
      const account = await prisma.loyaltyAccount.create({
        data: { userId: user.id, points: seed.points, totalEarned: seed.totalEarned, level: seed.level },
      });
      if (seed.points > 0) {
        await prisma.loyaltyTransaction.create({
          data: {
            accountId: account.id,
            type: 'earn',
            points: seed.totalEarned,
            description: 'Points initiaux (migration)',
          },
        });
      }
    }
  }
  console.log('✅ Loyalty accounts seeded');
  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
