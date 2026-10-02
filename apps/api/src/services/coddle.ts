import { config } from "../config.js";
import { AppError } from "../lib/errors.js";

export type CoddleProfile = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
};

type CoddleUserPayload = {
  id?: string;
  email?: string;
  name?: string;
  avatar_url?: string;
};

function parseProfile(user: CoddleUserPayload): CoddleProfile {
  const id = typeof user.id === "string" ? user.id : "";
  const email = typeof user.email === "string" ? user.email.trim().toLowerCase() : "";
  const name = typeof user.name === "string" && user.name.trim() ? user.name.trim() : email;
  const avatarUrl =
    typeof user.avatar_url === "string" && user.avatar_url ? user.avatar_url : null;

  if (!id || !email) {
    throw new AppError(502, "coddle_profile_invalid", "Coddle profile response was incomplete");
  }

  return { id, email, name, avatarUrl };
}

export async function exchangeCoddleSsoCode(
  code: string,
  redirectUri: string,
): Promise<CoddleProfile> {
  let response: Response;
  try {
    response = await fetch(`${config.coddleApiUrl}/auth/sso/exchange`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        client_id: config.learnSsoClientId,
        client_secret: config.learnSsoClientSecret,
        redirect_uri: redirectUri,
      }),
    });
  } catch {
    throw new AppError(
      502,
      "coddle_unreachable",
      "Could not reach Coddle to complete sign-in",
    );
  }

  if (!response.ok) {
    throw new AppError(
      response.status === 400 || response.status === 401 ? 401 : 502,
      "coddle_exchange_failed",
      "Could not verify Coddle sign-in",
    );
  }

  const body = (await response.json()) as {
    data?: { user?: CoddleUserPayload };
    user?: CoddleUserPayload;
  };

  const user = body.data?.user ?? body.user;
  if (!user) {
    throw new AppError(502, "coddle_profile_invalid", "Coddle profile response was incomplete");
  }

  return parseProfile(user);
}
