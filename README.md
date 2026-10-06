# Kubernetes Observatory

A vendor-neutral, interactive Kubernetes architecture explorer for engineers, teams, and learners.

**Website:** https://abhishek8399.github.io/KubernetesObservabilityTool/

## Run the full local app

Use Node 24 LTS and the locked dependencies:

```sh
npm ci
npm run dev:local
```

Open **http://127.0.0.1:5180/**. This single command starts the React frontend and the Node simulation backend. Both bind to localhost. The frontend forwards `/api` requests to the backend on port 8788.

For the built app, one server serves the frontend and API together:

```sh
npm run build:local
npm run start:local
```

Open **http://127.0.0.1:8788/**. The local build always uses `/` as its asset base, independently of the GitHub Pages build.

The frontend runs smooth, finite camera flights. The backend owns versioned, isolated simulation sessions and computes the Pod, endpoint, outage, and repair state at each stop. Sessions are in memory, expire after 30 minutes without activity, and disappear on server restart. This is an educational simulator; it does not connect to or modify a Kubernetes cluster. On GitHub Pages, the same interface uses the browser simulator because Pages cannot host the Node backend.

## Start with your own application

The primary launch opens **From my application to Kubernetes**, a guided story with **32 milestones** across Prepare, Run, Connect, Operate, Protect, Resilience and Production. It starts with a working frontend/API application, compares a standalone Pod with a Deployment, follows acceptance and startup, and builds toward public routing, security, capacity, controlled maintenance and evidence-based recovery.

Every stage starts with an everyday question, gives the decision and its reason, explains what happens if it is skipped, identifies the objects or configuration to create, and describes what to observe. Expand each question to read the consequence or next action. Selected milestones also include illustrative YAML, with placeholder images and implementation prerequisites clearly identified. Ingress/controller/IngressClass and Gateway API alternatives are explained without choosing a cloud vendor.

Each milestone has three sections: **Understand**, **Check understanding**, and **Practice in a sandbox**. Answering correctly unlocks the next milestone. Checked answers are stored in your browser; returning to the application journey resumes at the first unchecked milestone. Direct destination selection remains available for review.

The scene starts with zero application Pods. It shows two starting API replicas after controller reconciliation, ready replicas after readiness, serving endpoints after the Service, and four ready API/frontend replicas with separate Service selectors at the frontend milestone. Planned resources are dimmed until their stage. The examples describe a chosen sandbox cluster; this app does not provision one.

Understanding checks measure conceptual learning. The final practice plan asks for real sandbox evidence, including deployment, routing, failures, scaling, rollback, and restore. Completion is not a claim of production expertise, and the app does not run the displayed kubectl commands.

## Cinematic voyages

The main diagram uses perspective projection of three-dimensional vertices with depth-sorted geometry, rendered as accessible SVG. It does not require WebGL or a new graphics dependency. Drag to orbit, adjust tilt, vertically separate the layers, or isolate a responsibility. Foundation, control plane and worker data plane are distinguished from the teaching layers for delivery, traffic, security, data and operations. These additional layers are not claims that Kubernetes requires separate formal planes or clusters.

The ship, curved course, destination marker and guided camera share the same 3D coordinates. Flights start from the actual explored camera pose, pull back, ascend or descend through space, and approach the resource. The canvas measures its available space with ResizeObserver; close-ups frame the resource at a readable viewport-relative size. Manual navigation pauses guided travel. Near-camera geometry is clipped to avoid projecting resources behind the camera into the foreground. The retained isometric renderer supports existing explanatory resource previews and regression checks.

Choose **Diagram only** to hide the learning panels and introductory text without losing the current stop. **Show learning panels** restores them. Open **Camera & labels** to hide diagram labels independently, switch between orbit and pan, pan in four directions, tilt above or below a platform, or separate and isolate the layers. Shift-drag pans and the scroll wheel zooms. Clicking a resource or platform makes an animated close-up; **Explain this resource** opens its detailed popup. Reset returns the spatial camera, pan, zoom and isolation to the overview.

Names are placed in a separate screen-space layer and avoid other names and the model footprints. Descriptions appear on hover rather than beneath every object. Healthy Pod names are reserved for close-ups; failed or starting Pods retain priority. Nameplates can be clicked to focus their model. Platform titles appear when that layer is isolated. The zoom buttons and wheel change actual camera distance, share the same limits, and can pull back from any close-up; the percentage reflects the 3D view rather than the retained isometric renderer's zoom. The overview toolbar is positioned above the journey dock so the dock cannot cover its buttons.

On desktop, the lesson occupies a separate right rail while the architecture retains its own unobstructed viewport. On narrow screens, the diagram appears above the scrollable lesson. The stage selector, live simulated readiness counts, **Watch this stage**, and **Focus this stage** connect the story to its visible resources. Diagram-only mode retains previous/next/refocus controls; understanding checks remain required to advance the application course.

- Choose **Request** to fly with a request. The camera pulls back, follows a travelling ship, and moves in at each destination. DNS discovery is distinguished from HTTP forwarding; a separate return leg carries the response back to the client.
- Each stop explains **why the resource exists** and **what happens here**. Pause to read, move forward/backward, choose any stop from the flight plan, or open the resource popup.
- Run a failure to travel through its impact, controller response, placement, readiness, and outcome. The camera and resource state advance together; dependency and policy outages require an explicit simulated repair.
- Open the incident controls during a failure flight to repair, replay, adjust playback speed, or configure the independently designed standby. Exploring the map preserves the current incident state and pauses the lesson.
- The **71-stop expedition** visits the complete library. A component popup also has **Fly to this resource**. API objects without a dedicated map object appear as logical close-ups at their owning resource, not additional physical servers.
- Manual camera movement pauses guided travel. **Resume flight** restores the camera guide. Reduced-motion preferences replace camera travel with immediate destination changes.
- An original, slow piano-only soundtrack uses struck-string harmonics, acoustic decay, gentle broken chords and spacious stereo reverb. It is enabled at 45% by default, with volume and mute available in both learning and diagram-only modes. Browsers require a first click or keypress to start audio. Muting suspends the audio device; resuming reuses the device and one score timer. No existing film score or recording is included. Piano samples are cached locally and all voices are stopped when the app closes.

The reverb impulse uses the audio device's exact sample rate, as required by the [ConvolverNode buffer specification](https://webaudio.github.io/web-audio-api/#dom-convolvernode-buffer). Tests enforce that requirement at 48 kHz and 44.1 kHz and verify that a failed initialization can be retried without leaving a half-ready audio graph. Piano note buffers can use a lower rate because AudioBufferSourceNode resamples them for playback.

## Deploy later

The included container serves the frontend and API together as an unprivileged user. Build and run locally with Docker Compose:

```sh
docker compose up --build
```

Open http://127.0.0.1:8788/. The Compose configuration publishes only to localhost, removes Linux capabilities, and uses a read-only filesystem. The container health endpoint is `/api/health`.

For hosting, place this image behind HTTPS and decide whether the educational sessions should be public or access-controlled. `HOST` defaults to `127.0.0.1` for a direct Node process; the container explicitly binds `0.0.0.0`. `PORT` defaults to 8788. The current session store is deliberately single-process and ephemeral; persistence or multiple replicas require a shared store. A deployed container image should pin the approved base-image digest in the deployment release.

## Explore

- A full-screen dimensional architecture world with raised platforms, server towers, illuminated connections, moving request particles, pan, zoom, and keyboard-accessible components.
- Click-to-focus resources and platforms, with separate component popups for explanations, illustrative configuration, diagnostics, related concepts, and bookmarks. Resource details and the learning rail can be hidden to explore only the diagram.
- Optional, quiet interaction sounds synthesized locally with Web Audio. The background soundtrack is enabled by default and starts after the first browser interaction. A slider adjusts volume and the speaker button mutes it.
- A searchable library of 71 concepts with explanations, configuration examples, diagnostics, and official documentation links.
- Four core guided flights plus the complete 71-stop expedition: request lifecycle, release deployment, scaling, and recovery.
- Eight illustrative system scenarios, including Pod, zone, and regional failure, blocked networking, and dependency outages.
- Four-stage failure lessons with immediate visible impact, named Pod states, readiness-based endpoint branches, controller activity, playback speed, pause, chapter stepping, scrubbing, and replay. Playback stops at the end; opening details freezes lesson time.
- Clickable connections explain actual responsibilities, discovery metadata, request paths, and control relationships. Larger labels and three introductory questions make the diagram easier to approach.
- Explicit simulated operator repairs for dependency and policy outages; healthy Pod counts do not conceal a broken request path.
- An optional independent secondary-region design and a ten-stage platform implementation checklist.
- Saved concepts stored on the reader's device.

## Architecture boundaries

This is an educational simulation, not a connected Kubernetes cluster or a universal production blueprint. Timing, replica counts, capacity, and metrics are illustrative. No real cloud resources are provisioned.

Native Kubernetes APIs, optional implementations, external services, and architecture patterns are labeled separately. Lines distinguish logical application traffic, control-plane relationships, and dependencies. EndpointSlice is backend metadata, not a packet hop. Gateway API configuration requires a working controller and data plane. Regional recovery requires independently designed capacity, data recovery, and external routing.

The project contains generic examples only. It has no company workload configuration, credentials, production integrations, application telemetry, or app accounts. Browser preferences stay local. Google Fonts is the only external styling resource; its fonts have system fallbacks.

## Develop

Requires Node.js 24 and npm. CI uses Linux.

```sh
npm ci
npm run dev
```

## Verify

```sh
npm run check
PUBLIC_BASE_PATH=/KubernetesObservabilityTool/ npm run build:static
PUBLIC_BASE_PATH=/KubernetesObservabilityTool/ npm run smoke:static
```

The checks cover TypeScript, ESLint, concept/graph integrity, separation of request and control paths, visible Pod placement during failures, finite lesson timing, simulated repair boundaries, and the static artifact's content, assets, and base path. `npm run smoke:scene` also renders the actual React SVG and lesson controls to verify lost/starting/ready Pods, failed zones, endpoint withdrawal, scaling, rollout versions, explicit repair, and standby states. These checks do not substitute for browser visual or interaction testing.

For a manual interaction check: click a component or connection; switch its Understand/Configure/Diagnose tabs; close with Escape; search the library; run a guided request; adjust and mute the background soundtrack; lose a Pod and inspect C2 lost → starting → replacement ready; lose zone B and observe its routes disappear; step through the chapters; scrub and replay; verify playback stops at 28 lesson seconds; restore a dependency or allow the required policy flow; run regional failure with and without standby; check a narrow viewport and reduced-motion preferences. Web Audio needs a supported browser and an explicit user gesture.

## Publish

The GitHub Actions workflow validates the source, builds `dist-static`, and deploys GitHub Pages. In repository **Settings → Pages**, set **Source** to **GitHub Actions** before the first deployment. Push approved changes to `main` or run the workflow manually.

GitHub Pages uses the repository-specific `/KubernetesObservabilityTool/` base path. The retained vinext starter also supports a Worker build through `npm run build`; the public deployment uses only the static build and needs no Worker, database, authentication service, or server secrets.

Dependency audit on 2026-10-06: `npm audit --omit=dev` reports zero advisories after the narrow `source-map-js` 1.2.2 patch. The existing development toolchain still reports 12 advisories (9 high, 3 moderate), including the glob-processing and retained Worker tooling dependencies. Review those before running builds against untrusted inputs. Avoid `npm audit fix --force`: its proposed changes include breaking downgrades of the framework and lint configuration. The local production container runs native Node code and the built frontend; it does not install the development toolchain.

## Content and maintenance

Concepts are in `app/data/concepts.ts`, journeys in `app/data/journeys.ts`, illustrative manifests in `app/data/examples.ts`, and scenario behavior in `app/lib/simulation.ts`. The finite teaching timeline and visible Pod identities are in `app/lib/lab.ts`, its controls in `app/lab-console.tsx`, and connection explanations in `app/data/connections.ts`. The full-screen interface is in `app/universe.tsx`, scene geometry in `app/architecture-scene.tsx`, connections in `app/data/world.ts`, styles in `app/universe.css`, `app/lessons.css`, and `app/flight.css`, and sound generation in `app/lib/sound.ts`. Flight courses and camera geometry are in `app/lib/flight.ts`, camera playback in `app/use-flight-camera.ts`, the cockpit in `app/flight-deck.tsx`, backend synchronization in `app/use-simulation-backend.ts`, and session/API handling in `server/`. The previous explorer supplies the reusable component inspector. Diagrams and icons are code-native SVG; no graphics or audio dependency is needed.

Review explanations against the supported Kubernetes version and installed implementations. Example manifests contain placeholders and assumed application endpoints; adapt and validate them in staging before use. Commands with optional resource kinds require those APIs to be installed.

Independent educational project; not affiliated with or endorsed by Kubernetes or the CNCF.
