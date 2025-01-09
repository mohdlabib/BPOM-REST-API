const puppeteer = require('puppeteer');
const fs = require('fs');
const cron = require('node-cron');

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const appendToJsonFile = async (data) => {
    const filename = 'db/bpom_data.json';
    let existingData = { lastUpdated: '', data: [] };

    if (fs.existsSync(filename)) {
        try {
            const file = await fs.promises.readFile(filename, 'utf8');
            existingData = JSON.parse(file);
        } catch (error) {
            console.error('Error reading or parsing JSON file:', error);
        }
    }

    existingData.data.push(data);
    existingData.lastUpdated = getFormattedDate();

    await fs.promises.writeFile(filename, JSON.stringify(existingData, null, 4), 'utf8');
};

const loadSeenRegisterNumbers = async () => {
    const filename = 'db/bpom_data.json';
    const seenNumbers = new Set();

    if (fs.existsSync(filename)) {
        try {
            const file = await fs.promises.readFile(filename, 'utf8');
            const existingData = JSON.parse(file);
            for (const item of existingData.data) {
                seenNumbers.add(item.nomorRegistrasi);
            }
        } catch (error) {
            console.error('Error loading seen register numbers:', error);
        }
    }

    return seenNumbers;
};

const parseData = (data) => {
    const [nomorRegistrasi, terbit] = data.nomorRegistrasi.split("\n");
    const tanggalTerbit = terbit ? terbit.replace('Terbit: ', '').trim() : null;

    const produkDetails = data.namaProduk.split("\n");
    const namaProduk = produkDetails[0]?.trim();
    const merk = produkDetails[1]?.replace('Merk: ', '').trim();
    const kemasan = produkDetails[2]?.replace('Kemasan: ', '').trim();

    const pendaftarDetails = data.pendaftar.split("\n");
    const namaPendaftar = pendaftarDetails[0]?.trim();
    const lokasiPendaftar = pendaftarDetails[1]?.trim();

    return {
        tipe: data.tipe,
        nomorRegistrasi: nomorRegistrasi.trim(),
        tanggalTerbit,
        namaProduk,
        merk,
        kemasan,
        namaPendaftar,
        lokasiPendaftar,
    };
};

const scrapeData = async () => {
    const baseUrl = 'https://cekbpom.pom.go.id/all-produk';
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setDefaultTimeout(0);

    console.log('Membuka halaman...');
    await page.goto(baseUrl, { waitUntil: 'networkidle2' });

    let currentPage = 1;
    const maxPages = 1000;
    const seenRegisterNumbers = await loadSeenRegisterNumbers();

    console.log(`Total nomor registrasi yang sudah diproses: ${seenRegisterNumbers.size}`);

    while (true) {
        try {
            await page.waitForSelector('table tbody tr', { timeout: 30000 });

            const data = await page.evaluate(() => {
                const rows = Array.from(document.querySelectorAll('table tbody tr'));
                return rows.map(row => {
                    const cells = row.querySelectorAll('td');
                    return {
                        tipe: cells[0]?.innerText.trim(),
                        nomorRegistrasi: cells[1]?.innerText.trim(),
                        namaProduk: cells[2]?.innerText.trim(),
                        pendaftar: cells[3]?.innerText.trim(),
                    };
                });
            });

            for (const item of data) {
                const nomorRegistrasi = item.nomorRegistrasi.split("\n")[0].trim();
                if (!seenRegisterNumbers.has(nomorRegistrasi)) {
                    const parsedData = parseData(item);
                    await appendToJsonFile(parsedData);
                    seenRegisterNumbers.add(nomorRegistrasi);
                }
            }

        } catch (error) {
            console.error(`Gagal mengambil data dari halaman ${currentPage}:`, error);
            break;
        }

        const nextButton = await page.$('.pagination-wrapper  #custom_table_next');
        const isDisabled = await page.evaluate(button => button?.disabled, nextButton);

        if (!nextButton || isDisabled) {
            console.log('Halaman terakhir, berhenti scraping.');
            break;
        }

        if (currentPage >= maxPages) {
            console.log(`Mencapai batas maksimal halaman (${maxPages}). Berhenti scraping.`);
            break;
        }

        try {
            await page.click('.pagination-wrapper #custom_table_next');
            await delay(5000);
        } catch (error) {
            console.error(`Gagal navigasi ke halaman berikutnya dari halaman ${currentPage}:`, error);
        }

        currentPage++;
    }

    console.log('Scraping selesai. Data disimpan ke file db/bpom_data.json.');
    await browser.close();
};

function getFormattedDate() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

cron.schedule('0 22 * * *', async () => {
    const currentDate = getFormattedDate();
    console.log(`Menjalankan scraping pada: ${currentDate}`);
    await scrapeData();
});

scrapeData();
