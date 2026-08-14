import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import dotenv from 'dotenv';

// Muat tetapan dari fail .env
dotenv.config();

// Inisialisasi API Gemini
// Pastikan anda menetapkan GEMINI_API_KEY dalam fail .env
if (!process.env.GEMINI_API_KEY) {
    console.error("❌ Ralat: GEMINI_API_KEY tidak dijumpai dalam fail .env");
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function analyzeDocument(imagePath, documentType) {
    try {
        console.log(`⏳ Membaca dokumen: ${imagePath}...`);
        
        // Membaca fail imej atau PDF
        const documentBuffer = fs.readFileSync(imagePath);
        const mimeType = imagePath.endsWith('.pdf') ? 'application/pdf' : 
                         imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';

        let promptText = '';
        if (documentType === 'payslip') {
            promptText = `
Anda adalah sistem pakar dalam membaca slip gaji (payslip) di Malaysia. 
Sila analisa imej/dokumen slip gaji yang dilampirkan dan keluarkan maklumat berikut dalam format JSON yang sah (valid JSON).
Jika maklumat tiada, letak null.

Format JSON yang diperlukan:
{
    "nama_pekerja": "String",
    "gaji_pokok": "Number",
    "elaun_tetap": "Number",
    "gaji_kasar": "Number",
    "gaji_bersih": "Number",
    "jumlah_potongan": "Number",
    "potongan_angkasa": "Number (Jika ada, contoh: BPA, ANGKASA. Jika tiada letak 0)",
    "nama_majikan": "String"
}
Jangan berikan sebarang penerangan, hanya pulangkan output dalam format JSON sahaja.`;
        } else if (documentType === 'ccris') {
            promptText = `
Anda adalah sistem pakar dalam menganalisa laporan CCRIS/CTOS di Malaysia.
Sila analisa dokumen laporan ini dan keluarkan maklumat berikut dalam format JSON.

Format JSON yang diperlukan:
{
    "jumlah_komitmen_bulanan": "Number (Jumlah kesemua bayaran ansuran bulanan)",
    "ada_tunggakan": "Boolean (true jika ada arrears/tunggakan > 0 bulan, false jika clean/semua 0)",
    "status_blacklist": "Boolean (true jika ada status SAA atau AKPK, false jika tiada)"
}
Jangan berikan sebarang penerangan, hanya pulangkan output dalam format JSON sahaja.`;
        }

        console.log("🤖 Menghantar dokumen kepada AI (Gemini 2.0 Flash) untuk dianalisa...");
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: [
                promptText,
                {
                    inlineData: {
                        data: documentBuffer.toString("base64"),
                        mimeType: mimeType
                    }
                }
            ],
            config: {
                responseMimeType: "application/json",
            }
        });

        const result = response.text;
        console.log("\n✅ Hasil Ekstraksi (Format Berstruktur JSON):");
        
        const parsedJson = JSON.parse(result);
        console.log(JSON.stringify(parsedJson, null, 2));
        
        return parsedJson;

    } catch (error) {
        console.error("❌ Ralat berlaku:", error.message);
    }
}

// Skrip utama
const type = process.argv[2] || 'payslip';
const filename = process.argv[3];

if (!filename) {
    console.log(`⚠️ Sila nyatakan nama fail.`);
    console.log(`Cara lari: node extract.js <payslip|ccris> <nama-gambar-atau-pdf>`);
    console.log(`Contoh: node extract.js payslip payslip-ahmad.jpg`);
} else if (!fs.existsSync(filename)) {
    console.log(`⚠️ Fail '${filename}' tidak dijumpai di dalam folder ini.`);
} else {
    analyzeDocument(filename, type);
}
