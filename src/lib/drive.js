// Stores one JSON file per user in the hidden Drive "appDataFolder".
// Only this app can see it; it never shows up in the user's Drive UI.
const FILE_NAME = 'lanes-data.json'
const API = 'https://www.googleapis.com/drive/v3'
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3'

async function call(getToken, url, opts = {}) {
  const run = async (token) =>
    fetch(url, { ...opts, headers: { ...opts.headers, Authorization: `Bearer ${token}` } })
  let res = await run(await getToken())
  if (res.status === 401) res = await run(await getToken(true))
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    let hint = ''
    if (res.status === 403 && /has not been used|disabled/i.test(text)) {
      hint = ' Enable the Google Drive API for your Cloud project (see README).'
    }
    throw new Error(`Google Drive error ${res.status}.${hint}`)
  }
  return res
}

export async function findFile(getToken) {
  const q = encodeURIComponent(`name='${FILE_NAME}' and trashed=false`)
  const res = await call(
    getToken,
    `${API}/files?spaces=appDataFolder&q=${q}&fields=files(id,modifiedTime)&pageSize=1`
  )
  const json = await res.json()
  return json.files?.[0] || null
}

export async function readFile(getToken, id) {
  const res = await call(getToken, `${API}/files/${id}?alt=media`)
  return res.json()
}

export async function createFile(getToken, data) {
  const b = 'lanes_boundary_7f3a'
  const meta = { name: FILE_NAME, parents: ['appDataFolder'], mimeType: 'application/json' }
  const body =
    `--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n` +
    `--${b}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(data)}\r\n--${b}--`
  const res = await call(getToken, `${UPLOAD}/files?uploadType=multipart&fields=id`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${b}` },
    body
  })
  return (await res.json()).id
}

export async function updateFile(getToken, id, data) {
  await call(getToken, `${UPLOAD}/files/${id}?uploadType=media`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
}
