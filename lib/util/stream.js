import {Transform} from 'node:stream'

export function createStreamLimiter(limit) {
  let length = 0

  return new Transform({
    transform(chunk, enc, cb) {
      if (chunk.length + length > limit) {
        this.push(chunk.slice(0, limit - length))
        this.destroy()
      } else {
        length += chunk.length
        this.push(chunk)
      }

      cb()
    }
  })
}
