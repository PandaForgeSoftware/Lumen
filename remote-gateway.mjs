import http from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { remoteAllowed } from "./lib/remote-access.mjs";
const configPath = fileURLToPath(new URL("./data/remote-access.json", import.meta.url));
const deny = (res, status, message) => {
  res.writeHead(status, {"Content-Type":"application/json", "Cache-Control":"no-store"});
  res.end(JSON.stringify({error:message}));
};
const server = http.createServer(async (req,res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200,{"Content-Type":"application/json","Cache-Control":"no-store"});
    res.end('{"service":"lumen-remote-gateway"}'); return;
  }
  try {
    const config = JSON.parse((await readFile(configPath,"utf8")).replace(/^\uFEFF/,""));
    if (!remoteAllowed(req.headers,req.method,config)) return deny(res,403,"Connect with the configured Tailscale account.");
    const headers = {host:"127.0.0.1:4317"};
    for (const key of ["content-type","accept","content-length"]) if(req.headers[key]) headers[key]=req.headers[key];
    if(req.headers.origin) headers.origin="http://127.0.0.1:4317";
    const upstream=http.request({host:"127.0.0.1",port:4317,path:req.url,method:req.method,headers,timeout:30000},response=>{
      res.writeHead(response.statusCode, {...response.headers,"Cache-Control":"no-store"});
      response.pipe(res);
    });
    upstream.on("timeout",()=>upstream.destroy(new Error("Home worker timed out")));
    upstream.on("error",()=>{if(!res.headersSent) deny(res,502,"Lumen's home worker is unavailable."); else res.destroy();});
    req.on("aborted",()=>upstream.destroy());
    req.pipe(upstream);
  } catch { deny(res,403,"Remote access has not been configured."); }
});
server.listen(4319,"127.0.0.1",()=>console.log("Private Lumen gateway ready on localhost:4319"));
