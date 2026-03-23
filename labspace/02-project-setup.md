# Project Setup & Docker Model Runner

With your models pulled and ready, it's time to set up the project. This section walks through the starter files that are already in your workspace, then has you create the `compose.yaml` that wires everything together.

## Explore the project structure

Open the file explorer and take a look at what's already in your workspace:

```plaintext no-copy-button
.
├── Dockerfile          # Builds the Node.js app image
├── package.json        # Dependencies (just the openai SDK)
├── index.js            # Entry point (starter — you'll replace this)
└── src/
    ├── config.js       # Central configuration (read env vars, set defaults)
    └── utils.js        # Shared helpers (cosine similarity, file I/O)
```

## Read the configuration

Open :fileLink[src/config.js]{path="src/config.js"} and read through it.

A few things to note:

- `baseURL` defaults to `http://localhost:12434/engines/v1` — that's where Docker Model Runner listens
- `apiKey` is set to `'ignored'` — Docker Model Runner doesn't require authentication
- `model` and `embedding.model` are read from environment variables that Docker Compose will inject

```javascript no-run-button no-copy-button
baseURL: process.env.OPENAI_BASE_URL || 'http://localhost:12434/engines/v1',
apiKey: 'ignored',
model: process.env.LLM_MODEL || 'ai/gemma3',
```

The `|| 'fallback'` pattern means the code also works when running directly with `node` outside of Docker Compose, which is handy for quick debugging.

## Read the utilities

Open :fileLink[src/utils.js]{path="src/utils.js"} and look at the `cosineSimilarity` function. You'll use this heavily in the clustering section — don't worry about the math for now, just note that it takes two arrays of numbers and returns a score between 0 and 1.

## Install dependencies

```bash
npm install
```

This installs the `openai` package, which is the only dependency. You'll use it as a client for Docker Model Runner's OpenAI-compatible API.

## Create the Compose file

This is the key step. Docker Compose has a `models:` key that tells it which AI models your service needs. When you run `docker compose up`, Compose automatically:

1. Ensures the models are available via Docker Model Runner
2. Injects environment variables pointing to the correct endpoint and model names

Create a file named `compose.yaml` with the following content:

```yaml save-as=compose.yaml
services:
  app:
    build: .
    volumes:
      - ./data:/usr/local/app/data
    models:
      llm:
        endpoint_var: OPENAI_BASE_URL
        model_var: LLM_MODEL
      embeddings:
        model_var: EMBEDDINGS_MODEL

models:
  llm:
    model: $$llmModel$$
  embeddings:
    model: ai/mxbai-embed-large
```

Let's break this down:

- **The `models:` block at the bottom** declares which AI models the project depends on — similar to how `volumes:` or `networks:` declares infrastructure. Each entry maps a short name (like `llm`) to an actual model identifier.

- **The `models:` key inside the `app` service** tells Compose which declared models this service needs, and what environment variables to inject:

    - `endpoint_var: OPENAI_BASE_URL` — sets the base URL for the Docker Model Runner API (only needed once, since both models share the same endpoint)
    - `model_var: LLM_MODEL` — sets `LLM_MODEL` to `$$llmModel$$`
    - `model_var: EMBEDDINGS_MODEL` — sets `EMBEDDINGS_MODEL` to `ai/mxbai-embed-large`

- **The `volumes:` mount** persists the `data/` directory on your host so generated comments and results survive across container runs.

> [!NOTE]
> You only need `endpoint_var` on one of the model entries. Both models are served from the same Docker Model Runner endpoint, so setting `OPENAI_BASE_URL` once is enough.

## Verify the environment injection

Build the image and run the starter `index.js` to confirm the environment variables are being set correctly:

1. Build the Docker image:

    ```bash
    docker compose build
    ```

2. Run the container:

    ```bash
    docker compose run --rm app
    ```

    You should see output like:

    ```plaintext no-copy-button
    AI Product Reviewer — Environment Check
    =========================================
    OPENAI_BASE_URL  : http://model-runner.docker.internal/engines/v1
    LLM_MODEL        : $$llmModel$$
    EMBEDDINGS_MODEL : ai/mxbai-embed-large
    ```

> [!IMPORTANT]
> The `OPENAI_BASE_URL` will be different inside the container than on your host. Docker Compose sets it to `http://model-runner.docker.internal/engines/v1`, which routes to Docker Model Runner from inside the container network. Your `config.js` default (`http://localhost:12434/engines/v1`) is for running outside Docker.

All three environment variables should be set. In the next section, you'll make your first real AI call — generating synthetic product reviews.
