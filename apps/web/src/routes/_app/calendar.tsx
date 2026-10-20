import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { CalendarPage } from '#/features/calendar/calendar-page'

// The month and the chosen day live in the URL: a reload keeps them.
const calendarSearch = z.object({
  month: z.number().int().optional().catch(0),
  day: z.iso.date().optional().catch(undefined),
})

export const Route = createFileRoute('/_app/calendar')({
  validateSearch: (search) => calendarSearch.parse(search),
  component: CalendarPage,
})
