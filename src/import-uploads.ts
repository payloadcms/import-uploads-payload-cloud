import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import { getStorageClient, createKey } from '@payloadcms/plugin-cloud'
import { fromBuffer } from 'file-type'

dotenv.config({
  path: path.resolve(__dirname, '../.env'),
})

const { DRY_RUN } = parseArgs()
console.log(`DRY_RUN: ${DRY_RUN}`)

// Ensure this matches your payload config
const collectionSlug = 'media'

// Ensure this matches your import directory
const importMediaDir = path.resolve(__dirname, '../import')

const main = async () => {
  validateAllEnvs()

  // Get all files from the media directory
  const files = fs.readdirSync(importMediaDir)
  console.log(`Preparing to upload ${files.length} media files`)
  const { storageClient, identityID } = await getStorageClient()

  try {
    await Promise.all(
      files.map(async fileName => {
        const logPrefix = `${DRY_RUN ? 'DRY RUN' : ''} ${fileName}:`
        try {
          console.log(`${logPrefix} Uploading...`)
          if (DRY_RUN) {
            console.log(`${logPrefix} Skipped upload`)
            return
          } else {
            // get buffer of the file
            const fullFilePath = path.resolve(importMediaDir, fileName)
            const fileBuffer = fs.readFileSync(fullFilePath)
            const mimeType = (await fromBuffer(fileBuffer)).mime
            await storageClient.putObject({
              Bucket: process.env.PAYLOAD_CLOUD_BUCKET,
              Key: createKey({ collection: collectionSlug, filename: fileName, identityID }),
              Body: fileBuffer,
              ContentType: mimeType,
            })
            console.log(`${logPrefix} Uploaded`)
          }
        } catch (err) {
          console.error(`Media ${fileName} failed to create`)
          console.error(err)
        } finally {
          console.log(`${logPrefix} Upload complete!`)
        }
      }),
    )
  } catch (err) {
    console.log('Unable to upload media')
    console.error(err)
    process.exit(0)
  }

  console.log('Media upload completed!')
  process.exit(0)
}

main()

function parseArgs(): { DRY_RUN: boolean } {
  const args = process.argv.slice(2)
  const dryRunIndex = args.findIndex(arg => arg === '--dry-run')
  if (dryRunIndex !== -1) {
    args.splice(dryRunIndex, 1)
  }
  const DRY_RUN = args[dryRunIndex] === 'false' ? false : true
  return { DRY_RUN }
}

// Validate all required envs
function validateAllEnvs() {
  const requiredEnvs = [
    'PAYLOAD_CLOUD',
    'PAYLOAD_CLOUD_COGNITO_USER_POOL_ID',
    'PAYLOAD_CLOUD_COGNITO_USER_POOL_CLIENT_ID',
    'PAYLOAD_CLOUD_COGNITO_IDENTITY_POOL_ID',
    'PAYLOAD_CLOUD_BUCKET',
    'PAYLOAD_CLOUD_COGNITO_PASSWORD',

    'PAYLOAD_CLOUD_PROJECT_ID',
    'PAYLOAD_CLOUD_ENVIRONMENT',
  ]

  requiredEnvs.forEach(env => {
    if (!process.env[env]) {
      throw new Error(`Missing required env: ${env}`)
    }
  })
}
