import { Request, Response } from "express";
import * as jose from "jose";
import {
  GOOGLE_CLIENT_ID,
  GOOGLE_AUTH_URL,
  BASE_URL,
  APP_SCHEME,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
  JWT_EXPIRATION_TIME,
  JWT_SECRET,
  REFRESH_TOKEN_EXPIRY
} from "../utils/constants";
import User from "../models/user";
import { AuthRequest } from "../types";

export const authorize = async (req: Request, res: Response) => {
  if (!GOOGLE_CLIENT_ID) {
    return res
      .status(500)
      .json({ error: "Missing GOOGLE_CLIENT_ID environment variable" });
  }
  const url = new URL(req.url, `${req.protocol}://${req.get("host")}`);
  let idpClientId: string;

  const internalClient = url.searchParams.get("client_id");

  // const redirectUri = url.searchParams.get("redirect_uri");

  let platform = "mobile";

  // use state to drive redirect back to platform
  let state = platform + "|" + url.searchParams.get("state");

  if (internalClient === "google") {
    idpClientId = GOOGLE_CLIENT_ID;
  } else {
    return res.status(400).json({ error: "Invalid client" });
  }

  // additional enforcement
  if (!state) {
    return res.status(400).json({ error: "Invalid state" });
  }

  const params = new URLSearchParams({
    client_id: idpClientId,
    redirect_uri: BASE_URL + "/api/auth/callback",
    response_type: "code",
    scope: url.searchParams.get("scope") || "identity",
    state: state,
    prompt: "select_account"
  });

  console.log("in auth redirecting");

  return res.redirect(GOOGLE_AUTH_URL + "?" + params.toString());
};

export const callback = async (req: Request, res: Response) => {
  const incomingParams = new URLSearchParams(req.url.split("?")[1]);
  const combinedPlatformAndState = incomingParams.get("state");
  if (!combinedPlatformAndState) {
    return res.status(400).json({ error: "Invalid state" });
  }
  // strip platform to return state as it was set on the client
  const state = combinedPlatformAndState.split("|")[1];

  const outgoingParams = new URLSearchParams({
    code: incomingParams.get("code")?.toString() || "",
    state
  });

  return res.redirect(APP_SCHEME + "?" + outgoingParams.toString());
};

export const token = async (req: Request, res: Response) => {
  const code = req.body.code;

  if (!code) {
    return res.status(400).json({ error: "Missing authorization code" });
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code",
      code: code
    })
  });

  const data = await response.json();

  if (!data.id_token) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  const userInfo = jose.decodeJwt(data.id_token) as object;

  // Save new user in DB
  let user = await User.findOne({ email: (userInfo as any).email });
  if (!user) {
    user = new User({
      email: (userInfo as any).email,
      name: (userInfo as any).name,
      avatar: (userInfo as any).picture
    });
    await user.save();
  }

  // Create a new object without the exp property from the original token
  const { exp, ...userInfoWithoutExp } = userInfo as any;

  // User id
  const sub = (userInfo as { sub: string }).sub;

  // Current timestamp in seconds
  const issuedAt = Math.floor(Date.now() / 1000);

  // Generate a unique jti (JWT ID) for the refresh token
  const jti = crypto.randomUUID();

  // Create access token (short-lived)
  const accessToken = await new jose.SignJWT({
    ...userInfoWithoutExp,
    bloodGroup: user?.bloodGroup,
    address: user?.address,
    _id: user._id.toString()
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(JWT_EXPIRATION_TIME)
    .setSubject(sub)
    .setIssuedAt(issuedAt)
    .sign(new TextEncoder().encode(JWT_SECRET));

  // Create refresh token (long-lived)
  const refreshToken = await new jose.SignJWT({
    sub,
    jti, // Include a unique ID for this refresh token
    type: "refresh",
    // Include all user information in the refresh token
    // This ensures we have the data when refreshing tokens
    _id: user._id.toString(),
    name: (userInfo as any).name,
    email: (userInfo as any).email,
    picture: (userInfo as any).picture,
    given_name: (userInfo as any).given_name,
    family_name: (userInfo as any).family_name,
    email_verified: (userInfo as any).email_verified,
    bloodGroup: user?.bloodGroup,
    address: user?.address
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .setIssuedAt(issuedAt)
    .sign(new TextEncoder().encode(JWT_SECRET));

  if (data.error) {
    return res.status(400).json({
      error: data.error,
      error_description: data.error_description,
      message:
        "OAuth validation error - please ensure the app complies with Google's OAuth 2.0 policy"
    });
  }

  // For native platforms, return both tokens in the response body
  return res.json({
    accessToken,
    refreshToken
  });
};

export const refresh = async (req: Request, res: Response) => {
  try {
    // Determine the platform (web or native)
    let platform = "native";
    let refreshToken: string | null = null;

    // Check content type to determine how to parse the body
    const contentType = req.get("content-type") || "";

    if (contentType.includes("application/json")) {
      // Handle JSON body
      try {
        platform = req.body.platform || "native";

        // For native clients, get refresh token from request body
        if (platform === "native" && req.body.refreshToken) {
          refreshToken = req.body.refreshToken;
        }
      } catch (e) {
        console.log("Failed to parse JSON body, using default platform");
      }
    } else if (
      contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data")
    ) {
      // Handle form data
      try {
        platform = req.body.platform || "native";

        // For native clients, get refresh token from form data
        if (platform === "native" && req.body.refreshToken) {
          refreshToken = req.body.refreshToken;
        }
      } catch (e) {
        console.log("Failed to parse form data, using default platform");
      }
    } else {
      // For other content types or no content type, check URL parameters
      try {
        const url = new URL(req.url);
        platform = url.searchParams.get("platform") || "native";
      } catch (e) {
        console.log("Failed to parse URL parameters, using default platform");
      }
    }

    // If no refresh token found, try to use the access token as fallback
    if (!refreshToken) {
      // For native clients, get access token from Authorization header
      const authHeader = req.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const accessToken = authHeader.split(" ")[1];

        try {
          // Verify the access token
          const decoded = await jose.jwtVerify(
            accessToken,
            new TextEncoder().encode(JWT_SECRET)
          );

          // If token is still valid, use it to create a new token
          // This is a fallback mechanism and not ideal for security
          console.log("No refresh token found, using access token as fallback");

          // Get the user info from the token
          const userInfo = decoded.payload;

          // Current timestamp in seconds
          const issuedAt = Math.floor(Date.now() / 1000);

          // Create a new access token
          const newAccessToken = await new jose.SignJWT({ ...userInfo })
            .setProtectedHeader({ alg: "HS256" })
            .setExpirationTime(JWT_EXPIRATION_TIME)
            .setSubject(userInfo.sub as string)
            .setIssuedAt(issuedAt)
            .sign(new TextEncoder().encode(JWT_SECRET));

          // For native platforms
          return res.json({
            accessToken: newAccessToken,
            warning: "Using access token fallback - refresh token missing"
          });
        } catch (error) {
          // Access token is invalid or expired
          return res.status(401).json({
            error: "Authentication required - no valid refresh token"
          });
        }
      }

      return res
        .status(401)
        .json({ error: "Authentication required - no refresh token" });
    }

    // Verify the refresh token
    let decoded;
    try {
      decoded = await jose.jwtVerify(
        refreshToken,
        new TextEncoder().encode(JWT_SECRET)
      );
    } catch (error) {
      if (error instanceof jose.errors.JWTExpired) {
        return res
          .status(401)
          .json({ error: "Refresh token expired, please sign in again" });
      } else {
        return res
          .status(401)
          .json({ error: "Invalid refresh token, please sign in again" });
      }
    }

    // Verify this is actually a refresh token
    const payload = decoded.payload;
    if (payload.type !== "refresh") {
      return res
        .status(401)
        .json({ error: "Invalid token type, please sign in again" });
    }

    // Get the subject (user ID) from the token
    const sub = payload.sub;
    if (!sub) {
      return res.status(401).json({ error: "Invalid token, missing subject" });
    }

    // Current timestamp in seconds
    const issuedAt = Math.floor(Date.now() / 1000);

    // Generate a unique jti (JWT ID) for the new refresh token
    const jti = crypto.randomUUID();

    // Get the user info from the token
    const userInfo = decoded.payload;

    // Check if we have all the required user information
    // If not, we need to add it to ensure ProfileCard works correctly
    const hasRequiredUserInfo =
      userInfo.name &&
      userInfo.email &&
      userInfo.picture &&
      userInfo.bloodGroup;

    // Create a complete user info object
    let completeUserInfo = { ...userInfo };

    // If we're missing user info, try to fetch it from a user database or service
    // For this example, we'll just ensure the type field is preserved
    if (!hasRequiredUserInfo) {
      // TODO: fetch user from DATABASE using sub(user_id)
      let user = await User.findOne({ email: (userInfo as any).email });
      if (!user) return res.status(401).json({ error: "User not found" });
      // In a real implementation, you would fetch the user data from your database
      // using the sub (user ID) as the key
      // For now, we'll just ensure we keep the refresh token type
      completeUserInfo = {
        ...userInfo,
        // Preserve the refresh token type
        type: "refresh",
        // Add any missing fields that might be needed by the UI
        // These would normally come from your user database
        _id: user._id.toString(),
        bloodGroup: user.bloodGroup,
        address: user.address,
        name: userInfo.name || `android-user`,
        email: userInfo.email || `android-user`,
        picture:
          userInfo.picture ||
          user.avatar ||
          `https://ui-avatars.com/api/?name=User&background=random`
      };
    }

    // Create a new access token with complete user info
    const newAccessToken = await new jose.SignJWT({
      ...completeUserInfo,
      // Remove the refresh token specific fields from the access token
      type: undefined
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime(JWT_EXPIRATION_TIME)
      .setSubject(sub)
      .setIssuedAt(issuedAt)
      .sign(new TextEncoder().encode(JWT_SECRET));

    // Create a new refresh token (token rotation)
    const newRefreshToken = await new jose.SignJWT({
      ...completeUserInfo,
      jti,
      type: "refresh"
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime(REFRESH_TOKEN_EXPIRY)
      .setIssuedAt(issuedAt)
      .sign(new TextEncoder().encode(JWT_SECRET));

    // For native platforms, return the new tokens in the response body
    return res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    return res.status(500).json({ error: "Failed to refresh token" });
  }
};
