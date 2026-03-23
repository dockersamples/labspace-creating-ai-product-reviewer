// Starter file — verifies Docker Model Runner environment variables are set.
// You will replace this content as you work through the lab.

console.log('AI Product Reviewer — Environment Check');
console.log('=========================================');
console.log('OPENAI_BASE_URL  :', process.env.OPENAI_BASE_URL  || '(not set — will use default)');
console.log('LLM_MODEL        :', process.env.LLM_MODEL        || '(not set — will use default)');
console.log('EMBEDDINGS_MODEL :', process.env.EMBEDDINGS_MODEL || '(not set — will use default)');
console.log('');
console.log('Environment looks good! Ready to start building.');
