import assert from "node:assert/strict"

import {
  IMPORT_BATCH_SIZE,
  IMPORT_MAX_TOTAL,
  capImportRows,
  chunkArray,
  runBatchedBulkCreate,
} from "../src/lib/import-batch"

let passed = 0
let failed = 0

function test(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      passed += 1
      console.log(`  ok  ${name}`)
    })
    .catch((error) => {
      failed += 1
      const message = error instanceof Error ? error.message : String(error)
      console.error(`  FAIL  ${name}`)
      console.error(`        ${message}`)
    })
}

async function main() {
  console.log("\nImport batch tests\n")

  await test("defaults are 100 batch and 500 max", () => {
    assert.equal(IMPORT_BATCH_SIZE, 100)
    assert.equal(IMPORT_MAX_TOTAL, 500)
  })

  await test("capImportRows keeps the first 500", () => {
    const rows = Array.from({ length: 520 }, (_, i) => i)
    const capped = capImportRows(rows)
    assert.equal(capped.rows.length, 500)
    assert.equal(capped.truncated, 20)
    assert.equal(capped.rows[0], 0)
    assert.equal(capped.rows[499], 499)
  })

  await test("chunkArray queues exact batches of 100", () => {
    const rows = Array.from({ length: 250 }, (_, i) => i)
    const chunks = chunkArray(rows, 100)
    assert.equal(chunks.length, 3)
    assert.deepEqual(
      chunks.map((chunk) => chunk.length),
      [100, 100, 50]
    )
    assert.equal(chunks[0]?.[0], 0)
    assert.equal(chunks[1]?.[0], 100)
    assert.equal(chunks[2]?.[0], 200)
  })

  await test("runBatchedBulkCreate sends every chunk and aggregates", async () => {
    const calls: number[] = []
    const items = Array.from({ length: 250 }, (_, i) => ({ id: i }))
    const res = await runBatchedBulkCreate(items, async (batch) => {
      calls.push(batch.length)
      return {
        added: batch.length,
        items: batch,
        errors: batch.length === 50 ? [{ message: "tail" }] : [],
      }
    })
    assert.deepEqual(calls, [100, 100, 50])
    assert.equal(res.added, 250)
    assert.equal(res.items.length, 250)
    assert.equal(res.errors.length, 1)
    assert.equal(res.batches, 3)
  })

  console.log(`\n${passed} passed, ${failed} failed\n`)
  if (failed > 0) process.exit(1)
}

void main()
