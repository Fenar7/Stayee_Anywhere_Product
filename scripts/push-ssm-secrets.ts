import { SSMClient, PutParameterCommand } from "@aws-sdk/client-ssm";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

// Load the local production env file
const envPath = path.resolve(process.cwd(), ".env.prod.local");

if (!fs.existsSync(envPath)) {
  console.error("❌ ERROR: .env.prod.local file not found!");
  process.exit(1);
}

const envConfig = dotenv.parse(fs.readFileSync(envPath));

// Ensure AWS Region is set either in the env file or default to ap-south-1
const region = envConfig.AWS_REGION || "ap-south-1";

// Initialize SSM Client with explicit credentials from the env file
const ssm = new SSMClient({ 
  region,
  credentials: {
    accessKeyId: envConfig.AWS_ACCESS_KEY_ID,
    secretAccessKey: envConfig.AWS_SECRET_ACCESS_KEY
  }
});

const pushSecret = async (key: string, value: string) => {
  const paramName = `/staye/prod/${key}`;
  
  if (!value) {
    console.warn(`⚠️ WARNING: Skipping ${key} because value is empty.`);
    return;
  }

  try {
    const command = new PutParameterCommand({
      Name: paramName,
      Value: value.replace(/^"|"$/g, ''), // strip quotes if present
      Type: "SecureString",
      Overwrite: true,
    });
    
    await ssm.send(command);
    console.log(`✅ SUCCESS: Pushed ${paramName}`);
  } catch (error: any) {
    console.error(`❌ ERROR pushing ${paramName}:`, error.message);
  }
};

async function main() {
  console.log("🚀 Starting SSM Parameter push for Production MVP...");
  console.log(`🌍 Region: ${region}`);
  
  // We map the exact keys the SDD wants. If the local env uses a different name, map it.
  const mapping: Record<string, string> = {
    "DATABASE_URL": envConfig.DATABASE_URL,
    "COGNITO_CLIENT_ID": envConfig.COGNITO_CLIENT_ID,
    "COGNITO_CLIENT_SECRET": envConfig.COGNITO_CLIENT_SECRET,
    "COGNITO_ISSUER": envConfig.COGNITO_ISSUER,
    "S3_BUCKET_NAME": envConfig.AWS_S3_BUCKET_NAME,
    "NEXTAUTH_SECRET": envConfig.NEXTAUTH_SECRET,
    "NEXTAUTH_URL": envConfig.NEXTAUTH_URL
  };

  for (const [key, value] of Object.entries(mapping)) {
    if (value) {
      await pushSecret(key, value);
    } else {
      console.warn(`⚠️ WARNING: ${key} is missing in .env.prod.local`);
    }
  }
  
  console.log("🎉 All done!");
}

main();
