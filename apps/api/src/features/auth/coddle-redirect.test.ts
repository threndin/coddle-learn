import assert from "node:assert/strict";
import { test } from "node:test";
import { buildLearnSignInUrl } from "./coddle-redirect.js";
test("sign-in goes directly to central Auth and preserves state and Learn callback", () => {
 const url=new URL(buildLearnSignInUrl("https://auth.usecoddle.com/","state+with/special=characters","https://learn.usecoddle.com/api/auth/coddle/finish"));
 assert.equal(url.origin,"https://auth.usecoddle.com");assert.equal(url.pathname,"/sso/learn");assert.equal(url.searchParams.get("state"),"state+with/special=characters");assert.equal(url.searchParams.get("return"),"https://learn.usecoddle.com/api/auth/coddle/finish");assert.equal(url.searchParams.has("redirect"),false);
});
test("signup keeps the same return flow and supports the local auth server",()=>{
 const url=new URL(buildLearnSignInUrl("http://localhost:3004","test-state","http://localhost:3002/api/auth/coddle/finish","signup"));assert.equal(url.origin,"http://localhost:3004");assert.equal(url.searchParams.get("screen"),"signup");assert.equal(url.searchParams.get("return"),"http://localhost:3002/api/auth/coddle/finish");
});
