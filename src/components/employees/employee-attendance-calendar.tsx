"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react"
import {
  Calendar,
  dateFnsLocalizer,
  type Event as CalendarEvent,
  type SlotInfo,
} from "react-big-calendar"
import { format, getDay, parse, startOfWeek } from "date-fns"
import { enUS } from "date-fns/locale"
import {
  IconAdjustmentsHorizontal,
  IconCalendar,
  IconCheck,
  IconClock,
  IconList,
  IconPlus,
  IconSearch,
  IconTrash,
  IconUsers,
} from "@tabler/icons-react"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import i18n from "@/i18n"
import { InfiniteScrollSelect } from "@/components/ui/infinite-scroll-select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { SearchInput } from "@/components/ui/search-input"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useEmployees } from "@/context/employees-context"

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: { "en-US": enUS },
})

const ATTENDANCE_STATUSES = ["present", "late", "absent", "half-day"] as const
type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number]

type AttendanceRecord = {
  id: number
  employeeId: number
  date: string
  status: AttendanceStatus
  checkIn: string
  checkOut: string
  notes: string
}

type AttendanceEventResource =
  | { kind: "record"; record: AttendanceRecord }
  | { kind: "summary"; date: string }

type AttendanceCalendarEvent = CalendarEvent & {
  resource: AttendanceEventResource
}

function dateValue(date: Date) {
  return format(date, "yyyy-MM-dd")
}

function statusLabel(status: AttendanceStatus) {
  if (status === "half-day") return i18n.t("status.halfDay", { ns: "employees" })
  return i18n.t(`status.${status}`, { ns: "employees" })
}

export function EmployeeAttendanceCalendar() {
  const { t } = useTranslation("employees")
  const { t: tc } = useTranslation("common")
  const { employees } = useEmployees()
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [hydrated, setHydrated] = useState(false)
  const [view, setView] = useState<"calendar" | "table">("calendar")
  const [employeeSearch, setEmployeeSearch] = useState("")
  const [employeeFilter, setEmployeeFilter] = useState("all")
  const [departmentFilter, setDepartmentFilter] = useState("all")
  const [editing, setEditing] = useState<AttendanceRecord | null>(null)
  const [open, setOpen] = useState(false)
  const [dayOpen, setDayOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState(dateValue(new Date()))
  const [dayStatuses, setDayStatuses] = useState<
    Record<number, AttendanceStatus>
  >({})

  useEffect(() => {
    setHydrated(true)
  }, [])

  const employeeName = useCallback(
    (employeeId: number) =>
      employees.find((employee) => employee.id === employeeId)?.name ??
      t("attendancePage.employeeFallback", { id: employeeId }),
    [employees, t]
  )

  const departments = useMemo(
    () =>
      [...new Set(employees.map((employee) => employee.department))]
        .filter((department) => department && department !== "—")
        .sort((a, b) => a.localeCompare(b)),
    [employees]
  )

  const departmentEmployees = useMemo(
    () =>
      employees.filter(
        (employee) =>
          employee.status === "active" &&
          (departmentFilter === "all" ||
            employee.department === departmentFilter)
      ),
    [departmentFilter, employees]
  )

  const filteredEmployees = useMemo(() => {
    const query = employeeSearch.trim().toLowerCase()
    return departmentEmployees.filter(
      (employee) =>
        (employeeFilter === "all" ||
          employee.id === Number(employeeFilter)) &&
        (!query ||
          employee.name.toLowerCase().includes(query) ||
          employee.department.toLowerCase().includes(query) ||
          employee.designation.toLowerCase().includes(query))
    )
  }, [departmentEmployees, employeeFilter, employeeSearch])

  const employeeOptions = useMemo(
    () => [
      {
        value: "all",
        label: t("attendancePage.allEmployees"),
        description:
          departmentFilter === "all"
            ? t("attendancePage.activeCount", {
                count: departmentEmployees.length,
              })
            : departmentFilter,
      },
      ...departmentEmployees.map((employee) => ({
        value: String(employee.id),
        label: employee.name,
        description: employee.designation,
        trailing: employee.department,
      })),
    ],
    [departmentEmployees, departmentFilter, t]
  )

  const visibleRecords = useMemo(() => {
    const allowedIds = new Set(filteredEmployees.map((employee) => employee.id))
    return records.filter(
      (record) =>
        allowedIds.has(record.employeeId)
    )
  }, [filteredEmployees, records])

  const recordsByDate = useMemo(
    () =>
      visibleRecords.reduce<Record<string, AttendanceRecord[]>>(
        (groups, record) => {
          ;(groups[record.date] ??= []).push(record)
          return groups
        },
        {}
      ),
    [visibleRecords]
  )

  const events = useMemo<AttendanceCalendarEvent[]>(
    () => {
      if (employeeFilter === "all") {
        return Object.entries(recordsByDate).map(([date, dayRecords]) => {
          const start = new Date(`${date}T00:00:00`)
          const end = new Date(start)
          end.setDate(end.getDate() + 1)
          const present = dayRecords.filter(
            (record) => record.status === "present"
          ).length
          const exceptions = dayRecords.length - present
          return {
            title: exceptions
              ? t("attendancePage.presentWithExceptions", {
                  present,
                  exceptions,
                })
              : t("attendancePage.presentSummary", { present }),
            start,
            end,
            allDay: true,
            resource: { kind: "summary", date },
          }
        })
      }

      return visibleRecords.map((record) => {
        const start = new Date(`${record.date}T00:00:00`)
        const end = new Date(start)
        end.setDate(end.getDate() + 1)
        return {
          title: statusLabel(record.status),
          start,
          end,
          allDay: true,
          resource: { kind: "record", record },
        }
      })
    },
    [employeeFilter, recordsByDate, visibleRecords, t]
  )

  const openNew = (date = new Date()) => {
    setEditing(null)
    setSelectedDate(dateValue(date))
    setOpen(true)
  }

  const openDay = (date: Date | string) => {
    const day = typeof date === "string" ? date : dateValue(date)
    const current = records.filter((record) => record.date === day)
    setSelectedDate(day)
    setDayStatuses(
      Object.fromEntries(
        filteredEmployees.map((employee) => [
          employee.id,
          current.find((record) => record.employeeId === employee.id)?.status ??
            "present",
        ])
      )
    )
    setDayOpen(true)
  }

  const openEvent = (event: AttendanceCalendarEvent) => {
    if (event.resource.kind === "summary") {
      openDay(event.resource.date)
      return
    }
    setEditing(event.resource.record)
    setSelectedDate(event.resource.record.date)
    setOpen(true)
  }

  const saveDayAttendance = () => {
    setRecords((previous) => {
      const next = [...previous]
      let nextId = next.reduce((max, record) => Math.max(max, record.id), 0)
      for (const employee of filteredEmployees) {
        const status = dayStatuses[employee.id] ?? "present"
        const index = next.findIndex(
          (record) =>
            record.employeeId === employee.id &&
            record.date === selectedDate
        )
        if (index >= 0) {
          next[index] = { ...next[index], status }
        } else {
          nextId += 1
          next.push({
            id: nextId,
            employeeId: employee.id,
            date: selectedDate,
            status,
            checkIn: status === "absent" ? "" : "09:00",
            checkOut: status === "absent" ? "" : "17:00",
            notes: "",
          })
        }
      }
      return next
    })
    setDayOpen(false)
    toast.success(
      t("attendancePage.toastSavedCount", { count: filteredEmployees.length })
    )
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const fd = new FormData(event.currentTarget)
    const employeeId = Number(fd.get("employeeId"))
    const date = String(fd.get("date") ?? "")
    if (!employeeId || !date) {
      toast.error(t("attendancePage.toastSelectRequired"))
      return
    }

    const duplicate = records.some(
      (record) =>
        record.employeeId === employeeId &&
        record.date === date &&
        record.id !== editing?.id
    )
    if (duplicate) {
      toast.error(t("attendancePage.toastDuplicate"))
      return
    }

    const next: AttendanceRecord = {
      id:
        editing?.id ??
        records.reduce((max, record) => Math.max(max, record.id), 0) + 1,
      employeeId,
      date,
      status: String(fd.get("status")) as AttendanceStatus,
      checkIn: String(fd.get("checkIn") ?? ""),
      checkOut: String(fd.get("checkOut") ?? ""),
      notes: String(fd.get("notes") ?? "").trim(),
    }

    setRecords((previous) =>
      editing
        ? previous.map((record) => (record.id === editing.id ? next : record))
        : [...previous, next]
    )
    setOpen(false)
    toast.success(
      editing
        ? t("attendancePage.toastUpdated")
        : t("attendancePage.toastRecorded")
    )
  }

  const removeAttendance = () => {
    if (!editing) return
    setRecords((previous) =>
      previous.filter((record) => record.id !== editing.id)
    )
    setOpen(false)
    toast.message(t("attendancePage.toastRemoved"))
  }

  const defaultEmployee =
    editing?.employeeId ??
    (employeeFilter !== "all" ? Number(employeeFilter) : employees[0]?.id ?? 0)
  const activeFilterCount =
    Number(employeeFilter !== "all") + Number(departmentFilter !== "all")

  return (
    <>
      <Sheet open={dayOpen} onOpenChange={setDayOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
        >
          <SheetHeader className="border-b px-6 py-5 text-left">
            <SheetTitle>{t("attendancePage.dailyTitle")}</SheetTitle>
            <SheetDescription>
              {format(new Date(`${selectedDate}T00:00:00`), "EEEE, dd MMMM yyyy")}
              {" · "}
              {t("attendancePage.employeesCount", {
                count: filteredEmployees.length,
              })}
              {departmentFilter !== "all" ? ` · ${departmentFilter}` : ""}
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b bg-background px-6 py-3">
              <p className="text-muted-foreground text-xs">
                {t("attendancePage.defaultsHint")}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setDayStatuses(
                    Object.fromEntries(
                      filteredEmployees.map((employee) => [
                        employee.id,
                        "present",
                      ])
                    )
                  )
                }
              >
                <IconCheck className="size-4" />
                {t("attendancePage.markAllPresent")}
              </Button>
            </div>
            <div className="divide-y">
              {filteredEmployees.map((employee) => (
                <div
                  key={employee.id}
                  className="flex flex-col gap-2 px-6 py-3 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{employee.name}</p>
                    <p className="text-muted-foreground truncate text-xs">
                      {employee.designation} · {employee.department}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {ATTENDANCE_STATUSES.map((status) => (
                      <Button
                        key={status}
                        type="button"
                        size="sm"
                        variant={
                          dayStatuses[employee.id] === status
                            ? "default"
                            : "outline"
                        }
                        className="h-7 px-2 text-xs"
                        onClick={() =>
                          setDayStatuses((previous) => ({
                            ...previous,
                            [employee.id]: status,
                          }))
                        }
                      >
                        {statusLabel(status)}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <SheetFooter className="border-t px-6 py-4">
            <SheetClose asChild>
              <Button type="button" variant="outline">
                {tc("actions.cancel")}
              </Button>
            </SheetClose>
            <Button type="button" onClick={saveDayAttendance}>
              {t("attendancePage.saveAttendance")}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
        >
          <SheetHeader className="border-b px-6 py-5 text-left">
            <SheetTitle>
              {editing
                ? t("attendancePage.editTitle")
                : t("attendancePage.recordTitle")}
            </SheetTitle>
            <SheetDescription>
              {t("attendancePage.formHint")}
            </SheetDescription>
          </SheetHeader>
          <div
            key={editing?.id ?? `new-${selectedDate}`}
            className="min-h-0 flex-1 overflow-y-auto px-6 py-5"
          >
            <form
              id="attendance-form"
              className="space-y-4"
              onSubmit={handleSubmit}
            >
              <div className="space-y-2">
                <Label htmlFor="attendance-employee">{t("attendancePage.employee")}</Label>
                <select
                  id="attendance-employee"
                  name="employeeId"
                  defaultValue={defaultEmployee || ""}
                  required
                  className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs"
                >
                  <option value="">{t("attendancePage.selectEmployee")}</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="attendance-date">{t("attendancePage.date")}</Label>
                <Input
                  id="attendance-date"
                  name="date"
                  type="date"
                  defaultValue={editing?.date ?? selectedDate}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="attendance-status">{t("columns.status")}</Label>
                <select
                  id="attendance-status"
                  name="status"
                  defaultValue={editing?.status ?? "present"}
                  className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs"
                >
                  {ATTENDANCE_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {statusLabel(status)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="attendance-in">{t("attendancePage.checkIn")}</Label>
                  <Input
                    id="attendance-in"
                    name="checkIn"
                    type="time"
                    defaultValue={editing?.checkIn ?? "09:00"}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="attendance-out">{t("attendancePage.checkOut")}</Label>
                  <Input
                    id="attendance-out"
                    name="checkOut"
                    type="time"
                    defaultValue={editing?.checkOut ?? "17:00"}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="attendance-notes">{t("attendancePage.notes")}</Label>
                <Input
                  id="attendance-notes"
                  name="notes"
                  defaultValue={editing?.notes}
                  placeholder={t("attendancePage.notesPlaceholder")}
                />
              </div>
            </form>
          </div>
          <SheetFooter className="border-t px-6 py-4">
            {editing ? (
              <Button
                type="button"
                variant="destructive"
                onClick={removeAttendance}
              >
                <IconTrash className="size-4" />
                {tc("actions.delete")}
              </Button>
            ) : null}
            <SheetClose asChild>
              <Button type="button" variant="outline">
                {tc("actions.cancel")}
              </Button>
            </SheetClose>
            <Button type="submit" form="attendance-form">
              {editing
                ? t("attendancePage.saveChanges")
                : t("attendancePage.recordAttendance")}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <div className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-md">
            <SearchInput
              placeholder={t("attendancePage.searchPlaceholder")}
              value={employeeSearch}
              onChange={(event) => setEmployeeSearch(event.target.value)}
              icon={<IconSearch className="size-4" />}
              className="min-w-0 flex-1 rounded-full shadow-sm focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <Popover modal={false}>
              <div className="border-border/70 bg-background inline-flex h-9 shrink-0 items-center overflow-visible rounded-full border shadow-sm">
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="relative size-9 rounded-l-full rounded-r-none border-0 shadow-none"
                    aria-label={t("attendancePage.openFilters")}
                  >
                    <IconAdjustmentsHorizontal className="size-4" />
                    {activeFilterCount > 0 ? (
                      <span className="bg-primary text-primary-foreground border-background absolute top-0 right-0 z-10 flex size-5 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-[10px] font-semibold">
                        {activeFilterCount}
                      </span>
                    ) : null}
                  </Button>
                </PopoverTrigger>
                <div className="bg-border/70 h-5 w-px" aria-hidden />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-9 rounded-none border-0 shadow-none"
                  aria-label={t("attendancePage.showCalendar")}
                  onClick={() => setView("calendar")}
                >
                  <IconCalendar
                    className={`size-4 ${view === "calendar" ? "text-primary" : "text-muted-foreground"}`}
                  />
                </Button>
                <div className="bg-border/70 h-5 w-px" aria-hidden />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-9 rounded-r-full rounded-l-none border-0 shadow-none"
                  aria-label={t("attendancePage.showTable")}
                  onClick={() => setView("table")}
                >
                  <IconList
                    className={`size-4 ${view === "table" ? "text-primary" : "text-muted-foreground"}`}
                  />
                </Button>
              </div>
              <PopoverContent align="start" className="w-80 space-y-4 p-4">
                <div>
                  <p className="text-sm font-semibold">{t("attendancePage.filters")}</p>
                  <p className="text-muted-foreground text-xs">
                    {t("attendancePage.filtersHint")}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="attendance-filter" className="text-xs">
                    {t("attendancePage.employee")}
                  </Label>
                  <InfiniteScrollSelect
                    id="attendance-filter"
                    value={employeeFilter}
                    onValueChange={setEmployeeFilter}
                    options={employeeOptions}
                    placeholder={t("attendancePage.selectEmployee")}
                    searchPlaceholder={t("attendancePage.searchEmployees")}
                    leadingIcon={<IconUsers />}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="attendance-department" className="text-xs">
                    {t("attendancePage.department")}
                  </Label>
                  <select
                    id="attendance-department"
                    value={departmentFilter}
                    onChange={(event) => {
                      setDepartmentFilter(event.target.value)
                      setEmployeeFilter("all")
                    }}
                    className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs"
                  >
                    <option value="all">{t("attendancePage.allDepartments")}</option>
                    {departments.map((department) => (
                      <option key={department} value={department}>
                        {department}
                      </option>
                    ))}
                  </select>
                </div>
                {activeFilterCount > 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setEmployeeFilter("all")
                      setDepartmentFilter("all")
                    }}
                  >
                    {t("attendancePage.clearFilters")}
                  </Button>
                ) : null}
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {employeeFilter === "all" ? (
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-full px-7 shadow-sm"
                onClick={() => openDay(new Date())}
              >
                <IconUsers className="size-4" />
                {t("attendancePage.markToday")}
              </Button>
            ) : null}
            <Button
              type="button"
              className="h-9 rounded-full px-5 shadow-sm"
              onClick={() => openNew()}
            >
              <IconPlus className="size-4" />
              {t("attendancePage.recordAttendance")}
            </Button>
          </div>
        </div>

        {view === "calendar" ? (
          <div className="bg-card rounded-xl border border-border/60 p-3 shadow-sm md:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-4 text-xs">
                {ATTENDANCE_STATUSES.map((status) => (
                  <span key={status} className="flex items-center gap-1.5">
                    <span
                      className={`size-2 rounded-full ${
                        status === "present"
                          ? "bg-emerald-500"
                          : status === "late"
                            ? "bg-amber-500"
                            : status === "absent"
                              ? "bg-red-500"
                              : "bg-sky-500"
                      }`}
                    />
                    {statusLabel(status)}
                  </span>
                ))}
              </div>
              {employeeFilter === "all" ? (
                <p className="text-muted-foreground text-xs">
                  {t("attendancePage.calendarHint")}
                </p>
              ) : null}
            </div>
            <Calendar<AttendanceCalendarEvent>
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              views={["month", "week", "agenda"]}
              defaultView="month"
              selectable
              popup
              onSelectSlot={(slot: SlotInfo) =>
                employeeFilter === "all"
                  ? openDay(slot.start)
                  : openNew(slot.start)
              }
              onSelectEvent={openEvent}
              eventPropGetter={(event) => {
                if (event.resource.kind === "summary") {
                  return {
                    style: {
                      backgroundColor: "var(--primary)",
                      color: "var(--primary-foreground)",
                      borderColor: "var(--primary)",
                      borderRadius: "6px",
                      fontSize: "12px",
                    },
                  }
                }
                const color =
                  event.resource.record.status === "present"
                    ? "#059669"
                    : event.resource.record.status === "late"
                      ? "#d97706"
                      : event.resource.record.status === "absent"
                        ? "#dc2626"
                        : "#0284c7"
                return {
                  style: {
                    backgroundColor: color,
                    borderColor: color,
                    borderRadius: "6px",
                    fontSize: "12px",
                  },
                }
              }}
              style={{ height: 680 }}
            />
            <p className="text-muted-foreground mt-3 flex items-center gap-1.5 text-xs">
              <IconClock className="size-3.5" />
              {employeeFilter === "all"
                ? t("attendancePage.clickDateTeam")
                : t("attendancePage.clickDateRecord")}
            </p>
          </div>
        ) : (
          <div className="bg-card overflow-hidden rounded-xl border border-border/60">
            <div className="border-b px-4 py-3">
              <p className="text-sm font-semibold">{t("attendancePage.recordsTitle")}</p>
              <p className="text-muted-foreground text-xs">
                {t("attendancePage.recordsCount", { count: visibleRecords.length })}
              </p>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("attendancePage.date")}</TableHead>
                    <TableHead>{t("attendancePage.employee")}</TableHead>
                    <TableHead>{t("attendancePage.department")}</TableHead>
                    <TableHead>{t("columns.status")}</TableHead>
                    <TableHead>{t("attendancePage.checkIn")}</TableHead>
                    <TableHead>{t("attendancePage.checkOut")}</TableHead>
                    <TableHead className="text-right">{t("attendancePage.action")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleRecords.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-muted-foreground h-24 text-center"
                      >
                        {t("attendancePage.noRecords")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    [...visibleRecords]
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .map((record) => {
                        const employee = employees.find(
                          (item) => item.id === record.employeeId
                        )
                        return (
                          <TableRow key={record.id}>
                            <TableCell className="tabular-nums">
                              {record.date}
                            </TableCell>
                            <TableCell className="font-medium">
                              {employeeName(record.employeeId)}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {employee?.department ?? "—"}
                            </TableCell>
                            <TableCell>{statusLabel(record.status)}</TableCell>
                            <TableCell className="tabular-nums">
                              {record.checkIn || "—"}
                            </TableCell>
                            <TableCell className="tabular-nums">
                              {record.checkOut || "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditing(record)
                                  setSelectedDate(record.date)
                                  setOpen(true)
                                }}
                              >
                                {tc("actions.edit")}
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
