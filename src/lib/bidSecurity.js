import { initialDeclaration } from './declarationFields'

export function createInitialBidSecurityState(project) {
  return { ...initialDeclaration(project), representativeDesignation: '' }
}
