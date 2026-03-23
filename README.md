# Labspace - Building an AI Product Reviewer with Docker Model Runner

AI-powered applications don't require cloud APIs or API keys. With Docker Model Runner, you can run large language models locally and build production-quality AI pipelines entirely on your own machine.

In this Labspace, you'll build a complete feedback analysis pipeline for a fictional AI product called Jarvis — using local LLMs and embeddings via Docker Model Runner.

## Learning objectives

By the end of this Labspace, you will have learned the following:

- How to use Docker Model Runner to run LLMs locally via an OpenAI-compatible API
- How to connect a Node.js app to Docker Model Runner using the OpenAI SDK and the Compose `models:` integration
- How to perform sentiment analysis using low-temperature LLM classification
- What embeddings are and how to use them for semantic clustering with cosine similarity
- How to extract structured data from an LLM using `response_format: { type: 'json_object' }`
- How to generate context-aware responses informed by extracted features

## Launch the Labspace

To launch the Labspace, run the following command:

```bash
docker compose -f oci://dockersamples/labspace-creating-ai-product-reviewer up -d
```

And then open your browser to http://localhost:3030.

### Using the Docker Desktop extension

If you have the Labspace extension installed (`docker extension install dockersamples/labspace-extension` if not), you can also [click this link](https://open.docker.com/dashboard/extension-tab?extensionId=dockersamples/labspace-extension&location=dockersamples/creating-ai-product-reviewer&title=Building%20an%20AI%20Product%20Reviewer%20with%20Docker%20Model%20Runner) to launch the Labspace.


## Contributing

If you find something wrong or something that needs to be updated, feel free to submit a PR. If you want to make a larger change, feel free to fork the repo into your own repository.

**Important note:** If you fork it, you will need to update the GHA workflow to point to your own Hub repo.

1. Clone this repo

2. Start the Labspace in content development mode:

    ```bash
    # On Mac/Linux
    CONTENT_PATH=$PWD docker compose up --watch

    # On Windows with PowerShell
    $Env:CONTENT_PATH = (Get-Location).Path; docker compose up --watch
    ```

3. Open the Labspace at http://localhost:3030.

4. Make the necessary changes and validate they appear as you expect in the Labspace

    Be sure to check out the [docs](https://github.com/dockersamples/labspace-infra/tree/main/docs) for additional information and guidelines.
