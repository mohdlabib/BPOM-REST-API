const express = require('express');
const fs = require('fs');
const app = express();
const port = 6070;

app.use(express.json());

const readDataFromFile = () => {
    const filename = 'db/bpom_data.json';
    if (fs.existsSync(filename)) {
        try {
            const fileContent = fs.readFileSync(filename, 'utf8');
            return fileContent.trim() ? JSON.parse(fileContent) : { lastUpdated: null, data: [] };
        } catch (error) {
            console.error('Error reading or parsing JSON file:', error);
            return { lastUpdated: null, data: [] };
        }
    }
    return { lastUpdated: null, data: [] };
};


app.get('/', (req, res) => {
    res.json(readDataFromFile());
});

app.listen(port, () => {
    console.log(`✨ BPOM REST API server is running at http://localhost:${port} ✨`);
});
