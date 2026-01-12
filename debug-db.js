import { initializeDatabase, query } from './backend/models/database.js';

async function testDB() {
    try {
        console.log("Starting DB test...");
        await initializeDatabase();
        console.log("DB Initialized.");

        const sources = query("SELECT * FROM data_sources");
        console.log("Sources count:", sources.length);
        console.log("Sources:", JSON.stringify(sources, null, 2));

        const articles = query("SELECT COUNT(*) as count FROM articles");
        console.log("Articles count:", articles[0].count);

    } catch (e) {
        console.error("DB Test Failed:", e);
    }
}

testDB();
