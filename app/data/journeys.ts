export interface Journey {
  id: string;
  title: string;
  label: string;
  description: string;
  steps: { node: string; title: string; body: string }[];
}
export const journeys: Journey[] = [
  {
    id: "request",
    title: "Follow a request",
    label: "01 / REQUEST LIFECYCLE",
    description:
      "From a client to a ready application replica. This is a logical flow; the exact network hops vary by implementation.",
    steps: [
      {
        node: "clients",
        title: "A client asks for the application",
        body: "The client resolves a hostname and opens a connection. Cluster-management credentials are not involved.",
      },
      {
        node: "dns",
        title: "DNS finds the destination",
        body: "DNS selects an endpoint. Regional routing and cached answers affect failover time.",
      },
      {
        node: "waf",
        title: "Optional edge protection evaluates traffic",
        body: "Where deployed, edge protection checks requests before forwarding. CDN and WAF order depends on the platform.",
      },
      {
        node: "loadbalancer",
        title: "An endpoint accepts the connection",
        body: "A provider or on-premises integration makes the traffic endpoint reachable.",
      },
      {
        node: "gateway",
        title: "The implemented gateway chooses a route",
        body: "A gateway data plane matches a listener, hostname, and HTTPRoute. The Gateway API objects configure that behavior.",
      },
      {
        node: "service",
        title: "The Service identifies ready backends",
        body: "The route references a Service. EndpointSlice metadata describes ready backends; forwarding may use a virtual IP or go directly to a Pod.",
      },
      {
        node: "pods",
        title: "A ready Pod handles the request",
        body: "The application listens on its actual container port. Requests do not pass through etcd or the scheduler.",
      },
      {
        node: "database",
        title: "The application accesses a dependency",
        body: "Where needed, the Pod uses permitted networking, authentication, and a bounded connection pool. The response returns to the client.",
      },
    ],
  },
  {
    id: "deploy",
    title: "Deploy a release",
    label: "02 / DESIRED STATE",
    description:
      "Understand the chain from a reviewed change to running containers.",
    steps: [
      {
        node: "git",
        title: "Review the change",
        body: "Record application and configuration changes. Use an immutable artifact identity for promotion.",
      },
      {
        node: "ci",
        title: "Build and verify",
        body: "CI runs tests and security checks. It publishes a release only after the relevant checks pass.",
      },
      {
        node: "registry",
        title: "Store the image",
        body: "The registry holds image content. Nodes need their own permitted pull path and credentials.",
      },
      {
        node: "gitops",
        title: "Reconcile the approved manifests",
        body: "An optional GitOps controller submits reviewed desired state to each target cluster. A pipeline can also deploy directly.",
      },
      {
        node: "api",
        title: "Authenticate, authorize, and admit",
        body: "The API server evaluates identity, RBAC, and admission before recording the object.",
      },
      {
        node: "deployment",
        title: "Create the next ReplicaSet",
        body: "A changed Pod template creates a new rollout. The ReplicaSet controller maintains its desired Pod count.",
      },
      {
        node: "scheduler",
        title: "Find eligible capacity",
        body: "The scheduler uses requests and placement constraints, then binds each unscheduled Pod to a node.",
      },
      {
        node: "kubelet",
        title: "Start and verify the containers",
        body: "The kubelet invokes the runtime, configures the Pod, and evaluates health. Ready endpoints make the new replica eligible for traffic.",
      },
    ],
  },
  {
    id: "scale",
    title: "Handle a traffic spike",
    label: "03 / ELASTIC CAPACITY",
    description: "Pod scaling and compute scaling are different control loops.",
    steps: [
      {
        node: "observability",
        title: "Observe demand and performance",
        body: "Metrics reflect load and user experience. Avoid a scaling signal that misses the actual bottleneck.",
      },
      {
        node: "hpa",
        title: "Request more replicas",
        body: "HPA adjusts the desired workload replica count within bounds using the configured metric pipeline.",
      },
      {
        node: "scheduler",
        title: "Schedule against requests",
        body: "The scheduler places new Pods if eligible nodes have sufficient requested capacity.",
      },
      {
        node: "autoscaler",
        title: "Provision capacity when necessary",
        body: "A supported node autoscaler can add eligible nodes for unschedulable Pods. Quota and provisioning delay still apply.",
      },
      {
        node: "probes",
        title: "Wait for initialization and readiness",
        body: "New capacity is not usable application capacity until images, startup, and readiness complete.",
      },
      {
        node: "service",
        title: "Add ready endpoints",
        body: "New ready replicas become eligible backends. Connection and dependency capacity must support the larger replica count.",
      },
    ],
  },
  {
    id: "recover",
    title: "Recover from failure",
    label: "04 / RESILIENCE",
    description:
      "Distinguish container recovery, node recovery, and regional disaster recovery.",
    steps: [
      {
        node: "probes",
        title: "Detect unhealthy application state",
        body: "Readiness removes an unhealthy endpoint from eligible traffic. Liveness only restarts a container after its configured failures.",
      },
      {
        node: "controllers",
        title: "Reconcile lost replicas",
        body: "Workload controllers maintain desired replicas. Node failure handling has detection and eviction delays.",
      },
      {
        node: "affinity",
        title: "Place replacement Pods safely",
        body: "Topology spread and eligible spare capacity influence replacement placement. Volumes can restrict where stateful Pods run.",
      },
      {
        node: "pdb",
        title: "Respect planned disruption budgets",
        body: "A PDB constrains supported voluntary evictions. It cannot prevent the original hardware or zone failure.",
      },
      {
        node: "backup",
        title: "Restore durable data if required",
        body: "Data recovery requires a compatible backup or replica and application-specific validation.",
      },
      {
        node: "dr",
        title: "Use an independent regional recovery plan",
        body: "Regional failover requires separate cluster capacity, data recovery or replication, routing, and tested RTO/RPO. Kubernetes does not provide it automatically.",
      },
    ],
  },
];
export const migrationSteps = [
  [
    "Inventory the application",
    "List processes, actual listening ports, dependencies, startup behavior, scheduled work, state, and shutdown semantics.",
    "Pods · Jobs · storage",
  ],
  [
    "Choose the cluster boundary",
    "Decide trust boundaries, availability requirements, cluster lifecycle ownership, and networking before creating workloads.",
    "Namespaces · RBAC · CNI",
  ],
  [
    "Establish access and compute",
    "Configure identity, limited API access, node capacity, topology labels, and an approved image-pull path.",
    "Nodes · ServiceAccounts · registry",
  ],
  [
    "Model each workload",
    "Use Deployments for interchangeable services, Jobs for finite tasks, and StatefulSets only when stable identity is needed.",
    "Controllers · scheduling",
  ],
  [
    "Deliver configuration safely",
    "Separate non-secret configuration from secrets. Match environment or volume delivery to the application consumption method.",
    "ConfigMap · Secret",
  ],
  [
    "Build the request path",
    "Implement the gateway, Services, DNS, TLS, and permitted dependency traffic. Verify selectors and target ports.",
    "Gateway · Service · NetworkPolicy",
  ],
  [
    "Make replicas safe",
    "Implement readiness, suitable liveness, resource requests, graceful shutdown, idempotent work, and database connection budgets.",
    "Probes · resources · lifecycle",
  ],
  [
    "Validate elasticity and failure",
    "Test rollout behavior, Pod loss, a node drain, missing capacity, a dependency outage, and restore using a staging environment.",
    "HPA · PDB · autoscaling",
  ],
  [
    "Release and observe",
    "Promote an immutable artifact, run a real user-path check, and observe latency, errors, and saturation before increasing traffic.",
    "CI/CD · metrics · SLO",
  ],
  [
    "Cut over with a recovery path",
    "Control the traffic switch, keep compatible rollback state, and measure restoration before retiring the original platform.",
    "Routing · backups · RTO/RPO",
  ],
];
