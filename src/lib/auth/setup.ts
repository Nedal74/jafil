import { isProduction } from "../env";

/** First-admin setup needs SETUP_KEY in production (or whenever one is configured). */
export function setupKeyRequired(): boolean {
  return isProduction || Boolean(process.env.SETUP_KEY);
}
