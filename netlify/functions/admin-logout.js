const COOKIE_NAME = "mboa_admin_session";

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({
        error: "Méthode non autorisée"
      })
    };
  }

  return {
    statusCode: 200,
    headers: {
      "Set-Cookie": `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      success: true,
      message: "Déconnexion réussie"
    })
  };
};