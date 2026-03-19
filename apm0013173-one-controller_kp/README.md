# Customer Self Service Backend

## Installation

### Image pulling

    kubectl create secret docker-registry pullsecret \
        --docker-server=<your-registry-server> \
        --docker-username=<your-name> \
        --docker-password=<your-password> \
        --docker-email=<your-email>

### Kubernetes

#### Initial

    helm upgrade --install one ./chart \
        --values ./chart/values.<dev|test|perf|prod>.yaml \
        --set ENV=<dev|test|perf|prod>
    helm test one

#### Upgrading

This can be used in CI/CD as it doesn't contain any credentials, but pulls data
from `Secret` already available on the cluster due to `env` being predefined
with `name` of the `Secret` and `key` in it + there's `keep` flag in Helm
annotations in the Secret manifests which prevents the auto-deletion.

    helm upgrade --install one ./chart \
        --values ./chart/values.<dev|test|perf|prod>.yaml \
        --set ENV=<dev|test|perf|prod>

### Template check

    helm template one ./chart \
        --values ./chart/values.<dev|test|perf|prod>.yaml \
        --set ENV=<dev|test|perf|prod>

### Creating sealed secrets

https://github.com/bitnami-labs/sealed-secrets

#### Deployed with

One-time action by hw7243 who knows how because the access to the cluster is
limitted and a ticket https://itrack.web.att.com/browse/AIPSCNS-1038 had to be
opened.

Normally this should be used:

    # add repo
    helm repo add sealed-secrets https://bitnami-labs.github.io/sealed-secrets
    helm repo update
    helm search repo sealed-secrets --versions

    # install
    helm install seal sealed-secrets/sealed-secrets

    # get public+private keys
    kubectl get secret/sealed-secrets-<hash> -o yaml

Keys are stored in passwords.kdbx as certificates.

#### Creating

    kubectl create secret generic secret-name \
        --dry-run --from-literal=foo=bar -o yaml \
    | kubeseal \
        --scope cluster-wide \
        --controller-name=sealed-secrets \
        --format yaml --cert ./chart/seal-public.pem > mysealedsecret.yaml

## Access

    kubectl port-forward service/one 8000
    # then access with http://localhost:8000/one/api/swagger

## Changes

Don't forget to change the Chart (and App) version in Chart.yaml.

    helm upgrade --install one ./chart --values ./chart/values.dev.yaml ...
    helm test one

## Removal

Removes everything defined in the ``templates`` folder i.e. even `Secret`.

    helm uninstall one
