const crypto = require("crypto");

const COOKIE_NAME = "mboa_admin_session";

function parseCookies(cookieHeader = "") {
  return cookieHeader
    .split(";")
    .map(cookie => cookie.trim())
    .filter(Boolean)
    .reduce((acc, cookie) => {
      const index = cookie.indexOf("=");
      if (index === -1) return acc;

      const key = cookie.slice(0, index);
      const value = cookie.slice(index + 1);

      acc[key] = value;
      return acc;
    }, {});
}

function verifySession(session, secret) {
  if (!session || !secret) return false;

  const parts = session.split(".");
  if (parts.length !== 2) return false;

  const [expires, signature] = parts;

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(expires)
    .digest("hex");

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }

  const validSignature = crypto.timingSafeEqual(
    signatureBuffer,
    expectedBuffer
  );

  if (!validSignature) return false;

  const expirationTime = Number(expires);

  if (!Number.isFinite(expirationTime)) return false;

  return expirationTime > Math.floor(Date.now() / 1000);
}

exports.handler = async function (event) {
  const sessionSecret = process.env.MBOA_ADMIN_SESSION_SECRET;

  if (!sessionSecret) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Configuration serveur incomplète"
      })
    };
  }

  const cookies = parseCookies(event.headers.cookie || "");
  const session = cookies[COOKIE_NAME];

  if (!verifySession(session, sessionSecret)) {
    return {
      statusCode: 401,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        authenticated: false
      })
    };
  }

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      authenticated: true
    })
  };
};