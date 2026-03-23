# Sentiment Analysis

You have 20 product reviews. Now you need to classify each one: is the user happy, unhappy, or somewhere in between? This is **sentiment analysis** — one of the most common uses of language models in production applications.

## How sentiment analysis with an LLM works

Rather than training a specialized classifier, you can use a general-purpose LLM and give it clear instructions via the system prompt. The trick is making the output **deterministic and structured**.

When you ask a person "Is this review positive, negative, or neutral?" you might get back "I think it's mostly positive, with a slight negative undertone." That's great for a human but impossible to parse reliably in code. You need the model to output exactly one word from a fixed list.

Two settings control this:

**`temperature: 0.1`** — Near zero means the model almost always picks the highest-probability next token. You lose creativity, but gain consistency. For classification tasks, that's exactly what you want.

**`max_tokens: 10`** — Limits the response to a handful of tokens. If the model can only output 10 tokens and you've told it to respond with one word, there's no room to add caveats or explanations.

## Create the categorizer

Create a file named `src/processor/categorizer.js`:

```javascript save-as=src/processor/categorizer.js
import OpenAI from 'openai';
import config from '../config.js';

const client = new OpenAI({
  baseURL: config.openai.baseURL,
  apiKey: config.openai.apiKey,
});

const VALID_CATEGORIES = ['positive', 'negative', 'neutral'];

async function categorizeComment(comment) {
  const response = await client.chat.completions.create({
    model: config.openai.model,
    messages: [
      {
        role: 'system',
        content:
          'You are a sentiment analysis system. Classify the sentiment of product reviews. ' +
          'Respond with exactly one word: positive, negative, or neutral.',
      },
      {
        role: 'user',
        content: comment.text,
      },
    ],
    temperature: 0.1,
    max_tokens: 10,
  });

  const result = response.choices[0].message.content.trim().toLowerCase();
  // Fall back to 'neutral' if the model returns something unexpected
  return VALID_CATEGORIES.includes(result) ? result : 'neutral';
}

export async function categorizeComments(comments) {
  const results = [];

  for (let i = 0; i < comments.length; i++) {
    process.stdout.write(`\r  Categorizing comment ${i + 1}/${comments.length}...`);
    const category = await categorizeComment(comments[i]);
    results.push({ ...comments[i], category });
  }

  console.log('\r  Done!                                          ');
  return results;
}
```

## Create the processor orchestrator

The processor will be your pipeline's coordinator — it calls each step in sequence and collects results. You'll expand it in later sections. For now, it just handles categorization.

Create a file named `src/processor/index.js`:

```javascript save-as=src/processor/index.js
import { categorizeComments } from './categorizer.js';

export async function processComments(comments) {
  console.log('Step 1: Analyzing sentiment...');
  const categorized = await categorizeComments(comments);

  const categories = categorized.reduce((acc, c) => {
    acc[c.category] = (acc[c.category] || 0) + 1;
    return acc;
  }, {});

  console.log('  Breakdown:', JSON.stringify(categories));

  return {
    metadata: {
      totalComments: comments.length,
      processedAt: new Date().toISOString(),
      categories,
    },
    comments: categorized,
    features: [],
  };
}
```

## Update the entry point

Update `index.js` to call the processor after loading (or generating) comments:

```javascript save-as=index.js
import { mkdir } from 'fs/promises';
import { generateComments } from './src/generator.js';
import { processComments } from './src/processor/index.js';
import { loadJSON, saveJSON } from './src/utils.js';
import config from './src/config.js';

async function main() {
  await mkdir('./data', { recursive: true });

  let comments = loadJSON(config.paths.commentsFile);

  if (!comments) {
    console.log('Generating synthetic product comments...');
    comments = await generateComments();
    saveJSON(config.paths.commentsFile, comments);
    console.log(`Saved ${comments.length} comments\n`);
  } else {
    console.log(`Loaded ${comments.length} existing comments\n`);
  }

  const results = await processComments(comments);
  saveJSON(config.paths.resultsFile, results);

  console.log('\nDone! Results saved to', config.paths.resultsFile);
}

main().catch(console.error);
```

## See it run

Rebuild the image (the new source files need to be copied in) and run the app:

1. Rebuild:

    ```bash
    docker compose build
    ```

2. Run:

    ```bash
    docker compose run --rm app
    ```

You'll see the sentiment breakdown printed after categorization:

```plaintext no-copy-button
Loaded 20 existing comments

Step 1: Analyzing sentiment...
  Done!
  Breakdown: {"positive":12,"negative":5,"neutral":3}

Done! Results saved to ./data/results.json
```

Open :fileLink[data/results.json]{path="data/results.json"} and look at the comments array — each comment now has a `category` field added by the LLM.

> [!TIP]
> Notice how the `category` field often matches the `metadata.generatedType` — but not always! The model independently classifies the text, which can differ from the label used when generating it. That's expected and even useful; it confirms the classifier is reading the actual text rather than relying on metadata.

In the next section, you'll go beyond simple labels and group related comments together using **embeddings** — a technique that captures semantic meaning as numbers.
