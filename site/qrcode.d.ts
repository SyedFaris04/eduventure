// Only the call the QR test uses (the qrcode package ships no types).
declare module 'qrcode' {
  const QRCode: { toString(text: string, options: { type: 'svg'; margin?: number; color?: { dark?: string; light?: string } }): Promise<string> }
  export default QRCode
}
