# cwcinc.dev

Portfolio site built with Next.js and Tailwind CSS.

## Local development

```bash
npm install
npm run dev
```

## Production/static build

This project is configured for static export for S3 hosting.

```bash
npm run build:static
```

Build output is generated in `out/`.

## CI/CD to AWS (S3 + CloudFront)

GitHub Actions workflow: `.github/workflows/deploy.yml`

On push to `main`, the workflow:
1. Installs dependencies
2. Builds the static site
3. Uploads `out/` to S3
4. Invalidates CloudFront cache

### Required GitHub repository secrets

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `S3_BUCKET_NAME`
- `CLOUDFRONT_DISTRIBUTION_ID`

## Notes

- S3 bucket should be configured for static website hosting (or served via CloudFront origin access).
- CloudFront should point to your S3 origin and handle HTTPS.
