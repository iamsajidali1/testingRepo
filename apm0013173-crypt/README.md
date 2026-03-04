# Crypt

Uses HTTP:8000 => nginx <- socket -> uWSGI <- lib -> Python/Django

## Deployment

### Helm

#### First installation

    helm install crypt ./chart --values ./chart/values.local.yaml
    helm test crypt

#### Changes

Don't forget to change the Chart (and App) version in Chart.yaml.

    helm upgrade --install crypt ./chart --values ./chart/values.local.yaml
    helm test crypt

#### Deleting

Removes all non-Secret related manifests from Kubernetes such as Deployment,
Service, LGWService, etc.

    helm uninstall crypt

### CDP

!!!

(Note: don't use ToolBox for Helm yet, wait till I fix it)

    kubectl config use-context <context for ENV>
    helm upgrade --install crypt ./chart/ --values ./chart/values.<ENV>.yaml

Also, LGW mapping (from fresh install) is SLOW and will return 500, 502, etc
until it finally works (after ~10min).
!!!

Use ToolBox with `createproject` to generate the `Jenkinsfile` if not present,
then deploy on a Jenkins 2.x with an Eco pipeline (will supply cluster url,
and other variables).
