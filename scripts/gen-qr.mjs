// Writes site/public/apk-qr.svg: a QR code for the newest Android app (the URL never changes, so run it once).
import { writeFileSync } from 'node:fs'
import QRCode from 'qrcode'

const APK_URL = 'https://github.com/SyedFaris04/eduventure/releases/latest/download/eduventure.apk'
const svg = await QRCode.toString(APK_URL, { type: 'svg', margin: 1, color: { dark: '#3b2a1e', light: '#ffffff' } })
writeFileSync('site/public/apk-qr.svg', svg)
console.log('site/public/apk-qr.svg written')
