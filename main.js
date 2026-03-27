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

const FORCE_JOIN_LINK = 'https://t.me/newcodingx'  // link grup lo
const FORCE_JOIN_ID = '-1003760324887'


const ADMIN_ID = 85725572590
const startTime = Date.now()
const users = new Set()

function formatUptime(ms) {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${hours} jam ${minutes} menit ${seconds} detik`
}


bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id
  const userId = msg.from.id
  const name = msg.from.first_name || 'Pengguna'
  const username = msg.from.username ? '@' + msg.from.username : 'Tidak tersedia'
  
  users.add(userId)

  const isAdmin = userId === ADMIN_ID
  const status = isAdmin ? 'Admin' : 'User'

  const photo = path.join(__dirname, 'image', 'logo.png')

  let text = `Halo ${name}👋,
Selamat datang di Video Downloader Bot.

Bot ini dapat membantu Anda mengunduh video dari berbagai platform seperti TikTok, YouTube, Snack Video, dan Facebook dengan mudah dan cepat.`

  if (isAdmin) {
    const uptime = formatUptime(Date.now() - startTime)
    const totalUsers = users.size

    text += `

Informasi Admin:
Status Bot: Aktif
Uptime: ${uptime}
Total Pengguna: ${totalUsers}`
  }

  bot.sendPhoto(chatId, photo, {
    caption: text,
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: 'Lihat Fitur',
            callback_data: 'fitur'
          }
        ],
        [
          {
            text: 'Donasi',
            url: 'https://saweria.co/zackrylsen'
          },
          {
            text: 'Developer',
            url: 'https://t.me/zackrylsen'
          }
        ]
      ]
    }
  })
})

bot.on('callback_query', (query) => {
  const chatId = query.message.chat.id
  const messageId = query.message.message_id

  if (query.data === 'fitur') {
    const text = `Daftar Fitur Bot:

1. *Unduh video TikTok*
   Perintah: /tt link

2. *Unduh video YouTube*
   Perintah: /yt link

3. *Unduh video Snack Video*
   Perintah: /snack link

4. *Unduh video Facebook*
   Perintah: /fb link
   
5. *Unduh video Capcut*
   Perintah: /capcut link

Gunakan perintah sesuai dengan platform yang diinginkan.`

    bot.editMessageCaption(text, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: 'Kembali',
              callback_data: 'kembali'
            }
          ]
        ]
      }
    })
  }

  if (query.data === 'kembali') {
    const user = query.from
    const userId = user.id
    const name = user.first_name || 'Pengguna'
    const username = user.username ? '@' + user.username : 'Tidak tersedia'
    const isAdmin = userId === ADMIN_ID
    const status = isAdmin ? 'Admin' : 'User'

    let text = `Halo ${name}👋,
Selamat datang di Video Downloader Bot.`

    if (isAdmin) {
      const uptime = formatUptime(Date.now() - startTime)
      const totalUsers = users.size

      text += `

Informasi Bot:
Status Bot: Aktif
Uptime: ${uptime}
Total Pengguna: ${totalUsers}`
    }

    bot.editMessageCaption(text, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: 'Lihat Fitur',
              callback_data: 'fitur'
            }
          ],
          [
            {
              text: 'Donasi',
              url: 'https://saweria.co/zackrylsen'
            },
            {
              text: 'Developer',
              url: 'https://t.me/zackrylsen'
            }
          ]
        ]
      }
    })
  }

  bot.answerCallbackQuery(query.id)
})

bot.onText(/\/snack (.+)/, async (msg, match) => {
  const chatId = msg.chat.id
  const query = match[1]

  if (!query.includes('snackvideo.com') && !query.includes('s.snackvideo.com')) {
    return bot.sendMessage(chatId, 'Link SnackVideo tidak valid')
  }

  const loadingMsg = await bot.sendMessage(chatId, 'Memproses...')

  try {
    const url = encodeURIComponent(query)

    const { data } = await axios.get(
      `https://api.siputzx.my.id/api/d/snackvideo?url=${url}`
    )

    if (!data || data.status === false) {
      return bot.editMessageText('Gagal mengambil video', {
        chat_id: chatId,
        message_id: loadingMsg.message_id
      })
    }

    const result = data.data

    if (!result.videoUrl) {
      return bot.editMessageText('Video tidak ditemukan', {
        chat_id: chatId,
        message_id: loadingMsg.message_id
      })
    }

    const videoUrl = result.videoUrl

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

    await bot.editMessageText('Mengirim video...', {
      chat_id: chatId,
      message_id: loadingMsg.message_id
    })

    await bot.sendVideo(chatId, filePath, {
      caption: `*Selesai*`,
      parse_mode: 'Markdown'
    })

    // hapus file setelah dikirim
    fs.unlink(filePath, () => {})

    await bot.editMessageText('Selesai ✅', {
      chat_id: chatId,
      message_id: loadingMsg.message_id
    })

  } catch (err) {
    console.log(err)

    bot.editMessageText('Fitur ini error, harap laporkan kepada developer', {
      chat_id: chatId,
      message_id: loadingMsg.message_id
    }).catch(() => {})
  }
})

bot.onText(/\/fb (.+)/, async (msg, match) => {
  const chatId = msg.chat.id
  const query = match[1]

  if (!query.includes('facebook.com') && !query.includes('fb.watch')) {
    return bot.sendMessage(chatId, 'Link Facebook tidak valid')
  }

  const loadingMsg = await bot.sendMessage(chatId, 'Memproses...')

  try {
    const url = encodeURIComponent(query)

    const { data } = await axios.get(
      `https://api.siputzx.my.id/api/d/facebook?url=${url}`
    )

    if (!data || data.status === false) {
      return bot.editMessageText('Gagal mengambil video', {
        chat_id: chatId,
        message_id: loadingMsg.message_id
      })
    }

    const result = data.data

    // Ambil kualitas terbaik (HD kalau ada)
    let videoData =
      result.downloads.find(v => v.quality.includes('720')) ||
      result.downloads[0]

    if (!videoData || !videoData.url) {
      return bot.editMessageText('Video tidak ditemukan', {
        chat_id: chatId,
        message_id: loadingMsg.message_id
      })
    }

    const videoUrl = videoData.url

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

    await bot.editMessageText('Mengirim video...', {
      chat_id: chatId,
      message_id: loadingMsg.message_id
    })

    await bot.sendVideo(chatId, filePath, {
      caption: `*Selesai*`,
      parse_mode: 'Markdown'
    })

    // Hapus file setelah dikirim
    fs.unlink(filePath, () => {})

    await bot.editMessageText('Selesai', {
      chat_id: chatId,
      message_id: loadingMsg.message_id
    })

  } catch (err) {
    console.log(err)

    bot.editMessageText('Fitur ini error, harap laporkan kepada developer', {
      chat_id: chatId,
      message_id: loadingMsg.message_id
    }).catch(() => {})
  }
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
      caption: '*Selesai*'
    })

    fs.unlink(filePath, () => {})

    await bot.editMessageText('Selesai', {
      chat_id: chatId,
      message_id: loadingMsg.message_id
    })

  } catch (err) {
    console.log(err)

    bot.editMessageText('Fitur ini error, harap laporkan kepada developer', {
      chat_id: chatId,
      message_id: loadingMsg.message_id
    }).catch(() => {})
  }
})

bot.onText(/\/capcut (.+)/, async (msg, match) => {
  const chatId = msg.chat.id
  const query = match[1]
  const loadingMsg = await bot.sendMessage(chatId, 'Memproses...')

  try {
    const url = encodeURIComponent(query)

    const { data } = await axios.get(
      `https://api.siputzx.my.id/api/d/capcut?url=${url}`
    )

    if (!data || data.status === false) {
      return bot.editMessageText('Gagal mengambil video', {
        chat_id: chatId,
        message_id: loadingMsg.message_id
      })
    }

    const result = data.data

    if (!result.originalVideoUrl) {
      return bot.editMessageText('Video tidak ditemukan', {
        chat_id: chatId,
        message_id: loadingMsg.message_id
      })
    }

    const videoUrl = result.originalVideoUrl

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

    await bot.editMessageText('Mengirim video...', {
      chat_id: chatId,
      message_id: loadingMsg.message_id
    })

    await bot.sendVideo(chatId, filePath, {
      caption: `*Sukses*`,
      parse_mode: 'Markdown'
    })

    // hapus file setelah dikirim
    fs.unlink(filePath, () => {})

    await bot.editMessageText('Selesai ✅', {
      chat_id: chatId,
      message_id: loadingMsg.message_id
    })

  } catch (err) {
    console.log(err)

    bot.editMessageText('Terjadi kesalahan saat download', {
      chat_id: chatId,
      message_id: loadingMsg.message_id
    }).catch(() => {})
  }
})

bot.on('message', async (msg) => {
  const chatId = msg.chat.id
  const userId = msg.from.id
  const text = msg.text
  if (!text || text.startsWith('/')) return
  try {
    if (text.includes('tiktok.com')) {
      return bot.emit('text', {
        ...msg,
        text: `/tt ${text}`
      })
    }
    if (text.includes('facebook.com') || text.includes('fb.watch')) {
      return bot.emit('text', {
        ...msg,
        text: `/fb ${text}`
      })
    }
    if (text.includes('snackvideo.com')) {
      return bot.emit('text', {
        ...msg,
        text: `/snack ${text}`
      })
    }
    if (text.includes('capcut.com')) {
      return bot.emit('text', {
        ...msg,
        text: `/capcut ${text}`
      })
    }
    if (text.includes('youtube.com') || text.includes('youtu.be')) {
      return bot.emit('text', {
        ...msg,
        text: `/yt ${text}`
      })
    }

  } catch (err) {
    console.log(err)
    bot.sendMessage(chatId, 'Error')
  }
})

console.log('Bot Berhasil Berjalan')
