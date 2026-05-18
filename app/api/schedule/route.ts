import { readFile } from 'fs/promises'
import path from 'path'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type ScheduleAgent = {
  id: string
  name: string
  role: string
  dayOff1: string
  dayOff2: string
  startShift: string
  endShift: string
  break1: string
  lunch: string
  break2: string
  supervisor: string
}

const parseCsvLine = (line: string) => {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const nextChar = line[index + 1]

    if (char === '"' && nextChar === '"') {
      current += '"'
      index += 1
      continue
    }

    if (char === '"') {
      inQuotes = !inQuotes
      continue
    }

    if (char === ',' && !inQuotes) {
      values.push(current.trim())
      current = ''
      continue
    }

    current += char
  }

  values.push(current.trim())
  return values
}

const normalizeHeader = (header: string) => header.trim().toLowerCase()

export async function GET() {
  try {
    const schedulePath = path.resolve(process.cwd(), 'schedule.csv')
    const csv = await readFile(schedulePath, 'utf8')
    const rows = csv
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)

    const [headerLine, ...dataLines] = rows
    const headers = parseCsvLine(headerLine).map(normalizeHeader)

    const getValue = (values: string[], label: string) => {
      const index = headers.indexOf(normalizeHeader(label))
      return index >= 0 ? values[index] || '' : ''
    }

    const agents: ScheduleAgent[] = dataLines.map((line) => {
      const values = parseCsvLine(line)

      return {
        id: getValue(values, 'Sch# (do not change)'),
        name: getValue(values, 'Agent Name'),
        role: getValue(values, 'Role'),
        dayOff1: getValue(values, 'Day OFF 1'),
        dayOff2: getValue(values, 'Day OFF 2'),
        startShift: getValue(values, 'Start Shift'),
        endShift: getValue(values, 'End Shift'),
        break1: getValue(values, 'Break 1'),
        lunch: getValue(values, 'Lunch'),
        break2: getValue(values, 'Break 2'),
        supervisor: getValue(values, 'Supervisor'),
      }
    })

    const supervisors = Array.from(
      new Set(agents.map((agent) => agent.supervisor).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b))

    return NextResponse.json({
      agents,
      supervisors,
    })
  } catch (error: any) {
    console.error('Error reading schedule CSV:', error)
    return NextResponse.json(
      { error: error.message || 'Unable to read schedule CSV' },
      { status: 500 }
    )
  }
}
