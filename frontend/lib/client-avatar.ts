import sharp from 'sharp';
import { AVATAR_BYTES,AVATAR_PIXELS } from './client-profile-policy';
/** Decode before trusting a filename/MIME; strip metadata and save one small raster. */
export async function normalizeAvatar(file:File):Promise<Buffer> {
  if(!file.size || file.size>AVATAR_BYTES) throw new Error('Choose a photo up to 2MB.');
  if(!['image/jpeg','image/png','image/webp','image/avif'].includes(file.type)) throw new Error('Choose a JPEG, PNG, WebP or AVIF photo.');
  const image=sharp(Buffer.from(await file.arrayBuffer()),{animated:true,limitInputPixels:AVATAR_PIXELS});
  const info=await image.metadata();
  if(!['jpeg','png','webp','heif'].includes(info.format??'') || (info.format==='heif'&&info.compression!=='av1') || (info.pages??1)>1 || !info.width || !info.height || info.width*info.height>AVATAR_PIXELS) throw new Error('Use a single still photo. Animated and unsupported images cannot be used.');
  return image.rotate().resize(256,256,{fit:'cover',withoutEnlargement:true}).webp({quality:82}).toBuffer();
}
