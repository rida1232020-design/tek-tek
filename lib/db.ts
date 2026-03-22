import { supabase } from './supabase';

// ============================================================
// USERS
// ============================================================

export async function upsertUser(user: any): Promise<void> {
  const { data, error } = await supabase
    .from('users')
    .upsert({
      openId: user.openId,
      name: user.name,
      email: user.email,
      phone: user.phone,
      loginMethod: user.loginMethod || 'manual',
      role: user.role || 'customer',
      lastSignedIn: new Date()
    }, { onConflict: 'openId' });

  if (error) {
    console.error('Error upserting user:', error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('openId', openId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is "No rows found"
    console.error('Error getting user by openId:', error);
    return undefined;
  }
  return data || undefined;
}

// ============================================================
// AREAS - مناطق العمل
// ============================================================

export async function getAreas() {
  const { data, error } = await supabase
    .from('areas')
    .select('*')
    .eq('isActive', true)
    .order('name');

  if (error) {
    console.error('Error getting areas:', error);
    return [];
  }
  return data || [];
}

// ============================================================
// DRIVERS - السائقون
// ============================================================

export async function getAvailableDrivers(areaId?: number) {
  let query = supabase
    .from('drivers')
    .select('*')
    .eq('isOnline', true)
    .eq('isAvailable', true)
    .eq('isVerified', true);

  if (areaId) {
    query = query.eq('areaId', areaId);
  }

  const { data, error } = await query.order('averageRating', { ascending: false });

  if (error) {
    console.error('Error getting available drivers:', error);
    return [];
  }
  return data || [];
}

export async function getDriverByUserId(userId: string) {
  const { data, error } = await supabase
    .from('drivers')
    .select('*')
    .eq('userId', userId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is "No rows found"
    console.error('Error getting driver by userId:', error);
  }
  return data || undefined;
}

export async function updateDriverLocation(driverId: string, lat: number, lng: number) {
  const { error } = await supabase
    .from('drivers')
    .update({
      currentLat: lat,
      currentLng: lng,
      lastLocationUpdate: new Date()
    })
    .eq('id', driverId);

  if (error) console.error('Error updating driver location:', error);
}

export async function updateDriverStatus(driverId: string, isOnline: boolean, isAvailable: boolean) {
  const { error } = await supabase
    .from('drivers')
    .update({ isOnline, isAvailable })
    .eq('id', driverId);

  if (error) console.error('Error updating driver status:', error);
}

// ============================================================
// TRIPS - الرحلات
// ============================================================

export async function createTrip(tripData: {
  customerId: string;
  pickupLat: number;
  pickupLng: number;
  pickupAddress: string;
  destLat: number;
  destLng: number;
  destAddress: string;
  price?: number;
}) {
  const { data, error } = await supabase
    .from('trips')
    .insert([{
      customerId: tripData.customerId,
      pickupLat: tripData.pickupLat,
      pickupLng: tripData.pickupLng,
      pickupAddress: tripData.pickupAddress,
      destLat: tripData.destLat,
      destLng: tripData.destLng,
      destAddress: tripData.destAddress,
      price: tripData.price,
      status: 'pending',
    }])
    .select();

  if (error) {
    console.error('Error creating trip:', error);
    return null;
  }
  return data ? data[0] : null;
}

export async function updateTripStatus(
  tripId: string,
  status: 'accepted' | 'arrived' | 'in_progress' | 'completed' | 'cancelled'
) {
  const updateData: any = { status };
  const now = new Date();
  if (status === 'accepted') updateData.acceptedAt = now;
  if (status === 'in_progress') updateData.startedAt = now;
  if (status === 'completed') { updateData.completedAt = now; updateData.isPaid = true; }
  if (status === 'cancelled') updateData.cancelledAt = now;

  const { error } = await supabase
    .from('trips')
    .update(updateData)
    .eq('id', tripId);

  if (error) console.error('Error updating trip status:', error);
}

export async function getCustomerTrips(customerId: string) {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('customerId', customerId)
    .order('requestedAt', { ascending: false });

  if (error) {
    console.error('Error getting customer trips:', error);
    return [];
  }
  return data || [];
}

export async function getDriverTrips(driverId: string) {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('driverId', driverId)
    .order('requestedAt', { ascending: false });

  if (error) {
    console.error('Error getting driver trips:', error);
    return [];
  }
  return data || [];
}

// ============================================================
// REVIEWS - التقييمات
// ============================================================

export async function createReview(data: {
  tripId: string;
  customerId: string;
  driverId: string;
  rating: number;
  comment?: string;
}) {
  const { error: insertError } = await supabase.from('reviews').insert([data]);

  if (insertError) {
    console.error('Error creating review:', insertError);
    return null;
  }

  // تحديث متوسط تقييم السائق
  const { data: allReviews, error: selectError } = await supabase
    .from('reviews')
    .select('rating')
    .eq('driverId', data.driverId);

  if (selectError) {
    console.error('Error getting reviews for driver rating update:', selectError);
    return { success: true }; // Review was created, but rating update failed
  }

  const avg = allReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / allReviews.length;

  const { error: updateError } = await supabase
    .from('drivers')
    .update({
      averageRating: parseFloat(avg.toFixed(2)),
      ratingCount: allReviews.length,
    })
    .eq('id', data.driverId);

  if (updateError) {
    console.error('Error updating driver rating:', updateError);
  }

  return { success: true };
}

// ============================================================
// MESSAGES - الرسائل
// ============================================================

export async function getTripMessages(tripId: string) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('tripId', tripId)
    .order('createdAt', { ascending: true });

  if (error) {
    console.error('Error getting trip messages:', error);
    return [];
  }
  return data || [];
}

// ============================================================
// NOTIFICATIONS - الإشعارات
// ============================================================

export async function getUserNotifications(userId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('userId', userId)
    .order('createdAt', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error getting user notifications:', error);
    return [];
  }
  return data || [];
}
