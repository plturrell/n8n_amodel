# n8n Template Library

This directory contains ready-to-import workflow templates that automate the
highest-volume ML/knowledge flows in the aModels platform. Each template is a
standard n8n JSON export that you can drag into the editor (or import via the
CLI) after wiring credentials referenced below.

## Available templates

| File | Scenario | Key nodes |
| --- | --- | --- |
| `training-lln-gnn.json` | Full-data retraining for LNN/GNN models with GPU orchestration and MLOps telemetry. | `SubmitLnnTraining`, `SubmitGnnTraining`, `TelemetryEvent`, `MlopsHttp` |
| `localai-finetune.json` | Lightweight fine-tuning and deployment cycle for LocalAI-hosted adapters. | `DeployLocalAiModel`, `TelemetryEvent` |
| `toom-config-approval.json` | Guided approval workflow for TOOM configuration changes. | `ValidateToomConfig`, `ManualApproval`, `TelemetryEvent` |
| `graph-population.json` | Ingest extraction batches into the Neo4j-based graph knowledge base. | `PublishToGraph`, `TelemetryEvent` |

## Credentials

| Name | Description |
| --- | --- |
| `amodelsApi` | Service account with access to the training, GPU orchestrator, TOOM config, and graph APIs. |
| `telemetryApi` | Credential used by telemetry/observability nodes to emit structured events. |

Workflows refer to these credentials by name. Update the credential names in the
n8n editor if your environment uses different aliases.

## Usage

1. Import the JSON file via **Workflows → Import from file**.
2. Open each “TODO” pinned note node to review environment-specific values
   (dataset IDs, TOOM rule paths, graph namespaces, etc.).
3. Test in the staging n8n deployment before promoting to production.

Every template includes a terminal `TelemetryEvent` node to ensure run results
land in the telemetry exporter service. Feel free to clone and customize the
templates as needed; keeping them in version control lets us review changes in
the same pipeline as the rest of the platform.

