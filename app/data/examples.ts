export const examples: Record<string, string> = {
  deployment: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: demo
spec:
  replicas: 3
  selector:
    matchLabels: { app: api }
  strategy:
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels: { app: api }
    spec:
      containers:
        - name: api
          # Replace with your verified image digest.
          image: registry.example.com/api@sha256:<digest>
          ports:
            - { name: http, containerPort: 8080 }
          resources:
            requests: { cpu: 250m, memory: 256Mi }
            limits: { memory: 512Mi }
          readinessProbe:
            httpGet: { path: /ready, port: http }
          # Implement /ready in your application.
          # Resource sizes are illustrative, not production sizing.`,
  service: `apiVersion: v1
kind: Service
metadata:
  name: api
  namespace: demo
spec:
  type: ClusterIP
  selector: { app: api }
  ports:
    - name: http
      port: 80
      targetPort: http
# Matching Pods declare a named port "http".
# The process must actually listen on that port.
# This Service does not expose the app publicly.`,
  hpa: `apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata: { name: api, namespace: demo }
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  minReplicas: 3
  maxReplicas: 12
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 65
# Requires resource metrics and CPU requests.
# Validate the target with load testing.`,
  pdb: `apiVersion: policy/v1
kind: PodDisruptionBudget
metadata: { name: api, namespace: demo }
spec:
  minAvailable: 2
  selector:
    matchLabels: { app: api }
# Example assumes at least three replicas.
# Restricts supported voluntary evictions.
# Does not protect against involuntary failures.`,
  networkpolicy: `apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: { name: api-ingress, namespace: demo }
spec:
  podSelector:
    matchLabels: { app: api }
  policyTypes: [Ingress]
  ingress:
    - from:
        - podSelector:
            matchLabels: { app: frontend }
      ports:
        - { protocol: TCP, port: 8080 }
# Permits selected same-namespace callers only.
# Requires an enforcing network implementation.
# Add gateway access if that is the actual caller.`,
  gateway: `# Requires Gateway API CRDs and an implementation.
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata: { name: api, namespace: demo }
spec:
  parentRefs:
    - name: application-gateway
  hostnames: ["app.example.com"]
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /api
      backendRefs:
        - name: api
          port: 80
# Provision the referenced Gateway separately.
# Prefix stripping is not implied by this route.
# TLS listener and certificate settings belong
# to your chosen supported implementation.`,
  configmap: `apiVersion: v1
kind: ConfigMap
metadata: { name: api-settings, namespace: demo }
data:
  LOG_LEVEL: "info"
# Only use keys the application actually reads.
# Configuration here is non-secret.
# envFrom references this object in a Pod template.
# Existing environment variables need a rollout
# to pick up an updated ConfigMap.`,
  rbac: `apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata: { name: pod-reader, namespace: demo }
rules:
  - apiGroups: [""]
    resources: [pods]
    verbs: [get, list, watch]
# Bind only to the intended identity using
# a namespaced RoleBinding.
# Reading Pod logs requires its own permission.
# This role grants no mutation or Secret access.`,
  serviceaccount: `apiVersion: v1
kind: ServiceAccount
metadata: { name: api, namespace: demo }
automountServiceAccountToken: false
# Reference with serviceAccountName in the Pod.
# Enable token access only when it is required.
# External workload federation is an additional,
# provider-specific identity configuration.`,
  namespace: `apiVersion: v1
kind: Namespace
metadata:
  name: demo
  labels:
    team: example
# Add appropriate RBAC, resource quotas,
# admission rules, and network policy.
# A namespace alone is not tenant isolation.`,
  jobs: `apiVersion: batch/v1
kind: CronJob
metadata: { name: report, namespace: demo }
spec:
  schedule: "0 * * * *"
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      backoffLimit: 2
      template:
        spec:
          restartPolicy: Never
          containers:
            - name: report
              image: registry.example.com/report:<version>
# Use an immutable artifact and idempotent work.
# Set resource requests, deadlines, and cleanup.`,
  pvc: `apiVersion: v1
kind: PersistentVolumeClaim
metadata: { name: data, namespace: demo }
spec:
  accessModes: [ReadWriteOnce]
  storageClassName: example-class
  resources:
    requests: { storage: 10Gi }
# The StorageClass must exist and have a driver.
# Check topology and application access needs.
# ReadWriteOnce means one node, not one Pod.
# Backups require a separate recovery process.`,
};
