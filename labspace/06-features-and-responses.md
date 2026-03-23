# Features, Responses & Wrap-up

You have categorized and clustered your reviews. Now for the two final steps:

1. **Feature extraction** — ask the LLM to identify actionable bugs, improvements, or feature requests from each cluster
2. **Response generation** — write a reply to each review, informed by what your team is already working on

## Structured output from an LLM

For feature extraction, you need the LLM to return structured data you can reliably parse in code — not free-form prose. The OpenAI API supports `response_format: { type: 'json_object' }`, which instructs the model to return valid JSON.

Combined with a detailed system prompt that describes the expected schema, this gives you a practical way to extract structured information from natural language:

```javascript no-run-button no-copy-button
const response = await client.chat.completions.create({
  model: config.openai.model,
  messages: [...],
  response_format: { type: 'json_object' },
  temperature: 0.5,
});

const { features } = JSON.parse(response.choices[0].message.content);
```

> [!NOTE]
> Even with `json_object` mode, the model might occasionally return malformed JSON or an unexpected structure. Always wrap parsing in a try/catch with a sensible fallback.

## Create the feature identifier

Create a file named `src/processor/featureId.js`:

```javascript save-as=src/processor/featureId.js
import OpenAI from 'openai';
import config from '../config.js';

const client = new OpenAI({
  baseURL: config.openai.baseURL,
  apiKey: config.openai.apiKey,
});

async function extractFeaturesFromCluster(clusterComments, clusterName) {
  const sampleTexts = clusterComments
    .slice(0, 5)
    .map(c => `- ${c.text}`)
    .join('\n');

  const response = await client.chat.completions.create({
    model: config.openai.model,
    messages: [
      {
        role: 'system',
        content:
          'You are a product manager analyzing user feedback. Extract actionable items from the comments. ' +
          'Return a JSON object with a "features" array. Each item must have: ' +
          'name (string), description (string), ' +
          'type ("Bug" | "Improvement" | "Feature Request"), ' +
          'priority ("High" | "Medium" | "Low").',
      },
      {
        role: 'user',
        content:
          `Theme: "${clusterName}"\n\nComments:\n${sampleTexts}\n\n` +
          'Extract up to 3 actionable features or issues from these comments.',
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.5,
  });

  try {
    const parsed = JSON.parse(response.choices[0].message.content);
    return Array.isArray(parsed.features) ? parsed.features : [];
  } catch {
    return [];
  }
}

export async function identifyFeatures(comments, clusterNames) {
  // Group comments by cluster ID
  const clusterMap = new Map();
  for (const comment of comments) {
    if (!clusterMap.has(comment.clusterId)) {
      clusterMap.set(comment.clusterId, []);
    }
    clusterMap.get(comment.clusterId).push(comment);
  }

  const allFeatures = [];
  const seen = new Set();
  const clusterIds = [...clusterMap.keys()];

  for (let i = 0; i < clusterIds.length; i++) {
    const clusterId = clusterIds[i];
    const clusterComments = clusterMap.get(clusterId);
    const clusterName = clusterNames[clusterId] || `Cluster ${clusterId}`;

    console.log(`  [${i + 1}/${clusterIds.length}] Extracting features from "${clusterName}"...`);
    const features = await extractFeaturesFromCluster(clusterComments, clusterName);
    console.log(`    → found ${features.length} feature(s)`);

    for (const feature of features) {
      const key = feature.name.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        allFeatures.push({ ...feature, clusters: [clusterId] });
      } else {
        // Feature already exists — note that this cluster also mentions it
        const existing = allFeatures.find(f => f.name.toLowerCase() === key);
        if (existing && !existing.clusters.includes(clusterId)) {
          existing.clusters.push(clusterId);
        }
      }
    }
  }

  return allFeatures;
}
```

## Create the response generator

The responder generates a reply to each review. Crucially, it includes any features related to the review's cluster in the prompt — so responses to users complaining about crashes can acknowledge that a fix is in progress.

Create a file named `src/processor/responder.js`:

```javascript save-as=src/processor/responder.js
import OpenAI from 'openai';
import config from '../config.js';

const client = new OpenAI({
  baseURL: config.openai.baseURL,
  apiKey: config.openai.apiKey,
});

async function generateResponse(comment, relatedFeatures) {
  const featureContext =
    relatedFeatures.length > 0
      ? '\n\nRelated improvements in progress:\n' +
        relatedFeatures.map(f => `- ${f.name}: ${f.description}`).join('\n')
      : '';

  const response = await client.chat.completions.create({
    model: config.openai.model,
    messages: [
      {
        role: 'system',
        content:
          'You are a thoughtful customer support representative for Jarvis, an AI assistant product. ' +
          'Write empathetic, professional responses to user feedback. ' +
          'Keep responses to 2-3 sentences. Sign off as "The Jarvis Team".',
      },
      {
        role: 'user',
        content:
          `Write a response to this ${comment.category} feedback:\n\n"${comment.text}"` +
          featureContext,
      },
    ],
    temperature: 0.7,
    max_tokens: 200,
  });

  return response.choices[0].message.content.trim();
}

export async function generateResponses(comments, features) {
  const results = [];

  for (let i = 0; i < comments.length; i++) {
    const comment = comments[i];
    console.log(`  [${i + 1}/${comments.length}] Responding to ${comment.category} comment (cluster ${comment.clusterId})...`);

    const relatedFeatures = features.filter(f =>
      f.clusters.includes(comment.clusterId)
    );

    const responseText = await generateResponse(comment, relatedFeatures);
    results.push({ ...comment, response: responseText });
    console.log(`    → done`);
  }

  return results;
}
```

## Wire everything together

Update `src/processor/index.js` to include all four steps:

```javascript save-as=src/processor/index.js
import { categorizeComments } from './categorizer.js';
import { clusterComments } from './clusterer.js';
import { identifyFeatures } from './featureId.js';
import { generateResponses } from './responder.js';

export async function processComments(comments) {
  console.log('Step 1: Analyzing sentiment...');
  const categorized = await categorizeComments(comments);

  console.log('Step 2: Clustering with embeddings...');
  const { clustered, clusterNames } = await clusterComments(categorized);

  console.log('Step 3: Extracting features...');
  const features = await identifyFeatures(clustered, clusterNames);
  console.log(`  Identified ${features.length} feature(s)/issue(s)`);

  console.log('Step 4: Generating responses...');
  const withResponses = await generateResponses(clustered, features);

  const categories = withResponses.reduce((acc, c) => {
    acc[c.category] = (acc[c.category] || 0) + 1;
    return acc;
  }, {});

  return {
    metadata: {
      totalComments: comments.length,
      processedAt: new Date().toISOString(),
      categories,
      clusters: {
        count: Object.keys(clusterNames).length,
        names: clusterNames,
      },
    },
    comments: withResponses.map(({ embedding, ...rest }) => rest),
    features,
  };
}
```

## Update the entry point for a full summary

Update `index.js` to print a complete summary when the pipeline finishes:

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

  console.log('\n=== Pipeline Complete ===');
  console.log('Sentiment breakdown:');
  for (const [cat, count] of Object.entries(results.metadata.categories)) {
    console.log(`  ${cat}: ${count}`);
  }
  console.log('\nClusters:');
  for (const [id, name] of Object.entries(results.metadata.clusters.names)) {
    console.log(`  ${id}: ${name}`);
  }
  console.log('\nFeatures/Issues identified:');
  results.features.forEach(f => {
    console.log(`  [${f.priority}] ${f.type}: ${f.name}`);
  });
  console.log(`\nFull results saved to ${config.paths.resultsFile}`);
}

main().catch(console.error);
```

## Run the complete pipeline

Rebuild the image and run the full pipeline:

1. Rebuild:

    ```bash
    docker compose build
    ```

2. Run:

    ```bash
    docker compose run --rm app
    ```

The full pipeline will run all four steps. Expect it to take a few minutes — it's making around 60+ LLM API calls. Watch the progress indicators for each step:

```plaintext no-copy-button
Loaded 20 existing comments

Step 1: Analyzing sentiment...
  Done!
Step 2: Clustering with embeddings...
  Generating embeddings...  Done!
  Clustering by semantic similarity...
  Naming clusters...
  Found 4 cluster(s):
    Cluster 1: "Ease of Use and Accuracy" — 11 comment(s)
    Cluster 2: "Crashing and Performance Issues" — 5 comment(s)
    Cluster 3: "Pricing and Value" — 3 comment(s)
    Cluster 4: "Documentation Quality" — 1 comment(s)
Step 3: Extracting features...
  [1/4] Extracting features from "Ease of Use and Accuracy"...
    → found 2 feature(s)
  [2/4] Extracting features from "Crashing and Performance Issues"...
    → found 3 feature(s)
  [3/4] Extracting features from "Pricing and Value"...
    → found 2 feature(s)
  [4/4] Extracting features from "Documentation Quality"...
    → found 1 feature(s)
  Identified 8 feature(s)/issue(s)
Step 4: Generating responses...
  [1/20] Responding to positive comment (cluster 1)...
    → done
  [2/20] Responding to negative comment (cluster 2)...
    → done
  ...
  [20/20] Responding to neutral comment (cluster 1)...
    → done

=== Pipeline Complete ===
Sentiment breakdown:
  positive: 12
  negative: 5
  neutral: 3

Clusters:
  1: Ease of Use and Accuracy
  2: Crashing and Performance Issues
  ...

Features/Issues identified:
  [High] Bug: App Stability on Large Files
  [High] Improvement: Response Time Optimization
  [Medium] Feature Request: Better Onboarding
  ...

Full results saved to ./data/results.json
```

Open :fileLink[data/results.json]{path="data/results.json"} and explore the full output. Each comment in the array now has `category`, `clusterId`, and `response` fields. The `features` array at the top level lists what your product team should act on.

Head to the next section for a recap of what you built and ideas for where to take it next.
