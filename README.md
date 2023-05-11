# Payload Cloud Upload Import

Migrate existing uploads from a static directory into Payload Cloud's storage. NOTE: **The records must already exist in the database**.

## Usage

1. Copy .env.example to .env and fill out the values
2. Run `yarn import-uploads`. This will dry-run by default
3. After verifying, run `yarn import-uploads:prod`
