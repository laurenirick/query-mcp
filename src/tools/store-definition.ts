import { storeDefinition, removeDefinition } from '../definitions/store.js'

export async function handleStoreDefinition(term: string, value: string) {
    const success = await storeDefinition(term, value)
    return { success }
}

export async function handleRemoveDefinition(term: string) {
    const success = await removeDefinition(term)
    return { success }
}
