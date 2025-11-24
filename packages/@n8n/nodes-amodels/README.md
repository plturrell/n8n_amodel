# @n8n/nodes-amodels

Custom n8n nodes for integrating aModels services into your workflows.

## Features

This package provides the following custom nodes:

### 🔍 OCR Node
Extract text from images using DeepSeek OCR service.

**Features:**
- Multiple input types (binary, URL, base64)
- Language detection and selection
- Bounding box extraction
- Confidence thresholding
- Image preprocessing options

**Use Cases:**
- Document digitization
- Receipt processing
- Form data extraction
- Image-to-text pipelines

### 🌐 Translation Node
Translate text using JEPA translation service.

**Features:**
- Multiple translation methods (beam search, greedy, sampling)
- Auto language detection
- Alternative translations
- Formatting preservation
- Configurable quality/speed tradeoff

**Use Cases:**
- Multilingual content creation
- Document translation
- Real-time translation workflows
- Localization pipelines

### 🧠 LNN & GNN Training Nodes
Submit lattice and graph neural network jobs to the GPU orchestrator directly from n8n.

**Features:**
- Parameterize dataset IDs, topology tags, and hyperparameters per run
- Metadata/notes persisted with every training job
- Continue-on-fail support to keep multi-model workflows moving

**Use Cases:**
- Nightly full retraining of LNN/GNN models
- Emergency replays using pre-approved datasets
- Coordinated rollouts that span GPU jobs + telemetry

### 🧩 LocalAI Deployment Node
Fine-tune adapters and deploy them to LocalAI runtimes (staging, shadow, prod).

**Features:**
- Accepts base model, dataset URI, deployment channel
- Optional auto-promote flag with metadata JSON blob
- Returns deployment + adapter identifiers for downstream steps

### 🌐 Publish To Graph Node
Validate extraction payloads before loading them into the Neo4j-based knowledge graph.

**Features:**
- Pluggable validation modes (checksum/counts/none)
- Namespaced graph ingestion
- Returns ingestion summaries for telemetry

### 🛡️ TOOM Config Validation Node
Perform gateway-grade validation for TOOM configuration bundles.

**Features:**
- Works with git paths, S3 URLs, or HTTP endpoints
- Strict vs warning-only validation toggles
- Emits the diff/summary returned by the TOOM service

### 🤖 Model Inference Node
Run inference on trained aModels models.

**Features:**
- Support for any trained model
- Batch processing
- Configurable generation parameters
- Probability outputs
- Flexible input/output formats

**Use Cases:**
- Custom model deployment
- Batch predictions
- A/B testing models
- Production inference pipelines

### 🔌 Gateway API Node
General-purpose node for calling aModels Gateway API endpoints.

**Features:**
- Full REST API support
- Custom headers and authentication
- Request/response transformation
- Error handling
- Rate limiting support

**Use Cases:**
- Custom integrations
- Advanced workflows
- API testing
- Data synchronization

## Installation

### Option 1: Install from npm (when published)

```bash
npm install @n8n/nodes-amodels
```

### Option 2: Install from local directory

```bash
cd /path/to/n8n
npm install /path/to/aModels/infrastructure/third_party/n8n/packages/@n8n/nodes-amodels
```

### Option 3: Link for development

```bash
cd /path/to/aModels/infrastructure/third_party/n8n/packages/@n8n/nodes-amodels
npm link

cd /path/to/n8n
npm link @n8n/nodes-amodels
```

## Configuration

### Setting up aModels API Credentials

1. In n8n, go to **Credentials** → **New**
2. Search for "aModels API"
3. Enter your configuration:
   - **Gateway URL**: Your aModels Gateway URL (e.g., `http://localhost:8000`)
   - **API Key**: Your aModels API key

### Using the Nodes

1. Create a new workflow
2. Search for "aModels" in the node search
3. Add the desired node to your workflow
4. Select your aModels API credentials
5. Configure the node parameters
6. Execute the workflow

## Node Documentation

### OCR Node

**Parameters:**
- **Operation**: Extract Text | Extract with Bounding Boxes
- **Input Type**: Binary Data | URL | Base64
- **Language**: Auto | English | Arabic | Chinese
- **Confidence Threshold**: 0-1 (default: 0.5)
- **Additional Options**:
  - Detect Orientation
  - Remove Noise
  - Enhance Contrast

**Output:**
```json
{
  "text": "Extracted text content",
  "confidence": 0.95,
  "language": "en",
  "bounding_boxes": [...],
  "processing_time": 1.23
}
```

### Translation Node

**Parameters:**
- **Text**: Text to translate
- **Source Language**: Auto | English | Arabic | etc.
- **Target Language**: English | Arabic | etc.
- **Method**: Beam Search | Greedy | Sampling
- **Additional Options**:
  - Temperature (for sampling)
  - Beam Width (for beam search)
  - Max Length
  - Preserve Formatting
  - Return Alternatives

**Output:**
```json
{
  "original_text": "Hello world",
  "translated_text": "مرحبا بالعالم",
  "source_language": "en",
  "target_language": "ar",
  "confidence": 0.98,
  "alternatives": [...],
  "processing_time": 0.45
}
```

### Model Inference Node

**Parameters:**
- **Model ID**: ID of the trained model
- **Input Data**: JSON input for the model
- **Batch Processing**: Enable for multiple inputs
- **Additional Options**:
  - Temperature
  - Max Tokens
  - Top P
  - Return Probabilities

**Output:**
```json
{
  "model_id": "model-123",
  "input": {...},
  "output": {...},
  "predictions": [...],
  "probabilities": [...],
  "processing_time": 0.89
}
```

## Example Workflows

### Document Processing Pipeline

```
Webhook → OCR Node → Translation Node → Database
```

1. Receive document via webhook
2. Extract text using OCR
3. Translate to target language
4. Store in database

### Batch Inference Workflow

```
Schedule → Load Data → Model Inference → Export Results
```

1. Run on schedule
2. Load data from source
3. Run batch inference
4. Export results to file/API

### Multilingual Content Creation

```
HTTP Request → Translation Node (x3) → Merge → Publish
```

1. Fetch source content
2. Translate to multiple languages in parallel
3. Merge translations
4. Publish to CMS

## Development

### Building the Package

```bash
npm install
npm run build
```

### Running Tests

```bash
npm test
```

### Linting

```bash
npm run lint
npm run lintfix
```

## Troubleshooting

### Node not appearing in n8n

1. Ensure the package is installed correctly
2. Restart n8n
3. Check n8n logs for errors
4. Verify package.json `n8n` section is correct

### Authentication errors

1. Verify Gateway URL is correct
2. Check API key is valid
3. Ensure Gateway is running and accessible
4. Test credentials using the "Test" button

### API errors

1. Check Gateway logs for detailed errors
2. Verify input data format
3. Ensure service is running (OCR, Translation, etc.)
4. Check network connectivity

## Support

For issues and questions:
- GitHub Issues: [aModels/n8n-nodes-amodels](https://github.com/amodels/n8n-nodes-amodels/issues)
- Documentation: [docs.amodels.io](https://docs.amodels.io)
- Email: support@amodels.io

## License

MIT

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## Changelog

### 1.0.0 (Initial Release)

- OCR Node with DeepSeek integration
- Translation Node with JEPA integration
- Model Inference Node
- Gateway API Node
- aModels API credentials
