# Wrap-up

Congratulations — you've built a complete AI-powered feedback analysis pipeline from scratch!

## What you built

| Step | Technique | Model |
|------|-----------|-------|
| Generate test data | Prompted text generation | Gemma3 |
| Sentiment analysis | Deterministic classification (low temperature) | Gemma3 |
| Semantic clustering | Vector embeddings + cosine similarity | mxbai-embed-large |
| Feature extraction | Structured JSON output from LLM | Gemma3 |
| Response generation | Context-aware prompted generation | Gemma3 |

And it all runs locally — no API keys, no data sent to the cloud — thanks to Docker Model Runner and the Compose `models:` integration.

## Key concepts to take away

- **Docker Model Runner** exposes an OpenAI-compatible API on localhost, so any existing OpenAI SDK code can target local models with a single `baseURL` change
- **Temperature** controls determinism: low values (0.1) for classification, higher values (0.7) for creative generation
- **Embeddings** turn text into vectors that capture semantic meaning — similar text produces similar vectors
- **Cosine similarity** measures how close two vectors are, enabling you to group related content without predefined categories
- **Structured output** (`response_format: { type: 'json_object' }`) makes LLM responses reliably parseable in code

## Where to go next

- **Scale up**: Increase `numComments` in :fileLink[`src/config.js`]{path="src/config.js"} to process a larger dataset
- **Tune clustering**: Adjust `similarityThreshold` to control how broadly or narrowly clusters are defined
- **Swap models**: Replace `$$llmModel$$` with any other model — run `docker model list` and `docker model search` to see what's available
- **Add a web UI**: Wrap the pipeline in an Express server and render `results.json` in a browser
- **Try a different embedding model**: Pull another embeddings model and compare how it affects cluster quality

> [!TIP]
> This same pattern — OpenAI SDK pointing at a local endpoint — transfers directly to the real OpenAI API, Azure OpenAI, or any other OpenAI-compatible provider. When you're ready to move to the cloud, just change `baseURL` and add an API key. Your application code stays the same.
