import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import minimist from 'minimist'
import { getStorageClient, createKey } from '@payloadcms/plugin-cloud'
import { fromBuffer } from 'file-type'
import { input, confirm } from '@inquirer/prompts'

dotenv.config({
  path: path.resolve(__dirname, '../.env'),
})

const args = minimist(process.argv.slice(2))
const DRY_RUN = args['dry-run'] === 'false' ? false : true
console.log(`DRY_RUN: ${DRY_RUN}`)

const main = async () => {
  const uploadDir = await input({ message: 'Enter absolute path of uploads directory' })
  if (!uploadDir) {
    console.log('No uploadDir provided')
    return
  }

  const uploadSlug = await input({
    message: 'Enter upload slug. Reference your Payload config. (usually "media")',
  })
  if (!uploadSlug) {
    console.log('No uploadSlug provided')
    return
  }

  const importUploadDir = path.resolve(uploadDir)

  validateAllEnvs()

  // Get all files from the upload directory
  const files = fs.readdirSync(importUploadDir)

  // prompt to continue
  const confirmContinue = await confirm({
    message: `Preparing to upload ${files.length} files from ${importUploadDir}... Continue?`,
    default: false,
  })

  if (!confirmContinue) {
    console.log('Aborting upload operation.')
    process.exit(0)
  }

  const { storageClient, identityID } = await getStorageClient()

  const batches = chunk(files, 5)

  for (const batch of batches) {
    try {
      await Promise.all(
        batch.map(async fileName => {
          const logPrefix = `${DRY_RUN ? '[DRY RUN]' : ''} ${fileName}:`
          try {
            console.log(`${logPrefix} Uploading...`)
            if (DRY_RUN) {
              console.log(`${logPrefix} Skipped upload`)
              return
            } else {
              // get buffer of the file
              const fullFilePath = path.resolve(importUploadDir, fileName)
              const fileBuffer = fs.readFileSync(fullFilePath)
              const mimeType = (await fromBuffer(fileBuffer)).mime
              await storageClient.putObject({
                Bucket: process.env.PAYLOAD_CLOUD_BUCKET,
                Key: createKey({ collection: uploadSlug, filename: fileName, identityID }),
                Body: fileBuffer,
                ContentType: mimeType,
              })
              console.log(`${logPrefix} Uploaded`)
            }
          } catch (err) {
            console.error(`File ${fileName} failed to create`)
            console.error(err)
          } finally {
            console.log(`${logPrefix} Upload complete!`)
          }
        }),
      )
    } catch (err) {
      console.log(`Unable to upload file from batch: ${batch.map(f => f).join(', ')}`)
      console.error(err)
      process.exit(0)
    }
  }

  console.log('Upload completed!')
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

function chunk<T>(array: T[], size = 5): T[][] {
  size = Math.max(size, 0)
  const length = array == null ? 0 : array.length
  if (!length || size < 1) {
    return []
  }
  let index = 0
  let resIndex = 0
  const result = new Array(Math.ceil(length / size))

  while (index < length) {
    result[resIndex++] = array.slice(index, (index += size))
  }
  return result
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
