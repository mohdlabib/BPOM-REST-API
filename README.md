# 🧪 BPOM REST API

A **REST API** for scraping and serving BPOM (Indonesian Food and Drug Authority) product data. This project automates data collection from the BPOM website and provides an easy-to-use API for accessing the information.

---

## 🚀 Features

- 📥 **Data Scraping**: Automatically fetch BPOM product registration data.
- 🔄 **Scheduled Updates**: Daily updates using a cron job.
- 📂 **JSON Storage**: Save and organize data in a structured format.
- 🌐 **RESTful API**: Access and search product data effortlessly.

---

## 🛠️ Installation

### Prerequisites
Ensure the following are installed:
- Node.js (v18 or higher)
- Chromium browser (handled by Puppeteer)

### Steps
1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/BPOM-REST-API.git
   cd BPOM-REST-API
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the application:
   ```bash
   node server.js
   ```

4. Access the API at:  
   👉 **[https://bpom.gumserver.my.id](https://bpom.gumserver.my.id)**

---

## 📡 API Endpoints

### 🔍 Fetch All Data
**GET** `/api/bpom`

### 🔎 Search by Registration Number
**GET** `/api/bpom/:nomorRegistrasi`

### 🛒 Search by Product Name
**GET** `/api/bpom/search?namaProduk={product_name}`

### 📅 Metadata
**GET** `/api/bpom/metadata`

---

## ⏰ Scheduled Scraping
Scraping runs automatically every day at **10:00 PM** to keep the data updated. To trigger scraping manually, use:
```bash
node scraper.js
```

---

## 📂 Directory Structure
```
BPOM-REST-API/
├── db/                 # JSON storage for scraped data
├── scraper.js          # Data scraping logic
├── server.js           # REST API server
├── package.json        # Project dependencies
└── README.md           # Documentation
```

---

## 🛡️ Important Notes
- Use the `--no-sandbox` flag to run Puppeteer as root.
- Avoid running the application as root for better security.

---

## 👥 Contributors
- [Your Name](https://github.com/your-username)  
Feel free to contribute by submitting issues and pull requests!

---

## 📜 License
Licensed under the MIT License.  
Happy coding! 🎉
