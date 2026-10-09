const crypto = require("crypto");

const COOKIE_NAME = "mboa_admin_session";

const GITHUB_OWNER = "arthur-ambadiang05";
const GITHUB_REPO = "mboa-auto-site";
const GITHUB_BRANCH = "main";
const VEHICLES_FILE = "data/vehicules.json";

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
    const vehicle = JSON.parse(event.body || "{}");

    const requiredFields = [
      "slug",
      "brand",
      "name",
      "year",
      "type",
      "fuel",
      "price",
      "price_display",
      "location",
      "specs",
      "description",
      "cover",
      "photos",
      "status"
    ];

    for (const field of requiredFields) {
      if (
        vehicle[field] === undefined ||
        vehicle[field] === null ||
        vehicle[field] === ""
      ) {
        return jsonResponse(400, {
          error: `Champ obligatoire manquant : ${field}`
        });
      }
    }

    if (!/^[a-z0-9-]+$/.test(vehicle.slug)) {
      return jsonResponse(400, {
        error: "Identifiant du véhicule invalide"
      });
    }

    const apiUrl =
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}` +
      `/contents/${VEHICLES_FILE}?ref=${GITHUB_BRANCH}`;

    const headers = {
      Authorization: `Bearer ${githubToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "Mboa-Auto-Admin"
    };

    const currentFileResponse = await fetch(apiUrl, {
      headers
    });

    if (!currentFileResponse.ok) {
      const errorText = await currentFileResponse.text();

      console.error("GitHub GET error:", errorText);

      return jsonResponse(502, {
        error: "Impossible de lire la liste des véhicules"
      });
    }

    const currentFile = await currentFileResponse.json();

    const decodedContent = Buffer
      .from(currentFile.content, "base64")
      .toString("utf8");

    const vehicles = JSON.parse(decodedContent);

    if (!Array.isArray(vehicles)) {
      return jsonResponse(500, {
        error: "Format de vehicules.json invalide"
      });
    }

    if (vehicles.some((item) => item.slug === vehicle.slug)) {
      return jsonResponse(409, {
        error: "Cette annonce existe déjà. Rechargez le formulaire pour publier un autre véhicule du même modèle."
      });
    }

    // Only new listings enter the Google queue; existing stock is never reposted.
    // This flag is owned by the server, not by submitted form fields.
    vehicle.google_sync_requested = true;
    vehicles.push(vehicle);

    const newContent = Buffer
      .from(JSON.stringify(vehicles, null, 2) + "\n", "utf8")
      .toString("base64");

    const updateResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}` +
      `/contents/${VEHICLES_FILE}`,
      {
        method: "PUT",
        headers: {
          ...headers,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: `Ajout véhicule : ${vehicle.name}`,
          content: newContent,
          sha: currentFile.sha,
          branch: GITHUB_BRANCH
        })
      }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();

      console.error("GitHub PUT error:", errorText);

      return jsonResponse(502, {
        error: "GitHub a refusé la mise à jour du véhicule"
      });
    }

    const result = await updateResponse.json();

    return jsonResponse(200, {
      success: true,
      message: "Véhicule ajouté avec succès",
      slug: vehicle.slug,
      google_sync_requested: true,
      commit: result.commit?.sha || null
    });

  } catch (error) {
    console.error("admin-add-vehicle error:", error);

    return jsonResponse(500, {
      error: "Erreur pendant l'ajout du véhicule"
    });
  }
};
