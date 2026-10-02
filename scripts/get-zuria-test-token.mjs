import { randomBytes, createHash } from "node:crypto";
import { createServer } from "node:http";
import { exec } from "node:child_process";
import { URL } from "node:url";

const AUTHORIZE_URL = "https://clerk.zuria.maxnovate.com/oauth/authorize";
const TOKEN_URL = "https://clerk.zuria.maxnovate.com/oauth/token";
const CLIENT_ID = "FWR9QKXo0A7uMwyl";
const PORT = 4322;
const REDIRECT_URI = `http://127.0.0.1:${PORT}/callback`;

function b64url(b) {
  return b
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
const codeVerifier = b64url(randomBytes(32));
const codeChallenge = b64url(
  createHash("sha256").update(codeVerifier).digest(),
);
const state = b64url(randomBytes(16));

const authUrl = new URL(AUTHORIZE_URL);
authUrl.searchParams.set("response_type", "code");
authUrl.searchParams.set("client_id", CLIENT_ID);
authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
authUrl.searchParams.set("scope", "openid email profile");
authUrl.searchParams.set("state", state);
authUrl.searchParams.set("code_challenge", codeChallenge);
authUrl.searchParams.set("code_challenge_method", "S256");

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "", REDIRECT_URI);
  const code = url.searchParams.get("code");

  if (!code) {
    res.end("No authorization code received.");
    return;
  }

  res.end("Done — check your terminal.");
  server.close();

  const tokenRes = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      code_verifier: codeVerifier,
    }),
  });

  const tokenData = await tokenRes.json();

  if (!tokenRes.ok) {
    console.error("Token request failed:", tokenData);
    process.exit(1);
  }

  console.log("\n--- ACCESS TOKEN FOR TESTING ---");
  console.log(tokenData.access_token);
  console.log("--------------------------------\n");
});

server.listen(PORT, () => exec(`start "" "${authUrl}"`));
