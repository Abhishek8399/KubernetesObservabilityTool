# Kubernetes Observatory

A vendor-neutral, interactive Kubernetes architecture explorer for engineers, teams, and learners.

**Website:** https://abhishek8399.github.io/KubernetesObservabilityTool/

## Explore

- A full-screen dimensional architecture world with raised platforms, server towers, illuminated connections, moving request particles, pan, zoom, and keyboard-accessible components.
- Click-to-open component popups with explanations, illustrative configuration, diagnostics, related concepts, and bookmarks. Details do not occupy a permanent sidebar.
- Optional, quiet interaction sounds synthesized locally with Web Audio. Sound starts muted and requires the reader to enable it.
- A searchable library of 71 concepts with explanations, configuration examples, diagnostics, and official documentation links.
- Four guided journeys: request lifecycle, release deployment, scaling, and recovery.
- Eight illustrative system scenarios, including Pod, zone, and regional failure, blocked networking, and dependency outages.
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

The checks cover TypeScript, ESLint, concept/graph integrity, separation of request and control paths, visible Pod placement during failures, simulation behavior, and the static artifact's content, assets, and base path. They do not substitute for browser visual or interaction testing.

For a manual interaction check: click an architecture component; switch its Understand/Configure/Diagnose tabs; close with Escape; search the library; run a guided request; enable and mute sound; lose a zone and check the ready counts; run a regional failure with and without standby; pause the simulation; check a narrow viewport and reduced-motion preferences. Web Audio needs a supported browser and an explicit user gesture.

## Publish

The GitHub Actions workflow validates the source, builds `dist-static`, and deploys GitHub Pages. In repository **Settings → Pages**, set **Source** to **GitHub Actions** before the first deployment. Push approved changes to `main` or run the workflow manually.

GitHub Pages uses the repository-specific `/KubernetesObservabilityTool/` base path. The retained vinext starter also supports a Worker build through `npm run build`; the public deployment uses only the static build and needs no Worker, database, authentication service, or server secrets.

## Content and maintenance

Concepts are in `app/data/concepts.ts`, journeys in `app/data/journeys.ts`, illustrative manifests in `app/data/examples.ts`, and scenario behavior in `app/lib/simulation.ts`. The full-screen interface is in `app/universe.tsx`, scene geometry in `app/architecture-scene.tsx`, connections in `app/data/world.ts`, styles in `app/universe.css`, and sound generation in `app/lib/sound.ts`. The previous explorer supplies the reusable component inspector. Diagrams and icons are code-native SVG; no graphics or audio dependency is needed.

Review explanations against the supported Kubernetes version and installed implementations. Example manifests contain placeholders and assumed application endpoints; adapt and validate them in staging before use. Commands with optional resource kinds require those APIs to be installed.

Independent educational project; not affiliated with or endorsed by Kubernetes or the CNCF.
