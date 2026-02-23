import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { eq, desc, and, sql, ne } from 'drizzle-orm';
import { ENV } from './env';
import * as schema from './schema';

// اتصال قاعدة البيانات
let connectionPool: mysql.Pool | null = null;
let db: any = null;

export async function getDb() {
  if (!db) {
    if (!ENV.databaseUrl) {
      console.warn('⚠️ DATABASE_URL not set. Using mock mode.');
      return null;
    }
    try {
      connectionPool = mysql.createPool(ENV.databaseUrl);
      db = drizzle(connectionPool, { schema, mode: 'default' });
      console.log('✅ Database connected successfully');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      return null;
    }
  }
  return db;
}

// ============================================================
// USERS
// ============================================================

export async function upsertUser(user: any): Promise<void> {
  const database = await getDb();
  if (!database) { console.log("Mock upsertUser:", user); return; }

  try {
    const existing = await database
      .select()
      .from(schema.users)
      .where(eq(schema.users.openId, user.openId))
      .limit(1);

    if (existing.length > 0) {
      await database
        .update(schema.users)
        .set({ name: user.name, email: user.email, lastSignedIn: new Date() })
        .where(eq(schema.users.openId, user.openId));
    } else {
      await database.insert(schema.users).values({
        openId: user.openId,
        name: user.name,
        email: user.email,
        phone: user.phone,
        loginMethod: user.loginMethod || 'manus',
        role: user.role || 'customer',
      });
    }
  } catch (error) {
    console.error('Error upserting user:', error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const database = await getDb();
  if (!database) return undefined;

  try {
    const users = await database
      .select()
      .from(schema.users)
      .where(eq(schema.users.openId, openId))
      .limit(1);
    return users[0] || undefined;
  } catch (error) {
    console.error('Error getting user by openId:', error);
    return undefined;
  }
}

// ============================================================
// AREAS - مناطق العمل
// ============================================================

export async function getAreas() {
  const database = await getDb();
  if (!database) return [];

  try {
    return await database
      .select()
      .from(schema.areas)
      .where(eq(schema.areas.isActive, true))
      .orderBy(schema.areas.name);
  } catch (error) {
    console.error('Error getting areas:', error);
    return [];
  }
}

// ============================================================
// DRIVERS - السائقون
// ============================================================

export async function getAvailableDrivers(areaId?: number) {
  const database = await getDb();
  if (!database) return [];

  try {
    const conditions = [
      eq(schema.drivers.isOnline, true),
      eq(schema.drivers.isAvailable, true),
      eq(schema.drivers.isVerified, true),
    ];
    if (areaId) conditions.push(eq(schema.drivers.areaId, areaId));

    return await database
      .select()
      .from(schema.drivers)
      .where(and(...conditions))
      .orderBy(desc(schema.drivers.averageRating));
  } catch (error) {
    console.error('Error getting available drivers:', error);
    return [];
  }
}

export async function getDriverByUserId(userId: number) {
  const database = await getDb();
  if (!database) return undefined;

  try {
    const results = await database
      .select()
      .from(schema.drivers)
      .where(eq(schema.drivers.userId, userId))
      .limit(1);
    return results[0] || undefined;
  } catch (error) {
    console.error('Error getting driver by userId:', error);
    return undefined;
  }
}

export async function updateDriverLocation(driverId: number, lat: number, lng: number) {
  const database = await getDb();
  if (!database) return;

  try {
    await database
      .update(schema.drivers)
      .set({
        currentLat: lat.toString(),
        currentLng: lng.toString(),
        lastLocationUpdate: new Date(),
      })
      .where(eq(schema.drivers.id, driverId));
  } catch (error) {
    console.error('Error updating driver location:', error);
  }
}

export async function updateDriverStatus(driverId: number, isOnline: boolean, isAvailable: boolean) {
  const database = await getDb();
  if (!database) return;

  try {
    await database
      .update(schema.drivers)
      .set({ isOnline, isAvailable })
      .where(eq(schema.drivers.id, driverId));
  } catch (error) {
    console.error('Error updating driver status:', error);
  }
}

// ============================================================
// TRIPS - الرحلات
// ============================================================

export async function createTrip(tripData: {
  customerId: number;
  pickupLat: number;
  pickupLng: number;
  pickupAddress: string;
  destLat: number;
  destLng: number;
  destAddress: string;
  price?: number;
}) {
  const database = await getDb();
  if (!database) {
    console.log("Mock createTrip:", tripData);
    return null;
  }

  try {
    const result = await database.insert(schema.trips).values({
      customerId: tripData.customerId,
      pickupLat: tripData.pickupLat.toString(),
      pickupLng: tripData.pickupLng.toString(),
      pickupAddress: tripData.pickupAddress,
      destLat: tripData.destLat.toString(),
      destLng: tripData.destLng.toString(),
      destAddress: tripData.destAddress,
      price: tripData.price?.toString(),
      status: 'pending',
    });
    return result;
  } catch (error) {
    console.error('Error creating trip:', error);
    return null;
  }
}

export async function updateTripStatus(
  tripId: number,
  status: 'accepted' | 'arrived' | 'in_progress' | 'completed' | 'cancelled'
) {
  const database = await getDb();
  if (!database) return;

  try {
    const updateData: any = { status };
    const now = new Date();
    if (status === 'accepted') updateData.acceptedAt = now;
    if (status === 'in_progress') updateData.startedAt = now;
    if (status === 'completed') { updateData.completedAt = now; updateData.isPaid = true; }
    if (status === 'cancelled') updateData.cancelledAt = now;

    await database
      .update(schema.trips)
      .set(updateData)
      .where(eq(schema.trips.id, tripId));
  } catch (error) {
    console.error('Error updating trip status:', error);
  }
}

export async function getCustomerTrips(customerId: number) {
  const database = await getDb();
  if (!database) return [];

  try {
    return await database
      .select()
      .from(schema.trips)
      .where(eq(schema.trips.customerId, customerId))
      .orderBy(desc(schema.trips.requestedAt));
  } catch (error) {
    console.error('Error getting customer trips:', error);
    return [];
  }
}

export async function getDriverTrips(driverId: number) {
  const database = await getDb();
  if (!database) return [];

  try {
    return await database
      .select()
      .from(schema.trips)
      .where(eq(schema.trips.driverId, driverId))
      .orderBy(desc(schema.trips.requestedAt));
  } catch (error) {
    console.error('Error getting driver trips:', error);
    return [];
  }
}

// ============================================================
// REVIEWS - التقييمات
// ============================================================

export async function createReview(data: {
  tripId: number;
  customerId: number;
  driverId: number;
  rating: number;
  comment?: string;
}) {
  const database = await getDb();
  if (!database) return null;

  try {
    await database.insert(schema.reviews).values(data);

    // تحديث متوسط تقييم السائق
    const allReviews = await database
      .select()
      .from(schema.reviews)
      .where(eq(schema.reviews.driverId, data.driverId));

    const avg = allReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / allReviews.length;

    await database
      .update(schema.drivers)
      .set({
        averageRating: avg.toFixed(2),
        ratingCount: allReviews.length,
      })
      .where(eq(schema.drivers.id, data.driverId));

    return { success: true };
  } catch (error) {
    console.error('Error creating review:', error);
    return null;
  }
}

// ============================================================
// MESSAGES - الرسائل
// ============================================================

export async function getTripMessages(tripId: number) {
  const database = await getDb();
  if (!database) return [];

  try {
    return await database
      .select()
      .from(schema.messages)
      .where(eq(schema.messages.tripId, tripId))
      .orderBy(schema.messages.createdAt);
  } catch (error) {
    console.error('Error getting trip messages:', error);
    return [];
  }
}

// ============================================================
// NOTIFICATIONS - الإشعارات
// ============================================================

export async function getUserNotifications(userId: number) {
  const database = await getDb();
  if (!database) return [];

  try {
    return await database
      .select()
      .from(schema.notifications)
      .where(eq(schema.notifications.userId, userId))
      .orderBy(desc(schema.notifications.createdAt))
      .limit(50);
  } catch (error) {
    console.error('Error getting user notifications:', error);
    return [];
  }
}
