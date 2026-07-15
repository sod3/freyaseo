import assert from "node:assert/strict";
import "dotenv/config";
import test from "node:test";

process.env.CMS_PUBLIC_SOURCE = "local";
delete process.env.MONGODB_URI;

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${path}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Freya SEO homepage", async () => {
  const response = await render("/");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Rank First on Google &amp; AI \| Multilingual SEO Agency - FreyaSEO<\/title>/i);
  assert.match(html, /Freya SEO/);
  assert.match(html, /wp-clone-root/);
  assert.match(html, /data-page-path="\/"/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("keeps admin pages private", async () => {
  const login = await render("/admin/login/");
  assert.equal(login.status, 200);
  const loginHtml = await login.text();
  assert.match(loginHtml, /Freya SEO Admin/);
  assert.match(loginHtml, /name="csrfToken"/);
  assert.match(loginHtml, /noindex/i);

  const dashboard = await render("/admin/dashboard/");
  assert.ok([307, 308].includes(dashboard.status));
  assert.match(dashboard.headers.get("location") ?? "", /\/admin\/login\/?$/);
});
