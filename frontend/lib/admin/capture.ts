const CAPTURE_HEADER = "x-boneyard-capture";

export function isAdminCapture(requestHeaders: Pick<Headers, "get">) {
  const token = process.env.BONEYARD_CAPTURE_TOKEN;
  return (
    process.env.NODE_ENV !== "production" &&
    Boolean(token) &&
    requestHeaders.get(CAPTURE_HEADER) === token
  );
}
