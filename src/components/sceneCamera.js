export const OVERVIEW = { t: [0, 0, 0], cam: [0, 23, 31] }

export const focusAt = (x, z, d = 13) => ({
  t: [x, 0, z],
  cam: [x + d * 0.4, d * 0.75, z + d],
})
