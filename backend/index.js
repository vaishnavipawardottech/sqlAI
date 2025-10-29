import dotenv from 'dotenv';
import { app } from './app.js';
import { checkConnection } from './db/index.js';
import { createTable } from './utils/database.js';

const port = process.env.PORT || 3000;

dotenv.config({
    path: './.env',
})

app.listen(port, async () => {
    console.log(`Server running on port: ${port}`);
    try {
        await checkConnection();
        await createTable();
    } catch (error) {
        console.log("Failed to initialize the database: ", error);
    }
})