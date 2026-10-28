// What a deliverable upload may be, and which keys the server will accept back.
import assert from "node:assert/strict";
import { checkDeliverableFile, deliverableKeyProject, DELIVERABLE_MAX_BYTES } from "../lib/deliverable-upload-rules.ts";

assert.equal(checkDeliverableFile("Brand pack.zip", 80 * 1024 * 1024).ok, true, "a zip is a deliverable");
assert.equal(checkDeliverableFile("logo.SVG", 2048).ok, true);
assert.equal(checkDeliverableFile("setup.exe", 2048).ok, false, "programs are not");
assert.equal(checkDeliverableFile("pack.zip", DELIVERABLE_MAX_BYTES + 1).ok, false, "over the limit");
assert.equal(checkDeliverableFile("pack.zip", 0).ok, false, "empty");

assert.equal(deliverableKeyProject("deliverables/p1546837782003064/mh3k2a1b-1a2b3c4d.zip"), "p1546837782003064");
assert.equal(deliverableKeyProject("deliverables/p1/../chat/x-1a2b3c4d.zip"), null, "no path tricks");
assert.equal(deliverableKeyProject("chat/p-p1/mh3k2a1b-1a2b3c4d.zip"), null, "another namespace");
assert.equal(deliverableKeyProject("deliverables/p1/mh3k2a1b-1a2b3c4d.exe"), null, "a type it would never sign");
console.log("deliverable upload rules: ok");
