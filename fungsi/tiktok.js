const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args))

async function tiktok(query) {
  try {
    const url = encodeURIComponent(query)
    const response = await fetch(`https://api.siputzx.my.id/api/tiktok?url=${url}`)
    const data = await response.json()
    return data
  } catch (error) {
    console.error(error)
    return { status: false }
  }
}

module.exports = { tiktok }