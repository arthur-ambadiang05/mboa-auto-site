const crypto = require("crypto");

const COOKIE_NAME = "mboa_admin_session";
const SESSION_DURATION = 8 * 60 * 60; // 8 heures

function safeEqual(a, b) {
  const aBuffer = Buffer.from(String(a));
  const bBuffer = Buffer.from(String(b));

  if (aBuffer.length !== bBuffer.length) return false;

  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

function createSession(secret) {
  const expires = Math.floor(Date.now() / 1000) + SESSION_DURATION;
  const payload = String(expires);

  const signature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  return `${payload}.${signature}`;
}

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Méthode non autorisée" }),
    };
  }

  const adminPassword = process.env.MBOA_ADMIN_PASSWORD;
  const sessionSecret = process.env.MBOA_ADMIN_SESSION_SECRET;

  if (!adminPassword || !sessionSecret) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Configuration serveur incomplète" }),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const password = body.password || "";

    if (!safeEqual(password, adminPassword)) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Mot de passe incorrect" }),
      };
    }

    const session = createSession(sessionSecret);

    return {
      statusCode: 200,
      headers: {
        "Set-Cookie": `${COOKIE_NAME}=${session}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_DURATION}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        success: true,
        message: "Connexion réussie",
      }),
    };
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Requête invalide" }),
    };
  }
};