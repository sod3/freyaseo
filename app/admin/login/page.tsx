import Link from "next/link";
import { LogIn } from "lucide-react";
import { loginAction } from "@/src/lib/admin/actions";
import { createCsrfToken } from "@/src/lib/admin/auth";
import { isMongoConfigured } from "@/src/lib/mongo";

const errorCopy: Record<string, string> = {
  database: "Database access is not configured yet. Add MONGODB_URI, prepare indexes, and seed the CMS.",
  invalid: "The email or password was not accepted.",
  locked: "This account is temporarily locked after repeated failed attempts.",
  session: "The secure form token expired. Please try again.",
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; notice?: string }>;
}) {
  const params = (await searchParams) || {};
  const csrfToken = await createCsrfToken();
  const configured = isMongoConfigured();
  const error = params.error ? errorCopy[params.error] || "Unable to sign in." : "";

  return (
    <main className="admin-login">
      <form className="admin-login-card" action={loginAction}>
        <input type="hidden" name="csrfToken" value={csrfToken} />
        <p className="admin-muted">Private CMS</p>
        <h1>Freya SEO Admin</h1>
        <p className="admin-muted">Sign in to manage pages, media, SEO, forms and website settings.</p>
        {!configured ? <div className="admin-alert admin-alert-error">{errorCopy.database}</div> : null}
        {error ? <div className="admin-alert admin-alert-error">{error}</div> : null}
        {params.notice === "logged-out" ? <div className="admin-alert">You have been signed out.</div> : null}
        <label className="admin-field">
          <span>Email</span>
          <input className="admin-input" type="email" name="email" autoComplete="email" required />
        </label>
        <label className="admin-field">
          <span>Password</span>
          <input className="admin-input" type="password" name="password" autoComplete="current-password" required />
        </label>
        <label className="admin-checkbox">
          <input type="checkbox" name="rememberMe" />
          <span>Remember this device</span>
        </label>
        <button className="admin-button admin-button-primary" type="submit" disabled={!configured}>
          <LogIn size={18} aria-hidden />
          Sign in
        </button>
        <p className="admin-muted">
          Forgotten passwords use secure reset tokens. Configure mail delivery before giving reset links to clients.
        </p>
        <Link href="/" className="admin-muted">
          Return to public website
        </Link>
      </form>
    </main>
  );
}
