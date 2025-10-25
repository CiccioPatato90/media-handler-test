// need to simulate my user and fetch it from keycloak
const { importJWK, jwtVerify, decodeProtectedHeader } = require("jose");

const body = {
  client_id: "nautilus-client",
  username: "fpacenapoleone@gmail.com",
  password: "admin",
  grant_type: "password",
};

const config = {
  auth_url: "http://100.117.121.64:8080",
  auth_realm: "quarkus",
};

async function verifyToken(token) {
  if (!token) throw new Error("No token provided");

  const header = decodeProtectedHeader(token);

  if (!this.cachedKey || this.cachedKid !== header.kid) {
    const res = await fetch(
      `${config.auth_url}/realms/${config.auth_realm}/protocol/openid-connect/certs`
    );
    let { keys } = await res.json();

    const jwk = keys.find((k) => k.kid === header.kid);
    if (!jwk) throw new Error("Key not found in JWKS");

    this.cachedKey = await importJWK(jwk, jwk.alg);
    this.cachedKid = jwk.kid;
  }

  const { payload } = await jwtVerify(token, this.cachedKey, {
    issuer: `${config.auth_url}/realms/${config.auth_realm}`,
  });

  return payload;
}

// retrieves token from kc, next this function will parse the token from
// http request and verify it with keycloak publickey
async function getToken() {
  const formData = new URLSearchParams();
  Object.entries(body).forEach(([key, value]) => {
    formData.append(key, value);
  });

  const res = await fetch(
    `${config.auth_url}/realms/${config.auth_realm}/protocol/openid-connect/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    }
  );

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: Authentication failed`);
  }

  const data = await res.json();
  return data.access_token;
}

const accessModes = {
  read: "read",
  write: "write",
  delete: "delete",
};

/**
 * @param {Object{
 *  id: string, // the id path of the resource (ex: request/project/req_123/updates/update_123/images/original)
 *  bucket: string, // the bucket of the resource
 *  args: Object, // the arguments of id path (ex: { projectRequestId: "req_123", projectUpdateId: "update_123" })
 *  rbac: Object, // the rbac constraints for the op (ex: { user: "read", associationAdmin: "write", admin: "write" })
 *  operation: string, // reference to the op name (ex: "requestProjectUpdateImages")
 * }} directions
 */
async function mainRBAC(directions, accessModeToCheck) {
  // this token can be created like this or received as input from function/external service
  const token = await getToken();
  // validate the token
  const payload = await verifyToken(token);
  if (!payload) {
    throw new Error("Invalid token");
  }
  const userRoles = payload.realm_access.roles;
  console.log("userRoles: ", userRoles);

  // Check all roles and find the highest permission level
  let hasPermission = false;
  let hasSelfAll = false;
  let hasAll = false;

  for (const role of Object.keys(directions.rbac)) {
    if (userRoles.includes(role)) {
      const roleAccessModes = directions.rbac[role].split(",").map(mode => mode.trim());

      if (roleAccessModes.includes("all")) {
        hasAll = true;
      } else if (roleAccessModes.includes("selfAll")) {
        hasSelfAll = true;
      } else if (roleAccessModes.includes(accessModeToCheck)) {
        hasPermission = true;
      }
    }
  }

  // Return true if user has "all" permission (admin)
  if (hasAll) {
    return true;
  }

  // For "selfAll", we need additional checks (you'll implement this)
  if (hasSelfAll) {
    // TODO: Add selfAll logic here
    // For now, return true as placeholder
    return true;
  }

  // Return true if user has the specific permission
  return hasPermission;
}

module.exports = {
  mainRBAC,
};
