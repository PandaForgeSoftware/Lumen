export function validateRemoteConfig(config) {
  if (!config || config.enabled !== true) throw new Error("Remote access is disabled.");
  if (typeof config.login !== "string" || !config.login.trim() || /[\r\n]/.test(config.login)) throw new Error("A Tailscale account is required.");
  const origin = new URL(config.origin);
  if (origin.protocol !== "https:" || !/^[a-z0-9][a-z0-9.-]*\.ts\.net$/.test(origin.hostname) ||
      origin.port !== "8443" || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash)
    throw new Error("Expected a private Tailscale HTTPS address on port 8443.");
  return { enabled: true, login: config.login.trim(), origin: origin.origin, host: origin.host };
}
export function remoteAllowed(headers, method, config) {
  const c = validateRemoteConfig(config);
  // Only trust these identity headers on the loopback-only Tailscale Serve backend.
  if (headers["tailscale-user-login"] !== c.login) return false;
  if (headers.host !== c.host && headers.host !== "127.0.0.1:4319") return false;
  if (headers.origin && headers.origin !== c.origin) return false;
  if (!["GET", "HEAD"].includes(method) && headers.origin !== c.origin) return false;
  return true;
}
