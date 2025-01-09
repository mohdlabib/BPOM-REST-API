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
            return JSON.parse(fileContent);
        } catch (error) {
            console.error('Error reading or parsing JSON file:', error);
            return { lastUpdated: null, data: [] };
        }
    }
    return { lastUpdated: null, data: [] };
};

app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to the BPOM REST API!',
        description: 'This API provides data about BPOM registered products.',
        endpoints: {
            getAllData: {
                method: 'GET',
                path: '/api/bpom',
                description: 'Retrieve all BPOM data',
            },
            getByNomorRegistrasi: {
                method: 'GET',
                path: '/api/bpom/:nomorRegistrasi',
                description: 'Retrieve data by registration number',
            },
            searchByNamaProduk: {
                method: 'GET',
                path: '/api/bpom/search?namaProduk=<query>',
                description: 'Search for data by product name',
            },
            getMetadata: {
                method: 'GET',
                path: '/api/bpom/metadata',
                description: 'Retrieve metadata such as last update time',
            },
        },
        example: {
            searchByNamaProduk: '/api/bpom/search?namaProduk=Paracetamol',
        },
    });
});

app.get('/api/bpom', (req, res) => {
    const { data } = readDataFromFile();
    res.json({
        success: true,
        message: 'Retrieved all BPOM data successfully.',
        data,
    });
});

app.get('/api/bpom/:nomorRegistrasi', (req, res) => {
    const { nomorRegistrasi } = req.params;
    const { data } = readDataFromFile();
    const result = data.find(item => item.nomorRegistrasi === nomorRegistrasi);

    if (result) {
        res.json({
            success: true,
            message: `Data found for registration number: ${nomorRegistrasi}`,
            data: result,
        });
    } else {
        res.status(404).json({
            success: false,
            message: `No data found for registration number: ${nomorRegistrasi}`,
        });
    }
});

app.get('/api/bpom/search', (req, res) => {
    const { namaProduk } = req.query;

    if (!namaProduk) {
        return res.status(400).json({
            success: false,
            message: 'Query parameter "namaProduk" is required.',
        });
    }

    const { data } = readDataFromFile();
    const result = data.filter(item =>
        item.namaProduk.toLowerCase().includes(namaProduk.toLowerCase())
    );

    if (result.length > 0) {
        res.json({
            success: true,
            message: `Found ${result.length} products matching "${namaProduk}".`,
            data: result,
        });
    } else {
        res.status(404).json({
            success: false,
            message: `No products found matching "${namaProduk}".`,
        });
    }
});

app.get('/api/bpom/metadata', (req, res) => {
    const { lastUpdated } = readDataFromFile();
    res.json({
        success: true,
        message: 'Retrieved metadata successfully.',
        metadata: { lastUpdated },
    });
});

app.listen(port, () => {
    console.log(`✨ BPOM REST API server is running at http://localhost:${port} ✨`);
});
