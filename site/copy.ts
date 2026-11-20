// Every word on the website, in English and Malay. Keep both in step (site/copy.test.ts checks).
export type Lang = 'en' | 'ms'

const en = {
  meta: { title: 'Eduventure: learn by playing', description: 'Explore islands, answer questions in battles and grow your knowledge pet. Free on Android and in your browser.' },
  nav: { play: 'Play now', playShort: 'Play', switchTo: 'Bahasa Melayu', download: 'Download' },
  hero: {
    tagline: 'Learn. Explore. Grow. Conquer.',
    lead: 'An adventure game where every question you answer makes you stronger. Made in Malaysia for primary school to university.',
    download: 'Download for Android',
    play: 'Play in your browser',
    drag: 'Drag to spin the island',
    free: 'Free to play. No ads.',
  },
  how: {
    title: 'How it works',
    tap: 'Tap a card',
    cards: {
      explore: { title: 'Explore islands', front: 'Five islands to discover', back: 'Walk through a kampung, a Borneo rainforest, number mountains, a robot city and a castle of letters. Harvest wood and stone, and build the camp with other players.' },
      battle: { title: 'Battle with questions', front: 'Answer to win', back: 'Monsters are beaten by right answers, not button mashing. Get one wrong and the game shows you why, then brings that topic back later so it sticks.' },
      pet: { title: 'Grow your pet', front: 'Learning makes it grow', back: 'Your knowledge pet hatches, grows and takes a form from the subject you study most. It never gets sick or sad when you take a break.' },
    },
  },
  quiz: {
    title: 'Try a question',
    lead: 'This is how battles work. Beat the Sproutling!',
    right: 'Right! The Sproutling takes a hit.',
    wrong: 'Not quite.',
    why: 'Why',
    next: 'Next question',
    done: 'You beat the Sproutling!',
    cta: 'Play the real thing',
    again: 'Try again',
    health: 'Sproutling health',
  },
  pet: {
    title: 'Meet your knowledge pet',
    lead: 'Every right answer helps it grow. Tap to see how it changes.',
    evolve: 'Evolve',
    reset: 'Start again',
    stages: { egg: 'Egg', baby: 'Baby', young: 'Young', adult: 'Adult' },
  },
  islands: {
    title: 'The islands',
    list: {
      greenhaven: { name: 'Greenhaven Kampung', line: 'A cosy kampung by the sea where every journey begins.' },
      science: { name: 'Science Island', line: 'Hutan Borneo: rainforest, mangroves and curious creatures.' },
      maths: { name: 'Mathematics Mountains', line: 'Climb peaks of numbers, patterns and puzzles.' },
      tech: { name: 'Technology City', line: 'Friendly robots and the Code Academy for Python and JavaScript.' },
      language: { name: 'Language Kingdom', line: 'A castle of letters with lessons in English and Bahasa Melayu.' },
    },
  },
  safety: {
    title: 'Safe for children',
    lead: 'Built for students, with parents in charge.',
    points: {
      parents: 'Players under 18 link a parent, who approves their account, can set a daily play limit and decides about camp boards and being seen by others.',
      chat: 'Under-13s talk with stickers and ready-made phrases only, and never see typed messages from strangers.',
      boards: 'Camp boards filter bad words, phone numbers and links. Anything can be reported to a moderator.',
      fair: 'No ads, no loot boxes and nothing to buy with real money.',
    },
  },
  download: {
    title: 'Get the Android app',
    lead: 'Download the app file and install it in four steps.',
    button: 'Download Eduventure (APK)',
    steps: {
      one: 'Tap the download button.',
      two: 'Open the downloaded file eduventure.apk.',
      three: 'The first time only, allow your browser to install apps.',
      four: 'Tap Install, then Open. Have fun!',
    },
    qr: 'On a laptop? Scan this with your phone to download.',
    qrAlt: 'QR code that downloads the Eduventure app',
    iphone: 'On an iPhone or iPad? Play in your browser: it is the same game.',
    updates: 'The app always opens the newest game, so you rarely need to download it again.',
  },
  footer: { made: 'Made with care in Malaysia.', play: 'Play in your browser', download: 'Download for Android' },
}

type Copy = typeof en

const ms: Copy = {
  meta: { title: 'Eduventure: belajar sambil bermain', description: 'Jelajah pulau, jawab soalan dalam pertarungan dan besarkan haiwan ilmu anda. Percuma di Android dan pelayar.' },
  nav: { play: 'Main sekarang', playShort: 'Main', switchTo: 'English', download: 'Muat turun' },
  hero: {
    tagline: 'Belajar. Jelajah. Membesar. Menakluk.',
    lead: 'Permainan pengembaraan di mana setiap soalan yang anda jawab menjadikan anda lebih kuat. Buatan Malaysia untuk sekolah rendah hingga universiti.',
    download: 'Muat turun untuk Android',
    play: 'Main di pelayar',
    drag: 'Seret untuk memusing pulau',
    free: 'Percuma. Tiada iklan.',
  },
  how: {
    title: 'Cara bermain',
    tap: 'Ketik kad',
    cards: {
      explore: { title: 'Jelajah pulau', front: 'Lima pulau untuk diterokai', back: 'Berjalan melalui kampung, hutan hujan Borneo, gunung nombor, bandar robot dan istana huruf. Kumpul kayu dan batu, dan bina kem bersama pemain lain.' },
      battle: { title: 'Bertarung dengan soalan', front: 'Jawab untuk menang', back: 'Raksasa dikalahkan dengan jawapan yang betul, bukan dengan menekan butang. Jika salah, permainan menerangkan sebabnya dan mengulang topik itu kemudian supaya anda ingat.' },
      pet: { title: 'Besarkan haiwan anda', front: 'Belajar membuatnya membesar', back: 'Haiwan ilmu anda menetas, membesar dan mengambil bentuk daripada subjek yang paling banyak anda pelajari. Ia tidak pernah sakit atau sedih apabila anda berehat.' },
    },
  },
  quiz: {
    title: 'Cuba satu soalan',
    lead: 'Beginilah pertarungan berjalan. Kalahkan Sproutling!',
    right: 'Betul! Sproutling terkena serangan.',
    wrong: 'Belum tepat.',
    why: 'Sebab',
    next: 'Soalan seterusnya',
    done: 'Anda mengalahkan Sproutling!',
    cta: 'Main permainan sebenar',
    again: 'Cuba lagi',
    health: 'Nyawa Sproutling',
  },
  pet: {
    title: 'Kenali haiwan ilmu anda',
    lead: 'Setiap jawapan betul membantunya membesar. Ketik untuk melihat perubahannya.',
    evolve: 'Berevolusi',
    reset: 'Mula semula',
    stages: { egg: 'Telur', baby: 'Bayi', young: 'Muda', adult: 'Dewasa' },
  },
  islands: {
    title: 'Pulau-pulau',
    list: {
      greenhaven: { name: 'Kampung Greenhaven', line: 'Kampung yang selesa di tepi laut, tempat setiap pengembaraan bermula.' },
      science: { name: 'Pulau Sains', line: 'Hutan Borneo: hutan hujan, bakau dan makhluk yang ingin tahu.' },
      maths: { name: 'Pergunungan Matematik', line: 'Daki puncak nombor, corak dan teka-teki.' },
      tech: { name: 'Bandar Teknologi', line: 'Robot yang mesra dan Akademi Kod untuk Python dan JavaScript.' },
      language: { name: 'Kerajaan Bahasa', line: 'Istana huruf dengan pelajaran bahasa Inggeris dan Bahasa Melayu.' },
    },
  },
  safety: {
    title: 'Selamat untuk kanak-kanak',
    lead: 'Dibina untuk pelajar, dengan ibu bapa sebagai pengawal.',
    points: {
      parents: 'Pemain bawah 18 tahun memautkan ibu bapa, yang meluluskan akaun mereka, boleh menetapkan had masa bermain harian dan menentukan papan kem serta sama ada mereka dilihat pemain lain.',
      chat: 'Pemain bawah 13 tahun berbual dengan pelekat dan frasa sedia ada sahaja, dan tidak melihat mesej bertaip daripada orang asing.',
      boards: 'Papan kem menapis kata kesat, nombor telefon dan pautan. Apa-apa sahaja boleh dilaporkan kepada moderator.',
      fair: 'Tiada iklan, tiada kotak rawak dan tiada apa-apa untuk dibeli dengan wang sebenar.',
    },
  },
  download: {
    title: 'Dapatkan aplikasi Android',
    lead: 'Muat turun fail aplikasi dan pasang dalam empat langkah.',
    button: 'Muat turun Eduventure (APK)',
    steps: {
      one: 'Ketik butang muat turun.',
      two: 'Buka fail eduventure.apk yang dimuat turun.',
      three: 'Kali pertama sahaja, benarkan pelayar anda memasang aplikasi.',
      four: 'Ketik Pasang, kemudian Buka. Selamat bermain!',
    },
    qr: 'Guna komputer riba? Imbas ini dengan telefon anda untuk memuat turun.',
    qrAlt: 'Kod QR untuk memuat turun aplikasi Eduventure',
    iphone: 'Guna iPhone atau iPad? Main di pelayar: permainannya sama.',
    updates: 'Aplikasi sentiasa membuka permainan terbaharu, jadi anda jarang perlu memuat turun semula.',
  },
  footer: { made: 'Dibuat dengan teliti di Malaysia.', play: 'Main di pelayar', download: 'Muat turun untuk Android' },
}

export const COPY: Record<Lang, Copy> = { en, ms }
