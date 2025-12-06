import * as nodemailer from "nodemailer";
import * as path from "path";
import { fileURLToPath } from "url";
import * as os from "os";
import * as fs from "fs";
import ExcelJS from 'exceljs'


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Attachment {
    filename: string;
    path: string;
    contentType: string;
}

interface TransportConfig {
    host: string;
    port: number;
    secure: boolean;
}

interface MailOptions {
    from: string;
    to: string;
    subject: string;
    text: string;
    html: string;
    attachments: Attachment[];
}

interface SendMailParams {
    host?: string;
    port?: number;
    secure?: boolean;
    from: string;
    to: string;
    subject: string;
    text: string;
    html: string;
    attachments?: Attachment[];
}

async function sendMail(params: SendMailParams): Promise<string> {
    const smtpPort = Number(process.env.SMTP_PORT);
    const transportConfig: TransportConfig = {
        host: params.host ?? process.env.SMTP_HOST ?? "localhost",
        port: params.port ?? (smtpPort || 1025),
        secure: params.secure ?? process.env.SMTP_SECURE === "true",
    };

    const transporter = nodemailer.createTransport(transportConfig);

    const mailOptions: MailOptions = {
        from: params.from,
        to: params.to,
        subject: params.subject,
        text: params.text,
        html: params.html,
        attachments: params.attachments ?? [],
    };

    const info = await transporter.sendMail(mailOptions);

    console.log("Message sent:", info.messageId);
    return info.messageId;
}

// Example usage
const exampleParams: SendMailParams = {
    from: process.env.MAIL_FROM ?? "test@example.com",
    to: process.env.MAIL_TO ?? "user@example.com",
    subject: "ทดสอบส่งอีเมลพร้อมไฟล์ Excel",
    text: "ไฟล์แนบเป็นรายงาน Excel",
    html: "<b>ไฟล์แนบเป็นรายงาน Excel</b>",
    attachments: [
        {
            filename: "report.xlsx",
            path: path.join(__dirname, "files/report.xlsx"),
            contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        }
    ]
};

export class XExcelJS<const T extends readonly string[] = [], Values extends string = Extract<T[keyof T], string>> {
    Columns: { key: Values, width: number }[] = []
    addCol = (key: Values, width: number) => {
        this.Columns.push({ key, width })
        return this
    }
}

async function generateExcelReport(data: { fullName: string, email: string }[]) {
    const filename = `report.xlsx`
    const filePath = path.join(os.tmpdir(), filename)
    // Placeholder function to generate an Excel report
    // In a real implementation, you would use a library like ExcelJS to create the file
    console.log("Generating Excel report...");

    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Sheet1')
    const header = ['Full Name', 'Email',] as const

    const headerRow = worksheet.addRow(header)
    headerRow.eachCell((cell) => {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: '4c4c4c' },
            bgColor: { argb: '4c4c4c' }
        }
        cell.font = { bold: true, color: { argb: 'FFFFFF' } }
    })

    const xHeader = new XExcelJS<typeof header>()
        .addCol('Full Name', 15)
        .addCol('Email', 15)


    worksheet.columns = xHeader.Columns
    // worksheet.columns = [
    //     { key: 'Full Name', width: 15 },
    //     { key: 'Email', width: 15 },
    // ]

    data.forEach(item => {
        worksheet.addRow([item.fullName, item.email])
    })

    await workbook.xlsx.writeFile(filePath)
    const buffer = await workbook.xlsx.writeBuffer()

    const result = await sendMail({
        from: process.env.MAIL_FROM ?? "test@example.com",
        to: process.env.MAIL_TO ?? "user@example.com",
        subject: "ทดสอบส่งอีเมลพร้อมไฟล์ Excel",
        text: "ไฟล์แนบเป็นรายงาน Excel",
        html: "<b>ไฟล์แนบเป็นรายงาน Excel</b>",
        attachments: [
            {
                filename: filename,
                path: filePath,
                contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            }
        ]
    })

    console.log("Excel report sent with message ID:", result);

    // clean up the generated file after sending the email
    fs.unlinkSync(filePath);
}

// sendMail(exampleParams).catch(console.error);

generateExcelReport([
    { fullName: 'John Doe', email: 'john.doe@example.com' }
]).catch(console.error);

export { sendMail };
export type { SendMailParams, Attachment, TransportConfig, MailOptions };

