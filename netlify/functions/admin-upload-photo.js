const crypto = require("crypto");

const COOKIE_NAME = "mboa_admin_session";

const GITHUB_OWNER = "arthur-ambadiang05";
const GITHUB_REPO = "mboa-auto-site";
const GITHUB_BRANCH = "main";

function parseCookies(cookieHeader = "") {
  return cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .filter(Boolean)
    .reduce((acc, cookie) => {
      const index = cookie.indexOf("=");
      if (index === -1) return acc;

      acc[cookie.slice(0, index)] = cookie.slice(index + 1);
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

  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return false;
  }

  const expirationTime = Number(expires);

  return (
    Number.isFinite(expirationTime) &&
    expirationTime > Math.floor(Date.now() / 1000)
  );
}

function jsonResponse(statusCode, data) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  };
}

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, {
      error: "Méthode non autorisée"
    });
  }

  const sessionSecret = process.env.MBOA_ADMIN_SESSION_SECRET;
  const githubToken = process.env.MBOA_GITHUB_TOKEN;

  if (!sessionSecret || !githubToken) {
    return jsonResponse(500, {
      error: "Configuration serveur incomplète"
    });
  }

  const cookies = parseCookies(event.headers.cookie || "");
  const session = cookies[COOKIE_NAME];

  if (!verifySession(session, sessionSecret)) {
    return jsonResponse(401, {
      error: "Session administrateur invalide"
    });
  }

  try {
    const body = JSON.parse(event.body || "{}");

    const slug = String(body.slug || "").trim();
    const filename = String(body.filename || "").trim();
    const content = String(body.content || "").trim();

    if (!slug || !filename || !content) {
      return jsonResponse(400, {
        error: "Données image incomplètes"
      });
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      return jsonResponse(400, {
        error: "Identifiant véhicule invalide"
      });
    }

    if (!/^[a-zA-Z0-9._-]+\.(jpg|jpeg|png|webp)$/i.test(filename)) {
      return jsonResponse(400, {
        error: "Nom de fichier image invalide"
      });
    }

    const cleanBase64 = content.replace(
      /^data:image\/[a-zA-Z0-9.+-]+;base64,/,
      ""
    );

    const filePath = `assets/vehicles/${slug}/${filename}`;

    const apiUrl =
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}` +
      `/contents/${filePath}`;

    const headers = {
      Authorization: `Bearer ${githubToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "Mboa-Auto-Admin",
      "Content-Type": "application/json"
    };

   let existingSha = null;

// Vérifie si la photo existe déjà sur GitHub
const existingResponse = await fetch(apiUrl, {
  method: "GET",
  headers
});

if (existingResponse.ok) {
  const existingFile = await existingResponse.json();
  existingSha = existingFile.sha;
} else if (existingResponse.status !== 404) {
  const errorText = await existingResponse.text();
  console.error("GitHub check error:", errorText);

  return jsonResponse(502, {
    error: "Impossible de vérifier l'image existante"
  });
}

const githubBody = {
  message: `Ajout photo véhicule : ${slug}/${filename}`,
  content: cleanBase64,
  branch: GITHUB_BRANCH
};

// Si la photo existe déjà, GitHub exige son SHA pour la remplacer
if (existingSha) {
  githubBody.sha = existingSha;
}

const response = await fetch(apiUrl, {
  method: "PUT",
  headers,
  body: JSON.stringify(githubBody)
});    if (!response.ok) {
      const errorText = await response.text();
      console.error("GitHub upload error:", errorText);

      return jsonResponse(502, {
        error: "GitHub a refusé l'envoi de l'image"
      });
    }

    return jsonResponse(200, {
      success: true,
      path: `/${filePath}`
    });

  } catch (error) {
    console.error("admin-upload-photo error:", error);

    return jsonResponse(500, {
      error: "Erreur pendant l'envoi de l'image"
    });
  }
};