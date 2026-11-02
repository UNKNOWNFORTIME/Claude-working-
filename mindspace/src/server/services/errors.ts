export class NotFoundError extends Error {
  constructor(what = "Item") {
    super(`${what} not found`);
  }
}
export class ValidationError extends Error {}
