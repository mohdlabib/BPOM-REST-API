const puppeteer = require('puppeteer');
const fs = require('fs');
const cron = require('node-cron');

const filename = 'db/bpom_data.json';

const appendToJsonFile = async (filename, data) => {
    if (typeof filename !== 'string') {
        throw new TypeError(`Invalid filename: ${filename}. Filename must be a string.`);
    }

    try {
        const existingData = JSON.parse(await fs.promises.readFile(filename, 'utf8'));
        existingData.lastUpdated = getFormattedDate();
        existingData.data.push(data);
        await fs.promises.writeFile(filename, JSON.stringify(existingData, null, 4));
    } catch (err) {
        if (err.code === 'ENOENT') {
            console.log(`File tidak ditemukan. Membuat file baru: ${filename}`);
            await fs.promises.writeFile(filename, JSON.stringify([data], null, 4));
        } else {
            console.error(`Error saat membuka atau menulis ke file: ${err.message}`);
            throw err;
        }
    }
}

const loadSeenRegisterNumbers = async () => {
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
    const totalPerPage = 15000;

    while (true) {
        try {
            const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
            const page = await browser.newPage();
            await page.setDefaultTimeout(0);

            console.log('Membuka halaman...');
            await page.goto(baseUrl, { waitUntil: 'networkidle2' });
            await page.waitForSelector('#table_wrapper');

            const customLengthExists = await page.evaluate(() => {
                return !!document.querySelector('#customLength');
            });

            if (customLengthExists) {
                console.log(`Mengatur jumlah data per halaman menjadi ${totalPerPage}...`);
                await page.evaluate((total) => {
                    const input = document.querySelector('#customLength');
                    if (input) {
                        input.value = total;
                        const event = new Event('change', { bubbles: true });
                        input.dispatchEvent(event);
                    }
                }, totalPerPage);

                await page.waitForFunction(() => {
                    const blockUiElement = document.querySelector('.block-ui-overlay');
                    return !blockUiElement || blockUiElement.style.display === 'none';
                });
            }

            console.log('Mulai scraping data...');
            await scrapeTableData(page); 
            console.log('Scraping selesai.');

            await browser.close();
            break; 
        } catch (error) {
            console.error(`Terjadi error: ${error.message}`);
            console.log('Mencoba ulang...');
        }
    }
}

const scrapeTableData = async (page) => {
    const seenRegisterNumbers = await loadSeenRegisterNumbers();
    console.log(`Total nomor registrasi yang sudah diproses: ${seenRegisterNumbers.size}`);

    while (true) {
        try {
            await page.waitForSelector('table tbody tr');

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
                    await appendToJsonFile(filename, parsedData);
                    seenRegisterNumbers.add(nomorRegistrasi);
                }
            }

        } catch (error) {
            console.error('Gagal mengambil data dari tabel:', error);
            throw error; 
        }

        const nextButton = await page.$('.pagination-wrapper #custom_table_next');
        const isDisabled = await page.evaluate(button => button?.disabled, nextButton);

        if (!nextButton || isDisabled) {
            console.log('Halaman terakhir, berhenti scraping.');
            break;
        }

        try {
            await page.click('.pagination-wrapper #custom_table_next');
            console.log('Navigasi ke halaman berikutnya...');

            await page.waitForFunction(() => {
                const blockUiElement = document.querySelector('.block-ui-overlay');
                return blockUiElement && blockUiElement.style.display !== 'none';
            });

            await page.waitForFunction(() => {
                const blockUiElement = document.querySelector('.block-ui-overlay');
                return !blockUiElement || blockUiElement.style.display === 'none';
            });

        } catch (error) {
            console.error('Gagal navigasi ke halaman berikutnya:', error);
            throw error;
        }
    }
}

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

cron.schedule('0 23 * * *', async () => {
    const currentDate = getFormattedDate();
    console.log(`Menjalankan scraping pada: ${currentDate}`);
    await scrapeData();
});

scrapeData();
