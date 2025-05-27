import { storeDefinition } from '../definitions/store.js'

export async function handleStoreDefinition(term: string, value: string) {
    const success = await storeDefinition(term, value)
    return { success }
}
