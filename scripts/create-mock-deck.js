#!/usr/bin/env node

const Database = require('better-sqlite3');
const AdmZip = require('adm-zip');
const fs = require('fs-extra');
const path = require('path');

// Computer Science Q&A pairs for mock deck
const mockCards = [
    // Algorithms & Data Structures
    { question: "What is a binary tree?", answer: "A tree data structure where each node has at most two children" },
    { question: "Define recursion", answer: "A function that calls itself to solve smaller subproblems" },
    { question: "What is Big O notation?", answer: "Mathematical notation describing algorithm efficiency" },
    { question: "What is a hash table?", answer: "Data structure using key-value pairs for fast lookups" },
    { question: "What is a linked list?", answer: "A linear data structure where elements point to the next element" },
    { question: "Define a stack", answer: "Last-in-first-out data structure with push and pop operations" },
    { question: "What is a queue?", answer: "First-in-first-out data structure with enqueue and dequeue operations" },
    { question: "What is a binary search?", answer: "Efficient search algorithm that divides sorted data in half each iteration" },
    
    // Object-Oriented Programming
    { question: "Explain polymorphism", answer: "Ability of objects to take multiple forms in OOP" },
    { question: "Define encapsulation", answer: "The practice of hiding internal object details from external access" },
    { question: "What is inheritance?", answer: "Mechanism allowing classes to inherit properties from parent classes" },
    { question: "Define abstraction", answer: "Hiding complex implementation details while showing essential features" },
    { question: "What is method overriding?", answer: "Redefining parent class methods in child classes" },
    { question: "Explain class vs object", answer: "Class is a blueprint, object is an instance of that blueprint" },
    
    // Programming Concepts
    { question: "What is a variable?", answer: "Named storage location that holds data values" },
    { question: "Define a function", answer: "Reusable block of code that performs a specific task" },
    { question: "What is a loop?", answer: "Control structure that repeats code until a condition is met" },
    { question: "Explain conditional statements", answer: "Code that executes different paths based on boolean conditions" },
    { question: "What is an array?", answer: "Collection of elements stored in contiguous memory locations" },
    { question: "Define a pointer", answer: "Variable that stores the memory address of another variable" },
    
    // Computer Systems
    { question: "What is RAM?", answer: "Random Access Memory used for temporary data storage" },
    { question: "Define CPU", answer: "Central Processing Unit that executes program instructions" },
    { question: "What is an operating system?", answer: "Software that manages computer hardware and software resources" },
    { question: "Explain compilation", answer: "Process of translating source code into machine executable code" },
    { question: "What is a database?", answer: "Organized collection of structured information stored electronically" },
    { question: "Define network protocol", answer: "Set of rules governing communication between network devices" }
];

function createAnkiDatabase() {
    const tempDir = path.join(__dirname, '../temp');
    fs.ensureDirSync(tempDir);
    
    const dbPath = path.join(tempDir, 'collection.anki2');
    
    // Remove existing database if it exists
    if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
    }
    
    const db = new Database(dbPath);
    
    // Create Anki database schema (simplified for mock data)
    db.exec(`
        CREATE TABLE col (
            id              integer primary key,
            crt             integer not null,
            mod             integer not null,
            scm             integer not null,
            ver             integer not null,
            dty             integer not null,
            usn             integer not null,
            ls              integer not null,
            conf            text not null,
            models          text not null,
            decks           text not null,
            dconf           text not null,
            tags            text not null
        );
        
        CREATE TABLE notes (
            id              integer primary key,
            guid            text not null unique,
            mid             integer not null,
            mod             integer not null,
            usn             integer not null,
            tags            text not null,
            flds            text not null,
            sfld            text not null,
            csum            integer not null,
            flags           integer not null,
            data            text not null
        );
        
        CREATE TABLE cards (
            id              integer primary key,
            nid             integer not null,
            did             integer not null,
            ord             integer not null,
            mod             integer not null,
            usn             integer not null,
            type            integer not null,
            queue           integer not null,
            due             integer not null,
            ivl             integer not null,
            factor          integer not null,
            reps            integer not null,
            lapses          integer not null,
            left            integer not null,
            odue            integer not null,
            odid            integer not null,
            flags           integer not null,
            data            text not null
        );
        
        CREATE INDEX ix_notes_usn on notes (usn);
        CREATE INDEX ix_cards_usn on cards (usn);
        CREATE INDEX ix_cards_nid on cards (nid);
        CREATE INDEX ix_cards_sched on cards (did, queue, due);
    `);
    
    const now = Date.now();
    
    // Insert collection data
    const colData = {
        id: 1,
        crt: Math.floor(now / 1000),
        mod: now,
        scm: now,
        ver: 11,
        dty: 0,
        usn: 0,
        ls: 0,
        conf: JSON.stringify({
            nextPos: 1,
            estTimes: true,
            activeDecks: [1],
            sortType: "noteFld",
            timeLim: 0,
            sortBackwards: false,
            addToCur: true,
            curDeck: 1,
            newBury: true,
            newSpread: 0,
            dueCounts: true,
            curModel: "1"
        }),
        models: JSON.stringify({
            "1": {
                id: 1,
                name: "Basic",
                type: 0,
                mod: now,
                usn: 0,
                sortf: 0,
                did: 1,
                tmpls: [{
                    name: "Card 1",
                    ord: 0,
                    qfmt: "{{Front}}",
                    afmt: "{{FrontSide}}\n\n<hr id=answer>\n\n{{Back}}",
                    did: null,
                    bqfmt: "",
                    bafmt: ""
                }],
                flds: [
                    { name: "Front", ord: 0, sticky: false, rtl: false, font: "Arial", size: 20 },
                    { name: "Back", ord: 1, sticky: false, rtl: false, font: "Arial", size: 20 }
                ],
                css: ".card {\n font-family: arial;\n font-size: 20px;\n text-align: center;\n color: black;\n background-color: white;\n}\n",
                latexPre: "\\documentclass[12pt]{article}\n\\special{papersize=3in,5in}\n\\usepackage[utf8]{inputenc}\n\\usepackage{amssymb,amsmath}\n\\pagestyle{empty}\n\\setlength{\\parindent}{0in}\n\\begin{document}\n",
                latexPost: "\\end{document}",
                req: [[0, "any", [0]]]
            }
        }),
        decks: JSON.stringify({
            "1": {
                id: 1,
                name: "Computer Science Fundamentals",
                extendRev: 50,
                usn: 0,
                collapsed: false,
                newToday: [0, 0],
                revToday: [0, 0],
                lrnToday: [0, 0],
                timeToday: [0, 0],
                mod: now,
                desc: "",
                dyn: 0,
                conf: 1
            }
        }),
        dconf: JSON.stringify({
            "1": {
                id: 1,
                mod: 0,
                name: "Default",
                usn: 0,
                maxTaken: 60,
                autoplay: true,
                timer: 0,
                replayq: true,
                new: {
                    bury: true,
                    delays: [1, 10],
                    initialFactor: 2500,
                    ints: [1, 4, 7],
                    order: 1,
                    perDay: 20,
                    separate: true
                },
                lapse: {
                    delays: [10],
                    leechAction: 0,
                    leechFails: 8,
                    minInt: 1,
                    mult: 0
                },
                rev: {
                    bury: true,
                    ease4: 1.3,
                    fuzz: 0.05,
                    ivlFct: 1,
                    maxIvl: 36500,
                    minSpace: 1,
                    perDay: 100
                }
            }
        }),
        tags: JSON.stringify({})
    };
    
    const insertCol = db.prepare(`
        INSERT INTO col (id, crt, mod, scm, ver, dty, usn, ls, conf, models, decks, dconf, tags)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    insertCol.run(
        colData.id, colData.crt, colData.mod, colData.scm, colData.ver,
        colData.dty, colData.usn, colData.ls, colData.conf, colData.models,
        colData.decks, colData.dconf, colData.tags
    );
    
    // Insert notes and cards
    const insertNote = db.prepare(`
        INSERT INTO notes (id, guid, mid, mod, usn, tags, flds, sfld, csum, flags, data)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const insertCard = db.prepare(`
        INSERT INTO cards (id, nid, did, ord, mod, usn, type, queue, due, ivl, factor, reps, lapses, left, odue, odid, flags, data)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    mockCards.forEach((card, index) => {
        const noteId = index + 1;
        const cardId = index + 1;
        const guid = `mock${noteId.toString().padStart(8, '0')}`;
        
        // Calculate checksum (simplified)
        const fields = `${card.question}\x1f${card.answer}`;
        const csum = fields.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
        
        // Insert note
        insertNote.run(
            noteId,
            guid,
            1, // model id (Basic)
            now,
            0, // usn
            '', // tags
            fields,
            card.question, // sfld (sort field)
            csum,
            0, // flags
            '' // data
        );
        
        // Insert card
        insertCard.run(
            cardId,
            noteId,
            1, // deck id
            0, // ord (template ordinal)
            now,
            0, // usn
            0, // type (new)
            0, // queue (new)
            noteId, // due
            0, // ivl
            0, // factor
            0, // reps
            0, // lapses
            0, // left
            0, // odue
            0, // odid
            0, // flags
            '' // data
        );
    });
    
    db.close();
    console.log(`Created Anki database with ${mockCards.length} cards: ${dbPath}`);
    return dbPath;
}

function createApkgFile(dbPath) {
    const zip = new AdmZip();
    
    // Add the collection database
    zip.addLocalFile(dbPath, '', 'collection.anki2');
    
    // Add empty media file (required by Anki)
    zip.addFile('media', Buffer.from('{}'));
    
    // Write the .txt file
    const apkgPath = path.join(__dirname, '../mock/data/placeholder-input.txt');
    fs.ensureDirSync(path.dirname(apkgPath));
    
    zip.writeZip(apkgPath);
    console.log(`Created .txt file: ${apkgPath}`);
    
    // Clean up temp files
    fs.removeSync(path.dirname(dbPath));
    
    return apkgPath;
}

function main() {
    try {
        console.log('Creating mock Anki deck with 26 Computer Science cards...');
        const dbPath = createAnkiDatabase();
        const apkgPath = createApkgFile(dbPath);
        console.log('✅ Mock deck created successfully!');
        console.log(`📁 Location: ${apkgPath}`);
        console.log(`📊 Cards: ${mockCards.length}`);
    } catch (error) {
        console.error('❌ Error creating mock deck:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { createAnkiDatabase, createApkgFile, mockCards };