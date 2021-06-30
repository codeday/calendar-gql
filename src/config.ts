/* eslint-disable @typescript-eslint/no-non-null-assertion, node/no-process-env */
import { config as loadEnv } from 'dotenv';
import SMTPConnection from 'nodemailer/lib/smtp-connection';
import { PrismaClient } from '@prisma/client';

loadEnv();

const config = {
  debug: process.env.NODE_ENV !== 'production',
  email: <SMTPConnection.Options & { from: string }>{
    host: process.env.EMAIL_HOST!,
    port: Number.parseInt(process.env.EMAIL_PORT!, 10),
    auth: {
      user: process.env.EMAIL_USER!,
      pass: process.env.EMAIL_PASS!,
    },
    from: process.env.EMAIL_FROM!,
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID!,
    authToken: process.env.TWILIO_AUTH_TOKEN!,
    phone: process.env.TWILIO_PHONE!,
  },
  prisma: new PrismaClient(),
};

export default config;
