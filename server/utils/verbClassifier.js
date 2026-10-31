const cosineSimilarity = require('compute-cosine-similarity');
const { getEmbedding } = require('./embeddingService');
const { persistCache } = require('./cacheManager');

// Configurable similarity threshold constants
const SIMILARITY_THRESHOLD_VERIFIED = 0.6;
const SIMILARITY_THRESHOLD_UNVERIFIED = 0.75;

// Define taxonomy structure - domains and subdomains with sample verbs
const taxonomy = {
    cognitive: {
        remember: ['recall', 'recognize', 'identify', 'retrieve', 'name', 'list', 'define', 'match', 'memorize'],
        understand: ['explain', 'interpret', 'summarize', 'infer', 'paraphrase', 'classify', 'compare', 'exemplify'],
        apply: ['implement', 'execute', 'use', 'apply', 'demonstrate', 'solve', 'illustrate', 'calculate'],
        analyze: ['analyze', 'differentiate', 'organize', 'attribute', 'compare', 'contrast', 'distinguish', 'examine'],
        evaluate: ['evaluate', 'check', 'critique', 'judge', 'test', 'monitor', 'assess', 'appraise'],
        create: ['generate', 'plan', 'produce', 'design', 'construct', 'create', 'invent', 'develop']
    },
    affective: {
        receiving: ['acknowledge', 'listen', 'notice', 'attend', 'perceive', 'focus', 'recognize', 'be aware'],
        responding: ['respond', 'react', 'follow', 'comply', 'participate', 'volunteer', 'engage', 'contribute'],
        valuing: ['value', 'appreciate', 'accept', 'prefer', 'commit', 'pursue', 'seek', 'desire'],
        organizing: ['organize', 'systematize', 'prioritize', 'relate', 'reconcile', 'integrate', 'balance', 'harmonize'],
        characterizing: ['internalize', 'adopt', 'embody', 'exemplify', 'represent', 'act', 'practice', 'personify']
    },
    psychomotor: {
        perception: ['detect', 'observe', 'perceive', 'recognize', 'sense', 'identify', 'select', 'distinguish'],
        set: ['prepare', 'position', 'organize', 'ready', 'adjust', 'arrange', 'establish', 'get set'],
        guidedResponse: ['imitate', 'follow', 'try', 'reproduce', 'practice', 'attempt', 'repeat', 'emulate'],
        mechanism: ['perform', 'execute', 'implement', 'operate', 'utilize', 'manipulate', 'control', 'coordinate'],
        complexResponse: ['adapt', 'modify', 'improve', 'perfect', 'calibrate', 'refine', 'enhance', 'master'],
        adaptation: ['alter', 'adjust', 'revise', 'vary', 'reorganize', 'change', 'customize', 'tailor'],
        origination: ['create', 'design', 'originate', 'construct', 'compose', 'arrange', 'devise', 'invent']
    }
};

// In-memory cache for embeddings during current session
const sessionEmbeddingCache = {};

/**
 * Get cached embedding or compute new one
 */
const getWordEmbedding = async (word) => {
    if (!word || typeof word !== 'string') {
        console.warn('Invalid word provided to getWordEmbedding');
        return null;
    }

    const normalizedWord = word.toLowerCase().trim();

    if (sessionEmbeddingCache[normalizedWord]) {
        return sessionEmbeddingCache[normalizedWord];
    }

    try {
        const embedding = await getEmbedding(normalizedWord);
        sessionEmbeddingCache[normalizedWord] = embedding;
        return embedding;
    } catch (error) {
        console.error(`Error getting embedding for "${normalizedWord}":`, error);
        return null;
    }
};

/**
 * Find best match for a verb in the taxonomy using semantic similarity
 * 
 * @param {string} verb - Action verb to classify
 * @param {boolean} isVerified - Whether the verb is a verified action verb or an unverified candidate
 */
const findBestMatch = async (verb, isVerified = true) => {
    if (!verb || typeof verb !== 'string') {
        return { domain: 'unclassified', subdomain: 'unknown', similarity: 0, method: 'error', matchedWith: undefined };
    }

    const normalizedVerb = verb.toLowerCase().trim();

    try {
        console.log(`Finding best match for verb: "${normalizedVerb}" (verified: ${isVerified})`);

        // Check for direct matches first
        for (const [domain, subdomains] of Object.entries(taxonomy)) {
            for (const [subdomain, examples] of Object.entries(subdomains)) {
                if (examples.includes(normalizedVerb)) {
                    console.log(`Direct match found for "${normalizedVerb}" in ${domain}.${subdomain}`);
                    return { 
                        domain, 
                        subdomain, 
                        similarity: 1.0, 
                        method: 'exact match',
                        matchedWith: normalizedVerb 
                    };
                }
            }
        }

        // If no direct match, use embedding-based cosine similarity against all taxonomy examples
        const verbEmbedding = await getWordEmbedding(normalizedVerb);

        if (!verbEmbedding) {
            console.error(`Failed to get embedding for "${normalizedVerb}"`);
            return { domain: 'unclassified', subdomain: 'unknown', similarity: 0, method: 'error', matchedWith: undefined };
        }

        let bestMatch = { domain: 'unclassified', subdomain: 'unknown', similarity: 0, method: 'similarity', matchedWith: undefined };
        const domainProximities = {
            cognitive: 0,
            affective: 0,
            psychomotor: 0
        };

        for (const [domain, subdomains] of Object.entries(taxonomy)) {
            for (const [subdomain, examples] of Object.entries(subdomains)) {
                for (const example of examples) {
                    try {
                        const exampleEmbedding = await getWordEmbedding(example);

                        if (!exampleEmbedding) continue;
                        if (verbEmbedding.length !== exampleEmbedding.length) continue;

                        const similarity = cosineSimilarity(verbEmbedding, exampleEmbedding);

                        if (isNaN(similarity)) continue;

                        if (similarity > domainProximities[domain]) {
                            domainProximities[domain] = similarity;
                        }

                        if (similarity > bestMatch.similarity) {
                            bestMatch = {
                                domain,
                                subdomain,
                                similarity,
                                method: 'similarity',
                                matchedWith: example
                            };
                        }
                    } catch (error) {
                        console.error(`Error comparing "${normalizedVerb}" with "${example}":`, error.message);
                    }
                }
            }
        }

        // Calculate similarity percentage (0-100%)
        const similarityPercentage = Math.round(Math.max(0, Math.min(1, bestMatch.similarity)) * 100);
        const domainPercentages = {
            cognitive: Math.round(Math.max(0, Math.min(1, domainProximities.cognitive)) * 100),
            affective: Math.round(Math.max(0, Math.min(1, domainProximities.affective)) * 100),
            psychomotor: Math.round(Math.max(0, Math.min(1, domainProximities.psychomotor)) * 100)
        };

        // Apply strictness threshold based on verification status
        const requiredThreshold = isVerified 
            ? SIMILARITY_THRESHOLD_VERIFIED 
            : SIMILARITY_THRESHOLD_UNVERIFIED;

        if (bestMatch.similarity >= requiredThreshold) {
            return {
                domain: bestMatch.domain,
                subdomain: bestMatch.subdomain,
                similarity: bestMatch.similarity,
                similarityPercentage,
                domainPercentages,
                method: isVerified ? 'similarity' : 'similarity (unverified inference)',
                matchedWith: bestMatch.matchedWith,
                suggestedDomain: bestMatch.domain,
                suggestedSubdomain: bestMatch.subdomain
            };
        } else {
            // Below threshold: mark unclassified but retain suggested domain match & percentages
            return {
                domain: 'unclassified',
                subdomain: 'unknown',
                similarity: bestMatch.similarity,
                similarityPercentage,
                domainPercentages,
                method: isVerified ? 'below threshold' : 'below threshold (unverified)',
                matchedWith: bestMatch.matchedWith,
                suggestedDomain: bestMatch.domain,
                suggestedSubdomain: bestMatch.subdomain
            };
        }
    } catch (error) {
        console.error(`Error in findBestMatch for "${normalizedVerb}":`, error);
        return { 
            domain: 'unclassified', 
            subdomain: 'unknown', 
            similarity: 0, 
            similarityPercentage: 0,
            domainPercentages: { cognitive: 0, affective: 0, psychomotor: 0 },
            method: 'error', 
            matchedWith: undefined,
            suggestedDomain: 'unclassified',
            suggestedSubdomain: 'unknown'
        };
    }
};

/**
 * Classify a list of verbs into domains and subdomains
 * 
 * @param {Array<{word: string, frequency: number, verified?: boolean}>} verbsWithFrequency
 */
exports.classifyVerbs = async (verbsWithFrequency) => {
    console.log(`Starting classification of ${verbsWithFrequency.length} verbs`);

    const results = {
        domains: {
            cognitive: { count: 0, subdomains: {} },
            affective: { count: 0, subdomains: {} },
            psychomotor: { count: 0, subdomains: {} },
            unclassified: { count: 0, subdomains: { unknown: 0 } }
        },
        verbs: [],
        verbsByFrequency: [], // Verbs sorted by frequency
        totalVerbCount: 0,    // Total instances including repeated verbs
        uniqueVerbCount: 0    // Unique verb count
    };

    // Initialize subdomain counts
    for (const [domain, subdomains] of Object.entries(taxonomy)) {
        for (const subdomain of Object.keys(subdomains)) {
            results.domains[domain].subdomains[subdomain] = 0;
        }
    }

    // Calculate total verb count (including repetitions)
    results.totalVerbCount = verbsWithFrequency.reduce((total, item) => total + item.frequency, 0);
    results.uniqueVerbCount = verbsWithFrequency.length;

    // Process each verb
    for (const verbItem of verbsWithFrequency) {
        const { word, frequency, verified } = verbItem;
        const isVerified = (verified !== false);

        const classification = await findBestMatch(word, isVerified);

        // Update counts (weighted by frequency)
        results.domains[classification.domain].count += frequency;
        results.domains[classification.domain].subdomains[classification.subdomain] = 
            (results.domains[classification.domain].subdomains[classification.subdomain] || 0) + frequency;

        // Store verb classification details
        results.verbs.push({
            verb: word,
            frequency: frequency,
            verified: isVerified,
            similarityScore: classification.similarity,
            similarityPercentage: classification.similarityPercentage ?? Math.round((classification.similarity || 0) * 100),
            domainPercentages: classification.domainPercentages || { cognitive: 0, affective: 0, psychomotor: 0 },
            suggestedDomain: classification.suggestedDomain || classification.domain,
            suggestedSubdomain: classification.suggestedSubdomain || classification.subdomain,
            domain: classification.domain,
            subdomain: classification.subdomain,
            matchedWith: classification.matchedWith,
            classification: {
                domain: classification.domain,
                subdomain: classification.subdomain,
                confidence: classification.similarity,
                similarityPercentage: classification.similarityPercentage ?? Math.round((classification.similarity || 0) * 100),
                domainPercentages: classification.domainPercentages || { cognitive: 0, affective: 0, psychomotor: 0 },
                suggestedDomain: classification.suggestedDomain || classification.domain,
                suggestedSubdomain: classification.suggestedSubdomain || classification.subdomain,
                matchedWith: classification.matchedWith,
                verified: isVerified
            }
        });
    }

    // Sort verbs by frequency for the frequency-based view
    results.verbsByFrequency = [...results.verbs]
        .sort((a, b) => b.frequency - a.frequency);

    // Persist cache after processing all verbs
    persistCache();

    console.log('Classification complete');
    return results;
};

exports.SIMILARITY_THRESHOLD_VERIFIED = SIMILARITY_THRESHOLD_VERIFIED;
exports.SIMILARITY_THRESHOLD_UNVERIFIED = SIMILARITY_THRESHOLD_UNVERIFIED;
exports.findBestMatch = findBestMatch;