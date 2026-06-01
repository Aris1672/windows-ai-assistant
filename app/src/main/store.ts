import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'

interface StoreData {
  authToken?: string
  userEmail?: string
}

function getStorePath(): string {
  const dir = app.getPath('userData')
  mkdirSync(dir, { recursive: true })
  return join(dir, 'store.json')
}

function read(): StoreData {
  const path = getStorePath()
  if (!existsSync(path)) return {}
  try {
    return JSON.parse(readFileSync(path, 'utf-8'))
  } catch {
    return {}
  }
}

function write(data: StoreData): void {
  writeFileSync(getStorePath(), JSON.stringify(data, null, 2), 'utf-8')
}

export const store = {
  get<K extends keyof StoreData>(key: K, defaultValue?: StoreData[K]): StoreData[K] | undefined {
    return read()[key] ?? defaultValue
  },
  set<K extends keyof StoreData>(key: K, value: StoreData[K]): void {
    write({ ...read(), [key]: value })
  },
  delete<K extends keyof StoreData>(key: K): void {
    const data = read()
    delete data[key]
    write(data)
  }
}
