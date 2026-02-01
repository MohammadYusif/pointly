# Branch Protection Setup

This document outlines the recommended branch protection rules for the Pointly repository.

## Required GitHub Secrets

Before the CI/CD pipelines can run, configure these secrets in **Settings > Secrets and variables > Actions**:

### For Staging Deployment
| Secret | Description |
|--------|-------------|
| `AWS_ROLE_ARN_STAGING` | AWS IAM Role ARN for OIDC authentication (staging) |

### For Production Deployment
| Secret | Description |
|--------|-------------|
| `AWS_ROLE_ARN_PRODUCTION` | AWS IAM Role ARN for OIDC authentication (production) |

### Optional
| Secret | Description |
|--------|-------------|
| `CODECOV_TOKEN` | Token for uploading test coverage reports |
| `S3_BUCKET_STAGING` | S3 bucket name for staging dashboard |
| `S3_BUCKET_PRODUCTION` | S3 bucket name for production dashboard |
| `CLOUDFRONT_DIST_STAGING` | CloudFront distribution ID for staging |
| `CLOUDFRONT_DIST_PRODUCTION` | CloudFront distribution ID for production |

## AWS OIDC Setup

Create an IAM Identity Provider in AWS for GitHub Actions:

```bash
# 1. Create OIDC provider (one-time setup)
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1

# 2. Create IAM role with trust policy
```

**Trust Policy (trust-policy.json):**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::YOUR_ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:YOUR_ORG/pointly:*"
        }
      }
    }
  ]
}
```

## Branch Protection Rules

### `main` Branch

Navigate to **Settings > Branches > Add rule** and configure:

1. **Branch name pattern:** `main`

2. **Protect matching branches:**
   - [x] Require a pull request before merging
     - [x] Require approvals: 1
     - [x] Dismiss stale pull request approvals when new commits are pushed
   - [x] Require status checks to pass before merging
     - [x] Require branches to be up to date before merging
     - Required status checks:
       - `Lint & Format`
       - `Type Check`
       - `Test`
       - `Build`
       - `CDK Synth (Validate)`
       - `All Checks Pass`
   - [x] Require conversation resolution before merging
   - [x] Do not allow bypassing the above settings

3. **Rules applied to everyone including administrators:** Yes

### `develop` Branch (if using GitFlow)

1. **Branch name pattern:** `develop`

2. **Protect matching branches:**
   - [x] Require a pull request before merging
   - [x] Require status checks to pass before merging
     - Required status checks:
       - `Lint & Format`
       - `Type Check`
       - `Test`
   - [x] Require conversation resolution before merging

## GitHub Environments

### Staging Environment
Navigate to **Settings > Environments > New environment**:
- **Name:** `staging`
- No protection rules needed (auto-deploys on push to main)

### Production Environment
Navigate to **Settings > Environments > New environment**:
- **Name:** `production`
- **Environment protection rules:**
  - [x] Required reviewers: Add 1-2 team members
  - [x] Wait timer: 0 minutes (or set delay if needed)
- **Deployment branches:**
  - Selected branches: `main` only

## Workflow Summary

```
┌─────────────────────────────────────────────────────────────┐
│                    Pull Request                              │
│  ┌─────────┐  ┌────────────┐  ┌──────┐  ┌───────┐          │
│  │  Lint   │  │ Type Check │  │ Test │  │ Build │          │
│  └────┬────┘  └─────┬──────┘  └──┬───┘  └───┬───┘          │
│       │             │            │          │               │
│       └─────────────┴────────────┴──────────┘               │
│                      │                                       │
│              All Checks Pass                                 │
│                      │                                       │
│              Ready to Merge                                  │
└─────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  Merge to Main                               │
│                       │                                      │
│                       ▼                                      │
│            Deploy to Staging (Auto)                          │
│  ┌─────────────────────────────────────────────────┐        │
│  │ Infrastructure → API Lambda → Merchant Dashboard │        │
│  └─────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Create GitHub Release                           │
│                       │                                      │
│                       ▼                                      │
│           Deploy to Production (Protected)                   │
│  ┌─────────────────────────────────────────────────┐        │
│  │ Requires: Environment approval                   │        │
│  │ Infrastructure → API Lambda → Merchant Dashboard │        │
│  └─────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start Checklist

- [ ] Create AWS OIDC Identity Provider
- [ ] Create IAM roles for staging and production
- [ ] Add `AWS_ROLE_ARN_STAGING` secret
- [ ] Add `AWS_ROLE_ARN_PRODUCTION` secret
- [ ] Create `staging` GitHub environment
- [ ] Create `production` GitHub environment with reviewers
- [ ] Enable branch protection on `main`
- [ ] (Optional) Add CODECOV_TOKEN for coverage reports
- [ ] Push code and verify CI workflow runs
