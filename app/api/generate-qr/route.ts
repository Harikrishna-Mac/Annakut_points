// import { auth } from '@clerk/nextjs/server';
// import { NextRequest, NextResponse } from 'next/server';
// import QRCode from 'qrcode';

// export async function POST(request: NextRequest) {
//   try {
//     // ✅ Await auth
//     const { userId } = await auth();
//     if (!userId) {
//       return NextResponse.json(
//         { error: 'Authentication required' },
//         { status: 401 }
//       );
//     }

//     const { sevakId, sevakName } = await request.json();

//     // ✅ Validate input
//     if (!sevakId || !sevakName) {
//       return NextResponse.json(
//         { error: 'Sevak ID and name are required' },
//         { status: 400 }
//       );
//     }

//     // ✅ Generate QR code
//     const qrCodeBuffer = await QRCode.toBuffer(sevakId, {
//       type: 'png',
//       width: 300,
//       margin: 2,
//       color: {
//         dark: '#000000',
//         light: '#FFFFFF',
//       },
//     });

//     // ✅ Full HTML with all styles inside
//     const htmlTemplate = `
//       <!DOCTYPE html>
// <html>
//   <head>
//     <meta charset="utf-8" />
//     <title>Sevak ID Card - ${sevakName}</title>
//     <style>
//       body {
//         font-family: "Poppins", sans-serif;
//         margin: 0;
//         padding: 30px;
//         background: #eceff1;
//         display: flex;
//         justify-content: center;
//         align-items: center;
//       }
//       .id-card {
//         width: 420px;
//         height: 260px;
//         background: #ffffff;
//         border-radius: 20px;
//         overflow: hidden;
//         box-shadow: 0 12px 35px rgba(0, 0, 0, 0.25);
//         position: relative;
//         display: flex;
//         flex-direction: column;
//       }
//       /* Header Ribbon */
//       .header {
//         background: linear-gradient(135deg, #ff7e00, #ff3d71);
//         padding: 12px 20px;
//         text-align: center;
//         color: #fff;
//       }
//       .header .title {
//         font-size: 18px;
//         font-weight: 700;
//         letter-spacing: 0.5px;
//       }
//       .header .subtitle {
//         font-size: 12px;
//         opacity: 0.9;
//       }
//       /* Main Content */
//       .content {
//         flex: 1;
//         display: flex;
//         justify-content: space-between;
//         align-items: center;
//         padding: 20px;
//         background: rgba(255, 255, 255, 0.6);
//         backdrop-filter: blur(8px);
//       }
//       .info {
//         flex: 1;
//         padding-right: 15px;
//       }
//       .sevak-name {
//         font-size: 20px;
//         font-weight: 600;
//         color: #333;
//         margin-bottom: 6px;
//       }
//       .sevak-id {
//         font-size: 14px;
//         color: #444;
//         padding: 6px 14px;
//         border-radius: 15px;
//         background: linear-gradient(135deg, #ffecd2, #fcb69f);
//         display: inline-block;
//         font-weight: 500;
//         margin-bottom: 12px;
//       }
//       .mantra {
//         font-size: 12px;
//         font-style: italic;
//         color: #666;
//       }
//       /* QR Section */
//       .qr-section {
//         text-align: center;
//       }
//       .qr-code {
//         width: 110px;
//         height: 110px;
//         background: #fff;
//         border-radius: 12px;
//         padding: 8px;
//         box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
//         margin-bottom: 6px;
//       }
//       .scan-text {
//         font-size: 11px;
//         color: #555;
//       }
//       /* Footer */
//       .footer {
//         background: #f7f7f7;
//         padding: 8px 12px;
//         text-align: center;
//         font-size: 11px;
//         color: #444;
//         border-top: 1px solid #e0e0e0;
//       }
//     </style>
//   </head>
//   <body>
//     <div class="id-card">
//       <div class="header">
//         <div class="title">ANNAKUT POINT SYSTEM</div>
//         <div class="subtitle">Seva Management ID Card</div>
//       </div>
//       <div class="content">
//         <div class="info">
//           <div class="sevak-name">${sevakName}</div>
//           <div class="sevak-id">ID: ${sevakId}</div>
//         </div>
//         <div class="qr-section">
//           <div class="qr-code">
//             <img
//               src="data:image/png;base64,${qrCodeBuffer.toString("base64")}"
//               style="width: 100%; height: 100%; object-fit: contain"
//             />
//           </div>
//           <div class="scan-text">📲 Scan for Points</div>
//         </div>
//       </div>
//       <div class="footer">
//         © 2025 Annakut Point System • Service is the highest dharma
//       </div>
//     </div>
//   </body>
// </html>

//     `;

//     // ✅ Return HTML file download
//     return new NextResponse(htmlTemplate, {
//       status: 200,
//       headers: {
//         'Content-Type': 'text/html',
//         'Content-Disposition': `attachment; filename="${sevakId}_${sevakName.replace(
//           /\s+/g,
//           '_'
//         )}_ID_Card.html"`,
//       },
//     });
//   } catch (error: any) {
//     console.error('Generate QR error:', error);

//     return NextResponse.json(
//       { error: 'Failed to generate QR code. Please try again.' },
//       { status: 500 }
//     );
//   }
// }


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
