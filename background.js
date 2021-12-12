"use strict";
// In this file, we write a background script to convert documents to embeddings
// We use the word2vec library for the computation of the word vectors
const fs = require('fs');
const w2v = require('word2vec');
const WordVector = require('word2vec/lib/WordVector');

function preprocess(originalString) {
    // Write a standard preprocessing pipeline for strings
    let returnValue = originalString.replace( /(<([^>]+)>)/ig, '')
        .toLowerCase()
        .replace(/[^a-zA-Z']/g, ' ')
        .replace(/\s+/g, ' ')//.split(' ').filter((k) => {
       //     return k.trim() !== '';
       // })
    return returnValue
}

async function createCorpus(inputFile, outputFile) {
    // Create a corpus from the input file
    // Preprocess the strings
    // Write to the output file
    
    fs.readFile(inputFile, 'utf8', (err, data) => {
        if (err) {
            console.error(err)
            return
        }

        let stringToProcess = JSON.parse(data)
        // console.log(Object.keys(stringToProcess));
        let keys = Object.keys(stringToProcess);
        let corpus = [];
        for (const key of keys)
        {
            corpus.push(preprocess(stringToProcess[key].Body));
        }
        corpus = corpus.join("\n");
        // stringToProcess = preprocess(stringToProcess["5"].Body);
        // console.log(stringToProcess);
        fs.writeFile(outputFile, corpus, err => {
            if (err) {
                console.error(err)
                return
            }
            console.log(outputFile + " saved succesfully!");
        })
    })

    return 1;
}

function embeddings(model, cleanedString) {
    // Convert a cleaned string to an embedding representation using a pretrained model
    // E.g., by averaging the word embeddings
    let word_count = 0;
    let document = cleanedString;
    document = document.split(' ');
    document.pop(); // removes the empty char at the end

    // console.log(cleanedString);
    var embedding = new WordVector(cleanedString, new Float32Array(200, 0));
    for(const word of document)
    {
        let vector = model.getVector(word)
        if(vector != null)
        {
            word_count ++;
            embedding = embedding.add(vector);
        }
    }

    for(let i = 0; i < embedding.values.length; i++){
        embedding.values[i] = embedding.values[i]/word_count;
    }
    
    embedding.word = cleanedString;
    return embedding;
}

function createEmbeddings(inputFile, modelFile, outputFile) {
    // Create the document embeddings using the pretrained model
    // Save them for lookup of the running server
    fs.readFile(inputFile, 'utf8', (err, data) => {
        if (err) {
            console.error(err)
            return
        }
        
        console.log()

        fs.writeFile(outputFile, corpus, err => {
            if (err) {
                console.error(err)
                return
            }
        })
    })

}

// Suggested pipeline:
// - create a corpus
// - build w2v model (i.e., word vectors)
// - create document embeddings

var answers_json = "./dummy_data/Answers.json"
var answers_corpus_file = "./data/answers_corpus.txt"
var answers_word_vectors = "./data/answers_word_vectors.txt"

var questions_json = "./dummy_data/Questions.json"
var questions_corpus_file = "./data/questions_corpus.txt"
var questions_word_vectors = "./data/questions_word_vectors.txt"

let promise_answers = await createCorpus(answers_json, answers_corpus_file);
let promise_questions = await createCorpus(questions_json, questions_corpus_file);

await Promise.all(promise_answers, promise_questions);



w2v.word2vec( answers_corpus_file, answers_word_vectors, {
	cbow: 1,
	size: 200,
	window: 8,
	hs: 0,
	sample: 1e-4,
	threads: 20,
	iter: 15
});

w2v.loadModel( answers_word_vectors, function( error, model ) {
    if(error)
    {
        console.error(error);
        return;
    }
    console.log( model );
});


