import jwt from "jsonwebtoken";

// ---------------------------------------------------------------------------
// JWT token generation for project API keys
// ---------------------------------------------------------------------------

export interface JwtPayload {
  readonly role: string;
  readonly iss: string;
  readonly iat: number;
  readonly exp: number;
}

/**
 * Generate a JWT token for a given role (anon or service_role).
 * Tokens are long-lived (10 years) as they serve as static API keys.
 */
export function generateJwt(
  secret: string,
  role: "anon" | "service_role",
): string {
  const now = Math.floor(Date.now() / 1000);
  const tenYears = 60 * 60 * 24 * 365 * 10;

  const payload: JwtPayload = {
    role,
    iss: "litebase",
    iat: now,
    exp: now + tenYears,
  };

  return jwt.sign(payload, secret, { algorithm: "HS256" });
}

/**
 * Generate both anon_key and service_role_key for a project.
 */
export function generateProjectKeys(jwtSecret: string): {
  readonly anonKey: string;
  readonly serviceRoleKey: string;
} {
  return {
    anonKey: generateJwt(jwtSecret, "anon"),
    serviceRoleKey: generateJwt(jwtSecret, "service_role"),
  };
}

/**
 * Verify and decode a JWT token.
 */
export function verifyJwt(token: string, secret: string): JwtPayload | null {
  try {
    return jwt.verify(token, secret) as JwtPayload;
  } catch {
    return null;
  }
}
