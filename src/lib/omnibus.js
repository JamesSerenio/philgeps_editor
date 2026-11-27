import { initialDeclaration } from './declarationFields'

export function createInitialOmnibusState(project) {
  return { ...initialDeclaration(project), templateVariant: 'initao_lgu', designation: '' }
}
