import { NextRequest, NextResponse } from 'next/server';
import { capturePayPalOrder, getPayPalOrder } from '@/lib/payments/paypal';
import { activateSubscription, logPayment } from '@/lib/payments/subscription-activation';

/**
 * POST /api/payments/paypal/capture
 * Captured eine PayPal-Zahlung nach erfolgreicher Approve
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, payerId } = body;
    
    if (!orderId) {
      return NextResponse.json(
        { error: 'Missing orderId' },
        { status: 400 }
      );
    }
    
    // Order Status prüfen
    const order = await getPayPalOrder(orderId);
    
    if (!order) {
      return NextResponse.json(
        { error: 'PayPal order not found' },
        { status: 404 }
      );
    }
    
    // Wenn Order bereits captured ist, gibt Status zurück
    if (order.status === 'COMPLETED') {
      return NextResponse.json({
        success: true,
        message: 'Order already completed',
        orderId: order.id,
        status: order.status,
      });
    }
    
    // Order capture
    const capturedOrder = await capturePayPalOrder(orderId);
    
    if (capturedOrder.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: `Payment not completed. Status: ${capturedOrder.status}` },
        { status: 400 }
      );
    }
    
    // Metadata aus Order extrahieren
    // Custom ID Format: userId|tier|billingCycle|locale|customerEmail|customerName
    // Wir müssen die Order-Details abrufen, um die custom_id zu bekommen
    // Da die PayPal SDK die custom_id nicht direkt zurückgibt, müssen wir sie aus der Order extrahieren
    // Für jetzt: Subscription wird über Webhook aktiviert, falls custom_id vorhanden
    
    // Payment loggen (wenn möglich)
    try {
      // Die custom_id sollte in der Order-Details sein
      // Für jetzt loggen wir die Zahlung ohne user-spezifische Daten
      // Die vollständige Aktivierung erfolgt über Webhook
      console.log('[PayPal Capture] Order captured successfully:', capturedOrder.id);
    } catch (logError: any) {
      console.error('[PayPal Capture] Error logging payment:', logError);
      // Nicht kritisch - Webhook wird die Aktivierung übernehmen
    }
    
    return NextResponse.json({
      success: true,
      orderId: capturedOrder.id,
      status: capturedOrder.status,
      message: 'Payment captured successfully',
    });
  } catch (error: any) {
    console.error('[PayPal Capture] Error:', error);
    return NextResponse.json(
      { error: 'Failed to capture payment', message: error.message },
      { status: 500 }
    );
  }
}

