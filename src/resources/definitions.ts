import { getDefinition, storeDefinition } from '../definitions/store.js'

export async function handleGetDefinition(term: string) {
    const definition = await getDefinition(term)
    return { definition }
}

export async function handleStoreDefinition(term: string, value: string) {
    const success = await storeDefinition(term, value)
    return { success }
}
