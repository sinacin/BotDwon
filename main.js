const TelegramBot = require('node-telegram-bot-api')
const axios = require('axios')
const fs = require('fs')
const path = require('path')

const token = '8611628194:AAGLN9xNIqVnpSY_fS6z8WR9HgqiouM6QtY'
const bot = new TelegramBot(token, { polling: true })

const videoDir = path.join(__dirname, 'video')

if (!fs.existsSync(videoDir)) {
  fs.mkdirSync(videoDir)
}

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id
  const name = msg.from.first_name || 'Pengguna'

  const photo = path.join(__dirname, 'image', 'logo.png')

  const text = `Halo ${name},

Selamat datang di Video Downloader Bot.

Bot ini dapat membantu Anda mengunduh video TikTok tanpa watermark dengan cepat dan mudah.

Perintah yang tersedia:
/tt link_tiktok

Contoh:
/tt https://vt.tiktok.com/xxxx

Bot ini dibuat dengan sepenuh hati oleh Bang Zack.
Dukungan Anda sangat berarti agar bot ini terus berkembang.`

  bot.sendPhoto(chatId, photo, {
    caption: text,
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: 'Donasi',
            url: 'https://saweria.co/zackrylsen'
          }
        ],
        [
          {
            text: 'Chat Developer',
            url: 'https://t.me/zackrylsen'
          }
        ]
      ]
    }
  })
})

bot.onText(/\/tt (.+)/, async (msg, match) => {
  const chatId = msg.chat.id
  const query = match[1]

  if (!query.includes('tiktok.com')) {
    return bot.sendMessage(chatId, 'Link tidak valid')
  }

  const loadingMsg = await bot.sendMessage(chatId, 'Memproses')

  try {
    const url = encodeURIComponent(query)

    const { data } = await axios.get(
      `https://api.siputzx.my.id/api/d/tiktok/v2?url=${url}`
    )

    if (!data || data.status === false) {
      return bot.editMessageText('Gagal mengambil video', {
        chat_id: chatId,
        message_id: loadingMsg.message_id
      })
    }

    const result = data.data

    const videoUrl =
      result.no_watermark_link_hd ||
      result.no_watermark_link ||
      result.watermark_link

    if (!videoUrl) {
      return bot.editMessageText('Video tidak ditemukan', {
        chat_id: chatId,
        message_id: loadingMsg.message_id
      })
    }

    const fileName = `${chatId}_${Date.now()}.mp4`
    const filePath = path.join(videoDir, fileName)

    const response = await axios({
      url: videoUrl,
      method: 'GET',
      responseType: 'stream'
    })

    const totalLength = response.headers['content-length']
    let downloaded = 0
    let lastPercent = 0

    const writer = fs.createWriteStream(filePath)

    response.data.on('data', (chunk) => {
      downloaded += chunk.length

      if (totalLength) {
        const percent = Math.floor((downloaded / totalLength) * 100)

        if (percent !== lastPercent && percent % 10 === 0) {
          lastPercent = percent

          bot.editMessageText(`Downloading ${percent}%`, {
            chat_id: chatId,
            message_id: loadingMsg.message_id
          }).catch(() => {})
        }
      }
    })

    response.data.pipe(writer)

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve)
      writer.on('error', reject)
    })

    await bot.editMessageText('Mengirim video', {
      chat_id: chatId,
      message_id: loadingMsg.message_id
    })

    await bot.sendVideo(chatId, filePath, {
      caption: 'Selesai'
    })

    fs.unlink(filePath, () => {})

    await bot.editMessageText('Selesai', {
      chat_id: chatId,
      message_id: loadingMsg.message_id
    })

  } catch (err) {
    console.log(err)

    bot.editMessageText('Terjadi kesalahan', {
      chat_id: chatId,
      message_id: loadingMsg.message_id
    }).catch(() => {})
  }
})