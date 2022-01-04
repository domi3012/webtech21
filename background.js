"use strict";
// In this file, we write a background script to convert documents to embeddings
// We use the word2vec library for the computation of the word vectors
// const fs = require('fs');
import fs from "fs"

const fsPromises = fs.promises;
// const w2v = require('word2vec');
import w2v from "word2vec"

// const WordVector = require('word2vec/lib/WordVector');
import WordVector from "word2vec/lib/WordVector.js";

const word_vectors_length = 100;
let order = [];
let questions_document_embeddings = "./output_data/questions_document_embeddings.txt"
var questions_word_vectors = "./output_data/questions_word_vectors.txt"

var questions_embeddings_model;
var questions_vector_model;

// =============================================================================

function preprocess(originalString) {
    // Write a standard preprocessing pipeline for strings
    let returnValue = originalString.replace(/(<([^>]+)>)/ig, '')
        .toLowerCase()
        .replace(/[^a-zA-Z']/g, ' ')
        .replace(/\s+/g, ' ')//.split(' ').filter((k) => {
    //     return k.trim() !== '';
    // })
    return returnValue
}

// =============================================================================

async function createCorpus(inputFile, outputFile) {
    // Create a corpus from the input file
    // Preprocess the strings
    // Write to the output file

    const data = await fsPromises.readFile(inputFile).catch((err) => console.error('Failed to read file', err));

    let stringToProcess = JSON.parse(data)
    let keys = Object.keys(stringToProcess);
    let corpus = [];
    for (const key of keys) {
        corpus.push({"data": preprocess(stringToProcess[key].Body), "key": key});
    }
    let result = ""
    for (const elem in corpus) {
        result += corpus[elem].data + "\n"
    }
    // stringToProcess = preprocess(stringToProcess["5"].Body);
    // console.log(stringToProcess);

    await fsPromises.writeFile(outputFile, result).catch((err) => console.error('Failed to write file', err));
    return corpus;
}

// =============================================================================

function embeddings(model, cleanedString, key) {
    // Convert a cleaned string to an embedding representation using a pretrained model
    // E.g., by averaging the word embeddings
    let word_count = 0;
    let document = cleanedString;
    document = document.split(' ');
    if (document.length != 1) {
        document.pop();
    } // removes the empty char at the end

    var embedding = new WordVector(cleanedString, new Float32Array(word_vectors_length, 0));
    for (const word of document) {
        let vector = model.getVector(word)
        if (vector != null) {
            word_count++;
            embedding = embedding.add(vector);
        }
    }

    for (let i = 0; i < embedding.values.length; i++) {
        embedding.values[i] = embedding.values[i] / word_count;
    }

    embedding.word = cleanedString;
    let embedding_string = key + " ";
    let values = embedding.values;

    for (let i = 0; i < values.length; i++) {
        embedding_string += values[i] + " "
    }

    return embedding_string;
}

// =============================================================================

async function createEmbeddings(corpusObject, modelFile, outputFile) {
    // Create the document embeddings using the pretrained model
    // Save them for lookup of the running server
    //let data = await fsPromises.readFile(inputFile).catch((err) => console.error('Failed to read file', err));
    let document_embeddings = []

    document_embeddings.push(corpusObject.length + " " + word_vectors_length)

    for (const elem of corpusObject) {
        document_embeddings.push(embeddings(modelFile, elem.data, elem.key));
    }

    document_embeddings = document_embeddings.join("\n");

    await fsPromises.writeFile(outputFile, document_embeddings).catch((err) => console.error('Failed to write file', err));
}

// =============================================================================

function trainAndLoadW2VModel(input_file, output_file, callback) {
    w2v.word2vec(input_file, output_file, {
        cbow: 1,
        size: word_vectors_length,
        window: 8,
        hs: 0,
        silent: 1,
        sample: 1e-4,
        threads: 20,
        iter: 15
    }, function () {
        w2v.loadModel(output_file, function (error, model) {
            if (error) {
                console.error(error);
                return;
            }
            if (callback != null) {
                callback(model);
            }
        });
    });
}

// =============================================================================

// Suggested pipeline:
// - create a corpus
// - build w2v model (i.e., word vectors)
// - create document embeddings

async function process() {
    var answers_json = "./input_data/Answers.json"
    var answers_corpus_file = "./output_data/answers_corpus.txt"
    var answers_word_vectors = "./output_data/answers_word_vectors.txt"
    var answers_document_embeddings = "./output_data/answers_document_embeddings.txt"

    var questions_json = "./input_data/Questions.json"
    var questions_corpus_file = "./output_data/questions_corpus.txt"


    // create corpus for answers and questions files
    let corpusAnswers = await createCorpus(answers_json, answers_corpus_file);
    let corpusQuestions = await createCorpus(questions_json, questions_corpus_file);

    // create word vectors and load w2v model for the answers
    trainAndLoadW2VModel(answers_corpus_file, answers_word_vectors, function (model) {
        // create document embeddings for all answers
        createEmbeddings(corpusAnswers, model, answers_document_embeddings);
    });

    // create word vectors and load w2v model for the questions
    trainAndLoadW2VModel(questions_corpus_file, questions_word_vectors, function (model) {
        // create document embeddings for all answers
        createEmbeddings(corpusQuestions, model, questions_document_embeddings);
    });
}


// =============================================================================

//process();

function initilize() {
    w2v.loadModel(questions_document_embeddings, function (error, model) {
        if (error) {
            console.error(error);
            return;
        }
        questions_embeddings_model = model;
    });
    w2v.loadModel(questions_word_vectors, function (error, model) {
        if (error) {
            console.error(error);
            return;
        }
        questions_vector_model = model;
    });
}

function getSimilarQuestions(input) {
    if (questions_vector_model === undefined || questions_embeddings_model === undefined)return;
    return questions_embeddings_model.mostSimilar(input, 5);
}

function getSimilarQuestionsFromQuery(input) {
    if (questions_vector_model === undefined || questions_embeddings_model === undefined)return;
    let word_count = 0;
    var embedding = new WordVector(input, new Float32Array(word_vectors_length, 0));
    for (const word of input.split(" ")) {
        let vector = questions_vector_model.getVector(word)
        if (vector != null) {
            word_count++;
            embedding = embedding.add(vector);
        }
    }
    for (let i = 0; i < embedding.values.length; i++) {
        embedding.values[i] = embedding.values[i] / word_count;
    }
    embedding.word = input;
    return questions_embeddings_model.getNearestWords(embedding, 20);
}

export {initilize, getSimilarQuestions, preprocess, getSimilarQuestionsFromQuery, questions_vector_model, process}
