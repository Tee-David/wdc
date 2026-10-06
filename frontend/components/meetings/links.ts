/** Client-safe URL validation. Provider links still cross a trust boundary. */
export function safeJoinUrl(value: unknown) {
  if(typeof value!=="string")return null;
  try{const url=new URL(value);return url.protocol==="https:"&&!url.username&&!url.password?url.href:null}catch{return null}
}
