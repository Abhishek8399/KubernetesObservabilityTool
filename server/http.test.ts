import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createAppServer } from "./http.ts";

test("local backend owns versioned simulation state, failure progress, repair, and independent sessions", async () => {
  const server = createAppServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}`;
  const send = (path: string, method = "GET", body?: unknown) =>
    fetch(base + path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  try {
    assert.equal((await send("/api/health")).status, 200);
    const course = await (
      await send("/api/sessions", "POST", { missionId: "application" })
    ).json();
    assert.equal(course.frame.simulation.ready, 0);
    assert.equal(course.pods.length, 0);
    assert.equal(course.mission.steps.length, 32);
    const milestone = await (
      await send(`/api/sessions/${course.id}`, "PUT", {
        revision: 0,
        step: 9,
        recovery: false,
        resolved: false,
        paused: false,
      })
    ).json();
    assert.equal(milestone.backends, 2);
    assert.equal(milestone.frame.learning.step, 9);
    const final = await (
      await send(`/api/sessions/${course.id}`, "PUT", {
        revision: 1,
        step: 31,
        recovery: false,
        resolved: false,
        paused: false,
      })
    ).json();
    assert.equal(final.frame.learning.step, 31);
    assert.equal(final.backends, 4);
    assert.equal(final.mission.steps[31].lesson.story.chapter, "Production");
    assert.equal(
      (
        await send(`/api/sessions/${course.id}`, "PUT", {
          revision: 2,
          step: 32,
          recovery: false,
          resolved: false,
          paused: false,
        })
      ).status,
      400,
    );
    assert.equal(
      (await (await send(`/api/sessions/${course.id}`)).json()).step,
      31,
    );
    assert.equal(
      (await send("/api/sessions", "POST", { missionId: "invalid" })).status,
      400,
    );
    const created = await send("/api/sessions", "POST", {
      missionId: "lab:pod-failure",
    });
    assert.equal(created.status, 201);
    const first = await created.json();
    assert.equal(first.frame.simulation.ready, 5);
    const path = `/api/sessions/${first.id}`;
    const command = {
      revision: 0,
      step: first.mission.steps.length - 1,
      recovery: false,
      resolved: false,
      paused: false,
    };
    const outcome = await (await send(path, "PUT", command)).json();
    assert.equal(outcome.frame.simulation.ready, 6);
    assert.equal(outcome.revision, 1);
    assert.equal(
      (await send(path, "PUT", command)).status,
      409,
      "stale writers cannot overwrite a newer state",
    );
    assert.equal(
      (await send(path, "PUT", { ...command, revision: 1, step: 999 })).status,
      400,
    );
    const db = await (
      await send("/api/sessions", "POST", {
        missionId: "lab:dependency-outage",
      })
    ).json();
    assert.equal(db.backends, 0);
    const repaired = await (
      await send(`/api/sessions/${db.id}`, "PUT", {
        revision: 0,
        step: db.mission.steps.length - 1,
        recovery: false,
        resolved: true,
        paused: true,
      })
    ).json();
    assert.equal(repaired.backends, 6);
    assert.equal(
      (await (await send(path)).json()).revision,
      1,
      "other sessions remain independent",
    );
    assert.equal((await send(path, "DELETE")).status, 204);
    assert.equal((await send(path)).status, 404);
    assert.equal(
      (
        await fetch(base + "/api/sessions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: "https://unexpected.example",
          },
          body: "{}",
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await fetch(base + "/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{",
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await send("/api/sessions", "POST", {
          missionId: "request",
          extra: "x".repeat(20000),
        })
      ).status,
      413,
    );
    assert.equal((await send("/.env")).status, 404);
    assert.equal((await send("/app/universe.tsx")).status, 404);
    assert.equal((await send("/%2e%2e%5cpackage.json")).status, 404);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((done, reject) =>
      server.close((error) => (error ? reject(error) : done())),
    );
  }
});
