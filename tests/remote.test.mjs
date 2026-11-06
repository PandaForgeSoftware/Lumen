import test from "node:test";
import assert from "node:assert/strict";
import {remoteAllowed,validateRemoteConfig} from "../lib/remote-access.mjs";
const config={enabled:true,login:"owner@example.test",origin:"https://home.example.ts.net:8443"};
const headers={host:"home.example.ts.net:8443","tailscale-user-login":config.login,origin:config.origin};
test("remote requests require the configured identity and same-origin writes",()=>{
  assert(remoteAllowed(headers,"POST",config));
  assert(!remoteAllowed({...headers,"tailscale-user-login":"other@example.test"},"GET",config));
  assert(!remoteAllowed({host:headers.host},"GET",config));
  assert(!remoteAllowed({...headers,origin:"https://attacker.test"},"POST",config));
  assert(!remoteAllowed({...headers,origin:undefined},"POST",config));
  assert(!remoteAllowed({...headers,host:"attacker.test"},"GET",config));
  assert(remoteAllowed({...headers,origin:undefined},"GET",config));
});
test("remote setup fails closed for disabled or invalid configuration",()=>{
  for(const c of [{...config,enabled:false},{...config,login:""},{...config,origin:"http://home.example.ts.net:8443"},{...config,origin:"https://attacker.test:8443"}])
    assert.throws(()=>validateRemoteConfig(c));
});
