import { ID } from "./interfaces"

export interface ClockValue {
  instanceId: ID
  time: Date
  seq: number
}

export function getNext(instanceId: ID, lastId: ID | undefined): ID {
  const val = makeClockValue({
    instanceId,
    time: new Date(),
    seq: 0,
  })

  if (lastId && lastId > val) {
    const lastVal = parseClockValue(lastId)

    if (lastVal.seq >= 0xfff) {
      throw new Error(`Clock ran out: ${JSON.stringify(lastVal)}`)
    }

    return makeClockValue({
      ...lastVal,
      seq: lastVal.seq + 1,
    })
  }

  return val
}

export function parseClockValue(id: ID): ClockValue {
  const [time, seqStr, instanceId] = id.split("/")
  if (!time || !seqStr || !instanceId)
    throw new Error(`Can not parse clock value ${id}`)
  const seq = parseInt(seqStr, 16)
  if (isNaN(seq) || seq < 0) throw new Error(`Can not parse clock value ${id}`)
  return {
    instanceId,
    time: new Date(Date.parse(time)),
    seq,
  }
}

export function makeClockValue(val: ClockValue): ID {
  const seqStr = val.seq.toString(16).padStart(3, "0")
  const timeStr = val.time.toISOString().replace(/\..*$/, "")
  return `${timeStr}/${seqStr}/${val.instanceId}`
}
