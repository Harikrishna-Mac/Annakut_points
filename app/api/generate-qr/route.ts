
import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { sevakId, sevakName } = await request.json();

    if (!sevakId || !sevakName) {
      return NextResponse.json(
        { error: 'Sevak ID and name are required' },
        { status: 400 }
      );
    }

    // ✅ Generate QR code PNG buffer
    const qrCodeBuffer = await QRCode.toBuffer(sevakId, {
      type: 'png',
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });

    // ✅ Convert Buffer -> Uint8Array
    const qrCodeUint8Array = new Uint8Array(qrCodeBuffer);

    // ✅ Return PNG file
    return new NextResponse(qrCodeUint8Array, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="${sevakId}_${sevakName.replace(/\s+/g, '_')}_QRCode.png"`,
      },
    });
  } catch (error: any) {
    console.error('Generate QR error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PNG. Please try again.' },
      { status: 500 }
    );
  }
}
