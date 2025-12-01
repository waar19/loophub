import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { requireAuth, handleApiError } from '@/lib/api-helpers';
import { z } from 'zod';

/**
 * Push subscription request schema
 * Requirements: 3.1, 3.2
 */
const subscribeSchema = z.object({
  endpoint: z.string().url('Invalid endpoint URL'),
  keys: z.object({
    p256dh: z.string().min(1, 'p256dh key is required'),
    auth: z.string().min(1, 'auth key is required'),
  }),
});

const unsubscribeSchema = z.object({
  endpoint: z.string().url('Invalid endpoint URL'),
});

/**
 * POST /api/push/subscribe
 * Store a push subscription for the authenticated user
 * Requirements: 3.1, 3.2
 */
export async function POST(request: Request) {
  try {
    const { user } = await requireAuth();
    const supabase = await createClient();

    const body = await request.json();
    const validatedData = subscribeSchema.parse(body);

    // Check if subscription already exists for this endpoint
    const { data: existing } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('endpoint', validatedData.endpoint)
      .single();

    if (existing) {
      // Update existing subscription (keys might have changed)
      const { error: updateError } = await supabase
        .from('push_subscriptions')
        .update({
          p256dh: validatedData.keys.p256dh,
          auth: validatedData.keys.auth,
          user_id: user.id,
        })
        .eq('endpoint', validatedData.endpoint);

      if (updateError) throw updateError;

      return NextResponse.json({
        success: true,
        message: 'Subscription updated',
      });
    }

    // Create new subscription
    const { error: insertError } = await supabase
      .from('push_subscriptions')
      .insert({
        user_id: user.id,
        endpoint: validatedData.endpoint,
        p256dh: validatedData.keys.p256dh,
        auth: validatedData.keys.auth,
      });

    if (insertError) throw insertError;

    return NextResponse.json({
      success: true,
      message: 'Subscription created',
    });
  } catch (error) {
    return handleApiError(error, 'Error al guardar suscripción push');
  }
}

/**
 * DELETE /api/push/subscribe
 * Remove a push subscription
 * Requirements: 5.3
 */
export async function DELETE(request: Request) {
  try {
    const { user } = await requireAuth();
    const supabase = await createClient();

    const body = await request.json();
    const validatedData = unsubscribeSchema.parse(body);

    // Delete subscription for this user and endpoint
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id)
      .eq('endpoint', validatedData.endpoint);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Subscription removed',
    });
  } catch (error) {
    return handleApiError(error, 'Error al eliminar suscripción push');
  }
}
