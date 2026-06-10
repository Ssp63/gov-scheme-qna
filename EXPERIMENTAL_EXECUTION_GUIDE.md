# Experimental Execution Guide: Chunking and Retrieval for Bureaucratic PDFs

This document provides a step-by-step plan to conduct the experiments outlined in the research paper draft and fill the result tables.

---

## Phase 1: Data Preparation (Weeks 1-2)

### Task 1.1: Finalize Test Dataset

**What to do:**
1. Collect your 45 government scheme PDFs (already available in your uploads).
2. Create 350+ question-answer pairs with manual ground-truth chunk annotations.

**Deliverable:**
```json
{
  "test_pairs": [
    {
      "qa_id": "Q001",
      "question": "Who is eligible for PM Kisan?",
      "question_lang": "en",
      "answer": "Farmers with landholding up to 2 hectares are eligible.",
      "scheme_id": "PM_Kisan",
      "ground_truth_chunks": [
        {"chunk_id": "PM_Kisan_chunk_47", "section": "Eligibility", "confidence": 1.0},
        {"chunk_id": "PM_Kisan_chunk_48", "section": "Eligibility Exceptions", "confidence": 0.8}
      ],
      "question_type": "eligibility",
      "difficulty": "easy"
    },
    ...
  ],
  "total_pairs": 350,
  "split": {
    "dev": 250,
    "test": 100
  }
}
```

**Timeline:** 1 week (with domain experts).

---

### Task 1.2: Preprocessing and Baseline Ingestion

**What to do:**
1. Run PDF extraction on all 45 documents using `pdfExtractionService.js`.
2. Clean and deduplicate using `textPreprocessingService.js`.
3. Log statistics: total text length, language distribution, page counts.

**Test Script (Node.js):**
```javascript
const { preprocessTextFromPDF } = require('./textPreprocessingService');
const fs = require('fs');

async function preprocessAll() {
  const pdfDirs = ['./pdfs']; // Your scheme PDFs
  let stats = {
    total_files: 0,
    total_chars: 0,
    total_words: 0,
    language_dist: {},
    errors: []
  };

  for (const pdfPath of fs.readdirSync(pdfDirs[0])) {
    try {
      const result = await preprocessTextFromPDF(pdfPath);
      stats.total_files++;
      stats.total_chars += result.text.length;
      stats.total_words += result.text.split(/\s+/).length;
      
      const lang = detectLanguage(result.text);
      stats.language_dist[lang] = (stats.language_dist[lang] || 0) + 1;
      
      console.log(`✅ Processed ${pdfPath}`);
    } catch (err) {
      stats.errors.push({file: pdfPath, error: err.message});
    }
  }

  console.log(JSON.stringify(stats, null, 2));
  fs.writeFileSync('./preprocessing_stats.json', JSON.stringify(stats, null, 2));
}

preprocessAll();
```

**Output to log:**
```
preprocessing_stats.json
├─ Total PDFs processed: 45
├─ Total raw text: 1.2M words
├─ Language distribution: {en: 38, mixed: 7}
├─ Average PDF size: 3.2 MB
└─ Extraction errors: 0
```

**Timeline:** 2–3 days.

---

## Phase 2: Chunking Strategy Implementation (Weeks 2-3)

### Task 2.1: Implement Chunking Strategies

**What to do:**
Implement all 5 chunking strategies in `textPreprocessingService.js` as separate functions.

**Code template:**

```javascript
// Strategy 1: Fixed-Size Token-Based
async function fixedSizeChunking(text, chunkSize = 500, overlap = 0) {
  const words = tokenize(text);
  const chunks = [];
  const step = chunkSize - overlap;
  
  for (let i = 0; i < words.length; i += step) {
    const chunkWords = words.slice(i, i + chunkSize);
    chunks.push({
      content: chunkWords.join(' '),
      metadata: {
        chunkIndex: chunks.length,
        wordCount: chunkWords.length,
        charCount: chunkWords.join(' ').length,
        strategy: 'fixed-size',
        chunkSize: chunkSize,
        overlap: overlap
      }
    });
  }
  return chunks;
}

// Strategy 2: Sentence-Aware
async function sentenceAwareChunking(text, chunkSize = 500, overlapSentences = 1) {
  const sentences = sentenceTokenizer.tokenize(text);
  const chunks = [];
  let currentChunkSentences = [];
  let currentChunkWords = 0;
  
  for (let i = 0; i < sentences.length; i++) {
    const sentenceWords = tokenize(sentences[i]).length;
    
    if (currentChunkWords + sentenceWords > chunkSize && currentChunkSentences.length > 0) {
      chunks.push({
        content: currentChunkSentences.join(' '),
        metadata: {
          chunkIndex: chunks.length,
          wordCount: currentChunkWords,
          charCount: currentChunkSentences.join(' ').length,
          strategy: 'sentence-aware',
          overlapSentences: overlapSentences
        }
      });
      
      // Overlap: include last N sentences
      const overlapStart = Math.max(0, currentChunkSentences.length - overlapSentences);
      currentChunkSentences = currentChunkSentences.slice(overlapStart);
      currentChunkWords = currentChunkSentences.reduce((sum, s) => sum + tokenize(s).length, 0);
    }
    
    currentChunkSentences.push(sentences[i]);
    currentChunkWords += sentenceWords;
  }
  
  if (currentChunkSentences.length > 0) {
    chunks.push({
      content: currentChunkSentences.join(' '),
      metadata: {
        chunkIndex: chunks.length,
        wordCount: currentChunkWords,
        strategy: 'sentence-aware'
      }
    });
  }
  
  return chunks;
}

// Strategy 4: Section-Aware Chunking
async function sectionAwareChunking(text, chunkSize = 500) {
  const lines = text.split('\n').filter(l => l.trim());
  const sections = [];
  let currentSection = { title: '', content: '', level: 0 };
  
  for (const line of lines) {
    if (isHeading(line)) {
      if (currentSection.content.trim()) {
        sections.push(currentSection);
      }
      currentSection = {
        title: line,
        content: '',
        level: getHeadingLevel(line)
      };
    } else {
      currentSection.content += ' ' + line;
    }
  }
  
  if (currentSection.content.trim()) {
    sections.push(currentSection);
  }
  
  // Now chunk each section
  const chunks = [];
  for (const section of sections) {
    const words = tokenize(section.content);
    for (let i = 0; i < words.length; i += chunkSize) {
      const chunkWords = words.slice(i, i + chunkSize);
      chunks.push({
        content: chunkWords.join(' '),
        metadata: {
          chunkIndex: chunks.length,
          wordCount: chunkWords.length,
          section: section.title,
          sectionLevel: section.level,
          strategy: 'section-aware',
          contentType: section.level === 0 ? 'heading' : 'paragraph'
        }
      });
    }
  }
  
  return chunks;
}

// Strategy 5: Hybrid Adaptive + Quality Scoring
async function hybridAdaptiveChunking(text, options = {}) {
  const {
    chunkSize = 500,
    overlapSentences = 1,
    minChunkSize = 50,
    maxChunkSize = 1000,
    qualityThreshold = 0.5
  } = options;
  
  // First, do section-aware + sentence-aware chunking
  let baseChunks = await sectionAwareChunking(text, chunkSize);
  baseChunks = baseChunks.map(chunk => ({
    ...chunk,
    metadata: {
      ...chunk.metadata,
      qualityScore: computeQualityScore(chunk.content, chunk.metadata)
    }
  }));
  
  // Post-process: merge small chunks, split large chunks
  const adaptiveChunks = [];
  let i = 0;
  
  while (i < baseChunks.length) {
    const chunk = baseChunks[i];
    const wordCount = chunk.metadata.wordCount;
    
    // If chunk is too small and low quality, try to merge with next
    if (wordCount < minChunkSize && chunk.metadata.qualityScore < qualityThreshold && i + 1 < baseChunks.length) {
      const merged = {
        content: chunk.content + ' ' + baseChunks[i + 1].content,
        metadata: {
          ...chunk.metadata,
          wordCount: chunk.metadata.wordCount + baseChunks[i + 1].metadata.wordCount,
          mergedFrom: [chunk.metadata.chunkIndex, baseChunks[i + 1].metadata.chunkIndex]
        }
      };
      adaptiveChunks.push(merged);
      i += 2; // Skip next chunk as it was merged
    } 
    // If chunk is too large and high quality, split it
    else if (wordCount > maxChunkSize && chunk.metadata.qualityScore > qualityThreshold) {
      const words = tokenize(chunk.content);
      for (let j = 0; j < words.length; j += chunkSize) {
        const splitChunk = {
          content: words.slice(j, j + chunkSize).join(' '),
          metadata: {
            ...chunk.metadata,
            wordCount: Math.min(chunkSize, words.length - j),
            splitFrom: chunk.metadata.chunkIndex
          }
        };
        adaptiveChunks.push(splitChunk);
      }
      i++;
    } 
    else {
      adaptiveChunks.push(chunk);
      i++;
    }
  }
  
  return adaptiveChunks;
}

// Quality Score Computation
function computeQualityScore(text, metadata) {
  let score = 0.5;
  
  // Heading bonus
  if (metadata.contentType === 'heading') score += 0.1;
  
  // Keywords present
  const keywordPatterns = ['eligibility', 'benefit', 'amount', 'deadline', 'requirement', 'eligible', 'criteria'];
  if (keywordPatterns.some(kw => text.toLowerCase().includes(kw))) {
    score += 0.1;
  }
  
  // Numbers present (dates, amounts)
  if (/\d{1,}([-\s])?(\d{2}[-\s])?\d{4}|\₹\s*\d+/.test(text)) {
    score += 0.1;
  }
  
  // Length penalty
  const wordCount = text.split(/\s+/).length;
  if (wordCount < 50) score -= 0.15;
  if (wordCount > 1000) score -= 0.15;
  
  // Normalize to [0, 1]
  return Math.max(0, Math.min(1, score));
}
```

**Deliverable:**
All five chunking strategies added to `textPreprocessingService.js` with unit tests.

**Timeline:** 1 week.

---

### Task 2.2: Generate Chunks for All PDFs

**What to do:**
Apply each of the 5 chunking strategies to all 45 PDFs. Store results separately.

**Execution script:**

```javascript
const embeddingService = require('./services/embeddingService');
const fs = require('fs');

async function generateChunksAllStrategies() {
  const strategies = [
    { name: 'fixed-size-500', params: { chunkSize: 500, overlap: 0 } },
    { name: 'fixed-size-overlap', params: { chunkSize: 500, overlap: 50 } },
    { name: 'sentence-aware', params: { chunkSize: 500, overlapSentences: 1 } },
    { name: 'section-aware', params: { chunkSize: 500 } },
    { name: 'hybrid-adaptive', params: { chunkSize: 500, qualityThreshold: 0.5 } }
  ];
  
  const results = {};
  
  for (const strategy of strategies) {
    results[strategy.name] = {
      total_chunks: 0,
      avg_chunk_size: 0,
      storage_mb: 0,
      chunks_by_scheme: {}
    };
    
    // For each PDF, chunk it
    const pdfFiles = fs.readdirSync('./pdfs');
    for (const pdfFile of pdfFiles) {
      const schemeId = pdfFile.replace('.pdf', '');
      
      // Apply chunking strategy
      const chunks = await applyChunkingStrategy(
        `./pdfs/${pdfFile}`,
        strategy.name,
        strategy.params
      );
      
      results[strategy.name].chunks_by_scheme[schemeId] = chunks.length;
      results[strategy.name].total_chunks += chunks.length;
      
      // Save chunks to DB
      await saveChunksToDB(schemeId, strategy.name, chunks);
      
      console.log(`✅ ${strategy.name}: ${schemeId} → ${chunks.length} chunks`);
    }
    
    // Compute averages
    const totalChunks = results[strategy.name].total_chunks;
    results[strategy.name].avg_chunk_size = totalChunks > 0 
      ? `TODO: calculate from DB` 
      : 0;
  }
  
  fs.writeFileSync('./chunking_results.json', JSON.stringify(results, null, 2));
  console.log('✅ Chunking complete. Results saved to chunking_results.json');
}

generateChunksAllStrategies();
```

**Output file format:**
```json
{
  "fixed-size-500": {
    "total_chunks": 2847,
    "avg_chunk_size": 500,
    "chunks_by_scheme": {
      "PM_Kisan": 120,
      "Ayushman_Bharat": 95,
      ...
    }
  },
  "fixed-size-overlap": {
    "total_chunks": 3102,
    ...
  },
  ...
}
```

**Timeline:** 2–3 days (can be parallelized).

---

## Phase 3: Embedding and Indexing (Week 3)

### Task 3.1: Generate Embeddings

**What to do:**
For each chunk, generate embeddings using Azure OpenAI (with Google fallback).

**Execution:**

```javascript
const aiService = require('./services/aiService');
const DocumentChunk = require('./models/DocumentChunk');

async function generateAllEmbeddings() {
  const chunks = await DocumentChunk.find({ processingStatus: 'pending' }).limit(1000);
  
  const chunkTexts = chunks.map(c => c.content);
  const embeddings = await aiService.generateEmbeddings(chunkTexts);
  
  for (let i = 0; i < chunks.length; i++) {
    chunks[i].embedding = embeddings[i].embedding;
    chunks[i].processingStatus = 'completed';
    await chunks[i].save();
  }
  
  console.log(`✅ Generated embeddings for ${chunks.length} chunks`);
}

generateAllEmbeddings();
```

**Timeline:** 1–2 days (depending on API rate limits).

---

## Phase 4: Retrieval Evaluation (Weeks 4-5)

### Task 4.1: Run Retrieval Experiments

**What to do:**
For each test question and each chunking strategy, retrieve top-10 chunks and log:
- Recall@3, Recall@5, Recall@10
- MRR, nDCG@5
- Latency (ms)

**Python evaluation script:**

```python
import json
import time
from collections import defaultdict

def evaluate_retrieval(test_pairs, strategy_name):
    """
    For each test question, retrieve chunks using a given strategy.
    Compute retrieval metrics.
    """
    results = {
        'strategy': strategy_name,
        'recall_at_3': [],
        'recall_at_5': [],
        'recall_at_10': [],
        'mrr': [],
        'ndcg_5': [],
        'latencies': []
    }
    
    for qa_pair in test_pairs:
        question = qa_pair['question']
        ground_truth_chunk_ids = set([c['chunk_id'] for c in qa_pair['ground_truth_chunks']])
        
        # Retrieve top-10 chunks
        start = time.time()
        retrieved_chunks = retrieve_chunks(
            query=question,
            strategy=strategy_name,
            top_k=10
        )
        latency = time.time() - start
        results['latencies'].append(latency)
        
        retrieved_ids = [c['id'] for c in retrieved_chunks]
        
        # Compute metrics
        for k in [3, 5, 10]:
            top_k_ids = retrieved_ids[:k]
            relevant_in_top_k = len(set(top_k_ids) & ground_truth_chunk_ids)
            recall = relevant_in_top_k / len(ground_truth_chunk_ids) if ground_truth_chunk_ids else 0
            results[f'recall_at_{k}'].append(recall)
        
        # MRR: rank of first relevant chunk
        for rank, cid in enumerate(retrieved_ids, start=1):
            if cid in ground_truth_chunk_ids:
                results['mrr'].append(1.0 / rank)
                break
        else:
            results['mrr'].append(0)
        
        # nDCG@5
        ndcg = compute_ndcg(retrieved_ids[:5], ground_truth_chunk_ids)
        results['ndcg_5'].append(ndcg)
    
    # Aggregate
    aggregated = {
        'strategy': strategy_name,
        'recall_at_3': mean(results['recall_at_3']),
        'recall_at_5': mean(results['recall_at_5']),
        'recall_at_10': mean(results['recall_at_10']),
        'mrr': mean(results['mrr']),
        'ndcg_5': mean(results['ndcg_5']),
        'avg_latency_ms': mean(results['latencies']),
        'std_latency_ms': std(results['latencies'])
    }
    
    return aggregated

def compute_ndcg(retrieved_ids, ground_truth_ids):
    """Compute normalized discounted cumulative gain."""
    dcg = 0
    for rank, cid in enumerate(retrieved_ids, start=1):
        if cid in ground_truth_ids:
            dcg += 1.0 / (1 + math.log2(rank))
    
    # Ideal DCG: perfect ranking
    idcg = sum(1.0 / (1 + math.log2(i)) for i in range(1, min(len(ground_truth_ids), len(retrieved_ids)) + 1))
    
    return dcg / idcg if idcg > 0 else 0

# Run for all strategies
strategies = [
    'fixed-size-500',
    'fixed-size-overlap',
    'sentence-aware',
    'section-aware',
    'hybrid-adaptive'
]

retrieval_results = {}
for strategy in strategies:
    retrieval_results[strategy] = evaluate_retrieval(test_pairs, strategy)

# Save results
with open('retrieval_results.json', 'w') as f:
    json.dump(retrieval_results, f, indent=2)

print(json.dumps(retrieval_results, indent=2))
```

**Expected output file:**
```json
{
  "fixed-size-500": {
    "recall_at_3": 0.52,
    "recall_at_5": 0.68,
    "recall_at_10": 0.82,
    "mrr": 0.61,
    "ndcg_5": 0.64,
    "avg_latency_ms": 823
  },
  "fixed-size-overlap": { ... },
  ...
  "hybrid-adaptive": {
    "recall_at_3": 0.65,
    "recall_at_5": 0.83,
    "recall_at_10": 0.92,
    "mrr": 0.75,
    "ndcg_5": 0.79,
    "avg_latency_ms": 698
  }
}
```

**Timeline:** 3–4 days.

---

### Task 4.2: Fill Retrieval Results Table

After Task 4.1 completes, populate the main table:

**Table to Fill:**

| Chunking Strategy | Recall@3 | Recall@5 | Recall@10 | MRR | nDCG@5 |
|---|---|---|---|---|---|
| Baseline-1 (Fixed 500tok) | TODO | TODO | TODO | TODO | TODO |
| Baseline-2 (Fixed + 50tok overlap) | TODO | TODO | TODO | TODO | TODO |
| Baseline-3 (Sentence-aware) | TODO | TODO | TODO | TODO | TODO |
| **Proposed (Adaptive + Quality)** | TODO | TODO | TODO | TODO | TODO |

**Script to auto-fill from JSON:**
```python
import json
import pandas as pd

with open('retrieval_results.json', 'r') as f:
    results = json.load(f)

df = pd.DataFrame([
    {
        'Strategy': name,
        'Recall@3': f"{results[name]['recall_at_3']:.2f}",
        'Recall@5': f"{results[name]['recall_at_5']:.2f}",
        'Recall@10': f"{results[name]['recall_at_10']:.2f}",
        'MRR': f"{results[name]['mrr']:.2f}",
        'nDCG@5': f"{results[name]['ndcg_5']:.2f}",
    }
    for name in results.keys()
])

print(df.to_markdown(index=False))
```

---

## Phase 5: Citation and Faithfulness Evaluation (Weeks 5-6)

### Task 5.1: Generate Answers with LLM

**What to do:**
For each test question, generate an answer using the retrieved chunks from each strategy.

```javascript
const aiService = require('./services/aiService');

async function generateAnswersAllStrategies() {
  const strategies = ['fixed-size-500', 'fixed-size-overlap', 'sentence-aware', 'section-aware', 'hybrid-adaptive'];
  const answers = {};
  
  for (const strategy of strategies) {
    answers[strategy] = [];
    
    for (const qa_pair of test_pairs) {
      // Retrieve chunks for this strategy
      const chunks = await retrieveChunks(qa_pair.question, strategy, top_k=5);
      
      // Generate answer
      const answer = await aiService.generateResponse(
        qa_pair.question,
        chunks.map(c => ({ text: c.content, score: c.similarity })),
        'en'
      );
      
      answers[strategy].push({
        qa_id: qa_pair.qa_id,
        question: qa_pair.question,
        generated_answer: answer.answer,
        sources: answer.sources,
        retrieved_chunks: chunks.map(c => c.id)
      });
    }
  }
  
  return answers;
}
```

**Timeline:** 1–2 days.

---

### Task 5.2: Manual Annotation of Citation Precision and Hallucinations

**What to do:**
Two human annotators independently score 30 random test examples for:
- Citation precision (each cited chunk supports the claim: 0/0.5/1)
- Hallucination rate (number of ungrounded claims / total claims)

**Annotation Interface (web form):**

```html
<form id="annotation-form">
  <h3>Question</h3>
  <p id="question"></p>
  
  <h3>Generated Answer</h3>
  <p id="answer"></p>
  
  <h3>Retrieved Chunks</h3>
  <div id="chunks"></div>
  
  <h3>Citation Precision</h3>
  <p>For each claim in the answer, does the cited chunk support it?</p>
  <table id="citations-table">
    <tr>
      <th>Claim</th>
      <th>Cited Chunk</th>
      <th>Support Level (0/0.5/1)</th>
    </tr>
    <!-- Auto-populated -->
  </table>
  
  <h3>Hallucinations</h3>
  <label>
    <textarea id="hallucinations" placeholder="List any claims not grounded in retrieved chunks..."></textarea>
  </label>
  
  <button type="submit">Submit</button>
</form>
```

**Instructions for annotators:**

```
Citation Precision Rubric:
- 1.0 (Fully Supported): Chunk contains exact fact or near-verbatim text supporting claim.
- 0.5 (Partially Supported): Chunk contains related info that implies but doesn't explicitly justify claim.
- 0.0 (Unsupported): Chunk doesn't contain relevant info; claim appears hallucinated.

Example:
Q: "What is the benefit amount?"
Generated answer: "The benefit amount is ₹5000 per month (Source: Section 3.2)."
Retrieved chunk: "Monthly benefit is ₹5000 for eligible farmers."
Score: 1.0 (Fully Supported)
```

**Timeline:** 1 week (shared between two annotators).

---

### Task 5.3: Compute Citation and Faithfulness Metrics

**Python script:**

```python
def compute_citation_metrics(annotations):
    """
    annotations = [
      {
        'qa_id': '...',
        'citation_scores': [1.0, 0.5, 1.0, ...],
        'hallucination_count': 2,
        'total_claims': 8
      },
      ...
    ]
    """
    
    citation_precision = []
    hallucination_rates = []
    
    for ann in annotations:
        # Citation precision: average of individual scores
        avg_citation_score = sum(ann['citation_scores']) / len(ann['citation_scores']) if ann['citation_scores'] else 0
        citation_precision.append(avg_citation_score)
        
        # Hallucination rate
        hall_rate = ann['hallucination_count'] / ann['total_claims'] if ann['total_claims'] > 0 else 0
        hallucination_rates.append(hall_rate)
    
    return {
        'avg_citation_precision': sum(citation_precision) / len(citation_precision),
        'std_citation_precision': std(citation_precision),
        'avg_hallucination_rate': sum(hallucination_rates) / len(hallucination_rates),
        'std_hallucination_rate': std(hallucination_rates)
    }
```

**Table to Fill:**

| Strategy | Citation Precision | Hallucination Rate | Answer Relevance (≥4/5) |
|---|---|---|---|
| Baseline-1 | TODO | TODO | TODO |
| Baseline-2 | TODO | TODO | TODO |
| Baseline-3 | TODO | TODO | TODO |
| **Proposed** | TODO | TODO | TODO |

**Timeline:** 2–3 days (after annotations complete).

---

## Phase 6: Ablation Studies (Week 6)

### Task 6.1: Quality Scoring Ablation

**What to do:**
Run the adaptive chunking strategy twice:
1. With quality scoring enabled.
2. Without quality scoring (all chunks treated equally).

Compare retrieval metrics.

```javascript
async function ablationQualityScoring() {
  const withQuality = await evaluate('hybrid-adaptive-with-quality', test_pairs);
  const withoutQuality = await evaluate('hybrid-adaptive-no-quality', test_pairs);
  
  return {
    with_quality: withQuality,
    without_quality: withoutQuality,
    improvement: {
      recall_at_5: (withQuality.recall_at_5 - withoutQuality.recall_at_5) / withoutQuality.recall_at_5,
      citation_precision: (withQuality.citation_precision - withoutQuality.citation_precision) / withoutQuality.citation_precision,
      hallucination_reduction: (withoutQuality.hallucination_rate - withQuality.hallucination_rate) / withoutQuality.hallucination_rate
    }
  };
}
```

**Table to Fill:**

| Ablation | Recall@5 | Citation Precision | Hallucination Rate |
|---|---|---|---|
| Adaptive chunking (no quality filter) | TODO | TODO | TODO |
| Adaptive + quality scoring | TODO | TODO | TODO |
| **Improvement** | **TODO** | **TODO** | **TODO** |

---

### Task 6.2: Usage-Aware Ranking Ablation

**What to do:**
Deploy the system for 50+ real queries. Compare ranking with and without usage history.

```javascript
async function ablationUsageAwareRanking() {
  // Run 50 queries, accumulate usage stats
  for (let i = 0; i < 50; i++) {
    const query = generateRandomQuery();
    
    // Rank 1: Cosine similarity only
    const rank1 = rankBySimilarity(query);
    
    // Rank 2: + quality metadata
    const rank2 = rankBySimilarityAndQuality(query);
    
    // Rank 3: + usage history
    const rank3 = rankBySimilarityQualityAndUsage(query);
    
    // Update usage stats for chunk rankings
    updateUsageStats(rank3);
  }
  
  // Evaluate metrics at warm-up checkpoints
  return {
    after_10_queries: evaluate(rank1, rank2, rank3),
    after_30_queries: evaluate(rank1, rank2, rank3),
    after_50_queries: evaluate(rank1, rank2, rank3)
  };
}
```

**Table to Fill:**

| Ablation | Recall@5 | MRR | nDCG@5 |
|---|---|---|---|
| Cosine similarity only | TODO | TODO | TODO |
| + Quality metadata | TODO | TODO | TODO |
| + Usage history | TODO | TODO | TODO |
| **Improvement** | **TODO** | **TODO** | **TODO** |

---

### Task 6.3: Chunk Size Sensitivity

**What to do:**
Run retrieval with different chunk sizes: 250, 500, 1000 tokens.

```python
chunk_sizes = [250, 500, 1000]
sensitivity_results = {}

for size in chunk_sizes:
    chunks = apply_chunking('hybrid-adaptive', chunkSize=size)
    embeddings = generate_embeddings(chunks)
    metrics = evaluate_retrieval(test_pairs, chunks)
    sensitivity_results[size] = metrics

# Plot and save
import matplotlib.pyplot as plt
plt.plot(chunk_sizes, [sensitivity_results[s]['recall_at_5'] for s in chunk_sizes])
plt.xlabel('Chunk Size (tokens)')
plt.ylabel('Recall@5')
plt.savefig('chunk_size_sensitivity.png')
```

**Table to Fill:**

| Chunk Size (tokens) | Recall@5 | MRR | Latency (ms) | Storage (MB) |
|---|---|---|---|---|
| 250 | TODO | TODO | TODO | TODO |
| 500 | TODO | TODO | TODO | TODO |
| 1000 | TODO | TODO | TODO | TODO |

---

## Phase 7: Error Analysis (Week 7)

### Task 7.1: Categorize Failures

**What to do:**
For 30 test examples where retrieval or answer quality failed, manually categorize the failure type.

```python
failure_categories = {
    'multi_hop': [],  # Requires combining chunks
    'ambiguous_policy': [],  # Contradictory or unclear policy text
    'negation': [],  # Requires handling "NOT eligible"
    'numerical': [],  # Requires math/aggregation
    'terminology': [],  # Acronyms, jargon
    'missing_info': []  # Info not in corpus
}

for test_ex in failed_examples:
    category = manually_classify_failure(test_ex)
    failure_categories[category].append(test_ex)

# Report
print(f"Multi-hop: {len(failure_categories['multi_hop'])}/30")
print(f"Ambiguous: {len(failure_categories['ambiguous_policy'])}/30")
# ...
```

**Table to Fill:**

| Failure Category | Count | Example | Suggested Fix |
|---|---|---|---|
| Multi-hop reasoning | TODO | "I earn ₹300k/year as a farmer; am I eligible?" | Multi-hop retrieval or semantic linking |
| Ambiguous policy language | TODO | "Exceptions: farmers in X region not eligible" | Fine-print tagging, confidence scoring |
| Negation/conditions | TODO | "Who is NOT eligible?" | Negation-aware prompting |
| Numerical aggregation | TODO | "Total benefit from 3 schemes?" | Slot-filling, arithmetic |
| Domain terminology | TODO | "What is PMSY?" (acronym) | Glossary expansion |
| Missing information | TODO | "Current interest rate?" (not in corpus) | Graceful admission of gaps |

---

## Summary Execution Checklist

- [ ] **Phase 1:** Dataset finalized, 350+ QA pairs with ground truth (Week 2)
- [ ] **Phase 2:** All 5 chunking strategies implemented (Week 3)
- [ ] **Phase 3:** Chunks generated and embeddings computed (Week 4)
- [ ] **Phase 4:** Retrieval metrics computed, tables filled (Week 5)
- [ ] **Phase 5:** Answers generated, manual annotations, citation metrics (Week 6)
- [ ] **Phase 6:** Ablation studies completed (Week 6)
- [ ] **Phase 7:** Error analysis categorized (Week 7)
- [ ] **Paper:** Results written up, paper draft completed (Week 8)

**Total Timeline:** 8 weeks (can be parallelized; realistic 5–6 weeks with full effort).

---

## Key Deliverables

1. `retrieval_results.json` – All retrieval metric results
2. `citation_annotations.json` – Annotated answers with citation precision scores
3. `ablation_results.json` – All ablation study results
4. `error_analysis.json` – Categorized failure modes
5. `paper_draft_with_results.md` – Research paper with filled tables
6. `evaluation_code/` – All scripts for reproducibility
7. `dataset/` – 350 QA pairs (anonymized/sharable)

---

## Notes for Success

- **Parallel execution:** Phases 2 and 3 can overlap. Start chunking while collecting annotation data.
- **Early validation:** Run a pilot on 10 PDFs and 50 QA pairs first to catch issues.
- **Annotation quality:** Ensure inter-annotator agreement (κ ≥ 0.7) on first 30 examples before scaling.
- **Storage:** MongoDB with indexed embeddings will be your bottleneck; ensure you have adequate disk space and indexing before large-scale runs.
- **Cost:** API calls for embeddings (~0.3M chunks) and LLM generations (~350 queries) will add up. Estimate ~$50–100 for Azure + Google APIs.

