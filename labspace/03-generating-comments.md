# Generating Synthetic Feedback

Before you can analyze product reviews, you need some reviews to work with. Rather than waiting for real users, you'll use the LLM to generate realistic synthetic feedback for the Jarvis product. This is a common technique when building and testing AI pipelines.

## How your app talks to Docker Model Runner

The secret is that the OpenAI SDK supports a `baseURL` option. When you point it at `http://model-runner.docker.internal/engines/v1` instead of the OpenAI servers, it sends all requests to Docker Model Runner instead. The API is identical — same request shape, same response shape.

```javascript no-run-button no-copy-button
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: process.env.OPENAI_BASE_URL,  // injected by Docker Compose
  apiKey: 'ignored',                     // not required for local models
});
```

This means everything you learn about calling the OpenAI API applies directly to Docker Model Runner — and vice versa. You can swap in a cloud model later without changing your application code.

## Create the comment generator

Create a file named `src/generator.js` with the following content:

```javascript save-as=src/generator.js
import OpenAI from 'openai';
import config from './config.js';

const client = new OpenAI({
  baseURL: config.openai.baseURL,
  apiKey: config.openai.apiKey,
});

export async function generateComments() {
  const comments = [];

  for (let i = 0; i < config.generator.numComments; i++) {
    // Randomly pick a sentiment type and topic for variety
    const type = config.generator.commentTypes[
      Math.floor(Math.random() * config.generator.commentTypes.length)
    ];
    const topic = config.generator.topics[
      Math.floor(Math.random() * config.generator.topics.length)
    ];

    const response = await client.chat.completions.create({
      model: config.openai.model,
      messages: [
        {
          role: 'system',
          content:
            'You generate realistic product reviews for a fictional AI assistant called "Jarvis". ' +
            'Write authentic reviews that real users would post. Be specific and natural.',
        },
        {
          role: 'user',
          content:
            `Write a single ${type} product review about "${topic}" in 1-2 sentences. ` +
            'Write only the review text, nothing else.',
        },
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    const text = response.choices[0].message.content.trim();
    comments.push({
      id: `comment-${i + 1}`,
      text,
      timestamp: new Date().toISOString(),
      metadata: { generatedType: type, generatedTopic: topic },
    });

    process.stdout.write(`\r  Generating comment ${i + 1}/${config.generator.numComments}...`);
  }

  console.log('\r  Done!                                          ');
  return comments;
}
```

Key things to notice:

- **`temperature: 0.7`** — A value between 0 and 1 that controls randomness. Higher values produce more varied output, which is what you want for generating diverse synthetic reviews.
- **`max_tokens: 150`** — Caps the response length to keep things concise.
- The loop tracks progress with `process.stdout.write` so you can watch it run.

## Update the entry point

Now replace `index.js` with a version that calls the generator:

```javascript save-as=index.js
import { mkdir } from 'fs/promises';
import { generateComments } from './src/generator.js';
import { loadJSON, saveJSON } from './src/utils.js';
import config from './src/config.js';

async function main() {
  await mkdir('./data', { recursive: true });

  // Reuse existing comments if already generated — delete data/comments.json to regenerate
  let comments = loadJSON(config.paths.commentsFile);

  if (!comments) {
    console.log('Generating synthetic product comments...');
    comments = await generateComments();
    saveJSON(config.paths.commentsFile, comments);
    console.log(`Saved ${comments.length} comments to ${config.paths.commentsFile}\n`);
  } else {
    console.log(`Loaded ${comments.length} existing comments from ${config.paths.commentsFile}\n`);
  }

  console.log('Sample comments:');
  comments.slice(0, 3).forEach(c => {
    console.log(`  [${c.metadata.generatedType.toUpperCase()}] ${c.text}`);
  });
}

main().catch(console.error);
```

## Run the generator

Build the image and run the app:

1. Build the Docker image:

    ```bash
    docker compose build
    ```

2. Run the app:

    ```bash
    docker compose run --rm app
    ```

    The app will generate 20 comments (this takes a minute or two) and save them to `data/comments.json`. You should see output similar to:

    ```plaintext no-copy-button
    Generating synthetic product comments...
      Generating comment 20/20...
      Done!
    Saved 20 comments to ./data/comments.json

    Sample comments:
      [POSITIVE] Jarvis has completely transformed how I handle my emails...
      [NEGATIVE] The app keeps crashing whenever I try to process large documents...
      [NEUTRAL] Response times are acceptable for most tasks, though it feels sluggish...
    ```

3. Once the app finishes, open :fileLink[data/comments.json]{path="data/comments.json"} to see the generated comments. Notice each comment has `id`, `text`, `timestamp`, and `metadata` with the `generatedType` and `generatedTopic`.

> [!NOTE]
> To regenerate fresh comments (for example if you change the topics or types in `config.js`), delete `data/comments.json` and re-run. The app checks for the file at startup and only generates if it's missing.

You've made your first AI call! Next, you'll add sentiment analysis to classify each comment automatically.
