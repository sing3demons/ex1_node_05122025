import * as nodemailer from "nodemailer";
import * as path from "path";
import { fileURLToPath } from "url";

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

sendMail(exampleParams).catch(console.error);

export { sendMail };
export type { SendMailParams, Attachment, TransportConfig, MailOptions };

