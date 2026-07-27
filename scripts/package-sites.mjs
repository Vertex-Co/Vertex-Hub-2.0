import { cp, mkdir, rm, writeFile } from "node:fs/promises";
const root = new URL("../", import.meta.url);
const artifact = new URL(".sites/", root);
await rm(artifact, { recursive: true, force: true });
await mkdir(new URL("dist/client/", artifact), { recursive: true });
await mkdir(new URL("dist/server/", artifact), { recursive: true });
await mkdir(new URL("dist/.openai/", artifact), { recursive: true });
await cp(new URL("dist/", root), new URL("dist/client/", artifact), { recursive: true });
await cp(new URL(".openai/hosting.json", root), new URL("dist/.openai/hosting.json", artifact));
await writeFile(new URL("dist/server/index.js", artifact), `export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) return response;
    const url = new URL(request.url);
    url.pathname = "/index.html";
    return env.ASSETS.fetch(new Request(url, request));
  }
};\n`);
console.log("Artefato Sites criado em .sites/dist");
