import { get } from '@vercel/edge-config'

export const config = {
  runtime: 'edge',
}

export default async function handler() {
  const previewUrl = await get('previewUrl')
  if (!previewUrl) {
    return new Response('预览地址未配置', { status: 404 })
  }
  return Response.redirect(previewUrl, 302)
}
