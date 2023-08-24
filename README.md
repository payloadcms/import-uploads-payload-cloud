# Payload Cloud Upload Import

Migrate existing uploads from a static directory into Payload Cloud's storage. NOTE: **The records must already exist in the database. This is for moving files from local to Payload Cloud S3 storage**.

## Usage

1. Copy .env.example to .env and fill out the values by visiting your cloud project's `File Storage` tab.
2. Run `yarn import-uploads`. This will dry-run by default. Follow prompts.
3. After verifying every _would run properly_, run `yarn import-uploads:prod` with the same values
