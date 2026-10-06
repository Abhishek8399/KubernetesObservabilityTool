import type { FlightMission, FlightStop } from "../lib/flight";
import { applicationStories } from "./application-story.ts";

const productionChecks = [
  {
    node: "pvc",
    question:
      "Does replacing a Pod automatically recover files from its writable container layer?",
    choices: [
      "No; durable state needs deliberately configured persistence and recovery",
      "Yes, a Deployment copies all files",
      "Only when the Service uses port 80",
    ],
    answer: 0,
    exercise:
      "Prepare a sandbox PVC using an approved StorageClass. Verify access modes, binding, volume placement and persistence through Pod replacement.",
    verify:
      "kubectl get pvc -n learning; verify test data after replacing only a disposable sandbox Pod.",
  },
  {
    node: "networkpolicy",
    question: "What makes a NetworkPolicy actually control traffic?",
    choices: [
      "Naming the namespace secure",
      "An enforcing network implementation and correctly selected allow/deny rules",
      "Creating another ReplicaSet",
    ],
    answer: 1,
    exercise:
      "Document intended flows and required DNS. Review default-deny and narrow allow policies together before testing in an isolated sandbox.",
    verify:
      "Demonstrate one required permitted flow and one intentionally denied flow; inspect policy selectors and implementation support.",
  },
  {
    node: "serviceaccount",
    question:
      "Should an application receive cluster-admin simply because it runs in Kubernetes?",
    choices: [
      "Yes, every Pod needs administrator access",
      "Only if it has two replicas",
      "No; grant only genuinely required API actions or no API access",
    ],
    answer: 2,
    exercise:
      "Review the workload ServiceAccount, token mounting and role bindings. Use an approved identity path for external dependencies.",
    verify:
      "Review least-privilege API permissions and confirm unnecessary Secret-read or workload-modification actions are absent.",
  },
  {
    node: "podsecurity",
    question:
      "What is a reasonable response when application hardening fails in staging?",
    choices: [
      "Disable all cluster policies",
      "Identify the required capability or writable path and adapt the image/template narrowly",
      "Give every container a host filesystem mount",
    ],
    answer: 1,
    exercise:
      "Adapt the container for non-root execution, restricted capabilities and compatible filesystem behavior. Validate admission and runtime behavior in staging.",
    verify:
      "Check admission events and complete user-path behavior with the intended securityContext; do not weaken unrelated workloads.",
  },
  {
    node: "tls",
    question:
      "Does HTTPS alone authorize which user can access application data?",
    choices: [
      "Yes",
      "Only when the certificate is renewed",
      "No; connection protection and application authorization are separate responsibilities",
    ],
    answer: 2,
    exercise:
      "Review HTTPS termination, hostname/certificate delivery and renewal. Test application authentication and forbidden user actions separately.",
    verify:
      "Verify certificate validity, HTTPS routing, renewal monitoring and rejection of unauthorized application operations.",
  },
  {
    node: "affinity",
    question:
      "Do several replicas guarantee that one node or zone loss will leave capacity available?",
    choices: [
      "No; placement, real failure domains, spare capacity and data paths must support it",
      "Yes, replica count is sufficient",
      "Only if each Pod has a different name",
    ],
    answer: 0,
    exercise:
      "Inspect actual node/zone labels, choose justified topology rules and verify eligible spare capacity before a disposable zone-loss exercise.",
    verify:
      "kubectl get pods -n learning -o wide; compare node zone labels and observe surviving capacity in the zone-loss flight.",
  },
  {
    node: "pdb",
    question:
      "Which event does a PDB constrain when its requirements can be met?",
    choices: [
      "An involuntary power loss",
      "A supported voluntary eviction using the Eviction API",
      "Every Deployment rolling update",
    ],
    answer: 1,
    exercise:
      "Prepare a PDB from measured serving requirements. Review allowed disruptions and a safe sandbox maintenance procedure.",
    verify:
      "kubectl get pdb -n learning; distinguish blocked voluntary eviction from an involuntary failure or Deployment rollout.",
  },
  {
    node: "probes",
    question: "What makes a replica's termination safer for active requests?",
    choices: [
      "Immediately exiting without handling signals",
      "Only a longer YAML file",
      "Tested shutdown, bounded in-flight work and appropriate grace/connection-draining behavior",
    ],
    answer: 2,
    exercise:
      "Test SIGTERM handling and a sandbox rollout under representative traffic. Measure errors and shutdown duration instead of assuming a sleep hook guarantees safety.",
    verify:
      "Confirm request behavior during termination, replacement readiness and the application's actual grace-period compliance.",
  },
  {
    node: "gitops",
    question: "What best makes a release reproducible and reviewable?",
    choices: [
      "Mutable image tags and undocumented changes",
      "Reviewed configuration, immutable artifacts and a scoped release process",
      "Creating all production Pods manually",
    ],
    answer: 1,
    exercise:
      "Trace one sandbox release from source and image digest through reviewed configuration, scoped deployment identity and rollback/roll-forward decision.",
    verify:
      "Match the running image and configuration to the reviewed release; verify rollout and successful user operations.",
  },
  {
    node: "slo",
    question: "Which signal best describes the reliability users experience?",
    choices: [
      "Only the existence of a dashboard",
      "Only the number of machines",
      "Success and latency of a defined user operation measured over an agreed window",
    ],
    answer: 2,
    exercise:
      "Define a user-path SLI/SLO, alert owner and runbook. Introduce a single sandbox failure and record user impact, alert and recovery evidence.",
    verify:
      "Compare request success/latency with the SLO and demonstrate an actionable alert and an owned recovery procedure.",
  },
  {
    node: "multicluster",
    question: "What must exist for meaningful recovery from whole-region loss?",
    choices: [
      "Separate recovery capacity, compatible configuration, data recovery and traffic switching",
      "More Pods in the failed region",
      "A PDB in the primary namespace",
    ],
    answer: 0,
    exercise:
      "Document the standby/recovery design, data consistency, secrets/images, traffic switching and failback. Run the region-loss lesson with and without standby.",
    verify:
      "Record measured restoration time and data freshness during an isolated recovery rehearsal; primary failure must not imply automatic standby creation.",
  },
  {
    node: "slo",
    question: "What demonstrates readiness beyond completing this course?",
    choices: [
      "A screenshot showing green resources",
      "Observed sandbox results and an owned readiness review covering release, routing, security, failures and recovery",
      "Knowing every abbreviation by memory",
    ],
    answer: 1,
    exercise:
      "Produce a sandbox evidence log for deployment, service/external routing, Pod loss, rollout, scaling, security boundaries, dependency diagnosis and a tested restore.",
    verify:
      "Record commands, observed behavior, failure impact, ownership, rollback procedure and measured outcomes. Review unresolved risks with the operating team.",
  },
];
function lesson(
  node: string,
  title: string,
  body: string,
  question: string,
  choices: string[],
  answer: number,
  explanation: string,
  exercise: string,
  verify: string,
): FlightStop {
  return {
    node,
    title,
    body,
    phase: "Resource tour",
    anchor: ["pods", "probes", "resources", "configmap"].includes(node)
      ? { x: 826, y: 806 }
      : node === "kubelet"
        ? { x: 754, y: 795 }
        : undefined,
    lesson: { question, choices, answer, explanation, exercise, verify },
  };
}
export const applicationCourse: FlightMission = {
  id: "application",
  title: "From my application to Kubernetes",
  label: "APPLICATION / 32 LEARNING MILESTONES",
  steps: [
    lesson(
      "registry",
      "Start with the application you already have",
      "You have a containerized frontend and API. Record each image, real listening port, configuration, dependencies, startup behavior, and persistent data. We will deploy the API first, then use the same pattern for the frontend.",
      "What must you know before writing a Kubernetes manifest?",
      [
        "The image, listening port, configuration, and dependencies",
        "Only the name of the cluster",
        "How many Services exist in every company",
      ],
      0,
      "Kubernetes runs your processes; it does not infer the application contract from an image name.",
      "Write a two-row inventory for your frontend and API. Record immutable image digests and actual listening ports.",
      "Confirm each image starts locally and answers its documented health endpoint.",
    ),
    lesson(
      "nodes",
      "Choose a safe cluster and an ownership boundary",
      "Use an existing sandbox cluster for these exercises. Decide who maintains cluster upgrades, networking, identity, storage, and compute. The three nodes in this scene represent existing cluster capacity, not application replicas.",
      "What is a worker node?",
      [
        "A YAML file for one HTTP route",
        "A machine where assigned Pods run",
        "A copy of the frontend application",
      ],
      1,
      "Nodes provide compute. Pods are scheduled onto eligible nodes; the number of nodes and replicas are different choices.",
      "Inspect the sandbox context and its nodes. Keep production credentials outside this learning app.",
      "kubectl config current-context; kubectl get nodes",
    ),
    lesson(
      "namespace",
      "Give the application a namespace",
      "A namespace scopes names and many API objects. It is a useful application boundary, but requires RBAC, quotas, and supported network policies to provide the intended isolation.",
      "Does a namespace automatically isolate all application traffic?",
      [
        "Yes, by its name",
        "No; traffic isolation needs an enforcing network policy implementation",
        "Only when it contains two Pods",
      ],
      1,
      "A namespace is an API organization boundary. Network isolation is a separate configuration and enforcement decision.",
      "Prepare a learning namespace manifest and use that namespace for every application command.",
      "Inspect namespace-scoped RBAC and allowed traffic before deploying.",
    ),
    lesson(
      "deployment",
      "Declare how the API should run",
      "Create a Deployment manifest for the API image, Pod template, labels, and desired replica count. In this story, we ask for two API replicas. You create a Deployment; you do not create a Deployment inside a Pod.",
      "Which object should maintain two interchangeable API replicas?",
      [
        "A single manually created Pod",
        "A Deployment with its ReplicaSet",
        "A Secret containing the image name",
      ],
      1,
      "The Deployment manages rollout state; its ReplicaSet maintains the matching Pod count. A standalone Pod has no workload controller to replace it.",
      "Prepare api-deployment.yaml with two replicas, a matching selector and Pod labels, and an immutable image.",
      "Use kubectl diff -n learning -f api-deployment.yaml in your sandbox before applying it.",
    ),
    lesson(
      "api",
      "Submit desired state through the API",
      "Your approved manifest is submitted to the API server. Authentication, RBAC authorization, and admission run before accepted state is stored. This is the management path, separate from user HTTP requests.",
      "Where does a deployment request enter the cluster?",
      [
        "Through an application Service",
        "Through the Kubernetes API server",
        "Directly into the database",
      ],
      1,
      "The API server is the management entry point. Application clients do not need cluster-management credentials.",
      "Validate your manifest in the sandbox with a server-side dry run, then review the diff.",
      "kubectl apply --dry-run=server -n learning -f api-deployment.yaml",
    ),
    lesson(
      "controllers",
      "Controllers create the required Pods",
      "After an accepted Deployment, the Deployment controller creates a ReplicaSet and the ReplicaSet controller creates Pod objects. Our two amber slots now represent desired replicas that are not ready to serve.",
      "Who maintains the Deployment's Pod replica count?",
      [
        "The external DNS server",
        "The ReplicaSet controller",
        "The Service routes create replacement Pods",
      ],
      1,
      "A Service discovers backends. A workload controller reconciles the desired replica count.",
      "Inspect the Deployment, ReplicaSet, and Pods together after applying only in the sandbox.",
      "kubectl get deployment,replicaset,pods -n learning; inspect ownerReferences.",
    ),
    lesson(
      "scheduler",
      "Find a node for each unscheduled Pod",
      "The scheduler chooses eligible nodes using requests, constraints, and available capacity, then records a binding. An unschedulable Pod remains Pending; creating a Service will not fix missing compute.",
      "Why might a Pod remain Pending?",
      [
        "No eligible node satisfies capacity or placement constraints",
        "A Service has not invented its image",
        "The browser has not refreshed the page",
      ],
      0,
      "Inspect scheduling events and requested resources. Eligibility includes constraints as well as free capacity.",
      "Inspect placement and events. Experiment with requests only in a sandbox with a rollback path.",
      "kubectl get pods -n learning -o wide; kubectl describe pod -n learning <pod>",
    ),
    lesson(
      "kubelet",
      "Start containers on the assigned node",
      "The node's kubelet works with the runtime to pull the approved image, mount configuration and volumes, and start containers. The amber slots remain unavailable until startup and readiness succeed.",
      "Who starts an assigned Pod's containers?",
      [
        "The Service selector",
        "The scheduler runs every container itself",
        "The kubelet with the container runtime",
      ],
      2,
      "The scheduler assigns placement. The kubelet carries out the node-side Pod lifecycle.",
      "Inspect startup events, image-pull access, and application logs without printing secrets.",
      "kubectl describe pod -n learning <pod>; kubectl logs -n learning <pod>",
    ),
    lesson(
      "probes",
      "Make readiness meaningful",
      "Define startup and readiness checks for the actual application. Liveness should restart a stuck process, not amplify a dependency outage. The two green API replicas now represent startup and readiness succeeding.",
      "Which probe gates eligibility for new Service traffic?",
      ["Readiness", "Liveness alone", "The container image tag"],
      0,
      "Readiness decides whether a Pod is eligible for new traffic. Running, ready, and successful business requests are different signals.",
      "Add appropriate probes to the Deployment. Review timing and shutdown behavior before rollout.",
      "Observe Pod readiness and EndpointSlice conditions as a sandbox replica initializes.",
    ),
    lesson(
      "service",
      "Give the API a stable backend identity",
      "Create api-service.yaml with a selector matching API Pod labels. Its targetPort must match the process's listening port. The Service and EndpointSlice metadata identify eligible backends; a Service does not keep Pods alive.",
      "What connects a Service to its intended Pods?",
      [
        "Matching selectors and Pod labels",
        "The order of YAML files on your laptop",
        "Giving every Pod the Service's name",
      ],
      0,
      "Selector mismatches can produce zero endpoints. A wrong targetPort can make ready endpoints unreachable.",
      "Prepare a ClusterIP API Service. Review selectors, port, and targetPort against the application inventory.",
      "kubectl get service,endpointslice -n learning; verify selectors and ready endpoint addresses.",
    ),
    lesson(
      "coredns",
      "Deploy the frontend and connect it correctly",
      "Use a separate frontend Deployment and Service. The scene now models two frontend and two API replicas. Frontend server processes can resolve cluster Service names; a user's browser cannot resolve cluster-only DNS. Configure browser requests through the public application route.",
      "Can an external browser call api.learning.svc.cluster.local directly?",
      [
        "Yes, every Kubernetes Service name is public",
        "No; expose an intended public route or proxy for browser requests",
        "Only if the API has two replicas",
      ],
      1,
      "Cluster DNS is for cluster discovery. The browser's network location and the frontend server's network location differ.",
      "Prepare frontend-deployment.yaml and frontend-service.yaml. Decide whether the frontend proxies API requests or uses a public API route.",
      "Test discovery from a sandbox Pod and separately test the browser-facing API URL.",
    ),
    lesson(
      "configmap",
      "Deliver non-secret configuration",
      "A ConfigMap can supply settings through environment variables or mounted files. Match delivery to how the application reads settings. A setting that the image never reads cannot change its behavior.",
      "Does changing any environment variable automatically reconfigure the app?",
      [
        "Yes, Kubernetes rewrites the application",
        "Only if the application reads that setting through the configured delivery method",
        "Only after creating another Service",
      ],
      1,
      "Configuration is a contract with the process. Some changes require a rollout; mounted data and environment variables have different update behavior.",
      "Prepare non-secret settings and reference them from the appropriate Pod template.",
      "Verify the application's effective behavior without exposing confidential configuration.",
    ),
    lesson(
      "secrets",
      "Handle credentials and identity separately",
      "Use approved secret delivery and least-privilege ServiceAccounts. Base64 is encoding, not encryption. Decide rotation, access, and encryption controls; never put real credentials into this educational app or Git.",
      "Does base64 encoding make a Kubernetes Secret encrypted?",
      ["Yes", "No", "Only when mounted as a file"],
      1,
      "Secret access and protection need explicit security controls. Encoding a value does not protect it.",
      "Review the approved secret source, workload identity, permissions, and rotation procedure. Use placeholders in lab examples.",
      "Review who can read Secrets and the application's required API or external-service permissions.",
    ),
    lesson(
      "gateway",
      "Expose the intended application route",
      "Deploy a supported Gateway or ingress implementation and configure listeners and routes. Gateway API objects configure a data plane; installing a YAML object alone does not create an operating proxy. Plan DNS, TLS, and external reachability.",
      "Does a Gateway object alone forward HTTP traffic?",
      [
        "Yes, the API server becomes the proxy",
        "No; a compatible controller and data plane must implement it",
        "Only for frontend containers",
      ],
      1,
      "Routing APIs describe desired routing. An installed implementation supplies the traffic-serving behavior.",
      "Prepare the supported Gateway and HTTPRoute or ingress equivalent for your sandbox implementation.",
      "Check controller status, accepted routes, TLS, and a real client-to-application request.",
    ),
    lesson(
      "resources",
      "Set realistic resource requests and limits",
      "Requests influence scheduling and capacity planning. Limits can throttle CPU or lead to memory termination. Measure usage rather than copying arbitrary values into every workload.",
      "Which CPU and memory values inform normal scheduling placement?",
      [
        "Resource requests",
        "The Service's port number",
        "Only the number of image layers",
      ],
      0,
      "Requested capacity and observed usage are different. Your settings must support both placement and actual application behavior.",
      "Measure the API and frontend under representative load, then set justified requests and limits.",
      "Inspect scheduling, saturation, CPU throttling, and memory termination during sandbox load tests.",
    ),
    lesson(
      "hpa",
      "Scale the bottleneck with the right control loop",
      "HPA can adjust replica demand using configured metrics. Node autoscaling is a separate integration that supplies compute for eligible unschedulable Pods. More replicas must still initialize and pass readiness.",
      "Does HPA itself provision worker machines?",
      [
        "Yes",
        "No; Pod replica scaling and node provisioning are different loops",
        "Only when a Service is present",
      ],
      1,
      "Replica demand is not usable compute or serving capacity. Quotas, startup, and dependencies can limit scaling.",
      "Prepare an HPA only after the metric pipeline and workload requests are working. Then run the traffic-spike flight.",
      "Observe desired replicas, pending Pods, ready endpoints, and actual client latency together.",
    ),
    lesson(
      "observability",
      "Verify successful requests, not just green Pods",
      "Collect metrics, logs, and traces. Define a user-facing success and latency objective. Four green replicas can coexist with a database outage or a denied network flow.",
      "What best confirms the application works for users?",
      [
        "Only the Pod count",
        "A successful real request plus user-facing error and latency signals",
        "The existence of a Deployment YAML file",
      ],
      1,
      "Infrastructure health is necessary but not sufficient. Observe the application and its dependency boundaries.",
      "Identify your key request, dependencies, error rate, latency, and saturation signals. Run the dependency and policy flights.",
      "Compare synthetic or real user-path results with Pod readiness and dependency health.",
    ),
    lesson(
      "controllers",
      "Predict what happens when a Pod is lost",
      "The workload controller replaces a lost replica. The scheduler assigns the replacement, the kubelet starts it, and readiness allows it to serve. A liveness restart of a container is a different recovery path. Run the Pod-loss flight to see the sequence.",
      "If a managed Pod is deleted, does the Service create its replacement?",
      [
        "Yes",
        "No; the workload controller creates it and the Service discovers ready backends",
        "Only if DNS is restarted",
      ],
      1,
      "Creation, placement, node startup, and traffic eligibility have different owners. Diagnose the failed stage instead of restarting everything.",
      "Run the simulated Pod-loss flight. For a real exercise, use only a disposable sandbox workload and observe owner references, events, and readiness.",
      "Verify replica count recovers, the replacement has a new identity, and a real request succeeds.",
    ),
    lesson(
      "rollout",
      "Release safely and retain a rollback path",
      "A changed Pod template creates a new rollout. Readiness, surge capacity, compatibility, graceful shutdown, and observability determine whether it is safe. A PDB covers supported voluntary evictions, not every failure or rollout action.",
      "What should you verify before declaring a rollout successful?",
      [
        "Only that a new image tag exists",
        "New replicas are ready, real requests succeed, and errors and latency remain acceptable",
        "That every old log file was deleted",
      ],
      1,
      "A completed rollout does not prove application correctness or data compatibility. Keep a reviewed recovery procedure.",
      "Review the Deployment diff and rollback compatibility in staging. Run the rollout flight and inspect the v1-to-v2 transition.",
      "kubectl rollout status deployment/api -n learning; verify user-path behavior and release metrics.",
    ),
    lesson(
      "backup",
      "Separate data recovery from replica replacement",
      "Back up durable data, test restores, and define RTO/RPO. Independent regional recovery requires separate capacity, data recovery, and routing. You now have an application-to-operations map; the next milestone is proving it on a real sandbox cluster.",
      "What demonstrates recovery readiness?",
      [
        "A backup job exists",
        "A tested restore with measured restoration time and data freshness",
        "Six replicas in one region automatically imply regional recovery",
      ],
      1,
      "Recovery needs evidence. Completing understanding checks is a learning milestone, not proof of production expertise.",
      "Build a sandbox evidence log: deployment, service routing, Pod loss, rollout, scaling, denied traffic, dependency failure, and a restore.",
      "Record commands, observations, ownership, rollback steps, and measured results for every exercise.",
    ),
    ...productionChecks.map((check, index) => {
      const story = applicationStories[index + 20];
      return lesson(
        check.node,
        story.question,
        story.answer,
        check.question,
        check.choices,
        check.answer,
        story.without,
        check.exercise,
        check.verify,
      );
    }),
  ].map((stop, index) => ({
    ...stop,
    lesson: { ...stop.lesson!, story: applicationStories[index] },
  })),
};
