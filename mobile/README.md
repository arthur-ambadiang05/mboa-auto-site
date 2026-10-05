# Mboa Auto — application clients

Première version React Native / Expo SDK 57 pour Android et iOS. Catalogue public de mboaauto.com, recherche, budget et type, favoris locaux, fiches et galerie, appel et brouillon WhatsApp contenant le lien exact de l’annonce. Aucun accès au carnet privé de clients.

## Tester

Node 22.13 ou supérieur. `npm ci`, `npm run typecheck`, `npm run lint`. Aperçu web : `npm run web`. Le déploiement Netlify construit le site existant et cet aperçu à `/application/`. Pour construire cet aperçu localement depuis la racine : `node scripts/build-site.mjs`.

Les favoris et le dernier catalogue sont stockés sur l’appareil. Les photos nécessitent une connexion. Un catalogue hors connexion est identifié comme ancien et la disponibilité doit être confirmée.

## Versions installables

Associer d’abord le projet Expo à un compte appartenant à Mboa Auto (`npx eas-cli@latest login`, puis `npx eas-cli@latest init`). Aucun identifiant EAS ou compte de store n’a encore été configuré.

- Android de test : `npx eas-cli@latest build --platform android --profile preview` (APK).
- Développement natif : profil `development` ; nécessite un development build.
- Android / iOS pour les stores : profil `production`, puis soumission EAS après préparation des comptes développeur, signature, fiche, confidentialité et captures.

Les exports JavaScript valident le code multiplateforme mais ne remplacent pas les tests sur téléphones. Cette version n’est pas publiée sur Google Play ou l’App Store. Vérifier catalogue, cache, favoris après relancement, galerie, appel et brouillon WhatsApp sur chaque plateforme avant soumission.
