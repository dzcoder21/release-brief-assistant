export class AiError extends Error {
  /** `message` is safe to show to users; never put provider responses or keys in it. */
  constructor(code, message, retryable = true) {
    super(message);
    this.code = code;
    this.retryable = retryable;
  }
}
