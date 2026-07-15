# Final AWS Runbook (Aligned with SDD v1.7)

This runbook entirely replaces the old "Concept Document" and aligns 100% with the strict engineering standards defined in `sdd_v1.7.md` for the Phase 1 MVP deployment.

## What We Have Completed So Far ✅
- [x] Ripped out Supabase and migrated the schema to standard PostgreSQL.
- [x] Provisioned AWS RDS (PostgreSQL).
- [x] Provisioned Amazon S3 Bucket for documents.
- [x] Provisioned AWS Cognito User Pool.
- [x] Wrote the multi-stage Dockerfile for Next.js.
- [x] Secured all Production Environment Variables using SSM Parameter Store (Automated push).

---

## What We Must Do Next (The Remaining Steps) 🚀

### Step 1: Provision the EC2 Host (Manual AWS Step)
- Create an IAM Role named `hostel-app-ec2-role` and attach two AWS-managed policies: 
  - `AmazonSSMManagedInstanceCore` (Allows GitHub Actions to deploy code without SSH).
  - `CloudWatchLogsFullAccess` (Allows Docker to stream logs).
- Launch an EC2 `t3.micro` instance in `ap-south-1` using Amazon Linux 2023.
- Attach the `hostel-app-ec2-role` to this instance.
- **Security:** Do NOT open Port 22 (SSH) to the internet. Only open Port 80 (HTTP) to the public for now (until we set up CloudFront).

### Step 2: Rewrite the CI/CD Pipeline (Agent Task)
- **Delete** the legacy `docker-compose.yml` (SSM does not need it).
- **Rewrite** `.github/workflows/deploy.yml` to use `aws ssm send-command`.
- **Configure CloudWatch:** The deployment script will run Docker with `--log-driver=awslogs` so we never have to SSH into the server to read application errors.
- **Secure Secrets:** The deployment script will use IAM permissions to securely pull the 7 parameters from SSM directly into the EC2 instance at boot time.

### Step 3: CI/CD Execution
- Push the code to GitHub's `main` branch.
- Watch GitHub Actions automatically build the Docker image, push it to ECR, and use SSM to deploy it to the EC2 instance.
- Verify the app is running by visiting the EC2 Public IP address.

### Step 4: Edge Security Configuration (Manual AWS Step)
- Request a free SSL Certificate in AWS ACM (Certificate Manager).
- Create a CloudFront CDN Distribution pointing to the EC2 instance.
- Enable AWS WAF (Web Application Firewall) on the CloudFront distribution to block SQL injections and DDoS attacks.
- Update the EC2 Security Group to ONLY accept traffic from CloudFront.

### Step 5: Database Migration
- Use the CI/CD pipeline (or a separate GitHub Actions manual workflow) to run `npx prisma migrate deploy` to create all the tables in the production RDS database.
