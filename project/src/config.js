const config = {
  openai: {
    // Docker Model Runner exposes an OpenAI-compatible API locally.
    // The OPENAI_BASE_URL env var is injected by Docker Compose via the models: key.
    baseURL: process.env.OPENAI_BASE_URL || 'http://localhost:12434/engines/v1',
    // Docker Model Runner does not require authentication.
    apiKey: 'ignored',
    // The model name is injected by Docker Compose via the models: key.
    model: process.env.LLM_MODEL || 'ai/gemma3',
    embedding: {
      model: process.env.EMBEDDINGS_MODEL || 'ai/mxbai-embed-large',
    },
  },
  generator: {
    numComments: 20,
    commentTypes: ['positive', 'negative', 'neutral'],
    topics: [
      'user interface',
      'response quality',
      'accuracy',
      'bugs',
      'pricing',
      'performance',
      'documentation',
      'customer support',
      'features',
      'ease of use',
    ],
  },
  processor: {
    clustering: {
      // Two comments with cosine similarity >= this threshold will be placed in the same cluster.
      similarityThreshold: 0.75,
    },
  },
  paths: {
    commentsFile: './data/comments.json',
    resultsFile: './data/results.json',
  },
};

export default config;
