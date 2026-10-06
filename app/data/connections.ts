import type { WorldLink } from "./world";
const explanations: Record<string, [string, string]> = {
  "clients:waf": [
    "Evaluate the incoming request",
    "When deployed, edge protection can check an incoming request before forwarding it. WAF and CDN are external capabilities, not components that Kubernetes installs automatically.",
  ],
  "clients:dns": [
    "Resolve a destination",
    "The client asks DNS for an address. This dashed dependency represents name resolution. Application packets do not travel through a DNS server as a proxy.",
  ],
  "dns:loadbalancer": [
    "Return an externally reachable address",
    "DNS records lead the client to the traffic endpoint. Changes depend on authoritative records, health routing, resolver caches and TTLs; a cluster does not manage all of these by itself.",
  ],
  "waf:loadbalancer": [
    "Forward to the application endpoint",
    "The external edge forwards the permitted connection toward the load-balancing endpoint. Actual ordering and network hops depend on the chosen platform.",
  ],
  "loadbalancer:gateway": [
    "Reach the implemented gateway",
    "A configured load-balancer integration delivers traffic to the gateway data plane. Kubernetes objects describe intent; a working controller and network implementation must provide the reachable endpoint.",
  ],
  "gateway:service": [
    "Select the application's backend",
    "A gateway matches its configured listener, hostname and route. The route identifies a Service backend. The packet implementation may forward through a virtual Service address or directly to Pod endpoints.",
  ],
  "service:pods": [
    "Use ready application endpoints",
    "Service selectors identify the application Pods. EndpointSlice metadata lists backends and readiness conditions. The forwarding implementation uses eligible endpoints; the Service API object itself is not a running proxy process.",
  ],
  "pods:database": [
    "Call an application dependency",
    "The application connects to its configured data service using permitted networking, credentials and connection limits. Database health is separate from whether the application Pods are Running or marked ready.",
  ],
  "pods:pvc": [
    "Mount persistent application data",
    "The Pod references a claim; the storage system supplies the volume through the CSI implementation where applicable. This dependency line is not an application request hop through the PVC API object.",
  ],
  "pods:observability": [
    "Observe the workload and user path",
    "Collect configured metrics, logs and traces. Some telemetry is scraped, some pushed, and some collected by agents. The line groups this responsibility rather than prescribing one transport or product.",
  ],
  "git:ci": [
    "Build from a reviewed change",
    "A repository change triggers the configured build pipeline. The pipeline tests the code and builds an artifact. Kubernetes does not provide a CI system.",
  ],
  "ci:registry": [
    "Publish the built image",
    "The build publishes the immutable image to a registry after the chosen verification steps. Use an approved artifact identity for promotion; a mutable tag alone does not prove what runs.",
  ],
  "git:gitops": [
    "Read the intended configuration",
    "An optional GitOps controller reads reviewed desired configuration. Its permissions and reconciliation boundaries are explicit platform decisions.",
  ],
  "gitops:api": [
    "Reconcile declarative resources",
    "The optional controller authenticates to the Kubernetes API and reconciles the intended resources. Admission, authorization and validation still apply.",
  ],
  "api:etcd": [
    "Persist Kubernetes API state",
    "The API server stores durable resource state in etcd. Application requests do not go through etcd, and etcd is not a substitute for backing up application volumes or databases.",
  ],
  "api:scheduler": [
    "Observe unscheduled Pods",
    "The scheduler watches API state, finds Pods without a selected node, evaluates feasible nodes, and records a binding through the API. The arrow is a control relationship, not application packet traffic.",
  ],
  "api:controllers": [
    "Observe and reconcile state",
    "Controllers watch Kubernetes resources through the API. They create or update resources to move observed state toward desired state. Each controller has a specific responsibility.",
  ],
  "controllers:deployment": [
    "Maintain workload intent",
    "The Deployment controller manages ReplicaSets; the ReplicaSet controller maintains replicas. All resource changes happen through API operations. The line groups that reconciliation chain.",
  ],
  "deployment:pods": [
    "Create and replace application replicas",
    "A Deployment describes an interchangeable replicated workload. Its ReplicaSets own application Pods. A failed Pod is replaced with a new identity; it is not resurrected.",
  ],
  "scheduler:nodes": [
    "Choose an eligible node",
    "The scheduler evaluates requests, available capacity, affinity, taints, tolerations and topology, then records a Pod-to-node binding. The kubelet on that node starts containers through its runtime; the scheduler does not launch them directly.",
  ],
  "hpa:deployment": [
    "Change the requested replica count",
    "HPA evaluates its configured metrics and updates the workload's scale target. Metrics need a working pipeline. More requested replicas may stay Pending until eligible compute exists.",
  ],
  "coredns:service": [
    "Resolve in-cluster Service names",
    "Cluster DNS uses Kubernetes Service information to answer names. A DNS answer is discovery information; CoreDNS is not in the application data path after the name resolves.",
  ],
  "cni:nodes": [
    "Provide Pod connectivity",
    "The selected network implementation sets up Pod networking across nodes. CNI is an interface and integration boundary; routing, encapsulation, address management and policy enforcement depend on the chosen implementation.",
  ],
  "rbac:api": [
    "Authorize API operations",
    "Identity, RBAC and admission control govern API requests. They decide who may perform an operation and whether a resource is accepted. NetworkPolicy governs a different boundary: permitted network flows.",
  ],
  "networkpolicy:pods": [
    "Enforce permitted Pod traffic",
    "NetworkPolicy declares allowed network access selected by labels, ports and peers. A compatible network implementation must enforce it. A deny rule can break requests while every Pod remains ready.",
  ],
  "registry:nodes": [
    "Pull the approved container image",
    "The kubelet asks the container runtime to pull the required image from the registry using configured access. An unreachable registry or incorrect credentials can prevent a scheduled Pod from starting.",
  ],
};
export function explainConnection(link: WorldLink) {
  const [title, body] = explanations[`${link.from}:${link.to}`] ?? [
    "Inspect this architecture boundary",
    "Follow the responsibilities of both components and verify the installed implementation.",
  ];
  return {
    title,
    body,
    kind:
      link.kind === "traffic"
        ? "APPLICATION REQUEST PATH"
        : link.kind === "control"
          ? "CONTROL / RECONCILIATION"
          : "DEPENDENCY / METADATA",
    note:
      link.kind === "traffic"
        ? "A logical request path. Exact forwarding hops depend on your gateway and network implementation."
        : link.kind === "control"
          ? "Controllers and node agents coordinate through Kubernetes API operations. This is not a route for user packets."
          : "A dependency or discovery relationship. Do not read this line as an application packet passing through an API object.",
  };
}
