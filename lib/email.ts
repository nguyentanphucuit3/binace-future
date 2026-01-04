import nodemailer from 'nodemailer';
import type { CoinRSI } from '@/lib/binance';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}) {
  try {
    console.log(`[Email] Attempting to send email to: ${to}`);
    console.log(`[Email] Subject: ${subject}`);
    console.log(`[Email] From: ${process.env.SMTP_USER || 'NOT SET'}`);
    
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      const errorMsg = 'SMTP credentials not configured';
      console.error(`[Email] ❌ ${errorMsg}`);
      console.error(`[Email] SMTP_USER: ${process.env.SMTP_USER ? '✅ Set (' + process.env.SMTP_USER + ')' : '❌ Missing'}`);
      console.error(`[Email] SMTP_PASS: ${process.env.SMTP_PASS ? '✅ Set (length: ' + process.env.SMTP_PASS.length + ')' : '❌ Missing'}`);
      throw new Error(errorMsg);
    }
    
    // Log password length (for debugging, don't log actual password)
    console.log(`[Email] SMTP_PASS length: ${process.env.SMTP_PASS.length} characters`);
    if (process.env.SMTP_PASS.includes(' ')) {
      console.log(`[Email] ⚠️ SMTP_PASS contains spaces - this might be OK if it's Gmail App Password format`);
    }

    console.log(`[Email] SMTP configured, sending mail...`);
    const info = await transporter.sendMail({
      from: `"Binance Futures Alert" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html,
    });

    console.log('✅ Email sent successfully:', info.messageId);
    console.log(`[Email] Response: ${JSON.stringify(info.response)}`);
    return { success: true, messageId: info.messageId };
  } catch (error: unknown) {
    console.error('❌ Error sending email:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorCode = (error as { code?: string })?.code;
    const errorResponse = (error as { response?: string })?.response;
    
    if (errorCode) {
      console.error(`[Email] Error code: ${errorCode}`);
    }
    console.error(`[Email] Error message: ${errorMessage}`);
    if (errorResponse) {
      console.error(`[Email] SMTP response: ${errorResponse}`);
    }
    return { success: false, error: errorMessage };
  }
}

interface AlertCoin extends CoinRSI {
  alertStatus: 'red' | 'yellow' | 'green';
}

export async function sendAlertNotification({
  alertCoins,
  scanTime,
}: {
  alertCoins: AlertCoin[];
  scanTime: string;
}) {
  // Get list of admin emails (comma-separated or default)
  const adminEmailDefault = process.env.ADMIN_EMAIL || process.env.SMTP_USER || 'hi.lienminhceo@gmail.com';
  const additionalEmails = ['hi.lienminhceo@gmail.com', 'hanhpham.hlg@gmail.com'];
  
  // Combine all email addresses (remove duplicates)
  const allEmails = [adminEmailDefault, ...additionalEmails].filter((email, index, self) => 
    self.indexOf(email) === index // Remove duplicates
  );
  
  const adminEmail = allEmails.join(', '); // Nodemailer accepts comma-separated emails

  // Group coins by alert type
  const redCoins = alertCoins.filter(c => c.alertStatus === 'red');
  const yellowCoins = alertCoins.filter(c => c.alertStatus === 'yellow');
  const greenCoins = alertCoins.filter(c => c.alertStatus === 'green');

  const hasRed = redCoins.length > 0;
  const hasYellow = yellowCoins.length > 0;
  const hasGreen = greenCoins.length > 0;

  // Determine subject and priority
  let subject = '🔔 ';
  if (hasRed) {
    subject += `[🔴 BÁO ĐỘNG ĐỎ] ${redCoins.length} coin`;
  } else if (hasYellow) {
    subject += `[🟡 BÁO ĐỘNG VÀNG] ${yellowCoins.length} coin`;
  } else if (hasGreen) {
    subject += `[🟢 BÁO ĐỘNG XANH] ${greenCoins.length} coin`;
  }
  subject += ` - Binance Futures Scan ${scanTime}`;

  const formatFundingRate = (rate: number | undefined) => {
    if (rate === undefined) return '-';
    return `${(rate * 100).toFixed(4)}%`;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    }).format(price);
  };

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; padding: 20px; background: #f5f5f5; }
        .container { max-width: 900px; margin: 0 auto; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { 
          background: ${hasRed ? 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)' : hasYellow ? 'linear-gradient(135deg, #d97706 0%, #92400e 100%)' : 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)'}; 
          color: white; 
          padding: 30px; 
          text-align: center; 
        }
        .content { padding: 30px; }
        .scan-time { background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 25px; text-align: center; }
        .alert-section { margin: 30px 0; }
        .alert-title { 
          font-size: 20px; 
          font-weight: 700; 
          margin-bottom: 15px; 
          padding: 12px; 
          border-radius: 8px;
          ${hasRed ? 'background: #fee2e2; color: #991b1b; border-left: 4px solid #dc2626;' : ''}
          ${hasYellow && !hasRed ? 'background: #fef3c7; color: #92400e; border-left: 4px solid #d97706;' : ''}
          ${hasGreen && !hasRed && !hasYellow ? 'background: #dcfce7; color: #15803d; border-left: 4px solid #16a34a;' : ''}
        }
        .coins-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        .coins-table th { background: #f9fafb; padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb; font-weight: 600; }
        .coins-table td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
        .coins-table tr:hover { background: #f9fafb; }
        .symbol { font-weight: 600; color: #1f2937; }
        .rsi-high { color: #dc2626; font-weight: 600; }
        .rsi-medium { color: #d97706; font-weight: 600; }
        .funding-positive { color: #16a34a; font-weight: 600; }
        .funding-negative { color: #dc2626; font-weight: 600; }
        .summary { background: #f9fafb; padding: 20px; border-radius: 8px; margin-top: 30px; text-align: center; }
        .summary-item { display: inline-block; margin: 0 20px; }
        .summary-label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
        .summary-value { font-size: 24px; font-weight: 700; margin-top: 5px; }
        .summary-red { color: #dc2626; }
        .summary-yellow { color: #d97706; }
        .summary-green { color: #16a34a; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${hasRed ? '🔴 BÁO ĐỘNG ĐỎ' : hasYellow ? '🟡 BÁO ĐỘNG VÀNG' : '🟢 BÁO ĐỘNG XANH'}</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Binance Futures RSI Scan Alert</p>
        </div>
        <div class="content">
          <div class="scan-time">
            <strong>Thời gian quét:</strong> ${scanTime} (GMT+7)
          </div>

          <div class="summary">
            ${hasRed ? `<div class="summary-item"><div class="summary-label">🔴 Báo động Đỏ</div><div class="summary-value summary-red">${redCoins.length}</div></div>` : ''}
            ${hasYellow ? `<div class="summary-item"><div class="summary-label">🟡 Báo động Vàng</div><div class="summary-value summary-yellow">${yellowCoins.length}</div></div>` : ''}
            ${hasGreen ? `<div class="summary-item"><div class="summary-label">🟢 Báo động Xanh</div><div class="summary-value summary-green">${greenCoins.length}</div></div>` : ''}
          </div>

          ${hasRed ? `
          <div class="alert-section">
            <div class="alert-title">🔴 Báo động Đỏ (RSI 85-100 VÀ Funding Rate ≥ 0.05%)</div>
            <table class="coins-table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th style="text-align: right;">RSI</th>
                  <th style="text-align: right;">Funding Rate</th>
                  <th style="text-align: right;">Giá (USDT)</th>
                </tr>
              </thead>
              <tbody>
                ${redCoins.map(coin => `
                  <tr>
                    <td class="symbol">${coin.symbol}</td>
                    <td style="text-align: right;" class="rsi-high">${coin.rsi.toFixed(2)}</td>
                    <td style="text-align: right;" class="funding-positive">${formatFundingRate(coin.fundingRate)}</td>
                    <td style="text-align: right;">$${formatPrice(coin.price)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ` : ''}

          ${hasYellow ? `
          <div class="alert-section">
            <div class="alert-title">🟡 Báo động Vàng (RSI 75-79 VÀ Funding Rate ≥ 0.05%)</div>
            <table class="coins-table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th style="text-align: right;">RSI</th>
                  <th style="text-align: right;">Funding Rate</th>
                  <th style="text-align: right;">Giá (USDT)</th>
                </tr>
              </thead>
              <tbody>
                ${yellowCoins.map(coin => `
                  <tr>
                    <td class="symbol">${coin.symbol}</td>
                    <td style="text-align: right;" class="rsi-medium">${coin.rsi.toFixed(2)}</td>
                    <td style="text-align: right;" class="funding-positive">${formatFundingRate(coin.fundingRate)}</td>
                    <td style="text-align: right;">$${formatPrice(coin.price)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ` : ''}

          ${hasGreen ? `
          <div class="alert-section">
            <div class="alert-title">🟢 Báo động Xanh (RSI ≥ 70 VÀ Funding Rate ≥ 0.05%)</div>
            <table class="coins-table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th style="text-align: right;">RSI</th>
                  <th style="text-align: right;">Funding Rate</th>
                  <th style="text-align: right;">Giá (USDT)</th>
                </tr>
              </thead>
              <tbody>
                ${greenCoins.map(coin => `
                  <tr>
                    <td class="symbol">${coin.symbol}</td>
                    <td style="text-align: right;">${coin.rsi.toFixed(2)}</td>
                    <td style="text-align: right;" class="funding-positive">${formatFundingRate(coin.fundingRate)}</td>
                    <td style="text-align: right;">$${formatPrice(coin.price)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ` : ''}

        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({ to: adminEmail, subject, html });
}

